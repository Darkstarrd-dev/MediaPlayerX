import type { TranslateFn } from '../../i18n/context'

interface ParsedErrorCode {
  code: string | null
  detail: string | null
}

const ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]*$/i

function parseErrorCode(error: unknown): ParsedErrorCode {
  const raw = (error instanceof Error ? error.message : String(error)).trim()
  if (!raw) {
    return { code: null, detail: null }
  }

  const separatorIndex = raw.indexOf(':')
  if (separatorIndex > 0) {
    const code = raw.slice(0, separatorIndex).trim()
    const detail = raw.slice(separatorIndex + 1).trim()
    if (ERROR_CODE_PATTERN.test(code)) {
      return {
        code: code.toLowerCase(),
        detail: detail || null,
      }
    }
  }

  if (ERROR_CODE_PATTERN.test(raw)) {
    return {
      code: raw.toLowerCase(),
      detail: null,
    }
  }

  return {
    code: null,
    detail: raw,
  }
}

export function getErrorCode(error: unknown): string | null {
  return parseErrorCode(error).code
}

export function toErrorDetailWithCode(error: unknown, t: TranslateFn): string {
  const parsed = parseErrorCode(error)
  if (parsed.code) {
    return t('ui.error.codeTag', { code: parsed.code })
  }
  if (parsed.detail) {
    return parsed.detail
  }
  return t('ui.error.unknown')
}
