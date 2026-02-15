import {
  buildImageMainSectionProps,
} from './buildImageMainSectionProps'
import type { BackendErrorRow } from './buildBackendErrorRows'
import { buildMainFooter } from './buildMainFooter'
import { buildManagementPanelProps } from './buildManagementPanelProps'
import { buildMetadataManagementPanelProps } from './buildMetadataManagementPanelProps'
import { buildMetadataPanelProps } from './buildMetadataPanelProps'
import { buildSearchPanelProps } from './buildSearchPanelProps'
import { buildSidebarPanelProps } from './buildSidebarPanelProps'
import { buildMusicMainSectionProps } from './buildMusicMainSectionProps'
import { buildVideoMainSectionProps } from './buildVideoMainSectionProps'
import {
  resolveMusicBookletPreviewRootNodeId,
  resolveMusicBookletState,
} from './workspaceMusicBooklet'
import { createMusicBookletBindingActions, createWorkspaceJumpActions } from './workspaceJumpActions'
import {
  collectAudioIdsBySidebarOrder,
  collectScopedAudioIdsByFolderNode,
  flattenExternalTagValues,
  normalizeFeatureTags,
  normalizeSeriesId,
  pickFirstBySeriesId,
} from './workspaceSharedUtils'
import { buildNodeBrowseItems, resolveRefsInPageForDisplay } from './workspaceImageDerivations'
import {
  createApplyMetadataSyncName,
  createSaveParsedMetadata,
} from './workspaceMetadataActions'
import { createAdReviewSettingHandlers } from './workspaceAdReviewHandlers'
import type { MusicBookletBindingsResult } from './useMusicBookletBindings'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { ManageAdReviewActionsResult } from './useManageAdReviewActions'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { WriteDataAccessResult } from '../backend'
import type { AudioItem, BrowserMode, FocusedImageRef, ImageItem, ImagePackage, MusicLoopMode, SidebarNode, VectorCandidate, VideoItem } from '../../types'
import type { UiBenchSettings } from '../perf/benchSettings'
import type { VideoFitMode } from '../media/videoFitMode'
import type {
  Dispatch,
  MouseEvent,
  RefObject,
  SetStateAction,
} from 'react'

interface UseAppWorkspacePropsParams {
  appSettings: AppSettingsStoreSnapshot
  benchSettings: UiBenchSettings
  mode: BrowserMode
  vectorMode: boolean
  manageMode: boolean
  metadataManageMode: boolean
  adReviewPanelOpen: boolean
  setAdReviewPanelOpen: Dispatch<SetStateAction<boolean>>
  adReviewFocusTaskId: string | null
  setAdReviewFocusTaskId: Dispatch<SetStateAction<string | null>>
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  workspaceBottomPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  vectorSearchResults: VectorCandidate[]
  scopedImageSourcesEffective: ImagePackage[]
  musicBookletImageSources: ImagePackage[]
  videosForSidebarCount: number
  audiosForSidebarCount: number
  audiosForSidebar: AudioItem[]
  focusedRef: FocusedImageRef | null
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  featureNameQuery: string
  setFeatureNameQuery: Dispatch<SetStateAction<string>>
  featureWorkTitleQuery: string
  setFeatureWorkTitleQuery: Dispatch<SetStateAction<string>>
  featureCircleQuery: string
  setFeatureCircleQuery: Dispatch<SetStateAction<string>>
  featureAuthorQuery: string
  setFeatureAuthorQuery: Dispatch<SetStateAction<string>>
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  applyQuickFeatureSearch: (patch: { workTitle?: string; seriesId?: string; circle?: string; author?: string; tag?: string }) => void
  featureTagPickerOpen: boolean
  setFeatureTagPickerOpen: Dispatch<SetStateAction<boolean>>
  featureTags: string[]
  setFeatureTags: Dispatch<SetStateAction<string[]>>
  featureGradeFilter: number | null
  setFeatureGradeFilter: Dispatch<SetStateAction<number | null>>
  onStartWorkspaceBottomPanelResize: (event: MouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
  currentRootLabel: string | null
  managementErrorRows: BackendErrorRow[]
  sidebarCheckedNodeIds: string[]
  imageCheckedIds: string[]
  activeSelectionScope: 'image' | 'sidebar' | null
  backendWrite: WriteDataAccessResult
  manageOperationHint: string | null
  requestManageDelete: () => void
  runManageHideAction: (hidden: boolean) => Promise<void>
  manageAdReview: ManageAdReviewActionsResult
  clearAllSelections: () => void
  vectorResultsActive: boolean
  showNamesOnly: boolean
  backendPageLoading: boolean
  pagedPageSize: number
  activePackageForDisplay: ImagePackage | null
  visibleImageRefs: FocusedImageRef[]
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  actualThumbnailGap: number
  normalizedPageIndexEffective: number
  imageTotalPagesEffective: number
  packageByIdEffective: Map<string, ImagePackage>
  thumbnailImageUrlById: Record<string, string>
  sourceCoverImageUrlBySourceId: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  onGridElementChange: (element: HTMLDivElement | null) => void
  imageCheckedIdSet: Set<string>
  setFullscreenActiveWithAutoStop: (value: boolean | ((previous: boolean) => boolean)) => void
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  toggleImageChecked: (imageId: string, checked?: boolean) => void
  replaceImageCheckedIds: (ids: string[], append?: boolean) => void
  goPrevPage: () => void
  goNextPage: () => void
  focusedVideoDurationSec: number
  focusedAudio: AudioItem | null
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  focusedVideoSrc: string | null
  focusedAudioSrc: string | null
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
  fullscreenActive: boolean
  focusedVideoCoverColor: string
  focusedVideoCoverImageSrc: string | null
  focusedVideoEffective: VideoItem | null
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  cycleVideoFitMode: () => void
  imageFocusActive: boolean
  metadataImageEffective: ImageItem | null
  metadataImageSrc: string | null
  metadataImagePackageEffective: ImagePackage | null
  currentGradeEffective: number | null
  metadataWriteBindings: MetadataWriteBindingsResult
  metadataTab: 'info' | 'playlist'
  playlistIds: string[]
  selectedVideoId: string
  selectedAudioId: string
  audioPlaylistIds: string[]
  musicLoopMode: MusicLoopMode
  musicPlayRequestNonce: number
  dragVideoId: string | null
  videoByIdEffective: Map<string, VideoItem>
  audioByIdEffective: Map<string, AudioItem>
  setMetadataTab: Dispatch<SetStateAction<'info' | 'playlist'>>
  selectVideoFromBrowser: (videoId: string) => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  setDragVideoId: Dispatch<SetStateAction<string | null>>
  sidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNodeId: string | null
  searchResultsMode: boolean
  canSetCurrentRoot: boolean
  normalImageSourceNodeIdMap: Map<string, string>
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  musicRootNodeId: string | null
  imageTreeForSidebar: SidebarNode[]
  videoTreeForSidebar: SidebarNode[]
  audioTreeForSidebar: SidebarNode[]
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  featureSearchActive: boolean
  searchResultsReadOnly: boolean
  sidebarCheckedNodeIdSet: Set<string>
  goToFromSearchMode: () => void
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  setMusicLoopMode: Dispatch<SetStateAction<MusicLoopMode>>
  collapseSidebar: () => void
  applyCurrentRootFromSelection: () => void
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void
  checkSidebarNode: (nodeId: string) => void
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>
  requestMusicPlay: () => void
  musicBookletBindings: MusicBookletBindingsResult
}

export function useAppWorkspaceProps({
  appSettings,
  benchSettings,
  mode,
  vectorMode,
  manageMode,
  metadataManageMode,
  adReviewPanelOpen,
  setAdReviewPanelOpen,
  adReviewFocusTaskId,
  setAdReviewFocusTaskId,
  searchPanelCollapsed,
  setSearchPanelCollapsed,
  workspaceBottomPanelHeight,
  vectorPanelRef,
  vectorPanelContentRef,
  vectorSearchResults,
  scopedImageSourcesEffective,
  musicBookletImageSources,
  videosForSidebarCount,
  audiosForSidebarCount,
  audiosForSidebar,
  focusedRef,
  focusedImage,
  focusedImagePackage,
  featureNameQuery,
  setFeatureNameQuery,
  featureWorkTitleQuery,
  setFeatureWorkTitleQuery,
  featureCircleQuery,
  setFeatureCircleQuery,
  featureAuthorQuery,
  setFeatureAuthorQuery,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  applyQuickFeatureSearch,
  featureTagPickerOpen,
  setFeatureTagPickerOpen,
  featureTags,
  setFeatureTags,
  featureGradeFilter,
  setFeatureGradeFilter,
  onStartWorkspaceBottomPanelResize,
  layoutLocked,
  currentRootLabel,
  managementErrorRows,
  sidebarCheckedNodeIds,
  imageCheckedIds,
  activeSelectionScope,
  backendWrite,
  manageOperationHint,
  requestManageDelete,
  runManageHideAction,
  manageAdReview,
  clearAllSelections,
  vectorResultsActive,
  showNamesOnly,
  backendPageLoading,
  pagedPageSize,
  activePackageForDisplay,
  visibleImageRefs,
  refsInPageEffective,
  pageStartEffective,
  actualCellWidth,
  actualMediaHeight,
  thumbnailColumns,
  actualThumbnailGap,
  normalizedPageIndexEffective,
  imageTotalPagesEffective,
  packageByIdEffective,
  thumbnailImageUrlById,
  sourceCoverImageUrlBySourceId,
  gridRef,
  onGridElementChange,
  imageCheckedIdSet,
  setFullscreenActiveWithAutoStop,
  setVectorFocusIndex,
  setImageFocus,
  toggleImageChecked,
  replaceImageCheckedIds,
  goPrevPage,
  goNextPage,
  focusedVideoDurationSec,
  focusedAudio,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  focusedVideoSrc,
  focusedAudioSrc,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  setSubtitleVisible,
  selectSubtitleById,
  fullscreenActive,
  focusedVideoCoverColor,
  focusedVideoCoverImageSrc,
  focusedVideoEffective,
  setVideoPlaying,
  goPlaylist,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  cycleVideoFitMode,
  imageFocusActive,
  metadataImageEffective,
  metadataImageSrc,
  metadataImagePackageEffective,
  currentGradeEffective,
  metadataWriteBindings,
  metadataTab,
  playlistIds,
  selectedVideoId,
  selectedAudioId,
  audioPlaylistIds,
  musicLoopMode,
  musicPlayRequestNonce,
  dragVideoId,
  videoByIdEffective,
  audioByIdEffective,
  setMetadataTab,
  selectVideoFromBrowser,
  setPlaylistIds,
  setDragVideoId,
  sidebarNodeById,
  selectedSidebarNodeId,
  searchResultsMode,
  canSetCurrentRoot,
  normalImageSourceNodeIdMap,
  imageRootNodeId,
  videoRootNodeId,
  musicRootNodeId,
  imageTreeForSidebar,
  videoTreeForSidebar,
  audioTreeForSidebar,
  imageNodeLoadStateById,
  selectedPackageId,
  featureSearchActive,
  searchResultsReadOnly,
  sidebarCheckedNodeIdSet,
  goToFromSearchMode,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  setSelectedAudioId,
  setMusicLoopMode,
  collapseSidebar,
  applyCurrentRootFromSelection,
  toggleSidebarNodeChecked,
  checkSidebarNode,
  setAudioPlaylistIds,
  requestMusicPlay,
  musicBookletBindings,
}: UseAppWorkspacePropsParams) {
  /**
   * Workspace 层只做视图模型组装：
   * - 输入是上游状态层已收敛的读写能力；
   * - 输出是 Sidebar/Main/Metadata 的稳定 props。
   */
  const featureTagOptionsEffective = Array.from(
    new Set(
      normalizeFeatureTags(
        mode === 'image'
          ? scopedImageSourcesEffective.flatMap((source) => [
              ...source.tags,
              ...flattenExternalTagValues(source.externalMetadata?.tags ?? {}),
            ])
          : featureTagOptions,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'))

  const sidebarPanelProps = buildSidebarPanelProps({
    mode,
    sidebarFocus: appSettings.sidebarFocus,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    currentRootLabel,
    searchResultsMode,
    selectedSidebarNodeId,
    canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    musicRootNodeId,
    imageTreeNodes: imageTreeForSidebar,
    videoTreeNodes: videoTreeForSidebar,
    audioTreeNodes: audioTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    selectedVideoId,
    selectedAudioId,
    vectorResultsActive,
    featureSearchActive,
    searchResultsReadOnly,
    manageMode,
    metadataManageMode,
    checkedSidebarNodeIdSet: sidebarCheckedNodeIdSet,
    focusedRef,
    playlistIds,
    goToFromSearchMode,
    setSelectedSidebarNodeId,
    updateSettings: appSettings.updateSettings,
    setSelectedPackageId,
    selectVideoFromBrowser,
    setSelectedAudioId,
    collapseSidebar,
    applyCurrentRootFromSelection,
    setPlaylistIds,
    audioPlaylistIds,
    setAudioPlaylistIds,
    onToggleManageNode: toggleSidebarNodeChecked,
    onCheckManageNode: checkSidebarNode,
  })

  const searchPanelProps = buildSearchPanelProps({
    vectorMode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    featureResultCount:
      mode === 'video' ? videosForSidebarCount : mode === 'music' ? audiosForSidebarCount : scopedImageSourcesEffective.length,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
  })

  const managementPanelProps = buildManagementPanelProps({
    mode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pending: backendWrite.pending.manage,
    operationHint: manageOperationHint,
    errorRows: managementErrorRows,
    onDelete: requestManageDelete,
    onHide: () => {
      void runManageHideAction(true)
    },
    onUnhide: () => {
      void runManageHideAction(false)
    },
    onClearSelection: clearAllSelections,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPending: manageAdReview.pending,
    adReviewTask: manageAdReview.task,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: () => {
      void manageAdReview.startManageAdReview()
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview()
    },
    onToggleHideUncheckedNonChecked: manageAdReview.toggleHideUncheckedNonChecked,
    ...createAdReviewSettingHandlers({ updateSettings: appSettings.updateSettings }),
    onDismissAdReviewTask: manageAdReview.dismissTask,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
  })

  const applyMetadataSyncName = createApplyMetadataSyncName({
    mode,
    metadataWriteBindings,
    metadataImagePackageEffective,
  })

  const saveParsedMetadata = createSaveParsedMetadata({
    mode,
    metadataWriteBindings,
    metadataImagePackageEffective,
  })

  const metadataManagementPanelProps = buildMetadataManagementPanelProps({
    metadataManageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    metadataPending: metadataWriteBindings.metadataPending,
    operationHint: manageOperationHint,
    onSyncName: applyMetadataSyncName,
    onSaveParsedMetadata: saveParsedMetadata,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
    targetPackageName: metadataImagePackageEffective?.packageName ?? '',
    targetPackageLabel: metadataImagePackageEffective?.displayName ?? '-',
    proxyServer: appSettings.proxyServer,
    ehentaiCookies: appSettings.ehentaiCookies,
  })

  const enableLoadingSkeleton = benchSettings.enabled ? benchSettings.imageLoadingSkeleton.mode === 'replace' : true

  const selectedSidebarNode = selectedSidebarNodeId ? sidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const audioSidebarOrderedIds = collectAudioIdsBySidebarOrder(audioTreeForSidebar, audiosForSidebar)
  const metadataMusicPlaylistIds = collectScopedAudioIdsByFolderNode({
    selectedSidebarNode,
    audiosForSidebar,
    audioSidebarOrderedIds,
  })
  const nodeBrowseMode =
    mode === 'image' &&
    !vectorResultsActive &&
    !metadataManageMode &&
    Boolean(selectedSidebarNode && selectedSidebarNode.imageNodeType === 'folder' && selectedSidebarNode.children.length > 0)

  const nodeBrowseItems = buildNodeBrowseItems({
    nodeBrowseMode,
    selectedSidebarNode,
    packageByIdEffective,
    sourceCoverImageUrlBySourceId,
    thumbnailImageUrlById,
  })

  const refsInPageForDisplay = resolveRefsInPageForDisplay(refsInPageEffective, {
    manageMode,
    hideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    imageCheckedIdSet,
    packageByIdEffective,
  })

  const adReviewScopeImageIdSet = new Set(manageAdReview.scopeImageIds)
  const adReviewLlmReviewedImageIdSet = new Set(manageAdReview.llmReviewedImageIds)
  const adReviewNonLlmReviewedImageIdSet = new Set(manageAdReview.nonLlmReviewedImageIds)

  const imageSeriesId = normalizeSeriesId(metadataImagePackageEffective?.seriesId)
  const videoSeriesId = normalizeSeriesId(focusedVideoEffective?.seriesId)
  const audioSeriesId = normalizeSeriesId(focusedAudio?.seriesId)
  const jumpTargetVideo = pickFirstBySeriesId(videoByIdEffective.values(), imageSeriesId)
  const jumpTargetImage = pickFirstBySeriesId(packageByIdEffective.values(), videoSeriesId)
  const jumpTargetImageFromAudio = pickFirstBySeriesId(packageByIdEffective.values(), audioSeriesId)
  const jumpTargetVideoFromAudio = pickFirstBySeriesId(videoByIdEffective.values(), audioSeriesId)
  const musicBookletState = resolveMusicBookletState({
    focusedAudio,
    imageSources: musicBookletImageSources,
    musicImportDirectories: musicBookletBindings.musicImportDirectories,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
  })
  const openMusicCoverSourceId = metadataManageMode
    ? musicBookletState.effectiveCoverSourceId
    : musicBookletState.effectiveCoverSourceId ?? musicBookletState.autoCoverSourceId
  const openMusicBookletSourceId = metadataManageMode
    ? musicBookletState.effectiveBookletSourceId ?? musicBookletState.effectiveCoverSourceId
    :
        musicBookletState.effectiveBookletSourceId ??
        musicBookletState.effectiveCoverSourceId ??
        musicBookletState.autoBookletSourceId ??
        musicBookletState.autoCoverSourceId
  const musicBookletPreviewRootNodeId = resolveMusicBookletPreviewRootNodeId({
    candidateSourceIds: musicBookletState.candidates.map((candidate) => candidate.sourceId),
    imageSourceNodeIdMap: normalImageSourceNodeIdMap,
  })

  const {
    jumpToAnimation,
    jumpToManga,
    jumpMusicToManga,
    jumpMusicToAnimation,
    jumpMusicToCover,
    jumpMusicToBooklet,
  } = createWorkspaceJumpActions({
    applyQuickFeatureSearch: (patch) => applyQuickFeatureSearch(patch),
    updateSettings: (patch) => appSettings.updateSettings(patch),
    setMetadataTab,
    setSelectedPackageId,
    selectVideoFromBrowser,
    jumpTargetVideoId: jumpTargetVideo?.id ?? null,
    jumpTargetImageId: jumpTargetImage?.id ?? null,
    jumpTargetImageFromAudioId: jumpTargetImageFromAudio?.id ?? null,
    jumpTargetVideoFromAudioId: jumpTargetVideoFromAudio?.id ?? null,
    imageSeriesId,
    videoSeriesId,
    audioSeriesId,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    musicBookletPreviewRootNodeId,
  })

  const { updateMusicCoverBinding, updateMusicBookletBinding } = createMusicBookletBindingActions({
    albumRootPath: musicBookletState.albumRootPath,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
    resetBindingOverride: musicBookletBindings.resetBindingOverride,
    setBindingOverride: musicBookletBindings.setBindingOverride,
  })

  const imageMainSectionProps = buildImageMainSectionProps({
    vectorResultsActive,
    showNamesOnly,
    metadataManageMode,
    backendPageLoading,
    pagedPageSize,
    enableLoadingSkeleton,
    activePackageForDisplay,
    focusedRef,
    focusedImageExists: Boolean(focusedImage),
    visibleImageRefs,
    refsInPageEffective: refsInPageForDisplay,
    pageStartEffective,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    actualThumbnailGap,
    vectorSearchResults,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
    onGridElementChange,
    manageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageHide: mode === 'image' && imageCheckedIds.length > 0,
    canManageUnhide: mode === 'image' && imageCheckedIds.length > 0,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    checkedImageIdSet: imageCheckedIdSet,
    adReviewScopeImageIdSet,
    adReviewLlmReviewedImageIdSet,
    adReviewNonLlmReviewedImageIdSet,
    updateSettings: appSettings.updateSettings,
    setFullscreenActiveWithAutoStop,
    setVectorFocusIndex,
    setImageFocus,
    canJumpToAnimation: Boolean(jumpTargetVideo),
    onJumpToAnimation: jumpToAnimation,
    metadataPending: metadataWriteBindings.metadataPending,
    metadataTargetPackageLabel: metadataImagePackageEffective?.displayName ?? '-',
    metadataFetchDefaultText: metadataManagementPanelProps.defaultFetchText,
    metadataProxyServer: appSettings.proxyServer,
    metadataEhentaiCookies: appSettings.ehentaiCookies,
    onMetadataSyncName: applyMetadataSyncName,
    onMetadataSaveParsed: saveParsedMetadata,
    onToggleImageChecked: toggleImageChecked,
    onReplaceCheckedImages: replaceImageCheckedIds,
    onManageDelete: requestManageDelete,
    onManageHide: () => {
      void runManageHideAction(true)
    },
    onManageUnhide: () => {
      void runManageHideAction(false)
    },
    onToggleAdReviewPanel: () => setAdReviewPanelOpen((value) => !value),
    onClearManageSelection: clearAllSelections,
    nodeBrowseMode,
    nodeBrowseLabel: nodeBrowseMode ? (selectedSidebarNode?.label ?? '节点浏览') : '',
    nodeBrowseItems,
    onSelectNodeBrowseItem: (nodeId, imageSourceId) => {
      setSelectedSidebarNodeId(nodeId)
      if (imageSourceId) {
        setSelectedPackageId(imageSourceId)
      }
    },
  })

  const videoMainSectionProps = buildVideoMainSectionProps({
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageHide: mode === 'image' && imageCheckedIds.length > 0,
    canManageUnhide: mode === 'image' && imageCheckedIds.length > 0,
    onManageDelete: requestManageDelete,
    onManageHide: () => {
      void runManageHideAction(true)
    },
    onManageUnhide: () => {
      void runManageHideAction(false)
    },
    onClearManageSelection: clearAllSelections,
    durationSec: focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoSourceUrl: focusedVideoSrc,
    subtitleTrackUrl,
    subtitleVisible,
    subtitleLoading,
    subtitleMessage,
    subtitleOptions,
    selectedSubtitleId,
    setSubtitleVisible,
    selectSubtitleById,
    fullscreenActive,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedVideo: focusedVideoEffective,
    setVideoPlaying,
    canJumpToManga: Boolean(jumpTargetImage),
    onJumpToManga: jumpToManga,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoFitMode,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
    metadataPending: metadataWriteBindings.metadataPending,
    onMetadataSyncName: applyMetadataSyncName,
  })

  const musicMainSectionProps = buildMusicMainSectionProps({
    mode,
    fullscreenActive,
    videoPlaying,
    playRequestNonce: musicPlayRequestNonce,
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    onManageDelete: requestManageDelete,
    onClearManageSelection: clearAllSelections,
    canJumpToManga: Boolean(jumpTargetImageFromAudio),
    canJumpToAnimation: Boolean(jumpTargetVideoFromAudio),
    canJumpToBooklet: Boolean(openMusicBookletSourceId),
    onJumpToManga: jumpMusicToManga,
    onJumpToAnimation: jumpMusicToAnimation,
    onJumpToBooklet: jumpMusicToBooklet,
    audiosForSidebar,
    audioSidebarOrderedIds,
    focusedAudio,
    focusedAudioSrc,
    selectedAudioId,
    musicLoopMode,
    audioByIdEffective,
    setSelectedAudioId,
    setMusicLoopMode,
    setFullscreenActiveWithAutoStop,
    musicVisualizerSelectedShaderId: appSettings.musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx: appSettings.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: appSettings.musicVisualizerFpsCap,
    musicVisualizerToneMapMode: appSettings.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: appSettings.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: appSettings.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: appSettings.musicVisualizerShowFps,
    musicVisualizerRenderer: appSettings.musicVisualizerRenderer,
    musicVisualizerShaderSettingsById: appSettings.musicVisualizerShaderSettingsById,
    updateSettings: appSettings.updateSettings,
  })

  const applyMetadataFeatureSearch = (patch: {
    workTitle?: string
    circle?: string
    author?: string
    tag?: string
  }) => {
    applyQuickFeatureSearch(patch)
  }

  const metadataPanelProps = buildMetadataPanelProps({
    mode,
    manageMode,
    searchModeActive: vectorMode && !manageMode && !metadataManageMode,
    featureResultCount:
      mode === 'video' ? videosForSidebarCount : mode === 'music' ? audiosForSidebarCount : scopedImageSourcesEffective.length,
    featureNameQuery,
    onFeatureNameQueryChange: setFeatureNameQuery,
    featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: setFeatureWorkTitleQuery,
    featureCircleQuery,
    onFeatureCircleQueryChange: setFeatureCircleQuery,
    featureAuthorQuery,
    onFeatureAuthorQueryChange: setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    onToggleFeatureTagPicker: () => setFeatureTagPickerOpen((value) => !value),
    featureTags,
    onSetFeatureTags: (tags) => {
      const normalized = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
      setFeatureTags(normalized)
    },
    onClearFeatureTags: () => setFeatureTags([]),
    featureGradeFilter,
    onFeatureGradeFilterChange: setFeatureGradeFilter,
    adReviewFeatureVisible: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    canExecuteAdReview: (activeSelectionScope === 'sidebar' && sidebarCheckedNodeIds.length > 0) || imageCheckedIds.length > 0,
    adReviewPending: manageAdReview.pending,
    adReviewTask: manageAdReview.task,
    adReviewQueueTasks: manageAdReview.queueTasks,
    adReviewActiveTaskId: manageAdReview.activeTaskId,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    adReviewFocusTaskId,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: () => {
      void manageAdReview.startManageAdReview()
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview()
    },
    onToggleHideUncheckedNonChecked: manageAdReview.toggleHideUncheckedNonChecked,
    onSelectAdReviewTask: manageAdReview.selectTask,
    onRemoveAdReviewTask: (taskId) => {
      void manageAdReview.removeTask(taskId)
    },
    onToggleAdReviewFocus: () => {
      const currentTask = manageAdReview.task
      if (!currentTask || currentTask.status !== 'review') {
        setAdReviewFocusTaskId(null)
        return
      }

      setAdReviewFocusTaskId((previous) => (previous === currentTask.task_id ? null : currentTask.task_id))
    },
    ...createAdReviewSettingHandlers({ updateSettings: appSettings.updateSettings }),
    onDismissAdReviewTask: manageAdReview.dismissTask,
    metadataCollapsed: appSettings.metadataCollapsed,
    metadataRatio: appSettings.metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    currentVideoGrade: focusedVideoEffective?.grade ?? null,
    metadataPending: metadataWriteBindings.metadataPending,
    editable: metadataManageMode,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    audioPlaylistIds: metadataMusicPlaylistIds,
    selectedAudioId,
    audioById: audioByIdEffective,
    musicBookletAlbumRootPath: musicBookletState.albumRootPath,
    musicBookletCandidates: musicBookletState.candidates.map((candidate) => ({
      sourceId: candidate.sourceId,
      label: candidate.label,
      imageCount: candidate.imageCount,
    })),
    musicCoverBindingValue: musicBookletState.coverBindingValue,
    musicBookletBindingValue: musicBookletState.bookletBindingValue,
    canOpenMusicCover: Boolean(openMusicCoverSourceId),
    canOpenMusicBooklet: Boolean(openMusicBookletSourceId),
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoById: videoByIdEffective,
    updateSettings: appSettings.updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSavePackageParsedMetadata: saveParsedMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
    onSaveAudioMetadata: metadataWriteBindings.applyAudioMetadata,
    onSearchByWorkTitle: (value) => {
      applyMetadataFeatureSearch({ workTitle: value })
    },
    onSearchByCircle: (value) => {
      applyMetadataFeatureSearch({ circle: value })
    },
    onSearchByAuthor: (value) => {
      applyMetadataFeatureSearch({ author: value })
    },
    onSearchByTag: (value) => {
      applyMetadataFeatureSearch({ tag: value })
    },
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: selectVideoFromBrowser,
    onSelectAudio: (audioId) => {
      setSelectedAudioId(audioId)
      appSettings.updateSettings({ sidebarFocus: 'main' })
    },
    onSelectAudioAndPlay: (audioId) => {
      setSelectedAudioId(audioId)
      requestMusicPlay()
      appSettings.updateSettings({ sidebarFocus: 'main' })
    },
    onMusicCoverBindingChange: updateMusicCoverBinding,
    onMusicBookletBindingChange: updateMusicBookletBinding,
    onOpenMusicCover: jumpMusicToCover,
    onOpenMusicBooklet: jumpMusicToBooklet,
    onResetMusicBookletBinding: () => {
      if (!musicBookletState.albumRootPath) {
        return
      }
      musicBookletBindings.resetBindingOverride(musicBookletState.albumRootPath)
    },
    setPlaylistIds,
    setDragVideoId,
  })

  const mainFooter = buildMainFooter({
    mode,
    focusedImage,
    focusedImagePackage,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    sidebarFocusedPath: selectedSidebarNodeId ? (sidebarNodeById.get(selectedSidebarNodeId)?.pathKey ?? null) : null,
    nodeBrowseMode,
    normalizedPageIndex: normalizedPageIndexEffective,
    imageTotalPages: imageTotalPagesEffective,
    onPrevPage: goPrevPage,
    onNextPage: goNextPage,
  })

  return {
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    musicMainSectionProps,
    metadataPanelProps,
    mainFooter,
  }
}

export type AppWorkspacePropsResult = ReturnType<typeof useAppWorkspaceProps>
