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

export function HandConnector({ kind }: { kind: 'curved' | 'straight' }) {
  return (
    <svg
      aria-hidden="true"
      data-hw-connector={kind}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 72 32"
    >
      {kind === 'curved' ? (
        <path d="M4 7c22-3 38 7 61 18m-7-7 7 7-10 2" />
      ) : (
        <path d="m5 6 60 19m-7-7 7 7-10 2" />
      )}
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
    >
      <path d="M3 1c13 0 13 8 13 20v19c0 7 2 10 7 10-5 0-7 3-7 10v19c0 12 0 20-13 20" />
    </svg>
  )
}
