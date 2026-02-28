import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import { resolveDefaultMusicVisualizerShader } from '../music-visualizer/shaderRegistry'
import type { AudioItem, MusicLoopMode } from '../../types'
import { clamp } from '../../utils/ui'

interface BuildMusicMainSectionPropsParams {
  mode: 'image' | 'video' | 'music'
  fullscreenActive: boolean
  popoverDebugPinned: boolean
  paletteMode: 'day' | 'night'
  videoPlaying: boolean
  playRequestNonce: number
  manageMode: boolean
  metadataManageMode: boolean
  metadataManageSelectionMode?: 'single' | 'multiple'
  sidebarSelectedCount: number
  sidebarCheckedNodeIds: string[]
  imageCheckedIds: string[]
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes: boolean
  onManageDelete: () => void
  onManageGroup: () => void
  onManageMove: () => void
  onClearManageSelection: () => void
  canJumpToManga: boolean
  canJumpToAnimation: boolean
  canJumpToCover: boolean
  canJumpToBooklet: boolean
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  onJumpToCover: () => void
  onJumpToBooklet: () => void
  audiosForSidebar: AudioItem[]
  audioSidebarOrderedIds: string[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  audioUrlById: Record<string, string>
  selectedAudioId: string
  musicLoopMode: MusicLoopMode
  musicLoopModeLabels: Record<MusicLoopMode, string>
  audioByIdEffective: Map<string, AudioItem>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  toggleImageChecked: (
    imageId: string,
    checked?: boolean,
    options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
  ) => void
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
  musicVisualizerShaderSettingsById: AppSettings['musicVisualizerShaderSettingsById']
  mediaPreloadMemoryBudgetMb: number
  fullscreenVideoControlsMaxWidth: number
  showNamesOnly: boolean
  updateSettings: (patch: Partial<AppSettings>) => void
  onToggleMetadataManageSelectionMode?: () => void
}

const MUSIC_LOOP_MODE_ORDER: MusicLoopMode[] = ['single', 'folder', 'album', 'library']
const DISC_DIRECTORY_PATTERN = /^(?:cd|disc|disk)\s*[-_ ]*\d+$/i

function resolveMusicLoopModeLabel(mode: MusicLoopMode, labels: Record<MusicLoopMode, string>): string {
  const normalizedLabel = labels[mode]?.trim()
  return normalizedLabel.length > 0 ? normalizedLabel : mode
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

function resolveManageSelectedAudioIds(params: {
  sidebarCheckedNodeIds: string[]
  imageCheckedIds: string[]
  audiosForSidebar: AudioItem[]
  audioById: Map<string, AudioItem>
}): string[] {
  const selectedFolderKeys = Array.from(new Set(
    params.sidebarCheckedNodeIds
      .filter((nodeId) => nodeId.startsWith('audio:'))
      .map((nodeId) => nodeId.slice('audio:'.length).trim())
      .filter(Boolean),
  ))

  const selectedAudioIds = new Set<string>()
  if (selectedFolderKeys.length > 0) {
    for (const audio of params.audiosForSidebar) {
      const folderPath = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')
      for (const selectedFolderKey of selectedFolderKeys) {
        if (folderPath === selectedFolderKey || folderPath.startsWith(`${selectedFolderKey}/`)) {
          selectedAudioIds.add(audio.id)
          break
        }
      }
    }
  }

  for (const checkedAudioId of params.imageCheckedIds) {
    if (params.audioById.has(checkedAudioId)) {
      selectedAudioIds.add(checkedAudioId)
    }
  }

  return Array.from(selectedAudioIds)
}

export function buildMusicMainSectionProps(params: BuildMusicMainSectionPropsParams) {
  const defaultShaderId = resolveDefaultMusicVisualizerShader()?.id ?? 'mcs-szb'
  const selectedShaderId = params.musicVisualizerSelectedShaderId.trim().slice(0, 64) || defaultShaderId
  const fallbackShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string] = {
    renderLongEdgePx: params.musicVisualizerRenderLongEdgePx,
    renderScaleCoeff: 2,
    compositionMode: 'single',
    layeredBackgroundShaderId: 'galaxy',
    layeredForegroundShaderId: 'mcs-szb',
    layeredBackgroundEnabled: true,
    layeredForegroundEnabled: true,
    layeredForegroundOffsetX: 0,
    layeredForegroundOffsetY: 0,
    layeredForegroundScale: 1,
    fpsCap: params.musicVisualizerFpsCap,
    toneMapMode: params.musicVisualizerToneMapMode,
    toneMapExposure: params.musicVisualizerToneMapExposure,
    toneMapStrength: params.musicVisualizerToneMapStrength,
    showFps: params.musicVisualizerShowFps,
    renderer: params.musicVisualizerRenderer,
  }
  const selectedShaderSettings = params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallbackShaderSettings
  const layeredBackgroundShaderId = selectedShaderSettings.layeredBackgroundShaderId || 'galaxy'
  const layeredForegroundShaderId = selectedShaderSettings.layeredForegroundShaderId || 'mcs-szb'
  const layeredBackgroundShaderSettings = params.musicVisualizerShaderSettingsById[layeredBackgroundShaderId] ?? fallbackShaderSettings
  const layeredForegroundShaderSettings = params.musicVisualizerShaderSettingsById[layeredForegroundShaderId] ?? fallbackShaderSettings

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

  const currentLoopModeLabel = resolveMusicLoopModeLabel(params.musicLoopMode, params.musicLoopModeLabels)
  const manageSelectedAudioIds = resolveManageSelectedAudioIds({
    sidebarCheckedNodeIds: params.sidebarCheckedNodeIds,
    imageCheckedIds: params.imageCheckedIds,
    audiosForSidebar: params.audiosForSidebar,
    audioById: params.audioByIdEffective,
  })

  return {
    active: params.mode === 'music',
    interruptByVideoPlayback: params.mode === 'video' && params.videoPlaying,
    playRequestNonce: params.playRequestNonce,
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    metadataManageSelectionMode: params.metadataManageSelectionMode ?? 'multiple',
    sidebarSelectedCount: params.sidebarSelectedCount,
    manageSelectedAudioIds,
    imageSelectedCount: params.imageSelectedCount,
    checkedAudioIds: new Set(params.imageCheckedIds),
    activeSelectionScope: params.activeSelectionScope,
    pendingManageAction: params.pendingManageAction,
    manageOperationHint: params.manageOperationHint,
    canManageDelete: params.canManageDelete,
    canManageMoveNodes: params.canManageMoveNodes,
    onManageDelete: params.onManageDelete,
    onManageGroup: params.onManageGroup,
    onManageMove: params.onManageMove,
    onClearManageSelection: params.onClearManageSelection,
    onToggleMetadataManageSelectionMode: params.onToggleMetadataManageSelectionMode,
    canJumpToManga: params.canJumpToManga,
    canJumpToAnimation: params.canJumpToAnimation,
    canJumpToCover: params.canJumpToCover,
    canJumpToBooklet: params.canJumpToBooklet,
    onJumpToManga: params.onJumpToManga,
    onJumpToAnimation: params.onJumpToAnimation,
    onJumpToCover: params.onJumpToCover,
    onJumpToBooklet: params.onJumpToBooklet,
    audios: params.audiosForSidebar,
    focusedAudio: params.focusedAudio,
    focusedAudioSrc: params.focusedAudioSrc,
    mediaPreloadMemoryBudgetMb: params.mediaPreloadMemoryBudgetMb,
    fullscreenVideoControlsMaxWidth: params.fullscreenVideoControlsMaxWidth,
    showNamesOnly: params.showNamesOnly,
    audioPreloadItems: params.audioSidebarOrderedIds
      .map((audioId) => {
        const audio = params.audioByIdEffective.get(audioId)
        const src = params.audioUrlById[audioId] ?? null
        if (!audio || !src) {
          return null
        }
        return {
          id: audioId,
          src,
          sizeMb: Math.max(0, audio.sizeMb),
        }
      })
      .filter((item): item is { id: string; src: string; sizeMb: number } => Boolean(item)),
    musicLoopMode: params.musicLoopMode,
    musicLoopModeLabel: currentLoopModeLabel,
    canPrevAudio: canStepBetweenTracks,
    canNextAudio: canStepBetweenTracks,
    fullscreenActive: params.fullscreenActive,
    popoverDebugPinned: params.popoverDebugPinned,
    paletteMode: params.paletteMode,
    onToggleFullscreen: () => {
      params.setFullscreenActiveWithAutoStop(!params.fullscreenActive)
    },
    musicVisualizerSelectedShaderId: selectedShaderId,
    musicVisualizerShaderSettings: selectedShaderSettings,
    musicVisualizerLayeredBackgroundShaderSettings: layeredBackgroundShaderSettings,
    musicVisualizerLayeredForegroundShaderSettings: layeredForegroundShaderSettings,
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
    onToggleShowNamesOnly: () => params.updateSettings({ showNamesOnly: !params.showNamesOnly }),
    onSelectAudio: (audioId: string) => {
      if (!params.audioByIdEffective.has(audioId)) {
        return
      }
      if (audioId !== params.selectedAudioId) {
        params.setSelectedAudioId(audioId)
      }
      params.updateSettings({ sidebarFocus: 'main' })
    },
    onToggleAudioChecked: (
      audioId: string,
      checked?: boolean,
      options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
    ) => {
      if (!params.audioByIdEffective.has(audioId)) {
        return
      }
      params.toggleImageChecked(audioId, checked, options)
    },
    onMusicVisualizerSelectedShaderIdChange: (value: string) => {
      const nextShaderId = value.trim().slice(0, 64)
      if (!nextShaderId) {
        return
      }
      const nextSettingsById = { ...params.musicVisualizerShaderSettingsById }
      if (!nextSettingsById[nextShaderId]) {
        nextSettingsById[nextShaderId] = { ...selectedShaderSettings }
      }
      params.updateSettings({
        musicVisualizerSelectedShaderId: nextShaderId,
        musicVisualizerShaderSettingsById: nextSettingsById,
      })
    },
    onMusicVisualizerShaderSettingsChange: (patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>) => {
      const current = params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallbackShaderSettings
      const next: AppSettings['musicVisualizerShaderSettingsById'][string] = {
        ...current,
        ...patch,
      }
      params.updateSettings({
        musicVisualizerShaderSettingsById: {
          ...params.musicVisualizerShaderSettingsById,
          [selectedShaderId]: next,
        },
      })
    },
    onMusicVisualizerLayerShaderIdChange: (layer: 'foreground' | 'background', value: string) => {
      const shaderId = value.trim().slice(0, 64)
      const current = params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallbackShaderSettings
      const nextSettingsById = { ...params.musicVisualizerShaderSettingsById }
      if (shaderId && !nextSettingsById[shaderId]) {
        nextSettingsById[shaderId] = { ...fallbackShaderSettings }
      }

      const nextCurrent = {
        ...current,
        layeredBackgroundShaderId: layer === 'background' ? shaderId : current.layeredBackgroundShaderId,
        layeredForegroundShaderId: layer === 'foreground' ? shaderId : current.layeredForegroundShaderId,
      }

      params.updateSettings({
        musicVisualizerShaderSettingsById: {
          ...nextSettingsById,
          [selectedShaderId]: nextCurrent,
        },
      })
    },
    onMusicVisualizerLayerShaderSettingsChange: (
      layer: 'foreground' | 'background',
      patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>,
    ) => {
      const current = params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallbackShaderSettings
      const targetShaderId = layer === 'foreground' ? current.layeredForegroundShaderId : current.layeredBackgroundShaderId
      const normalizedTargetShaderId = targetShaderId.trim().slice(0, 64)
      if (!normalizedTargetShaderId) {
        return
      }

      const targetCurrent = params.musicVisualizerShaderSettingsById[normalizedTargetShaderId] ?? fallbackShaderSettings
      const targetNext: AppSettings['musicVisualizerShaderSettingsById'][string] = {
        ...targetCurrent,
        ...patch,
      }

      params.updateSettings({
        musicVisualizerShaderSettingsById: {
          ...params.musicVisualizerShaderSettingsById,
          [normalizedTargetShaderId]: targetNext,
        },
      })
    },
  }
}
