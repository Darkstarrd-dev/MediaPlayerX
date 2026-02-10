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
    emitLibraryChanged: () => {
      listener?.({
        reason: 'test-refresh',
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
})
