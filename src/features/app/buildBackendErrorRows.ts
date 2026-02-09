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
}

export function buildBackendErrorRows({
  backendRead,
  backendWrite,
  playlistPersistence,
  runtimeCapabilities,
}: BuildBackendErrorRowsParams): BackendErrorRow[] {
  return [
    backendRead.errors.library
      ? {
          key: 'library',
          label: '数据快照',
          message: backendRead.errors.library,
          onRetry: backendRead.retryLibrary,
        }
      : null,
    backendRead.errors.sidebar
      ? {
          key: 'sidebar',
          label: 'Sidebar 目录树',
          message: backendRead.errors.sidebar,
          onRetry: backendRead.retrySidebar,
        }
      : null,
    backendRead.errors.page
      ? {
          key: 'page',
          label: 'Main 分页列表',
          message: backendRead.errors.page,
          onRetry: backendRead.retryPage,
        }
      : null,
    backendRead.errors.metadata
      ? {
          key: 'metadata',
          label: 'Metadata 面板',
          message: backendRead.errors.metadata,
          onRetry: backendRead.retryMetadata,
        }
      : null,
    backendWrite.errors.grade
      ? {
          key: 'grade-write',
          label: '评分写入',
          message: backendWrite.errors.grade,
          onRetry: backendWrite.clearGradeError,
        }
      : null,
    backendWrite.errors.metadata
      ? {
          key: 'metadata-write',
          label: '元数据写入',
          message: backendWrite.errors.metadata,
          onRetry: backendWrite.clearMetadataError,
        }
      : null,
    backendWrite.errors.cover
      ? {
          key: 'cover-write',
          label: '封面写入',
          message: backendWrite.errors.cover,
          onRetry: backendWrite.clearCoverError,
        }
      : null,
    backendWrite.errors.manage
      ? {
          key: 'manage-write',
          label: '管理操作',
          message: backendWrite.errors.manage,
          onRetry: backendWrite.clearManageError,
        }
      : null,
    playlistPersistence.readError
      ? {
          key: 'playlist-read',
          label: '播放列表读取',
          message: playlistPersistence.readError,
          onRetry: playlistPersistence.retryRead,
        }
      : null,
    playlistPersistence.writeError
      ? {
          key: 'playlist-write',
          label: '播放列表写入',
          message: playlistPersistence.writeError,
          onRetry: playlistPersistence.retryWrite,
        }
      : null,
    runtimeCapabilities.error
      ? {
          key: 'runtime-capability',
          label: '运行时依赖预检',
          message: runtimeCapabilities.error,
          onRetry: runtimeCapabilities.retry,
        }
      : null,
  ].filter((item): item is BackendErrorRow => Boolean(item))
}
