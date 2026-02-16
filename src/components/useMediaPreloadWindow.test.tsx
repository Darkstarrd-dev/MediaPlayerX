import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useMediaPreloadWindow } from './useMediaPreloadWindow'

interface MediaLike {
  pauseSpy: ReturnType<typeof vi.spyOn>
  loadSpy: ReturnType<typeof vi.spyOn>
  removeAttributeSpy: ReturnType<typeof vi.spyOn>
  element: HTMLMediaElement
}

describe('useMediaPreloadWindow', () => {
  it('preloads nearby items within budget and releases stale preloaders', () => {
    const originalCreateElement = document.createElement.bind(document)
    const created: MediaLike[] = []

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options) as HTMLMediaElement
      if (tagName === 'video' || tagName === 'audio') {
        created.push({
          element,
          pauseSpy: vi.spyOn(element, 'pause').mockImplementation(() => undefined),
          loadSpy: vi.spyOn(element, 'load').mockImplementation(() => undefined),
          removeAttributeSpy: vi.spyOn(element, 'removeAttribute'),
        })
      }
      return element
    })

    const items = [
      { id: 'a', src: 'https://example.com/a.mp4', sizeMb: 20 },
      { id: 'b', src: 'https://example.com/b.mp4', sizeMb: 20 },
      { id: 'c', src: 'https://example.com/c.mp4', sizeMb: 20 },
      { id: 'd', src: 'https://example.com/d.mp4', sizeMb: 20 },
    ]

    const { rerender } = renderHook(
      (activeId: string) =>
        useMediaPreloadWindow({
          mediaType: 'video',
          items,
          activeId,
          budgetMb: 40,
          lookBehind: 1,
          lookAhead: 2,
        }),
      { initialProps: 'b' },
    )

    expect(created).toHaveLength(2)
    expect(created.map((entry) => entry.element.src)).toEqual([
      'https://example.com/a.mp4',
      'https://example.com/c.mp4',
    ])

    rerender('c')

    expect(created).toHaveLength(4)
    expect(created[0]?.pauseSpy.mock.calls.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(created[0]?.removeAttributeSpy).toHaveBeenCalledWith('src')
    expect(created[1]?.pauseSpy.mock.calls.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(created[1]?.removeAttributeSpy).toHaveBeenCalledWith('src')

    createElementSpy.mockRestore()
  })

  it('skips preloading when budget cannot cover default fallback size', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')

    renderHook(() =>
      useMediaPreloadWindow({
        mediaType: 'audio',
        activeId: 'b',
        budgetMb: 10,
        items: [
          { id: 'a', src: 'https://example.com/a.mp3', sizeMb: 0 },
          { id: 'b', src: 'https://example.com/b.mp3', sizeMb: 0 },
          { id: 'c', src: 'https://example.com/c.mp3', sizeMb: Number.NaN },
        ],
        lookBehind: 1,
        lookAhead: 1,
      }),
    )

    const audioCreateCalls = createElementSpy.mock.calls.filter(([tagName]) => tagName === 'audio')
    expect(audioCreateCalls).toHaveLength(0)
    createElementSpy.mockRestore()
  })
})
