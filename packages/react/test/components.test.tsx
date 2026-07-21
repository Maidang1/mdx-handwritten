import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  HandAnnotate,
  HandBrace,
  HandLink,
  HandMargin,
  HandMark,
  HandNote,
  HandText,
  HandWatermark,
  handwrittenComponents,
  isSafeHandwrittenHref,
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
