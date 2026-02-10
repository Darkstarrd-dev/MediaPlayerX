import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { MetadataPanelProps } from '../../components/MetadataPanel'
import type { ImageItem, ImagePackage, VideoItem } from '../../types'
import type { PackageMetadataWritePayload, VideoMetadataWritePayload } from './useMetadataWriteBindings'

interface BuildMetadataPanelPropsParams {
  mode: MetadataPanelProps['mode']
  metadataCollapsed: boolean
  metadataRatio: number
  hasImageFocus: boolean
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  currentVideoGrade: number | null
  metadataPending: boolean
  autoTagPending: boolean
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
  onGeneratePackageAutoTags: () => void
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
    metadataCollapsed: params.metadataCollapsed,
    metadataRatio: params.metadataRatio,
    hasImageFocus: params.hasImageFocus,
    focusedImage: params.focusedImage,
    focusedImageSrc: params.focusedImageSrc,
    focusedImagePackage: params.focusedImagePackage,
    currentGrade: params.currentGrade,
    currentVideoGrade: params.currentVideoGrade,
    metadataPending: params.metadataPending,
    autoTagPending: params.autoTagPending,
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
    onGeneratePackageAutoTags: params.onGeneratePackageAutoTags,
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
