import { describe, expect, it, vi } from 'vitest'

import type { SidebarNode } from '../../types'
import { buildSidebarPanelProps } from './buildSidebarPanelProps'

const SIDEBAR_NODE_FIXTURE: SidebarNode = {
  id: 'package:pkg-1.zip',
  label: 'pkg-1.zip',
  kind: 'package',
  children: [],
  packageId: 'pkg-1',
  imageSourceId: 'pkg-1',
  directImageCount: 2,
  pathKey: 'pkg-1.zip',
}

describe('buildSidebarPanelProps', () => {
  it('检索结果模式下固定根标题，向量结果模式阻断图片侧栏选中', () => {
    const setSelectedSidebarNodeId = vi.fn()
    const updateSettings = vi.fn()

    const props = buildSidebarPanelProps({
      mode: 'image',
      sidebarFocus: 'sidebar',
      sidebarRatio: 0.3,
      sidebarMinWidth: 220,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 16,
      sidebarVerticalGap: 4,
      currentRootLabel: '当前根',
      searchResultsMode: true,
      selectedSidebarNodeId: 'package:pkg-1.zip',
      canSetCurrentRoot: true,
      imageRootNodeId: null,
      videoRootNodeId: null,
      musicRootNodeId: null,
      imageTreeNodes: [SIDEBAR_NODE_FIXTURE],
      videoTreeNodes: [],
      audioTreeNodes: [],
      imageNodeLoadStateById: {},
      selectedPackageId: 'pkg-1',
      selectedVideoId: '',
      selectedAudioId: '',
      vectorResultsActive: true,
      featureSearchActive: false,
      searchResultsReadOnly: true,
      manageMode: false,
      metadataManageMode: false,
      checkedSidebarNodeIdSet: new Set<string>(),
      focusedRef: null,
      playlistIds: [],
      goToFromSearchMode: vi.fn(),
      setSelectedSidebarNodeId,
      updateSettings,
      setSelectedPackageId: vi.fn(),
      selectVideoFromBrowser: vi.fn(),
      setSelectedAudioId: vi.fn(),
      collapseSidebar: vi.fn(),
      applyCurrentRootFromSelection: vi.fn(),
      setPlaylistIds: vi.fn(),
      audioPlaylistIds: [],
      setAudioPlaylistIds: vi.fn(),
      onToggleManageNode: vi.fn(),
    })

    expect(props.currentRootLabel).toBe('检索结果')
    expect(props.canGoToFromSearchMode).toBe(false)

    props.onSelectNode('folder:ignored')
    expect(setSelectedSidebarNodeId).not.toHaveBeenCalled()
    expect(updateSettings).not.toHaveBeenCalled()
  })

  it('可按模式重置 root，并支持播放列表 toggle 增删', () => {
    const setPlaylistIds = vi.fn()
    const updateSettings = vi.fn()

    const props = buildSidebarPanelProps({
      mode: 'video',
      sidebarFocus: 'sidebar',
      sidebarRatio: 0.3,
      sidebarMinWidth: 220,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 16,
      sidebarVerticalGap: 4,
      currentRootLabel: null,
      searchResultsMode: false,
      selectedSidebarNodeId: null,
      canSetCurrentRoot: true,
      imageRootNodeId: null,
      videoRootNodeId: 'video:root',
      musicRootNodeId: null,
      imageTreeNodes: [],
      videoTreeNodes: [SIDEBAR_NODE_FIXTURE],
      audioTreeNodes: [],
      imageNodeLoadStateById: {},
      selectedPackageId: '',
      selectedVideoId: 'video-1',
      selectedAudioId: '',
      vectorResultsActive: false,
      featureSearchActive: true,
      searchResultsReadOnly: false,
      manageMode: false,
      metadataManageMode: false,
      checkedSidebarNodeIdSet: new Set<string>(),
      focusedRef: null,
      playlistIds: ['video-2'],
      goToFromSearchMode: vi.fn(),
      setSelectedSidebarNodeId: vi.fn(),
      updateSettings,
      setSelectedPackageId: vi.fn(),
      selectVideoFromBrowser: vi.fn(),
      setSelectedAudioId: vi.fn(),
      collapseSidebar: vi.fn(),
      applyCurrentRootFromSelection: vi.fn(),
      setPlaylistIds,
      audioPlaylistIds: [],
      setAudioPlaylistIds: vi.fn(),
      onToggleManageNode: vi.fn(),
    })

    props.onResetRoot()
    expect(updateSettings).toHaveBeenCalledWith({ videoRootNodeId: null })

    props.onToggleVideoPlaylist('video-1', true)
    const addUpdater = setPlaylistIds.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(addUpdater?.(['video-2'])).toEqual(['video-2', 'video-1'])
    expect(addUpdater?.(['video-1', 'video-2'])).toEqual(['video-1', 'video-2'])

    props.onToggleVideoPlaylist('video-2', false)
    const removeUpdater = setPlaylistIds.mock.calls[1]?.[0] as ((value: string[]) => string[]) | undefined
    expect(removeUpdater?.(['video-1', 'video-2'])).toEqual(['video-1'])
  })

  it('元数据管理模式开启时也会展示 Sidebar checker', () => {
    const props = buildSidebarPanelProps({
      mode: 'image',
      sidebarFocus: 'sidebar',
      sidebarRatio: 0.3,
      sidebarMinWidth: 220,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 16,
      sidebarVerticalGap: 4,
      currentRootLabel: '当前根',
      searchResultsMode: false,
      selectedSidebarNodeId: null,
      canSetCurrentRoot: true,
      imageRootNodeId: null,
      videoRootNodeId: null,
      musicRootNodeId: null,
      imageTreeNodes: [SIDEBAR_NODE_FIXTURE],
      videoTreeNodes: [],
      audioTreeNodes: [],
      imageNodeLoadStateById: {},
      selectedPackageId: 'pkg-1',
      selectedVideoId: '',
      selectedAudioId: '',
      vectorResultsActive: false,
      featureSearchActive: false,
      searchResultsReadOnly: false,
      manageMode: false,
      metadataManageMode: true,
      checkedSidebarNodeIdSet: new Set<string>(),
      focusedRef: null,
      playlistIds: [],
      goToFromSearchMode: vi.fn(),
      setSelectedSidebarNodeId: vi.fn(),
      updateSettings: vi.fn(),
      setSelectedPackageId: vi.fn(),
      selectVideoFromBrowser: vi.fn(),
      setSelectedAudioId: vi.fn(),
      collapseSidebar: vi.fn(),
      applyCurrentRootFromSelection: vi.fn(),
      setPlaylistIds: vi.fn(),
      audioPlaylistIds: [],
      setAudioPlaylistIds: vi.fn(),
      onToggleManageNode: vi.fn(),
    })

    expect(props.manageMode).toBe(true)
  })

  it('music 模式可重置根目录并维护音频播放列表', () => {
    const updateSettings = vi.fn()
    const setAudioPlaylistIds = vi.fn()

    const props = buildSidebarPanelProps({
      mode: 'music',
      sidebarFocus: 'sidebar',
      sidebarRatio: 0.3,
      sidebarMinWidth: 220,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 16,
      sidebarVerticalGap: 4,
      currentRootLabel: null,
      searchResultsMode: false,
      selectedSidebarNodeId: null,
      canSetCurrentRoot: true,
      imageRootNodeId: null,
      videoRootNodeId: null,
      musicRootNodeId: 'audio:root',
      imageTreeNodes: [],
      videoTreeNodes: [],
      audioTreeNodes: [SIDEBAR_NODE_FIXTURE],
      imageNodeLoadStateById: {},
      selectedPackageId: '',
      selectedVideoId: '',
      selectedAudioId: 'audio-1',
      vectorResultsActive: false,
      featureSearchActive: false,
      searchResultsReadOnly: false,
      manageMode: false,
      metadataManageMode: false,
      checkedSidebarNodeIdSet: new Set<string>(),
      focusedRef: null,
      playlistIds: [],
      audioPlaylistIds: ['audio-2'],
      goToFromSearchMode: vi.fn(),
      setSelectedSidebarNodeId: vi.fn(),
      updateSettings,
      setSelectedPackageId: vi.fn(),
      selectVideoFromBrowser: vi.fn(),
      setSelectedAudioId: vi.fn(),
      collapseSidebar: vi.fn(),
      applyCurrentRootFromSelection: vi.fn(),
      setPlaylistIds: vi.fn(),
      setAudioPlaylistIds,
      onToggleManageNode: vi.fn(),
    })

    props.onResetRoot()
    expect(updateSettings).toHaveBeenCalledWith({ musicRootNodeId: null })

    props.onToggleAudioPlaylist('audio-1', true)
    const addUpdater = setAudioPlaylistIds.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(addUpdater?.(['audio-2'])).toEqual(['audio-2', 'audio-1'])

    props.onToggleAudioPlaylist('audio-2', false)
    const removeUpdater = setAudioPlaylistIds.mock.calls[1]?.[0] as ((value: string[]) => string[]) | undefined
    expect(removeUpdater?.(['audio-1', 'audio-2'])).toEqual(['audio-1'])
  })
})
