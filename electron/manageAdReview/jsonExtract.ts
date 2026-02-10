export interface ParsedAdReviewJson {
  isAd: boolean
  reason: string
}

function parseLooseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
    return null
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') {
      return true
    }
    if (normalized === 'false' || normalized === 'no' || normalized === '0') {
      return false
    }
  }

  return null
}

function normalizeReason(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function normalizeParsedObject(parsed: unknown): ParsedAdReviewJson | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }

  const record = parsed as Record<string, unknown>
  const isAd =
    parseLooseBoolean(record.is_ad) ?? parseLooseBoolean(record.isAd) ?? parseLooseBoolean(record.ad) ?? null

  if (isAd === null) {
    return null
  }

  const reason =
    normalizeReason(record.reason) || normalizeReason(record.detail) || normalizeReason(record.explanation) || ''

  return {
    isAd,
    reason,
  }
}

function extractJsonCodeBlocks(raw: string): string[] {
  const blocks: string[] = []
  const pattern = /```(?:json)?\s*([\s\S]*?)```/gi
  let match: RegExpExecArray | null = pattern.exec(raw)
  while (match) {
    blocks.push(match[1].trim())
    match = pattern.exec(raw)
  }
  return blocks
}

function extractBalancedJsonObjects(raw: string): string[] {
  const candidates: string[] = []
  let depth = 0
  let start = -1

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (char === '{') {
      if (depth === 0) {
        start = index
      }
      depth += 1
      continue
    }

    if (char !== '}') {
      continue
    }

    if (depth === 0) {
      continue
    }

    depth -= 1
    if (depth === 0 && start >= 0) {
      candidates.push(raw.slice(start, index + 1))
      start = -1
    }
  }

  return candidates
}

function parseRegexFallback(raw: string): ParsedAdReviewJson | null {
  const boolMatch = raw.match(/(?:"is_ad"|"isAd"|"ad"|is_ad|isAd|ad)\s*:\s*(true|false|1|0|"true"|"false")/i)
  if (!boolMatch) {
    return null
  }

  const boolRaw = boolMatch[1].replaceAll('"', '')
  const isAd = parseLooseBoolean(boolRaw)
  if (isAd === null) {
    return null
  }

  const reasonMatch = raw.match(
    /(?:"reason"|"detail"|"explanation"|reason|detail|explanation)\s*:\s*"([^"]*)"/i,
  )

  return {
    isAd,
    reason: reasonMatch ? reasonMatch[1].trim() : '',
  }
}

export function extractAdReviewJson(rawContent: string): ParsedAdReviewJson | null {
  const trimmed = rawContent.trim()
  if (!trimmed) {
    return null
  }

  const candidateTexts: string[] = [trimmed, ...extractJsonCodeBlocks(trimmed), ...extractBalancedJsonObjects(trimmed)]

  for (const candidate of candidateTexts) {
    try {
      const parsed = JSON.parse(candidate)
      const normalized = normalizeParsedObject(parsed)
      if (normalized) {
        return normalized
      }
    } catch {
      // Keep trying other candidates because many models wrap JSON with extra narration.
    }
  }

  return parseRegexFallback(trimmed)
}
