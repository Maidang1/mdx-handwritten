import {compile, evaluate} from '@mdx-js/mdx'
import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'
import remarkDirective from 'remark-directive'
import {afterEach, describe, expect, it} from 'vitest'
import {
  createScenePlan,
  type ScenePlanV1
} from 'mdx-handwritten-scene'
import remarkMdxHandwritten, {
  handwrittenComponentNames,
  handwrittenDirectiveNames,
  type HandwrittenOptions,
  type HandwrittenRuleId
} from '../src/index.js'

function compileMdx(
  source: string,
  options: HandwrittenOptions = {},
  path = '/checkout/project/docs/example.mdx',
  cwd = '/checkout/project'
) {
  return compile(
    {value: source, path, cwd},
    {
      remarkPlugins: [
        remarkDirective,
        [remarkMdxHandwritten, options]
      ]
    }
  )
}

function isElementLike(
  value: unknown
): value is {type: unknown; props: {children?: unknown}} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'props' in value &&
    typeof value.props === 'object' &&
    value.props !== null
  )
}

function findElement(node: unknown, type: string): unknown {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, type)
      if (match !== undefined) return match
    }
    return undefined
  }
  if (!isElementLike(node)) return undefined
  if (node.type === type) return node
  return findElement(node.props.children, type)
}

function renderedText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return isElementLike(node) ? renderedText(node.props.children) : ''
}

function domIdPart(value: string): string {
  return `u-${Array.from(value, (character) =>
    character.codePointAt(0)!.toString(16).padStart(6, '0')
  ).join('-')}`
}

async function compileFailure(
  source: string,
  options: HandwrittenOptions = {}
): Promise<{ruleId?: string; source?: string; reason?: string}> {
  try {
    await compileMdx(source, options)
  } catch (error) {
    return error as {ruleId?: string; source?: string; reason?: string}
  }
  throw new Error('Expected compilation to fail')
}

const completeSource = `
:hw-text[hand]{tone="muted" rotate="-1"}

:hw-link[Go]{href="/guide" icon="arrow-forward"}

:hw-mark[marked]{kind="highlight"}

:hw-annotate[\`CLI-042\`]{label="stable ID" shift-inline="1"}

::hw-note[Done]{tone="success"}

:::hw-brace[spec]
Brace body.
:::

:::hw-margin[the backlog]
Margin body.
:::

:::hw-watermark[draft]
Watermark body.
:::
`

const taskSceneBody = `[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents`

const checkedTaskListSceneBody =
  '- [x] AUTH-004 Add magic-link login #auth !high @blocked_by:AUTH-003'

const reviewedPlanBinding = 'rp1_01k4m6h8q2w9c5x7t3v0n8s6dy'
const temporaryProjectRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryProjectRoots.splice(0).map((root) =>
      rm(root, {force: true, recursive: true})
    )
  )
})

function reviewedPlan(source = taskSceneBody, locale = 'en'): ScenePlanV1 {
  const result = createScenePlan({recipe: 'task-explainer', source, locale})
  if (!result.ok) throw new Error('Expected the test Recipe to materialize.')
  return {
    ...result.plan,
    provenance: {
      kind: 'reviewed-proposal',
      engine: result.plan.provenance.engine,
      generator: {id: 'remark-test', version: '1'},
      review: {status: 'approved', id: 'review-test-1'}
    }
  }
}

function reviewedPlanWithDistinctMeaning(): ScenePlanV1 {
  const plan = reviewedPlan()
  return {
    ...plan,
    labels: plan.labels.map((label) =>
      label.id === 'priority-label'
        ? {...label, text: 'reviewed urgency'}
        : label
    ),
    relationships: plan.relationships.map((relationship) =>
      relationship.id === 'priority-annotation'
        ? {...relationship, legendText: 'reviewed urgency: !high'}
        : relationship
    )
  }
}

async function temporaryProjectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mdx-handwritten-remark-'))
  temporaryProjectRoots.push(root)
  return root
}

async function writeReviewedPlanBytes(
  bytes: string | Uint8Array,
  binding = reviewedPlanBinding
): Promise<string> {
  const root = await temporaryProjectRoot()
  const directory = join(root, '.mdx-handwritten', 'plans')
  await mkdir(directory, {recursive: true})
  await writeFile(join(directory, `${binding}.json`), bytes)
  return root
}

async function writeReviewedPlan(
  plan: ScenePlanV1,
  binding = reviewedPlanBinding
): Promise<string> {
  return writeReviewedPlanBytes(JSON.stringify(plan), binding)
}

function taskScene(locale?: string): string {
  const localeAttribute = locale === undefined ? '' : ` locale="${locale}"`
  return `:::hw-scene{recipe="task-explainer"${localeAttribute}}
${taskSceneBody}
:::`
}

function boundTaskScene(
  binding = reviewedPlanBinding,
  locale?: string,
  source = taskSceneBody,
  recipe = 'task-explainer'
): string {
  const localeAttribute = locale === undefined ? '' : ` locale="${locale}"`
  return `:::hw-scene{recipe="${recipe}"${localeAttribute} plan="${binding}"}
${source}
:::`
}

describe('public contract', () => {
  it('exports the frozen eight-directive and component contracts', () => {
    expect(handwrittenDirectiveNames).toEqual([
      'hw-text',
      'hw-link',
      'hw-mark',
      'hw-annotate',
      'hw-note',
      'hw-brace',
      'hw-margin',
      'hw-watermark'
    ])
    expect(handwrittenComponentNames.note).toBe('HandNote')
  })
})

describe('component output', () => {
  it('transports one revalidated Reviewed plan artifact as the only HandScene prop', async () => {
    const plan = reviewedPlan()
    const projectRoot = await writeReviewedPlan(plan)
    const output = String(
      await compileMdx(boundTaskScene(), {
        reviewedPlans: {projectRoot}
      })
    )

    expect(output).toMatch(/_jsx\(HandScene, \{\s+plan: \{/u)
    expect(output).not.toMatch(
      /_jsx\(HandScene, \{[\s\S]*?\b(?:recipe|source|locale):/u
    )
    expect(output).toContain('"kind": "reviewed-proposal"')
    expect(output).toContain('review-test-1')
  })

  it('transports plan text as inert JSON ESTree values', async () => {
    const payload = '"}); throw new Error("executed"); ({'
    const plan = {...reviewedPlan(), title: payload}
    const projectRoot = await writeReviewedPlan(plan)
    const module = await evaluate(
      {
        value: boundTaskScene(),
        path: join(projectRoot, 'docs', 'example.mdx'),
        cwd: projectRoot
      },
      {
        Fragment,
        jsx,
        jsxs,
        remarkPlugins: [
          remarkDirective,
          [remarkMdxHandwritten, {reviewedPlans: {projectRoot}}]
        ]
      }
    )
    const rendered = module.default({
      components: {HandScene: () => null}
    })

    expect(isElementLike(rendered)).toBe(true)
    if (!isElementLike(rendered)) throw new Error('Expected HandScene output.')
    expect(Object.keys(rendered.props)).toEqual(['plan'])
    expect(
      (rendered.props as {plan?: ScenePlanV1}).plan?.title
    ).toBe(payload)
  })

  it('compiles all directives to the stable PascalCase component API', async () => {
    const file = await compileMdx(completeSource, {output: 'component'})
    const output = String(file)
    for (const component of Object.values(handwrittenComponentNames)) {
      expect(output).toContain(component)
    }
    expect(output).toContain('shiftInline: "1"')
    expect(output).toContain('shiftBlock: "0"')
    expect(output).toContain('"data-hw-variant"')
    expect(output).toMatch(/_jsx\(HandNote, \{[\s\S]*children: _jsx\(_components\.p/u)
  })

  it('auto-imports only components used by the document', async () => {
    const file = await compileMdx(':hw-text[hello]', {
      imports: {mode: 'auto', source: 'mdx-handwritten-react'}
    })
    const output = String(file)
    expect(output).toContain('import {HandText} from "mdx-handwritten-react"')
    expect(output).not.toContain('HandNote')
  })

  it('is a true no-op when a document has no handwritten directives', async () => {
    const file = await compileMdx('# Plain MDX', {
      imports: {mode: 'auto', source: 'mdx-handwritten-react'}
    })
    expect(String(file)).not.toContain('mdx-handwritten-react')
  })

  it('detects auto-import binding conflicts, including exported declarations', async () => {
    const failure = await compileFailure(
      'export const HandText = () => null\n\n:hw-text[x]',
      {imports: {mode: 'auto', source: 'mdx-handwritten-react'}}
    )
    expect(failure).toMatchObject({
      source: 'remark-mdx-handwritten',
      ruleId: 'import-conflict'
    })
  })

  it('emits the fixed HandScene contract with one materialized plan prop', async () => {
    const output = String(await compileMdx(taskScene()))
    expect(output).toContain('HandScene')
    expect(output).toMatch(/_jsx\(HandScene, \{\s+plan: \{/u)
    expect(output).toContain('"name": "task-explainer"')
    expect(output).toContain('"locale": "en"')
    expect(output).toContain('@blocked_by:CLI-041')
    expect(output).not.toContain('data-hw-variant')
  })

  it('passes a plain checked task-list source through to HandScene', async () => {
    const output = String(
      await compileMdx(
        `:::hw-scene{recipe="task-explainer"}\n${checkedTaskListSceneBody}\n:::`
      )
    )
    expect(output).toContain('HandScene')
    expect(output).toContain('- [x] AUTH-004 Add magic-link login')
    expect(output).toContain('@blocked_by:AUTH-003')
  })

  it('auto-imports HandScene without changing the exact-eight component map', async () => {
    const output = String(
      await compileMdx(taskScene(), {
        imports: {mode: 'auto', source: 'mdx-handwritten-react'}
      })
    )
    expect(output).toContain('import {HandScene} from "mdx-handwritten-react"')
    expect(Object.values(handwrittenComponentNames)).not.toContain('HandScene')
  })

  it('detects an auto-import conflict for the fixed scene component', async () => {
    const failure = await compileFailure(
      `export const HandScene = () => null\n\n${taskScene()}`,
      {imports: {mode: 'auto', source: 'mdx-handwritten-react'}}
    )
    expect(failure.ruleId).toBe('import-conflict')
  })
})

describe('element output', () => {
  it('emits semantic real text nodes and decorative SVG glyphs', async () => {
    const output = String(await compileMdx(completeSource, {output: 'element'}))
    expect(output).toContain('"data-hw": "annotate"')
    expect(output).toContain('"data-hw-target"')
    expect(output).toContain('"data-hw-label"')
    expect(output).toContain('"data-hw-connector"')
    expect(output).toContain('"data-hw-glyph": "arrow-forward"')
    expect(output).toContain('"data-hw-brace-glyph"')
    expect(output).toContain('"aria-hidden": true')
    expect(output).toMatch(/_jsxs\(_components\.div, \{\n\s+"data-hw": "note"/u)
    expect(output).toContain('"data-hw-body"')
    expect(output).toContain('_components.figcaption')
    expect(output).toContain('_components.aside')
  })

  it('puts a back arrow before its link label', async () => {
    const output = String(
      await compileMdx(
        ':hw-link[Back]{href="/" icon="arrow-back"}',
        {output: 'element'}
      )
    )
    expect(output.indexOf('"data-hw-glyph": "arrow-back"')).toBeLessThan(
      output.indexOf('"data-hw-label"')
    )
  })

  it('renders a semantic scene with described targets and a complete legend', async () => {
    const output = String(await compileMdx(taskScene(), {output: 'element'}))
    expect(output).toContain('_components.figure')
    expect(output).toContain('_components.figcaption')
    expect(output).toContain('_components.pre')
    expect(output).toContain('_components.code')
    expect(output).toContain('_components.ol')
    expect(output).toContain('"data-hw-target": "priority"')
    expect(output).toContain('"data-hw-target-role": "priority"')
    expect(output).toContain('"data-hw-annotation-role": "priority"')
    expect(output).toContain('"aria-describedby"')
    expect(output).toContain('priority: !high')
    expect(output).toContain('custom field: @blocked_by:CLI-041')
    expect(output).toContain('"data-hw-connector": "curved"')
    expect(output).toContain('"data-hw-annotation-row"')
    expect(output).toContain('"aria-hidden": true')
    expect(output.indexOf('_components.code')).toBeLessThan(
      output.indexOf('_components.ol')
    )
  })

  it('preserves exact canonical source text when the element output is evaluated', async () => {
    const module = await evaluate(
      {value: taskScene(), path: '/checkout/project/docs/example.mdx'},
      {
        Fragment,
        jsx,
        jsxs,
        remarkPlugins: [
          remarkDirective,
          [remarkMdxHandwritten, {output: 'element'}]
        ]
      }
    )
    const pre = findElement(module.default({}), 'pre')
    expect(pre).toBeDefined()
    expect(renderedText(pre)).toBe(taskSceneBody)
  })

  it('renders a checked task-list source without losing its list prefix', async () => {
    const output = String(
      await compileMdx(
        `:::hw-scene{recipe="task-explainer"}\n${checkedTaskListSceneBody}\n:::`,
        {output: 'element'}
      )
    )
    expect(output).toContain('children: ["- ",')
    expect(output).toContain('"data-hw-target": "state"')
    expect(output).toContain('children: "[x]"')
    expect(output).toContain('completed task: [x]')
    expect(output).toContain('stable ID: AUTH-004')
  })

  it('keeps every discontinuous description range in source order', async () => {
    const output = String(await compileMdx(taskScene(), {output: 'element'}))
    expect(output.match(/"data-hw-target": "description"/gu)).toHaveLength(2)
    const descriptionId = `hw-scene-1-annotation-${domIdPart('description-annotation')}`
    expect(output.split(descriptionId).length - 1).toBeGreaterThan(1)
  })

  it('localizes the caption and complete legend while preserving source', async () => {
    const output = String(
      await compileMdx(taskScene('zh-CN'), {output: 'element'})
    )
    expect(output).toContain('任务解析')
    expect(output).toContain('优先级：!high')
    expect(output).toContain('自定义字段：@blocked_by:CLI-041')
    expect(output.match(/lang: "zh-CN"/gu)).toHaveLength(2)
  })
})

describe('strip output', () => {
  it('preserves links, annotation labels, container bodies, and meaningful labels', async () => {
    const output = String(await compileMdx(completeSource, {output: 'strip'}))
    expect(output).not.toMatch(/Hand(?:Text|Link|Mark|Annotate|Note|Brace|Margin|Watermark)/u)
    expect(output).toContain('href: "/guide"')
    expect(output).toContain('stable ID')
    expect(output).toContain('Brace body.')
    expect(output).toContain('the backlog')
    expect(output).not.toContain('draft')
  })

  it('preserves canonical scene source followed by the full ordered legend', async () => {
    const output = String(await compileMdx(taskScene(), {output: 'strip'}))
    expect(output).not.toContain('HandScene')
    expect(output).toContain('@blocked_by:CLI-041')
    expect(output).toContain('open task: [ ]')
    expect(output).toContain('stable ID: CLI-042')
    expect(output).toContain('description: Add export command\\nWrite task output as JSON for scripts and agents')
    expect(output).toContain('priority: !high')
    expect(output).toContain('_components.ol')
  })

  it('marks the generated localized title and legend language', async () => {
    const output = String(await compileMdx(taskScene('zh-CN'), {output: 'strip'}))

    expect(output.match(/lang: "zh-CN"/gu)).toHaveLength(2)
    expect(output).toContain('任务解析')
    expect(output).toContain('@blocked_by:CLI-041')
    expect(output).toContain('优先级：!high')
  })

  it('preserves exact canonical source text when strip output is evaluated', async () => {
    const module = await evaluate(
      {value: taskScene(), path: '/checkout/project/docs/example.mdx'},
      {
        Fragment,
        jsx,
        jsxs,
        remarkPlugins: [
          remarkDirective,
          [remarkMdxHandwritten, {output: 'strip'}]
        ]
      }
    )
    const pre = findElement(module.default({}), 'pre')
    expect(pre).toBeDefined()
    expect(renderedText(pre)).toBe(taskSceneBody)
  })
})

describe('Reviewed plan artifact bindings', () => {
  for (const reference of [
    '',
    '../reviewed-plan',
    '/tmp/reviewed-plan',
    'https://example.test/reviewed-plan.json',
    'rp1_*'
  ]) {
    it(`rejects the non-opaque plan reference ${JSON.stringify(reference)}`, async () => {
      const failure = await compileFailure(boundTaskScene(reference))
      expect(failure.ruleId).toBe('scene-plan-binding-invalid')
    })
  }

  it('uses the same reviewed meaning in component, element, and strip output without emitting the sidecar', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlanWithDistinctMeaning())

    for (const outputMode of ['component', 'element', 'strip'] as const) {
      const output = String(
        await compileMdx(boundTaskScene(), {
          output: outputMode,
          reviewedPlans: {projectRoot}
        })
      )
      expect(output).toContain('reviewed urgency: !high')
      expect(output).not.toContain(reviewedPlanBinding)
      expect(output).not.toContain(projectRoot)
    }
  })

  it('maps reviewed relation, gesture, and intent semantics in element output', async () => {
    const plan = reviewedPlan()
    plan.relationships = plan.relationships.map((relationship) =>
      relationship.id === 'priority-annotation'
        ? {
            id: relationship.id,
            kind: 'relates',
            relation: 'contrasts',
            labelId: relationship.labelId,
            fromTargetIds: ['description'],
            toTargetIds: ['priority'],
            detailKind: 'short-description',
            legendText: 'priority contrast: description then !high'
          }
        : relationship
    )
    plan.gestures = [
      ...plan.gestures,
      {
        id: 'priority-emphasis',
        kind: 'emphasize',
        targetIds: ['priority'],
        intent: 'warning'
      },
      {
        id: 'priority-connect',
        kind: 'connect',
        relationshipId: 'priority-annotation'
      },
      {
        id: 'priority-verdict',
        kind: 'verdict',
        relationshipId: 'priority-annotation',
        intent: 'negative'
      }
    ]
    const projectRoot = await writeReviewedPlan(plan)
    const output = String(
      await compileMdx(boundTaskScene(), {
        output: 'element',
        reviewedPlans: {projectRoot}
      })
    )

    expect(output).toContain('_components.mark')
    expect(output).toContain('"data-hw-gesture": "emphasize"')
    expect(output).toContain('"data-hw-intent": "warning"')
    expect(output).toContain(
      '"data-hw-gesture": "annotate connect verdict"'
    )
    expect(output).toContain('"data-hw-intent": "negative"')
    expect(output).toContain('"data-hw-relation": "contrasts"')
    expect(output).toContain('"data-hw-relationship": "relates"')
    expect(output).toContain('"data-hw-connector": "straight"')
    expect(output).toContain('"data-hw-verdict"')
  })

  it('encodes distinct valid Scene IDs as distinct DOM IDs', async () => {
    const plan = reviewedPlan()
    const renamed = new Map([
      ['state-annotation', 'note:a'],
      ['stable-id-annotation', 'note/a']
    ])
    plan.relationships = plan.relationships.map((relationship) => ({
      ...relationship,
      id: renamed.get(relationship.id) ?? relationship.id
    }))
    plan.gestures = plan.gestures.map((gesture) =>
      gesture.kind === 'emphasize'
        ? gesture
        : {
            ...gesture,
            relationshipId:
              renamed.get(gesture.relationshipId) ?? gesture.relationshipId
          }
    )
    const projectRoot = await writeReviewedPlan(plan)
    const output = String(
      await compileMdx(boundTaskScene(), {
        output: 'element',
        reviewedPlans: {projectRoot}
      })
    )
    const colonId = `hw-scene-1-annotation-${domIdPart('note:a')}`
    const slashId = `hw-scene-1-annotation-${domIdPart('note/a')}`

    expect(colonId).not.toBe(slashId)
    expect(output).toContain(`id: "${colonId}"`)
    expect(output).toContain(`id: "${slashId}"`)
    expect(output).toContain(`"aria-describedby": "${colonId}"`)
    expect(output).toContain(`"aria-describedby": "${slashId}"`)
  })

  it('re-reads and revalidates sidecar bytes on every build', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlanWithDistinctMeaning())
    const options: HandwrittenOptions = {
      diagnostics: 'warn',
      output: 'element',
      reviewedPlans: {projectRoot}
    }

    const first = await compileMdx(boundTaskScene(), options)
    expect(String(first)).toContain('reviewed urgency: !high')

    await writeFile(
      join(
        projectRoot,
        '.mdx-handwritten',
        'plans',
        `${reviewedPlanBinding}.json`
      ),
      '{'
    )
    const second = await compileMdx(boundTaskScene(), options)

    expect(
      second.messages.some(
        (message) => message.ruleId === 'scene-plan-json-invalid'
      )
    ).toBe(true)
    expect(String(second)).toContain('@blocked_by:CLI-041')
    expect(String(second)).not.toContain('reviewed urgency')
    expect(String(second)).not.toContain('_components.figure')
  })

  it('fails strict compilation when the explicitly bound artifact is missing', async () => {
    const projectRoot = await temporaryProjectRoot()
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })

    expect(failure).toMatchObject({
      source: 'remark-mdx-handwritten',
      ruleId: 'scene-plan-artifact-missing'
    })
  })

  it('reports an unreadable artifact when no build Adapter is configured', async () => {
    const failure = await compileFailure(boundTaskScene())
    expect(failure.ruleId).toBe('scene-plan-artifact-unreadable')
  })

  it('rejects a non-absolute project root through the build diagnostic policy', async () => {
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot: 'relative/project'}
    })
    expect(failure.ruleId).toBe('scene-plan-artifact-unreadable')
  })

  it('rejects a sidecar symlink even when its target is inside the project root', async () => {
    const projectRoot = await temporaryProjectRoot()
    const directory = join(projectRoot, '.mdx-handwritten', 'plans')
    const target = join(projectRoot, 'reviewed-plan.json')
    await mkdir(directory, {recursive: true})
    await writeFile(target, JSON.stringify(reviewedPlan()))
    await symlink(target, join(directory, `${reviewedPlanBinding}.json`))

    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-artifact-unreadable')
  })

  it('rejects a fixed plan directory that resolves outside the project root', async () => {
    const projectRoot = await temporaryProjectRoot()
    const externalDirectory = await temporaryProjectRoot()
    await mkdir(join(projectRoot, '.mdx-handwritten'), {recursive: true})
    await writeFile(
      join(externalDirectory, `${reviewedPlanBinding}.json`),
      JSON.stringify(reviewedPlan())
    )
    await symlink(
      externalDirectory,
      join(projectRoot, '.mdx-handwritten', 'plans')
    )

    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-artifact-unreadable')
  })

  it('bounds artifact bytes before UTF-8 decoding or JSON parsing', async () => {
    const projectRoot = await writeReviewedPlanBytes(
      new Uint8Array(65_537).fill(0x20)
    )
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-limit-exceeded')
  })

  it('rejects non-UTF-8 artifact bytes as unreadable', async () => {
    const projectRoot = await writeReviewedPlanBytes(
      Uint8Array.from([0xc3, 0x28])
    )
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-artifact-unreadable')
  })

  it('passes malformed JSON to the closed candidate validator', async () => {
    const projectRoot = await writeReviewedPlanBytes('{')
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-json-invalid')
  })

  it('preserves the candidate validator diagnostic for unknown fields', async () => {
    const projectRoot = await writeReviewedPlanBytes(
      JSON.stringify({...reviewedPlan(), unexpected: true})
    )
    const failure = await compileFailure(boundTaskScene(), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-field-unknown')
  })

  it('rejects a Stale Scene plan without relocating its targets', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlan())
    const changedSource = taskSceneBody.replace('CLI-042', 'CLI-043')
    const failure = await compileFailure(
      boundTaskScene(reviewedPlanBinding, undefined, changedSource),
      {reviewedPlans: {projectRoot}}
    )
    expect(failure.ruleId).toBe('scene-plan-source-stale')
  })

  it('rejects a Reviewed plan artifact whose Recipe declaration differs', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlan())
    const failure = await compileFailure(
      boundTaskScene(
        reviewedPlanBinding,
        undefined,
        taskSceneBody,
        'status-change'
      ),
      {reviewedPlans: {projectRoot}}
    )
    expect(failure.ruleId).toBe('scene-plan-declaration-mismatch')
  })

  it('compares the declared locale canonically and rejects a different locale', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlan())
    const failure = await compileFailure(boundTaskScene(reviewedPlanBinding, 'zh-CN'), {
      reviewedPlans: {projectRoot}
    })
    expect(failure.ruleId).toBe('scene-plan-declaration-mismatch')
  })

  it('accepts case-insensitive spelling of the candidate canonical locale', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlan(taskSceneBody, 'zh-CN'))
    const output = String(
      await compileMdx(boundTaskScene(reviewedPlanBinding, 'zh-cn'), {
        reviewedPlans: {projectRoot}
      })
    )
    expect(output).toContain('"locale": "zh-CN"')
  })

  it('keeps a binding current across CRLF and outer-whitespace normalization', async () => {
    const projectRoot = await writeReviewedPlan(reviewedPlan())
    const source = `:::hw-scene{recipe="task-explainer" plan="${reviewedPlanBinding}"}\r\n\r\n${taskSceneBody.replaceAll('\n', '\r\n')}\r\n\r\n:::`
    const output = String(
      await compileMdx(source, {reviewedPlans: {projectRoot}})
    )

    expect(output).toContain('HandScene')
    expect(output).toContain('"digest": "2c79b786797663d91d551320a3554d19a4da2aac5a2955f9e3c1286d7ffee1ab"')
  })

  const incompatibleArtifacts: Array<[
    string,
    HandwrittenRuleId,
    () => string
  ]> = [
    [
      'schema',
      'scene-plan-schema-unsupported',
      () => JSON.stringify({...reviewedPlan(), schemaVersion: 2})
    ],
    [
      'Recipe version',
      'scene-recipe-version-unsupported',
      () =>
        JSON.stringify({
          ...reviewedPlan(),
          recipe: {name: 'task-explainer', version: 2}
        })
    ],
    [
      'Localization catalog',
      'scene-plan-localization-invalid',
      () => {
        const plan = reviewedPlan()
        return JSON.stringify({
          ...plan,
          localization: {
            ...plan.localization,
            catalog: {...plan.localization.catalog, version: 2}
          }
        })
      }
    ],
    [
      'Plan provenance',
      'scene-plan-provenance-invalid',
      () => {
        const plan = reviewedPlan()
        return JSON.stringify({
          ...plan,
          provenance: {
            kind: 'deterministic-recipe',
            engine: plan.provenance.engine,
            appliedCorrections: []
          }
        })
      }
    ]
  ]

  for (const [label, ruleId, candidate] of incompatibleArtifacts) {
    it(`fails strict compilation for incompatible ${label}`, async () => {
      const projectRoot = await writeReviewedPlanBytes(candidate())
      const failure = await compileFailure(boundTaskScene(), {
        reviewedPlans: {projectRoot}
      })
      expect(failure.ruleId).toBe(ruleId)
    })
  }

  it('warns and emits only canonical source for a missing binding without Recipe fallback or HandScene import', async () => {
    const projectRoot = await temporaryProjectRoot()
    const file = await compileMdx(boundTaskScene(), {
      diagnostics: 'warn',
      imports: {mode: 'auto', source: 'mdx-handwritten-react'},
      reviewedPlans: {projectRoot}
    })
    const output = String(file)

    expect(
      file.messages.some(
        (message) => message.ruleId === 'scene-plan-artifact-missing'
      )
    ).toBe(true)
    expect(output).toContain('@blocked_by:CLI-041')
    expect(output).not.toContain('Task explainer')
    expect(output).not.toContain('open task: [ ]')
    expect(output).not.toContain('HandScene')
    expect(output).not.toContain('_components.ol')
  })

  const warningFailures: Array<[
    string,
    HandwrittenRuleId,
    () => Promise<{
      projectRoot: string
      locale?: string
      source?: string
    }>
  ]> = [
    [
      'unreadable',
      'scene-plan-artifact-unreadable',
      async () => ({
        projectRoot: await writeReviewedPlanBytes(
          Uint8Array.from([0xc3, 0x28])
        )
      })
    ],
    [
      'oversized',
      'scene-plan-limit-exceeded',
      async () => ({
        projectRoot: await writeReviewedPlanBytes(
          new Uint8Array(65_537).fill(0x20)
        )
      })
    ],
    [
      'malformed',
      'scene-plan-json-invalid',
      async () => ({projectRoot: await writeReviewedPlanBytes('{')})
    ],
    [
      'incompatible',
      'scene-plan-schema-unsupported',
      async () => ({
        projectRoot: await writeReviewedPlanBytes(
          JSON.stringify({...reviewedPlan(), schemaVersion: 2})
        )
      })
    ],
    [
      'declaration-mismatched',
      'scene-plan-declaration-mismatch',
      async () => ({
        projectRoot: await writeReviewedPlan(reviewedPlan()),
        locale: 'zh-CN'
      })
    ],
    [
      'stale',
      'scene-plan-source-stale',
      async () => ({
        projectRoot: await writeReviewedPlan(reviewedPlan()),
        source: taskSceneBody.replace('CLI-042', 'CLI-043')
      })
    ]
  ]

  for (const [label, ruleId, setup] of warningFailures) {
    it(`warn mode emits canonical source only for a ${label} bound artifact`, async () => {
      const {projectRoot, locale, source} = await setup()
      const file = await compileMdx(
        boundTaskScene(
          reviewedPlanBinding,
          locale,
          source ?? taskSceneBody
        ),
        {
          diagnostics: 'warn',
          imports: {mode: 'auto', source: 'mdx-handwritten-react'},
          reviewedPlans: {projectRoot}
        }
      )
      const output = String(file)

      expect(file.messages.some((message) => message.ruleId === ruleId)).toBe(true)
      expect(output).toContain('@blocked_by:CLI-041')
      expect(output).not.toContain('Task explainer')
      expect(output).not.toContain('open task: [ ]')
      expect(output).not.toContain('HandScene')
      expect(output).not.toContain('_components.ol')
    })
  }
})

describe('strict validation and diagnostics', () => {
  const cases: Array<[string, string, HandwrittenRuleId]> = [
    ['unknown directive', ':hw-unknown[x]', 'directive-unknown'],
    ['wrong form', '::hw-text[x]', 'directive-wrong-kind'],
    ['unknown attribute', ':hw-text[x]{style="color:red"}', 'attribute-unknown'],
    ['unquoted attribute', ':hw-text[x]{tone=muted}', 'attribute-dynamic'],
    [
      'duplicate container attribute',
      ':::hw-brace[L]{side="inline-end" side="inline-start"}\nbody\n:::',
      'attribute-duplicate'
    ],
    ['unsafe protocol', ':hw-link[x]{href="javascript:alert(1)"}', 'url-unsafe'],
    ['protocol-relative URL', ':hw-link[x]{href="//evil.test"}', 'url-unsafe'],
    [
      'interactive descendant',
      ':hw-mark[<button>bad</button>]',
      'nesting-invalid'
    ],
    [
      'interactive ancestor',
      '[outer :hw-link[inner]{href="/inner"}](/outer)',
      'nesting-invalid'
    ],
    [
      'container order',
      '::::hw-brace[brace]\n:::hw-margin[margin]\nbody\n:::\n::::',
      'nesting-invalid'
    ]
  ]

  for (const [label, source, ruleId] of cases) {
    it(`reports ${label} with a stable ruleId`, async () => {
      const failure = await compileFailure(source)
      expect(failure).toMatchObject({source: 'remark-mdx-handwritten', ruleId})
    })
  }

  it('validates custom component identifiers', async () => {
    const failure = await compileFailure(':hw-text[x]', {
      components: {text: 'not-a-binding'}
    })
    expect(failure.ruleId).toBe('component-invalid')
  })

  it('can downgrade author errors to VFile warnings and strips invalid syntax', async () => {
    const file = await compileMdx(':hw-text[x]{tone=muted}', {
      diagnostics: 'warn'
    })
    expect(file.messages.some((message) => message.ruleId === 'attribute-dynamic')).toBe(true)
    expect(String(file)).not.toContain('HandText')
    expect(String(file)).toContain('children: "x"')
  })

  const sceneCases: Array<[string, string, HandwrittenRuleId]> = [
    [
      'scene wrong form',
      '::hw-scene[x]{recipe="task-explainer"}',
      'directive-wrong-kind'
    ],
    [
      'scene missing recipe',
      ':::hw-scene\n[ ] CLI-1 title\n:::',
      'attribute-invalid'
    ],
    [
      'scene unquoted recipe',
      ':::hw-scene{recipe=task-explainer}\n[ ] CLI-1 title\n:::',
      'attribute-dynamic'
    ],
    [
      'scene duplicate recipe',
      ':::hw-scene{recipe="task-explainer" recipe="task-explainer"}\n[ ] CLI-1 title\n:::',
      'attribute-duplicate'
    ],
    [
      'scene unknown attribute',
      ':::hw-scene{recipe="task-explainer" tone="muted"}\n[ ] CLI-1 title\n:::',
      'attribute-unknown'
    ],
    [
      'scene bracket label',
      ':::hw-scene[task]{recipe="task-explainer"}\n[ ] CLI-1 title\n:::',
      'attribute-invalid'
    ],
    [
      'scene formatted body',
      ':::hw-scene{recipe="task-explainer"}\n[ ] CLI-1 **title**\n:::',
      'nesting-invalid'
    ],
    [
      'formatted task-list scene body',
      ':::hw-scene{recipe="task-explainer"}\n- [x] AUTH-004 **title**\n:::',
      'nesting-invalid'
    ],
    [
      'HTML task-list scene body',
      ':::hw-scene{recipe="task-explainer"}\n- [x] AUTH-004 <span>title</span>\n:::',
      'nesting-invalid'
    ],
    [
      'nested task-list scene body',
      ':::hw-scene{recipe="task-explainer"}\n- [x] AUTH-004 title\n  - nested\n:::',
      'nesting-invalid'
    ],
    [
      'scene nested handwritten content',
      ':::hw-scene{recipe="task-explainer"}\n:hw-mark[title]\n:::',
      'nesting-invalid'
    ],
    [
      'unknown scene recipe',
      ':::hw-scene{recipe="terminal"}\n[ ] CLI-1 title\n:::',
      'scene-recipe-unknown'
    ],
    [
      'unsupported scene locale',
      ':::hw-scene{recipe="task-explainer" locale="fr"}\n[ ] CLI-1 title\n:::',
      'scene-locale-unsupported'
    ],
    [
      'empty scene source',
      ':::hw-scene{recipe="task-explainer"}\n:::',
      'scene-source-empty'
    ],
    [
      'invalid task syntax',
      ':::hw-scene{recipe="task-explainer"}\nplain prose\n:::',
      'scene-recipe-rejected'
    ],
    [
      'ambiguous task priority',
      ':::hw-scene{recipe="task-explainer"}\n[ ] CLI-1 title !high !low\n:::',
      'scene-recipe-rejected'
    ]
  ]

  for (const [label, source, ruleId] of sceneCases) {
    it(`reports ${label} with a stable ruleId`, async () => {
      const failure = await compileFailure(source)
      expect(failure).toMatchObject({source: 'remark-mdx-handwritten', ruleId})
    })
  }

  it('maps the scene source length diagnostic without attempting layout', async () => {
    const failure = await compileFailure(
      `:::hw-scene{recipe="task-explainer"}\n[ ] CLI-1 ${'x'.repeat(4096)}\n:::`
    )
    expect(failure.ruleId).toBe('scene-source-too-long')
  })

  it('warn mode preserves the canonical source even when Markdown parsed a colon token', async () => {
    const file = await compileMdx(
      `:::hw-scene{recipe="unknown"}\n${taskSceneBody}\n:::`,
      {diagnostics: 'warn'}
    )
    expect(file.messages.some((message) => message.ruleId === 'scene-recipe-unknown')).toBe(true)
    expect(String(file)).not.toContain('HandScene')
    expect(String(file)).toContain('@blocked_by:CLI-041')
  })

  it('warn mode keeps a wrong inline scene form readable in its paragraph', async () => {
    const file = await compileMdx(
      'Before :hw-scene[source]{recipe="task-explainer"} after.',
      {diagnostics: 'warn'}
    )
    expect(file.messages.some((message) => message.ruleId === 'directive-wrong-kind')).toBe(true)
    expect(String(file)).toContain('children: ["Before ", "source", " after."]')
  })
})

describe('determinism and metadata', () => {
  it('uses cwd-relative POSIX paths so checkout roots do not affect variants', async () => {
    const first = String(
      await compileMdx(
        ':hw-text[café]',
        {},
        '/agent-one/project/docs/a.mdx',
        '/agent-one/project'
      )
    )
    const second = String(
      await compileMdx(
        ':hw-text[café]',
        {},
        '/agent-two/project/docs/a.mdx',
        '/agent-two/project'
      )
    )
    const pattern = /"data-hw-variant": "([1-4])"/u
    expect(pattern.exec(first)?.[1]).toBe(pattern.exec(second)?.[1])
  })

  it('records per-directive usage on VFile data when requested', async () => {
    const file = await compileMdx(':hw-text[a] and :hw-mark[b]', {
      recordUsage: true
    })
    expect(file.data.mdxHandwritten).toMatchObject({
      total: 2,
      directives: {'hw-text': 1, 'hw-mark': 1}
    })
  })

  it('counts a scene toward the safety limit but not the exact-eight usage record', async () => {
    const file = await compileMdx(`${taskScene()}\n\n:hw-text[x]`, {
      diagnostics: 'warn',
      limits: {maxDirectivesPerFile: 1},
      recordUsage: true
    })
    expect(file.messages.some((message) => message.ruleId === 'directive-limit')).toBe(true)
    expect(file.data.mdxHandwritten).toMatchObject({
      total: 1,
      directives: {'hw-text': 1}
    })
    const usage = file.data.mdxHandwritten as
      | {directives?: Record<string, number>}
      | undefined
    expect(Object.keys(usage?.directives ?? {})).toEqual(handwrittenDirectiveNames)
  })
})
