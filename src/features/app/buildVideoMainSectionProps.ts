import type { Dispatch, SetStateAction } from 'react'

import { clamp } from '../../utils/ui'

interface BuildVideoMainSectionPropsParams {
  manageMode: boolean
  metadataManageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  onManageDelete: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onClearManageSelection: () => void
  durationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoSourceUrl: string | null
  active: boolean
  coverColor: string
  coverImageUrl: string | null
  focusedVideoId: string | null
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  saveVideoCover: (videoId: string, timeSec: number, color: string) => Promise<void>
  setFullscreenActiveWithAutoStop: (value: boolean) => void
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
    canManageHide: params.canManageHide,
    canManageUnhide: params.canManageUnhide,
    onManageDelete: params.onManageDelete,
    onManageHide: params.onManageHide,
    onManageUnhide: params.onManageUnhide,
    onClearManageSelection: params.onClearManageSelection,
    durationSec: params.durationSec,
    videoTime: params.videoTime,
    videoPlaying: params.videoPlaying,
    videoRate: params.videoRate,
    videoVolume: params.videoVolume,
    videoMuted: params.videoMuted,
    videoSourceUrl: params.videoSourceUrl,
    active: params.active,
    coverColor: params.coverColor,
    coverImageUrl: params.coverImageUrl,
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
    onSaveCover: () => {
      if (!params.focusedVideoId) {
        return
      }

      void params.saveVideoCover(params.focusedVideoId, params.videoTime, params.coverColor)
    },
    onEnterFullscreen: () => params.setFullscreenActiveWithAutoStop(true),
  }
}
