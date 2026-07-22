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
} from '../src/index.js'

describe('mdx-handwritten-react server rendering', () => {
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

  it('keeps canonical source before a complete legend with decorative connectors', () => {
    const html = renderToStaticMarkup(<HandScene recipe="task-explainer" source={source} />)

    expect(html).toContain(
      '<figure data-hw-locale="en" data-hw-scene="task-explainer" data-hw-scene-version="1"',
    )
    expect(html).toContain('<figcaption data-hw-scene-caption="">')
    expect(html).toContain('<pre data-hw-scene-source=""><code>')
    expect(html.indexOf('<pre data-hw-scene-source="">')).toBeLessThan(
      html.indexOf('<ol data-hw-scene-legend="">'),
    )
    const code = /<code>([\s\S]*?)<\/code>/.exec(html)?.[1]
    expect(code).not.toContain('data-hw-annotation=')
    expect(code).not.toContain('data-hw-connector=')
    expect(html).toContain('stable ID: CLI-042')
    expect(html).toContain('data-hw-annotation-role="stable-id"')
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
    expect(html).toContain('lang="zh-CN"')
    expect(html).toContain('稳定 ID：CLI-042')
  })

  it('keeps invalid input readable as canonical code', () => {
    const invalidSource = 'This is not a structured task.'
    const html = renderToStaticMarkup(
      <HandScene recipe="unknown-recipe" source={invalidSource} />,
    )

    expect(html).toContain('data-hw-scene-invalid=""')
    expect(html).toContain(`<code>${invalidSource}</code>`)
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
