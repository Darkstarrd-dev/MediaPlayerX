import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { AudioItem, MusicLoopMode } from '../../types'
import { clamp } from '../../utils/ui'

interface BuildMusicMainSectionPropsParams {
  mode: 'image' | 'video' | 'music'
  fullscreenActive: boolean
  videoPlaying: boolean
  playRequestNonce: number
  manageMode: boolean
  metadataManageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  onManageDelete: () => void
  onClearManageSelection: () => void
  canJumpToManga: boolean
  canJumpToAnimation: boolean
  canJumpToBooklet: boolean
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  onJumpToBooklet: () => void
  audiosForSidebar: AudioItem[]
  audioSidebarOrderedIds: string[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  selectedAudioId: string
  musicLoopMode: MusicLoopMode
  audioByIdEffective: Map<string, AudioItem>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  setMusicLoopMode: Dispatch<SetStateAction<MusicLoopMode>>
  setFullscreenActiveWithAutoStop: (value: boolean) => void
  musicVisualizerSelectedShaderId: string
  musicVisualizerRenderLongEdgePx: number
  musicVisualizerFpsCap: 30 | 60 | 120
  musicVisualizerToneMapMode: 'off' | 'reinhard' | 'aces' | 'filmic' | 'agx' | 'khronos'
  musicVisualizerToneMapExposure: number
  musicVisualizerToneMapStrength: number
  musicVisualizerShowFps: boolean
  musicVisualizerRenderer: 'gpu' | 'cpu'
  updateSettings: (patch: Partial<AppSettings>) => void
}

const MUSIC_LOOP_MODE_ORDER: MusicLoopMode[] = ['single', 'folder', 'album', 'library']
const DISC_DIRECTORY_PATTERN = /^(?:cd|disc|disk)\s*[-_ ]*\d+$/i

function resolveMusicLoopModeLabel(mode: MusicLoopMode): string {
  if (mode === 'single') {
    return '单曲循环'
  }
  if (mode === 'folder') {
    return '单文件夹循环'
  }
  if (mode === 'album') {
    return '单专辑循环'
  }
  return '全曲库循环'
}

function normalizePathKeyFromTreePath(treePath: string[]): string {
  return treePath.join('/').toLowerCase()
}

function resolveFolderPathKey(audio: AudioItem): string {
  return normalizePathKeyFromTreePath(audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)))
}

function resolveAlbumPathKey(audio: AudioItem): string {
  const folderSegments = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1))
  if (folderSegments.length === 0) {
    return ''
  }

  const folderBaseName = folderSegments[folderSegments.length - 1] ?? ''
  const albumSegments = DISC_DIRECTORY_PATTERN.test(folderBaseName) && folderSegments.length > 1
    ? folderSegments.slice(0, -1)
    : folderSegments

  return normalizePathKeyFromTreePath(albumSegments)
}

function resolveLibraryPlaybackOrder(params: BuildMusicMainSectionPropsParams): string[] {
  const sidebarOrderedIds = params.audioSidebarOrderedIds.filter((audioId) => params.audioByIdEffective.has(audioId))
  if (sidebarOrderedIds.length > 0) {
    return sidebarOrderedIds
  }

  return params.audiosForSidebar
    .map((audio) => audio.id)
    .filter((audioId) => params.audioByIdEffective.has(audioId))
}

function resolveScopedPlaybackOrder(params: {
  libraryPlaybackOrder: string[]
  selectedAudio: AudioItem | null
  loopMode: MusicLoopMode
  audioById: Map<string, AudioItem>
}): string[] {
  const { libraryPlaybackOrder, selectedAudio, loopMode, audioById } = params
  if (!selectedAudio) {
    return libraryPlaybackOrder
  }

  if (loopMode === 'single') {
    return [selectedAudio.id]
  }

  if (loopMode === 'library') {
    return libraryPlaybackOrder
  }

  const currentFolderKey = resolveFolderPathKey(selectedAudio)
  const currentAlbumKey = resolveAlbumPathKey(selectedAudio)

  const filtered = libraryPlaybackOrder.filter((audioId) => {
    const audio = audioById.get(audioId)
    if (!audio) {
      return false
    }

    if (loopMode === 'folder') {
      return resolveFolderPathKey(audio) === currentFolderKey
    }

    return resolveAlbumPathKey(audio) === currentAlbumKey
  })

  return filtered.length > 0 ? filtered : libraryPlaybackOrder
}

export function buildMusicMainSectionProps(params: BuildMusicMainSectionPropsParams) {
  const libraryPlaybackOrder = resolveLibraryPlaybackOrder(params)
  const selectedAudio = params.audioByIdEffective.get(params.selectedAudioId) ?? params.focusedAudio
  const scopedPlaybackOrder = resolveScopedPlaybackOrder({
    libraryPlaybackOrder,
    selectedAudio,
    loopMode: params.musicLoopMode,
    audioById: params.audioByIdEffective,
  })

  const currentAudioId = selectedAudio?.id ?? null
  const currentIndex = currentAudioId ? scopedPlaybackOrder.findIndex((audioId) => audioId === currentAudioId) : -1
  const fallbackIndex = currentIndex >= 0 ? currentIndex : scopedPlaybackOrder.length > 0 ? 0 : -1
  const hasSelection = fallbackIndex >= 0
  const canStepBetweenTracks = hasSelection && params.musicLoopMode !== 'single' && scopedPlaybackOrder.length > 1

  const stepAudio = (step: number) => {
    if (!hasSelection || scopedPlaybackOrder.length === 0) {
      return
    }

    const targetIndex = (fallbackIndex + step + scopedPlaybackOrder.length) % scopedPlaybackOrder.length
    const targetId = scopedPlaybackOrder[clamp(targetIndex, 0, scopedPlaybackOrder.length - 1)]
    if (!targetId) {
      return
    }
    if (targetId !== params.selectedAudioId) {
      params.setSelectedAudioId(targetId)
    }
    params.updateSettings({ sidebarFocus: 'main' })
  }

  const currentLoopModeLabel = resolveMusicLoopModeLabel(params.musicLoopMode)

  return {
    active: params.mode === 'music',
    interruptByVideoPlayback: params.mode === 'video' && params.videoPlaying,
    playRequestNonce: params.playRequestNonce,
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    sidebarSelectedCount: params.sidebarSelectedCount,
    imageSelectedCount: params.imageSelectedCount,
    activeSelectionScope: params.activeSelectionScope,
    pendingManageAction: params.pendingManageAction,
    manageOperationHint: params.manageOperationHint,
    canManageDelete: params.canManageDelete,
    onManageDelete: params.onManageDelete,
    onClearManageSelection: params.onClearManageSelection,
    canJumpToManga: params.canJumpToManga,
    canJumpToAnimation: params.canJumpToAnimation,
    canJumpToBooklet: params.canJumpToBooklet,
    onJumpToManga: params.onJumpToManga,
    onJumpToAnimation: params.onJumpToAnimation,
    onJumpToBooklet: params.onJumpToBooklet,
    audios: params.audiosForSidebar,
    focusedAudio: params.focusedAudio,
    focusedAudioSrc: params.focusedAudioSrc,
    musicLoopMode: params.musicLoopMode,
    musicLoopModeLabel: currentLoopModeLabel,
    canPrevAudio: canStepBetweenTracks,
    canNextAudio: canStepBetweenTracks,
    fullscreenActive: params.fullscreenActive,
    onToggleFullscreen: () => {
      params.setFullscreenActiveWithAutoStop(!params.fullscreenActive)
    },
    musicVisualizerSelectedShaderId: params.musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx: params.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: params.musicVisualizerFpsCap,
    musicVisualizerToneMapMode: params.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: params.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: params.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: params.musicVisualizerShowFps,
    musicVisualizerRenderer: params.musicVisualizerRenderer,
    onPrevAudio: () => {
      if (!canStepBetweenTracks) {
        return
      }
      stepAudio(-1)
    },
    onNextAudio: () => {
      if (!canStepBetweenTracks) {
        return
      }
      stepAudio(1)
    },
    onCycleMusicLoopMode: () => {
      const currentIndexInOrder = MUSIC_LOOP_MODE_ORDER.indexOf(params.musicLoopMode)
      const nextIndex = currentIndexInOrder >= 0
        ? (currentIndexInOrder + 1) % MUSIC_LOOP_MODE_ORDER.length
        : MUSIC_LOOP_MODE_ORDER.length - 1
      const nextMode = MUSIC_LOOP_MODE_ORDER[nextIndex] ?? 'library'
      params.setMusicLoopMode(nextMode)
    },
    onMusicVisualizerSelectedShaderIdChange: (value: string) => {
      params.updateSettings({ musicVisualizerSelectedShaderId: value })
    },
  }
}
