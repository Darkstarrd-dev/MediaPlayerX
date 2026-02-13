import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { AudioItem } from '../../types'
import { clamp } from '../../utils/ui'

interface BuildMusicMainSectionPropsParams {
  mode: 'image' | 'video' | 'music'
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
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  audiosForSidebar: AudioItem[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  selectedAudioId: string
  audioPlaylistIds: string[]
  audioByIdEffective: Map<string, AudioItem>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  updateSettings: (patch: Partial<AppSettings>) => void
}

function buildAudioPlaybackOrder(params: BuildMusicMainSectionPropsParams): string[] {
  const playlistIds = params.audioPlaylistIds.filter((id) => params.audioByIdEffective.has(id))
  if (playlistIds.length > 0) {
    return playlistIds
  }
  return params.audiosForSidebar.map((audio) => audio.id)
}

export function buildMusicMainSectionProps(params: BuildMusicMainSectionPropsParams) {
  const playbackOrder = buildAudioPlaybackOrder(params)
  const currentIndex = playbackOrder.findIndex((id) => id === params.selectedAudioId)
  const fallbackIndex = currentIndex >= 0 ? currentIndex : playbackOrder.findIndex((id) => id === params.focusedAudio?.id)
  const hasSelection = fallbackIndex >= 0

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
    onJumpToManga: params.onJumpToManga,
    onJumpToAnimation: params.onJumpToAnimation,
    audios: params.audiosForSidebar,
    focusedAudio: params.focusedAudio,
    focusedAudioSrc: params.focusedAudioSrc,
    canPrevAudio: hasSelection && fallbackIndex > 0,
    canNextAudio: hasSelection && fallbackIndex < playbackOrder.length - 1,
    onPrevAudio: () => {
      if (!hasSelection || fallbackIndex <= 0) {
        return
      }
      const targetId = playbackOrder[clamp(fallbackIndex - 1, 0, playbackOrder.length - 1)]
      if (!targetId) {
        return
      }
      params.setSelectedAudioId(targetId)
      params.updateSettings({ sidebarFocus: 'main' })
    },
    onNextAudio: () => {
      if (!hasSelection || fallbackIndex >= playbackOrder.length - 1) {
        return
      }
      const targetId = playbackOrder[clamp(fallbackIndex + 1, 0, playbackOrder.length - 1)]
      if (!targetId) {
        return
      }
      params.setSelectedAudioId(targetId)
      params.updateSettings({ sidebarFocus: 'main' })
    },
  }
}
