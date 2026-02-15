import { createContext, useMemo, type ReactNode } from 'react'

import { useUiStore } from '../store/useUiStore'
import {
  DEFAULT_LOCALE,
  getCatalogByLocale,
  type SupportedLocale,
  type UiLocalePreference,
} from './catalog'
import { resolveActiveLocale } from './locale'

type TranslationParams = Record<string, string | number | boolean | null | undefined>

export type TranslateFn = (key: string, params?: TranslationParams) => string

export interface I18nContextValue {
  locale: SupportedLocale
  uiLocale: UiLocalePreference
  t: TranslateFn
}

export const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
  browserLocale?: string | null
}

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

export function I18nProvider({ children, browserLocale }: I18nProviderProps) {
  const uiLocale = useUiStore((state) => state.uiLocale)
  const activeBrowserLocale = browserLocale ?? globalThis.navigator?.language ?? null

  const value = useMemo<I18nContextValue>(() => {
    const locale = resolveActiveLocale(uiLocale, activeBrowserLocale)
    const localeCatalog = getCatalogByLocale(locale) as Record<string, string>
    const fallbackCatalog = getCatalogByLocale(DEFAULT_LOCALE) as Record<string, string>

    const t: TranslateFn = (key, params) => {
      const resolved = localeCatalog[key] ?? fallbackCatalog[key] ?? key
      return applyTemplateParams(resolved, params)
    }

    return {
      locale,
      uiLocale,
      t,
    }
  }, [activeBrowserLocale, uiLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
