import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MediaRepository } from './repository'
import { type MediaResolveTarget, useResolvedMediaUrls } from './useResolvedMediaUrls'

function createFailingRepository() {
  let listener: ((payload: { reason: string; updated_at_ms: number }) => void) | null = null

  const resolveMediaResource = vi.fn(async () => {
    throw new Error('resolve-failed')
  })

  const repository = {
    resolveMediaResource,
    onLibraryChanged(nextListener: (payload: { reason: string; updated_at_ms: number }) => void) {
      listener = nextListener
      return () => {
        if (listener === nextListener) {
          listener = null
        }
      }
    },
  } as unknown as MediaRepository

  return {
    repository,
    resolveMediaResource,
    emitLibraryChanged: (reason = 'test-refresh') => {
      listener?.({
        reason,
        updated_at_ms: Date.now(),
      })
    },
  }
}

const baseTarget: MediaResolveTarget = {
  targetId: 'target-1',
  locator: {
    kind: 'filesystem',
    absolutePath: 'Z:/mock/not-exists.jpg',
    extension: '.jpg',
    mediaType: 'image',
    mimeType: 'image/jpeg',
  },
  variant: 'thumbnail',
  thumbnailMaxEdge: 240,
  thumbnailQuality: 82,
}

describe('useResolvedMediaUrls', () => {
  it('失败后在退避窗口内不会对同一请求反复调用 resolveMediaResource', async () => {
    const { repository, resolveMediaResource } = createFailingRepository()

    const { rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    rerender({
      targets: [{ ...baseTarget }],
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(resolveMediaResource).toHaveBeenCalledTimes(1)
  })

  it('库变更事件会清空失败退避并允许立即重试解析', async () => {
    const { repository, resolveMediaResource, emitLibraryChanged } = createFailingRepository()

    const { rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    expect(resolveMediaResource).toHaveBeenCalledTimes(1)

    act(() => {
      emitLibraryChanged()
    })

    rerender({
      targets: [{ ...baseTarget }],
    })

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(2)
    })
  })

  it('write-package-grade 事件不会清空失败退避窗口', async () => {
    const { repository, resolveMediaResource, emitLibraryChanged } = createFailingRepository()

    const { rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    expect(resolveMediaResource).toHaveBeenCalledTimes(1)

    act(() => {
      emitLibraryChanged('write-package-grade')
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(resolveMediaResource).toHaveBeenCalledTimes(1)
  })

  it('元数据写入事件不会清空失败退避窗口', async () => {
    const { repository, resolveMediaResource, emitLibraryChanged } = createFailingRepository()

    const { rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    expect(resolveMediaResource).toHaveBeenCalledTimes(1)

    act(() => {
      emitLibraryChanged('write-package-metadata')
      emitLibraryChanged('write-package-external-metadata')
      emitLibraryChanged('write-video-metadata')
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(resolveMediaResource).toHaveBeenCalledTimes(1)
  })

  it('thumbnail-rendering 事件不会清空失败退避窗口', async () => {
    const { repository, resolveMediaResource, emitLibraryChanged } = createFailingRepository()

    const { rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    expect(resolveMediaResource).toHaveBeenCalledTimes(1)

    act(() => {
      emitLibraryChanged('thumbnail-rendering-start')
      emitLibraryChanged('thumbnail-rendering-end')
    })

    rerender({
      targets: [{ ...baseTarget }],
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(resolveMediaResource).toHaveBeenCalledTimes(1)
  })

  it('active-only 在缓存刷新窗口会保留当前目标 url，避免短暂置空', async () => {
    const pendingResolves: Array<
      (value: { resource_url: string; expires_at_ms: number }) => void
    > = []
    const resolveMediaResource = vi.fn(
      () =>
        new Promise<{ resource_url: string; expires_at_ms: number }>((resolve) => {
          pendingResolves.push(resolve)
        }),
    )

    const repository = {
      resolveMediaResource,
    } as unknown as MediaRepository

    const { result, rerender } = renderHook(
      ({ targets }: { targets: MediaResolveTarget[] }) =>
        useResolvedMediaUrls({
          repository,
          targets,
          options: {
            applyMode: 'immediate',
            stateScope: 'active-only',
          },
        }),
      {
        initialProps: {
          targets: [baseTarget],
        },
      },
    )

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      const resolveFirst = pendingResolves.shift()
      resolveFirst?.({
        resource_url: 'mpx://resource-old',
        // 小于刷新提前量，下一轮会触发刷新请求
        expires_at_ms: Date.now() + 1_000,
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.urlByTargetId['target-1']).toBe('mpx://resource-old')
    })

    rerender({
      targets: [{ ...baseTarget }],
    })

    await waitFor(() => {
      expect(resolveMediaResource).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.urlByTargetId['target-1']).toBe('mpx://resource-old')

    await act(async () => {
      const resolveSecond = pendingResolves.shift()
      resolveSecond?.({
        resource_url: 'mpx://resource-new',
        expires_at_ms: Date.now() + 60_000,
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.urlByTargetId['target-1']).toBe('mpx://resource-new')
    })
  })
})
