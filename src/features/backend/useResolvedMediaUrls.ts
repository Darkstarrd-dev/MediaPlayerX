import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
} from '../../contracts/backend'
import type { MediaLocator } from '../../types'
import { mapMediaLocatorToDto, mediaLocatorKey } from './mediaLocator'
import type { ReadonlyMediaRepository } from './repository'

const MEDIA_RESOLVE_TIMEOUT_MS = 8_000

export interface MediaResolveTarget {
  targetId: string
  locator: MediaLocator | null
}

interface UseResolvedMediaUrlsParams {
  repository: ReadonlyMediaRepository
  targets: MediaResolveTarget[]
}

interface UseResolvedMediaUrlsResult {
  urlByTargetId: Record<string, string>
  errorByTargetId: Record<string, string>
}

interface SyncResolveRepository extends ReadonlyMediaRepository {
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '媒体 URL 解析失败'
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isSyncResolveRepository(repository: ReadonlyMediaRepository): repository is SyncResolveRepository {
  return 'resolveMediaResourceSync' in repository && typeof repository.resolveMediaResourceSync === 'function'
}

export function useResolvedMediaUrls({
  repository,
  targets,
}: UseResolvedMediaUrlsParams): UseResolvedMediaUrlsResult {
  const urlCacheByLocatorKeyRef = useRef(new Map<string, string>())

  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSyncResolveRepository(repository)

  const syncSnapshot = useMemo<UseResolvedMediaUrlsResult | null>(() => {
    if (!isSynchronousTestMode) {
      return null
    }

    const urlByTargetId: Record<string, string> = {}
    for (const target of targets) {
      if (!target.locator) {
        continue
      }

      const resolvedUrl = repository.resolveMediaResourceSync({
        locator: mapMediaLocatorToDto(target.locator),
      }).resource_url

      urlByTargetId[target.targetId] = resolvedUrl
    }

    return {
      urlByTargetId,
      errorByTargetId: {},
    }
  }, [isSynchronousTestMode, repository, targets])

  const [urlByTargetId, setUrlByTargetId] = useState<Record<string, string>>({})
  const [errorByTargetId, setErrorByTargetId] = useState<Record<string, string>>({})

  useEffect(() => {
    if (syncSnapshot) {
      return
    }

    if (targets.length === 0) {
      return
    }

    const abortController = new AbortController()
    let active = true

    const applyUrl = (targetId: string, url: string) => {
      if (!active) {
        return
      }
      setUrlByTargetId((previous) => {
        if (previous[targetId] === url) {
          return previous
        }
        return {
          ...previous,
          [targetId]: url,
        }
      })
      setErrorByTargetId((previous) => {
        if (!(targetId in previous)) {
          return previous
        }
        const next = { ...previous }
        delete next[targetId]
        return next
      })
    }

    const applyError = (targetId: string, message: string) => {
      if (!active) {
        return
      }
      setErrorByTargetId((previous) => {
        if (previous[targetId] === message) {
          return previous
        }
        return {
          ...previous,
          [targetId]: message,
        }
      })
    }

    const targetIdsByLocatorKey = new Map<string, string[]>()
    const locatorByKey = new Map<string, MediaLocator>()

    for (const target of targets) {
      if (!target.locator) {
        continue
      }

      const locator = target.locator
      const locatorKey = mediaLocatorKey(locator)
      locatorByKey.set(locatorKey, locator)

      const list = targetIdsByLocatorKey.get(locatorKey) ?? []
      list.push(target.targetId)
      targetIdsByLocatorKey.set(locatorKey, list)
    }

    for (const [locatorKey, targetIds] of targetIdsByLocatorKey) {
      const cachedUrl = urlCacheByLocatorKeyRef.current.get(locatorKey)
      if (cachedUrl) {
        for (const targetId of targetIds) {
          applyUrl(targetId, cachedUrl)
        }
        continue
      }

      const locator = locatorByKey.get(locatorKey)
      if (!locator) {
        continue
      }

      repository
        .resolveMediaResource(
          {
            locator: mapMediaLocatorToDto(locator),
          },
          {
            signal: abortController.signal,
            timeoutMs: MEDIA_RESOLVE_TIMEOUT_MS,
          },
        )
        .then((response) => {
          urlCacheByLocatorKeyRef.current.set(locatorKey, response.resource_url)
          for (const targetId of targetIds) {
            applyUrl(targetId, response.resource_url)
          }
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) {
            return
          }
          const message = toErrorMessage(error)
          for (const targetId of targetIds) {
            applyError(targetId, message)
          }
        })
    }

    return () => {
      active = false
      abortController.abort()
    }
  }, [repository, syncSnapshot, targets])

  if (syncSnapshot) {
    return syncSnapshot
  }

  return {
    urlByTargetId,
    errorByTargetId,
  }
}
