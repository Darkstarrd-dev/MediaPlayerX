export type SettingsPageId = 'appearance' | 'layout' | 'workspace'
export type PaletteMode = 'day' | 'night'

export interface UiSettingsState {
  styleId: string
  paletteId: string
  paletteMode: PaletteMode
  uiLocale: 'auto' | 'zh-CN' | 'en-US'
  settingsBackdropOpacity: number
  layoutPadding: number
  paneInnerPadding: number
  paneStackGap: number
  controlRadius: number
  controlHeight: number
  sidebarWidthPercent: number
  metadataWidthPercent: number
}

export const UI_SETTINGS_STORAGE_KEY = 'general-ui-frame.ui-settings.v1'

export const DEFAULT_UI_SETTINGS: UiSettingsState = {
  styleId: 'soft-skeuomorphic',
  paletteId: 'skeuomorphic-luxury-white',
  paletteMode: 'day',
  uiLocale: 'auto',
  settingsBackdropOpacity: 18,
  layoutPadding: 8,
  paneInnerPadding: 8,
  paneStackGap: 10,
  controlRadius: 8,
  controlHeight: 34,
  sidebarWidthPercent: 26,
  metadataWidthPercent: 28,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return clamp(Math.round(value * 100) / 100, min, max)
}

function asLocale(value: unknown): UiSettingsState['uiLocale'] {
  if (value === 'zh-CN' || value === 'en-US' || value === 'auto') {
    return value
  }
  return DEFAULT_UI_SETTINGS.uiLocale
}

function asPaletteMode(value: unknown): PaletteMode {
  return value === 'night' ? 'night' : 'day'
}

function asNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

export function normalizeUiSettings(source: unknown): UiSettingsState {
  if (!source || typeof source !== 'object') {
    return DEFAULT_UI_SETTINGS
  }

  const raw = source as Partial<UiSettingsState>

  return {
    styleId: asNonEmptyString(raw.styleId, DEFAULT_UI_SETTINGS.styleId),
    paletteId: asNonEmptyString(raw.paletteId, DEFAULT_UI_SETTINGS.paletteId),
    paletteMode: asPaletteMode(raw.paletteMode),
    uiLocale: asLocale(raw.uiLocale),
    settingsBackdropOpacity: asNumber(raw.settingsBackdropOpacity, DEFAULT_UI_SETTINGS.settingsBackdropOpacity, 10, 45),
    layoutPadding: asNumber(raw.layoutPadding, DEFAULT_UI_SETTINGS.layoutPadding, 0, 18),
    paneInnerPadding: asNumber(raw.paneInnerPadding, DEFAULT_UI_SETTINGS.paneInnerPadding, 4, 18),
    paneStackGap: asNumber(raw.paneStackGap, DEFAULT_UI_SETTINGS.paneStackGap, 4, 18),
    controlRadius: asNumber(raw.controlRadius, DEFAULT_UI_SETTINGS.controlRadius, 4, 16),
    controlHeight: asNumber(raw.controlHeight, DEFAULT_UI_SETTINGS.controlHeight, 30, 44),
    sidebarWidthPercent: asNumber(raw.sidebarWidthPercent, DEFAULT_UI_SETTINGS.sidebarWidthPercent, 20, 40),
    metadataWidthPercent: asNumber(raw.metadataWidthPercent, DEFAULT_UI_SETTINGS.metadataWidthPercent, 20, 40),
  }
}

export function loadUiSettings(): UiSettingsState {
  try {
    const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_UI_SETTINGS
    }
    return normalizeUiSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_UI_SETTINGS
  }
}

export function persistUiSettings(settings: UiSettingsState): void {
  try {
    window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore write errors (private mode/quota)
  }
}

export function applyUiSettingsToDocument(settings: UiSettingsState): void {
  document.documentElement.setAttribute('data-mpx-style', settings.styleId)
  document.documentElement.setAttribute('data-mpx-palette', settings.paletteId)
  document.documentElement.setAttribute('data-mpx-palette-mode', settings.paletteMode)
  document.documentElement.style.setProperty('--mpx-settings-backdrop-opacity', `${settings.settingsBackdropOpacity}%`)
  document.documentElement.style.setProperty('--mpx-layout-padding', `${settings.layoutPadding}px`)
  document.documentElement.style.setProperty('--mpx-pane-inner-padding-px', `${settings.paneInnerPadding}px`)
  document.documentElement.style.setProperty('--mpx-pane-stack-gap', `${settings.paneStackGap}px`)
  document.documentElement.style.setProperty('--mpx-control-radius', `${settings.controlRadius}px`)
  document.documentElement.style.setProperty('--mpx-control-height', `${settings.controlHeight}px`)
  document.documentElement.style.setProperty('--mpx-icon-button-size', `${settings.controlHeight}px`)
  document.documentElement.style.setProperty('--mpx-header-btn-size-px', `${settings.controlHeight}px`)
}
