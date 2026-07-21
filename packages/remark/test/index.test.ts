import {compile} from '@mdx-js/mdx'
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
})
