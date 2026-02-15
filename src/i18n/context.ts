import { createContext } from 'react'

import type { SupportedLocale, UiLocalePreference } from './catalog'

type TranslationParams = Record<string, string | number | boolean | null | undefined>

export type TranslateFn = (key: string, params?: TranslationParams) => string

export interface I18nContextValue {
  locale: SupportedLocale
  uiLocale: UiLocalePreference
  t: TranslateFn
}

export const I18nContext = createContext<I18nContextValue | null>(null)
