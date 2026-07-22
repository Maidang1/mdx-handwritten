import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync
} from 'node:fs'
import {isAbsolute, join, relative} from 'node:path'

const reviewedPlanDirectoryParts = ['.mdx-handwritten', 'plans'] as const
const reviewedPlanReferencePattern =
  /^rp1_[0-9abcdefghjkmnpqrstvwxyz]{26}$/u

export const maximumReviewedPlanBytes = 65_536

export interface ReviewedPlanConfiguration {
  projectRoot: string
}

export type ResolvedReviewedPlans =
  | {status: 'ready'; projectRoot: string}
  | {status: 'unreadable'}

export type ReviewedPlanReadResult =
  | {status: 'found'; bytes: Uint8Array}
  | {status: 'binding-invalid'}
  | {status: 'missing'}
  | {status: 'too-large'; actual: number}
  | {status: 'unreadable'}

export function resolveReviewedPlans(
  configuration: ReviewedPlanConfiguration | undefined
): ResolvedReviewedPlans | undefined {
  if (configuration === undefined) return undefined
  if (
    typeof configuration.projectRoot !== 'string' ||
    !isAbsolute(configuration.projectRoot)
  ) {
    return {status: 'unreadable'}
  }

  try {
    const projectRoot = realpathSync(configuration.projectRoot)
    if (!statSync(projectRoot).isDirectory()) return {status: 'unreadable'}
    return {status: 'ready', projectRoot}
  } catch {
    return {status: 'unreadable'}
  }
}

function isConfined(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate)
  return path.length > 0 && !path.startsWith('..') && !isAbsolute(path)
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as {code?: unknown}).code === 'ENOENT'
  )
}

function readBoundedFile(path: string): ReviewedPlanReadResult {
  let descriptor: number | undefined
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)
    )
    const stats = fstatSync(descriptor)
    if (!stats.isFile()) return {status: 'unreadable'}
    if (stats.size > maximumReviewedPlanBytes) {
      return {status: 'too-large', actual: stats.size}
    }

    const buffer = Buffer.allocUnsafe(maximumReviewedPlanBytes + 1)
    let length = 0
    while (length < buffer.length) {
      const bytesRead = readSync(
        descriptor,
        buffer,
        length,
        buffer.length - length,
        length
      )
      if (bytesRead === 0) break
      length += bytesRead
    }
    if (length > maximumReviewedPlanBytes) {
      return {status: 'too-large', actual: length}
    }
    return {status: 'found', bytes: buffer.subarray(0, length)}
  } catch (error) {
    return {status: isMissing(error) ? 'missing' : 'unreadable'}
  } finally {
    if (descriptor !== undefined) closeSync(descriptor)
  }
}

export function readReviewedPlan(
  configuration: ResolvedReviewedPlans | undefined,
  reference: string
): ReviewedPlanReadResult {
  if (!reviewedPlanReferencePattern.test(reference)) {
    return {status: 'binding-invalid'}
  }
  if (!configuration || configuration.status !== 'ready') {
    return {status: 'unreadable'}
  }

  const directory = join(
    configuration.projectRoot,
    ...reviewedPlanDirectoryParts
  )
  const path = join(directory, `${reference}.json`)

  try {
    const fileStats = lstatSync(path)
    if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
      return {status: 'unreadable'}
    }
    const realDirectory = realpathSync(directory)
    const realPath = realpathSync(path)
    if (
      !isConfined(configuration.projectRoot, realDirectory) ||
      !isConfined(configuration.projectRoot, realPath) ||
      !isConfined(realDirectory, realPath)
    ) {
      return {status: 'unreadable'}
    }
    return readBoundedFile(realPath)
  } catch (error) {
    return {status: isMissing(error) ? 'missing' : 'unreadable'}
  }
}
