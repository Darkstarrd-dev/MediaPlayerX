import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAppDisplayResources } from './useAppDisplayResources'
import { useResolvedMediaState } from './useResolvedMediaState'

vi.mock('./useEffectiveDisplayState', () => ({
  useEffectiveDisplayState: vi.fn(() => ({
    backendPageSnapshot: null,
    activePackageForDisplay: null,
    refsInPageEffective: [
      { packageId: 'pkg-raw', imageIndex: 0 },
    ],
    pageStartEffective: 0,
    normalizedPageIndexEffective: 0,
    imageTotalPagesEffective: 1,
    metadataImageEffective: null,
    metadataImagePackageEffective: null,
    currentGradeEffective: null,
    focusedVideo: null,
    focusedAudio: null,
    focusedVideoDurationSec: 0,
    focusedVideoCoverColor: '#000000',
    focusedVideoCoverImageLocator: null,
    focusedVideoEffective: null,
  })),
}))

vi.mock('./useMetadataWriteBindings', () => ({
  useMetadataWriteBindings: vi.fn(() => ({
    metadataPending: false,
    applyPackageGrade: vi.fn(),
    applyPackageMetadata: vi.fn(),
    applyVideoMetadata: vi.fn(),
    applyAudioMetadata: vi.fn(),
  })),
}))

vi.mock('./workspaceAdReviewSidebarContext', () => ({
  resolveAdReviewSidebarContext: vi.fn(() => ({
    adReviewFocusTask: {
      task_id: 'task-1',
      status: 'running',
      candidates: [
        { image_id: 'img-focus-1' },
      ],
    },
    adReviewResultsMode: true,
    effectiveSidebarNodeById: new Map(),
    selectedSidebarNode: null,
    sidebarImageTreeNodes: [],
  })),
}))

vi.mock('./workspaceAdReviewPageDerivations', () => ({
  shouldGroupAdReviewByPackageRows: vi.fn(() => true),
  resolveAdReviewPageDerivations: vi.fn(() => ({
    visibleImageRefsForMain: [
      { packageId: 'pkg-focus', imageIndex: 0 },
    ],
    refsInPageBase: [
      { packageId: 'pkg-focus', imageIndex: 0 },
    ],
    pageStartForMain: 0,
    normalizedPageIndexForMain: 0,
    imageTotalPagesForMain: 1,
  })),
}))

vi.mock('./workspaceImageDerivations', () => ({
  resolveRefsInPageForDisplay: vi.fn(() => [
    { packageId: 'pkg-focus', imageIndex: 0 },
  ]),
}))

vi.mock('./useResolvedMediaState', () => ({
  useResolvedMediaState: vi.fn(() => ({
    thumbnailImageUrlById: {},
    metadataImageSrc: null,
    fullscreenImageSrc: null,
    focusedVideoSrc: null,
    focusedAudioSrc: null,
    focusedVideoCoverImageSrc: null,
    sourceCoverImageUrlBySourceId: {},
  })),
}))

describe('useAppDisplayResources (ad-review focus refs)', () => {
  it('passes focus-derived refs into media resolver targets', () => {
    const mediaRepository = {} as never

    renderHook(() =>
      useAppDisplayResources({
        appSettings: {
          mode: 'image',
          showNamesOnly: false,
          thumbnailQuality: 80,
          thumbnailWidth: 320,
        } as never,
        benchSettings: {
          enabled: false,
          mode: null,
          candidateId: null,
          runTag: null,
          resolvedMedia: {},
          imageLoadingSkeleton: { mode: 'off' },
          reactProfiler: false,
          e2e: {},
        },
        mediaRepository,
        importBusy: false,
        sessionState: {
          imageFocusActive: false,
          manageMode: true,
          metadataManageMode: false,
          adReviewFocusTaskId: 'task-1',
          adReviewPageIndex: 0,
          setManageOperationHint: vi.fn(),
        } as never,
        mediaState: {
          selectedVideoId: '',
          videoDurationById: {},
          videoCoverById: {},
          videoCoverImageById: {},
          fullscreenActive: false,
        } as never,
        readNavigationState: {
          backendRead: {
            page: { data: null, snapshot: null },
            metadata: { data: null, snapshot: null },
          },
          vectorResultsActive: false,
          packageByIdEffective: new Map(),
          scopedImageSourcesEffective: [],
          videoByIdEffective: new Map(),
          audioByIdEffective: new Map(),
          audiosForSidebar: [],
          videosForSidebar: [],
          selectedAudioId: '',
          focusedRef: null,
          focusedImage: null,
          selectedSidebarNodeId: null,
          activePackage: null,
          visibleImageRefs: [],
          refsInPage: [],
          pageStart: 0,
          normalizedPageIndex: 0,
          imageTotalPages: 1,
          pagedPageSize: 20,
          metadataImagePackage: null,
          currentGrade: null,
          actualCellWidth: 180,
          actualMediaHeight: 120,
          orderedRootScopedImageRefs: [],
          imageTreeForSidebar: [],
          sidebarCheckedNodeIds: [],
          imageCheckedIdSet: new Set(),
          sidebarNodeById: new Map(),
        } as never,
        manageBindings: {
          backendWrite: {
            pending: {
              metadata: false,
            },
          },
          manageAdReview: {
            queueTasks: [],
            hideUncheckedNonChecked: true,
          },
        } as never,
      }),
    )

    const firstCall = vi.mocked(useResolvedMediaState).mock.calls[0]?.[0]
    expect(firstCall?.refsInPage).toEqual([
      { packageId: 'pkg-focus', imageIndex: 0 },
    ])
  })
})
