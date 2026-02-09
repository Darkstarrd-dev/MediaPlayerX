export interface ThemeInfo {
  id: string
  label: string
}

export function listThemes(): ThemeInfo[] {
  const themeFiles = import.meta.glob('/src/styles/themes/presets/*.css', { eager: true })
  const themes: ThemeInfo[] = []

  for (const path in themeFiles) {
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
