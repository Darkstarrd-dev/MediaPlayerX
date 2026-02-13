import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { AudioItem } from '../../types'
import { clamp } from '../../utils/ui'

interface BuildMusicMainSectionPropsParams {
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
  audiosForSidebar: AudioItem[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  selectedAudioId: string
  audioPlaylistIds: string[]
  audioByIdEffective: Map<string, AudioItem>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>
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
    audios: params.audiosForSidebar,
    selectedAudioId: params.selectedAudioId,
    focusedAudio: params.focusedAudio,
    focusedAudioSrc: params.focusedAudioSrc,
    canPrevAudio: hasSelection && fallbackIndex > 0,
    canNextAudio: hasSelection && fallbackIndex < playbackOrder.length - 1,
    onSelectAudio: (audioId: string) => {
      params.setSelectedAudioId(audioId)
      params.setAudioPlaylistIds((previous) => {
        if (previous.includes(audioId)) {
          return previous
        }
        return [...previous, audioId]
      })
      params.updateSettings({ sidebarFocus: 'main' })
    },
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
