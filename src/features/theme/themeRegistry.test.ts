import { describe, expect, it } from 'vitest'

import { DEFAULT_THEME_ID, resolveThemeIdFromThemes, type ThemeInfo } from './themeRegistry'

describe('resolveThemeIdFromThemes', () => {
  const themes: ThemeInfo[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ]

  it('keeps current theme when still available', () => {
    expect(resolveThemeIdFromThemes('beta', themes)).toBe('beta')
  })

  it('falls back to first available theme when current theme is missing', () => {
    expect(resolveThemeIdFromThemes('missing-theme', themes)).toBe('alpha')
  })

  it('falls back to default theme when no preset exists', () => {
    expect(resolveThemeIdFromThemes('missing-theme', [])).toBe(DEFAULT_THEME_ID)
  })
})
