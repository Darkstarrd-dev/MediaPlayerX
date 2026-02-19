import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import { clamp } from '../../utils/ui'
import { buildInitialVideoCoverImageMap, buildInitialVideoCoverMap } from '../../utils/mediaHelpers'
import type { VideoItem } from '../../types'
import { cycleVideoFitMode, type VideoFitMode } from './videoFitMode'

export type VideoLoopMode = 'single' | 'list'

interface UseMediaStateParams {
  initialVideoId: string
  initialPlaylistIds: string[]
  videos: VideoItem[]
}

interface UseMediaStateResult {
  selectedVideoId: string
  setSelectedVideoId: Dispatch<SetStateAction<string>>
  playlistIds: string[]
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  metadataTab: 'info' | 'playlist'
  setMetadataTab: Dispatch<SetStateAction<'info' | 'playlist'>>
  dragVideoId: string | null
  setDragVideoId: Dispatch<SetStateAction<string | null>>
  videoPlaying: boolean
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  videoTime: number
  setVideoTime: Dispatch<SetStateAction<number>>
  videoRate: number
  setVideoRate: Dispatch<SetStateAction<number>>
  videoVolume: number
  setVideoVolume: Dispatch<SetStateAction<number>>
  videoMuted: boolean
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  videoFitMode: VideoFitMode
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  videoLoopMode: VideoLoopMode
  setVideoLoopMode: Dispatch<SetStateAction<VideoLoopMode>>
  videoCoverById: Record<string, string>
  setVideoCoverById: Dispatch<SetStateAction<Record<string, string>>>
  videoCoverImageById: Record<string, string | null>
  setVideoCoverImageById: Dispatch<SetStateAction<Record<string, string | null>>>
  videoDurationById: Record<string, number>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  fullscreenActive: boolean
  setFullscreenActive: Dispatch<SetStateAction<boolean>>
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  setFullscreenDisplay: Dispatch<SetStateAction<'dual' | 'video-only' | 'image-only'>>
  fullscreenSwapped: boolean
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>
  fullscreenVideoFocus: boolean
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  fullscreenSplit: number
  setFullscreenSplit: Dispatch<SetStateAction<number>>
  showFullscreenFooter: boolean
  setShowFullscreenFooter: Dispatch<SetStateAction<boolean>>
  videoQueueSource: 'sidebar' | 'playlist'
  goPlaylist: (delta: number, sidebarQueueIds?: string[], options?: { preserveRate?: boolean }) => void
  selectVideoFromBrowser: (
    videoId: string,
    options?: { play?: boolean; queueSource?: 'sidebar' | 'playlist'; preserveRate?: boolean },
  ) => void
  adjustVideoRate: (delta: number) => void
  adjustVideoVolume: (delta: number) => void
  cycleVideoLoopMode: () => void
  cycleVideoFitMode: () => void
}

export function useMediaState({ initialVideoId, initialPlaylistIds, videos }: UseMediaStateParams): UseMediaStateResult {
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId)
  const [playlistIds, setPlaylistIds] = useState<string[]>(initialPlaylistIds)
  const [metadataTab, setMetadataTab] = useState<'info' | 'playlist'>('info')
  const [dragVideoId, setDragVideoId] = useState<string | null>(null)

  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoRate, setVideoRate] = useState(1)
  const [videoVolume, setVideoVolume] = useState(60)
  const [videoMuted, setVideoMuted] = useState(false)
  const [videoFitMode, setVideoFitMode] = useState<VideoFitMode>('contain')
  const [videoLoopMode, setVideoLoopMode] = useState<VideoLoopMode>('list')
  const [videoCoverById, setVideoCoverById] = useState<Record<string, string>>(() => buildInitialVideoCoverMap(videos))
  const [videoCoverImageById, setVideoCoverImageById] = useState<Record<string, string | null>>(() =>
    buildInitialVideoCoverImageMap(videos),
  )
  const [videoDurationById, setVideoDurationById] = useState<Record<string, number>>(() =>
    Object.fromEntries(videos.map((video) => [video.id, Math.max(0, video.durationSec)])),
  )

  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [fullscreenDisplay, setFullscreenDisplay] = useState<'dual' | 'video-only' | 'image-only'>('dual')
  const [fullscreenSwapped, setFullscreenSwapped] = useState(false)
  const [fullscreenVideoFocus, setFullscreenVideoFocus] = useState(false)
  const [fullscreenSplit, setFullscreenSplit] = useState(0.56)
  const [showFullscreenFooter, setShowFullscreenFooter] = useState(false)
  const [videoQueueSource, setVideoQueueSource] = useState<'sidebar' | 'playlist'>('sidebar')

  const goPlaylist = useCallback(
    (delta: number, sidebarQueueIds?: string[], options?: { preserveRate?: boolean }) => {
      const fallbackSidebarQueueIds = videos.map((video) => video.id)
      const queueIds =
        videoQueueSource === 'playlist' && playlistIds.length > 0
          ? playlistIds
          : (sidebarQueueIds && sidebarQueueIds.length > 0 ? sidebarQueueIds : fallbackSidebarQueueIds)
      if (queueIds.length === 0) {
        return
      }

      const currentIndexInPlaylist = queueIds.findIndex((id) => id === selectedVideoId)
      let nextIndex = 0
      if (currentIndexInPlaylist < 0) {
        nextIndex = delta < 0 ? queueIds.length - 1 : 0
      } else {
        const rawIndex = currentIndexInPlaylist + delta
        nextIndex = ((rawIndex % queueIds.length) + queueIds.length) % queueIds.length
      }
      const nextId = queueIds[nextIndex]
      if (!nextId) {
        return
      }

      setSelectedVideoId(nextId)
      setVideoTime(0)
      if (!options?.preserveRate) {
        setVideoRate(1)
      }
    },
    [playlistIds, selectedVideoId, videoQueueSource, videos],
  )

  const selectVideoFromBrowser = useCallback(
    (
      videoId: string,
      options?: { play?: boolean; queueSource?: 'sidebar' | 'playlist'; preserveRate?: boolean },
    ) => {
      setSelectedVideoId(videoId)
      setVideoTime(0)
      if (!options?.preserveRate) {
        setVideoRate(1)
      }
      if (options?.queueSource) {
        setVideoQueueSource(options.queueSource)
      }
      setVideoPlaying((previous) => (options?.play ? true : previous))
    },
    [],
  )

  const adjustVideoRate = useCallback((delta: number) => {
    setVideoRate((value) => clamp(Number((value + delta).toFixed(2)), 0.1, 10))
  }, [])

  const adjustVideoVolume = useCallback((delta: number) => {
    setVideoMuted(false)
    setVideoVolume((value) => clamp(value + delta, 0, 100))
  }, [])

  const cycleVideoFitModeState = useCallback(() => {
    setVideoFitMode((value) => cycleVideoFitMode(value))
  }, [])

  const cycleVideoLoopMode = useCallback(() => {
    setVideoLoopMode((value) => (value === 'single' ? 'list' : 'single'))
  }, [])

  return {
    selectedVideoId,
    setSelectedVideoId,
    playlistIds,
    setPlaylistIds,
    metadataTab,
    setMetadataTab,
    dragVideoId,
    setDragVideoId,
    videoPlaying,
    setVideoPlaying,
    videoTime,
    setVideoTime,
    videoRate,
    setVideoRate,
    videoVolume,
    setVideoVolume,
    videoMuted,
    setVideoMuted,
    videoFitMode,
    setVideoFitMode,
    videoLoopMode,
    setVideoLoopMode,
    videoCoverById,
    setVideoCoverById,
    videoCoverImageById,
    setVideoCoverImageById,
    videoDurationById,
    setVideoDurationById,
    fullscreenActive,
    setFullscreenActive,
    fullscreenDisplay,
    setFullscreenDisplay,
    fullscreenSwapped,
    setFullscreenSwapped,
    fullscreenVideoFocus,
    setFullscreenVideoFocus,
    fullscreenSplit,
    setFullscreenSplit,
    showFullscreenFooter,
    setShowFullscreenFooter,
    videoQueueSource,
    goPlaylist,
    selectVideoFromBrowser,
    adjustVideoRate,
    adjustVideoVolume,
    cycleVideoLoopMode,
    cycleVideoFitMode: cycleVideoFitModeState,
  }
}

export type MediaStateResult = ReturnType<typeof useMediaState>
