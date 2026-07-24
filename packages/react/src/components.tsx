import type {
  HandAnnotateProps,
  HandBraceProps,
  HandLinkProps,
  HandMarginProps,
  HandMarkProps,
  HandNoteProps,
  HandTextProps,
  HandWatermarkProps,
} from './types.js'
import { HandBraceGlyph, HandConnector, HandGlyph, type HandGlyphName } from './icons.js'

const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Defends direct JSX usage as well as compiled directives. The remark plugin
 * reports an unsafe URL as a build error; the renderer still refuses to emit it.
 */
export function isSafeHandwrittenHref(href: string): boolean {
  const value = href.trim()
  if (value.length === 0 || value.startsWith('//')) return false

  // Browsers ignore embedded ASCII controls while resolving a protocol.
  const compact = value.replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
  const protocol = /^([a-z][a-z\d+.-]*):/i.exec(compact)?.[1]
  return protocol === undefined || allowedLinkProtocols.has(`${protocol.toLowerCase()}:`)
}

function variantOf(props: { 'data-hw-variant'?: string | number }) {
  return props['data-hw-variant']
}

export function HandText({
  children,
  tone = 'inherit',
  size = 'inherit',
  weight = 'inherit',
  rotate = '0',
  ...variantProps
}: HandTextProps) {
  return (
    <span
      data-hw="text"
      data-hw-rotate={rotate}
      data-hw-size={size}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
      data-hw-weight={weight}
    >
      {children}
    </span>
  )
}

export function HandLink({
  children,
  href,
  target = 'self',
  tone = 'inherit',
  size = 'inherit',
  weight = 'inherit',
  rotate = '0',
  underline = 'strong',
  icon = 'none',
  ...variantProps
}: HandLinkProps) {
  const safe = isSafeHandwrittenHref(href)
  const iconBefore = icon === 'arrow-back'
  const glyph = icon === 'none' ? null : <HandGlyph name={icon} />

  return (
    <a
      aria-disabled={safe ? undefined : true}
      data-hw="link"
      data-hw-icon={icon}
      data-hw-invalid-href={safe ? undefined : ''}
      data-hw-rotate={rotate}
      data-hw-size={size}
      data-hw-tone={tone}
      data-hw-underline={underline}
      data-hw-variant={variantOf(variantProps)}
      data-hw-weight={weight}
      href={safe ? href.trim() : undefined}
      rel={safe && target === 'blank' ? 'noopener noreferrer' : undefined}
      target={safe && target === 'blank' ? '_blank' : undefined}
    >
      {iconBefore ? glyph : null}
      <span data-hw-label="">{children}</span>
      {!iconBefore ? glyph : null}
    </a>
  )
}

export function HandMark({
  children,
  kind = 'underline',
  tone = 'inherit',
  strength = 'normal',
  ...variantProps
}: HandMarkProps) {
  const shared = {
    'data-hw': 'mark',
    'data-hw-kind': kind,
    'data-hw-strength': strength,
    'data-hw-tone': tone,
    'data-hw-variant': variantOf(variantProps),
  } as const

  if (kind === 'highlight') return <mark {...shared}>{children}</mark>
  if (kind === 'strike') return <s {...shared}>{children}</s>
  return <em {...shared}>{children}</em>
}

export function HandAnnotate({
  children,
  label,
  placement = 'block-start',
  tone = 'muted',
  mark = 'highlight',
  arrow = 'curved',
  distance = 'normal',
  shiftInline = '0',
  shiftBlock = '0',
  rotate = '-2',
  ...variantProps
}: HandAnnotateProps) {
  return (
    <span
      data-hw="annotate"
      data-hw-arrow={arrow}
      data-hw-distance={distance}
      data-hw-mark={mark}
      data-hw-placement={placement}
      data-hw-rotate={rotate}
      data-hw-shift-block={shiftBlock}
      data-hw-shift-inline={shiftInline}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
    >
      <span data-hw-target="">{children}</span>
      <span data-hw-label="" dir="auto">
        {label}
      </span>
      {arrow === 'none' ? null : <HandConnector kind={arrow} placement={placement} />}
    </span>
  )
}

const automaticNoteIcons = {
  neutral: null,
  muted: null,
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'cross',
  accent: 'spark',
} as const satisfies Record<NonNullable<HandNoteProps['tone']>, HandGlyphName | null>

export function HandNote({
  children,
  appearance = 'line',
  tone = 'neutral',
  icon = 'auto',
  size = 'md',
  weight = 'regular',
  rotate = '0',
  align = 'start',
  density = 'normal',
  ...variantProps
}: HandNoteProps) {
  const resolvedIcon = icon === 'auto' ? automaticNoteIcons[tone] : icon === 'none' ? null : icon

  return (
    <div
      data-hw="note"
      data-hw-align={align}
      data-hw-appearance={appearance}
      data-hw-density={density}
      data-hw-icon={icon}
      data-hw-rotate={rotate}
      data-hw-size={size}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
      data-hw-weight={weight}
    >
      {resolvedIcon === null ? null : <HandGlyph name={resolvedIcon} />}
      <div data-hw-body="">{children}</div>
    </div>
  )
}

export function HandBrace({
  children,
  label,
  side = 'inline-end',
  align = 'center',
  tone = 'muted',
  rotate = '-2',
  distance = 'loose',
  ...variantProps
}: HandBraceProps) {
  return (
    <figure
      data-hw="brace"
      data-hw-align={align}
      data-hw-distance={distance}
      data-hw-rotate={rotate}
      data-hw-side={side}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
    >
      <div data-hw-body="">{children}</div>
      <span aria-hidden="true" data-hw-brace="">
        <HandBraceGlyph />
      </span>
      <figcaption data-hw-label="" dir="auto">
        {label}
      </figcaption>
    </figure>
  )
}

export function HandMargin({
  children,
  label,
  side = 'inline-start',
  align = 'end',
  tone = 'muted',
  size = 'md',
  weight = 'regular',
  rotate = '-2',
  icon = 'arrow-toward',
  distance = 'normal',
  ...variantProps
}: HandMarginProps) {
  return (
    <div
      data-hw="margin"
      data-hw-align={align}
      data-hw-distance={distance}
      data-hw-icon={icon}
      data-hw-rotate={rotate}
      data-hw-side={side}
      data-hw-size={size}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
      data-hw-weight={weight}
    >
      <div data-hw-body="">{children}</div>
      <aside data-hw-label="" dir="auto">
        {icon === 'none' ? null : <HandGlyph name={icon} />}
        <span>{label}</span>
      </aside>
    </div>
  )
}

export function HandWatermark({
  children,
  label,
  placement = 'block-start-inline-end',
  tone = 'muted',
  size = 'display',
  weight = 'semibold',
  rotate = '3',
  strength = 'faint',
  ...variantProps
}: HandWatermarkProps) {
  return (
    <div
      data-hw="watermark"
      data-hw-placement={placement}
      data-hw-rotate={rotate}
      data-hw-size={size}
      data-hw-strength={strength}
      data-hw-tone={tone}
      data-hw-variant={variantOf(variantProps)}
      data-hw-weight={weight}
    >
      <div data-hw-body="">{children}</div>
      <span aria-hidden="true" data-hw-label="" dir="auto">
        {label}
      </span>
    </div>
  )
}
