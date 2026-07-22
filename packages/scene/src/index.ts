export const annotationRecipeNames = ['task-explainer'] as const

export type AnnotationRecipeName = (typeof annotationRecipeNames)[number]

export type AnnotationSceneLocale = 'en' | 'zh-CN'

export type AnnotationTargetRole =
  | 'state'
  | 'stable-id'
  | 'description'
  | 'tag'
  | 'priority'
  | 'field'

/** A half-open range of UTF-16 code units in the normalized Scene plan source. */
export interface AnnotationSourceRange {
  start: number
  end: number
}

export interface AnnotationSceneTarget {
  id: string
  role: AnnotationTargetRole
  exactText: string
  ranges: readonly [AnnotationSourceRange, ...AnnotationSourceRange[]]
}

export interface AnnotationSceneAnnotation {
  id: string
  label: string
  targetIds: readonly [string, ...string[]]
  fallback: string
}

export interface AnnotationScenePlanV1 {
  schemaVersion: 1
  recipe: {
    name: 'task-explainer'
    version: 1
  }
  locale: AnnotationSceneLocale
  title: string
  /** Normalized source addressed by every target range. */
  source: string
  targets: readonly AnnotationSceneTarget[]
  annotations: readonly AnnotationSceneAnnotation[]
}

export type AnnotationSceneDiagnosticCode =
  | 'scene-recipe-unknown'
  | 'scene-locale-unsupported'
  | 'scene-source-empty'
  | 'scene-source-too-long'
  | 'scene-task-syntax-invalid'
  | 'scene-task-priority-ambiguous'

export interface AnnotationSceneDiagnostic {
  code: AnnotationSceneDiagnosticCode
  message: string
}

export type AnnotationSceneResult =
  | {
      ok: true
      plan: AnnotationScenePlanV1
      diagnostics: readonly []
    }
  | {
      ok: false
      plan: null
      diagnostics: readonly AnnotationSceneDiagnostic[]
    }

export interface DeriveAnnotationSceneInput {
  recipe: string
  source: string
  locale?: string
}

const maximumSourceLength = 4096

const diagnosticMessages: Record<AnnotationSceneDiagnosticCode, string> = {
  'scene-recipe-unknown': 'The Annotation recipe is not supported.',
  'scene-locale-unsupported': 'The Annotation scene locale is not supported.',
  'scene-source-empty': 'The Annotation scene source is empty.',
  'scene-source-too-long': `The Annotation scene source exceeds ${maximumSourceLength} UTF-16 code units.`,
  'scene-task-syntax-invalid':
    'The task must start with "[ ] ID Title" or "- [ ] ID Title".',
  'scene-task-priority-ambiguous':
    'The task has more than one priority token.'
}

interface MetadataMatch {
  role: 'tag' | 'priority' | 'field'
  text: string
  start: number
  end: number
}

interface ParsedTask {
  state: {text: string; range: AnnotationSourceRange; checked: boolean}
  stableId: {text: string; range: AnnotationSourceRange}
  descriptionRanges: [AnnotationSourceRange, ...AnnotationSourceRange[]]
  metadata: MetadataMatch[]
}

const localizedText = {
  en: {
    title: 'Task explainer',
    stateOpen: 'open task',
    stateChecked: 'completed task',
    stableId: 'stable ID',
    description: 'description',
    tag: 'tag',
    priority: 'priority',
    field: 'custom field'
  },
  'zh-CN': {
    title: '任务解析',
    stateOpen: '未完成任务',
    stateChecked: '已完成任务',
    stableId: '稳定 ID',
    description: '描述',
    tag: '标签',
    priority: '优先级',
    field: '自定义字段'
  }
} as const

/**
 * Derive a deterministic, presentation-independent Scene plan.
 *
 * This is the Module's sole runtime Interface. Expected author errors are
 * returned as stable diagnostics and never thrown.
 */
export function deriveAnnotationScene(
  input: DeriveAnnotationSceneInput
): AnnotationSceneResult {
  const recipe = typeof input?.recipe === 'string' ? input.recipe : ''
  const rawSource = typeof input?.source === 'string' ? input.source : ''
  const requestedLocale = input?.locale === undefined ? 'en' : input.locale
  const source = normalizeSource(rawSource)
  const diagnostics: AnnotationSceneDiagnostic[] = []

  if (!isRecipeName(recipe)) {
    diagnostics.push(diagnostic('scene-recipe-unknown'))
  }
  if (!isLocale(requestedLocale)) {
    diagnostics.push(diagnostic('scene-locale-unsupported'))
  }
  if (source.length === 0) {
    diagnostics.push(diagnostic('scene-source-empty'))
  } else if (source.length > maximumSourceLength) {
    diagnostics.push(diagnostic('scene-source-too-long'))
  }

  if (diagnostics.length > 0 || !isLocale(requestedLocale)) {
    return {ok: false, plan: null, diagnostics}
  }

  const parsed = parseTask(source)
  if ('code' in parsed) {
    return {ok: false, plan: null, diagnostics: [diagnostic(parsed.code)]}
  }

  const targets = createTargets(source, parsed)
  const labels = localizedText[requestedLocale]
  const annotations = createAnnotations(targets, parsed.state.checked, requestedLocale)

  return {
    ok: true,
    plan: {
      schemaVersion: 1,
      recipe: {name: 'task-explainer', version: 1},
      locale: requestedLocale,
      title: labels.title,
      source,
      targets,
      annotations
    },
    diagnostics: []
  }
}

function normalizeSource(source: string): string {
  return source.replace(/\r\n?/gu, '\n').trim()
}

function diagnostic(code: AnnotationSceneDiagnosticCode): AnnotationSceneDiagnostic {
  return {code, message: diagnosticMessages[code]}
}

function isRecipeName(value: string): value is AnnotationRecipeName {
  return (annotationRecipeNames as readonly string[]).includes(value)
}

function isLocale(value: unknown): value is AnnotationSceneLocale {
  return value === 'en' || value === 'zh-CN'
}

function parseTask(
  source: string
): ParsedTask | {code: 'scene-task-syntax-invalid' | 'scene-task-priority-ambiguous'} {
  const firstLineEnd = source.indexOf('\n') === -1 ? source.length : source.indexOf('\n')
  const firstLine = source.slice(0, firstLineEnd)
  const header = /^(?:-\s+)?(\[(?: |x|X)\])\s+([A-Z][A-Z0-9]*-\d+)(?=\s|$)/u.exec(
    firstLine
  )

  if (!header || header.index !== 0) {
    return {code: 'scene-task-syntax-invalid'}
  }

  const stateText = header[1]
  const stableIdText = header[2]
  if (!stateText || !stableIdText) {
    return {code: 'scene-task-syntax-invalid'}
  }

  const stateStart = firstLine.indexOf(stateText)
  const stableIdStart = firstLine.indexOf(stableIdText, stateStart + stateText.length)
  const remainderStart = stableIdStart + stableIdText.length
  const metadata = findMetadata(firstLine, remainderStart)

  if (metadata.filter((item) => item.role === 'priority').length > 1) {
    return {code: 'scene-task-priority-ambiguous'}
  }

  const titleRanges = rangesOutsideMetadata(
    firstLine,
    remainderStart,
    firstLineEnd,
    metadata
  )
  if (titleRanges.length === 0) {
    return {code: 'scene-task-syntax-invalid'}
  }

  const detailRanges = findDetailRanges(source, firstLineEnd)
  const descriptionRanges = [...titleRanges, ...detailRanges] as [
    AnnotationSourceRange,
    ...AnnotationSourceRange[]
  ]

  return {
    state: {
      text: stateText,
      range: {start: stateStart, end: stateStart + stateText.length},
      checked: stateText !== '[ ]'
    },
    stableId: {
      text: stableIdText,
      range: {start: stableIdStart, end: stableIdStart + stableIdText.length}
    },
    descriptionRanges,
    metadata
  }
}

function findMetadata(firstLine: string, from: number): MetadataMatch[] {
  const metadata: MetadataMatch[] = []
  const pattern = /#[\p{L}\p{N}_-]+|!(?:low|medium|high|urgent)\b|@[A-Za-z][A-Za-z0-9_-]*:[^\s]+/giu

  for (const match of firstLine.slice(from).matchAll(pattern)) {
    const text = match[0]
    const start = from + (match.index ?? 0)
    metadata.push({
      role: text.startsWith('#')
        ? 'tag'
        : text.startsWith('!')
          ? 'priority'
          : 'field',
      text,
      start,
      end: start + text.length
    })
  }

  return metadata
}

function rangesOutsideMetadata(
  source: string,
  start: number,
  end: number,
  metadata: readonly MetadataMatch[]
): AnnotationSourceRange[] {
  const ranges: AnnotationSourceRange[] = []
  let cursor = start

  for (const item of metadata) {
    const range = trimmedRange(source, cursor, item.start)
    if (range) ranges.push(range)
    cursor = item.end
  }

  const finalRange = trimmedRange(source, cursor, end)
  if (finalRange) ranges.push(finalRange)
  return ranges
}

function findDetailRanges(source: string, firstLineEnd: number): AnnotationSourceRange[] {
  const ranges: AnnotationSourceRange[] = []
  let lineStart = firstLineEnd < source.length ? firstLineEnd + 1 : source.length

  while (lineStart < source.length) {
    const nextBreak = source.indexOf('\n', lineStart)
    const lineEnd = nextBreak === -1 ? source.length : nextBreak
    const range = trimmedRange(source, lineStart, lineEnd)
    if (range) ranges.push(range)
    if (nextBreak === -1) break
    lineStart = nextBreak + 1
  }

  return ranges
}

function trimmedRange(
  source: string,
  start: number,
  end: number
): AnnotationSourceRange | undefined {
  while (start < end && /\s/u.test(source[start] ?? '')) start += 1
  while (end > start && /\s/u.test(source[end - 1] ?? '')) end -= 1
  return start < end ? {start, end} : undefined
}

function createTargets(
  source: string,
  task: ParsedTask
): AnnotationSceneTarget[] {
  const targets: AnnotationSceneTarget[] = [
    {
      id: 'state',
      role: 'state',
      exactText: task.state.text,
      ranges: [task.state.range]
    },
    {
      id: 'stable-id',
      role: 'stable-id',
      exactText: task.stableId.text,
      ranges: [task.stableId.range]
    },
    {
      id: 'description',
      role: 'description',
      exactText: task.descriptionRanges
        .map((range) => source.slice(range.start, range.end))
        .join('\n'),
      ranges: task.descriptionRanges
    }
  ]

  for (const role of ['tag', 'priority', 'field'] as const) {
    const matches = task.metadata.filter((item) => item.role === role)
    matches.forEach((item, index) => {
      targets.push({
        id: index === 0 ? role : `${role}-${index + 1}`,
        role,
        exactText: item.text,
        ranges: [{start: item.start, end: item.end}]
      })
    })
  }

  return targets
}

function createAnnotations(
  targets: readonly AnnotationSceneTarget[],
  checked: boolean,
  locale: AnnotationSceneLocale
): AnnotationSceneAnnotation[] {
  const text = localizedText[locale]
  const labels: Record<AnnotationTargetRole, string> = {
    state: checked ? text.stateChecked : text.stateOpen,
    'stable-id': text.stableId,
    description: text.description,
    tag: text.tag,
    priority: text.priority,
    field: text.field
  }
  const annotations: AnnotationSceneAnnotation[] = []

  for (const role of [
    'state',
    'stable-id',
    'description',
    'tag',
    'priority',
    'field'
  ] as const) {
    const matchingTargets = targets.filter((target) => target.role === role)
    const first = matchingTargets[0]
    if (!first) continue
    const targetIds = matchingTargets.map((target) => target.id) as [string, ...string[]]
    const values = matchingTargets.map((target) => target.exactText)
    const label = labels[role]
    annotations.push({
      id: `${role}-annotation`,
      label,
      targetIds,
      fallback:
        locale === 'zh-CN'
          ? `${label}：${values.join('、')}`
          : `${label}: ${values.join(', ')}`
    })
  }

  return annotations
}
