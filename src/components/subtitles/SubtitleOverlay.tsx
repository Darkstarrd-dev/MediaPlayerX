import { useMemo, type CSSProperties } from 'react'

interface SubtitleOverlayProps {
  text: string | null
  visible: boolean
  style: CSSProperties
  dataSlot?: string
}

function normalizeSubtitleText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toCharLength(value: string): number {
  return Array.from(value).length
}

function splitLongTokenByChars(token: string, maxChars: number): string[] {
  const chars = Array.from(token)
  const next: string[] = []
  for (let index = 0; index < chars.length; index += maxChars) {
    next.push(chars.slice(index, index + maxChars).join(''))
  }
  return next
}

function wrapParagraphByChars(paragraph: string, maxChars: number): string[] {
  const source = paragraph.trim()
  if (!source) {
    return []
  }

  const tokens = source.split(/(\s+)/).filter((item) => item.length > 0)
  const lines: string[] = []
  let current = ''
  let currentLen = 0

  const pushCurrent = () => {
    const trimmed = current.trim()
    if (trimmed) {
      lines.push(trimmed)
    }
    current = ''
    currentLen = 0
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (/^\s+$/.test(token)) {
      continue
    }
    const tokenLen = toCharLength(token)

    if (currentLen === 0) {
      if (tokenLen <= maxChars) {
        current = token
        currentLen = tokenLen
      } else {
        const parts = splitLongTokenByChars(token, maxChars)
        for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
          lines.push(parts[partIndex])
        }
      }
      continue
    }

    if (currentLen + 1 + tokenLen <= maxChars) {
      current += ` ${token}`
      currentLen += 1 + tokenLen
      continue
    }

    pushCurrent()
    if (tokenLen <= maxChars) {
      current = token
      currentLen = tokenLen
    } else {
      const parts = splitLongTokenByChars(token, maxChars)
      for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
        lines.push(parts[partIndex])
      }
    }
  }

  pushCurrent()
  return lines
}

function wrapSubtitleTextByChars(text: string, maxChars: number): string[] {
  const paragraphs = text.split('\n')
  const wrapped: string[] = []
  for (let i = 0; i < paragraphs.length; i += 1) {
    const lines = wrapParagraphByChars(paragraphs[i], maxChars)
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      wrapped.push(lines[lineIndex])
    }
  }
  return wrapped
}

export function SubtitleOverlay({ text, visible, style, dataSlot }: SubtitleOverlayProps) {
  const normalizedText = useMemo(() => {
    if (!text) {
      return ''
    }
    return normalizeSubtitleText(text)
  }, [text])

  const styleRecord = style as Record<string, unknown>
  const maxChars = Math.max(
    8,
    Math.min(
      80,
      Number.parseInt(typeof styleRecord['--mpx-subtitle-max-line-chars'] === 'string'
        ? styleRecord['--mpx-subtitle-max-line-chars']
        : '28', 10) || 28,
    ),
  )

  const wrappedLines = useMemo(() => {
    if (!normalizedText) {
      return []
    }
    return wrapSubtitleTextByChars(normalizedText, maxChars)
  }, [maxChars, normalizedText])

  if (!visible || wrappedLines.length === 0) {
    return null
  }

  const rootStyle: CSSProperties = {}
  const mergedTextStyle: CSSProperties = {
    ...style,
  }
  const stackStyle: CSSProperties = {}

  if (typeof styleRecord['--mpx-subtitle-offset-y'] === 'string') {
    ;(rootStyle as Record<string, string>)['--mpx-subtitle-offset-y'] = styleRecord['--mpx-subtitle-offset-y']
    delete (mergedTextStyle as Record<string, unknown>)['--mpx-subtitle-offset-y']
  }
  if (style.maxWidth) {
    rootStyle.maxWidth = style.maxWidth
    delete mergedTextStyle.maxWidth
  }
  mergedTextStyle.maxWidth = '100%'
  delete (mergedTextStyle as Record<string, unknown>)['--mpx-subtitle-max-line-chars']

  if (mergedTextStyle.filter) {
    stackStyle.filter = mergedTextStyle.filter
    delete mergedTextStyle.filter
  }

  const fillTextStyle: CSSProperties = {
    ...mergedTextStyle,
    filter: 'none',
    WebkitTextStroke: '0 transparent',
  }

  const strokeTextStyle: CSSProperties = {
    ...mergedTextStyle,
    color: 'transparent',
    backgroundImage: 'none',
    backgroundClip: 'border-box',
  }
  ;(strokeTextStyle as Record<string, string>).WebkitBackgroundClip = 'border-box'
  ;(strokeTextStyle as Record<string, string>).WebkitTextFillColor = 'transparent'

  return (
    <div aria-live="polite" className="subtitle-overlay" data-slot={dataSlot} style={rootStyle}>
      <div className="subtitle-overlay-stack" style={stackStyle}>
        {wrappedLines.map((line, index) => (
          <span className="subtitle-overlay-line" key={`${line}-${index}`}>
            <span aria-hidden="true" className="subtitle-overlay-stroke" style={strokeTextStyle}>
              {line}
            </span>
            <span className="subtitle-overlay-fill" style={fillTextStyle}>
              {line}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default SubtitleOverlay
