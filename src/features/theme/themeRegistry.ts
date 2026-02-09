export interface ThemeInfo {
  id: string
  label: string
}

export const DEFAULT_THEME_ID = 'swiss-cobalt'

// Eagerly import all preset css files at module load time so that
// persisted theme ids can take effect before opening settings panel.
const THEME_FILES = import.meta.glob('/src/styles/themes/presets/*.css', { eager: true })

export function listThemes(): ThemeInfo[] {
  const themes: ThemeInfo[] = []

  for (const path in THEME_FILES) {
    const fileName = path.split('/').pop()
    if (!fileName || fileName.startsWith('_')) {
      continue
    }

    const id = fileName.replace('.css', '')
    // Simple ID to Label conversion: swiss-cobalt -> Swiss Cobalt
    const label = id
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    themes.push({ id, label })
  }

  return themes.sort((a, b) => a.label.localeCompare(b.label))
}

export function resolveThemeIdFromThemes(
  themeId: string,
  themes: ThemeInfo[],
  defaultThemeId: string = DEFAULT_THEME_ID,
): string {
  if (themes.some((theme) => theme.id === themeId)) {
    return themeId
  }

  if (themes.length > 0) {
    return themes[0].id
  }

  return defaultThemeId
}

export function resolveThemeId(themeId: string, defaultThemeId: string = DEFAULT_THEME_ID): string {
  return resolveThemeIdFromThemes(themeId, listThemes(), defaultThemeId)
}
