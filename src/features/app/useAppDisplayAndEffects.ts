import { useAppDisplayResources } from './useAppDisplayResources'
import { useAppInteractionEffects } from './useAppInteractionEffects'
import { useAppManageBindings } from './useAppManageBindings'
import { useSearchAndVectorActions } from './useSearchAndVectorActions'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import { useFullscreenPlaybackBindings } from './useFullscreenPlaybackBindings'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
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
    updateSettings,
  } = appSettings

  const {
    selectedSidebarNodeId,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
  } = sessionState

  const {
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    setFullscreenActive,
  } = mediaState

  const {
    setSearchPanelMode,
    featureSearchActive,
    quickFeatureSearchActive,
    clearQuickFeatureSearch,
    vectorResultsActive,
    packageByIdEffective,
    allScopedRefs,
    normalImageSourceNodeIdMap,
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
    videoShortcutActive: fullscreenVideoShortcutActive,
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

  const videoShortcutActive = mode === 'video' || fullscreenVideoShortcutActive

  const {
    runVectorSearch,
    goToFromSearchMode,
  } = useSearchAndVectorActions({
    mode,
    focusedRef,
    allScopedRefs,
    packageById: packageByIdEffective,
    vectorThreshold,
    vectorResultsActive,
    featureSearchActive,
    quickFeatureSearchActive,
    selectedSidebarNodeId,
    normalImageSourceNodeIdMap,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    setSearchPanelMode,
    setImageFocus,
    clearQuickFeatureSearch,
    updateSettings,
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
    applyVideoGrade: (grade) => {
      displayResources.metadataWriteBindings.applyVideoMetadata({ grade })
    },
    adReviewDeletePending: manageBindings.manageAdReview.deletePending,
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
  }
}

export type AppDisplayAndEffectsResult = ReturnType<typeof useAppDisplayAndEffects>
