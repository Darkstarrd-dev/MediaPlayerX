import { useEffect, useState } from 'react'

import type { ReadonlyMediaRepository } from '../backend/repository'

export interface ArchiveLoadStatusState {
  runningArchivePath: string | null
  pendingArchivePaths: string[]
}

const EMPTY_ARCHIVE_LOAD_STATUS: ArchiveLoadStatusState = {
  runningArchivePath: null,
  pendingArchivePaths: [],
}

interface UseArchiveLoadStatusParams {
  repository: ReadonlyMediaRepository
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
            pendingArchivePaths: status.pending_archive_paths,
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
