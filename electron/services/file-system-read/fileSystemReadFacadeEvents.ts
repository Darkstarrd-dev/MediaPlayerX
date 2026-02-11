import type { ReadArchiveLoadStatusResponseDto } from '../../../src/contracts/backend'

export interface LibraryChangedEventPayload {
  reason:
    | 'import-task-finished'
    | 'archive-normalized'
    | 'archive-normalize-failed'
    | 'clear-database'
    | 'clear-vector-data'
    | 'write-package-grade'
    | 'write-package-metadata'
    | 'generate-package-auto-tags'
    | 'generate-package-auto-tags-vision'
    | 'generate-package-embeddings'
    | 'write-video-metadata'
    | 'write-video-cover'
    | 'write-playlist'
    | 'manage-hide'
    | 'manage-delete-image-items'
    | 'manage-delete-sidebar-nodes'
  updated_at_ms: number
}

export type LibraryChangedListener = (payload: LibraryChangedEventPayload) => void

export type ArchiveLoadStatusListener = (payload: ReadArchiveLoadStatusResponseDto) => void

export interface FileSystemReadServiceEvents {
  libraryChanged: LibraryChangedEventPayload
  archiveLoadStatus: ReadArchiveLoadStatusResponseDto
}
