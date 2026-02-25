import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppEffects } from './useAppEffects'

type UseAppEffectsParams = Parameters<typeof useAppEffects>[0]

function createBaseParams(overrides: Partial<UseAppEffectsParams> = {}): UseAppEffectsParams {
  return {
    appBodyRef: { current: null },
    gridElement: null,
    vectorPanelContentRef: { current: null },
    wasFullscreenRef: { current: false },
    lastExpandedSidebarRatioRef: { current: 0.3 },
    mode: 'video',
    showNamesOnly: false,
    sidebarRatio: 0.3,
    sidebarCollapseRatio: 0.03,
    normalizeSidebarRatio: (value) => value,
    sidebarCollapsed: false,
    sidebarFocus: 'main',
    vectorResultsActive: false,
    activePackage: null,
    imageFocusActive: false,
    focusByPackage: {},
    pagedPageSize: 40,
    vectorSearchResults: [],
    vectorFocusIndex: 0,
    selectedPackageId: '',
    orderedRootScopedPackages: [],
    rootScopedPackageIds: new Set(),
    flatSidebarNodes: [],
    focusedRef: null,
    imageSourceNodeIdMap: new Map(),
    selectedSidebarNodeId: null,
    sidebarNodeById: new Map(),
    vectorResultPackageNodeIdMap: new Map(),
    vectorSidebarNodes: [],
    videosForSidebar: [],
    audiosForSidebar: [],
    rootScopedVideoIds: new Set(),
    rootScopedAudioIds: new Set(),
    selectedVideoId: '',
    videoQueueSource: 'sidebar',
    selectedAudioId: '',
    videoNodeIdMap: new Map(),
    audioNodeIdMap: new Map(),
    ensureSidebarNodeVisible: vi.fn(),
    fullscreenActive: true,
    fullscreenDisplay: 'dual',
    fullscreenVideoFocus: true,
    autoPlayEnabled: true,
    autoPlayInterval: 1,
    moveImage: vi.fn(),
    vectorMode: false,
    manageMode: false,
    metadataManageMode: false,
    adReviewPanelOpen: false,
    adReviewFocusTaskId: null,
    searchPanelCollapsed: true,
    searchPanelMode: 'vector',
    workspaceBottomPanelHeight: 220,
    featureTagPickerOpen: false,
    styleId: 'default',
    paletteId: 'default',
    paletteMode: 'day',
    paletteDayId: 'default',
    paletteNightId: 'default',
    themeId: 'default',
    settingsBackdropOpacity: 60,
    setAppBodyWidth: vi.fn(),
    setGridSize: vi.fn(),
    setVectorFocusIndex: vi.fn(),
    setVectorPage: vi.fn(),
    setPageByPackage: vi.fn(),
    setSelectedPackageId: vi.fn(),
    setSelectedSidebarNodeId: vi.fn(),
    setSelectedAudioId: vi.fn(),
    selectVideoFromBrowser: vi.fn(),
    setFullscreenEntryDisplay: vi.fn(),
    setFullscreenDisplay: vi.fn(),
    setFullscreenVideoFocus: vi.fn(),
    setFullscreenSwapped: vi.fn(),
    setShowFullscreenFooter: vi.fn(),
    updateSettings: vi.fn(),
    ...overrides,
  }
}

describe('autoplay-regression/app-effects', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('video 模式 fullscreen dual 且视频焦点时仍会触发 autoplay 推图', () => {
    const params = createBaseParams()

    renderHook(() => useAppEffects(params))
    vi.advanceTimersByTime(1100)

    expect(params.moveImage).toHaveBeenCalledWith(1, 'autoplay')
  })

  it('fullscreen video-only 时不会触发图片 autoplay', () => {
    const params = createBaseParams({ fullscreenDisplay: 'video-only' })

    renderHook(() => useAppEffects(params))
    vi.advanceTimersByTime(2100)

    expect(params.moveImage).not.toHaveBeenCalled()
  })
})
