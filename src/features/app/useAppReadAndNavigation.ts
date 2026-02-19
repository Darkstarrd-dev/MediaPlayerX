import { useAppNavigationState } from './useAppNavigationState'
import { useAppReadState } from './useAppReadState'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { ArchiveLoadStatusResult } from './useArchiveLoadStatus'
import type { MediaStateResult } from '../media/useMediaState'

interface UseAppReadAndNavigationParams {
  appSettings: AppSettingsStoreSnapshot
  sessionState: AppSessionStateResult
  repositoryBootstrap: RepositoryBootstrapDataResult
  archiveLoadStatus: ArchiveLoadStatusResult
  mediaState: Pick<MediaStateResult, 'selectVideoFromBrowser' | 'fullscreenActive' | 'fullscreenDisplay' | 'fullscreenVideoFocus'>
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

export type AppReadAndNavigationResult = ReturnType<typeof useAppReadAndNavigation>
