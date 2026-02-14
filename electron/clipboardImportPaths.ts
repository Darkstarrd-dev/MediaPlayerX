export function extractLikelyPaths(raw: string): string[] {
  const tokens = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return Array.from(
    new Set(
      tokens.filter((token) => /^[a-zA-Z]:[\\/]/.test(token) || /^\\\\[^\\]+\\[^\\]+/.test(token)),
    ),
  )
}

export function parseClipboardFileNameWBuffer(buffer: Buffer): string[] {
  if (buffer.length === 0) {
    return []
  }

  const text = buffer.toString('utf16le')
  const tokens = text
    .split('\u0000')
    .map((line) => line.trim())
    .filter(Boolean)

  return Array.from(new Set(tokens))
}
