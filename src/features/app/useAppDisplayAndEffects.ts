import { useAppDisplayResources } from './useAppDisplayResources'
import { useAppInteractionEffects } from './useAppInteractionEffects'
import { useAppManageBindings } from './useAppManageBindings'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import { useFullscreenPlaybackBindings } from './useFullscreenPlaybackBindings'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import { useVectorUniverseBindings } from './useVectorUniverseBindings'
import type { MediaStateResult } from '../media/useMediaState'
import type { UiBenchSettings } from '../perf/benchSettings'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

interface UseAppDisplayAndEffectsParams {
  appSettings: AppSettingsStoreSnapshot
  benchSettings: UiBenchSettings
  mediaRepository: RepositoryBootstrapDataResult['mediaRepository']
  sessionState: AppSessionStateResult
  mediaState: MediaStateResult
  readNavigationState: AppReadAndNavigationResult
}

export function useAppDisplayAndEffects({
  appSettings,
  benchSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
}: UseAppDisplayAndEffectsParams) {
  const {
    mode,
    autoPlayEnabled,
    vectorThreshold,
    vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance,
    vectorUniverseHelperScale,
    vectorUniverseDispersion,
    vectorUniverseWidgetSize,
    vectorControls,
    updateSettings,
  } = appSettings

  const {
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    vectorUniverseOpen,
    setVectorUniverseOpen,
    vectorSearchResults,
  } = sessionState

  const {
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    setFullscreenActive,
  } = mediaState

  const {
    searchPanelMode,
    setSearchPanelMode,
    featureSearchActive,
    vectorResultsActive,
    scopedImageSourcesEffective,
    packageByIdEffective,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    orderedRootScopedPackages,
    focusedRef,
    setImageFocus,
  } = readNavigationState

  const manageBindings = useAppManageBindings({
    appSettings,
    mediaRepository,
    sessionState,
    mediaState,
    readNavigationState,
  })

  const displayResources = useAppDisplayResources({
    appSettings,
    benchSettings,
    mediaRepository,
    sessionState,
    mediaState,
    readNavigationState,
    manageBindings,
  })

  const {
    videoShortcutActive,
    fullscreenAlignRequest,
    applyAutoplayIntervalByIndex,
    requestFullscreenAlign,
    setFullscreenActiveWithAutoStop,
  } = useFullscreenPlaybackBindings({
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    autoPlayEnabled,
    updateSettings,
    setFullscreenActive,
    autoPlayPresets: AUTO_PLAY_PRESETS,
  })

  const {
    runVectorSearch,
    goToFromSearchMode,
    vectorUniverseSectionProps,
  } = useVectorUniverseBindings({
    mode,
    focusedRef,
    allScopedRefs,
    packageById: packageByIdEffective,
    vectorThreshold,
    vectorSearchResults,
    vectorResultsActive,
    featureSearchActive,
    selectedSidebarNodeId,
    normalImageSourceNodeIdMap,
    orderedRootScopedPackages,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    setSearchPanelMode,
    vectorUniverseOpen,
    setVectorUniverseOpen,
    setImageFocus,
    updateSettings,
    scopedImageSourcesEffective,
    vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance,
    vectorUniverseDispersion,
    vectorUniverseHelperScale,
    vectorUniverseWidgetSize,
    vectorControls,
  })

  useAppInteractionEffects({
    appSettings,
    mediaRepository,
    sessionState,
    mediaState,
    readNavigationState,
    videoShortcutActive,
    requestFullscreenAlign,
    applyAutoplayIntervalByIndex,
    setFullscreenActiveWithAutoStop,
    applyPackageGrade: displayResources.metadataWriteBindings.applyPackageGrade,
  })

  return {
    ...manageBindings,
    ...displayResources,
    videoShortcutActive,
    fullscreenAlignRequest,
    applyAutoplayIntervalByIndex,
    requestFullscreenAlign,
    setFullscreenActiveWithAutoStop,
    runVectorSearch,
    goToFromSearchMode,
    vectorUniverseSectionProps,
  }
}

export type AppDisplayAndEffectsResult = ReturnType<typeof useAppDisplayAndEffects>
