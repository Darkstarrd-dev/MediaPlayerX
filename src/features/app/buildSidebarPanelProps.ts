import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { SidebarNode } from '../../types'

interface BuildSidebarPanelPropsParams {
  mode: AppSettings['mode']
  sidebarFocus: AppSettings['sidebarFocus']
  sidebarRatio: number
  sidebarMinWidth: number
  sidebarFontSize: number
  sidebarCountFontSize: number
  sidebarIndentStep: number
  sidebarVerticalGap: number
  currentRootLabel: string | null
  searchResultsMode: boolean
  selectedSidebarNodeId: string | null
  canSetCurrentRoot: boolean
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  musicRootNodeId: string | null
  imageTreeNodes: SidebarNode[]
  videoTreeNodes: SidebarNode[]
  audioTreeNodes: SidebarNode[]
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  selectedVideoId: string
  selectedAudioId: string
  vectorResultsActive: boolean
  featureSearchActive: boolean
  searchResultsReadOnly: boolean
  manageMode: boolean
  metadataManageMode: boolean
  checkedSidebarNodeIdSet: Set<string>
  focusedRef: { packageId: string; imageIndex: number } | null
  playlistIds: string[]
  goToFromSearchMode: () => void
  setSelectedSidebarNodeId: (nodeId: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setSelectedPackageId: (packageId: string) => void
  selectVideoFromBrowser: (videoId: string) => void
  setSelectedAudioId: (audioId: string) => void
  collapseSidebar: () => void
  applyCurrentRootFromSelection: () => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  audioPlaylistIds: string[]
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>
  onToggleManageNode: (nodeId: string, shiftKey: boolean) => void
  onCheckManageNode: (nodeId: string) => void
}

export function buildSidebarPanelProps(params: BuildSidebarPanelPropsParams) {
  return {
    mode: params.mode,
    sidebarFocus: params.sidebarFocus,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    sidebarFontSize: params.sidebarFontSize,
    sidebarCountFontSize: params.sidebarCountFontSize,
    sidebarIndentStep: params.sidebarIndentStep,
    sidebarVerticalGap: params.sidebarVerticalGap,
    currentRootLabel: params.searchResultsMode ? '检索结果' : params.currentRootLabel,
    selectedSidebarNodeId: params.selectedSidebarNodeId,
    canSetCurrentRoot: params.canSetCurrentRoot,
    imageRootNodeId: params.imageRootNodeId,
    videoRootNodeId: params.videoRootNodeId,
    musicRootNodeId: params.musicRootNodeId,
    imageTreeNodes: params.imageTreeNodes,
    videoTreeNodes: params.videoTreeNodes,
    audioTreeNodes: params.audioTreeNodes,
    imageNodeLoadStateById: params.imageNodeLoadStateById,
    selectedPackageId: params.selectedPackageId,
    selectedVideoId: params.selectedVideoId,
    selectedAudioId: params.selectedAudioId,
    imageHighlightByNode: params.vectorResultsActive,
    searchResultMode: params.searchResultsMode,
    searchResultReadonly: params.searchResultsReadOnly,
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    checkedSidebarNodeIds: params.checkedSidebarNodeIdSet,
    canGoToFromSearchMode: params.vectorResultsActive
      ? Boolean(params.focusedRef)
      : params.featureSearchActive,
    playlistIds: params.playlistIds,
    audioPlaylistIds: params.audioPlaylistIds,
    onGoToFromSearchMode: params.goToFromSearchMode,
    onSelectNode: (nodeId: string) => {
      if (params.mode === 'image' && params.vectorResultsActive) {
        return
      }

      params.setSelectedSidebarNodeId(nodeId)
      params.updateSettings({ sidebarFocus: 'sidebar' })
    },
    onSelectPackage: params.setSelectedPackageId,
    onSelectVideo: params.selectVideoFromBrowser,
    onSelectAudio: params.setSelectedAudioId,
    onCollapseSidebar: params.collapseSidebar,
    onSetCurrentRoot: params.applyCurrentRootFromSelection,
    onResetRoot: () => {
      if (params.mode === 'image') {
        params.updateSettings({ imageRootNodeId: null })
        return
      }
      if (params.mode === 'video') {
        params.updateSettings({ videoRootNodeId: null })
        return
      }
      params.updateSettings({ musicRootNodeId: null })
    },
    onToggleVideoPlaylist: (videoId: string, checked: boolean) => {
      params.setPlaylistIds((previous) => {
        if (checked) {
          if (previous.includes(videoId)) {
            return previous
          }
          return [...previous, videoId]
        }
        return previous.filter((id) => id !== videoId)
      })
    },
    onToggleManageNode: params.onToggleManageNode,
    onCheckManageNode: params.onCheckManageNode,
    onToggleAudioPlaylist: (audioId: string, checked: boolean) => {
      params.setAudioPlaylistIds((previous) => {
        if (checked) {
          if (previous.includes(audioId)) {
            return previous
          }
          return [...previous, audioId]
        }
        return previous.filter((id) => id !== audioId)
      })
    },
  }
}
