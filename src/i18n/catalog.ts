import { enUsCatalog } from './locales/en-US'
import { zhCnCatalog } from './locales/zh-CN'

export const AUTO_UI_LOCALE = 'auto' as const
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type UiLocalePreference = typeof AUTO_UI_LOCALE | SupportedLocale
export type TranslationKey = keyof typeof zhCnCatalog
export type TranslationCatalog = Record<TranslationKey, string>

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'

export const catalogsByLocale: Record<SupportedLocale, TranslationCatalog> = {
  'zh-CN': zhCnCatalog,
  'en-US': enUsCatalog,
}

export function getCatalogByLocale(locale: SupportedLocale): TranslationCatalog {
  return catalogsByLocale[locale]
}
