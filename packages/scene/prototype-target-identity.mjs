#!/usr/bin/env node

// PROTOTYPE — keep this branch out of main.
// Question: how can an Annotation scene keep target identity deterministic
// across repeated text, discontinuous ranges, and source edits without CSS
// selectors or fuzzy matching?

import {createHash} from 'node:crypto'

const normalization = 'trim-lf-v1'

function normalizeLineEndings(source) {
  return source.replace(/\r\n?/gu, '\n')
}

function normalizeSource(source) {
  return normalizeLineEndings(source).trim()
}

function projectRawRange(rawSource, rawRange) {
  const sourceWithLf = normalizeLineEndings(rawSource)
  const leadingTrim = sourceWithLf.length - sourceWithLf.trimStart().length
  return {
    start: normalizeLineEndings(rawSource.slice(0, rawRange.start)).length - leadingTrim,
    end: normalizeLineEndings(rawSource.slice(0, rawRange.end)).length - leadingTrim,
  }
}

function semanticAnchorFromAstSelection(name, rawSource, node) {
  return {
    name,
    ranges: [projectRawRange(rawSource, node.rawRange)],
    provenance: {
      kind: 'semantic-correction-tool',
      astNodeType: node.type,
      rawRange: node.rawRange,
      projectedWith: normalization,
    },
  }
}

function identifySource(source) {
  return {
    normalization,
    algorithm: 'sha256',
    digest: createHash('sha256').update(source, 'utf8').digest('hex'),
  }
}

function diagnostic(code, details = {}) {
  return {code, ...details}
}

function exactMatches(source, text) {
  if (text.length === 0) return []
  const matches = []
  let cursor = 0

  while (cursor <= source.length - text.length) {
    const start = source.indexOf(text, cursor)
    if (start === -1) break
    matches.push({start, end: start + text.length})
    cursor = start + 1
  }

  return matches
}

function resolveScene({recipe, rawSource, parsedAnchors = [], targets}) {
  const source = normalizeSource(rawSource)
  const diagnostics = []
  const anchorByName = new Map()

  // These ranges are parser output for named semantic markers. Authors name an
  // anchor through a future Semantic correction syntax; they never type
  // numeric offsets or presentation coordinates.
  for (const anchor of parsedAnchors) {
    if (anchorByName.has(anchor.name)) {
      diagnostics.push(diagnostic('target-anchor-duplicate', {anchor: anchor.name}))
      continue
    }
    anchorByName.set(anchor.name, anchor)
  }

  const seenIds = new Set()
  const resolvedTargets = []

  for (const target of targets) {
    if (seenIds.has(target.id)) {
      diagnostics.push(diagnostic('target-id-duplicate', {targetId: target.id}))
      continue
    }
    seenIds.add(target.id)

    const ranges = resolveLocator(source, target, anchorByName, diagnostics)
    if (!ranges) continue

    const rangeDiagnostics = validateRanges(source, target.id, ranges)
    diagnostics.push(...rangeDiagnostics)
    if (rangeDiagnostics.length > 0) continue

    resolvedTargets.push({
      id: target.id,
      role: target.role,
      ...(target.locator.kind === 'anchor'
        ? {
            semanticAnchor: {
              name: target.locator.name,
              provenance: anchorByName.get(target.locator.name)?.provenance,
            },
          }
        : {}),
      ...(target.provenance ? {provenance: target.provenance} : {}),
      ranges: ranges.map((range) => ({
        ...range,
        exactText: source.slice(range.start, range.end),
      })),
    })
  }

  diagnostics.push(...findOverlaps(resolvedTargets))

  if (diagnostics.length > 0) {
    return {
      status: 'invalid',
      source,
      sourceIdentity: identifySource(source),
      diagnostics,
    }
  }

  return {
    status: 'resolved',
    plan: {
      schemaVersion: 1,
      recipe,
      source,
      sourceIdentity: identifySource(source),
      targets: resolvedTargets,
    },
  }
}

function resolveLocator(source, target, anchorByName, diagnostics) {
  if (target.locator.kind === 'ranges') return target.locator.ranges

  if (target.locator.kind === 'anchor') {
    const anchor = anchorByName.get(target.locator.name)
    if (!anchor) {
      diagnostics.push(
        diagnostic('target-anchor-missing', {
          targetId: target.id,
          anchor: target.locator.name,
        }),
      )
    }
    return anchor?.ranges
  }

  if (target.locator.text.length === 0) {
    diagnostics.push(diagnostic('target-text-empty', {targetId: target.id}))
    return undefined
  }
  const candidates = exactMatches(source, target.locator.text)
  if (candidates.length === 0) {
    diagnostics.push(
      diagnostic('target-text-not-found', {
        targetId: target.id,
        exactText: target.locator.text,
      }),
    )
    return undefined
  }
  if (candidates.length > 1) {
    diagnostics.push(
      diagnostic('target-text-ambiguous', {
        targetId: target.id,
        exactText: target.locator.text,
        candidates,
      }),
    )
    return undefined
  }
  return candidates
}

function validateRanges(source, targetId, ranges) {
  const diagnostics = []
  let previousEnd = -1

  if (ranges.length === 0) {
    return [diagnostic('target-ranges-empty', {targetId})]
  }

  for (const [index, range] of ranges.entries()) {
    if (
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < 0 ||
      range.end <= range.start ||
      range.end > source.length
    ) {
      diagnostics.push(
        diagnostic('target-range-invalid', {targetId, rangeIndex: index, range}),
      )
      continue
    }
    if (range.start < previousEnd) {
      diagnostics.push(
        diagnostic('target-ranges-unordered', {targetId, rangeIndex: index}),
      )
    }
    if (splitsSurrogatePair(source, range.start) || splitsSurrogatePair(source, range.end)) {
      diagnostics.push(
        diagnostic('target-range-splits-surrogate', {
          targetId,
          rangeIndex: index,
          range,
        }),
      )
    }
    previousEnd = range.end
  }

  return diagnostics
}

function splitsSurrogatePair(source, boundary) {
  if (boundary <= 0 || boundary >= source.length) return false
  const left = source.charCodeAt(boundary - 1)
  const right = source.charCodeAt(boundary)
  return left >= 0xd800 && left <= 0xdbff && right >= 0xdc00 && right <= 0xdfff
}

function findOverlaps(targets) {
  const ranges = targets
    .flatMap((target) =>
      target.ranges.map((range) => ({
        targetId: target.id,
        start: range.start,
        end: range.end,
      })),
    )
    .sort((left, right) => left.start - right.start || left.end - right.end)
  const diagnostics = []

  for (let leftIndex = 0; leftIndex < ranges.length; leftIndex += 1) {
    const left = ranges[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < ranges.length; rightIndex += 1) {
      const right = ranges[rightIndex]
      if (right.start >= left.end) break
      diagnostics.push(
        diagnostic('target-ranges-overlap', {
          firstTargetId: left.targetId,
          secondTargetId: right.targetId,
          overlap: {start: right.start, end: Math.min(left.end, right.end)},
        }),
      )
    }
  }

  return diagnostics
}

function validateMaterializedPlan(plan, rawSource) {
  const source = normalizeSource(rawSource)
  const actual = identifySource(source)

  if (
    plan.sourceIdentity.normalization !== actual.normalization ||
    plan.sourceIdentity.algorithm !== actual.algorithm ||
    plan.sourceIdentity.digest !== actual.digest
  ) {
    return {
      status: 'stale',
      planUsed: false,
      diagnostics: [
        diagnostic('scene-source-stale', {
          expected: plan.sourceIdentity,
          actual,
        }),
      ],
    }
  }

  return {status: 'fresh', planUsed: true, diagnostics: []}
}

function rangeOf(source, text, from = 0) {
  const start = source.indexOf(text, from)
  if (start === -1) throw new Error(`Fixture text not found: ${text}`)
  return {start, end: start + text.length}
}

function deriveTaskPlan(rawSource) {
  const source = normalizeSource(rawSource)
  const firstBreak = source.indexOf('\n')
  const state = rangeOf(source, '[ ]')
  const stableId = rangeOf(source, 'CLI-042', state.end)
  const title = rangeOf(source, 'Add export command', stableId.end)
  const detail = firstBreak === -1
    ? undefined
    : rangeOf(source, source.slice(firstBreak + 1).trim(), firstBreak + 1)

  return resolveScene({
    recipe: {name: 'task-explainer', version: 1},
    rawSource,
    targets: [
      {id: 'task.state', role: 'state', locator: {kind: 'ranges', ranges: [state]}},
      {
        id: 'task.stable-id',
        role: 'stable-id',
        locator: {kind: 'ranges', ranges: [stableId]},
      },
      {
        id: 'task.description',
        role: 'description',
        locator: {
          kind: 'ranges',
          ranges: detail ? [title, detail] : [title],
        },
      },
    ],
  })
}

const repeatedSource = 'auth -> cache -> auth'
const repeatedAuthRanges = exactMatches(repeatedSource, 'auth')
const entryAuthNode = {type: 'word', rawRange: repeatedAuthRanges[0]}
const exitAuthNode = {type: 'word', rawRange: repeatedAuthRanges[1]}
const repeatedText = {
  question: 'How is repeated exact text resolved?',
  ambiguousTextOnly: resolveScene({
    recipe: {name: 'concept-flow', version: 1},
    rawSource: repeatedSource,
    targets: [
      {
        id: 'authentication',
        role: 'concept',
        locator: {kind: 'exact-text', text: 'auth'},
      },
    ],
  }),
  resolvedWithUniqueSemanticAnchors: resolveScene({
    recipe: {name: 'concept-flow', version: 1},
    rawSource: repeatedSource,
    parsedAnchors: [
      semanticAnchorFromAstSelection('entry-auth', repeatedSource, entryAuthNode),
      semanticAnchorFromAstSelection('exit-auth', repeatedSource, exitAuthNode),
    ],
    targets: [
      {
        id: 'authentication.entry',
        role: 'concept',
        locator: {kind: 'anchor', name: 'entry-auth'},
      },
      {
        id: 'authentication.exit',
        role: 'concept',
        locator: {kind: 'anchor', name: 'exit-auth'},
      },
    ],
  }),
  overlappingOccurrencesAreAlsoAmbiguous: resolveScene({
    recipe: {name: 'concept-flow', version: 1},
    rawSource: 'aaa',
    targets: [
      {
        id: 'overlapping-text',
        role: 'concept',
        locator: {kind: 'exact-text', text: 'aa'},
      },
    ],
  }),
  emptyExactTextFails: resolveScene({
    recipe: {name: 'concept-flow', version: 1},
    rawSource: repeatedSource,
    targets: [
      {
        id: 'empty-text',
        role: 'concept',
        locator: {kind: 'exact-text', text: ''},
      },
    ],
  }),
}

const taskSource = `[ ] CLI-042 Add export command #cli\r\nWrite task output as JSON for scripts and agents`
const discontinuousRanges = {
  question: 'Can one semantic target own multiple ordered source ranges?',
  result: deriveTaskPlan(taskSource),
}

const astRawSource = ` \r\n[ ] CLI-042 Add export command #cli\r\nDetails 😀\r\n `
const stableIdRawRange = rangeOf(astRawSource, 'CLI-042')
const detailRawRange = rangeOf(astRawSource, 'Details 😀')
const stableIdProjectedRange = projectRawRange(astRawSource, stableIdRawRange)
const detailProjectedRange = projectRawRange(astRawSource, detailRawRange)
const astAndTokenProjection = {
  question: 'Which parser offsets may enter a Scene plan?',
  rawSource: astRawSource,
  parserOutput: [
    {
      kind: 'structured-token',
      grammarSlot: 'task.stable-id',
      rawRange: stableIdRawRange,
      projectedRange: stableIdProjectedRange,
    },
    {
      kind: 'ast-node',
      nodeType: 'text',
      semanticKey: 'task.detail',
      rawRange: detailRawRange,
      projectedRange: detailProjectedRange,
    },
  ],
  result: resolveScene({
    recipe: {name: 'task-explainer', version: 1},
    rawSource: astRawSource,
    targets: [
      {
        id: 'task.stable-id',
        role: 'stable-id',
        locator: {kind: 'ranges', ranges: [stableIdProjectedRange]},
        provenance: {
          kind: 'structured-token',
          grammarSlot: 'task.stable-id',
          rawRange: stableIdRawRange,
          projectedWith: normalization,
        },
      },
      {
        id: 'task.detail',
        role: 'description',
        locator: {kind: 'ranges', ranges: [detailProjectedRange]},
        provenance: {
          kind: 'ast-node',
          nodeType: 'text',
          semanticKey: 'task.detail',
          rawRange: detailRawRange,
          projectedWith: normalization,
        },
      },
    ],
  }),
  verdict:
    'Raw file or AST offsets are provenance only. A producer must project them after source normalization; only scene-local canonical UTF-16 ranges enter the plan.',
}

const rangeValidation = {
  question: 'Which range relationships are valid for the linear renderers?',
  adjacentTargets: resolveScene({
    recipe: {name: 'range-fixture', version: 1},
    rawSource: 'abcdef',
    targets: [
      {id: 'left', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 0, end: 3}]}},
      {id: 'right', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 3, end: 6}]}},
    ],
  }),
  overlappingTargets: resolveScene({
    recipe: {name: 'range-fixture', version: 1},
    rawSource: 'abcdef',
    targets: [
      {id: 'outer', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 0, end: 5}]}},
      {id: 'inner', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 2, end: 4}]}},
    ],
  }),
  wholeEmoji: resolveScene({
    recipe: {name: 'range-fixture', version: 1},
    rawSource: 'A😀B',
    targets: [
      {id: 'emoji', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 1, end: 3}]}},
    ],
  }),
  splitSurrogatePair: resolveScene({
    recipe: {name: 'range-fixture', version: 1},
    rawSource: 'A😀B',
    targets: [
      {id: 'broken-emoji', role: 'concept', locator: {kind: 'ranges', ranges: [{start: 2, end: 3}]}},
    ],
  }),
}

const originalPlanResult = deriveTaskPlan(taskSource)
if (originalPlanResult.status !== 'resolved') {
  throw new Error('Expected the source-edit fixture to resolve.')
}
const editedTaskSource = `[ ] CLI-042 Add export command #cli @owner:platform\r\nWrite task output as JSON for scripts and agents`
const editedPlanResult = deriveTaskPlan(editedTaskSource)
const sourceEdit = {
  question: 'What happens when canonical source changes?',
  originalPlan: originalPlanResult.plan,
  oldPlanAgainstEditedSource: validateMaterializedPlan(
    originalPlanResult.plan,
    editedTaskSource,
  ),
  recipeRerun: editedPlanResult,
  verdict:
    'The saved plan fails closed as stale. Re-running the deterministic recipe may retain semantic target IDs while producing a new source identity and new ranges; no fuzzy remapping occurs.',
}

const scenarios = {
  repeatedText,
  discontinuousRanges,
  astAndTokenProjection,
  rangeValidation,
  sourceEdit,
}

const requested = process.argv[2] ?? 'all'

console.log('PROTOTYPE: stable Annotation scene target identity')
console.log(JSON.stringify({
  identity:
    'recipe name + recipe version + scene-local semantic target ID minted from a grammar slot, structured key, or explicit semantic anchor',
  location:
    'one or more exact, increasing, disjoint UTF-16 ranges over normalized canonical source; ranges and AST paths are never identity',
  staleness:
    'SHA-256 covers UTF-8 bytes of trim-lf-v1 normalized source; a saved plan is wholly stale on fingerprint mismatch and must be re-derived without fuzzy remapping',
}, null, 2))

if (requested === 'all') {
  for (const [name, state] of Object.entries(scenarios)) {
    console.log(`\n--- ${name} ---`)
    console.log(JSON.stringify(state, null, 2))
  }
} else if (requested in scenarios) {
  console.log(JSON.stringify(scenarios[requested], null, 2))
} else {
  console.error(`Choose one of: all, ${Object.keys(scenarios).join(', ')}`)
  process.exitCode = 1
}
