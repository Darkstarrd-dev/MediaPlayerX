import { useCallback, useEffect, useRef, useState } from 'react'

import type { MediaRepository } from '../backend/repository/types'

const MUSIC_BOOKLET_BINDINGS_STATE_KEY = 'music_booklet_bindings_v1'
const MUSIC_IMPORT_SOURCES_STATE_KEY = 'music_import_sources_v1'

export interface MusicBookletBindingOverride {
  coverSourceId?: string | null
  bookletSourceId?: string | null
}

export type MusicBookletBindingMap = Record<string, MusicBookletBindingOverride>

function normalizeSourceId(value: unknown): string | null | undefined {
  if (typeof value !== 'string') {
    return typeof value === 'undefined' ? undefined : null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized
}

function normalizeMusicBookletBindingMap(raw: unknown): MusicBookletBindingMap {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const next: MusicBookletBindingMap = {}
  for (const [rawAlbumRoot, rawBinding] of Object.entries(raw as Record<string, unknown>)) {
    const albumRootPath = rawAlbumRoot.trim()
    if (!albumRootPath || !rawBinding || typeof rawBinding !== 'object') {
      continue
    }

    const bindingRecord = rawBinding as Record<string, unknown>
    const coverSourceId = normalizeSourceId(bindingRecord.coverSourceId)
    const bookletSourceId = normalizeSourceId(bindingRecord.bookletSourceId)

    if (typeof coverSourceId === 'undefined' && typeof bookletSourceId === 'undefined') {
      continue
    }

    next[albumRootPath] = {
      ...(typeof coverSourceId !== 'undefined' ? { coverSourceId } : {}),
      ...(typeof bookletSourceId !== 'undefined' ? { bookletSourceId } : {}),
    }
  }

  return next
}

function normalizeMusicImportSources(raw: unknown): { directories: string[]; files: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { directories: [], files: [] }
  }

  const record = raw as Record<string, unknown>
  const normalizeEntries = (value: unknown): string[] =>
    Array.isArray(value)
      ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)))
      : []

  return {
    directories: normalizeEntries(record.directories),
    files: normalizeEntries(record.files),
  }
}

interface UseMusicBookletBindingsParams {
  repository: MediaRepository
}

export function useMusicBookletBindings({ repository }: UseMusicBookletBindingsParams) {
  const [bindingsByAlbumRoot, setBindingsByAlbumRoot] = useState<MusicBookletBindingMap>({})
  const [musicImportDirectories, setMusicImportDirectories] = useState<string[]>([])
  const [musicImportFiles, setMusicImportFiles] = useState<string[]>([])
  const isHydratedRef = useRef(false)
  const lastSavedJsonRef = useRef('')
  const pendingJsonRef = useRef<string | null>(null)

  useEffect(() => {
    if (!repository.readAppState) {
      isHydratedRef.current = true
      return
    }

    Promise.all([
      repository.readAppState({ state_key: MUSIC_BOOKLET_BINDINGS_STATE_KEY }).catch(() => null),
      repository.readAppState({ state_key: MUSIC_IMPORT_SOURCES_STATE_KEY }).catch(() => null),
    ])
      .then(([bindingResponse, musicImportResponse]) => {
        if (bindingResponse?.state_json && bindingResponse.state_json !== 'null') {
          try {
            const parsed = normalizeMusicBookletBindingMap(JSON.parse(bindingResponse.state_json))
            setBindingsByAlbumRoot(parsed)
          } catch {
            setBindingsByAlbumRoot({})
          }
        }

        if (musicImportResponse?.state_json && musicImportResponse.state_json !== 'null') {
          try {
            const parsed = normalizeMusicImportSources(JSON.parse(musicImportResponse.state_json))
            setMusicImportDirectories(parsed.directories)
            setMusicImportFiles(parsed.files)
          } catch {
            setMusicImportDirectories([])
            setMusicImportFiles([])
          }
        }

        isHydratedRef.current = true
      })
      .catch(() => {
        isHydratedRef.current = true
      })
  }, [repository])

  const persistJson = useCallback(
    async (json: string) => {
      if (!repository.writeAppState) {
        return
      }

      try {
        await repository.writeAppState({
          state_key: MUSIC_BOOKLET_BINDINGS_STATE_KEY,
          state_json: json,
        })
        lastSavedJsonRef.current = json
      } catch {
        // ignore persistence failures and keep UI interactive
      }
    },
    [repository],
  )

  useEffect(() => {
    if (!isHydratedRef.current || !repository.writeAppState) {
      return
    }

    const currentJson = JSON.stringify(bindingsByAlbumRoot)
    if (currentJson === lastSavedJsonRef.current) {
      pendingJsonRef.current = null
      return
    }

    pendingJsonRef.current = currentJson
    const timer = window.setTimeout(() => {
      const pending = pendingJsonRef.current
      if (!pending) {
        return
      }
      pendingJsonRef.current = null
      void persistJson(pending)
    }, 260)

    return () => window.clearTimeout(timer)
  }, [bindingsByAlbumRoot, persistJson, repository])

  const setBindingOverride = useCallback(
    (
      albumRootPath: string,
      patch: {
        coverSourceId?: string | null | undefined
        bookletSourceId?: string | null | undefined
      },
    ) => {
      const normalizedRootPath = albumRootPath.trim()
      if (!normalizedRootPath) {
        return
      }

      setBindingsByAlbumRoot((previous) => {
        const current = previous[normalizedRootPath] ?? {}
        const next: MusicBookletBindingOverride = {
          ...current,
          ...(typeof patch.coverSourceId !== 'undefined' ? { coverSourceId: patch.coverSourceId } : {}),
          ...(typeof patch.bookletSourceId !== 'undefined' ? { bookletSourceId: patch.bookletSourceId } : {}),
        }

        const hasCover = typeof next.coverSourceId !== 'undefined'
        const hasBooklet = typeof next.bookletSourceId !== 'undefined'
        if (!hasCover && !hasBooklet) {
          if (!(normalizedRootPath in previous)) {
            return previous
          }
          const cleaned = { ...previous }
          delete cleaned[normalizedRootPath]
          return cleaned
        }

        if (
          current.coverSourceId === next.coverSourceId &&
          current.bookletSourceId === next.bookletSourceId
        ) {
          return previous
        }

        return {
          ...previous,
          [normalizedRootPath]: next,
        }
      })
    },
    [],
  )

  const resetBindingOverride = useCallback((albumRootPath: string) => {
    const normalizedRootPath = albumRootPath.trim()
    if (!normalizedRootPath) {
      return
    }

    setBindingsByAlbumRoot((previous) => {
      if (!(normalizedRootPath in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[normalizedRootPath]
      return next
    })
  }, [])

  return {
    bindingsByAlbumRoot,
    musicImportDirectories,
    musicImportFiles,
    setBindingOverride,
    resetBindingOverride,
  }
}

export type MusicBookletBindingsResult = ReturnType<typeof useMusicBookletBindings>
