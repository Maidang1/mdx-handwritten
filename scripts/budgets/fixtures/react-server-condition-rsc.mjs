import {createHash} from 'node:crypto'
import {existsSync, realpathSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'

const result = {
  conditionActive: false,
  importSucceeded: false,
  materializedPlanOnly: false,
  meaningPreserved: false,
  packedArtifactImported: false,
  recipePackageAbsent: false,
  scriptFree: false,
  structureComplete: false,
}

function materialize(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(materialize)
  if (typeof value !== 'object') throw new Error('The React Server tree contains an unsupported value.')

  if (typeof value.type === 'function') return materialize(value.type(value.props))
  if (value.type === Symbol.for('react.fragment')) return materialize(value.props.children)
  if (typeof value.type !== 'string') {
    throw new Error('The React Server tree contains an unsupported element type.')
  }

  const {children, ...attributes} = value.props
  return {attributes, children: materialize(children), type: value.type}
}

function hosts(value, entries = []) {
  if (Array.isArray(value)) {
    for (const child of value) hosts(child, entries)
  } else if (value !== null && typeof value === 'object') {
    entries.push(value)
    hosts(value.children, entries)
  }
  return entries
}

function text(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(text).join('')
  if (value !== null && typeof value === 'object') return text(value.children)
  return ''
}

try {
  const React = await import('react')
  result.conditionActive =
    Object.hasOwn(React, '__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE') &&
    !Object.hasOwn(React, '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE')

  const reactPackageRoot = realpathSync(
    resolve(process.cwd(), 'node_modules/@madinah/mdx-handwritten-react'),
  )
  const resolvedReactEntry = realpathSync(
    fileURLToPath(import.meta.resolve('@madinah/mdx-handwritten-react')),
  )
  result.packedArtifactImported =
    resolvedReactEntry.startsWith(`${reactPackageRoot}/`) &&
    reactPackageRoot.startsWith(`${realpathSync(process.cwd())}/`)

  const {HandScene} = await import('@madinah/mdx-handwritten-react')
  result.importSucceeded = typeof HandScene === 'function'

  const plan = {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: {name: '@evidence/transition-recipes/status-transition', version: 1},
    localization: {
      locale: 'en',
      catalog: {id: 'evidence/status-transition/reader-text', version: 1},
    },
    title: 'Release transition',
    source: {
      text: 'draft -> shipped',
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: '3c4bd7ac7858019014cb85281a9afbbec2eaa510958e5b2f159baa3f8a4381e6',
      },
    },
    targets: [
      {
        id: 'before',
        role: 'before',
        ranges: [{start: 0, end: 5, exactText: 'draft'}],
      },
      {
        id: 'after',
        role: 'after',
        ranges: [{start: 9, end: 16, exactText: 'shipped'}],
      },
    ],
    labels: [{id: 'transition-label', text: 'status transition'}],
    relationships: [
      {
        id: 'transition-relationship',
        kind: 'relates',
        relation: 'changes-to',
        labelId: 'transition-label',
        fromTargetIds: ['before'],
        toTargetIds: ['after'],
        detailKind: 'short-description',
        legendText: 'status transition: draft -> shipped',
      },
    ],
    gestures: [
      {id: 'transition-connector', kind: 'connect', relationshipId: 'transition-relationship'},
    ],
    provenance: {
      kind: 'reviewed-proposal',
      engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
      generator: {id: 'third-party-recipe-authoring-tool', version: '1'},
      review: {status: 'approved', id: 'review-rsc-fixture-1'},
    },
  }
  const input = JSON.parse(JSON.stringify({plan}))
  const beforeCall = JSON.stringify(input)
  const planFingerprint = createHash('sha256')
    .update(JSON.stringify(plan))
    .digest('hex')
  const tree = materialize(HandScene(input))
  const elements = hosts(tree)
  const caption = elements.find(({type}) => type === 'figcaption')
  const source = elements.find(({type}) => type === 'pre')
  const legend = elements.find(({type}) => type === 'ol')
  const beforeTarget = elements.find(
    ({attributes}) => attributes['data-hw-target'] === 'before',
  )
  const afterTarget = elements.find(
    ({attributes}) => attributes['data-hw-target'] === 'after',
  )
  const relationship = elements.find(
    ({attributes}) => attributes['data-hw-annotation'] === 'transition-relationship',
  )
  const connector = elements.find(
    ({attributes}) => attributes['data-hw-connector'] === 'straight',
  )

  result.materializedPlanOnly =
    Object.keys(input).join() === 'plan' && JSON.stringify(input) === beforeCall
  result.recipePackageAbsent = !existsSync(
    resolve(process.cwd(), 'node_modules/@evidence/transition-recipes'),
  )
  result.structureComplete =
    tree.type === 'figure' &&
    tree.attributes['data-hw-scene'] === plan.recipe.name &&
    tree.attributes['data-hw-scene-version'] === plan.recipe.version &&
    tree.attributes['data-hw-scene-schema'] === plan.schemaVersion &&
    caption !== undefined &&
    source !== undefined &&
    legend !== undefined &&
    elements.indexOf(source) < elements.indexOf(legend) &&
    beforeTarget !== undefined &&
    afterTarget !== undefined &&
    relationship !== undefined &&
    connector !== undefined
  result.meaningPreserved =
    planFingerprint === '5809fc2bb011eb01410528b21c2a5901af5f83a3acd15932de71585f8ee098a7' &&
    text(caption) === 'Release transition' &&
    text(source) === 'draft -> shipped' &&
    text(beforeTarget) === 'draft' &&
    beforeTarget.attributes['data-hw-target-role'] === 'before' &&
    text(afterTarget) === 'shipped' &&
    afterTarget.attributes['data-hw-target-role'] === 'after' &&
    relationship.attributes['data-hw-relation'] === 'changes-to' &&
    text(relationship).includes('status transition: draft -> shipped')
  result.scriptFree = !elements.some(({type}) => type === 'script')
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
}

console.log(JSON.stringify(result))
if (Object.values(result).some((pass) => !pass)) process.exitCode = 1
