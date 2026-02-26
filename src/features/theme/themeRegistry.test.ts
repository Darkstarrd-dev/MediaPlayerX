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
    { id: 'soft-skeuomorphic', label: 'Soft Skeuomorphic' },
  ]

  it('keeps current style when still available', () => {
    expect(resolveStyleIdFromStyles('soft-skeuomorphic', styles)).toBe('soft-skeuomorphic')
  })

  it('falls back to first available style when current style is missing', () => {
    expect(resolveStyleIdFromStyles('missing-style', styles)).toBe('soft-skeuomorphic')
  })

  it('falls back to default style when no style preset exists', () => {
    expect(resolveStyleIdFromStyles('missing-style', [])).toBe(DEFAULT_STYLE_ID)
  })
})

describe('resolvePaletteIdFromPalettes', () => {
  const palettes: PaletteInfo[] = [
    { id: 'skeuomorphic-luxury-white', label: 'Luxury White' },
  ]

  it('keeps current palette when still available', () => {
    expect(resolvePaletteIdFromPalettes('skeuomorphic-luxury-white', palettes)).toBe('skeuomorphic-luxury-white')
  })

  it('falls back to first available palette when current palette is missing', () => {
    expect(resolvePaletteIdFromPalettes('missing-palette', palettes)).toBe('skeuomorphic-luxury-white')
  })

  it('falls back to default palette when no palette preset exists', () => {
    expect(resolvePaletteIdFromPalettes('missing-palette', [])).toBe(DEFAULT_PALETTE_ID)
  })
})

describe('listPalettesByStyle', () => {
  it('limits soft-skeuomorphic to dedicated palettes', () => {
    const ids = listPalettesByStyle('soft-skeuomorphic').map((item) => item.id)
    expect(ids).toEqual(['skeuomorphic-luxury-white'])
  })

  it('keeps fallback style compatible with default palette', () => {
    const ids = listPalettesByStyle('missing-style').map((item) => item.id)
    expect(ids).toEqual([DEFAULT_PALETTE_ID])
  })
})

describe('resolvePaletteIdForStyle', () => {
  it('falls back to style default palette when current palette is out of allowlist', () => {
    expect(resolvePaletteIdForStyle('parchment', 'soft-skeuomorphic')).toBe('skeuomorphic-luxury-white')
  })
})

describe('resolvePalettePairForStyle', () => {
  it('locks day/night palette pair to luxury-white', () => {
    expect(resolvePalettePairForStyle('soft-skeuomorphic', 'skeuomorphic-light', 'skeuomorphic-dark')).toEqual({
      day: 'skeuomorphic-luxury-white',
      night: 'skeuomorphic-luxury-white',
    })
  })
})
