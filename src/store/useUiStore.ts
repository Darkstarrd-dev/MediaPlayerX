import { create } from 'zustand'

import { appSettingsSchema, type AppSettings } from '../contracts/settings'
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutBinding,
  type ShortcutAction,
  type ShortcutMap,
} from '../shortcuts'

const DEFAULT_MUSIC_SHADER_ID = 'mcs-szb'

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'image',
  vectorMode: false,
  settingsOpen: false,
  headerHeight: 56,
  settingsFontSize: 14,
  sidebarRatio: 0.26,
  sidebarMinWidth: 180,
  layoutLocked: false,
  electronNativeChromeEnabled: false,
  sidebarFontSize: 14,
  sidebarCountFontSize: 12,
  sidebarIndentStep: 14,
  sidebarVerticalGap: 2,
  metadataRatio: 0.28,
  workspaceBottomPanelHeight: 164,
  fullscreenVideoControlsMaxWidth: 980,
  thumbnailScale: 5,
  thumbnailGap: 8,
  showNamesOnly: false,
  metadataCollapsed: false,
  autoPlayEnabled: false,
  autoPlayInterval: 2,
  searchField: 'all',
  searchText: '',
  vectorThreshold: 0.62,
  sidebarFocus: 'main',
  imageRootNodeId: null,
  videoRootNodeId: null,
  musicRootNodeId: null,
  themeId: 'parchment',
  styleId: 'flush',
  paletteId: 'parchment',
  paletteMode: 'day',
  paletteDayId: 'parchment',
  paletteNightId: 'tokyo-night',
  thumbnailQuality: 40,
  thumbnailWidth: 512,
  musicVisualizerRenderLongEdgePx: 1280,
  musicVisualizerFpsCap: 60,
  musicVisualizerSelectedShaderId: '',
  musicVisualizerToneMapMode: 'aces',
  musicVisualizerToneMapExposure: 1,
  musicVisualizerToneMapStrength: 0.55,
  musicVisualizerShowFps: false,
  musicVisualizerRenderer: 'gpu',
  musicVisualizerShaderSettingsById: {
    [DEFAULT_MUSIC_SHADER_ID]: {
      renderLongEdgePx: 1280,
      foregroundBackgroundScaleRatio: 2,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: 'gpu',
    },
  },
  proxyServer: '',
  ehentaiCookies: '',
  adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
  adReviewVisionModel: '',
  adReviewVisionVerified: false,
  adReviewStrategyMode: 'all',
  adReviewHeadN: 8,
  adReviewTailN: 8,
  adReviewTailStopCleanStreak: 6,
  adReviewMaxConcurrency: 4,
}

const SETTINGS_KEYS: (keyof AppSettings)[] = [
  'mode',
  'vectorMode',
  'settingsOpen',
  'headerHeight',
  'settingsFontSize',
  'sidebarRatio',
  'sidebarMinWidth',
  'layoutLocked',
  'electronNativeChromeEnabled',
  'sidebarFontSize',
  'sidebarCountFontSize',
  'sidebarIndentStep',
  'sidebarVerticalGap',
  'metadataRatio',
  'workspaceBottomPanelHeight',
  'fullscreenVideoControlsMaxWidth',
  'thumbnailScale',
  'thumbnailGap',
  'showNamesOnly',
  'metadataCollapsed',
  'autoPlayEnabled',
  'autoPlayInterval',
  'searchField',
  'searchText',
  'vectorThreshold',
  'sidebarFocus',
  'imageRootNodeId',
  'videoRootNodeId',
  'musicRootNodeId',
  'themeId',
  'styleId',
  'paletteId',
  'paletteMode',
  'paletteDayId',
  'paletteNightId',
  'thumbnailQuality',
  'thumbnailWidth',
  'musicVisualizerRenderLongEdgePx',
  'musicVisualizerFpsCap',
  'musicVisualizerSelectedShaderId',
  'musicVisualizerToneMapMode',
  'musicVisualizerToneMapExposure',
  'musicVisualizerToneMapStrength',
  'musicVisualizerShowFps',
  'musicVisualizerRenderer',
  'musicVisualizerShaderSettingsById',
  'proxyServer',
  'ehentaiCookies',
  'adReviewVisionEndpoint',
  'adReviewVisionModel',
  'adReviewVisionVerified',
  'adReviewStrategyMode',
  'adReviewHeadN',
  'adReviewTailN',
  'adReviewTailStopCleanStreak',
  'adReviewMaxConcurrency',
]

function pickSettings(state: UiStore): AppSettings {
  const settings = {} as AppSettings
  for (const key of SETTINGS_KEYS) {
    ;(settings as Record<string, unknown>)[key] = state[key]
  }
  return settings
}

interface UiStore extends AppSettings {
  shortcuts: ShortcutMap
  updateSettings: (patch: Partial<AppSettings>) => void
  setShortcut: (action: ShortcutAction, binding: string) => void
  resetShortcuts: () => void
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  shortcuts: { ...DEFAULT_SHORTCUTS },
  updateSettings: (patch) => {
    const current = pickSettings(get())
    const candidate = {
      ...current,
      ...patch,
    }

    const parsed = appSettingsSchema.safeParse(candidate)
    if (!parsed.success) {
      console.warn('设置更新失败，输入未通过校验', parsed.error.flatten())
      return
    }

    const hasChanges = SETTINGS_KEYS.some((key) => !Object.is(parsed.data[key], current[key]))
    if (!hasChanges) {
      return
    }

    set(parsed.data)
  },
  setShortcut: (action, binding) => {
    const normalized = normalizeShortcutBinding(binding)
    set((state) => ({
      shortcuts: {
        ...state.shortcuts,
        [action]: normalized,
      },
    }))
  },
  resetShortcuts: () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } })
  },
}))

export function resetUiStoreState(): void {
  useUiStore.setState((state) => ({
    ...state,
    ...DEFAULT_SETTINGS,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  }))
}
