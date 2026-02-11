import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FeatureFilterDto } from '../../contracts/backend'
import {
  mapImageMetadataDto,
  mapImagePageDto,
  mapImageSidebarTreeDto,
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

const DEFAULT_IPC_TIMEOUT_MS = 8_000
const PAGE_READ_DEBOUNCE_MS = 72
const METADATA_READ_DEBOUNCE_MS = 84

interface UseReadOnlyDataAccessParams {
  repository: MediaRepository
  mode: BrowserMode
  includeHidden: boolean
  selectedSourceId: string | null
  pageIndex: number
  pageSize: number
  showNamesOnly: boolean
  focusedRef: FocusedImageRef | null
  vectorResultsActive: boolean
  featureNameQuery: string
  featureWorkTitleQuery: string
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

function buildFeatureFilter(params: {
  featureNameQuery: string
  featureWorkTitleQuery: string
  featureCircleQuery: string
  featureAuthorQuery: string
  featureTags: string[]
  featureGradeFilter: number | null
}): FeatureFilterDto {
  return {
    name_query: params.featureNameQuery,
    work_title_query: params.featureWorkTitleQuery,
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
  selectedSourceId,
  pageIndex,
  pageSize,
  showNamesOnly,
  focusedRef,
  vectorResultsActive,
  featureNameQuery,
  featureWorkTitleQuery,
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

  const [libraryRetryNonce, setLibraryRetryNonce] = useState(0)
  const [sidebarRetryNonce, setSidebarRetryNonce] = useState(0)
  const [pageRetryNonce, setPageRetryNonce] = useState(0)
  const [metadataRetryNonce, setMetadataRetryNonce] = useState(0)

  const featureFilter = useMemo(
    () =>
      buildFeatureFilter({
        featureNameQuery,
        featureWorkTitleQuery,
        featureCircleQuery,
        featureAuthorQuery,
        featureTags,
        featureGradeFilter,
      }),
    [featureAuthorQuery, featureCircleQuery, featureGradeFilter, featureNameQuery, featureTags, featureWorkTitleQuery],
  )

  const gradeOverridesForRead = useMemo(
    () => (featureGradeFilter === null ? undefined : gradeByPackage),
    [featureGradeFilter, gradeByPackage],
  )

  // 测试模式允许走同步仓储，目的是让 hook 在单测中稳定复现请求时序并避免异步抖动。
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
      fetcher: (signal) => repository.readLibrarySnapshot({ signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS }),
      mapDto: mapLibrarySnapshotDto,
    })
  }, [isSynchronousTestMode, libraryRetryNonce, repository])

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

    return scheduleReadSlice({
      requestIdRef: pageRequestIdRef,
      setState: setPageState,
      debounceMs: PAGE_READ_DEBOUNCE_MS,
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
  }, [featureFilter, gradeOverridesForRead, includeHidden, isSynchronousTestMode, mode, pageIndex, pageRetryNonce, pageSize, repository, selectedSourceId, showNamesOnly, vectorResultsActive])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image' || !focusedRef || vectorResultsActive) {
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
  }, [focusedRef, includeHidden, isSynchronousTestMode, metadataRetryNonce, mode, repository, vectorResultsActive])

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

  const retryAllSlices = useCallback(() => {
    setLibraryRetryNonce((value) => value + 1)
    setSidebarRetryNonce((value) => value + 1)
    setPageRetryNonce((value) => value + 1)
    setMetadataRetryNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    if (isSynchronousTestMode || !repository.onLibraryChanged) {
      return
    }

    let throttleTimer: ReturnType<typeof window.setTimeout> | null = null
    let queuedRefreshScope: 'all' | 'grade-dependent' | null = null

    const scheduleRefresh = (scope: 'all' | 'grade-dependent') => {
      queuedRefreshScope = queuedRefreshScope === 'all' || scope === 'all' ? 'all' : 'grade-dependent'

      if (throttleTimer !== null) {
        return
      }

      throttleTimer = window.setTimeout(() => {
        throttleTimer = null
        const scopeToRun = queuedRefreshScope
        queuedRefreshScope = null

        if (scopeToRun === 'all') {
          retryAllSlices()
          return
        }

        if (scopeToRun === 'grade-dependent') {
          retrySidebar()
          retryPage()
        }
      }, 120)
    }

    const unsubscribe = repository.onLibraryChanged((payload) => {
      if (payload.reason === 'write-package-grade') {
        if (featureGradeFilter !== null) {
          scheduleRefresh('grade-dependent')
        }
        return
      }

      scheduleRefresh('all')
    })

    return () => {
      if (throttleTimer !== null) {
        window.clearTimeout(throttleTimer)
      }
      unsubscribe()
    }
  }, [featureGradeFilter, isSynchronousTestMode, repository, retryAllSlices, retryPage, retrySidebar])

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
