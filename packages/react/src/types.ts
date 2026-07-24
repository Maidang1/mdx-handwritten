import type { ReactNode } from 'react'

export type HandwrittenTone =
  | 'inherit'
  | 'neutral'
  | 'muted'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'

export type HandwrittenSize = 'inherit' | 'sm' | 'md' | 'lg' | 'display'
export type HandwrittenWeight = 'inherit' | 'regular' | 'medium' | 'semibold'
export type HandwrittenRotation = '-3' | '-2' | '-1' | '0' | '1' | '2' | '3'
export type HandwrittenAlign = 'start' | 'center' | 'end'
export type HandwrittenDistance = 'tight' | 'normal' | 'loose'
export type HandwrittenShift = '-3' | '-2' | '-1' | '0' | '1' | '2' | '3'

/** Closed Mark treatment vocabulary shared by HandMark.kind and HandAnnotate.mark. */
export type HandwrittenMarkTreatment =
  | 'underline'
  | 'highlight'
  | 'circle'
  | 'strike'
  | 'box'
  | 'wavy'
  | 'bracket'

export interface HandwrittenVariantProps {
  /** A deterministic variant emitted by the remark plugin. */
  'data-hw-variant'?: string | number
}

export interface HandTextProps extends HandwrittenVariantProps {
  children: ReactNode
  tone?: HandwrittenTone
  size?: HandwrittenSize
  weight?: HandwrittenWeight
  rotate?: HandwrittenRotation
}

export interface HandLinkProps extends HandwrittenVariantProps {
  children: ReactNode
  href: string
  target?: 'self' | 'blank'
  tone?: HandwrittenTone
  size?: HandwrittenSize
  weight?: HandwrittenWeight
  rotate?: HandwrittenRotation
  underline?: 'subtle' | 'strong'
  icon?: 'none' | 'arrow-forward' | 'arrow-back' | 'external'
}

export interface HandMarkProps extends HandwrittenVariantProps {
  children: ReactNode
  kind?: HandwrittenMarkTreatment
  tone?: HandwrittenTone
  strength?: 'subtle' | 'normal' | 'strong'
}

export type HandAnnotationPlacement =
  | 'block-start'
  | 'block-start-inline-start'
  | 'block-start-inline-end'
  | 'block-end'
  | 'block-end-inline-start'
  | 'block-end-inline-end'
  | 'inline-start'
  | 'inline-end'

export interface HandAnnotateProps extends HandwrittenVariantProps {
  children: ReactNode
  label: string
  placement?: HandAnnotationPlacement
  tone?: HandwrittenTone
  mark?: HandwrittenMarkTreatment | 'none'
  arrow?: 'curved' | 'straight' | 'none'
  distance?: HandwrittenDistance
  shiftInline?: HandwrittenShift
  shiftBlock?: HandwrittenShift
  rotate?: HandwrittenRotation
}

export interface HandNoteProps extends HandwrittenVariantProps {
  children: ReactNode
  appearance?: 'line' | 'tape' | 'panel'
  tone?: Exclude<HandwrittenTone, 'inherit'>
  icon?: 'auto' | 'none' | 'check' | 'cross' | 'info' | 'warning' | 'spark'
  size?: Exclude<HandwrittenSize, 'inherit'>
  weight?: Exclude<HandwrittenWeight, 'inherit'>
  rotate?: HandwrittenRotation
  align?: HandwrittenAlign
  density?: 'compact' | 'normal'
}

export interface HandBraceProps extends HandwrittenVariantProps {
  children: ReactNode
  label: string
  side?: 'inline-start' | 'inline-end'
  align?: HandwrittenAlign
  tone?: HandwrittenTone
  rotate?: HandwrittenRotation
  distance?: HandwrittenDistance
}

export interface HandMarginProps extends HandwrittenVariantProps {
  children: ReactNode
  label: string
  side?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
  align?: HandwrittenAlign
  tone?: HandwrittenTone
  size?: Exclude<HandwrittenSize, 'inherit'>
  weight?: Exclude<HandwrittenWeight, 'inherit'>
  rotate?: HandwrittenRotation
  icon?: 'none' | 'arrow-toward' | 'arrow-away'
  distance?: HandwrittenDistance
}

export type HandWatermarkPlacement =
  | 'block-start-inline-start'
  | 'block-start-inline-end'
  | 'block-end-inline-start'
  | 'block-end-inline-end'
  | 'center'

export interface HandWatermarkProps extends HandwrittenVariantProps {
  children: ReactNode
  label: string
  placement?: HandWatermarkPlacement
  tone?: HandwrittenTone
  size?: Exclude<HandwrittenSize, 'inherit'>
  weight?: Exclude<HandwrittenWeight, 'inherit'>
  rotate?: HandwrittenRotation
  strength?: 'ghost' | 'faint' | 'soft'
}
