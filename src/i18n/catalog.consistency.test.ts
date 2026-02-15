import { describe, expect, it } from 'vitest'

import { catalogsByLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './catalog'

describe('i18n catalog consistency', () => {
  it('keeps locale keys aligned with default catalog', () => {
    const defaultCatalog = catalogsByLocale[DEFAULT_LOCALE]
    const defaultKeys = Object.keys(defaultCatalog).sort()

    for (const locale of SUPPORTED_LOCALES) {
      const localeKeys = Object.keys(catalogsByLocale[locale]).sort()
      expect(localeKeys).toEqual(defaultKeys)
    }
  })

  it('does not allow empty translation values', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = catalogsByLocale[locale]
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0)
      }
    }
  })
})
