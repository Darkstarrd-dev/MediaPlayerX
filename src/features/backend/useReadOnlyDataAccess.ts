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
import type { ReadonlyMediaRepository, SynchronousMediaRepository } from './repository'
import type { FocusedImageRef } from '../../types'

const DEFAULT_IPC_TIMEOUT_MS = 8_000
const PAGE_READ_DEBOUNCE_MS = 72
const METADATA_READ_DEBOUNCE_MS = 84

interface UseReadOnlyDataAccessParams {
  repository: ReadonlyMediaRepository
  mode: 'image' | 'video'
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

interface ReadSliceState<T> {
  data: T | null
  snapshot: T | null
  loading: boolean
  error: string | null
  requestId: number
}

interface BackendReadErrors {
  library: string | null
  sidebar: string | null
  page: string | null
  metadata: string | null
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '未知后端错误'
}

function createEmptySliceState<T>(): ReadSliceState<T> {
  return {
    data: null,
    snapshot: null,
    loading: false,
    error: null,
    requestId: 0,
  }
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

function isSynchronousRepository(repository: ReadonlyMediaRepository): repository is SynchronousMediaRepository {
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

  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSynchronousRepository(repository)

  const syncSnapshot = useMemo(() => {
    if (!isSynchronousTestMode) {
      return null
    }

    const sidebarDto =
      mode === 'image'
        ? repository.readImageSidebarTreeSync({
            feature_filter: featureFilter,
            grade_overrides: gradeByPackage,
          })
        : null
    const pageDto =
      mode === 'image' && !vectorResultsActive
        ? repository.readImagePageSync({
            source_id: selectedSourceId,
            page_index: Math.max(0, pageIndex),
            page_size: Math.max(1, pageSize),
            show_names_only: showNamesOnly,
            feature_filter: featureFilter,
            grade_overrides: gradeByPackage,
          })
        : null
    const metadataDto =
      mode === 'image' && focusedRef && !vectorResultsActive
        ? repository.readImageMetadataSync({
            package_id: focusedRef.packageId,
            image_index: focusedRef.imageIndex,
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
    gradeByPackage,
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

    const abortController = new AbortController()
    const requestId = libraryRequestIdRef.current + 1
    libraryRequestIdRef.current = requestId

    setLibraryState((previous) => ({
      ...previous,
      loading: true,
      error: null,
      requestId,
    }))

    repository
      .readLibrarySnapshot({ signal: abortController.signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS })
      .then((dto) => {
        if (libraryRequestIdRef.current !== requestId) {
          return
        }
        const mapped = mapLibrarySnapshotDto(dto)
        setLibraryState({
          data: mapped,
          snapshot: mapped,
          loading: false,
          error: null,
          requestId,
        })
      })
      .catch((error: unknown) => {
        if (libraryRequestIdRef.current !== requestId || isAbortError(error)) {
          return
        }
        setLibraryState((previous) => ({
          ...previous,
          data: previous.snapshot,
          loading: false,
          error: toErrorMessage(error),
          requestId,
        }))
      })

    return () => {
      abortController.abort()
    }
  }, [isSynchronousTestMode, libraryRetryNonce, repository])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image') {
      return
    }

    const abortController = new AbortController()
    const requestId = sidebarRequestIdRef.current + 1
    sidebarRequestIdRef.current = requestId

    setSidebarState((previous) => ({
      ...previous,
      loading: true,
      error: null,
      requestId,
    }))

    repository
      .readImageSidebarTree(
        {
          feature_filter: featureFilter,
          grade_overrides: gradeByPackage,
        },
        { signal: abortController.signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
      )
      .then((dto) => {
        if (sidebarRequestIdRef.current !== requestId) {
          return
        }

        const mapped = mapImageSidebarTreeDto(dto)
        setSidebarState({
          data: mapped,
          snapshot: mapped,
          loading: false,
          error: null,
          requestId,
        })
      })
      .catch((error: unknown) => {
        if (sidebarRequestIdRef.current !== requestId || isAbortError(error)) {
          return
        }
        setSidebarState((previous) => ({
          ...previous,
          data: previous.snapshot,
          loading: false,
          error: toErrorMessage(error),
          requestId,
        }))
      })

    return () => {
      abortController.abort()
    }
  }, [featureFilter, gradeByPackage, isSynchronousTestMode, mode, repository, sidebarRetryNonce])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image' || vectorResultsActive) {
      return
    }

    const abortController = new AbortController()
    const requestId = pageRequestIdRef.current + 1
    pageRequestIdRef.current = requestId

    const timeoutId = window.setTimeout(() => {
      setPageState((previous) => ({
        ...previous,
        loading: true,
        error: null,
        requestId,
      }))

      repository
        .readImagePage(
          {
            source_id: selectedSourceId,
            page_index: Math.max(0, pageIndex),
            page_size: Math.max(1, pageSize),
            show_names_only: showNamesOnly,
            feature_filter: featureFilter,
            grade_overrides: gradeByPackage,
          },
          { signal: abortController.signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
        )
        .then((dto) => {
          if (pageRequestIdRef.current !== requestId) {
            return
          }

          const mapped = mapImagePageDto(dto)
          setPageState({
            data: mapped,
            snapshot: mapped,
            loading: false,
            error: null,
            requestId,
          })
        })
        .catch((error: unknown) => {
          if (pageRequestIdRef.current !== requestId || isAbortError(error)) {
            return
          }
          setPageState((previous) => ({
            ...previous,
            data: previous.snapshot,
            loading: false,
            error: toErrorMessage(error),
            requestId,
          }))
        })
    }, PAGE_READ_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [featureFilter, gradeByPackage, isSynchronousTestMode, mode, pageIndex, pageRetryNonce, pageSize, repository, selectedSourceId, showNamesOnly, vectorResultsActive])

  useEffect(() => {
    if (isSynchronousTestMode || mode !== 'image' || !focusedRef || vectorResultsActive) {
      return
    }

    const abortController = new AbortController()
    const requestId = metadataRequestIdRef.current + 1
    metadataRequestIdRef.current = requestId

    const timeoutId = window.setTimeout(() => {
      setMetadataState((previous) => ({
        ...previous,
        loading: true,
        error: null,
        requestId,
      }))

      repository
        .readImageMetadata(
          {
            package_id: focusedRef.packageId,
            image_index: focusedRef.imageIndex,
          },
          { signal: abortController.signal, timeoutMs: DEFAULT_IPC_TIMEOUT_MS },
        )
        .then((dto) => {
          if (metadataRequestIdRef.current !== requestId) {
            return
          }

          const mapped = mapImageMetadataDto(dto)
          setMetadataState({
            data: mapped,
            snapshot: mapped,
            loading: false,
            error: null,
            requestId,
          })
        })
        .catch((error: unknown) => {
          if (metadataRequestIdRef.current !== requestId || isAbortError(error)) {
            return
          }
          setMetadataState((previous) => ({
            ...previous,
            data: previous.snapshot,
            loading: false,
            error: toErrorMessage(error),
            requestId,
          }))
        })
    }, METADATA_READ_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [focusedRef, isSynchronousTestMode, metadataRetryNonce, mode, repository, vectorResultsActive])

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
    const scheduleRefresh = () => {
      if (throttleTimer !== null) {
        return
      }

      throttleTimer = window.setTimeout(() => {
        throttleTimer = null
        retryAllSlices()
      }, 120)
    }

    const unsubscribe = repository.onLibraryChanged(() => {
      scheduleRefresh()
    })

    return () => {
      if (throttleTimer !== null) {
        window.clearTimeout(throttleTimer)
      }
      unsubscribe()
    }
  }, [isSynchronousTestMode, repository, retryAllSlices])

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
