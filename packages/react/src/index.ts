export {
  HandAnnotate,
  HandBrace,
  HandLink,
  HandMargin,
  HandMark,
  HandNote,
  HandText,
  HandWatermark,
  isSafeHandwrittenHref,
} from './components.js'

import {
  HandAnnotate,
  HandBrace,
  HandLink,
  HandMargin,
  HandMark,
  HandNote,
  HandText,
  HandWatermark,
} from './components.js'

export const handwrittenComponents = Object.freeze({
  HandText,
  HandLink,
  HandMark,
  HandAnnotate,
  HandNote,
  HandBrace,
  HandMargin,
  HandWatermark,
})

export type {
  HandAnnotateProps,
  HandAnnotationPlacement,
  HandBraceProps,
  HandLinkProps,
  HandMarginProps,
  HandMarkProps,
  HandNoteProps,
  HandTextProps,
  HandWatermarkPlacement,
  HandWatermarkProps,
  HandwrittenAlign,
  HandwrittenDistance,
  HandwrittenRotation,
  HandwrittenShift,
  HandwrittenSize,
  HandwrittenTone,
  HandwrittenVariantProps,
  HandwrittenWeight,
} from './types.js'
