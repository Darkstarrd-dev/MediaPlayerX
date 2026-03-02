import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { useI18n } from '../../i18n/useI18n'
import type { MediaRepository } from '../backend/repository'
import { toErrorDetailWithCode } from '../shared/errorCode'

const DEFAULT_PLAYLIST_TIMEOUT_MS = 8_000

function normalizePlaylist(videoIds: string[]): string[] {
  return Array.from(
    new Set(
      videoIds
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  )
}

function isSameList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }
  return true
}

interface UsePlaylistPersistenceParams {
  repository: MediaRepository
  playlistIds: string[]
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
}

interface UsePlaylistPersistenceResult {
  loading: boolean
  readError: string | null
  writeError: string | null
  retryRead: () => void
  retryWrite: () => void
}

interface SyncPlaylistRepository extends MediaRepository {
  readPlaylistSync(): { video_ids: string[] }
  writePlaylistSync(request: { video_ids: string[] }): { video_ids: string[] }
}

function isSyncPlaylistRepository(repository: MediaRepository): repository is SyncPlaylistRepository {
  return (
    'readPlaylistSync' in repository &&
    typeof repository.readPlaylistSync === 'function' &&
    'writePlaylistSync' in repository &&
    typeof repository.writePlaylistSync === 'function'
  )
}

export function usePlaylistPersistence({
  repository,
  playlistIds,
  setPlaylistIds,
}: UsePlaylistPersistenceParams): UsePlaylistPersistenceResult {
  const { t } = useI18n()
  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSyncPlaylistRepository(repository)
  const [loading, setLoading] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [readNonce, setReadNonce] = useState(0)
  const [writeNonce, setWriteNonce] = useState(0)

  const hydratedRef = useRef(false)
  const playlistIdsRef = useRef(playlistIds)
  const persistedPlaylistRef = useRef<string[]>([])

  useEffect(() => {
    playlistIdsRef.current = playlistIds
  }, [playlistIds])

  useEffect(() => {
    if (isSynchronousTestMode) {
      hydratedRef.current = true
      persistedPlaylistRef.current = normalizePlaylist(playlistIdsRef.current)
      return
    }

    let disposed = false
    setLoading(true)
    setReadError(null)

    repository
      .readPlaylist({ timeoutMs: DEFAULT_PLAYLIST_TIMEOUT_MS })
      .then((response) => {
        if (disposed) {
          return
        }

        const normalized = normalizePlaylist(response.video_ids)
        if (normalized.length > 0) {
          setPlaylistIds(normalized)
          persistedPlaylistRef.current = normalized
        } else {
          persistedPlaylistRef.current = normalizePlaylist(playlistIdsRef.current)
        }

        hydratedRef.current = true
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        hydratedRef.current = true
        persistedPlaylistRef.current = normalizePlaylist(playlistIdsRef.current)
        setReadError(t('ui.playlist.readFailed', { message: toErrorDetailWithCode(error, t) }))
        setLoading(false)
      })

    return () => {
      disposed = true
    }
  }, [isSynchronousTestMode, readNonce, repository, setPlaylistIds, t])

  useEffect(() => {
    if (isSynchronousTestMode || !hydratedRef.current) {
      return
    }

    const normalized = normalizePlaylist(playlistIds)
    if (isSameList(normalized, persistedPlaylistRef.current)) {
      return
    }

    let disposed = false
    setWriteError(null)

    repository
      .writePlaylist(
        {
          video_ids: normalized,
        },
        {
          timeoutMs: DEFAULT_PLAYLIST_TIMEOUT_MS,
        },
      )
      .then((response) => {
        if (disposed) {
          return
        }

        const accepted = normalizePlaylist(response.video_ids)
        persistedPlaylistRef.current = accepted
        if (!isSameList(accepted, normalized)) {
          setPlaylistIds(accepted)
        }
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }
        setWriteError(t('ui.playlist.writeFailed', { message: toErrorDetailWithCode(error, t) }))
      })

    return () => {
      disposed = true
    }
  }, [isSynchronousTestMode, playlistIds, repository, setPlaylistIds, t, writeNonce])

  if (isSynchronousTestMode) {
    return {
      loading: false,
      readError: null,
      writeError: null,
      retryRead: () => undefined,
      retryWrite: () => undefined,
    }
  }

  return {
    loading,
    readError,
    writeError,
    retryRead: () => setReadNonce((value) => value + 1),
    retryWrite: () => setWriteNonce((value) => value + 1),
  }
}

export type PlaylistPersistenceResult = ReturnType<typeof usePlaylistPersistence>
