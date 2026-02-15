export interface BackendErrorRow {
  key: string
  label: string
  message: string
  onRetry: () => void
}

interface BuildBackendErrorRowsParams {
  backendRead: {
    errors: {
      library: string | null
      sidebar: string | null
      page: string | null
      metadata: string | null
    }
    retryLibrary: () => void
    retrySidebar: () => void
    retryPage: () => void
    retryMetadata: () => void
  }
  backendWrite: {
    errors: {
      grade: string | null
      metadata: string | null
      cover: string | null
      manage: string | null
    }
    clearGradeError: () => void
    clearMetadataError: () => void
    clearCoverError: () => void
    clearManageError: () => void
  }
  playlistPersistence: {
    readError: string | null
    writeError: string | null
    retryRead: () => void
    retryWrite: () => void
  }
  runtimeCapabilities: {
    error: string | null
    retry: () => void
  }
  labels: {
    library: string
    sidebar: string
    page: string
    metadata: string
    gradeWrite: string
    metadataWrite: string
    coverWrite: string
    manageWrite: string
    playlistRead: string
    playlistWrite: string
    runtimeCapability: string
  }
}

export function buildBackendErrorRows({
  backendRead,
  backendWrite,
  playlistPersistence,
  runtimeCapabilities,
  labels,
}: BuildBackendErrorRowsParams): BackendErrorRow[] {
  return [
    backendRead.errors.library
      ? {
          key: 'library',
          label: labels.library,
          message: backendRead.errors.library,
          onRetry: backendRead.retryLibrary,
        }
      : null,
    backendRead.errors.sidebar
      ? {
          key: 'sidebar',
          label: labels.sidebar,
          message: backendRead.errors.sidebar,
          onRetry: backendRead.retrySidebar,
        }
      : null,
    backendRead.errors.page
      ? {
          key: 'page',
          label: labels.page,
          message: backendRead.errors.page,
          onRetry: backendRead.retryPage,
        }
      : null,
    backendRead.errors.metadata
      ? {
          key: 'metadata',
          label: labels.metadata,
          message: backendRead.errors.metadata,
          onRetry: backendRead.retryMetadata,
        }
      : null,
    backendWrite.errors.grade
      ? {
          key: 'grade-write',
          label: labels.gradeWrite,
          message: backendWrite.errors.grade,
          onRetry: backendWrite.clearGradeError,
        }
      : null,
    backendWrite.errors.metadata
      ? {
          key: 'metadata-write',
          label: labels.metadataWrite,
          message: backendWrite.errors.metadata,
          onRetry: backendWrite.clearMetadataError,
        }
      : null,
    backendWrite.errors.cover
      ? {
          key: 'cover-write',
          label: labels.coverWrite,
          message: backendWrite.errors.cover,
          onRetry: backendWrite.clearCoverError,
        }
      : null,
    backendWrite.errors.manage
      ? {
          key: 'manage-write',
          label: labels.manageWrite,
          message: backendWrite.errors.manage,
          onRetry: backendWrite.clearManageError,
        }
      : null,
    playlistPersistence.readError
      ? {
          key: 'playlist-read',
          label: labels.playlistRead,
          message: playlistPersistence.readError,
          onRetry: playlistPersistence.retryRead,
        }
      : null,
    playlistPersistence.writeError
      ? {
          key: 'playlist-write',
          label: labels.playlistWrite,
          message: playlistPersistence.writeError,
          onRetry: playlistPersistence.retryWrite,
        }
      : null,
    runtimeCapabilities.error
      ? {
          key: 'runtime-capability',
          label: labels.runtimeCapability,
          message: runtimeCapabilities.error,
          onRetry: runtimeCapabilities.retry,
        }
      : null,
  ].filter((item): item is BackendErrorRow => Boolean(item))
}
