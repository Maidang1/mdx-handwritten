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
export { HandScene } from './scene.js'

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
import { HandScene } from './scene.js'

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

export const handwrittenSceneComponents = Object.freeze({ HandScene })

export const mdxHandwrittenComponents = Object.freeze({
  ...handwrittenComponents,
  ...handwrittenSceneComponents,
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
export type { HandSceneProps } from './scene.js'
export type {
  AnnotationRecipeName,
  AnnotationSceneAnnotation,
  AnnotationSceneDiagnostic,
  AnnotationSceneDiagnosticCode,
  AnnotationSceneLocale,
  AnnotationScenePlanV1,
  AnnotationSceneResult,
  AnnotationSceneTarget,
  AnnotationSourceRange,
  AnnotationTargetRole,
  DeriveAnnotationSceneInput,
  ScenePlanV1,
} from 'mdx-handwritten-scene'
