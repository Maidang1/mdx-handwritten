// PROTOTYPE — throwaway branch evidence for GitHub issue #8.
// Three layout strategies share the same semantic fixtures and are switchable
// with ?variant=matrix, ?variant=rails, or ?variant=article.
// Run from the repository root with: npm run dev

import { useEffect, useState } from 'react'

type VariantKey = 'matrix' | 'rails' | 'article'
type LayoutMode = 'responsive' | 'rich' | 'compact' | 'print' | 'no-css' | 'over-capacity'
type NonEmptyFixture<T> = readonly [T, ...T[]]

interface SourceSegment {
  text: string
  targetId?: string
  role?: string
}

interface SourceBlock {
  kind: 'main' | 'before' | 'after' | 'verdict' | 'overflow'
  segments: readonly SourceSegment[]
}

interface LabelFixture {
  id: string
  text: string
}

type RelationshipFixture =
  | {
      id: string
      kind: 'describes'
      labelId: string
      targetIds: NonEmptyFixture<string>
      detailKind: 'short-description'
      legendText: string
    }
  | {
      id: string
      kind: 'relates'
      relation: 'depends-on' | 'contrasts' | 'changes-to'
      labelId: string
      fromTargetIds: NonEmptyFixture<string>
      toTargetIds: NonEmptyFixture<string>
      detailKind: 'short-description'
      legendText: string
    }

type GestureFixture =
  | { id: string; kind: 'annotate'; relationshipId: string }
  | { id: string; kind: 'group' | 'connect'; relationshipId: string }
  | { id: string; kind: 'emphasize'; targetIds: NonEmptyFixture<string>; intent: 'attention' | 'positive' | 'warning' | 'negative' }
  | { id: string; kind: 'verdict'; relationshipId: string; intent: 'positive' | 'negative' | 'warning' }

interface SceneFixture {
  id: 'task' | 'terminal' | 'status'
  recipe: 'task-explainer' | 'mdtask-terminal' | 'status-change'
  title: string
  blocks: readonly SourceBlock[]
  labels: readonly LabelFixture[]
  relationships: readonly RelationshipFixture[]
  gestures: readonly GestureFixture[]
  richEnvelope: string
  compactTrigger: string
  connectorPolicy: string
}

interface VariantDefinition {
  key: VariantKey
  name: string
  question: string
  promise: string
}

const variants: readonly VariantDefinition[] = [
  {
    key: 'matrix',
    name: 'Fallback matrix',
    question: 'Can every rich-layout promise be falsified by a visible fallback case?',
    promise: 'Fixed containers and media mirrors; no viewport reads or DOM measurement.'
  },
  {
    key: 'rails',
    name: 'Recipe rails',
    question: 'How expressive can a finite recipe topology be without global collision solving?',
    promise: 'Source-first Grid plus one in-flow label rail and bounded decorative connectors.'
  },
  {
    key: 'article',
    name: 'Reader-first article',
    question: 'Is marker plus complete legend strong enough to be the default, not just failure UI?',
    promise: 'Single article flow; connectors are unnecessary and long labels wrap naturally.'
  }
] as const

const defaultVariant = variants[0]!

const taskFixture: SceneFixture = {
  id: 'task',
  recipe: 'task-explainer',
  title: 'Task anatomy',
  blocks: [
    {
      kind: 'main',
      segments: [
        { text: '[ ]', targetId: 'state', role: 'state' },
        { text: ' ' },
        { text: 'CLI-042', targetId: 'stable-id', role: 'stable-id' },
        { text: ' ' },
        { text: 'Add export command', targetId: 'description', role: 'description' },
        { text: ' ' },
        { text: '#cli', targetId: 'tag', role: 'tag' },
        { text: ' ' },
        { text: '!high', targetId: 'priority', role: 'priority' },
        { text: ' ' },
        { text: '@blocked_by:CLI-041', targetId: 'field', role: 'field' },
        { text: '\n' },
        {
          text: 'Write task output as JSON for scripts and agents',
          targetId: 'description',
          role: 'description'
        }
      ]
    }
  ],
  labels: [
    { id: 'state-copy', text: 'open task' },
    { id: 'stable-id-copy', text: 'stable ID' },
    { id: 'description-copy', text: 'description' },
    { id: 'tag-copy', text: 'tag' },
    { id: 'priority-copy', text: 'priority' },
    { id: 'dependency-copy', text: 'dependency' }
  ],
  relationships: [
    {
      id: 'state-label',
      kind: 'describes',
      labelId: 'state-copy',
      targetIds: ['state'],
      detailKind: 'short-description',
      legendText: 'Open task — applies to “[ ]”.'
    },
    {
      id: 'stable-id-label',
      kind: 'describes',
      labelId: 'stable-id-copy',
      targetIds: ['stable-id'],
      detailKind: 'short-description',
      legendText: 'Stable ID — applies to “CLI-042”.'
    },
    {
      id: 'description-label',
      kind: 'describes',
      labelId: 'description-copy',
      targetIds: ['description'],
      detailKind: 'short-description',
      legendText: 'Description — applies to the title and detail line.'
    },
    {
      id: 'tag-label',
      kind: 'describes',
      labelId: 'tag-copy',
      targetIds: ['tag'],
      detailKind: 'short-description',
      legendText: 'Tag — applies to “#cli”.'
    },
    {
      id: 'priority-label',
      kind: 'describes',
      labelId: 'priority-copy',
      targetIds: ['priority'],
      detailKind: 'short-description',
      legendText: 'Priority — applies to “!high”.'
    },
    {
      id: 'field-label',
      kind: 'relates',
      relation: 'depends-on',
      labelId: 'dependency-copy',
      fromTargetIds: ['stable-id'],
      toTargetIds: ['field'],
      detailKind: 'short-description',
      legendText: 'Dependency — CLI-042 depends on “@blocked_by:CLI-041”.'
    }
  ],
  gestures: [
    { id: 'state-gesture', kind: 'annotate', relationshipId: 'state-label' },
    { id: 'stable-id-gesture', kind: 'annotate', relationshipId: 'stable-id-label' },
    { id: 'description-gesture', kind: 'annotate', relationshipId: 'description-label' },
    { id: 'tag-gesture', kind: 'annotate', relationshipId: 'tag-label' },
    { id: 'priority-gesture', kind: 'annotate', relationshipId: 'priority-label' },
    { id: 'priority-emphasis', kind: 'emphasize', targetIds: ['priority'], intent: 'warning' },
    { id: 'dependency-gesture', kind: 'connect', relationshipId: 'field-label' }
  ],
  richEnvelope: '≥42rem · ≤2 lines · exactly 6 recipe roles',
  compactTrigger: '<42rem, repeated roles, extra detail, or a fragmented target',
  connectorPolicy: 'Only adjacent source-to-rail cells; never obstacle routing'
}

const terminalFixture: SceneFixture = {
  id: 'terminal',
  recipe: 'mdtask-terminal',
  title: 'Inert terminal transcript',
  blocks: [
    {
      kind: 'main',
      segments: [
        { text: '$ mdtask list', targetId: 'command-list', role: 'command' },
        { text: '\n[ ] ' },
        { text: 'AUTH-004', targetId: 'auth-004', role: 'stable-id' },
        { text: ' Add passwordless magic-link login ' },
        { text: '!high', targetId: 'priority', role: 'priority' },
        { text: '\n[ ] ' },
        { text: 'AUTH-005', targetId: 'auth-005', role: 'stable-id' },
        { text: ' Rate-limit the magic-link ' },
        { text: '@blocked_by:AUTH-004', targetId: 'dependency', role: 'field' },
        { text: '\n\n' },
        { text: '$ mdtask list --all', targetId: 'command-all', role: 'command' },
        { text: '\n[x] ' },
        { text: 'AUTH-001', targetId: 'auth-001', role: 'stable-id' },
        { text: ' Add email and password login\n[x] ' },
        { text: 'AUTH-003', targetId: 'auth-003', role: 'stable-id' },
        { text: ' Rotate refresh tokens on every use\n[ ] ' },
        { text: 'AUTH-004', targetId: 'auth-004', role: 'stable-id' },
        { text: ' Add passwordless magic-link login ' },
        { text: '!high', targetId: 'priority', role: 'priority' },
        { text: '\n[ ] ' },
        { text: 'AUTH-005', targetId: 'auth-005', role: 'stable-id' },
        { text: ' Rate-limit the magic-link ' },
        { text: '@blocked_by:AUTH-004', targetId: 'dependency', role: 'field' },
        { text: '\n\n' },
        { text: '$ mdtask view AUTH-005', targetId: 'command-view', role: 'command' },
        { text: '\n' },
        { text: 'docs/specs/auth.md:42', targetId: 'source-location', role: 'source-location' },
        { text: '\n[ ] ' },
        { text: 'AUTH-005', targetId: 'auth-005', role: 'stable-id' },
        { text: ' Rate-limit the magic-link ' },
        { text: '@blocked_by:AUTH-004', targetId: 'dependency', role: 'field' },
        { text: '\n' },
        {
          text: 'Cap requests per email and per IP once the endpoint exists.',
          targetId: 'task-detail',
          role: 'description'
        }
      ]
    }
  ],
  labels: [
    { id: 'list-command-copy', text: 'active list' },
    { id: 'all-command-copy', text: 'all tasks' },
    { id: 'view-command-copy', text: 'task detail' },
    { id: 'terminal-priority-copy', text: 'priority' },
    { id: 'terminal-dependency-copy', text: 'dependency' },
    { id: 'completed-copy', text: 'completed tasks' },
    { id: 'source-copy', text: 'source location' },
    { id: 'detail-copy', text: 'description' }
  ],
  relationships: [
    {
      id: 'list-command-label',
      kind: 'describes',
      labelId: 'list-command-copy',
      targetIds: ['command-list'],
      detailKind: 'short-description',
      legendText: 'Active-list command — applies to “$ mdtask list”.'
    },
    {
      id: 'all-command-label',
      kind: 'describes',
      labelId: 'all-command-copy',
      targetIds: ['command-all'],
      detailKind: 'short-description',
      legendText: 'All-task command — applies to “$ mdtask list --all”.'
    },
    {
      id: 'view-command-label',
      kind: 'describes',
      labelId: 'view-command-copy',
      targetIds: ['command-view'],
      detailKind: 'short-description',
      legendText: 'Detail command — applies to “$ mdtask view AUTH-005”.'
    },
    {
      id: 'priority-label',
      kind: 'describes',
      labelId: 'terminal-priority-copy',
      targetIds: ['priority'],
      detailKind: 'short-description',
      legendText: 'High priority — applies to both “!high” occurrences.'
    },
    {
      id: 'dependency-label',
      kind: 'relates',
      relation: 'depends-on',
      labelId: 'terminal-dependency-copy',
      fromTargetIds: ['auth-005', 'dependency'],
      toTargetIds: ['auth-004'],
      detailKind: 'short-description',
      legendText: 'Dependency — AUTH-005 is blocked by AUTH-004 in every listed view.'
    },
    {
      id: 'completed-label',
      kind: 'describes',
      labelId: 'completed-copy',
      targetIds: ['auth-001', 'auth-003'],
      detailKind: 'short-description',
      legendText: 'Completed tasks — applies to AUTH-001 and AUTH-003.'
    },
    {
      id: 'source-label',
      kind: 'describes',
      labelId: 'source-copy',
      targetIds: ['source-location'],
      detailKind: 'short-description',
      legendText: 'Source location — applies to “docs/specs/auth.md:42”.'
    },
    {
      id: 'detail-label',
      kind: 'describes',
      labelId: 'detail-copy',
      targetIds: ['task-detail'],
      detailKind: 'short-description',
      legendText: 'Description — applies to the request-cap sentence in the detail view.'
    }
  ],
  gestures: [
    { id: 'list-command-gesture', kind: 'annotate', relationshipId: 'list-command-label' },
    { id: 'all-command-gesture', kind: 'annotate', relationshipId: 'all-command-label' },
    { id: 'view-command-gesture', kind: 'annotate', relationshipId: 'view-command-label' },
    { id: 'terminal-priority-gesture', kind: 'annotate', relationshipId: 'priority-label' },
    { id: 'terminal-priority-emphasis', kind: 'emphasize', targetIds: ['priority'], intent: 'warning' },
    { id: 'terminal-dependency-gesture', kind: 'connect', relationshipId: 'dependency-label' },
    { id: 'completed-gesture', kind: 'group', relationshipId: 'completed-label' },
    { id: 'source-gesture', kind: 'annotate', relationshipId: 'source-label' },
    { id: 'detail-gesture', kind: 'annotate', relationshipId: 'detail-label' }
  ],
  richEnvelope: '≥42rem · 3 command groups · 7 task rows · ≤59 ASCII columns',
  compactTrigger: 'an eighth row, opaque row, wide glyph, wrapped target, or cross-group route',
  connectorPolicy: 'Row-local cells only; cross-group relationships use the legend'
}

const statusFixture: SceneFixture = {
  id: 'status',
  recipe: 'status-change',
  title: 'Specification status change',
  blocks: [
    {
      kind: 'before',
      segments: [
        { text: 'BEFORE\n' },
        {
          text: 'Code is shipped and the task is closed, but the spec is stale.',
          targetId: 'before-state',
          role: 'before'
        },
        { text: '\n\n' }
      ]
    },
    {
      kind: 'after',
      segments: [
        { text: 'AFTER\n' },
        {
          text: 'Spec updated in the same commit :)',
          targetId: 'after-state',
          role: 'after'
        },
        { text: '\n\n' }
      ]
    },
    {
      kind: 'verdict',
      segments: [
        { text: 'VERDICT\n' },
        {
          text: 'The implementation and its specification now ship together.',
          targetId: 'verdict',
          role: 'verdict'
        }
      ]
    }
  ],
  labels: [
    { id: 'before-copy', text: 'stale' },
    { id: 'after-copy', text: 'updated' },
    { id: 'change-copy', text: 'changes to' },
    { id: 'verdict-copy', text: 'positive verdict' }
  ],
  relationships: [
    {
      id: 'before-label',
      kind: 'describes',
      labelId: 'before-copy',
      targetIds: ['before-state'],
      detailKind: 'short-description',
      legendText: 'Before — the shipped implementation has a stale specification.'
    },
    {
      id: 'after-label',
      kind: 'describes',
      labelId: 'after-copy',
      targetIds: ['after-state'],
      detailKind: 'short-description',
      legendText: 'After — the specification is updated in the same commit.'
    },
    {
      id: 'change-label',
      kind: 'relates',
      relation: 'changes-to',
      labelId: 'change-copy',
      fromTargetIds: ['before-state'],
      toTargetIds: ['after-state'],
      detailKind: 'short-description',
      legendText: 'Change — the stale specification changes to the updated specification.'
    },
    {
      id: 'verdict-label',
      kind: 'describes',
      labelId: 'verdict-copy',
      targetIds: ['verdict'],
      detailKind: 'short-description',
      legendText: 'Positive verdict — implementation and specification ship together.'
    }
  ],
  gestures: [
    { id: 'before-gesture', kind: 'annotate', relationshipId: 'before-label' },
    { id: 'after-gesture', kind: 'annotate', relationshipId: 'after-label' },
    { id: 'change-gesture', kind: 'connect', relationshipId: 'change-label' },
    { id: 'verdict-gesture', kind: 'verdict', relationshipId: 'verdict-label', intent: 'positive' }
  ],
  richEnvelope: '≥64rem · exactly 2 panels · exactly 1 factual verdict',
  compactTrigger: '<64rem, a third panel, dense panel content, or any obstacle route',
  connectorPolicy: 'One known before-to-after cell; verdict never depends on a connector'
}

const fixtures = [taskFixture, terminalFixture, statusFixture] as const

function targetCount(scene: SceneFixture): number {
  return new Set(
    scene.blocks.flatMap((block) =>
      block.segments.flatMap((segment) => segment.targetId ?? [])
    )
  ).size
}

function relationshipTargetIds(relationship: RelationshipFixture): readonly string[] {
  return relationship.kind === 'describes'
    ? relationship.targetIds
    : [...relationship.fromTargetIds, ...relationship.toTargetIds]
}

function markerMap(scene: SceneFixture): Map<string, string> {
  const markers = new Map<string, string[]>()

  scene.relationships.forEach((relationship, index) => {
    for (const targetId of relationshipTargetIds(relationship)) {
      const values = markers.get(targetId) ?? []
      const marker = String(index + 1)
      if (!values.includes(marker)) values.push(marker)
      markers.set(targetId, values)
    }
  })

  return new Map([...markers].map(([key, value]) => [key, value.join(',')]))
}

function descriptionMap(scene: SceneFixture, prefix: string): Map<string, string> {
  const descriptions = new Map<string, string[]>()

  for (const relationship of scene.relationships) {
    for (const targetId of relationshipTargetIds(relationship)) {
      const ids = descriptions.get(targetId) ?? []
      ids.push(`${prefix}-${relationship.id}`)
      descriptions.set(targetId, ids)
    }
  }

  return new Map([...descriptions].map(([key, value]) => [key, value.join(' ')]))
}

function SceneSource({
  scene,
  prefix,
  markers = false
}: {
  scene: SceneFixture
  prefix: string
  markers?: boolean
}) {
  const markerByTarget = markerMap(scene)
  const descriptions = descriptionMap(scene, prefix)
  const hasPanels = scene.blocks.length > 1

  return (
    <pre className={hasPanels ? 'prototype-source prototype-source--panels' : 'prototype-source'}>
      <code>
        {scene.blocks.map((block, blockIndex) => (
          <span className="prototype-source-block" data-block={block.kind} key={block.kind}>
            {block.segments.map((segment, segmentIndex) =>
              segment.targetId ? (
                <span
                  aria-describedby={descriptions.get(segment.targetId)}
                  data-marker={markers ? markerByTarget.get(segment.targetId) : undefined}
                  data-prototype-target={segment.targetId}
                  data-role={segment.role}
                  key={`${blockIndex}-${segmentIndex}`}
                >
                  {segment.text}
                </span>
              ) : (
                <span key={`${blockIndex}-${segmentIndex}`}>{segment.text}</span>
              )
            )}
          </span>
        ))}
      </code>
    </pre>
  )
}

function SceneLegend({
  scene,
  prefix,
  className = ''
}: {
  scene: SceneFixture
  prefix: string
  className?: string
}) {
  return (
    <ol className={`prototype-legend ${className}`.trim()}>
      {scene.relationships.map((relationship, index) => (
        <li
          data-label={scene.labels.find((label) => label.id === relationship.labelId)?.text}
          data-relationship={relationship.kind === 'relates' ? relationship.relation : relationship.kind}
          id={`${prefix}-${relationship.id}`}
          key={relationship.id}
        >
          <span className="prototype-legend-number" aria-hidden="true">{index + 1}</span>
          <span>{relationship.legendText}</span>
          <i aria-hidden="true" className="prototype-connector" />
        </li>
      ))}
    </ol>
  )
}

function PrototypeState({
  scene,
  mode,
  overCapacity = false
}: {
  scene: SceneFixture
  mode: LayoutMode
  overCapacity?: boolean
}) {
  const topology =
    mode === 'responsive'
      ? 'recipe rail → marker + legend via container query'
      : mode === 'rich'
      ? 'recipe rail'
      : mode === 'compact'
        ? 'marker + legend'
        : mode === 'print'
          ? 'linear paged flow'
          : mode === 'no-css'
            ? 'source → ordered legend'
            : 'deterministic compact fallback'
  const fallbackReason = overCapacity
    ? `reference envelope + 1: ${scene.compactTrigger}`
    : mode === 'responsive'
      ? `CSS selects compact mode when ${scene.compactTrigger}`
      : mode === 'rich'
      ? 'none — fixture stays inside the candidate rich envelope'
      : mode === 'compact'
        ? 'forced compact container'
        : mode === 'print'
          ? 'fragmented media never uses rich geometry'
          : mode === 'no-css'
            ? 'presentation unavailable; semantic DOM remains complete'
            : scene.compactTrigger

  return (
    <dl className="prototype-state">
      <div><dt>plan</dt><dd>{scene.recipe}@1 · {targetCount(scene)} targets · {scene.labels.length} labels · {scene.relationships.length} relations · {scene.gestures.length} gestures</dd></div>
      <div><dt>topology</dt><dd>{topology}</dd></div>
      <div><dt>candidate envelope</dt><dd>{scene.richEnvelope}</dd></div>
      <div><dt>fallback</dt><dd>{fallbackReason}</dd></div>
      <div><dt>connectors</dt><dd>{mode === 'rich' || mode === 'responsive' ? `${scene.connectorPolicy}; omitted in compact mode` : 'omitted; legend carries all meaning'}</dd></div>
      <div><dt>DOM order</dt><dd>caption → canonical source → complete legend</dd></div>
    </dl>
  )
}

function overflowFixture(scene: SceneFixture): SceneFixture {
  const targetId = `${scene.id}-overflow-target`
  const extraText =
    scene.id === 'task'
      ? '\n#extra-role'
      : scene.id === 'terminal'
        ? '\n[ ] OPS-999 Eighth task row exceeds the reference envelope'
        : '\n\nALTERNATE\nA third comparison panel exceeds the reference envelope.'

  return {
    ...scene,
    blocks: [
      ...scene.blocks,
      {
        kind: 'overflow',
        segments: [{ text: extraText, targetId, role: 'overflow' }]
      }
    ],
    labels: [
      ...scene.labels,
      { id: 'overflow-copy', text: 'overflow probe' }
    ],
    relationships: [
      ...scene.relationships,
      {
        id: 'overflow-label',
        kind: 'describes',
        labelId: 'overflow-copy',
        targetIds: [targetId],
        detailKind: 'short-description',
        legendText: `Overflow probe — the extra ${scene.id === 'status' ? 'panel' : scene.id === 'terminal' ? 'task row' : 'role'} forces compact rendering.`
      }
    ],
    gestures: [
      ...scene.gestures,
      { id: 'overflow-gesture', kind: 'annotate', relationshipId: 'overflow-label' }
    ]
  }
}

function RailScene({
  scene,
  prefix,
  mode = 'responsive'
}: {
  scene: SceneFixture
  prefix: string
  mode?: 'responsive' | 'rich'
}) {
  return (
    <figure className="prototype-scene prototype-scene--rails" data-recipe={scene.recipe}>
      <figcaption>
        <span>{scene.recipe}</span>
        <strong>{scene.title}</strong>
      </figcaption>
      <div className="prototype-rail-stage">
        <SceneSource scene={scene} prefix={prefix} markers />
        <SceneLegend scene={scene} prefix={prefix} className="prototype-rail" />
      </div>
      <PrototypeState scene={scene} mode={mode} />
    </figure>
  )
}

function MarkerScene({
  scene,
  prefix,
  mode = 'compact',
  overCapacity = false
}: {
  scene: SceneFixture
  prefix: string
  mode?: LayoutMode
  overCapacity?: boolean
}) {
  return (
    <figure className="prototype-scene prototype-scene--markers" data-mode={mode} data-recipe={scene.recipe}>
      <figcaption>
        <span>{scene.recipe}</span>
        <strong>{scene.title}</strong>
      </figcaption>
      <SceneSource scene={scene} prefix={prefix} markers />
      <SceneLegend scene={scene} prefix={prefix} />
      <PrototypeState scene={scene} mode={mode} overCapacity={overCapacity} />
    </figure>
  )
}

function RailsVariant() {
  return (
    <div className="prototype-variant prototype-variant--rails">
      {fixtures.map((scene) => (
        <RailScene key={scene.id} prefix={`rails-${scene.id}`} scene={scene} />
      ))}
    </div>
  )
}

function ArticleVariant() {
  return (
    <div className="prototype-variant prototype-variant--article">
      <article className="prototype-article-copy">
        <p className="prototype-article-kicker">A release note with explainable state</p>
        <h3>The code is only half the story.</h3>
        <p>
          Readers should be able to understand a task, the transcript that reports it,
          and the decision that closes it without following a decorative arrow.
        </p>
        <MarkerScene prefix="article-task" scene={taskFixture} />
        <p>
          The terminal output is pasted, inert evidence. The Annotation recipe recognizes
          its rows but never runs the command or reaches outside this document.
        </p>
        <MarkerScene prefix="article-terminal" scene={terminalFixture} />
        <p>
          Finally, an explicit before, after, and factual verdict make the correction
          reviewable without asking a model to decide whether the claim is true.
        </p>
        <MarkerScene prefix="article-status" scene={statusFixture} />
      </article>
      <aside className="prototype-article-review">
        <strong>Reader-first promise</strong>
        <p>Every scene uses the universal source + complete legend topology.</p>
        <ul>
          <li>No connector routing</li>
          <li>Long labels wrap in flow</li>
          <li>Same order at 320px and print</li>
          <li>Exact copy uses canonical plan source</li>
        </ul>
      </aside>
    </div>
  )
}

const matrixModes: readonly { key: LayoutMode; label: string }[] = [
  { key: 'rich', label: 'wide rich' },
  { key: 'compact', label: 'forced compact' },
  { key: 'print', label: 'print / forced colors' },
  { key: 'no-css', label: 'no-CSS order' },
  { key: 'over-capacity', label: 'reference + 1' }
]

function MatrixVariant() {
  return (
    <div className="prototype-matrix-scroll" role="region" aria-label="Layout fallback matrix" tabIndex={0}>
      <div className="prototype-matrix">
        <div className="prototype-matrix-corner">recipe / condition</div>
        {matrixModes.map((mode) => <div className="prototype-matrix-heading" key={mode.key}>{mode.label}</div>)}
        {fixtures.flatMap((scene) => [
          <div className="prototype-matrix-row-heading" key={`${scene.id}-heading`}>
            <strong>{scene.recipe}</strong>
            <span>{scene.richEnvelope}</span>
          </div>,
          ...matrixModes.map((mode) => {
            const overCapacity = mode.key === 'over-capacity'
            const renderedScene = overCapacity ? overflowFixture(scene) : scene
            const prefix = `matrix-${scene.id}-${mode.key}`

            return (
              <div className="prototype-matrix-cell" data-matrix-mode={mode.key} key={`${scene.id}-${mode.key}`}>
                {mode.key === 'rich' ? (
                  <RailScene mode="rich" prefix={prefix} scene={scene} />
                ) : (
                  <MarkerScene
                    mode={mode.key}
                    overCapacity={overCapacity}
                    prefix={prefix}
                    scene={renderedScene}
                  />
                )}
              </div>
            )
          })
        ])}
      </div>
    </div>
  )
}

function PrototypeSwitcher({ current, onChange }: { current: VariantKey; onChange: (key: VariantKey) => void }) {
  const currentIndex = variants.findIndex((variant) => variant.key === current)
  const previous = variants[(currentIndex - 1 + variants.length) % variants.length] ?? defaultVariant
  const next = variants[(currentIndex + 1) % variants.length] ?? defaultVariant
  const definition = variants[currentIndex] ?? defaultVariant

  return (
    <nav className="prototype-switcher" aria-label="Layout prototype variants">
      <button aria-label={`Previous variant: ${previous.name}`} onClick={() => onChange(previous.key)} type="button">←</button>
      <span><strong>{definition.key}</strong> — {definition.name}</span>
      <button aria-label={`Next variant: ${next.name}`} onClick={() => onChange(next.key)} type="button">→</button>
    </nav>
  )
}

function initialVariant(): VariantKey {
  const candidate = new URLSearchParams(window.location.search).get('variant')
  return variants.some((variant) => variant.key === candidate) ? candidate as VariantKey : 'matrix'
}

export function LayoutPrototype() {
  const [variant, setVariant] = useState<VariantKey>(initialVariant)
  const definition = variants.find((item) => item.key === variant) ?? defaultVariant

  function changeVariant(next: VariantKey) {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    url.hash = 'layout-prototype'
    window.history.replaceState(null, '', url)
    setVariant(next)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.matches('input, textarea, [contenteditable]') || target.closest('[contenteditable]'))) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const index = variants.findIndex((item) => item.key === variant)
      const offset = event.key === 'ArrowLeft' ? -1 : 1
      const next = variants[(index + offset + variants.length) % variants.length]
      if (next) changeVariant(next.key)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [variant])

  return (
    <section className="layout-prototype" id="layout-prototype" aria-labelledby="layout-prototype-title">
      <header className="layout-prototype-header">
        <div>
          <p className="overline">Prototype · issue #8 · {definition.key}</p>
          <h2 id="layout-prototype-title">{definition.name}</h2>
          <p>{definition.question}</p>
        </div>
        <div className="layout-prototype-promise">
          <span>Promise under test</span>
          <strong>{definition.promise}</strong>
          <code>no ResizeObserver · no getBoundingClientRect · no hydration contract</code>
        </div>
      </header>

      {variant === 'matrix' ? <MatrixVariant /> : variant === 'rails' ? <RailsVariant /> : <ArticleVariant />}

      {import.meta.env.DEV ? <PrototypeSwitcher current={variant} onChange={changeVariant} /> : null}
    </section>
  )
}
