import type { Dispatch, SetStateAction } from 'react'

import { clamp } from '../../utils/ui'
import type { VideoItem } from '../../types'
import type { VideoFitMode } from '../media/videoFitMode'

interface BuildVideoMainSectionPropsParams {
  manageMode: boolean
  metadataManageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  onManageDelete: () => void
  onManageGroup: () => void
  onManageMove: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onClearManageSelection: () => void
  durationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoSourceUrl: string | null
  fullscreenActive: boolean
  active: boolean
  coverColor: string
  coverImageUrl: string | null
  focusedVideoId: string | null
  focusedVideo: VideoItem | null
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  cycleVideoFitMode: () => void
  saveVideoCover: (videoId: string, timeSec: number, color: string) => Promise<void>
  setFullscreenActiveWithAutoStop: (value: boolean) => void
  metadataPending: boolean
  onMetadataSyncName: () => void
  canJumpToManga: boolean
  canJumpToMusic: boolean
  onJumpToManga: () => void
  onJumpToMusic: () => void
  subtitleVisible: boolean
  subtitleTrackUrl: string | null
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
}

export function buildVideoMainSectionProps(params: BuildVideoMainSectionPropsParams) {
  return {
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    sidebarSelectedCount: params.sidebarSelectedCount,
    imageSelectedCount: params.imageSelectedCount,
    activeSelectionScope: params.activeSelectionScope,
    pendingManageAction: params.pendingManageAction,
    manageOperationHint: params.manageOperationHint,
    canManageDelete: params.canManageDelete,
    canManageMoveNodes: params.canManageMoveNodes,
    canManageHide: params.canManageHide,
    canManageUnhide: params.canManageUnhide,
    onManageDelete: params.onManageDelete,
    onManageGroup: params.onManageGroup,
    onManageMove: params.onManageMove,
    onManageHide: params.onManageHide,
    onManageUnhide: params.onManageUnhide,
    onClearManageSelection: params.onClearManageSelection,
    durationSec: params.durationSec,
    videoTime: params.videoTime,
    videoPlaying: params.videoPlaying,
    videoRate: params.videoRate,
    videoVolume: params.videoVolume,
    videoMuted: params.videoMuted,
    videoFitMode: params.videoFitMode,
    videoSourceUrl: params.videoSourceUrl,
    fullscreenActive: params.fullscreenActive,
    active: params.active,
    coverImageUrl: params.coverImageUrl,
    focusedVideo: params.focusedVideo,
    metadataPending: params.metadataPending,
    onMetadataSyncName: params.onMetadataSyncName,
    canJumpToManga: params.canJumpToManga,
    canJumpToMusic: params.canJumpToMusic,
    onJumpToManga: params.onJumpToManga,
    onJumpToMusic: params.onJumpToMusic,
    subtitleVisible: params.subtitleVisible,
    subtitleTrackUrl: params.subtitleTrackUrl,
    subtitleLoading: params.subtitleLoading,
    subtitleMessage: params.subtitleMessage,
    subtitleOptions: params.subtitleOptions,
    selectedSubtitleId: params.selectedSubtitleId,
    onTogglePlay: () => {
      if (!params.focusedVideoId) {
        return
      }
      params.setVideoPlaying((value) => !value)
    },
    onPrevVideo: () => params.goPlaylist(-1),
    onNextVideo: () => params.goPlaylist(1),
    onSeekVideo: (time: number) => {
      params.setVideoTime(clamp(time, 0, params.durationSec))
    },
    onVideoTimeUpdate: (time: number) => {
      params.setVideoTime(clamp(time, 0, params.durationSec))
    },
    onVideoDurationDetected: (duration: number) => {
      const focusedVideoId = params.focusedVideoId
      if (!focusedVideoId || !Number.isFinite(duration) || duration <= 0) {
        return
      }

      params.setVideoDurationById((previous) => ({
        ...previous,
        [focusedVideoId]: duration,
      }))
    },
    onToggleMute: () => params.setVideoMuted((value) => !value),
    onChangeVolume: (volume: number) => {
      params.setVideoMuted(false)
      params.setVideoVolume(clamp(volume, 0, 100))
    },
    onChangeRate: (rate: number) => {
      params.setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 4))
    },
    onCycleVideoFitMode: params.cycleVideoFitMode,
    onSetVideoFitMode: (mode: VideoFitMode) => {
      params.setVideoFitMode(mode)
    },
    onToggleSubtitle: () => {
      params.setSubtitleVisible((value) => !value)
    },
    onSelectSubtitle: (subtitleId: string) => {
      void params.selectSubtitleById(subtitleId)
    },
    onSaveCover: () => {
      if (!params.focusedVideoId) {
        return
      }

      void params.saveVideoCover(params.focusedVideoId, params.videoTime, params.coverColor)
    },
    onEnterFullscreen: () => params.setFullscreenActiveWithAutoStop(true),
  }
}
