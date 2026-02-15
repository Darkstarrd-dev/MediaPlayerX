import { useContext } from 'react'

import { AUTO_UI_LOCALE, DEFAULT_LOCALE, getCatalogByLocale } from './catalog'
import { I18nContext } from './context'

type TranslationParams = Record<string, string | number | boolean | null | undefined>

function applyTemplateParams(template: string, params?: TranslationParams): string {
  if (!params) {
    return template
  }

  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_fullMatch, key: string) => {
    const value = params[key]
    if (typeof value === 'undefined' || value == null) {
      return ''
    }
    return String(value)
  })
}

const fallbackCatalog = getCatalogByLocale(DEFAULT_LOCALE) as Record<string, string>

const fallbackContext = {
  locale: DEFAULT_LOCALE,
  uiLocale: AUTO_UI_LOCALE,
  t: (key: string, params?: TranslationParams) => {
    const resolved = fallbackCatalog[key] ?? key
    return applyTemplateParams(resolved, params)
  },
} as const

export function useI18n() {
  const context = useContext(I18nContext)
  return context ?? fallbackContext
}
