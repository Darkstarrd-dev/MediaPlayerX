import { describe, expect, it, vi } from 'vitest'

import { createWorkspaceImageMainSectionHandlers } from './workspaceImageMainSectionHandlers'

function createParams(
  thumbnailScale: number,
  updateSettings: ReturnType<typeof vi.fn>,
) {
  return {
    thumbnailScaleLevelCount: 7,
    appSettings: {
      thumbnailScale,
      updateSettings,
    },
    clearAllSelections: vi.fn(),
    manageAdReview: {
      dismissTask: vi.fn(),
    },
  } as unknown as Parameters<typeof createWorkspaceImageMainSectionHandlers>[0]
}

describe('createWorkspaceImageMainSectionHandlers 缩略图缩放映射', () => {
  it('滑条等级应直接映射到 thumbnailScale（1->1, 7->7）', () => {
    const updateSettings = vi.fn()
    const handlers = createWorkspaceImageMainSectionHandlers(
      createParams(4, updateSettings),
    )

    handlers.onThumbnailScaleLevelChange(1)
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 1 })

    handlers.onThumbnailScaleLevelChange(7)
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 7 })
  })

  it('会做边界钳制并在值未变化时不重复写入', () => {
    const updateSettings = vi.fn()
    const handlers = createWorkspaceImageMainSectionHandlers(
      createParams(3, updateSettings),
    )

    handlers.onThumbnailScaleLevelChange(3)
    expect(updateSettings).not.toHaveBeenCalled()

    handlers.onThumbnailScaleLevelChange(99)
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 7 })

    handlers.onThumbnailScaleLevelChange(-5)
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 1 })
  })
})
