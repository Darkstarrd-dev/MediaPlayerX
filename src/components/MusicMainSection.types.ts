import type { AppSettings } from '../contracts/settings'
import type { AudioItem, MusicLoopMode } from '../types'

export type MusicPopoverKey = 'volume' | 'shader' | 'shaderSettings'

export interface MusicMainSectionProps {
  active: boolean
  interruptByVideoPlayback: boolean
  playRequestNonce: number
  manageMode: boolean
  metadataManageMode: boolean
  metadataManageSelectionMode?: 'single' | 'multiple'
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes?: boolean
  onManageDelete: () => void
  onManageGroup?: () => void
  onManageMove?: () => void
  onClearManageSelection: () => void
  onToggleMetadataManageSelectionMode?: () => void
  canJumpToManga: boolean
  canJumpToAnimation: boolean
  canJumpToCover: boolean
  canJumpToBooklet: boolean
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  onJumpToCover: () => void
  onJumpToBooklet: () => void
  audios: AudioItem[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  mediaPreloadMemoryBudgetMb: number
  fullscreenVideoControlsMaxWidth: number
  audioPreloadItems: Array<{ id: string; src: string; sizeMb: number }>
  musicLoopMode: MusicLoopMode
  musicLoopModeLabel: string
  canPrevAudio: boolean
  canNextAudio: boolean
  fullscreenActive: boolean
  popoverDebugPinned: boolean
  paletteMode?: 'day' | 'night'
  onToggleFullscreen: () => void
  musicVisualizerSelectedShaderId: string
  musicVisualizerShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  musicVisualizerLayeredBackgroundShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  musicVisualizerLayeredForegroundShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  onMusicVisualizerSelectedShaderIdChange?: (value: string) => void
  onMusicVisualizerShaderSettingsChange: (patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>) => void
  onMusicVisualizerLayerShaderIdChange?: (layer: 'foreground' | 'background', value: string) => void
  onMusicVisualizerLayerShaderSettingsChange?: (
    layer: 'foreground' | 'background',
    patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>,
  ) => void
  onPrevAudio: () => void
  onNextAudio: () => void
  onCycleMusicLoopMode: () => void
}
