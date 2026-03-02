export type ShellViewMode = 'home' | 'app'

export interface AppPanelState {
  sidebarCollapsed: boolean
  metadataCollapsed: boolean
}

export interface AppLayoutDefinition<T extends string = string> {
  id: T
  layout: AppPanelState
}

export interface AppShellState<T extends string = string> {
  activeView: ShellViewMode
  selectedAppId: T
  panelStates: Record<T, AppPanelState>
}

const APP_SHELL_STORAGE_KEY = 'general-ui-frame.app-shell.v1'

function normalizePanelState(source: unknown, fallback: AppPanelState): AppPanelState {
  if (!source || typeof source !== 'object') {
    return fallback
  }

  const raw = source as Partial<AppPanelState>

  return {
    sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : fallback.sidebarCollapsed,
    metadataCollapsed: typeof raw.metadataCollapsed === 'boolean' ? raw.metadataCollapsed : fallback.metadataCollapsed,
  }
}

export function loadAppShellState<T extends string>(
  appEntries: ReadonlyArray<AppLayoutDefinition<T>>,
): AppShellState<T> {
  const fallbackSelectedAppId = appEntries[0]?.id
  if (!fallbackSelectedAppId) {
    throw new Error('应用列表为空，无法初始化壳层状态')
  }

  const fallbackPanelStates = appEntries.reduce(
    (acc, entry) => {
      acc[entry.id] = { ...entry.layout }
      return acc
    },
    {} as Record<T, AppPanelState>,
  )

  try {
    const raw = window.localStorage.getItem(APP_SHELL_STORAGE_KEY)
    if (!raw) {
      return {
        activeView: 'home',
        selectedAppId: fallbackSelectedAppId,
        panelStates: fallbackPanelStates,
      }
    }

    const parsed = JSON.parse(raw) as Partial<AppShellState<string>>
    const selectedAppId = appEntries.some((entry) => entry.id === parsed.selectedAppId)
      ? (parsed.selectedAppId as T)
      : fallbackSelectedAppId
    const activeView: ShellViewMode = parsed.activeView === 'app' ? 'app' : 'home'
    const rawPanelStates = parsed.panelStates && typeof parsed.panelStates === 'object' ? parsed.panelStates : {}

    const panelStates = appEntries.reduce(
      (acc, entry) => {
        acc[entry.id] = normalizePanelState(
          (rawPanelStates as Record<string, unknown>)[entry.id],
          fallbackPanelStates[entry.id],
        )
        return acc
      },
      {} as Record<T, AppPanelState>,
    )

    return {
      activeView,
      selectedAppId,
      panelStates,
    }
  } catch {
    return {
      activeView: 'home',
      selectedAppId: fallbackSelectedAppId,
      panelStates: fallbackPanelStates,
    }
  }
}

export function persistAppShellState<T extends string>(state: AppShellState<T>): void {
  try {
    window.localStorage.setItem(APP_SHELL_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write failures
  }
}
