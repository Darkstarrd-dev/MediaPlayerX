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
import { buildVideoMainSectionProps } from './buildVideoMainSectionProps'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { ManageAdReviewActionsResult } from './useManageAdReviewActions'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { WriteDataAccessResult } from '../backend'
import type { BrowserMode, FocusedImageRef, ImageItem, ImagePackage, SidebarNode, VectorCandidate, VideoItem } from '../../types'
import type { UiBenchSettings } from '../perf/benchSettings'
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
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  vectorPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  vectorSearchResults: VectorCandidate[]
  scopedImageSourcesEffective: ImagePackage[]
  videosForSidebarCount: number
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
  applyQuickFeatureSearch: (patch: { workTitle?: string; circle?: string; author?: string; tag?: string }) => void
  featureTagPickerOpen: boolean
  setFeatureTagPickerOpen: Dispatch<SetStateAction<boolean>>
  featureTags: string[]
  setFeatureTags: Dispatch<SetStateAction<string[]>>
  featureGradeFilter: number | null
  setFeatureGradeFilter: Dispatch<SetStateAction<number | null>>
  onStartVectorPanelResize: (event: MouseEvent<HTMLDivElement>) => void
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
  imageCheckedIdSet: Set<string>
  setFullscreenActiveWithAutoStop: (value: boolean | ((previous: boolean) => boolean)) => void
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  toggleImageChecked: (imageId: string, checked?: boolean) => void
  replaceImageCheckedIds: (ids: string[], append?: boolean) => void
  goPrevPage: () => void
  goNextPage: () => void
  focusedVideoDurationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  focusedVideoSrc: string | null
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
  imageFocusActive: boolean
  metadataImageEffective: ImageItem | null
  metadataImageSrc: string | null
  metadataImagePackageEffective: ImagePackage | null
  currentGradeEffective: number | null
  metadataWriteBindings: MetadataWriteBindingsResult
  metadataTab: 'info' | 'playlist'
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoByIdEffective: Map<string, VideoItem>
  setMetadataTab: Dispatch<SetStateAction<'info' | 'playlist'>>
  selectVideoFromBrowser: (videoId: string) => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  setDragVideoId: Dispatch<SetStateAction<string | null>>
  sidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNodeId: string | null
  searchResultsMode: boolean
  canSetCurrentRoot: boolean
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  imageTreeForSidebar: SidebarNode[]
  videoTreeForSidebar: SidebarNode[]
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  featureSearchActive: boolean
  searchResultsReadOnly: boolean
  sidebarCheckedNodeIdSet: Set<string>
  goToFromSearchMode: () => void
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  collapseSidebar: () => void
  applyCurrentRootFromSelection: () => void
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void
}

function normalizeFeatureTags(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(/[\n,，;；|/]+/g))
    .map((value) => value.trim())
    .filter(Boolean)
}

function flattenExternalTags(value: Record<string, string>): string[] {
  const tags: string[] = []
  for (const [namespace, raw] of Object.entries(value)) {
    const normalizedNamespace = namespace.trim()
    if (!normalizedNamespace) {
      continue
    }
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    for (const part of parts) {
      tags.push(`${normalizedNamespace}:${part}`)
    }
  }
  return Array.from(new Set(tags))
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
  searchPanelCollapsed,
  setSearchPanelCollapsed,
  vectorPanelHeight,
  vectorPanelRef,
  vectorPanelContentRef,
  vectorSearchResults,
  scopedImageSourcesEffective,
  videosForSidebarCount,
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
  onStartVectorPanelResize,
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
  imageCheckedIdSet,
  setFullscreenActiveWithAutoStop,
  setVectorFocusIndex,
  setImageFocus,
  toggleImageChecked,
  replaceImageCheckedIds,
  goPrevPage,
  goNextPage,
  focusedVideoDurationSec,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  focusedVideoSrc,
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
  imageFocusActive,
  metadataImageEffective,
  metadataImageSrc,
  metadataImagePackageEffective,
  currentGradeEffective,
  metadataWriteBindings,
  metadataTab,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoByIdEffective,
  setMetadataTab,
  selectVideoFromBrowser,
  setPlaylistIds,
  setDragVideoId,
  sidebarNodeById,
  selectedSidebarNodeId,
  searchResultsMode,
  canSetCurrentRoot,
  imageRootNodeId,
  videoRootNodeId,
  imageTreeForSidebar,
  videoTreeForSidebar,
  imageNodeLoadStateById,
  selectedPackageId,
  featureSearchActive,
  searchResultsReadOnly,
  sidebarCheckedNodeIdSet,
  goToFromSearchMode,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  collapseSidebar,
  applyCurrentRootFromSelection,
  toggleSidebarNodeChecked,
}: UseAppWorkspacePropsParams) {
  /**
   * Workspace 层只做视图模型组装：
   * - 输入是上游状态层已收敛的读写能力；
   * - 输出是 Sidebar/Main/Metadata 的稳定 props。
   */
  const featureTagOptionsEffective = Array.from(
    new Set(
      normalizeFeatureTags(
        mode === 'image' ? scopedImageSourcesEffective.flatMap((source) => source.tags) : featureTagOptions,
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
    imageTreeNodes: imageTreeForSidebar,
    videoTreeNodes: videoTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    selectedVideoId,
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
    collapseSidebar,
    applyCurrentRootFromSelection,
    setPlaylistIds,
    onToggleManageNode: toggleSidebarNodeChecked,
  })

  const searchPanelProps = buildSearchPanelProps({
    vectorMode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    vectorPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    featureResultCount: mode === 'video' ? videosForSidebarCount : scopedImageSourcesEffective.length,
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
    onStartVectorPanelResize,
    layoutLocked,
  })

  const managementPanelProps = buildManagementPanelProps({
    mode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    vectorPanelHeight,
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
    onAdReviewStrategyModeChange: (value) => {
      appSettings.updateSettings({ adReviewStrategyMode: value })
    },
    onAdReviewMaxConcurrencyChange: (value) => {
      appSettings.updateSettings({
        adReviewMaxConcurrency: Math.max(4, Math.min(12, Math.floor(value))),
      })
    },
    onAdReviewHeadNChange: (value) => {
      appSettings.updateSettings({
        adReviewHeadN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailNChange: (value) => {
      appSettings.updateSettings({
        adReviewTailN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailStopCleanStreakChange: (value) => {
      appSettings.updateSettings({
        adReviewTailStopCleanStreak: Math.max(1, Math.min(200, Math.floor(value))),
      })
    },
    onDismissAdReviewTask: manageAdReview.dismissTask,
    onStartVectorPanelResize,
    layoutLocked,
  })

  const metadataManagementPanelProps = buildMetadataManagementPanelProps({
    metadataManageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    vectorPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    metadataPending: metadataWriteBindings.metadataPending,
    operationHint: manageOperationHint,
    onSyncName: () => {
      if (mode === 'image') {
        metadataWriteBindings.applyPackageSyncName()
        return
      }
      metadataWriteBindings.applyVideoSyncName()
    },
    onSaveParsedMetadata: async (parsed) => {
      if (mode !== 'image') {
        throw new Error('当前模式不支持写入图包元数据')
      }
      const packageId = metadataImagePackageEffective?.id
      if (!packageId) {
        throw new Error('当前无可用图包，无法保存')
      }
      await metadataWriteBindings.applyPackageMetadataById(packageId, {
        workTitle: parsed.title,
        circle: parsed.group,
        author: parsed.artist,
        tags: flattenExternalTags(parsed.tags),
      })
      await metadataWriteBindings.applyPackageExternalMetadataById(packageId, {
        sourceSite: parsed.source.site,
        sourceUrl: parsed.source.url,
        sourceRemoteId: parsed.source.id,
        sourceToken: parsed.source.token,
        title: parsed.title,
        titleJpn: parsed.title_jpn,
        group: parsed.group,
        groupJpn: parsed.group_jpn,
        artist: parsed.artist,
        artistJpn: parsed.artist_jpn,
        posted: parsed.posted,
        rating: parsed.rating,
        favorited: parsed.favorited,
        thumbUrl: parsed.thumb,
        tags: parsed.tags,
        rawJson: JSON.stringify(parsed),
      })
    },
    onStartVectorPanelResize,
    layoutLocked,
    targetPackageName: metadataImagePackageEffective?.packageName ?? '',
    targetPackageLabel: metadataImagePackageEffective?.displayName ?? '-',
    proxyServer: appSettings.proxyServer,
  })

  const enableLoadingSkeleton = benchSettings.enabled ? benchSettings.imageLoadingSkeleton.mode === 'replace' : true

  const selectedSidebarNode = selectedSidebarNodeId ? sidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const nodeBrowseMode =
    mode === 'image' &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !manageMode &&
    Boolean(selectedSidebarNode && selectedSidebarNode.imageNodeType === 'folder' && selectedSidebarNode.children.length > 0)

  const resolveNodePreviewSourceId = (node: SidebarNode): string | null => {
    if (node.imageSourceId) {
      return node.imageSourceId
    }
    for (const child of node.children) {
      const found = resolveNodePreviewSourceId(child)
      if (found) {
        return found
      }
    }
    return null
  }

  const nodeBrowseItems = nodeBrowseMode
    ? (selectedSidebarNode?.children ?? []).map((child) => {
        const previewSourceId = resolveNodePreviewSourceId(child)
        const previewSource = previewSourceId ? packageByIdEffective.get(previewSourceId) : null
        const fallbackImageId = previewSource?.images[0]?.id
        const coverImageUrl =
          (previewSourceId ? sourceCoverImageUrlBySourceId[previewSourceId] : null) ??
          (fallbackImageId ? thumbnailImageUrlById[fallbackImageId] ?? null : null)

        return {
          nodeId: child.id,
          imageSourceId: child.imageSourceId,
          label: child.label,
          packageCount: child.descendantPackageCount ?? (child.imageNodeType === 'package' ? 1 : 0),
          imageCount: child.descendantImageCount ?? child.directImageCount ?? 0,
          coverImageUrl,
        }
      })
    : []

  const refsInPageForDisplay =
    manageMode && manageAdReview.hideUncheckedNonChecked
      ? refsInPageEffective.filter((ref) => {
          const imageId = packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]?.id
          return Boolean(imageId && imageCheckedIdSet.has(imageId))
        })
      : refsInPageEffective

  const adReviewScopeImageIdSet = new Set(manageAdReview.scopeImageIds)
  const adReviewLlmReviewedImageIdSet = new Set(manageAdReview.llmReviewedImageIds)
  const adReviewNonLlmReviewedImageIdSet = new Set(manageAdReview.nonLlmReviewedImageIds)

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
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
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
    goPrevPage,
    goNextPage,
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
    videoSourceUrl: focusedVideoSrc,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
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
    featureResultCount: mode === 'video' ? videosForSidebarCount : scopedImageSourcesEffective.length,
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
    onAdReviewStrategyModeChange: (value) => {
      appSettings.updateSettings({ adReviewStrategyMode: value })
    },
    onAdReviewMaxConcurrencyChange: (value) => {
      appSettings.updateSettings({
        adReviewMaxConcurrency: Math.max(4, Math.min(12, Math.floor(value))),
      })
    },
    onAdReviewHeadNChange: (value) => {
      appSettings.updateSettings({
        adReviewHeadN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailNChange: (value) => {
      appSettings.updateSettings({
        adReviewTailN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailStopCleanStreakChange: (value) => {
      appSettings.updateSettings({
        adReviewTailStopCleanStreak: Math.max(1, Math.min(200, Math.floor(value))),
      })
    },
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
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoVolume,
    videoMuted,
    videoRate,
    videoById: videoByIdEffective,
    updateSettings: appSettings.updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
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
    setPlaylistIds,
    setDragVideoId,
  })

  const mainFooter = buildMainFooter({
    mode,
    focusedImage,
    focusedImagePackage,
    focusedVideo: focusedVideoEffective,
    sidebarFocusedPath: selectedSidebarNodeId ? (sidebarNodeById.get(selectedSidebarNodeId)?.pathKey ?? null) : null,
  })

  return {
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    metadataManagementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    metadataPanelProps,
    mainFooter,
  }
}

export type AppWorkspacePropsResult = ReturnType<typeof useAppWorkspaceProps>
