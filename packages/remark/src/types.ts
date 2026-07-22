import type {Plugin} from 'unified'
import type {Root} from 'mdast'

/** The eight directives understood by this package. */
export const handwrittenDirectiveNames = [
  'hw-text',
  'hw-link',
  'hw-mark',
  'hw-annotate',
  'hw-note',
  'hw-brace',
  'hw-margin',
  'hw-watermark'
] as const

export type HandwrittenDirectiveName =
  (typeof handwrittenDirectiveNames)[number]

export type HandwrittenOutput = 'component' | 'element' | 'strip'
export type HandwrittenDiagnostics = 'strict' | 'warn'

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
export type HandwrittenWeight =
  | 'inherit'
  | 'regular'
  | 'medium'
  | 'semibold'
export type HandwrittenRotation = '-3' | '-2' | '-1' | '0' | '1' | '2' | '3'
export type HandwrittenAlign = 'start' | 'center' | 'end'
export type HandwrittenDistance = 'tight' | 'normal' | 'loose'

export interface HandwrittenComponentNames {
  text: string
  link: string
  mark: string
  annotate: string
  note: string
  brace: string
  margin: string
  watermark: string
}

export const handwrittenComponentNames: Readonly<HandwrittenComponentNames> =
  Object.freeze({
    text: 'HandText',
    link: 'HandLink',
    mark: 'HandMark',
    annotate: 'HandAnnotate',
    note: 'HandNote',
    brace: 'HandBrace',
    margin: 'HandMargin',
    watermark: 'HandWatermark'
  })

export interface HandwrittenVariantOptions {
  /** Number of deterministic visual variants. */
  count: 1 | 2 | 3 | 4
  /** Project-specific salt. */
  seed: string
  /** Optional root removed from VFile paths before hashing. */
  projectRoot?: string
}

export interface HandwrittenLimits {
  /** Hard limit protecting builds from directive-heavy input. */
  maxDirectivesPerFile: number
}

export type HandwrittenImports =
  | {mode: 'manual'}
  | {mode: 'auto'; source: string}

export interface HandwrittenOptions {
  /** Output MDX components, standard elements, or semantic fallbacks. */
  output?: HandwrittenOutput
  /** Component imports are manual by default. */
  imports?: HandwrittenImports
  /** Override generated MDX component identifiers. */
  components?: Partial<HandwrittenComponentNames>
  /** Stable compile-time visual variation. */
  variant?: Partial<HandwrittenVariantOptions>
  /** `strict` throws after reporting errors; `warn` reports and strips invalid nodes. */
  diagnostics?: HandwrittenDiagnostics
  limits?: Partial<HandwrittenLimits>
  /** Record usage counts on `file.data.mdxHandwritten`. */
  recordUsage?: boolean
}

export type HandwrittenRuleId =
  | 'directive-unknown'
  | 'directive-wrong-kind'
  | 'directive-empty'
  | 'directive-limit'
  | 'attribute-unknown'
  | 'attribute-duplicate'
  | 'attribute-dynamic'
  | 'attribute-invalid'
  | 'nesting-invalid'
  | 'url-unsafe'
  | 'label-too-long'
  | 'import-conflict'
  | 'component-invalid'
  | 'output-unhandled'
  | 'variant-path-missing'
  | 'scene-recipe-unknown'
  | 'scene-locale-unsupported'
  | 'scene-source-empty'
  | 'scene-source-too-long'
  | 'scene-task-syntax-invalid'
  | 'scene-task-priority-ambiguous'

export interface HandwrittenUsage {
  total: number
  directives: Record<HandwrittenDirectiveName, number>
}

export interface HandwrittenFileData {
  mdxHandwritten?: HandwrittenUsage
}

export type RemarkMdxHandwrittenPlugin = Plugin<[HandwrittenOptions?], Root>
