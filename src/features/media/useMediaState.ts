import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import { clamp } from '../../utils/ui'
import { buildInitialVideoCoverImageMap, buildInitialVideoCoverMap } from '../../utils/mediaHelpers'
import type { VideoItem } from '../../types'

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
  goPlaylist: (delta: number) => void
  selectVideoFromBrowser: (videoId: string) => void
  adjustVideoRate: (delta: number) => void
  adjustVideoVolume: (delta: number) => void
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

  const goPlaylist = useCallback(
    (delta: number) => {
      if (playlistIds.length === 0) {
        return
      }

      const currentIndexInPlaylist = playlistIds.findIndex((id) => id === selectedVideoId)
      const safeCurrent = currentIndexInPlaylist >= 0 ? currentIndexInPlaylist : 0
      const nextIndex = clamp(safeCurrent + delta, 0, playlistIds.length - 1)
      const nextId = playlistIds[nextIndex]
      if (!nextId) {
        return
      }

      setSelectedVideoId(nextId)
      setVideoTime(0)
    },
    [playlistIds, selectedVideoId],
  )

  const selectVideoFromBrowser = useCallback((videoId: string) => {
    setSelectedVideoId(videoId)
    setVideoTime(0)
    setVideoPlaying(false)
  }, [])

  const adjustVideoRate = useCallback((delta: number) => {
    setVideoRate((value) => clamp(Number((value + delta).toFixed(2)), 0.1, 4))
  }, [])

  const adjustVideoVolume = useCallback((delta: number) => {
    setVideoMuted(false)
    setVideoVolume((value) => clamp(value + delta, 0, 100))
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
    goPlaylist,
    selectVideoFromBrowser,
    adjustVideoRate,
    adjustVideoVolume,
  }
}

export type MediaStateResult = ReturnType<typeof useMediaState>
