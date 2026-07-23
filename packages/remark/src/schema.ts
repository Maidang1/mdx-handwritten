import type {HandwrittenDirectiveName} from './types.js'

export type DirectiveKind = 'textDirective' | 'leafDirective' | 'containerDirective'

interface AttributeDefinition {
  readonly values?: readonly string[]
  readonly default?: string
  readonly required?: boolean
  readonly maximumLength?: number
}

export interface DirectiveDefinition {
  readonly kind: DirectiveKind
  readonly componentKey:
    | 'text'
    | 'link'
    | 'mark'
    | 'annotate'
    | 'note'
    | 'brace'
    | 'margin'
    | 'watermark'
  readonly attributes: Readonly<Record<string, AttributeDefinition>>
  readonly requiresContent: boolean
  readonly containerLabelMaximum?: number
}

const tones = [
  'inherit',
  'neutral',
  'muted',
  'info',
  'success',
  'warning',
  'danger',
  'accent'
] as const
const semanticTones = tones.slice(1)
const sizes = ['inherit', 'sm', 'md', 'lg', 'display'] as const
const semanticSizes = sizes.slice(1)
const weights = ['inherit', 'regular', 'medium', 'semibold'] as const
const semanticWeights = weights.slice(1)
const rotations = ['-3', '-2', '-1', '0', '1', '2', '3'] as const
const aligns = ['start', 'center', 'end'] as const
const distances = ['tight', 'normal', 'loose'] as const
const shifts = rotations

export const directiveDefinitions: Readonly<
  Record<HandwrittenDirectiveName, DirectiveDefinition>
> = {
  'hw-text': {
    kind: 'textDirective',
    componentKey: 'text',
    requiresContent: true,
    attributes: {
      tone: {values: tones, default: 'inherit'},
      size: {values: sizes, default: 'inherit'},
      weight: {values: weights, default: 'inherit'},
      rotate: {values: rotations, default: '0'}
    }
  },
  'hw-link': {
    kind: 'textDirective',
    componentKey: 'link',
    requiresContent: true,
    attributes: {
      href: {required: true},
      target: {values: ['self', 'blank'], default: 'self'},
      tone: {values: tones, default: 'inherit'},
      size: {values: sizes, default: 'inherit'},
      weight: {values: weights, default: 'inherit'},
      rotate: {values: rotations, default: '0'},
      underline: {values: ['subtle', 'strong'], default: 'strong'},
      icon: {
        values: ['none', 'arrow-forward', 'arrow-back', 'external'],
        default: 'none'
      }
    }
  },
  'hw-mark': {
    kind: 'textDirective',
    componentKey: 'mark',
    requiresContent: true,
    attributes: {
      kind: {
        values: ['underline', 'highlight', 'circle', 'strike', 'box'],
        default: 'underline'
      },
      tone: {values: tones, default: 'inherit'},
      strength: {
        values: ['subtle', 'normal', 'strong'],
        default: 'normal'
      }
    }
  },
  'hw-annotate': {
    kind: 'textDirective',
    componentKey: 'annotate',
    requiresContent: true,
    attributes: {
      label: {required: true, maximumLength: 120},
      placement: {
        values: [
          'block-start',
          'block-start-inline-start',
          'block-start-inline-end',
          'block-end',
          'block-end-inline-start',
          'block-end-inline-end',
          'inline-start',
          'inline-end'
        ],
        default: 'block-start'
      },
      tone: {values: tones, default: 'muted'},
      mark: {values: ['highlight', 'underline', 'none'], default: 'highlight'},
      arrow: {values: ['curved', 'straight', 'none'], default: 'curved'},
      distance: {values: distances, default: 'normal'},
      'shift-inline': {values: shifts, default: '0'},
      'shift-block': {values: shifts, default: '0'},
      rotate: {values: rotations, default: '-2'}
    }
  },
  'hw-note': {
    kind: 'leafDirective',
    componentKey: 'note',
    requiresContent: true,
    attributes: {
      appearance: {values: ['line', 'tape', 'panel'], default: 'line'},
      tone: {values: semanticTones, default: 'neutral'},
      icon: {
        values: ['auto', 'none', 'check', 'cross', 'info', 'warning', 'spark'],
        default: 'auto'
      },
      size: {values: semanticSizes, default: 'md'},
      weight: {values: semanticWeights, default: 'regular'},
      rotate: {values: rotations, default: '0'},
      align: {values: aligns, default: 'start'},
      density: {values: ['compact', 'normal'], default: 'normal'}
    }
  },
  'hw-brace': {
    kind: 'containerDirective',
    componentKey: 'brace',
    requiresContent: true,
    containerLabelMaximum: 80,
    attributes: {
      side: {values: ['inline-start', 'inline-end'], default: 'inline-end'},
      align: {values: aligns, default: 'center'},
      tone: {values: tones, default: 'muted'},
      rotate: {values: rotations, default: '-2'},
      distance: {values: distances, default: 'loose'}
    }
  },
  'hw-margin': {
    kind: 'containerDirective',
    componentKey: 'margin',
    requiresContent: true,
    containerLabelMaximum: 160,
    attributes: {
      side: {
        values: ['inline-start', 'inline-end', 'block-start', 'block-end'],
        default: 'inline-start'
      },
      align: {values: aligns, default: 'end'},
      tone: {values: tones, default: 'muted'},
      size: {values: semanticSizes, default: 'md'},
      weight: {values: semanticWeights, default: 'regular'},
      rotate: {values: rotations, default: '-2'},
      icon: {
        values: ['none', 'arrow-toward', 'arrow-away'],
        default: 'arrow-toward'
      },
      distance: {values: distances, default: 'normal'}
    }
  },
  'hw-watermark': {
    kind: 'containerDirective',
    componentKey: 'watermark',
    requiresContent: true,
    containerLabelMaximum: 120,
    attributes: {
      placement: {
        values: [
          'block-start-inline-start',
          'block-start-inline-end',
          'block-end-inline-start',
          'block-end-inline-end',
          'center'
        ],
        default: 'block-start-inline-end'
      },
      tone: {values: tones, default: 'muted'},
      size: {values: semanticSizes, default: 'display'},
      weight: {values: semanticWeights, default: 'semibold'},
      rotate: {values: rotations, default: '3'},
      strength: {values: ['ghost', 'faint', 'soft'], default: 'faint'}
    }
  }
}

export function isHandwrittenDirectiveName(
  value: string
): value is HandwrittenDirectiveName {
  return Object.hasOwn(directiveDefinitions, value)
}
