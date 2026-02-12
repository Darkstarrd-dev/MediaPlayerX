import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { MetadataPanelProps } from '../../components/MetadataPanel'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { ImageItem, ImagePackage, VideoItem } from '../../types'
import type { PackageMetadataWritePayload, VideoMetadataWritePayload } from './useMetadataWriteBindings'

interface BuildMetadataPanelPropsParams {
  mode: MetadataPanelProps['mode']
  manageMode: boolean
  searchModeActive: boolean
  featureResultCount: number
  featureNameQuery: string
  onFeatureNameQueryChange: (value: string) => void
  featureWorkTitleQuery: string
  onFeatureWorkTitleQueryChange: (value: string) => void
  featureCircleQuery: string
  onFeatureCircleQueryChange: (value: string) => void
  featureAuthorQuery: string
  onFeatureAuthorQueryChange: (value: string) => void
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  featureTagPickerOpen: boolean
  onToggleFeatureTagPicker: () => void
  featureTags: string[]
  onSetFeatureTags: (tags: string[]) => void
  onClearFeatureTags: () => void
  featureGradeFilter: number | null
  onFeatureGradeFilterChange: (value: number | null) => void
  adReviewFeatureVisible: boolean
  adReviewPanelOpen: boolean
  canExecuteAdReview: boolean
  adReviewPending: boolean
  adReviewTask: MetadataPanelProps['adReviewTask']
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  onStartAdReview: () => void
  onPauseAdReview: () => void
  onToggleHideUncheckedNonChecked: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onDismissAdReviewTask: () => void
  metadataCollapsed: boolean
  metadataRatio: number
  hasImageFocus: boolean
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  currentVideoGrade: number | null
  metadataPending: boolean
  editable: boolean
  focusedVideo: VideoItem | null
  metadataTab: MetadataPanelProps['metadataTab']
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoVolume: number
  videoMuted: boolean
  videoRate: number
  videoById: Map<string, VideoItem>
  updateSettings: (patch: Partial<AppSettings>) => void
  onGradeChange: (grade: number | null) => void
  onSavePackageMetadata: (payload: PackageMetadataWritePayload) => void
  onSavePackageParsedMetadata: (payload: ParsedExternalMetadata) => Promise<void>
  onSaveVideoMetadata: (payload: VideoMetadataWritePayload) => void
  onMetadataTabChange: (tab: MetadataPanelProps['metadataTab']) => void
  onSelectVideo: (videoId: string) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  setDragVideoId: Dispatch<SetStateAction<string | null>>
}

export function buildMetadataPanelProps(params: BuildMetadataPanelPropsParams): MetadataPanelProps {
  return {
    mode: params.mode,
    manageMode: params.manageMode,
    searchModeActive: params.searchModeActive,
    featureResultCount: params.featureResultCount,
    featureNameQuery: params.featureNameQuery,
    onFeatureNameQueryChange: params.onFeatureNameQueryChange,
    featureWorkTitleQuery: params.featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: params.onFeatureWorkTitleQueryChange,
    featureCircleQuery: params.featureCircleQuery,
    onFeatureCircleQueryChange: params.onFeatureCircleQueryChange,
    featureAuthorQuery: params.featureAuthorQuery,
    onFeatureAuthorQueryChange: params.onFeatureAuthorQueryChange,
    featureCircleOptions: params.featureCircleOptions,
    featureAuthorOptions: params.featureAuthorOptions,
    featureTagOptions: params.featureTagOptions,
    featureTagPickerOpen: params.featureTagPickerOpen,
    onToggleFeatureTagPicker: params.onToggleFeatureTagPicker,
    featureTags: params.featureTags,
    onSetFeatureTags: params.onSetFeatureTags,
    onClearFeatureTags: params.onClearFeatureTags,
    featureGradeFilter: params.featureGradeFilter,
    onFeatureGradeFilterChange: params.onFeatureGradeFilterChange,
    adReviewFeatureVisible: params.adReviewFeatureVisible,
    adReviewPanelOpen: params.adReviewPanelOpen,
    canExecuteAdReview: params.canExecuteAdReview,
    adReviewPending: params.adReviewPending,
    adReviewTask: params.adReviewTask,
    adReviewHideUncheckedNonChecked: params.adReviewHideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: params.hasCheckedAdReviewCandidates,
    adReviewStrategyMode: params.adReviewStrategyMode,
    adReviewMaxConcurrency: params.adReviewMaxConcurrency,
    adReviewHeadN: params.adReviewHeadN,
    adReviewTailN: params.adReviewTailN,
    adReviewTailStopCleanStreak: params.adReviewTailStopCleanStreak,
    onStartAdReview: params.onStartAdReview,
    onPauseAdReview: params.onPauseAdReview,
    onToggleHideUncheckedNonChecked: params.onToggleHideUncheckedNonChecked,
    onAdReviewStrategyModeChange: params.onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange: params.onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange: params.onAdReviewHeadNChange,
    onAdReviewTailNChange: params.onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange: params.onAdReviewTailStopCleanStreakChange,
    onDismissAdReviewTask: params.onDismissAdReviewTask,
    metadataCollapsed: params.metadataCollapsed,
    metadataRatio: params.metadataRatio,
    hasImageFocus: params.hasImageFocus,
    focusedImage: params.focusedImage,
    focusedImageSrc: params.focusedImageSrc,
    focusedImagePackage: params.focusedImagePackage,
    currentGrade: params.currentGrade,
    currentVideoGrade: params.currentVideoGrade,
    metadataPending: params.metadataPending,
    editable: params.editable,
    focusedVideo: params.focusedVideo,
    metadataTab: params.metadataTab,
    playlistIds: params.playlistIds,
    selectedVideoId: params.selectedVideoId,
    dragVideoId: params.dragVideoId,
    videoVolume: params.videoVolume,
    videoMuted: params.videoMuted,
    videoRate: params.videoRate,
    videoById: params.videoById,
    onCollapse: () => params.updateSettings({ metadataCollapsed: true }),
    onExpand: () => params.updateSettings({ metadataCollapsed: false }),
    onGradeChange: params.onGradeChange,
    onSavePackageMetadata: params.onSavePackageMetadata,
    onSavePackageParsedMetadata: params.onSavePackageParsedMetadata,
    onSaveVideoMetadata: params.onSaveVideoMetadata,
    onSearchByWorkTitle: params.onSearchByWorkTitle,
    onSearchByCircle: params.onSearchByCircle,
    onSearchByAuthor: params.onSearchByAuthor,
    onSearchByTag: params.onSearchByTag,
    onMetadataTabChange: params.onMetadataTabChange,
    onSelectVideo: params.onSelectVideo,
    onRemoveVideoFromPlaylist: (videoId: string) => {
      params.setPlaylistIds((previous) => previous.filter((id) => id !== videoId))
    },
    onDragStart: (videoId: string) => {
      params.setDragVideoId(videoId)
    },
    onDropToVideo: (targetVideoId: string) => {
      const dragVideoId = params.dragVideoId
      if (!dragVideoId || dragVideoId === targetVideoId) {
        return
      }

      params.setPlaylistIds((previous) => {
        const from = previous.indexOf(dragVideoId)
        const to = previous.indexOf(targetVideoId)
        if (from < 0 || to < 0) {
          return previous
        }

        const next = [...previous]
        next.splice(from, 1)
        next.splice(to, 0, dragVideoId)
        return next
      })
    },
  }
}
