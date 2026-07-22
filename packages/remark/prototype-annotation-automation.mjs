#!/usr/bin/env node

// PROTOTYPE — throw this branch away after the authoring boundary is decided.
// Question: how little can an author write while keeping annotation output
// deterministic, reviewable, and accessible?

import {createInterface} from 'node:readline'

const taskSource = `[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents`

const scenarios = {
  '1': {
    name: 'Known structure: task syntax',
    authorInput: `:::hw-scene{recipe="task-explainer" locale="en"}\n${taskSource}\n:::`,
    derive: () => deriveTaskScene(taskSource),
  },
  '2': {
    name: 'Generic content: compact semantic hints',
    authorInput:
      ':::hw-scene{explain}\nThe request passes through {auth::authentication}, then {cache::memoized response}.\n:::',
    derive: () => deriveHintedScene(
      'The request passes through {auth::authentication}, then {cache::memoized response}.',
    ),
  },
  '3': {
    name: 'Unstructured prose: intentionally unresolved',
    authorInput:
      ':::hw-scene{explain}\nThe cache makes this fast, except when authentication rotates the token.\n:::',
    derive: () => ({
      status: 'needs-intent',
      reason:
        'Arbitrary prose has no stable target or label semantics. A build-time assistant may propose a ScenePlan, but compilation must not silently invent one.',
      safeNextStep: {
        automatic: 'Offer an editor/build-time suggestion',
        authorConfirms: ['targets', 'labels', 'relationships'],
        compilerConsumes: 'the saved deterministic ScenePlan',
      },
    }),
  },
}

function rangeOf(source, value, from = 0) {
  const start = source.indexOf(value, from)
  return start < 0 ? undefined : {start, end: start + value.length}
}

function target(id, meaning, label, value, source, placement, tone, from = 0) {
  const sourceRange = rangeOf(source, value, from)
  return {
    id,
    meaning,
    sourceRanges: sourceRange ? [sourceRange] : [],
    renderedText: value,
    annotation: {
      gesture: 'arrow-label',
      label,
      placement,
      tone,
    },
  }
}

function deriveTaskScene(source) {
  const checkbox = source.match(/^\s*(\[(?: |x|X)\])/)?.[1]
  const stableId = source.match(/\b([A-Z][A-Z0-9]*-\d+)\b/)?.[1]
  const tag = source.match(/#[\p{L}\p{N}_-]+/u)?.[0]
  const priority = source.match(/!(?:low|medium|high|urgent)\b/i)?.[0]
  const customField = source.match(/@[a-z][\w-]*:[^\s]+/i)?.[0]
  const firstLine = source.split('\n')[0]
  const descriptionStart = stableId ? firstLine.indexOf(stableId) + stableId.length : 0
  const metadataStarts = [tag, priority, customField]
    .filter(Boolean)
    .map((value) => firstLine.indexOf(value))
    .filter((index) => index >= 0)
  const descriptionEnd = metadataStarts.length > 0 ? Math.min(...metadataStarts) : firstLine.length
  const title = firstLine.slice(descriptionStart, descriptionEnd).trim()
  const detail = source.split('\n').slice(1).join(' ').trim()
  const description = [title, detail].filter(Boolean).join(' / ')
  const descriptionRanges = [
    title ? rangeOf(source, title, descriptionStart) : undefined,
    detail ? rangeOf(source, detail, firstLine.length) : undefined,
  ].filter(Boolean)

  const candidates = [
    checkbox && target('state', 'task-state', checkbox.trim() === '[ ]' ? 'open task' : 'completed task', checkbox, source, 'below', 'warning'),
    stableId && target('stable-id', 'stable-identifier', 'stable ID', stableId, source, 'above', 'info'),
    description && {
      id: 'description',
      meaning: 'task-description',
      sourceRanges: descriptionRanges,
      renderedText: description,
      annotation: {
        gesture: 'arrow-label',
        label: 'description',
        placement: 'below',
        tone: 'muted',
      },
    },
    tag && target('tag', 'classification-tag', 'tag', tag, source, 'above', 'success'),
    priority && target('priority', 'task-priority', 'priority', priority, source, 'above', 'danger'),
    customField && target('custom-field', 'task-field', 'custom field', customField, source, 'below', 'accent'),
  ].filter(Boolean)

  return scenePlan('task', source, candidates)
}

function deriveHintedScene(source) {
  const matcher = /\{([^{}:]+)::([^{}]+)\}/g
  const targets = []
  let match
  let cleanSource = ''
  let cursor = 0

  while ((match = matcher.exec(source)) !== null) {
    cleanSource += source.slice(cursor, match.index)
    const start = cleanSource.length
    cleanSource += match[1]
    targets.push({
      id: `target-${targets.length + 1}`,
      meaning: 'author-named-concept',
      sourceRanges: [{start, end: start + match[1].length}],
      renderedText: match[1],
      annotation: {
        gesture: 'arrow-label',
        label: match[2],
        placement: targets.length % 2 === 0 ? 'above' : 'below',
        tone: targets.length % 2 === 0 ? 'info' : 'success',
      },
    })
    cursor = matcher.lastIndex
  }

  cleanSource += source.slice(cursor)
  return scenePlan('generic-hints', cleanSource, targets)
}

function scenePlan(recipe, source, targets) {
  return {
    version: 1,
    status: 'deterministic',
    recipe,
    source,
    targets,
    layout: {
      strategy: 'logical-lanes',
      authorCoordinates: false,
      wide: 'place labels in block-start/block-end lanes; shift, then stack on collision',
      narrow: 'replace arrows with numbered inline markers and an ordered legend',
    },
    accessibility: {
      sourceOrder: 'content first, annotation labels second',
      decorativeConnectors: 'aria-hidden',
      noCss: 'labels remain readable after their targets',
      print: 'use the narrow ordered-legend form',
    },
  }
}

function printScenario(key) {
  const scenario = scenarios[key]
  console.log(`\n--- ${scenario.name} ---`)
  console.log('\nAuthor writes:\n')
  console.log(scenario.authorInput)
  console.log('\nFull derived state:\n')
  console.log(JSON.stringify(scenario.derive(), null, 2))
}

console.log('PROTOTYPE: automated annotation authoring boundary')
console.log('Question: what may the system infer without making the document unpredictable?')
console.log('\n1 — known task preset\n2 — generic semantic hints\n3 — unstructured prose\nq — quit')

const readline = createInterface({input: process.stdin, output: process.stdout})
readline.setPrompt('\nChoose a scenario: ')
readline.prompt()
readline.on('line', (line) => {
  const choice = line.trim().toLowerCase()
  if (choice === 'q') {
    readline.close()
    return
  }
  if (scenarios[choice]) printScenario(choice)
  else console.log('Choose 1, 2, 3, or q.')
  readline.prompt()
})
