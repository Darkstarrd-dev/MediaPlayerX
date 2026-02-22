import { describe, expect, it, vi } from 'vitest'

import { FileSystemManagementHandlers } from './FileSystemManagementHandlers'
import type { FileSystemFacadeContext } from './types'

function createHandlersWithConvertRunner(
  runner: FileSystemFacadeContext['managementMutationService']['runImageConvertTask'],
): FileSystemManagementHandlers {
  const context = {
    managementMutationService: {
      runImageConvertTask: runner,
      setImageHidden: vi.fn(),
      deleteImageItems: vi.fn(),
      deleteSidebarNodes: vi.fn(),
      moveSidebarNodes: vi.fn(),
      renameSidebarNode: vi.fn(),
      renameSidebarNodes: vi.fn(),
      renameItems: vi.fn(),
    },
    manageAdReviewService: {
      startManageAdReview: vi.fn(),
      readManageAdReviewTask: vi.fn(),
      pauseManageAdReviewTask: vi.fn(),
      testAdReviewVisionModel: vi.fn(),
      confirmManageAdReviewDelete: vi.fn(),
    },
    manageCoverReviewService: {
      startManageCoverReview: vi.fn(),
      readManageCoverReviewTask: vi.fn(),
      pauseManageCoverReviewTask: vi.fn(),
      confirmManageCoverReviewHide: vi.fn(),
    },
    libraryReadWriteService: {
      startManageSubtitleCleanup: vi.fn(),
      readManageSubtitleCleanupTask: vi.fn(),
      runManageSubtitleCleanup: vi.fn(),
      saveManageSubtitleCleanup: vi.fn(),
    },
  } as unknown as FileSystemFacadeContext
  return new FileSystemManagementHandlers(context)
}

async function waitForTerminalStatus(
  handlers: FileSystemManagementHandlers,
  taskId: string,
  timeoutMs = 2_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const response = await handlers.readImageConvertTask({ task_id: taskId })
    const status = response.task?.status ?? 'missing'
    if (status === 'cancelled' || status === 'completed' || status === 'failed') {
      return status
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return 'timeout'
}

describe('FileSystemManagementHandlers image convert task runtime', () => {
  it('取消任务时应将运行态任务收敛为 cancelled', async () => {
    const handlers = createHandlersWithConvertRunner(async (_request, options) => {
      options.onProgress?.({
        total_count: 3,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        message: 'starting',
      })
      while (!options.isCancelled?.()) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      const cancelledError = new Error('image_convert_cancelled')
      cancelledError.name = 'ImageConvertCancelledError'
      throw cancelledError
    })

    const started = await handlers.startImageConvertTask({
      node_ids: ['package:fixture.zip'],
      scale_factor: 1,
      target_format: 'webp',
      quality: 80,
      concurrency: 1,
    })

    const cancelled = await handlers.cancelImageConvertTask({ task_id: started.task.task_id })
    expect(cancelled.task.message).toContain('cancellation requested')

    const terminal = await waitForTerminalStatus(handlers, started.task.task_id)
    expect(terminal).toBe('cancelled')
  })
})
