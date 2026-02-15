export interface ThemeInfo {
  id: string
  label: string
}

export interface StyleInfo {
  id: string
  label: string
}

export interface PaletteInfo {
  id: string
  label: string
}

export type PaletteMode = 'day' | 'night'

export const DEFAULT_STYLE_ID = 'flush'
export const DEFAULT_PALETTE_ID = 'parchment'
export const DEFAULT_THEME_ID = DEFAULT_PALETTE_ID

const STYLE_PALETTE_ALLOWLIST: Record<string, readonly string[]> = {
  'soft-skeuomorphic': ['skeuomorphic-light', 'skeuomorphic-dark'],
  'soft-skeuomorphic-crisp': ['skeuomorphic-light', 'skeuomorphic-dark'],
  'soft-skeuomorphic-plush': ['skeuomorphic-light', 'skeuomorphic-dark'],
  'soft-skeuomorphic-etched': ['skeuomorphic-light', 'skeuomorphic-dark'],
}

const STYLE_DEFAULT_PALETTE_ID: Record<string, string> = {
  'soft-skeuomorphic': 'skeuomorphic-light',
  'soft-skeuomorphic-crisp': 'skeuomorphic-light',
  'soft-skeuomorphic-plush': 'skeuomorphic-light',
  'soft-skeuomorphic-etched': 'skeuomorphic-light',
}

const STYLE_DEFAULT_PALETTE_PAIR: Record<string, { day: string; night: string }> = {
  'soft-skeuomorphic': {
    day: 'skeuomorphic-light',
    night: 'skeuomorphic-dark',
  },
  'soft-skeuomorphic-crisp': {
    day: 'skeuomorphic-light',
    night: 'skeuomorphic-dark',
  },
  'soft-skeuomorphic-plush': {
    day: 'skeuomorphic-light',
    night: 'skeuomorphic-dark',
  },
  'soft-skeuomorphic-etched': {
    day: 'skeuomorphic-light',
    night: 'skeuomorphic-dark',
  },
}

const NIGHT_KEYWORDS = ['dark', 'night', 'dim', 'mocha', 'black']
const DAY_KEYWORDS = ['light', 'day', 'paper', 'parchment', 'solarized']

// Styles and palettes are loaded via styles/themes/index.css; here we only need file metadata for lists/resolution.
const STYLE_FILES = import.meta.glob('/src/styles/themes/styles/**/*.css')
const PALETTE_FILES = import.meta.glob('/src/styles/themes/palettes/**/*.css')
const THEME_FILES = import.meta.glob('/src/styles/themes/presets/**/*.css', { eager: true })

function toLabel(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function collectInfos(files: Record<string, unknown>): ThemeInfo[] {
  const byId = new Map<string, ThemeInfo>()

  for (const path in files) {
    const fileName = path.split('/').pop()
    if (!fileName || !fileName.endsWith('.css') || fileName.startsWith('_')) {
      continue
    }

    const id = fileName.slice(0, -'.css'.length)
    if (!id || byId.has(id)) {
      continue
    }

    byId.set(id, {
      id,
      label: toLabel(id),
    })
  }

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function resolveId<T extends { id: string }>(id: string, items: T[], fallbackId: string): string {
  if (items.some((item) => item.id === id)) {
    return id
  }

  if (items.length > 0) {
    return items[0].id
  }

  return fallbackId
}

function ensureDefaultOption<T extends { id: string; label: string }>(
  items: T[],
  defaultId: string,
): T[] {
  if (items.some((item) => item.id === defaultId)) {
    return items
  }

  return [...items, { id: defaultId, label: toLabel(defaultId) } as T].sort((a, b) => a.label.localeCompare(b.label))
}

export function listThemes(): ThemeInfo[] {
  return collectInfos(THEME_FILES)
}

export function listStyles(): StyleInfo[] {
  return ensureDefaultOption<StyleInfo>(collectInfos(STYLE_FILES), DEFAULT_STYLE_ID)
}

export function listPalettes(): PaletteInfo[] {
  return listPalettesByStyle()
}

export function listPalettesByStyle(styleId?: string): PaletteInfo[] {
  const byId = new Map<string, PaletteInfo>()

  for (const item of [...collectInfos(PALETTE_FILES), ...collectInfos(THEME_FILES)]) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item)
    }
  }

  const allPalettes = ensureDefaultOption(Array.from(byId.values()), DEFAULT_PALETTE_ID)
  if (!styleId) {
    return allPalettes
  }

  const allowedPaletteIds = STYLE_PALETTE_ALLOWLIST[styleId]
  if (!allowedPaletteIds || allowedPaletteIds.length === 0) {
    return allPalettes
  }

  const filtered = allPalettes.filter((palette) => allowedPaletteIds.includes(palette.id))
  return filtered
}

export function resolveThemeIdFromThemes(
  themeId: string,
  themes: ThemeInfo[],
  defaultThemeId: string = DEFAULT_THEME_ID,
): string {
  return resolveId(themeId, themes, defaultThemeId)
}

export function resolveThemeId(themeId: string, defaultThemeId: string = DEFAULT_THEME_ID): string {
  return resolveThemeIdFromThemes(themeId, listThemes(), defaultThemeId)
}

export function resolveStyleIdFromStyles(
  styleId: string,
  styles: StyleInfo[],
  defaultStyleId: string = DEFAULT_STYLE_ID,
): string {
  return resolveId(styleId, styles, defaultStyleId)
}

export function resolvePaletteIdFromPalettes(
  paletteId: string,
  palettes: PaletteInfo[],
  defaultPaletteId: string = DEFAULT_PALETTE_ID,
): string {
  return resolveId(paletteId, palettes, defaultPaletteId)
}

export function resolveStyleId(styleId: string, defaultStyleId: string = DEFAULT_STYLE_ID): string {
  return resolveStyleIdFromStyles(styleId, listStyles(), defaultStyleId)
}

export function resolvePaletteId(paletteId: string, defaultPaletteId: string = DEFAULT_PALETTE_ID): string {
  return resolvePaletteIdFromPalettes(paletteId, listPalettes(), defaultPaletteId)
}

export function resolvePaletteIdForStyle(
  paletteId: string,
  styleId: string,
  defaultPaletteId: string = DEFAULT_PALETTE_ID,
): string {
  const palettes = listPalettesByStyle(styleId)
  const styleDefaultPaletteId = STYLE_DEFAULT_PALETTE_ID[styleId] ?? defaultPaletteId
  if (palettes.some((palette) => palette.id === paletteId)) {
    return paletteId
  }

  if (palettes.some((palette) => palette.id === styleDefaultPaletteId)) {
    return styleDefaultPaletteId
  }

  return resolvePaletteIdFromPalettes(paletteId, palettes, styleDefaultPaletteId)
}

export function resolvePaletteModeById(paletteId: string): PaletteMode {
  const lower = paletteId.toLowerCase()
  if (NIGHT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 'night'
  }
  if (DAY_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 'day'
  }
  return 'day'
}

export function resolvePalettePairForStyle(
  styleId: string,
  dayPaletteId: string,
  nightPaletteId: string,
): { day: string; night: string } {
  const palettes = listPalettesByStyle(styleId)
  const defaults = STYLE_DEFAULT_PALETTE_PAIR[styleId]

  const resolvedDay = resolvePaletteIdFromPalettes(dayPaletteId, palettes, defaults?.day ?? DEFAULT_PALETTE_ID)
  const resolvedNight = resolvePaletteIdFromPalettes(
    nightPaletteId,
    palettes,
    defaults?.night ?? (resolvedDay === DEFAULT_PALETTE_ID ? 'tokyo-night' : resolvedDay),
  )

  if (resolvedDay !== resolvedNight) {
    return { day: resolvedDay, night: resolvedNight }
  }

  const dayCandidate = palettes.find((palette) => resolvePaletteModeById(palette.id) === 'day' && palette.id !== resolvedDay)
  const nightCandidate = palettes.find((palette) => resolvePaletteModeById(palette.id) === 'night' && palette.id !== resolvedNight)
  if (dayCandidate) {
    return { day: dayCandidate.id, night: resolvedNight }
  }
  if (nightCandidate) {
    return { day: resolvedDay, night: nightCandidate.id }
  }

  return { day: resolvedDay, night: resolvedNight }
}
