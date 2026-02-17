import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PALETTE_ID,
  DEFAULT_STYLE_ID,
  DEFAULT_THEME_ID,
  listPalettesByStyle,
  resolvePaletteIdFromPalettes,
  resolvePaletteIdForStyle,
  resolvePalettePairForStyle,
  resolveStyleIdFromStyles,
  resolveThemeIdFromThemes,
  type PaletteInfo,
  type StyleInfo,
  type ThemeInfo,
} from './themeRegistry'

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

describe('resolveStyleIdFromStyles', () => {
  const styles: StyleInfo[] = [
    { id: 'flush', label: 'Flush' },
    { id: 'liquid-glass', label: 'Liquid Glass' },
  ]

  it('keeps current style when still available', () => {
    expect(resolveStyleIdFromStyles('liquid-glass', styles)).toBe('liquid-glass')
  })

  it('falls back to first available style when current style is missing', () => {
    expect(resolveStyleIdFromStyles('missing-style', styles)).toBe('flush')
  })

  it('falls back to default style when no style preset exists', () => {
    expect(resolveStyleIdFromStyles('missing-style', [])).toBe(DEFAULT_STYLE_ID)
  })
})

describe('resolvePaletteIdFromPalettes', () => {
  const palettes: PaletteInfo[] = [
    { id: 'parchment', label: 'Parchment' },
    { id: 'tokyo-night', label: 'Tokyo Night' },
  ]

  it('keeps current palette when still available', () => {
    expect(resolvePaletteIdFromPalettes('tokyo-night', palettes)).toBe('tokyo-night')
  })

  it('falls back to first available palette when current palette is missing', () => {
    expect(resolvePaletteIdFromPalettes('missing-palette', palettes)).toBe('parchment')
  })

  it('falls back to default palette when no palette preset exists', () => {
    expect(resolvePaletteIdFromPalettes('missing-palette', [])).toBe(DEFAULT_PALETTE_ID)
  })
})

describe('listPalettesByStyle', () => {
  it('limits soft-skeuomorphic to dedicated palettes', () => {
    const ids = listPalettesByStyle('soft-skeuomorphic').map((item) => item.id)
    expect(ids).toEqual(['skeuomorphic-light-white', 'skeuomorphic-dark', 'skeuomorphic-light', 'skeuomorphic-scroll'])
  })

  it('keeps unrestricted styles compatible with default palette', () => {
    const ids = listPalettesByStyle('flush').map((item) => item.id)
    expect(ids).toContain(DEFAULT_PALETTE_ID)
  })
})

describe('resolvePaletteIdForStyle', () => {
  it('falls back to style default palette when current palette is out of allowlist', () => {
    expect(resolvePaletteIdForStyle('parchment', 'soft-skeuomorphic')).toBe('skeuomorphic-light')
  })
})

describe('resolvePalettePairForStyle', () => {
  it('keeps selected day palette when day/night conflict on day palette', () => {
    expect(resolvePalettePairForStyle('soft-skeuomorphic', 'skeuomorphic-light-white', 'skeuomorphic-light-white')).toEqual({
      day: 'skeuomorphic-light-white',
      night: 'skeuomorphic-dark',
    })
  })
})
