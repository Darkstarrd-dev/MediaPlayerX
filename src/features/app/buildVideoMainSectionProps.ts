import type { CSSProperties, Dispatch, SetStateAction } from 'react'

import { clamp } from '../../utils/ui'
import type { VideoItem } from '../../types'
import type { VideoFitMode } from '../media/videoFitMode'
import type {
  ReadManageSubtitleCleanupTaskResponseDto,
  RunManageSubtitleCleanupResponseDto,
  SaveManageSubtitleCleanupResponseDto,
  StartManageSubtitleCleanupResponseDto,
} from '../../contracts/backend'

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
  canManageAddToPlaylist: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  onManageDelete: () => void
  onManageGroup: () => void
  onManageMove: () => void
  onManageAddToPlaylist: () => void
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
  videoLoopMode: 'single' | 'list'
  videoLoopModeLabel: string
  mediaPreloadMemoryBudgetMb: number
  videoPreloadOrderIds: string[]
  videoById: Map<string, VideoItem>
  videoUrlById: Record<string, string>
  videoSourceUrl: string | null
  popoverDebugPinned: boolean
  fullscreenActive: boolean
  active: boolean
  coverColor: string
  coverImageUrl: string | null
  focusedVideoId: string | null
  focusedVideo: VideoItem | null
  subtitleCleanupLlmEndpoint: string
  subtitleCleanupLlmModel: string
  subtitleCleanupLlmPrompt: string
  startSubtitleCleanup?: (request: {
    video_id: string
  }) => Promise<StartManageSubtitleCleanupResponseDto>
  readSubtitleCleanupTask?: (request: { task_id: string }) => Promise<ReadManageSubtitleCleanupTaskResponseDto>
  runSubtitleCleanup?: (request: {
    task_id: string
    llm_endpoint: string
    llm_model: string
    llm_prompt?: string
  }) => Promise<RunManageSubtitleCleanupResponseDto>
  saveSubtitleCleanup?: (request: {
    task_id: string
    cleaned_subtitle_text: string
  }) => Promise<SaveManageSubtitleCleanupResponseDto>
  onSubtitleCleanupSaved: () => void
  onSubtitleCleanupLlmEndpointChange: (value: string) => void
  onSubtitleCleanupLlmModelChange: (value: string) => void
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number, sidebarQueueIds?: string[], options?: { preserveRate?: boolean }) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  onCycleVideoLoopMode: () => void
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
  autoSubtitleActive: boolean
  liveSubtitleText: string | null
  subtitleOverlayStyle: CSSProperties
  bindVideoElement: (element: HTMLVideoElement | null) => void
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
  updateSettings: (patch: { sidebarFocus?: 'sidebar' | 'main' }) => void
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
    canManageAddToPlaylist: params.canManageAddToPlaylist,
    canManageHide: params.canManageHide,
    canManageUnhide: params.canManageUnhide,
    onManageDelete: params.onManageDelete,
    onManageGroup: params.onManageGroup,
    onManageMove: params.onManageMove,
    onManageAddToPlaylist: params.onManageAddToPlaylist,
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
    videoLoopMode: params.videoLoopMode,
    videoLoopModeLabel: params.videoLoopModeLabel,
    mediaPreloadMemoryBudgetMb: params.mediaPreloadMemoryBudgetMb,
    videoPreloadItems: params.videoPreloadOrderIds
      .map((videoId) => {
        const video = params.videoById.get(videoId)
        const src = params.videoUrlById[videoId] ?? null
        if (!video || !src) {
          return null
        }
        return {
          id: videoId,
          src,
          sizeMb: Math.max(0, video.sizeMb),
        }
      })
      .filter((item): item is { id: string; src: string; sizeMb: number } => Boolean(item)),
    videoSourceUrl: params.videoSourceUrl,
    popoverDebugPinned: params.popoverDebugPinned,
    fullscreenActive: params.fullscreenActive,
    active: params.active,
    coverImageUrl: params.coverImageUrl,
    focusedVideo: params.focusedVideo,
    subtitleCleanupVideoId: params.focusedVideoId,
    subtitleCleanupLlmEndpoint: params.subtitleCleanupLlmEndpoint,
    subtitleCleanupLlmModel: params.subtitleCleanupLlmModel,
    subtitleCleanupLlmPrompt: params.subtitleCleanupLlmPrompt,
    startSubtitleCleanup: params.startSubtitleCleanup,
    readSubtitleCleanupTask: params.readSubtitleCleanupTask,
    runSubtitleCleanup: params.runSubtitleCleanup,
    saveSubtitleCleanup: params.saveSubtitleCleanup,
    onSubtitleCleanupSaved: params.onSubtitleCleanupSaved,
    onSubtitleCleanupLlmEndpointChange: params.onSubtitleCleanupLlmEndpointChange,
    onSubtitleCleanupLlmModelChange: params.onSubtitleCleanupLlmModelChange,
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
    autoSubtitleActive: params.autoSubtitleActive,
    liveSubtitleText: params.liveSubtitleText,
    subtitleOverlayStyle: params.subtitleOverlayStyle,
    bindVideoElement: params.bindVideoElement,
    onRequestMainFocus: () => {
      params.updateSettings({ sidebarFocus: 'main' })
    },
    onTogglePlay: () => {
      if (!params.focusedVideoId) {
        return
      }
      params.setVideoPlaying((value) => !value)
    },
    onPrevVideo: () => params.goPlaylist(-1),
    onNextVideo: () => params.goPlaylist(1),
    onVideoEnded: () => {
      if (params.videoLoopMode === 'single') {
        params.setVideoTime(0)
        params.setVideoPlaying(true)
        return
      }
      params.goPlaylist(1, undefined, { preserveRate: true })
    },
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
      params.setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 10))
    },
    onCycleVideoLoopMode: params.onCycleVideoLoopMode,
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
