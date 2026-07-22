import {compile, evaluate} from '@mdx-js/mdx'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'
import remarkDirective from 'remark-directive'
import {describe, expect, it} from 'vitest'
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

function taskScene(locale?: string): string {
  const localeAttribute = locale === undefined ? '' : ` locale="${locale}"`
  return `:::hw-scene{recipe="task-explainer"${localeAttribute}}
${taskSceneBody}
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

  it('emits the fixed HandScene contract with canonical static props', async () => {
    const output = String(await compileMdx(taskScene()))
    expect(output).toContain('HandScene')
    expect(output).toContain('recipe: "task-explainer"')
    expect(output).toContain('locale: "en"')
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
    expect(output.match(/hw-scene-1-annotation-description-annotation/gu)?.length).toBeGreaterThan(1)
  })

  it('localizes the caption and complete legend while preserving source', async () => {
    const output = String(
      await compileMdx(taskScene('zh-CN'), {output: 'element'})
    )
    expect(output).toContain('任务解析')
    expect(output).toContain('优先级：!high')
    expect(output).toContain('自定义字段：@blocked_by:CLI-041')
    expect(output).toContain('lang: "zh-CN"')
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
      'scene-task-syntax-invalid'
    ],
    [
      'ambiguous task priority',
      ':::hw-scene{recipe="task-explainer"}\n[ ] CLI-1 title !high !low\n:::',
      'scene-task-priority-ambiguous'
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
