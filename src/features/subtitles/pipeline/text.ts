import type { SubtitleToken } from './types'

const HARD_BREAK_PUNCTUATION = new Set(['。', '！', '？', '.', '!', '?'])
const CLOSING_PUNCTUATION = new Set([
  '.',
  ',',
  '!',
  '?',
  ';',
  ':',
  ')',
  ']',
  '}',
  '%',
  '，',
  '。',
  '！',
  '？',
  '；',
  '：',
  '、',
  '）',
  '】',
  '」',
  '』',
  '》',
])
const OPENING_PUNCTUATION = new Set(['(', '[', '{', '（', '【', '「', '『', '《'])

function isAsciiWordChar(value: string): boolean {
  return /[A-Za-z0-9'_]/.test(value)
}

function isCjkChar(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(value)
}

function isCjkToken(value: string): boolean {
  return /^[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]+$/.test(value)
}

function isAsciiWordToken(value: string): boolean {
  return /^[A-Za-z0-9'_]+$/.test(value)
}

function isClosingPunctuationToken(value: string): boolean {
  return CLOSING_PUNCTUATION.has(value) || HARD_BREAK_PUNCTUATION.has(value)
}

function isOpeningPunctuationToken(value: string): boolean {
  return OPENING_PUNCTUATION.has(value)
}

function isWhitespace(value: string): boolean {
  return /\s/.test(value)
}

function pushBufferToken(target: string[], buffer: string): string {
  if (buffer.trim()) {
    target.push(buffer.trim())
  }
  return ''
}

export function tokenizeSubtitleText(text: string): string[] {
  const normalized = text.trim()
  if (!normalized) {
    return []
  }

  const tokens: string[] = []
  let buffer = ''

  for (const char of normalized) {
    if (isWhitespace(char)) {
      buffer = pushBufferToken(tokens, buffer)
      continue
    }

    if (HARD_BREAK_PUNCTUATION.has(char) || CLOSING_PUNCTUATION.has(char) || OPENING_PUNCTUATION.has(char)) {
      buffer = pushBufferToken(tokens, buffer)
      tokens.push(char)
      continue
    }

    if (isCjkChar(char)) {
      buffer = pushBufferToken(tokens, buffer)
      tokens.push(char)
      continue
    }

    if (isAsciiWordChar(char)) {
      buffer += char
      continue
    }

    buffer = pushBufferToken(tokens, buffer)
    tokens.push(char)
  }

  pushBufferToken(tokens, buffer)
  return tokens
}

export function cleanupSubtitleText(text: string): string {
  let normalized = text.trim().replace(/\s+/g, ' ')
  normalized = normalized.replace(/\s+([,.!?;:，。！？；：、])/g, '$1')
  normalized = normalized.replace(/([([{（【「『《])\s+/g, '$1')
  normalized = normalized.replace(/\s+([)\]})）】」』》])/g, '$1')
  normalized = normalized.replace(
    /([\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]+)\s+([\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]+)/g,
    '$1$2',
  )
  normalized = normalized.replace(/([\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff])\s+([,.!?;:，。！？；：、])/g, '$1$2')
  return normalized
}

export function tokensToText(tokens: Pick<SubtitleToken, 'text'>[]): string {
  if (tokens.length === 0) {
    return ''
  }

  let text = ''
  let previous = ''
  for (const item of tokens) {
    const current = item.text
    const noSpace =
      text.length === 0 ||
      isClosingPunctuationToken(current) ||
      isOpeningPunctuationToken(previous) ||
      (isCjkToken(previous) && isCjkToken(current)) ||
      (isCjkToken(previous) && isClosingPunctuationToken(current)) ||
      (isClosingPunctuationToken(previous) && isCjkToken(current))

    if (noSpace) {
      text += current
    } else if (isAsciiWordToken(previous) && isAsciiWordToken(current)) {
      text += ` ${current}`
    } else {
      text += ` ${current}`
    }

    previous = current
  }

  return cleanupSubtitleText(text)
}

export function countReadableChars(text: string): number {
  return text.replace(/\s+/g, '').length
}

export function isHardBreakToken(value: string): boolean {
  return HARD_BREAK_PUNCTUATION.has(value)
}
