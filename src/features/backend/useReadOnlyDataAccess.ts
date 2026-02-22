import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FeatureFilterDto } from '../../contracts/backend'
import {
  mapImageMetadataDto,
  mapImagePageDto,
  mapImageSidebarTreeDto,
  mapLibrarySnapshotAnyDto,
  mapLibrarySnapshotDto,
  type ImageMetadataViewModel,
  type ImagePageViewModel,
  type ImageSidebarTreeViewModel,
  type LibrarySnapshotViewModel,
} from './mappers'
import {
  createEmptySliceState,
  scheduleReadSlice,
  type ReadSliceState,
} from './readSliceUtils'
import type { MediaRepository, SynchronousMediaRepository } from './repository'
import type { BrowserMode, FocusedImageRef } from '../../types'
import { getBenchSettings } from '../perf/benchSettings'

const DEFAULT_IPC_TIMEOUT_MS = 8_000
const PAGE_READ_DEBOUNCE_MS = 72
const METADATA_READ_DEBOUNCE_MS = 84
const TRANSIENT_LIBRARY_CHANGE_REASONS = new Set([
  'thumbnail-rendering-start',
  'thumbnail-rendering-progress',
  'thumbnail-rendering-end',
])

function parseOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }
  return null
}

function resolveLiteLibrarySnapshotEnabled(): boolean {
  const benchSettings = getBenchSettings()
  if (benchSettings.enabled && typeof benchSettings.librarySnapshotLite === 'boolean') {
    return benchSettings.librarySnapshotLite
  }

  const envValue = parseOptionalBoolean(import.meta.env.VITE_ENABLE_LITE_LIBRARY_SNAPSHOT)
  if (envValue !== null) {
    return envValue
  }
  return true
}

/**
 * 解析 P3 节流策略开关。
 * bench 模式下可通过 `importRefreshThrottle: false` 禁用 120ms 聚合窗口与
 * import-task-updated 的范围收窄，以便与旧刷新逻辑做对照基线。
 */
function resolveImportRefreshThrottleEnabled(): boolean {
  const benchSettings = getBenchSettings()
  if (benchSettings.enabled && typeof benchSettings.importRefreshThrottle === 'boolean') {
    return benchSettings.importRefreshThrottle
  }
  return true
}

function shouldFallbackToLegacySnapshotRead(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  if (!message.includes('readlibrarysnapshotlite')) {
    return false
  }
  return (
    message.includes('not a function') ||
    message.includes('is undefined') ||
    message.includes('no handler registered') ||
    message.includes('does not exist')
  )
}

interface UseReadOnlyDataAccessParams {
  repository: MediaRepository
  mode: BrowserMode
  includeHidden: boolean
  importBusy?: boolean
  suspendLibraryChangedRefresh?: boolean
  selectedSourceId: string | null
  pageIndex: number
  pageSize: number
  showNamesOnly: boolean
  focusedRef: FocusedImageRef | null
  vectorResultsActive: boolean
  featureNameQuery: string
  featureWorkTitleQuery: string
  featureSeriesIdQuery: string
  featureCircleQuery: string
  featureAuthorQuery: string
  featureTags: string[]
  featureGradeFilter: number | null
  gradeByPackage: Record<string, number | null>
}

interface BackendReadErrors {
  library: string | null
  sidebar: string | null
  page: string | null
  metadata: string | null
}

type RefreshScope = 'all' | 'library-sidebar-page' | 'library-sidebar' | 'library-only' | 'grade-dependent'

function buildFeatureFilter(params: {
  featureNameQuery: string
  featureWorkTitleQuery: string
  featureSeriesIdQuery: string
  featureCircleQuery: string
  featureAuthorQuery: string
  featureTags: string[]
  featureGradeFilter: number | null
}): FeatureFilterDto {
  return {
    name_query: params.featureNameQuery,
    work_title_query: params.featureWorkTitleQuery,
    series_id_query: params.featureSeriesIdQuery,
    circle_query: params.featureCircleQuery,
    author_query: params.featureAuthorQuery,
    tags: params.featureTags,
    grade: params.featureGradeFilter,
  }
}

function isSynchronousRepository(repository: MediaRepository): repository is SynchronousMediaRepository {
  return (
    'readImageSidebarTreeSync' in repository &&
    typeof repository.readImageSidebarTreeSync === 'function' &&
    'readImagePageSync' in repository &&
    typeof repository.readImagePageSync === 'function' &&
    'readImageMetadataSync' in repository &&
    typeof repository.readImageMetadataSync === 'function'
  )
}

export function useReadOnlyDataAccess({
  repository,
  mode,
  includeHidden,
  importBusy = false,
  suspendLibraryChangedRefresh = false,
  selectedSourceId,
  pageIndex,
  pageSize,
  showNamesOnly,
  focusedRef,
  vectorResultsActive,
  featureNameQuery,
  featureWorkTitleQuery,
  featureSeriesIdQuery,
  featureCircleQuery,
  featureAuthorQuery,
  featureTags,
  featureGradeFilter,
  gradeByPackage,
}: UseReadOnlyDataAccessParams) {
  const initialLibrarySnapshot = useMemo(() => {
    const dto = repository.getInitialLibrarySnapshot()
    return dto ? mapLibrarySnapshotDto(dto) : null
  }, [repository])

  const [libraryState, setLibraryState] = useState<ReadSliceState<LibrarySnapshotViewModel>>({
    data: initialLibrarySnapshot,
    snapshot: initialLibrarySnapshot,
    loading: false,
    error: null,
    requestId: 0,
  })
  const [sidebarState, setSidebarState] = useState<ReadSliceState<ImageSidebarTreeViewModel>>(() => createEmptySliceState())
  const [pageState, setPageState] = useState<ReadSliceState<ImagePageViewModel>>(() => createEmptySliceState())
  const [metadataState, setMetadataState] = useState<ReadSliceState<ImageMetadataViewModel | null>>(() => createEmptySliceState())

  const libraryRequestIdRef = useRef(0)
  const sidebarRequestIdRef = useRef(0)
  const pageRequestIdRef = useRef(0)
  const metadataRequestIdRef = useRef(0)
  const deferredAllRefreshRef = useRef(false)
  const deferredLibraryOnlyRefreshRef = useRef(false)
  const refreshHashRef = useRef<{ library: string | null; sidebar: string | null; page: string | null; metadata: string | null }>({
    library: null,
    sidebar: null,
    page: null,
    metadata: null,
  })
  const deferredLibraryRefreshAfterLoadRef = useRef(false)
  const deferredSidebarRefreshAfterLoadRef = useRef(false)
  const pendingRefreshScopeRef = useRef<RefreshScope | null>(null)

  const [libraryRetryNonce, setLibraryRetryNonce] = useState(0)
  const [sidebarRetryNonce, setSidebarRetryNonce] = useState(0)
  const [pageRetryNonce, setPageRetryNonce] = useState(0)
  const [metadataRetryNonce, setMetadataRetryNonce] = useState(0)

  const featureFilter = useMemo(
    () =>
      buildFeatureFilter({
        featureNameQuery,
        featureWorkTitleQuery,
        featureSeriesIdQuery,
        featureCircleQuery,
        featureAuthorQuery,
        featureTags,
        featureGradeFilter,
      }),
    [
      featureAuthorQuery,
      featureCircleQuery,
      featureGradeFilter,
      featureNameQuery,
      featureSeriesIdQuery,
      featureTags,
      featureWorkTitleQuery,
    ],
  )

  const gradeOverridesForRead = useMemo(
    () => (featureGradeFilter === null ? undefined : gradeByPackage),
    [featureGradeFilter, gradeByPackage],
  )

  const featureFilterHash = useMemo(() => JSON.stringify(featureFilter), [featureFilter])
  const gradeOverridesHash = useMemo(
    () => (gradeOverridesForRead ? JSON.stringify(gradeOverridesForRead) : ''),
    [gradeOverridesForRead],
  )
  const libraryRefreshHash = 'library:v1'
  const sidebarRefreshHash = useMemo(
    () => `sidebar:${includeHidden ? '1' : '0'}:${featureFilterHash}:${gradeOverridesHash}`,
    [featureFilterHash, gradeOverridesHash, includeHidden],
  )
  const pageRefreshHash = useMemo(
    () =>
      `page:${selectedSourceId ?? ''}:${Math.max(0, pageIndex)}:${Math.max(1, pageSize)}:${showNamesOnly ? '1' : '0'}:${includeHidden ? '1' : '0'}:${featureFilterHash}:${gradeOverridesHash}`,
    [featureFilterHash, gradeOverridesHash, includeHidden, pageIndex, pageSize, selectedSourceId, showNamesOnly],
  )
  const metadataRefreshHash = useMemo(
    () => `metadata:${focusedRef?.packageId ?? ''}:${focusedRef?.imageIndex ?? -1}:${includeHidden ? '1' : '0'}`,
    [focusedRef?.imageIndex, focusedRef?.packageId, includeHidden],
  )

  const enableLiteLibrarySnapshot = useMemo(() => resolveLiteLibrarySnapshotEnabled(), [])
  const enableImportRefreshThrottle = useMemo(() => resolveImportRefreshThrottleEnabled(), [])

  // In test mode, allow the synchronous repository path so hook request timing is
  // deterministic in unit tests and avoids async jitter.
  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSynchronousRepository(repository)

  const syncSnapshot = useMemo(() => {
    if (!isSynchronousTestMode) {
      return null
    }

    const sidebarDto =
      mode === 'image'
        ? repository.readImageSidebarTreeSync({
            feature_filter: featureFilter,
            grade_overrides: gradeOverridesForRead,
            include_hidden: includeHidden,
          })
        : null
    const pageDto =
      mode === 'image' && !vectorResultsActive
        ? repository.readImagePageSync({
            source_id: selectedSourceId,
            page_index: Math.max(0, pageIndex),
            page_size: Math.max(1, pageSize),
            show_names_only: showNamesOnly,
            include_hidden: includeHidden,
            feature_filter: featureFilter,
            grade_overrides: gradeOverridesForRead,
          })
        : null
    const metadataDto =
      mode === 'image' && focusedRef && !vectorResultsActive
          ? repository.readImageMetadataSync({
              package_id: focusedRef.packageId,
              image_index: focusedRef.imageIndex,
              include_hidden: includeHidden,
            })
          : null

    return {
      libraryData: initialLibrarySnapshot,
      sidebarData: sidebarDto ? mapImageSidebarTreeDto(sidebarDto) : null,
      pageData: pageDto ? mapImagePageDto(pageDto) : null,
      metadataData: metadataDto ? mapImageMetadataDto(metadataDto) : null,
    }
  }, [
    featureFilter,
    focusedRef,
    gradeOverridesForRead,
    includeHidden,
    initialLibrarySnapshot,
    isSynchronousTestMode,
    mode,
    pageIndex,
    pageSize,
    repository,
    selectedSourceId,
    showNamesOnly,
    vectorResultsActive,
  ])

  useEffect(() => {
    if (isSynchronousTestMode) {
      return
    }

    return scheduleReadSlice({
      requestIdRef: libraryRequestIdRef,
      setState: setLibraryState,
      fetcher: async (signal) => {
        const requestOptions = { signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS }
        if (enableLiteLibrarySnapshot && repository.readLibrarySnapshotLite) {
          try {
            return await repository.readLibrarySnapshotLite(requestOptions)
          } catch (error) {
            if (!shouldFallbackToLegacySnapshotRead(error)) {
              throw error
            }
            return await repository.readLibrarySnapshot(requestOptions)
          }
        }
        return await repository.readLibrarySnapshot(requestOptions)
      },
      mapDto: mapLibrarySnapshotAnyDto,
    })
  }, [enableLiteLibrarySnapshot, isSynchronousTestMode, libraryRetryNonce, repository])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image') {
      return
    }

    return scheduleReadSlice({
      requestIdRef: sidebarRequestIdRef,
      setState: setSidebarState,
      fetcher: (signal) =>
        repository.readImageSidebarTree(
          {
            feature_filter: featureFilter,
            grade_overrides: gradeOverridesForRead,
            include_hidden: includeHidden,
          },
          { signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
        ),
      mapDto: mapImageSidebarTreeDto,
    })
  }, [featureFilter, gradeOverridesForRead, includeHidden, isSynchronousTestMode, mode, repository, sidebarRetryNonce])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image' || vectorResultsActive) {
      return
    }

    const pageReadDebounceMs = importBusy ? 360 : PAGE_READ_DEBOUNCE_MS

    return scheduleReadSlice({
      requestIdRef: pageRequestIdRef,
      setState: setPageState,
      debounceMs: pageReadDebounceMs,
      fetcher: (signal) =>
        repository.readImagePage(
          {
            source_id: selectedSourceId,
            page_index: Math.max(0, pageIndex),
            page_size: Math.max(1, pageSize),
            show_names_only: showNamesOnly,
            include_hidden: includeHidden,
            feature_filter: featureFilter,
            grade_overrides: gradeOverridesForRead,
          },
          { signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
        ),
      mapDto: mapImagePageDto,
    })
  }, [
    featureFilter,
    gradeOverridesForRead,
    importBusy,
    includeHidden,
    isSynchronousTestMode,
    mode,
    pageIndex,
    pageRetryNonce,
    pageSize,
    repository,
    selectedSourceId,
    showNamesOnly,
    vectorResultsActive,
  ])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image' || !focusedRef || vectorResultsActive || importBusy) {
      return
    }

    return scheduleReadSlice({
      requestIdRef: metadataRequestIdRef,
      setState: setMetadataState,
      debounceMs: METADATA_READ_DEBOUNCE_MS,
      fetcher: (signal) =>
        repository.readImageMetadata(
          {
            package_id: focusedRef.packageId,
            image_index: focusedRef.imageIndex,
            include_hidden: includeHidden,
          },
          { signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
        ),
      mapDto: mapImageMetadataDto,
    })
  }, [
    focusedRef,
    importBusy,
    includeHidden,
    isSynchronousTestMode,
    metadataRetryNonce,
    mode,
    repository,
    vectorResultsActive,
  ])

  const retryLibrary = useCallback(() => {
    setLibraryRetryNonce((value) => value + 1)
  }, [])

  const retrySidebar = useCallback(() => {
    setSidebarRetryNonce((value) => value + 1)
  }, [])

  const retryPage = useCallback(() => {
    setPageRetryNonce((value) => value + 1)
  }, [])

  const retryMetadata = useCallback(() => {
    setMetadataRetryNonce((value) => value + 1)
  }, [])

  const triggerSliceRefresh = useCallback(
    (slice: 'library' | 'sidebar' | 'page' | 'metadata', hash: string, loading: boolean, retry: () => void) => {
      if (loading && refreshHashRef.current[slice] === hash) {
        return
      }
      refreshHashRef.current[slice] = hash
      retry()
    },
    [],
  )

  const triggerLibraryRefresh = useCallback(() => {
    if (libraryState.loading && refreshHashRef.current.library === libraryRefreshHash) {
      deferredLibraryRefreshAfterLoadRef.current = true
      return
    }
    refreshHashRef.current.library = libraryRefreshHash
    retryLibrary()
  }, [libraryRefreshHash, libraryState.loading, retryLibrary])

  const triggerSidebarRefresh = useCallback(() => {
    if (sidebarState.loading && refreshHashRef.current.sidebar === sidebarRefreshHash) {
      deferredSidebarRefreshAfterLoadRef.current = true
      return
    }
    refreshHashRef.current.sidebar = sidebarRefreshHash
    retrySidebar()
  }, [retrySidebar, sidebarRefreshHash, sidebarState.loading])

  const triggerPageRefresh = useCallback(() => {
    triggerSliceRefresh('page', pageRefreshHash, pageState.loading, retryPage)
  }, [pageRefreshHash, pageState.loading, retryPage, triggerSliceRefresh])

  const triggerMetadataRefresh = useCallback(() => {
    triggerSliceRefresh('metadata', metadataRefreshHash, metadataState.loading, retryMetadata)
  }, [metadataRefreshHash, metadataState.loading, retryMetadata, triggerSliceRefresh])

  useEffect(() => {
    if (isSynchronousTestMode || !repository.onLibraryChanged) {
      return
    }

    const fireRefreshForScope = (scope: RefreshScope) => {
      if (scope === 'all') {
        triggerLibraryRefresh()
        triggerSidebarRefresh()
        triggerPageRefresh()
        triggerMetadataRefresh()
      } else if (scope === 'library-sidebar-page') {
        triggerLibraryRefresh()
        triggerSidebarRefresh()
        triggerPageRefresh()
      } else if (scope === 'library-sidebar') {
        triggerLibraryRefresh()
        triggerSidebarRefresh()
      } else if (scope === 'library-only') {
        triggerLibraryRefresh()
      } else if (scope === 'grade-dependent') {
        triggerSidebarRefresh()
        triggerPageRefresh()
      }
    }

    // 恢复上一轮 effect 被 cleanup 中断的待执行刷新作用域
    const carriedScope = pendingRefreshScopeRef.current
    if (carriedScope !== null) {
      pendingRefreshScopeRef.current = null
      fireRefreshForScope(carriedScope)
    }

    let throttleTimer: ReturnType<typeof window.setTimeout> | null = null
    let queuedRefreshScope: RefreshScope | null = null

    const scheduleRefresh = (scope: RefreshScope) => {
      if (queuedRefreshScope === 'all' || scope === 'all') {
        queuedRefreshScope = 'all'
      } else if (queuedRefreshScope === 'library-sidebar-page' || scope === 'library-sidebar-page') {
        queuedRefreshScope = 'library-sidebar-page'
      } else if (queuedRefreshScope === 'library-sidebar' || scope === 'library-sidebar') {
        queuedRefreshScope = 'library-sidebar'
      } else if (queuedRefreshScope === 'library-only' || scope === 'library-only') {
        queuedRefreshScope = 'library-only'
      } else {
        queuedRefreshScope = 'grade-dependent'
      }

      if (throttleTimer !== null) {
        return
      }

      // importRefreshThrottle=false 时跳过 120ms 聚合窗口，直接同步触发（bench 回滚基线用）
      const throttleMs = enableImportRefreshThrottle ? 120 : 0
      throttleTimer = window.setTimeout(() => {
        throttleTimer = null
        const scopeToRun = queuedRefreshScope
        queuedRefreshScope = null

        if (scopeToRun !== null) {
          fireRefreshForScope(scopeToRun)
        }
      }, throttleMs)
    }

    const unsubscribe = repository.onLibraryChanged((payload) => {
      if (TRANSIENT_LIBRARY_CHANGE_REASONS.has(payload.reason)) {
        return
      }

      const isMetadataManageWriteReason =
        payload.reason === 'write-package-grade' ||
        payload.reason === 'write-package-metadata' ||
        payload.reason === 'write-package-external-metadata'

      if (suspendLibraryChangedRefresh && isMetadataManageWriteReason) {
        deferredAllRefreshRef.current = true
        return
      }

      if (payload.reason === 'write-package-grade') {
        if (featureGradeFilter !== null) {
          scheduleRefresh('grade-dependent')
        }
        return
      }

      if (payload.reason === 'write-package-metadata' || payload.reason === 'write-package-external-metadata') {
        scheduleRefresh('library-sidebar-page')
        return
      }

      if (payload.reason === 'import-task-updated') {
        if (importBusy) {
          deferredLibraryOnlyRefreshRef.current = true
          return
        }
        // importRefreshThrottle=false 时恢复旧行为：import-task-updated 触发全量刷新
        scheduleRefresh(enableImportRefreshThrottle ? 'library-only' : 'all')
        return
      }

      scheduleRefresh('all')
    })

    return () => {
      if (throttleTimer !== null) {
        window.clearTimeout(throttleTimer)
        // 定时器被取消但有待执行的刷新，保存到 ref 供下一轮 effect 恢复
        if (queuedRefreshScope !== null) {
          pendingRefreshScopeRef.current = queuedRefreshScope
        }
      }
      unsubscribe()
    }
  }, [
    enableImportRefreshThrottle,
    featureGradeFilter,
    isSynchronousTestMode,
    repository,
    importBusy,
    triggerLibraryRefresh,
    triggerMetadataRefresh,
    triggerPageRefresh,
    triggerSidebarRefresh,
    suspendLibraryChangedRefresh,
  ])

  useEffect(() => {
    if (isSynchronousTestMode || suspendLibraryChangedRefresh || !deferredAllRefreshRef.current) {
      return
    }
    deferredAllRefreshRef.current = false
    triggerLibraryRefresh()
    triggerSidebarRefresh()
    triggerPageRefresh()
    triggerMetadataRefresh()
  }, [
    isSynchronousTestMode,
    suspendLibraryChangedRefresh,
    triggerLibraryRefresh,
    triggerMetadataRefresh,
    triggerPageRefresh,
    triggerSidebarRefresh,
  ])

  useEffect(() => {
    if (isSynchronousTestMode || importBusy || !deferredLibraryOnlyRefreshRef.current) {
      return
    }
    deferredLibraryOnlyRefreshRef.current = false
    triggerLibraryRefresh()
  }, [importBusy, isSynchronousTestMode, triggerLibraryRefresh])

  useEffect(() => {
    if (isSynchronousTestMode || libraryState.loading || !deferredLibraryRefreshAfterLoadRef.current) {
      return
    }
    deferredLibraryRefreshAfterLoadRef.current = false
    refreshHashRef.current.library = null
    retryLibrary()
  }, [isSynchronousTestMode, libraryState.loading, retryLibrary])

  useEffect(() => {
    if (isSynchronousTestMode || sidebarState.loading || !deferredSidebarRefreshAfterLoadRef.current) {
      return
    }
    deferredSidebarRefreshAfterLoadRef.current = false
    refreshHashRef.current.sidebar = null
    retrySidebar()
  }, [isSynchronousTestMode, sidebarState.loading, retrySidebar])

  const errors: BackendReadErrors = {
    library: libraryState.error,
    sidebar: sidebarState.error,
    page: pageState.error,
    metadata: metadataState.error,
  }

  if (isSynchronousTestMode && syncSnapshot) {
    return {
      library: {
        data: syncSnapshot.libraryData,
        snapshot: syncSnapshot.libraryData,
        loading: false,
        error: null,
        requestId: 0,
      },
      sidebar: {
        data: syncSnapshot.sidebarData,
        snapshot: syncSnapshot.sidebarData,
        loading: false,
        error: null,
        requestId: 0,
      },
      page: {
        data: syncSnapshot.pageData,
        snapshot: syncSnapshot.pageData,
        loading: false,
        error: null,
        requestId: 0,
      },
      metadata: {
        data: syncSnapshot.metadataData,
        snapshot: syncSnapshot.metadataData,
        loading: false,
        error: null,
        requestId: 0,
      },
      errors: {
        library: null,
        sidebar: null,
        page: null,
        metadata: null,
      },
      retryLibrary: () => undefined,
      retrySidebar: () => undefined,
      retryPage: () => undefined,
      retryMetadata: () => undefined,
    }
  }

  return {
    library: libraryState,
    sidebar: sidebarState,
    page: pageState,
    metadata: metadataState,
    errors,
    retryLibrary,
    retrySidebar,
    retryPage,
    retryMetadata,
  }
}

export type ReadOnlyDataAccessResult = ReturnType<typeof useReadOnlyDataAccess>
