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

const ARCHIVE_STATUS_ACTIVE_POLL_MS = 450

const ARCHIVE_STATUS_IDLE_POLL_MS = 1_600

const ARCHIVE_STATUS_REFRESH_REASONS = new Set([
  'import-task-updated',
  'import-task-finished',
  'archive-load-status-updated',
  'archive-normalized',
  'archive-normalize-failed',
  'thumbnail-rendering-start',
  'thumbnail-rendering-progress',
  'thumbnail-rendering-end',
])

function isArchiveLoadStatusBusy(status: ArchiveLoadStatusState): boolean {
  return (
    status.runningArchivePath !== null ||
    status.pendingArchivePaths.length > 0 ||
    status.thumbnailRunningCount > 0
  )
}

function areArchiveLoadStatusEqual(left: ArchiveLoadStatusState, right: ArchiveLoadStatusState): boolean {
  if (
    left.runningArchivePath !== right.runningArchivePath ||
    left.runningArchiveProgress !== right.runningArchiveProgress ||
    left.runningArchiveMessage !== right.runningArchiveMessage ||
    left.thumbnailRunningCount !== right.thumbnailRunningCount ||
    left.thumbnailRunningProgress !== right.thumbnailRunningProgress ||
    left.thumbnailRunningMessage !== right.thumbnailRunningMessage
  ) {
    return false
  }

  if (left.pendingArchivePaths.length !== right.pendingArchivePaths.length) {
    return false
  }

  for (let index = 0; index < left.pendingArchivePaths.length; index += 1) {
    if (left.pendingArchivePaths[index] !== right.pendingArchivePaths[index]) {
      return false
    }
  }

  return true
}

function mapArchiveLoadStatus(payload: {
  running_archive_path: string | null
  running_archive_progress?: number | null
  running_archive_message?: string | null
  pending_archive_paths: string[]
  thumbnail_running_count?: number
  thumbnail_running_progress?: number | null
  thumbnail_running_message?: string | null
}): ArchiveLoadStatusState {
  return {
    runningArchivePath: payload.running_archive_path,
    runningArchiveProgress:
      typeof payload.running_archive_progress === 'number' && Number.isFinite(payload.running_archive_progress)
        ? payload.running_archive_progress
        : null,
    runningArchiveMessage: typeof payload.running_archive_message === 'string' ? payload.running_archive_message : null,
    pendingArchivePaths: payload.pending_archive_paths,
    thumbnailRunningCount:
      typeof payload.thumbnail_running_count === 'number' && Number.isFinite(payload.thumbnail_running_count)
        ? Math.max(0, Math.round(payload.thumbnail_running_count))
        : 0,
    thumbnailRunningProgress:
      typeof payload.thumbnail_running_progress === 'number' && Number.isFinite(payload.thumbnail_running_progress)
        ? payload.thumbnail_running_progress
        : null,
    thumbnailRunningMessage:
      typeof payload.thumbnail_running_message === 'string' ? payload.thumbnail_running_message : null,
  }
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
    let queuedRefresh = false
    let currentStatus = EMPTY_ARCHIVE_LOAD_STATUS
    let pollTimerId: ReturnType<typeof setTimeout> | null = null

    const applyStatus = (nextStatus: ArchiveLoadStatusState) => {
      currentStatus = nextStatus
      setArchiveLoadStatus((previous) => (areArchiveLoadStatusEqual(previous, nextStatus) ? previous : nextStatus))
    }

    const schedulePoll = (delayMs: number) => {
      if (disposed) {
        return
      }
      if (pollTimerId !== null) {
        clearTimeout(pollTimerId)
      }
      pollTimerId = setTimeout(() => {
        pollTimerId = null
        void refreshArchiveLoadStatus()
      }, Math.max(100, delayMs))
    }

    const refreshArchiveLoadStatus = async () => {
      if (disposed) {
        return
      }
      if (runningRequest) {
        queuedRefresh = true
        return
      }

      runningRequest = true
      try {
        const status = await repository.readArchiveLoadStatus?.({ timeoutMs: 3_000 })
        if (!disposed && status) {
          applyStatus(mapArchiveLoadStatus(status))
        }
      } catch {
        // keep last status snapshot to avoid flicker under transient IPC pressure
      } finally {
        runningRequest = false
        const shouldRefreshAgain = queuedRefresh
        queuedRefresh = false
        if (shouldRefreshAgain) {
          void refreshArchiveLoadStatus()
        } else {
          schedulePoll(isArchiveLoadStatusBusy(currentStatus) ? ARCHIVE_STATUS_ACTIVE_POLL_MS : ARCHIVE_STATUS_IDLE_POLL_MS)
        }
      }
    }

    void refreshArchiveLoadStatus()
    const unsubscribe = repository.onLibraryChanged?.((payload) => {
      if (!ARCHIVE_STATUS_REFRESH_REASONS.has(payload.reason)) {
        return
      }
      queuedRefresh = true
      void refreshArchiveLoadStatus()
    })

    return () => {
      disposed = true
      if (pollTimerId !== null) {
        clearTimeout(pollTimerId)
      }
      unsubscribe?.()
    }
  }, [repository])

  return archiveLoadStatus
}

export type ArchiveLoadStatusResult = ReturnType<typeof useArchiveLoadStatus>
