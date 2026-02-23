import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  buildRequestKey,
  buildResolveRequest,
  isAbortError,
  isSyncResolveRepository,
  runTasksWithConcurrency,
  toErrorMessage,
  type MediaResolveTarget,
} from './mediaResolveUtils'
import type { MediaRepository } from './repository'

export type { MediaResolveTarget } from './mediaResolveUtils'

const MEDIA_RESOLVE_TIMEOUT_MS = 8_000
const CACHE_REFRESH_LEEWAY_MS = 15_000
const DEFAULT_MAX_CONCURRENT = 8
const FAILURE_RETRY_BASE_MS = 3_000
const FAILURE_RETRY_MAX_MS = 20_000

const CACHE_INVALIDATION_IGNORED_LIBRARY_CHANGE_REASONS = new Set([
  'import-task-updated',
  'write-package-grade',
  'write-package-metadata',
  'write-package-external-metadata',
  'write-video-metadata',
  'thumbnail-rendering-start',
  'thumbnail-rendering-progress',
  'thumbnail-rendering-end',
])

interface CachedMediaUrl {
  resourceUrl: string
  expiresAtMs: number
}

interface CachedResolveFailure {
  message: string
  failureCount: number
  nextRetryAtMs: number
}

export interface UseResolvedMediaUrlsOptions {
  // How to apply resolved urls into React state.
  // - immediate: update state per target (baseline)
  // - raf: batch state updates and flush once per animation frame
  applyMode?: 'immediate' | 'raf'

  // State retention policy.
  // - accumulate: keep urls for all targets ever seen in this hook instance (baseline)
  // - active-only: keep only currently requested targets; rely on internal cache for quick re-apply
  stateScope?: 'accumulate' | 'active-only'

  // Limit in-flight resolveMediaResource requests.
  maxConcurrent?: number
}

interface UseResolvedMediaUrlsParams {
  repository: MediaRepository
  targets: MediaResolveTarget[]
  options?: UseResolvedMediaUrlsOptions
}

interface UseResolvedMediaUrlsResult {
  urlByTargetId: Record<string, string>
  errorByTargetId: Record<string, string>
}


export function useResolvedMediaUrls({
  repository,
  targets,
  options,
}: UseResolvedMediaUrlsParams): UseResolvedMediaUrlsResult {
  const urlCacheByLocatorKeyRef = useRef(new Map<string, CachedMediaUrl>())
  const failedRequestByKeyRef = useRef(new Map<string, CachedResolveFailure>())

  const applyMode = options?.applyMode === 'raf' ? 'raf' : 'immediate'
  const stateScope = options?.stateScope === 'active-only' ? 'active-only' : 'accumulate'
  const maxConcurrentRaw = options?.maxConcurrent
  const maxConcurrent =
    typeof maxConcurrentRaw === 'number' && Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0
      ? Math.max(1, Math.round(maxConcurrentRaw))
      : DEFAULT_MAX_CONCURRENT

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
        ...buildResolveRequest(target),
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
    if (!repository.onLibraryChanged) {
      return
    }

    const unsubscribe = repository.onLibraryChanged((payload) => {
      if (CACHE_INVALIDATION_IGNORED_LIBRARY_CHANGE_REASONS.has(payload.reason)) {
        return
      }

      urlCacheByLocatorKeyRef.current.clear()
      failedRequestByKeyRef.current.clear()
      setErrorByTargetId({})
    })

    return unsubscribe
  }, [repository])

  const pendingUrlUpdatesRef = useRef(new Map<string, string>())
  const pendingErrorUpdatesRef = useRef(new Map<string, string | null>())
  const flushHandleRef = useRef<{ rafId: number | null; timeoutId: number | null } | null>(null)

  const flushPendingUpdates = useCallback(() => {
    const urlUpdates = pendingUrlUpdatesRef.current
    const errorUpdates = pendingErrorUpdatesRef.current
    pendingUrlUpdatesRef.current = new Map()
    pendingErrorUpdatesRef.current = new Map()

    if (urlUpdates.size > 0) {
      setUrlByTargetId((previous) => {
        let changed = false
        const next = { ...previous }
        for (const [targetId, url] of urlUpdates) {
          if (next[targetId] !== url) {
            next[targetId] = url
            changed = true
          }
        }
        return changed ? next : previous
      })
    }

    if (errorUpdates.size > 0) {
      setErrorByTargetId((previous) => {
        let changed = false
        const next: Record<string, string> = { ...previous }
        for (const [targetId, value] of errorUpdates) {
          if (value === null) {
            if (targetId in next) {
              delete next[targetId]
              changed = true
            }
            continue
          }
          if (next[targetId] !== value) {
            next[targetId] = value
            changed = true
          }
        }
        return changed ? next : previous
      })
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (applyMode !== 'raf') {
      return
    }
    if (flushHandleRef.current !== null) {
      return
    }

    const handle: { rafId: number | null; timeoutId: number | null } = { rafId: null, timeoutId: null }
    flushHandleRef.current = handle

    const flush = () => {
      const activeHandle = flushHandleRef.current
      if (!activeHandle) {
        return
      }

      flushHandleRef.current = null
      try {
        if (activeHandle.rafId !== null) {
          window.cancelAnimationFrame(activeHandle.rafId)
        }
        if (activeHandle.timeoutId !== null) {
          window.clearTimeout(activeHandle.timeoutId)
        }
      } catch {
        // ignore
      }

      flushPendingUpdates()
    }

    // Prefer flush on animation frame, but also schedule a fallback in case rAF is paused.
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      handle.rafId = window.requestAnimationFrame(() => {
        flush()
      })
    }
    handle.timeoutId = window.setTimeout(() => {
      flush()
    }, 50)
  }, [applyMode, flushPendingUpdates])

  useEffect(() => {
    if (syncSnapshot) {
      return
    }

    if (targets.length === 0) {
      if (stateScope === 'active-only') {
        setUrlByTargetId((previous) => (Object.keys(previous).length === 0 ? previous : {}))
        setErrorByTargetId((previous) => (Object.keys(previous).length === 0 ? previous : {}))
      }
      return
    }

    const abortController = new AbortController()
    let active = true

    const applyUrl = (targetId: string, url: string) => {
      if (!active) {
        return
      }

      if (applyMode === 'raf') {
        pendingUrlUpdatesRef.current.set(targetId, url)
        pendingErrorUpdatesRef.current.set(targetId, null)
        scheduleFlush()
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

      if (applyMode === 'raf') {
        pendingErrorUpdatesRef.current.set(targetId, message)
        scheduleFlush()
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

    const targetIdsByRequestKey = new Map<string, string[]>()
    const targetByRequestKey = new Map<string, MediaResolveTarget>()
    const activeTargetIds = new Set<string>()

    for (const target of targets) {
      if (!target.locator) {
        continue
      }

      const requestKey = buildRequestKey(target)
      if (!requestKey) {
        continue
      }
      targetByRequestKey.set(requestKey, target)

      const list = targetIdsByRequestKey.get(requestKey) ?? []
      list.push(target.targetId)
      targetIdsByRequestKey.set(requestKey, list)

      activeTargetIds.add(target.targetId)
    }

    if (stateScope === 'active-only') {
      setUrlByTargetId((previous) => {
        const nextUrls: Record<string, string> = {}
        for (const [requestKey, targetIds] of targetIdsByRequestKey) {
          const cached = urlCacheByLocatorKeyRef.current.get(requestKey)
          const now = Date.now()
          const cachedUrl =
            cached && cached.expiresAtMs > now + CACHE_REFRESH_LEEWAY_MS
              ? cached.resourceUrl
              : null

          if (!cachedUrl) {
            if (cached) {
              urlCacheByLocatorKeyRef.current.delete(requestKey)
            }

            for (const targetId of targetIds) {
              const previousUrl = previous[targetId]
              if (typeof previousUrl === 'string' && previousUrl.length > 0) {
                nextUrls[targetId] = previousUrl
              }
            }
            continue
          }

          for (const targetId of targetIds) {
            nextUrls[targetId] = cachedUrl
          }
        }

        const prevKeys = Object.keys(previous)
        const nextKeys = Object.keys(nextUrls)
        if (prevKeys.length === nextKeys.length) {
          let same = true
          for (const key of nextKeys) {
            if (previous[key] !== nextUrls[key]) {
              same = false
              break
            }
          }
          if (same) {
            return previous
          }
        }
        return nextUrls
      })

      setErrorByTargetId((previous) => {
        let changed = false
        const next: Record<string, string> = {}
        for (const [key, value] of Object.entries(previous)) {
          if (activeTargetIds.has(key)) {
            next[key] = value
          } else {
            changed = true
          }
        }
        return changed ? next : previous
      })
    }

    const tasks: Array<() => Promise<void>> = []
    for (const [requestKey, targetIds] of targetIdsByRequestKey) {
      const cached = urlCacheByLocatorKeyRef.current.get(requestKey)
      const now = Date.now()
      const cachedUrl =
        cached && cached.expiresAtMs > now + CACHE_REFRESH_LEEWAY_MS
          ? cached.resourceUrl
          : null
      if (cached && !cachedUrl) {
        urlCacheByLocatorKeyRef.current.delete(requestKey)
      }
      if (cachedUrl) {
        failedRequestByKeyRef.current.delete(requestKey)
        for (const targetId of targetIds) {
          applyUrl(targetId, cachedUrl)
        }
        continue
      }

      const failedRecord = failedRequestByKeyRef.current.get(requestKey)
      if (failedRecord && failedRecord.nextRetryAtMs > now) {
        for (const targetId of targetIds) {
          applyError(targetId, failedRecord.message)
        }
        continue
      }

      const target = targetByRequestKey.get(requestKey)
      if (!target?.locator) {
        continue
      }

      tasks.push(async () => {
        const request = buildResolveRequest(target)
        try {
          const response = await repository.resolveMediaResource(request, {
            signal: abortController.signal,
            timeoutMs: MEDIA_RESOLVE_TIMEOUT_MS,
          })
          const expiresAtMs =
            Number.isFinite(response.expires_at_ms) && response.expires_at_ms > 0
              ? response.expires_at_ms
              : Date.now() + 60_000
          urlCacheByLocatorKeyRef.current.set(requestKey, {
            resourceUrl: response.resource_url,
            expiresAtMs,
          })
          failedRequestByKeyRef.current.delete(requestKey)
          for (const targetId of targetIds) {
            applyUrl(targetId, response.resource_url)
          }
        } catch (error: unknown) {
          if (isAbortError(error)) {
            return
          }
          const message = toErrorMessage(error)
          const previousFailure = failedRequestByKeyRef.current.get(requestKey)
          const failureCount = (previousFailure?.failureCount ?? 0) + 1
          const retryDelayMs = Math.min(
            FAILURE_RETRY_MAX_MS,
            FAILURE_RETRY_BASE_MS * Math.max(1, 2 ** Math.max(0, failureCount - 1)),
          )
          failedRequestByKeyRef.current.set(requestKey, {
            message,
            failureCount,
            nextRetryAtMs: Date.now() + retryDelayMs,
          })
          for (const targetId of targetIds) {
            applyError(targetId, message)
          }
        }
      })
    }

    void runTasksWithConcurrency(tasks, maxConcurrent, abortController.signal)

    return () => {
      active = false
      abortController.abort()

      if (flushHandleRef.current !== null) {
        const handle = flushHandleRef.current
        flushHandleRef.current = null
        try {
          if (handle.rafId !== null) {
            window.cancelAnimationFrame(handle.rafId)
          }
          if (handle.timeoutId !== null) {
            window.clearTimeout(handle.timeoutId)
          }
        } catch {
          // ignore
        }
      }
      pendingUrlUpdatesRef.current.clear()
      pendingErrorUpdatesRef.current.clear()
    }
  }, [applyMode, maxConcurrent, repository, scheduleFlush, stateScope, syncSnapshot, targets])

  if (syncSnapshot) {
    return syncSnapshot
  }

  return {
    urlByTargetId,
    errorByTargetId,
  }
}
