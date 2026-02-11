import { DEFAULT_SETTINGS } from '../../store/useUiStore'

export const SIZE_SCALE_CONFIG = {
  headerHeight: {
    base: DEFAULT_SETTINGS.headerHeight,
    min: 48 / DEFAULT_SETTINGS.headerHeight,
    max: 96 / DEFAULT_SETTINGS.headerHeight,
    step: 0.01,
  },
  settingsFontSize: {
    base: DEFAULT_SETTINGS.settingsFontSize,
    min: 12 / DEFAULT_SETTINGS.settingsFontSize,
    max: 24 / DEFAULT_SETTINGS.settingsFontSize,
    step: 0.01,
  },
  sidebarMinWidth: {
    base: DEFAULT_SETTINGS.sidebarMinWidth,
    min: 80 / DEFAULT_SETTINGS.sidebarMinWidth,
    max: 640 / DEFAULT_SETTINGS.sidebarMinWidth,
    step: 0.01,
  },
  sidebarFontSize: {
    base: DEFAULT_SETTINGS.sidebarFontSize,
    min: 11 / DEFAULT_SETTINGS.sidebarFontSize,
    max: 24 / DEFAULT_SETTINGS.sidebarFontSize,
    step: 0.01,
  },
  sidebarCountFontSize: {
    base: DEFAULT_SETTINGS.sidebarCountFontSize,
    min: 10 / DEFAULT_SETTINGS.sidebarCountFontSize,
    max: 22 / DEFAULT_SETTINGS.sidebarCountFontSize,
    step: 0.01,
  },
  sidebarIndentStep: {
    base: DEFAULT_SETTINGS.sidebarIndentStep,
    min: 8 / DEFAULT_SETTINGS.sidebarIndentStep,
    max: 48 / DEFAULT_SETTINGS.sidebarIndentStep,
    step: 0.01,
  },
  sidebarVerticalGap: {
    base: DEFAULT_SETTINGS.sidebarVerticalGap,
    min: 0,
    max: 24 / DEFAULT_SETTINGS.sidebarVerticalGap,
    step: 0.01,
  },
  vectorPanelHeight: {
    base: DEFAULT_SETTINGS.vectorPanelHeight,
    min: 80 / DEFAULT_SETTINGS.vectorPanelHeight,
    max: 360 / DEFAULT_SETTINGS.vectorPanelHeight,
    step: 0.01,
  },
  thumbnailGap: {
    base: DEFAULT_SETTINGS.thumbnailGap,
    min: 0,
    max: 24 / DEFAULT_SETTINGS.thumbnailGap,
    step: 0.01,
  },
} as const

export type SizeScaleKey = keyof typeof SIZE_SCALE_CONFIG

export function toScale(key: SizeScaleKey, absoluteValue: number): number {
  const config = SIZE_SCALE_CONFIG[key]
  const raw = absoluteValue / config.base
  const clamped = Math.max(config.min, Math.min(config.max, raw))
  return Number(clamped.toFixed(2))
}

export function toAbsolutePx(key: SizeScaleKey, scaleValue: number): number {
  const config = SIZE_SCALE_CONFIG[key]
  const clamped = Math.max(config.min, Math.min(config.max, scaleValue))
  return Math.round(config.base * clamped)
}

export function formatScale(value: number): string {
  return `${value.toFixed(2)}x`
}
