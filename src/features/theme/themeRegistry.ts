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

export const DEFAULT_STYLE_ID = 'flush'
export const DEFAULT_PALETTE_ID = 'parchment'
export const DEFAULT_THEME_ID = DEFAULT_PALETTE_ID

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
  const byId = new Map<string, PaletteInfo>()

  for (const item of [...collectInfos(PALETTE_FILES), ...collectInfos(THEME_FILES)]) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item)
    }
  }

  return ensureDefaultOption(Array.from(byId.values()), DEFAULT_PALETTE_ID)
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
