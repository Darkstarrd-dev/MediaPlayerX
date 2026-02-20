import { useEffect, useState } from 'react'

import type { MediaRepository } from '../backend/repository'

export interface ArchiveLoadStatusState {
  runningArchivePath: string | null
  runningArchiveProgress: number | null
  runningArchiveMessage: string | null
  pendingArchivePaths: string[]
  thumbnailRunningCount: number
  thumbnailRunningProgress: number | null
  thumbnailRunningMessage: string | null
}

const EMPTY_ARCHIVE_LOAD_STATUS: ArchiveLoadStatusState = {
  runningArchivePath: null,
  runningArchiveProgress: null,
  runningArchiveMessage: null,
  pendingArchivePaths: [],
  thumbnailRunningCount: 0,
  thumbnailRunningProgress: null,
  thumbnailRunningMessage: null,
}

interface UseArchiveLoadStatusParams {
  repository: MediaRepository
}

export function useArchiveLoadStatus({ repository }: UseArchiveLoadStatusParams): ArchiveLoadStatusState {
  const [archiveLoadStatus, setArchiveLoadStatus] = useState<ArchiveLoadStatusState>(EMPTY_ARCHIVE_LOAD_STATUS)

  useEffect(() => {
    if (!repository.readArchiveLoadStatus) {
      setArchiveLoadStatus(EMPTY_ARCHIVE_LOAD_STATUS)
      return
    }

    let disposed = false
    let runningRequest = false

    const refreshArchiveLoadStatus = async () => {
      if (disposed || runningRequest) {
        return
      }

      runningRequest = true
      try {
        const status = await repository.readArchiveLoadStatus?.({ timeoutMs: 3_000 })
        if (!disposed && status) {
          setArchiveLoadStatus({
            runningArchivePath: status.running_archive_path,
            runningArchiveProgress:
              typeof status.running_archive_progress === 'number' && Number.isFinite(status.running_archive_progress)
                ? status.running_archive_progress
                : null,
            runningArchiveMessage: typeof status.running_archive_message === 'string' ? status.running_archive_message : null,
            pendingArchivePaths: status.pending_archive_paths,
            thumbnailRunningCount:
              typeof status.thumbnail_running_count === 'number' && Number.isFinite(status.thumbnail_running_count)
                ? Math.max(0, Math.round(status.thumbnail_running_count))
                : 0,
            thumbnailRunningProgress:
              typeof status.thumbnail_running_progress === 'number' && Number.isFinite(status.thumbnail_running_progress)
                ? status.thumbnail_running_progress
                : null,
            thumbnailRunningMessage:
              typeof status.thumbnail_running_message === 'string' ? status.thumbnail_running_message : null,
          })
        }
      } catch {
        if (!disposed) {
          setArchiveLoadStatus(EMPTY_ARCHIVE_LOAD_STATUS)
        }
      } finally {
        runningRequest = false
      }
    }

    void refreshArchiveLoadStatus()
    const intervalId = window.setInterval(() => {
      void refreshArchiveLoadStatus()
    }, 900)
    const unsubscribe = repository.onLibraryChanged?.(() => {
      void refreshArchiveLoadStatus()
    })

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      unsubscribe?.()
    }
  }, [repository])

  return archiveLoadStatus
}

export type ArchiveLoadStatusResult = ReturnType<typeof useArchiveLoadStatus>
