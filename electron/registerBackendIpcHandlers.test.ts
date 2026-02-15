import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload?: unknown) => Promise<unknown>>()
  const ipcHandle = vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => Promise<unknown>) => {
    handlers.set(channel, handler)
  })

  const moveSidebarNodes = vi.fn()
  const onLibraryChanged = vi.fn()
  const dispose = vi.fn()

  const service = {
    moveSidebarNodes,
    onLibraryChanged,
    dispose,
  }

  const fileSystemServiceConstructor = vi.fn(function MockFileSystemMediaReadService() {
    return service
  })

  return {
    handlers,
    ipcHandle,
    moveSidebarNodes,
    onLibraryChanged,
    dispose,
    service,
    fileSystemServiceConstructor,
  }
})

vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((name: string) => {
        if (name === 'userData') {
          return 'Z:/tmp/user-data'
        }
        if (name === 'pictures') {
          return 'Z:/tmp/pictures'
        }
        return 'Z:/tmp'
      }),
      getGPUFeatureStatus: vi.fn(() => ({})),
      getGPUInfo: vi.fn(async () => ({})),
      getVersion: vi.fn(() => '0.0.0-test'),
      isPackaged: false,
      isHardwareAccelerationEnabled: vi.fn(() => true),
    },
    BrowserWindow: {
      getAllWindows: vi.fn(() => []),
    },
    clipboard: {
      readBuffer: vi.fn(() => Buffer.alloc(0)),
      readText: vi.fn(() => ''),
    },
    dialog: {
      showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
    },
    ipcMain: {
      handle: mockState.ipcHandle,
    },
    shell: {
      openExternal: vi.fn(async () => undefined),
    },
  }
})

vi.mock('./fileSystemReadService', () => {
  return {
    FileSystemMediaReadService: mockState.fileSystemServiceConstructor,
  }
})

vi.mock('./registerMediaProtocolHandler', () => {
  return {
    registerMediaProtocolHandler: vi.fn(),
  }
})

vi.mock('./registerResolveMediaResourceHandler', () => {
  return {
    registerResolveMediaResourceHandler: vi.fn(),
  }
})

import { BACKEND_CHANNELS } from './channels'
import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'

describe('registerBackendIpcHandlers.moveSidebarNodes', () => {
  beforeEach(() => {
    mockState.handlers.clear()
    mockState.ipcHandle.mockClear()
    mockState.moveSidebarNodes.mockReset()
    mockState.fileSystemServiceConstructor.mockClear()
  })

  it('使用 request/response schema 校验并转发到 service', async () => {
    mockState.moveSidebarNodes.mockResolvedValue({
      moved_count: 1,
      failed: [],
      target_directory: 'D:/target/group-a',
      updated_at_ms: Date.now(),
    })

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.moveSidebarNodes)
    if (!handler) {
      throw new Error('moveSidebarNodes handler missing')
    }

    const request = {
      node_ids: ['package:pkg-a'],
      destination_directory: 'D:/target',
      group_name: 'group-a',
    }
    const response = await handler({}, request)

    expect(mockState.fileSystemServiceConstructor).toHaveBeenCalledTimes(1)
    expect(mockState.moveSidebarNodes).toHaveBeenCalledWith(request)
    expect(response).toEqual(
      expect.objectContaining({
        moved_count: 1,
        target_directory: 'D:/target/group-a',
      }),
    )
  })

  it('request payload 非法时抛出 ZodError 且不触发 service 调用', async () => {
    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.moveSidebarNodes)
    if (!handler) {
      throw new Error('moveSidebarNodes handler missing')
    }

    await expect(
      handler({}, {
        node_ids: [],
        destination_directory: '',
      }),
    ).rejects.toMatchObject({
      name: 'ZodError',
    })

    expect(mockState.fileSystemServiceConstructor).not.toHaveBeenCalled()
    expect(mockState.moveSidebarNodes).not.toHaveBeenCalled()
  })

  it('service 抛错时直接透传给调用方', async () => {
    mockState.moveSidebarNodes.mockRejectedValue(new Error('move-failed'))

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.moveSidebarNodes)
    if (!handler) {
      throw new Error('moveSidebarNodes handler missing')
    }

    await expect(
      handler({}, {
        node_ids: ['package:pkg-a'],
        destination_directory: 'D:/target',
      }),
    ).rejects.toThrow('move-failed')
  })

  it('service response 非法时抛出 ZodError', async () => {
    mockState.moveSidebarNodes.mockResolvedValue({
      moved_count: 1,
      failed: [],
      updated_at_ms: Date.now(),
    })

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.moveSidebarNodes)
    if (!handler) {
      throw new Error('moveSidebarNodes handler missing')
    }

    await expect(
      handler({}, {
        node_ids: ['package:pkg-a'],
        destination_directory: 'D:/target',
      }),
    ).rejects.toMatchObject({
      name: 'ZodError',
    })
  })
})
