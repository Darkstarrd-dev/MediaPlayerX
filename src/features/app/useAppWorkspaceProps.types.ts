import type { Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { BackendErrorRow } from './buildBackendErrorRows'
import type { ManageAdReviewActionsResult } from './useManageAdReviewActions'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { MusicBookletBindingsResult } from './useMusicBookletBindings'
import type { WriteDataAccessResult } from '../backend'
import type {
  AudioItem,
  BrowserMode,
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MusicLoopMode,
  SidebarNode,
  VectorCandidate,
  VideoItem,
} from '../../types'
import type { VideoFitMode } from '../media/videoFitMode'
import type { UiBenchSettings } from '../perf/benchSettings'

export interface UseAppWorkspacePropsParams {
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
  adReviewPageIndex: number
  setAdReviewPageIndex: Dispatch<SetStateAction<number>>
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
  applyQuickFeatureSearch: (patch: {
    workTitle?: string
    seriesId?: string
    circle?: string
    author?: string
    tag?: string
  }) => void
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
  requestManageGroup: () => Promise<void>
  requestManageMove: () => Promise<void>
  runManageHideAction: (hidden: boolean) => Promise<void>
  manageAdReview: ManageAdReviewActionsResult
  clearAllSelections: () => void
  vectorResultsActive: boolean
  showNamesOnly: boolean
  displayThumbnailScaleLevel: number
  thumbnailScaleLevelCount: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
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
  selectVideoFromBrowser: (videoId: string, options?: { play?: boolean }) => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  setDragVideoId: Dispatch<SetStateAction<string | null>>
  sidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNodeId: string | null
  searchResultsMode: boolean
  canSetCurrentRoot: boolean
  normalImageSourceNodeIdMap: Map<string, string>
  orderedRootScopedImageRefs: FocusedImageRef[]
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
