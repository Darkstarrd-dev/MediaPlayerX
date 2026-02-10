import { useAppDisplayAndEffects } from './useAppDisplayAndEffects'
import { useAppReadAndNavigation } from './useAppReadAndNavigation'
import { useAppRuntimeSources } from './useAppRuntimeSources'
import { useAppViewComposition } from './useAppViewComposition'
import { useResponsiveZoomEffect } from './useResponsiveZoomEffect'

export function useAppDataPipeline() {
  const runtimeSources = useAppRuntimeSources()

  useResponsiveZoomEffect()

  const readNavigationState = useAppReadAndNavigation({
    appSettings: runtimeSources.appSettings,
    sessionState: runtimeSources.sessionState,
    repositoryBootstrap: runtimeSources.repositoryBootstrap,
    archiveLoadStatus: runtimeSources.archiveLoadStatus,
    mediaState: runtimeSources.mediaState,
  })

  const displayState = useAppDisplayAndEffects({
    appSettings: runtimeSources.appSettings,
    benchSettings: runtimeSources.benchSettings,
    mediaRepository: runtimeSources.repositoryBootstrap.mediaRepository,
    sessionState: runtimeSources.sessionState,
    mediaState: runtimeSources.mediaState,
    readNavigationState,
  })

  return useAppViewComposition({
    runtimeSources,
    readNavigationState,
    displayState,
  })
}
