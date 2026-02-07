import { create } from 'zustand'

import { appSettingsSchema, type AppSettings } from '../contracts/settings'
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutBinding,
  type ShortcutAction,
  type ShortcutMap,
} from '../shortcuts'

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
  thumbnailQuality: 40,
  thumbnailWidth: 512,
  lmStudioEndpoint: 'http://127.0.0.1:1234/v1/embeddings',
  lmStudioModel: 'qwen3-vl-embedding',
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
  'thumbnailQuality',
  'thumbnailWidth',
  'lmStudioEndpoint',
  'lmStudioModel',
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
