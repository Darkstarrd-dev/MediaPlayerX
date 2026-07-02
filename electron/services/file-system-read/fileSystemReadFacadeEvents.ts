import type { ReadArchiveLoadStatusResponseDto } from '../../../src/contracts/backend'

export interface LibraryChangedEventPayload {
  reason:
    | 'import-task-updated'
    | 'import-task-finished'
    | 'archive-normalized'
    | 'archive-normalize-failed'
    | 'clear-database'
    | 'write-package-grade'
    | 'write-package-metadata'
    | 'write-package-external-metadata'
    | 'write-video-metadata'
    | 'write-video-cover'
    | 'write-playlist'
    | 'manage-hide'
    | 'manage-delete-image-items'
    | 'manage-delete-sidebar-nodes'
    | 'auto-prune-missing-sources'
    | 'thumbnail-rendering-start'
    | 'thumbnail-rendering-progress'
    | 'thumbnail-rendering-end'
  updated_at_ms: number
  // 外部源监听（watcher）或手动刷新触发的变更路径集合，
  // 前端可据此做精确缓存失效而非全清
  changedPaths?: string[]
}

export type LibraryChangedListener = (payload: LibraryChangedEventPayload) => void

export type ArchiveLoadStatusListener = (payload: ReadArchiveLoadStatusResponseDto) => void

export interface FileSystemReadServiceEvents {
  libraryChanged: LibraryChangedEventPayload
  archiveLoadStatus: ReadArchiveLoadStatusResponseDto
}
