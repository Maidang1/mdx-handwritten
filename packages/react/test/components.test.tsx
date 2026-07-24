import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  HandAnnotate,
  HandBrace,
  HandLink,
  HandMargin,
  HandMark,
  HandNote,
  HandScene,
  HandText,
  HandWatermark,
  handwrittenComponents,
  handwrittenSceneComponents,
  isSafeHandwrittenHref,
  mdxHandwrittenComponents,
  type ScenePlanV1,
} from '../src/index.js'

describe('@madinah/mdx-handwritten-react server rendering', () => {
  it('exports the exact eight-component MDX map', () => {
    expect(Object.keys(handwrittenComponents)).toEqual([
      'HandText',
      'HandLink',
      'HandMark',
      'HandAnnotate',
      'HandNote',
      'HandBrace',
      'HandMargin',
      'HandWatermark',
    ])
    expect(Object.isFrozen(handwrittenComponents)).toBe(true)
  })

  it('exports frozen scene and combined maps without changing the legacy map', () => {
    expect(Object.keys(handwrittenSceneComponents)).toEqual(['HandScene'])
    expect(Object.keys(mdxHandwrittenComponents)).toEqual([
      'HandText',
      'HandLink',
      'HandMark',
      'HandAnnotate',
      'HandNote',
      'HandBrace',
      'HandMargin',
      'HandWatermark',
      'HandScene',
    ])
    expect(Object.isFrozen(handwrittenSceneComponents)).toBe(true)
    expect(Object.isFrozen(mdxHandwrittenComponents)).toBe(true)
    expect(handwrittenComponents).toEqual({
      HandText,
      HandLink,
      HandMark,
      HandAnnotate,
      HandNote,
      HandBrace,
      HandMargin,
      HandWatermark,
    })
    expect(handwrittenSceneComponents.HandScene).toBe(HandScene)
    expect(mdxHandwrittenComponents).toEqual({
      HandText,
      HandLink,
      HandMark,
      HandAnnotate,
      HandNote,
      HandBrace,
      HandMargin,
      HandWatermark,
      HandScene,
    })
  })

  it('renders inline components with stable data attributes', () => {
    const html = renderToStaticMarkup(
      <p>
        <HandText tone="muted" rotate="-2" data-hw-variant="3">
          handwritten
        </HandText>{' '}
        <HandMark kind="highlight" tone="success">
          marked
        </HandMark>{' '}
        <HandLink href="/guide" icon="arrow-forward" target="blank">
          Guide
        </HandLink>
      </p>,
    )

    expect(html).toContain('data-hw="text"')
    expect(html).toContain('data-hw-variant="3"')
    expect(html).toContain('<mark data-hw="mark"')
    expect(html).toContain('href="/guide"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('data-hw-glyph="arrow-forward"')
    expect(html).toContain('aria-hidden="true"')
  })

  it('renders every mark kind with its corresponding semantic element', () => {
    const html = renderToStaticMarkup(
      <p>
        <HandMark kind="circle" tone="accent" strength="strong">
          circled
        </HandMark>{' '}
        <HandMark kind="strike" tone="muted">
          struck
        </HandMark>{' '}
        <HandMark kind="box" tone="info" strength="strong">
          boxed
        </HandMark>{' '}
        <HandMark kind="underline" tone="danger">
          underlined
        </HandMark>{' '}
        <HandMark kind="highlight" tone="success">
          highlighted
        </HandMark>{' '}
        <HandMark kind="wavy" tone="warning" strength="strong">
          wavy
        </HandMark>{' '}
        <HandMark kind="bracket" tone="info">
          bracketed
        </HandMark>
      </p>,
    )

    expect(html).toContain('<em data-hw="mark" data-hw-kind="circle"')
    expect(html).toContain('data-hw-strength="strong"')
    expect(html).toContain('data-hw-tone="accent"')
    expect(html).toContain('<s data-hw="mark" data-hw-kind="strike"')
    expect(html).toContain('<em data-hw="mark" data-hw-kind="box"')
    expect(html).toContain('<em data-hw="mark" data-hw-kind="underline"')
    expect(html).toContain('<mark data-hw="mark" data-hw-kind="highlight"')
    expect(html).toContain('<em data-hw="mark" data-hw-kind="wavy"')
    expect(html).toContain('<em data-hw="mark" data-hw-kind="bracket"')
    expect(html).not.toContain('<em data-hw="mark" data-hw-kind="strike"')
    expect(html).not.toContain('<mark data-hw="mark" data-hw-kind="circle"')
    expect(html).not.toContain('<mark data-hw="mark" data-hw-kind="strike"')
    expect(html).not.toContain('<mark data-hw="mark" data-hw-kind="box"')
    expect(html).not.toContain('<mark data-hw="mark" data-hw-kind="wavy"')
    expect(html).not.toContain('<mark data-hw="mark" data-hw-kind="bracket"')
  })

  it('passes every shared Mark treatment through HandAnnotate', () => {
    for (const mark of [
      'underline',
      'highlight',
      'circle',
      'strike',
      'box',
      'wavy',
      'bracket',
      'none',
    ] as const) {
      const html = renderToStaticMarkup(
        <HandAnnotate label="note" mark={mark}>
          target
        </HandAnnotate>,
      )
      expect(html).toContain(`data-hw-mark="${mark}"`)
      expect(html).toContain('<span data-hw-target="">target</span>')
      expect(html).toContain('note')
    }
  })

  it('keeps link glyphs bounded when CSS is unavailable', () => {
    const html = renderToStaticMarkup(
      <HandLink href="/guide" icon="arrow-forward">
        Guide
      </HandLink>,
    )

    expect(html).toContain('data-hw-glyph="arrow-forward"')
    expect(html).toContain('width="24"')
    expect(html).toContain('height="24"')
  })

  it('keeps annotation labels in real DOM and connectors decorative', () => {
    const html = renderToStaticMarkup(
      <HandAnnotate label="stable ID" placement="block-start-inline-end" shiftInline="2">
        <code>CLI-042</code>
      </HandAnnotate>,
    )

    expect(html).toContain('data-hw="annotate"')
    expect(html).toContain('data-hw-shift-inline="2"')
    expect(html).toContain('<span data-hw-target=""><code>CLI-042</code></span>')
    expect(html).toContain('<span data-hw-label="" dir="auto">stable ID</span>')
    expect(html).toMatch(/<svg aria-hidden="true" data-hw-connector="curved"/)
  })

  it('keeps annotation connectors bounded when CSS is unavailable', () => {
    const html = renderToStaticMarkup(
      <HandAnnotate label="stable ID">
        <code>CLI-042</code>
      </HandAnnotate>,
    )

    expect(html).toContain('data-hw-connector="curved"')
    expect(html).toContain('data-hw-connector-placement="block-start"')
    expect(html).toContain('width="46"')
    expect(html).toContain('height="38"')
    expect(html).toContain('viewBox="0 0 46 38"')
  })

  it('picks a placement-specific neat-style connector path', () => {
    const north = renderToStaticMarkup(
      <HandAnnotate label="from below" placement="block-end" arrow="curved">
        target
      </HandAnnotate>,
    )
    const east = renderToStaticMarkup(
      <HandAnnotate label="from start" placement="inline-start" arrow="straight">
        target
      </HandAnnotate>,
    )

    expect(north).toContain('data-hw-connector-placement="block-end"')
    expect(north).toContain('M23 35 C22 26 22 15 23 4')
    expect(east).toContain('data-hw-connector-placement="inline-start"')
    expect(east).toContain('data-hw-connector="straight"')
    expect(east).toContain('M5 19 L42 19')
  })

  it('renders a static note without creating a live region or landmark', () => {
    const html = renderToStaticMarkup(
      <HandNote appearance="tape" tone="warning" icon="auto">
        The specification is stale.
      </HandNote>,
    )

    expect(html.startsWith('<div data-hw="note"')).toBe(true)
    expect(html).toContain('data-hw-glyph="warning"')
    expect(html).toContain('<div data-hw-body="">The specification is stale.</div>')
    expect(html).not.toContain('aria-live')
    expect(html).not.toContain('role=')
    expect(html).not.toContain('<aside')
  })

  it('renders brace and margin labels as semantic text', () => {
    const brace = renderToStaticMarkup(
      <HandBrace label="spec" side="inline-end">
        <section>Specification</section>
      </HandBrace>,
    )
    const margin = renderToStaticMarkup(
      <HandMargin label="the backlog" side="inline-start">
        <article>Card</article>
      </HandMargin>,
    )

    expect(brace).toContain('<figure data-hw="brace"')
    expect(brace).toContain('<figcaption data-hw-label="" dir="auto">spec</figcaption>')
    expect(brace).toContain('data-hw-brace-glyph=""')
    expect(margin).toContain('<aside data-hw-label="" dir="auto">')
    expect(margin).toContain('<span>the backlog</span>')
  })

  it('keeps brace glyphs bounded when CSS is unavailable', () => {
    const html = renderToStaticMarkup(
      <HandBrace label="spec">
        <section>Specification</section>
      </HandBrace>,
    )

    expect(html).toContain('data-hw-brace-glyph=""')
    expect(html).toContain('width="24"')
    expect(html).toContain('height="100"')
  })

  it('keeps watermark copy decorative while preserving body content', () => {
    const html = renderToStaticMarkup(
      <HandWatermark label="DRAFT" placement="center">
        <p>Meaningful content</p>
      </HandWatermark>,
    )

    expect(html).toContain('<div data-hw-body=""><p>Meaningful content</p></div>')
    expect(html).toContain('<span aria-hidden="true" data-hw-label="" dir="auto">DRAFT</span>')
  })
})

describe('Annotation scene server rendering', () => {
  const source = `[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041\nWrite task output as JSON for scripts and agents`

  const reviewedPlan = {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: { name: 'status-change', version: 1 },
    localization: {
      locale: 'en',
      catalog: { id: 'status-change/en', version: 1 },
    },
    title: 'Reviewed status change',
    source: {
      text: 'draft becomes shipped',
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: '0'.repeat(64),
      },
    },
    targets: [
      {
        id: 'before',
        role: 'before',
        ranges: [{ start: 0, end: 5, exactText: 'draft' }],
      },
      {
        id: 'after',
        role: 'after',
        ranges: [{ start: 14, end: 21, exactText: 'shipped' }],
      },
    ],
    labels: [{ id: 'change-label', text: 'status change' }],
    relationships: [
      {
        id: 'status-change',
        kind: 'relates',
        relation: 'changes-to',
        labelId: 'change-label',
        fromTargetIds: ['before'],
        toTargetIds: ['after'],
        detailKind: 'short-description',
        legendText: 'status change: draft becomes shipped',
      },
    ],
    gestures: [
      {
        id: 'status-connector',
        kind: 'connect',
        relationshipId: 'status-change',
      },
    ],
    provenance: {
      kind: 'reviewed-proposal',
      engine: { name: '@madinah/mdx-handwritten-scene', version: '0.1.0' },
      generator: { id: 'fixture-generator' },
      review: { status: 'approved', id: 'review_01k0m6q7j8v3c2f5' },
    },
  } as const satisfies ScenePlanV1

  it('renders a supplied materialized Scene plan without deriving new meaning', () => {
    const html = renderToStaticMarkup(<HandScene plan={reviewedPlan} />)

    expect(html).toContain(
      '<figure data-hw-locale="en" data-hw-scene="status-change" data-hw-scene-version="1" data-hw-scene-schema="1"',
    )
    expect(html).toContain('Reviewed status change')
    expect(html).toContain('data-hw-target="before" data-hw-target-role="before">draft</span>')
    expect(html).toContain('data-hw-target="after" data-hw-target-role="after">shipped</span>')
    expect(html).toContain('data-hw-annotation="status-change"')
    expect(html).toContain('data-hw-annotation-role="before"')
    expect(html).toContain('data-hw-gesture="connect"')
    expect(html).toContain('data-hw-gestures="status-connector"')
    expect(html).toContain('data-hw-relation="changes-to"')
    expect(html).toContain('data-hw-relationship="relates"')
    expect(html).toContain('data-hw-connector="straight"')
    expect(html).toContain('status change: draft becomes shipped')
    expect(html).not.toContain('data-hw-scene-invalid')
  })

  it('maps target emphasis and verdict intent from a materialized plan', () => {
    const plan: ScenePlanV1 = {
      ...reviewedPlan,
      gestures: [
        ...reviewedPlan.gestures,
        {
          id: 'before-warning',
          kind: 'emphasize',
          targetIds: ['before'],
          intent: 'warning',
        },
        {
          id: 'status-verdict',
          kind: 'verdict',
          relationshipId: 'status-change',
          intent: 'positive',
        },
      ],
    }
    const html = renderToStaticMarkup(<HandScene plan={plan} />)

    expect(html).toContain('<mark data-hw-gesture="emphasize"')
    expect(html).toContain('data-hw-gestures="before-warning"')
    expect(html).toContain('data-hw-intent="warning"')
    expect(html).toContain('data-hw-target="before"')
    expect(html).toContain('data-hw-gesture="connect verdict"')
    expect(html).toContain('data-hw-intent="positive"')
    expect(html).toContain('<mark data-hw-annotation-text="" data-hw-verdict="">')
  })

  it('keeps canonical source before a complete legend with decorative connectors', () => {
    const html = renderToStaticMarkup(<HandScene recipe="task-explainer" source={source} />)

    expect(html).toContain(
      '<figure data-hw-locale="en" data-hw-scene="task-explainer" data-hw-scene-version="1"',
    )
    expect(html).toContain('<figcaption data-hw-scene-caption="" lang="en">')
    expect(html).toContain('<pre data-hw-scene-source=""><code>')
    expect(html.indexOf('<pre data-hw-scene-source="">')).toBeLessThan(
      html.indexOf('<ol data-hw-scene-legend="" lang="en">'),
    )
    const code = /<code>([\s\S]*?)<\/code>/.exec(html)?.[1]
    expect(code).not.toContain('data-hw-annotation=')
    expect(code).not.toContain('data-hw-connector=')
    expect(html).toContain('stable ID: CLI-042')
    expect(html).toContain('data-hw-annotation-role="stable-id"')
    expect(html).toContain('data-hw-relationship="describes"')
    expect(html).toMatch(/<li[^>]*>[\s\S]*?<svg aria-hidden="true" data-hw-connector="curved"/)
    expect(html.match(/data-hw-connector="curved"/g)).toHaveLength(
      html.match(/data-hw-annotation="/g)?.length ?? 0,
    )
  })

  it('uses one target identity for every discontinuous description range', () => {
    const html = renderToStaticMarkup(<HandScene recipe="task-explainer" source={source} />)
    const descriptionFragments = html.match(/data-hw-target="description"/g) ?? []

    expect(descriptionFragments).toHaveLength(2)
    expect(html).toContain('Add export command</span>')
    expect(html).toContain('Write task output as JSON for scripts and agents</span>')
  })

  it('renders localized labels as real text', () => {
    const html = renderToStaticMarkup(
      <HandScene locale="zh-CN" recipe="task-explainer" source={source} />,
    )

    expect(html).toContain('data-hw-locale="zh-CN"')
    expect(html).not.toMatch(/<figure[^>]*\slang=/u)
    expect(html).toContain('<figcaption data-hw-scene-caption="" lang="zh-CN">')
    expect(html).toContain('<ol data-hw-scene-legend="" lang="zh-CN">')
    expect(html).toContain('稳定 ID：CLI-042')
  })

  it('keeps invalid input readable as canonical code', () => {
    const invalidSource = 'This is not a structured task.'
    const html = renderToStaticMarkup(
      <HandScene recipe="unknown-recipe" source={invalidSource} />,
    )

    expect(html).toContain('data-hw-scene-invalid=""')
    expect(html).toContain(`<code>${invalidSource}</code>`)
    expect(html).not.toContain('data-hw-locale')
    expect(html).not.toContain(' lang=')
    expect(html).not.toContain('<ol')
  })
})

describe('safe handwritten links', () => {
  it.each([
    '#setup',
    '/guide',
    './guide',
    '../guide',
    '?tab=api',
    'https://example.com',
    'http://example.com',
    'mailto:hello@example.com',
    'tel:+1234567',
  ])('accepts %s', (href) => {
    expect(isSafeHandwrittenHref(href)).toBe(true)
  })

  it.each(['', '//example.com', 'javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,hello']) (
    'rejects %s',
    (href) => {
      expect(isSafeHandwrittenHref(href)).toBe(false)
      const html = renderToStaticMarkup(<HandLink href={href}>Unsafe</HandLink>)
      expect(html).not.toMatch(/\shref=/)
      expect(html).toContain('aria-disabled="true"')
      expect(html).toContain('data-hw-invalid-href=""')
    },
  )
})
