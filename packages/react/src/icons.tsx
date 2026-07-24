export type HandGlyphName =
  | 'arrow-forward'
  | 'arrow-back'
  | 'external'
  | 'check'
  | 'cross'
  | 'info'
  | 'warning'
  | 'spark'
  | 'arrow-toward'
  | 'arrow-away'

export type HandConnectorPlacement =
  | 'block-start'
  | 'block-start-inline-start'
  | 'block-start-inline-end'
  | 'block-end'
  | 'block-end-inline-start'
  | 'block-end-inline-end'
  | 'inline-start'
  | 'inline-end'

export interface HandGlyphProps {
  name: HandGlyphName
}

const commonProps = {
  'aria-hidden': true,
  focusable: 'false',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
} as const

/**
 * Placement-aware hand-drawn connectors inspired by neat-annotations.
 * Each path points toward the annotated target from the label side.
 * viewBox is 0 0 46 38 to match the neat arrow canvas.
 */
const connectorPaths = {
  curved: {
    'block-start': 'M23 4 C22 13 22 24 23 35 M17 29 L23 36 L29 29',
    'block-start-inline-start': 'M6 6 C16 8 28 20 40 32 M36 22 L40 32 L30 28',
    'block-start-inline-end': 'M40 6 C30 8 18 20 6 32 M10 22 L6 32 L16 28',
    'block-end': 'M23 35 C22 26 22 15 23 4 M17 10 L23 3 L29 10',
    'block-end-inline-start': 'M6 32 C16 30 28 18 40 6 M30 10 L40 6 L36 16',
    'block-end-inline-end': 'M40 32 C30 30 18 18 6 6 M16 10 L6 6 L10 16',
    'inline-start': 'M4 19 C15 18 31 18 43 19 M36 13 L43 19 L36 25',
    'inline-end': 'M43 19 C32 18 15 18 3 19 M10 13 L3 19 L10 25',
  },
  straight: {
    'block-start': 'M23 5 L23 34 M17 28 L23 35 L29 28',
    'block-start-inline-start': 'M8 8 L38 30 M32 22 L38 30 L28 28',
    'block-start-inline-end': 'M38 8 L8 30 M14 22 L8 30 L18 28',
    'block-end': 'M23 33 L23 4 M17 10 L23 3 L29 10',
    'block-end-inline-start': 'M8 30 L38 8 M32 14 L38 8 L28 10',
    'block-end-inline-end': 'M38 30 L8 8 M14 14 L8 8 L18 10',
    'inline-start': 'M5 19 L42 19 M35 13 L42 19 L35 25',
    'inline-end': 'M41 19 L4 19 M11 13 L4 19 L11 25',
  },
} as const satisfies Record<
  'curved' | 'straight',
  Record<HandConnectorPlacement, string>
>

/** Compact decorative connector used in scene legends (not placement-bound). */
const legendConnectorPaths = {
  curved: 'M3 18C16 20 27 4 44 7M38 4l6 3-4 5',
  straight: 'M3 18 44 5M38 3l6 2-3 6',
} as const

export function HandGlyph({ name }: HandGlyphProps) {
  if (name === 'check') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <path d="m5 12.5 4.2 4.1L19 6.8" />
      </svg>
    )
  }

  if (name === 'cross') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <path d="m6.5 6.5 11 11m0-11-11 11" />
      </svg>
    )
  }

  if (name === 'info') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 10.5v6m0-9.1v.1" />
      </svg>
    )
  }

  if (name === 'warning') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <path d="M11.9 3.8 21 19.5H3L11.9 3.8Z" />
        <path d="M12 9v5m0 2.5v.1" />
      </svg>
    )
  }

  if (name === 'spark') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <path d="M12 2.8c.5 5.7 3.5 8.7 9.2 9.2-5.7.5-8.7 3.5-9.2 9.2-.5-5.7-3.5-8.7-9.2-9.2 5.7-.5 8.7-3.5 9.2-9.2Z" />
      </svg>
    )
  }

  if (name === 'external') {
    return (
      <svg {...commonProps} data-hw-glyph={name}>
        <path d="M14 5h5v5m0-5-8 8" />
        <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    )
  }

  const pointsBack = name === 'arrow-back' || name === 'arrow-away'
  return (
    <svg {...commonProps} data-hw-glyph={name}>
      {pointsBack ? (
        <path d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5" />
      ) : (
        <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" />
      )}
    </svg>
  )
}

export function HandConnector({
  kind,
  placement,
}: {
  kind: 'curved' | 'straight'
  /** When omitted, render the compact legend-style decorative arrow. */
  placement?: HandConnectorPlacement
}) {
  if (placement === undefined) {
    return (
      <svg
        aria-hidden="true"
        data-hw-connector={kind}
        focusable="false"
        viewBox="0 0 48 24"
        width="48"
        height="24"
      >
        <path d={legendConnectorPaths[kind]} />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      data-hw-connector={kind}
      data-hw-connector-placement={placement}
      focusable="false"
      viewBox="0 0 46 38"
      width="46"
      height="38"
    >
      <path d={connectorPaths[kind][placement]} />
    </svg>
  )
}

export function HandBraceGlyph() {
  return (
    <svg
      aria-hidden="true"
      data-hw-brace-glyph=""
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 24 100"
      width="24"
      height="100"
    >
      <path d="M3 1c13 0 13 8 13 20v19c0 7 2 10 7 10-5 0-7 3-7 10v19c0 12 0 20-13 20" />
    </svg>
  )
}
