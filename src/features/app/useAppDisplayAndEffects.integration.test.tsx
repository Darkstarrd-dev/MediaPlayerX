import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useWriteDataAccessMock = vi.fn()
const useRuntimeCapabilitiesMock = vi.fn()
const useManageModeActionsMock = vi.fn()
const useManageAdReviewActionsMock = vi.fn()
const useEffectiveDisplayStateMock = vi.fn()
const useMetadataWriteBindingsMock = vi.fn()
const useResolvedMediaStateMock = vi.fn()
const useFullscreenPlaybackBindingsMock = vi.fn()
const useVectorUniverseBindingsMock = vi.fn()
const useAppInteractionEffectsMock = vi.fn()

vi.mock('../backend', () => ({
  useWriteDataAccess: (params: unknown) => useWriteDataAccessMock(params),
  useRuntimeCapabilities: (params: unknown) => useRuntimeCapabilitiesMock(params),
}))

vi.mock('./useManageModeActions', () => ({
  useManageModeActions: (params: unknown) => useManageModeActionsMock(params),
}))

vi.mock('./useManageAdReviewActions', () => ({
  useManageAdReviewActions: (params: unknown) => useManageAdReviewActionsMock(params),
}))

vi.mock('./useEffectiveDisplayState', () => ({
  useEffectiveDisplayState: (params: unknown) => useEffectiveDisplayStateMock(params),
}))

vi.mock('./useMetadataWriteBindings', () => ({
  useMetadataWriteBindings: (params: unknown) => useMetadataWriteBindingsMock(params),
}))

vi.mock('./useResolvedMediaState', () => ({
  useResolvedMediaState: (params: unknown) => useResolvedMediaStateMock(params),
}))

vi.mock('./useFullscreenPlaybackBindings', () => ({
  useFullscreenPlaybackBindings: (params: unknown) => useFullscreenPlaybackBindingsMock(params),
}))

vi.mock('./useVectorUniverseBindings', () => ({
  useVectorUniverseBindings: (params: unknown) => useVectorUniverseBindingsMock(params),
}))

vi.mock('./useAppInteractionEffects', () => ({
  useAppInteractionEffects: (params: unknown) => useAppInteractionEffectsMock(params),
}))

import { useAppDisplayAndEffects } from './useAppDisplayAndEffects'

type DisplayParams = Parameters<typeof useAppDisplayAndEffects>[0]

function createLooseState<T extends object>(overrides: Record<string, unknown>): T {
  return new Proxy(overrides, {
    get(target, property) {
      if (typeof property === 'string' && property in target) {
        return target[property]
      }
      if (
        typeof property === 'string' &&
        /^(set|on|go|run|clear|request|toggle|select|move|jump|adjust|ensure|apply|update|open|close)/.test(property)
      ) {
        return vi.fn()
      }
      return undefined
    },
  }) as T
}

describe('useAppDisplayAndEffects integration', () => {
  beforeEach(() => {
    useWriteDataAccessMock.mockReset()
    useRuntimeCapabilitiesMock.mockReset()
    useManageModeActionsMock.mockReset()
    useManageAdReviewActionsMock.mockReset()
    useEffectiveDisplayStateMock.mockReset()
    useMetadataWriteBindingsMock.mockReset()
    useResolvedMediaStateMock.mockReset()
    useFullscreenPlaybackBindingsMock.mockReset()
    useVectorUniverseBindingsMock.mockReset()
    useAppInteractionEffectsMock.mockReset()
  })

  it('会将读写适配层与管理动作正确拼装到返回结果', () => {
    const updateSettings = vi.fn()
    const setGradeByPackage = vi.fn()
    const setVideoCoverById = vi.fn()
    const setVideoCoverImageById = vi.fn()

    const mediaRepository = { id: 'repo-integration' } as unknown as DisplayParams['mediaRepository']
    const appSettings = createLooseState({
      mode: 'image',
      vectorMode: false,
      settingsOpen: false,
      sidebarRatio: 0.3,
      vectorPanelHeight: 220,
      thumbnailScale: 3,
      showNamesOnly: false,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      vectorThreshold: 0.42,
      sidebarFocus: 'sidebar',
      themeId: 'ocean',
      vectorUniverseMoveSpeed: 1,
      vectorUniverseSprintMultiplier: 1.4,
      vectorUniverseLookSensitivity: 1,
      vectorUniverseRaycastDistance: 320,
      vectorUniverseHelperScale: 1,
      vectorUniverseDispersion: 1,
      vectorUniverseWidgetSize: 1,
      lmStudioEndpoint: 'http://localhost:1234',
      lmStudioModel: 'model-a',
      shortcuts: {},
      vectorControls: {},
      updateSettings,
    })

    const sessionState = createLooseState({
      selectedPackageId: 'pkg-1',
      selectedSidebarNodeId: 'package:pkg-1',
      imageFocusActive: true,
      focusByPackage: {},
      setPageByPackage: vi.fn(),
      setVectorSearchResults: vi.fn(),
      setVectorFocusIndex: vi.fn(),
      setVectorPage: vi.fn(),
      setGradeByPackage,
      manageMode: true,
      setManageMode: vi.fn(),
      manageOperationHint: null,
      setManageOperationHint: vi.fn(),
      setDeleteConfirmOpen: vi.fn(),
      vectorUniverseOpen: false,
      setVectorUniverseOpen: vi.fn(),
      appBodyRef: { current: null },
      vectorPanelContentRef: { current: null },
      wasFullscreenRef: { current: false },
      lastExpandedSidebarRatioRef: { current: 0.3 },
      setAppBodyWidth: vi.fn(),
      gridRef: { current: null },
      setGridSize: vi.fn(),
      fullscreenEntryDisplay: 'single',
      setFullscreenEntryDisplay: vi.fn(),
      vectorSearchResults: [],
    })

    const mediaState = createLooseState({
      selectedVideoId: null,
      videoPlaying: false,
      setVideoPlaying: vi.fn(),
      videoTime: 0,
      setVideoTime: vi.fn(),
      videoRate: 1,
      setVideoRate: vi.fn(),
      videoVolume: 1,
      setVideoVolume: vi.fn(),
      videoMuted: false,
      setVideoMuted: vi.fn(),
      videoCoverById: {},
      setVideoCoverById,
      videoCoverImageById: {},
      setVideoCoverImageById,
      videoDurationById: {},
      setVideoDurationById: vi.fn(),
      fullscreenActive: false,
      setFullscreenActive: vi.fn(),
      fullscreenDisplay: 'image',
      setFullscreenDisplay: vi.fn(),
      fullscreenSwapped: false,
      setFullscreenSwapped: vi.fn(),
      fullscreenVideoFocus: false,
      setFullscreenVideoFocus: vi.fn(),
      fullscreenSplit: 0.5,
      setFullscreenSplit: vi.fn(),
      showFullscreenFooter: false,
      setShowFullscreenFooter: vi.fn(),
      goPlaylist: vi.fn(),
      selectVideoFromBrowser: vi.fn(),
      adjustVideoRate: vi.fn(),
      adjustVideoVolume: vi.fn(),
    })

    const readNavigationState = createLooseState({
      searchPanelMode: 'feature',
      searchPanelCollapsed: false,
      setSearchPanelCollapsed: vi.fn(),
      setSearchPanelMode: vi.fn(),
      featureSearchActive: true,
      featureTagPickerOpen: false,
      vectorResultsActive: false,
      backendRead: { page: { data: null, snapshot: null }, metadata: { data: null, snapshot: null } },
      scopedImageSourcesEffective: [],
      packageByIdEffective: new Map(),
      videoByIdEffective: new Map(),
      rootScopedVideoIds: [],
      rootScopedPackageIds: [],
      allScopedRefs: [],
      normalImageSourceNodeIdMap: {},
      vectorSidebarNodes: [],
      vectorResultPackageNodeIdMap: {},
      flatSidebarNodes: [],
      sidebarNodeById: new Map(),
      imageSourceNodeIdMap: {},
      videoNodeIdMap: {},
      videosForSidebar: [],
      ensureSidebarNodeVisible: vi.fn(),
      sidebarCheckedNodeIds: ['node-a'],
      imageCheckedIds: ['image-a'],
      activeSelectionScope: 'image',
      clearAllSelections: vi.fn(),
      orderedRootScopedPackages: [],
      orderedRootScopedImageRefs: [],
      normalizedThumbnailScale: 1,
      actualCellWidth: 180,
      actualMediaHeight: 180,
      pagedPageSize: 40,
      activePackage: null,
      focusedRef: null,
      focusedImage: null,
      focusedImagePackage: null,
      metadataImagePackage: null,
      currentGrade: null,
      refsInPage: [],
      setImageFocus: vi.fn(),
      moveImage: vi.fn(),
      moveImageVertical: vi.fn(),
      jumpImageBoundary: vi.fn(),
      goPackage: vi.fn(),
      goPrevPage: vi.fn(),
      goNextPage: vi.fn(),
      handleSidebarNavigationKey: vi.fn(),
      pageStart: 0,
      normalizedPageIndex: 0,
      imageTotalPages: 1,
    })

    const backendWrite = { id: 'backend-write' }
    const manageModeActions = {
      toggleManageMode: vi.fn(),
      runManageHideAction: vi.fn(),
      requestManageDelete: vi.fn(),
      confirmManageDelete: vi.fn(),
    }
    const manageAdReview = { pending: false, task: null }
    const runtimeCapabilities = { matrix: [] }
    const metadataWriteBindings = { applyPackageGrade: vi.fn() }

    useWriteDataAccessMock.mockReturnValue(backendWrite)
    useManageModeActionsMock.mockReturnValue(manageModeActions)
    useManageAdReviewActionsMock.mockReturnValue(manageAdReview)
    useRuntimeCapabilitiesMock.mockReturnValue(runtimeCapabilities)
    useEffectiveDisplayStateMock.mockReturnValue({
      backendPageSnapshot: null,
      activePackageForDisplay: null,
      refsInPageEffective: [],
      pageStartEffective: 0,
      normalizedPageIndexEffective: 0,
      imageTotalPagesEffective: 1,
      metadataImageEffective: null,
      metadataImagePackageEffective: null,
      currentGradeEffective: null,
      focusedVideo: null,
      focusedVideoDurationSec: 0,
      focusedVideoCoverColor: null,
      focusedVideoCoverImageLocator: null,
      focusedVideoEffective: null,
    })
    useMetadataWriteBindingsMock.mockReturnValue(metadataWriteBindings)
    useResolvedMediaStateMock.mockReturnValue({
      thumbnailImageUrlById: {},
      metadataImageSrc: null,
      fullscreenImageSrc: null,
      focusedVideoSrc: null,
      focusedVideoCoverImageSrc: null,
    })
    useFullscreenPlaybackBindingsMock.mockReturnValue({
      videoShortcutActive: false,
      fullscreenAlignRequest: null,
      applyAutoplayIntervalByIndex: vi.fn(),
      requestFullscreenAlign: vi.fn(),
      setFullscreenActiveWithAutoStop: vi.fn(),
    })
    useVectorUniverseBindingsMock.mockReturnValue({
      runVectorSearch: vi.fn(),
      goToFromSearchMode: vi.fn(),
      vectorUniverseSectionProps: {},
    })

    const { result } = renderHook(() =>
      useAppDisplayAndEffects({
        appSettings: appSettings as DisplayParams['appSettings'],
        benchSettings: { enabled: false } as DisplayParams['benchSettings'],
        mediaRepository,
        sessionState: sessionState as DisplayParams['sessionState'],
        mediaState: mediaState as DisplayParams['mediaState'],
        readNavigationState: readNavigationState as DisplayParams['readNavigationState'],
      }),
    )

    expect(useWriteDataAccessMock).toHaveBeenCalledWith({
      repository: mediaRepository,
      setGradeByPackage,
      setVideoCoverById,
      setVideoCoverImageById,
    })
    expect(useManageModeActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'image',
        manageMode: true,
        backendWrite,
      }),
    )

    expect(result.current.backendWrite).toBe(backendWrite)
    expect(result.current.manageAdReview).toBe(manageAdReview)
    expect(result.current.toggleManageMode).toBe(manageModeActions.toggleManageMode)
    expect(result.current.metadataWriteBindings).toBe(metadataWriteBindings)
    expect(result.current.runtimeCapabilities).toBe(runtimeCapabilities)
  })

  it('会将 metadata 写绑定透传给交互副作用层', () => {
    const applyPackageGrade = vi.fn()
    useWriteDataAccessMock.mockReturnValue({})
    useManageModeActionsMock.mockReturnValue({
      toggleManageMode: vi.fn(),
      runManageHideAction: vi.fn(),
      requestManageDelete: vi.fn(),
      confirmManageDelete: vi.fn(),
    })
    useManageAdReviewActionsMock.mockReturnValue({})
    useRuntimeCapabilitiesMock.mockReturnValue({})
    useEffectiveDisplayStateMock.mockReturnValue({
      backendPageSnapshot: null,
      activePackageForDisplay: null,
      refsInPageEffective: [],
      pageStartEffective: 0,
      normalizedPageIndexEffective: 0,
      imageTotalPagesEffective: 1,
      metadataImageEffective: null,
      metadataImagePackageEffective: null,
      currentGradeEffective: null,
      focusedVideo: null,
      focusedVideoDurationSec: 0,
      focusedVideoCoverColor: null,
      focusedVideoCoverImageLocator: null,
      focusedVideoEffective: null,
    })
    useMetadataWriteBindingsMock.mockReturnValue({ applyPackageGrade })
    useResolvedMediaStateMock.mockReturnValue({
      thumbnailImageUrlById: {},
      metadataImageSrc: null,
      fullscreenImageSrc: null,
      focusedVideoSrc: null,
      focusedVideoCoverImageSrc: null,
    })
    useFullscreenPlaybackBindingsMock.mockReturnValue({
      videoShortcutActive: false,
      fullscreenAlignRequest: null,
      applyAutoplayIntervalByIndex: vi.fn(),
      requestFullscreenAlign: vi.fn(),
      setFullscreenActiveWithAutoStop: vi.fn(),
    })
    useVectorUniverseBindingsMock.mockReturnValue({
      runVectorSearch: vi.fn(),
      goToFromSearchMode: vi.fn(),
      vectorUniverseSectionProps: {},
    })

    const appSettings = createLooseState({ mode: 'image', updateSettings: vi.fn() })
    const sessionState = createLooseState({
      setGradeByPackage: vi.fn(),
      vectorSearchResults: [],
      setManageMode: vi.fn(),
      setDeleteConfirmOpen: vi.fn(),
      setManageOperationHint: vi.fn(),
      setVectorSearchResults: vi.fn(),
      setVectorFocusIndex: vi.fn(),
      setVectorPage: vi.fn(),
    })
    const mediaState = createLooseState({
      setVideoCoverById: vi.fn(),
      setVideoCoverImageById: vi.fn(),
      setFullscreenActive: vi.fn(),
    })
    const readNavigationState = createLooseState({
      backendRead: { page: { data: null, snapshot: null }, metadata: { data: null, snapshot: null } },
      packageByIdEffective: new Map(),
      videoByIdEffective: new Map(),
      clearAllSelections: vi.fn(),
      imageCheckedIds: [],
      sidebarCheckedNodeIds: [],
      activeSelectionScope: null,
      setSearchPanelMode: vi.fn(),
      setSearchPanelCollapsed: vi.fn(),
      orderedRootScopedPackages: [],
      orderedRootScopedImageRefs: [],
      allScopedRefs: [],
      normalImageSourceNodeIdMap: {},
      scopedImageSourcesEffective: [],
      videosForSidebar: [],
      flatSidebarNodes: [],
      sidebarNodeById: new Map(),
      imageSourceNodeIdMap: {},
      videoNodeIdMap: {},
    })

    const mediaRepository = { id: 'repo-b' } as unknown as DisplayParams['mediaRepository']

    renderHook(() =>
      useAppDisplayAndEffects({
        appSettings: appSettings as DisplayParams['appSettings'],
        benchSettings: { enabled: false } as DisplayParams['benchSettings'],
        mediaRepository,
        sessionState: sessionState as DisplayParams['sessionState'],
        mediaState: mediaState as DisplayParams['mediaState'],
        readNavigationState: readNavigationState as DisplayParams['readNavigationState'],
      }),
    )

    expect(useAppInteractionEffectsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applyPackageGrade,
      }),
    )
  })
})
