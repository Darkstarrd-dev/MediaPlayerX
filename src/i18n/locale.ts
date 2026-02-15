import {
  AUTO_UI_LOCALE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type UiLocalePreference,
} from './catalog'

const localeByNormalizedTag = new Map<string, SupportedLocale>(
  SUPPORTED_LOCALES.map((locale) => [normalizeLocaleTag(locale), locale]),
)

function normalizeLocaleTag(rawLocale: string): string {
  const parts = rawLocale
    .trim()
    .replace(/_/g, '-')
    .split('-')
    .filter((part) => part.length > 0)

  if (parts.length === 0) {
    return ''
  }

  const [languagePart, ...rest] = parts
  const normalizedLanguage = languagePart.toLowerCase()
  const normalizedRest = rest.map((part, index) => {
    if (index === 0 && part.length === 2) {
      return part.toUpperCase()
    }
    return part.toLowerCase()
  })

  return [normalizedLanguage, ...normalizedRest].join('-')
}

function resolveLocaleByLanguage(language: string): SupportedLocale {
  if (language === 'en') {
    return 'en-US'
  }
  if (language === 'zh') {
    return 'zh-CN'
  }
  return DEFAULT_LOCALE
}

export function resolveSupportedLocale(rawLocale: string | null | undefined): SupportedLocale {
  if (!rawLocale) {
    return DEFAULT_LOCALE
  }

  const normalizedTag = normalizeLocaleTag(rawLocale)
  if (!normalizedTag) {
    return DEFAULT_LOCALE
  }

  const exactLocale = localeByNormalizedTag.get(normalizedTag)
  if (exactLocale) {
    return exactLocale
  }

  const language = normalizedTag.split('-')[0]
  return resolveLocaleByLanguage(language)
}

export function resolveActiveLocale(
  uiLocale: UiLocalePreference,
  browserLocale: string | null | undefined,
): SupportedLocale {
  if (uiLocale !== AUTO_UI_LOCALE) {
    return uiLocale
  }

  return resolveSupportedLocale(browserLocale)
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return localeByNormalizedTag.has(normalizeLocaleTag(value))
}
