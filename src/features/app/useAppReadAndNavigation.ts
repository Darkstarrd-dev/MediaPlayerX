import { useAppNavigationState } from './useAppNavigationState'
import { useAppReadState } from './useAppReadState'
import type { useAppSettingsStore } from './useAppSettingsStore'
import type { useAppSessionState } from './useAppSessionState'
import type { useRepositoryBootstrapData } from './useRepositoryBootstrapData'
import type { useArchiveLoadStatus } from './useArchiveLoadStatus'
import type { useMediaState } from '../media/useMediaState'

interface UseAppReadAndNavigationParams {
  appSettings: ReturnType<typeof useAppSettingsStore>
  sessionState: ReturnType<typeof useAppSessionState>
  repositoryBootstrap: ReturnType<typeof useRepositoryBootstrapData>
  archiveLoadStatus: ReturnType<typeof useArchiveLoadStatus>
  mediaState: Pick<ReturnType<typeof useMediaState>, 'selectVideoFromBrowser' | 'fullscreenActive'>
}

export function useAppReadAndNavigation({
  appSettings,
  sessionState,
  repositoryBootstrap,
  archiveLoadStatus,
  mediaState,
}: UseAppReadAndNavigationParams) {
  const readState = useAppReadState({
    appSettings,
    sessionState,
    repositoryBootstrap,
  })

  const navigationState = useAppNavigationState({
    appSettings,
    sessionState,
    repositoryBootstrap,
    archiveLoadStatus,
    mediaState,
    readState,
  })

  return {
    ...readState,
    ...navigationState,
  }
}
