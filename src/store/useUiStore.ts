import { create } from 'zustand'

import { appSettingsSchema, type AppSettings } from '../contracts/settings'
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutBinding,
  type ShortcutAction,
  type ShortcutMap,
} from '../shortcuts'
import {
  DEFAULT_VECTOR_CONTROLS,
  type VectorControlAction,
  type VectorControlMap,
} from '../vectorControls'

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'image',
  vectorMode: false,
  settingsOpen: false,
  headerHeight: 56,
  settingsFontSize: 14,
  sidebarRatio: 0.26,
  sidebarMinWidth: 180,
  layoutLocked: false,
  sidebarFontSize: 14,
  sidebarCountFontSize: 12,
  sidebarIndentStep: 14,
  sidebarVerticalGap: 2,
  metadataRatio: 0.28,
  vectorPanelHeight: 164,
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
  themeId: 'swiss-cobalt',
  thumbnailQuality: 40,
  thumbnailWidth: 512,
  lmStudioEndpoint: 'http://127.0.0.1:1234/v1/embeddings',
  lmStudioModel: 'qwen3-vl-embedding',
  adReviewStrategyMode: 'all',
  adReviewHeadN: 8,
  adReviewTailN: 8,
  adReviewTailStopCleanStreak: 6,
  adReviewMaxConcurrency: 2,
  vectorUniverseMoveSpeed: 24,
  vectorUniverseSprintMultiplier: 2.25,
  vectorUniverseLookSensitivity: 0.0019,
  vectorUniverseRaycastDistance: 18,
  vectorUniverseHelperScale: 180,
  vectorUniverseDispersion: 1,
  vectorUniverseWidgetSize: 200,
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
  'sidebarFontSize',
  'sidebarCountFontSize',
  'sidebarIndentStep',
  'sidebarVerticalGap',
  'metadataRatio',
  'vectorPanelHeight',
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
  'themeId',
  'thumbnailQuality',
  'thumbnailWidth',
  'lmStudioEndpoint',
  'lmStudioModel',
  'adReviewStrategyMode',
  'adReviewHeadN',
  'adReviewTailN',
  'adReviewTailStopCleanStreak',
  'adReviewMaxConcurrency',
  'vectorUniverseMoveSpeed',
  'vectorUniverseSprintMultiplier',
  'vectorUniverseLookSensitivity',
  'vectorUniverseRaycastDistance',
  'vectorUniverseHelperScale',
  'vectorUniverseDispersion',
  'vectorUniverseWidgetSize',
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
  vectorControls: VectorControlMap
  updateSettings: (patch: Partial<AppSettings>) => void
  setShortcut: (action: ShortcutAction, binding: string) => void
  setVectorControl: (action: VectorControlAction, binding: string) => void
  resetShortcuts: () => void
  resetVectorControls: () => void
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  shortcuts: { ...DEFAULT_SHORTCUTS },
  vectorControls: { ...DEFAULT_VECTOR_CONTROLS },
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
  setVectorControl: (action, binding) => {
    const normalized = normalizeShortcutBinding(binding)
    set((state) => ({
      vectorControls: {
        ...state.vectorControls,
        [action]: normalized,
      },
    }))
  },
  resetShortcuts: () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } })
  },
  resetVectorControls: () => {
    set({ vectorControls: { ...DEFAULT_VECTOR_CONTROLS } })
  },
}))

export function resetUiStoreState(): void {
  useUiStore.setState((state) => ({
    ...state,
    ...DEFAULT_SETTINGS,
    shortcuts: { ...DEFAULT_SHORTCUTS },
    vectorControls: { ...DEFAULT_VECTOR_CONTROLS },
  }))
}
