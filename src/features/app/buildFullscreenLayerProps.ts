import type { CSSProperties, Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { FullscreenLayerProps } from '../../components/FullscreenLayer'
import { clamp } from '../../utils/ui'
import type { ImageItem, VideoItem } from '../../types'
import type { VideoFitMode } from '../media/videoFitMode'
import type { ImageConvertAdjustProfile } from './useAppSessionState'

interface BuildFullscreenLayerPropsParams {
  mode: FullscreenLayerProps['mode']
  fullscreenActive: boolean
  showFullscreenFooter: boolean
  fullscreenDisplay: FullscreenLayerProps['fullscreenDisplay']
  fullscreenEntryDisplay: FullscreenLayerProps['fullscreenEntryDisplay']
  fullscreenAlignRequest: FullscreenLayerProps['fullscreenAlignRequest']
  fullscreenSwapped: boolean
  fullscreenVideoFocus: boolean
  fullscreenSplit: number
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedVideo: VideoItem | null
  focusedVideoSrc: string | null
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  autoSubtitleActive: boolean
  liveSubtitleText: string | null
  subtitleOverlayStyle: CSSProperties
  bindFullscreenVideoElement: (element: HTMLVideoElement | null) => void
  focusedVideoCoverImageSrc: string | null
  durationSec: number
  focusedVideoCoverColor: string
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoLoopMode: 'single' | 'list'
  fullscreenVideoControlsMaxWidth: number
  fullscreenDecodeCacheSize?: number
  autoPlayEnabled: boolean
  autoPlayInterval: number
  popoverDebugPinned: boolean
  imageConvertPreviewMode?: boolean
  imageConvertPreviewScale?: number
  imageConvertPreviewLongestEdgePx?: number | null
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile
  imageConvertPreviewFormat?: 'webp' | 'jpeg' | 'png' | 'avif'
  imageConvertPreviewQuality?: number
  imageConvertPreviewRenderedSrc?: string | null
  imageConvertPreviewError?: string | null
  onChangeImageConvertPreviewScale?: (value: number) => void
  onChangeImageConvertPreviewFormat?: (value: 'webp' | 'jpeg' | 'png' | 'avif') => void
  onChangeImageConvertPreviewQuality?: (value: number) => void
  onApplyImageConvertPreviewScaleToLongestEdge?: (value: number | null) => void
  onChangeImageConvertPreviewAdjustProfile?: (profile: ImageConvertAdjustProfile) => void
  onConfirmImageConvertPreview?: () => void
  onCancelImageConvertPreview?: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number, sidebarQueueIds?: string[], options?: { preserveRate?: boolean }) => void
  playlistIds: string[]
  videoQueueSource: 'sidebar' | 'playlist'
  rootScopedVideoIds: string[]
  selectedVideoId: string
  videoById: Map<string, VideoItem>
  selectVideoFromBrowser: (videoId: string) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  focusedVideoId: string | null
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  cycleVideoLoopMode: () => void
  cycleVideoFitMode: () => void
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
  saveVideoCover: (videoId: string, timeSec: number, color: string) => Promise<void>
  setFullscreenActiveWithAutoStop: (active: boolean) => void
  setShowFullscreenFooter: (visible: boolean) => void
  setFullscreenDisplay: Dispatch<SetStateAction<FullscreenLayerProps['fullscreenDisplay']>>
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  setFullscreenSplit: Dispatch<SetStateAction<number>>
  moveImage: (step: number) => void
  goPackage: (step: number) => void
}

export function buildFullscreenLayerProps(params: BuildFullscreenLayerPropsParams): FullscreenLayerProps {
  const clampSeekTime = (time: number) => {
    if (params.durationSec > 0) {
      return clamp(time, 0, params.durationSec)
    }
    return Math.max(0, time)
  }

  const resolveSidebarQueueOverride = () =>
    params.videoQueueSource === 'sidebar' ? params.rootScopedVideoIds : undefined

  return {
    mode: params.mode,
    fullscreenActive: params.fullscreenActive,
    showFullscreenFooter: params.showFullscreenFooter,
    fullscreenDisplay: params.fullscreenDisplay,
    fullscreenEntryDisplay: params.fullscreenEntryDisplay,
    fullscreenAlignRequest: params.fullscreenAlignRequest,
    fullscreenSwapped: params.fullscreenSwapped,
    fullscreenVideoFocus: params.fullscreenVideoFocus,
    fullscreenSplit: params.fullscreenSplit,
    focusedImage: params.focusedImage,
    focusedImageSrc: params.focusedImageSrc,
    focusedVideo: params.focusedVideo,
    focusedVideoSrc: params.focusedVideoSrc,
    subtitleTrackUrl: params.subtitleTrackUrl,
    subtitleVisible: params.subtitleVisible,
    subtitleLoading: params.subtitleLoading,
    subtitleMessage: params.subtitleMessage,
    subtitleOptions: params.subtitleOptions,
    selectedSubtitleId: params.selectedSubtitleId,
    autoSubtitleActive: params.autoSubtitleActive,
    liveSubtitleText: params.liveSubtitleText,
    subtitleOverlayStyle: params.subtitleOverlayStyle,
    bindFullscreenVideoElement: params.bindFullscreenVideoElement,
    focusedVideoCoverImageSrc: params.focusedVideoCoverImageSrc,
    durationSec: params.durationSec,
    focusedVideoCoverColor: params.focusedVideoCoverColor,
    videoTime: params.videoTime,
    videoPlaying: params.videoPlaying,
    videoRate: params.videoRate,
    videoVolume: params.videoVolume,
    videoMuted: params.videoMuted,
    videoFitMode: params.videoFitMode,
    videoLoopMode: params.videoLoopMode,
    fullscreenVideoControlsMaxWidth: params.fullscreenVideoControlsMaxWidth,
    fullscreenDecodeCacheSize: params.fullscreenDecodeCacheSize ?? 10,
    autoPlayEnabled: params.autoPlayEnabled,
    autoPlayInterval: params.autoPlayInterval,
    popoverDebugPinned: params.popoverDebugPinned,
    imageConvertPreviewMode: params.imageConvertPreviewMode,
    imageConvertPreviewScale: params.imageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx: params.imageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile: params.imageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat: params.imageConvertPreviewFormat,
    imageConvertPreviewQuality: params.imageConvertPreviewQuality,
    imageConvertPreviewRenderedSrc: params.imageConvertPreviewRenderedSrc,
    imageConvertPreviewError: params.imageConvertPreviewError,
    onSetFooterVisible: params.setShowFullscreenFooter,
    onSetDisplay: params.setFullscreenDisplay,
    onToggleSwapSides: () => params.setFullscreenSwapped((value) => !value),
    onSetVideoFocus: params.setFullscreenVideoFocus,
    onSetSplit: params.setFullscreenSplit,
    onPrevImage: () => params.moveImage(-1),
    onNextImage: () => params.moveImage(1),
    onPrevPackage: () => params.goPackage(-1),
    onNextPackage: () => params.goPackage(1),
    onToggleAutoplay: () => {
      params.updateSettings({ autoPlayEnabled: !params.autoPlayEnabled })
    },
    onSetAutoplayInterval: (seconds) => {
      params.updateSettings({ autoPlayInterval: seconds })
    },
    onChangeImageConvertPreviewScale: params.onChangeImageConvertPreviewScale,
    onChangeImageConvertPreviewFormat: params.onChangeImageConvertPreviewFormat,
    onChangeImageConvertPreviewQuality: params.onChangeImageConvertPreviewQuality,
    onApplyImageConvertPreviewScaleToLongestEdge: params.onApplyImageConvertPreviewScaleToLongestEdge,
    onChangeImageConvertPreviewAdjustProfile: params.onChangeImageConvertPreviewAdjustProfile,
    onConfirmImageConvertPreview: params.onConfirmImageConvertPreview,
    onCancelImageConvertPreview: params.onCancelImageConvertPreview,
    onToggleVideoPlay: () => params.setVideoPlaying((value) => !value),
    onPrevVideo: () => params.goPlaylist(-1, resolveSidebarQueueOverride()),
    onNextVideo: () => params.goPlaylist(1, resolveSidebarQueueOverride()),
    onVideoEnded: () => {
      if (params.videoLoopMode === 'single') {
        params.setVideoTime(0)
        params.setVideoPlaying(true)
        return
      }
      params.goPlaylist(1, resolveSidebarQueueOverride(), { preserveRate: true })
    },
    onToggleSubtitle: () => {
      params.setSubtitleVisible((value) => !value)
    },
    onSelectSubtitle: (subtitleId) => {
      void params.selectSubtitleById(subtitleId)
    },
    playlistEntries: params.playlistIds.map((videoId) => ({
      id: videoId,
      label: params.videoById.get(videoId)?.fileName ?? videoId,
    })),
    selectedVideoId: params.selectedVideoId,
    onSelectVideo: params.selectVideoFromBrowser,
    onSaveCover: () => {
      const focusedVideoId = params.focusedVideoId
      if (!focusedVideoId) {
        return
      }
      void params.saveVideoCover(focusedVideoId, params.videoTime, params.focusedVideoCoverColor)
    },
    onSeekVideo: (time) => {
      params.setVideoTime(clampSeekTime(time))
    },
    onVideoTimeUpdate: (time) => {
      params.setVideoTime(Math.max(0, time))
    },
    onVideoDurationDetected: (duration) => {
      const focusedVideoId = params.focusedVideoId
      if (!focusedVideoId || !Number.isFinite(duration) || duration <= 0) {
        return
      }

      params.setVideoDurationById((previous) => ({
        ...previous,
        [focusedVideoId]: duration,
      }))
    },
    onToggleVideoMute: () => params.setVideoMuted((value) => !value),
    onChangeVideoVolume: (volume) => {
      params.setVideoMuted(false)
      params.setVideoVolume(clamp(volume, 0, 100))
    },
    onChangeVideoRate: (rate) => {
      params.setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 10))
    },
    onCycleVideoLoopMode: params.cycleVideoLoopMode,
    onCycleVideoFitMode: params.cycleVideoFitMode,
    onSetVideoFitMode: (mode) => {
      params.setVideoFitMode(mode)
    },
    onExit: () => params.setFullscreenActiveWithAutoStop(false),
  }
}
