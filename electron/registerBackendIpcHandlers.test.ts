import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload?: unknown) => Promise<unknown>>()
  const ipcHandle = vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => Promise<unknown>) => {
    handlers.set(channel, handler)
  })

  const moveSidebarNodes = vi.fn()
  const startAudioTranscodeTask = vi.fn()
  const readAudioTranscodeCapabilities = vi.fn()
  const resolveMpvBinPathFromDirectory = vi.fn()
  const resolveFfmpegBinPath = vi.fn()
  const resolveFfprobeBinPath = vi.fn()
  const readAudioEngineState = vi.fn()
  const overrideMpvBinPath = vi.fn()
  const onLibraryChanged = vi.fn()
  const dispose = vi.fn()

  const service = {
    moveSidebarNodes,
    startAudioTranscodeTask,
    readAudioTranscodeCapabilities,
    readState: readAudioEngineState,
    overrideMpvBinPath,
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
    startAudioTranscodeTask,
    readAudioTranscodeCapabilities,
    resolveMpvBinPathFromDirectory,
    resolveFfmpegBinPath,
    resolveFfprobeBinPath,
    readAudioEngineState,
    overrideMpvBinPath,
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
      once: vi.fn(),
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

vi.mock('./runtimeBinaryPaths', () => {
  return {
    resolveMpvBinPathFromDirectory: mockState.resolveMpvBinPathFromDirectory,
    resolveFfmpegBinPath: mockState.resolveFfmpegBinPath,
    resolveFfprobeBinPath: mockState.resolveFfprobeBinPath,
  }
})

vi.mock('./services/audio-engine/audioEngineController', () => {
  return {
    AudioEngineController: vi.fn(function MockAudioEngineController() {
      return {
        readState: mockState.readAudioEngineState,
        overrideMpvBinPath: mockState.overrideMpvBinPath,
        setMode: vi.fn(async () => mockState.readAudioEngineState()),
        readPlaybackStatus: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          loaded: false,
          paused: null,
          timeSec: null,
          durationSec: null,
          message: null,
          updatedAtMs: Date.now(),
        })),
        readAnalysisFrame: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          loaded: false,
          audioLevel: 0,
          audioBeat: 0,
          frequencyBins: [],
          waveformBins: [],
          message: null,
          updatedAtMs: Date.now(),
        })),
        listAudioDevices: vi.fn(async () => ({
          devices: [],
          activeDeviceId: null,
        })),
        setAudioDevice: vi.fn(async () => ({
          ok: false,
          activeDeviceId: null,
          message: null,
        })),
        setAudioExclusive: vi.fn(async () => ({
          ok: false,
          enabled: false,
          message: null,
        })),
        setGaplessMode: vi.fn(async () => ({
          ok: true,
          mode: 'weak',
          message: null,
        })),
        setReplayGainMode: vi.fn(async () => ({
          ok: true,
          mode: 'off',
          message: null,
        })),
        loadTrack: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          message: null,
        })),
        setPaused: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          message: null,
        })),
        seekToSec: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          message: null,
        })),
        setVolume: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          message: null,
        })),
        stopPlayback: vi.fn(async () => ({
          ok: true,
          mode: 'chromium',
          message: null,
        })),
      }
    }),
  }
})

import { BACKEND_CHANNELS } from './channels'
import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'

describe('registerBackendIpcHandlers.moveSidebarNodes', () => {
  beforeEach(() => {
    mockState.handlers.clear()
    mockState.ipcHandle.mockClear()
    mockState.moveSidebarNodes.mockReset()
    mockState.startAudioTranscodeTask.mockReset()
    mockState.readAudioTranscodeCapabilities.mockReset()
    mockState.resolveMpvBinPathFromDirectory.mockReset()
    mockState.readAudioEngineState.mockReset()
    mockState.overrideMpvBinPath.mockReset()
    mockState.fileSystemServiceConstructor.mockClear()
    mockState.readAudioEngineState.mockReturnValue({
      mode: 'chromium',
      desiredMode: 'chromium',
      mpvAvailable: false,
      mpvBinPath: null,
      usingFallback: false,
      lastError: null,
      activeDeviceId: null,
      exclusiveEnabled: false,
      gaplessMode: 'weak',
      replayGainMode: 'off',
      updatedAtMs: Date.now(),
    })
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

describe('registerBackendIpcHandlers.startAudioTranscodeTask', () => {
  beforeEach(() => {
    mockState.handlers.clear()
    mockState.ipcHandle.mockClear()
    mockState.startAudioTranscodeTask.mockReset()
    mockState.readAudioTranscodeCapabilities.mockReset()
    mockState.fileSystemServiceConstructor.mockClear()
    mockState.resolveMpvBinPathFromDirectory.mockReset()
    mockState.readAudioEngineState.mockReset()
    mockState.overrideMpvBinPath.mockReset()
    mockState.readAudioEngineState.mockReturnValue({
      mode: 'chromium',
      desiredMode: 'chromium',
      mpvAvailable: false,
      mpvBinPath: null,
      usingFallback: false,
      lastError: null,
      activeDeviceId: null,
      exclusiveEnabled: false,
      gaplessMode: 'weak',
      replayGainMode: 'off',
      updatedAtMs: Date.now(),
    })
  })

  it('应通过 schema 校验并转发到 service', async () => {
    mockState.startAudioTranscodeTask.mockResolvedValue({
      task: {
        task_id: 'audio-transcode-1',
        status: 'running',
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: 'started',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    })

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.startAudioTranscodeTask)
    if (!handler) {
      throw new Error('startAudioTranscodeTask handler missing')
    }

    const request = {
      audio_ids: ['audio-1'],
      preset: 'flac',
      overwrite: true,
    }
    const response = await handler({}, request)

    expect(mockState.fileSystemServiceConstructor).toHaveBeenCalledTimes(1)
    expect(mockState.startAudioTranscodeTask).toHaveBeenCalledWith(request)
    expect(response).toEqual(
      expect.objectContaining({
        task: expect.objectContaining({
          task_id: 'audio-transcode-1',
        }),
      }),
    )
  })

  it('非法请求应抛出 ZodError 且不触发 service 调用', async () => {
    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.startAudioTranscodeTask)
    if (!handler) {
      throw new Error('startAudioTranscodeTask handler missing')
    }

    await expect(
      handler({}, {
        audio_ids: [],
        preset: 'flac',
      }),
    ).rejects.toMatchObject({
      name: 'ZodError',
    })

    expect(mockState.fileSystemServiceConstructor).not.toHaveBeenCalled()
    expect(mockState.startAudioTranscodeTask).not.toHaveBeenCalled()
  })
})

describe('registerBackendIpcHandlers.readAudioTranscodeCapabilities', () => {
  beforeEach(() => {
    mockState.handlers.clear()
    mockState.ipcHandle.mockClear()
    mockState.readAudioTranscodeCapabilities.mockReset()
    mockState.fileSystemServiceConstructor.mockClear()
    mockState.resolveMpvBinPathFromDirectory.mockReset()
    mockState.readAudioEngineState.mockReset()
    mockState.overrideMpvBinPath.mockReset()
    mockState.readAudioEngineState.mockReturnValue({
      mode: 'chromium',
      desiredMode: 'chromium',
      mpvAvailable: false,
      mpvBinPath: null,
      usingFallback: false,
      lastError: null,
      activeDeviceId: null,
      exclusiveEnabled: false,
      gaplessMode: 'weak',
      replayGainMode: 'off',
      updatedAtMs: Date.now(),
    })
  })

  it('应通过 schema 校验并返回能力快照', async () => {
    mockState.readAudioTranscodeCapabilities.mockResolvedValue({
      enabled: true,
      ffmpeg_available: true,
      ffprobe_available: true,
      library_root_dir: 'C:/media/library',
      default_output_dir: 'C:/media/library/.mediaplayerx/transcoded',
      presets: {
        flac: { available: true, required_encoder: 'flac', required_muxer: 'flac', reason: null },
        alac: { available: true, required_encoder: 'alac', required_muxer: 'ipod/mp4', reason: null },
        wav: { available: true, required_encoder: 'pcm_s16le', required_muxer: 'wav', reason: null },
        opus: { available: false, required_encoder: 'libopus', required_muxer: 'opus', reason: 'encoder_unavailable' },
        aac: { available: true, required_encoder: 'aac', required_muxer: 'ipod/mp4', reason: null },
        mp3: { available: false, required_encoder: 'libmp3lame', required_muxer: 'mp3', reason: 'encoder_unavailable' },
      },
      checked_at_ms: Date.now(),
    })

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.readAudioTranscodeCapabilities)
    if (!handler) {
      throw new Error('readAudioTranscodeCapabilities handler missing')
    }

    const response = await handler({}, undefined)

    expect(mockState.fileSystemServiceConstructor).toHaveBeenCalledTimes(1)
    expect(mockState.readAudioTranscodeCapabilities).toHaveBeenCalledWith()
    expect(response).toEqual(
      expect.objectContaining({
        enabled: true,
        presets: expect.objectContaining({
          flac: expect.objectContaining({ available: true }),
          mp3: expect.objectContaining({
            available: false,
            reason: 'encoder_unavailable',
          }),
        }),
      }),
    )
  })
})

describe('registerBackendIpcHandlers.verifyAudioEngineMpvBin', () => {
  beforeEach(() => {
    mockState.handlers.clear()
    mockState.ipcHandle.mockClear()
    mockState.resolveMpvBinPathFromDirectory.mockReset()
    mockState.readAudioEngineState.mockReset()
    mockState.overrideMpvBinPath.mockReset()
    delete process.env.MPX_MPV_BIN
    mockState.readAudioEngineState.mockReturnValue({
      mode: 'chromium',
      desiredMode: 'chromium',
      mpvAvailable: false,
      mpvBinPath: null,
      usingFallback: false,
      lastError: null,
      activeDeviceId: null,
      exclusiveEnabled: false,
      gaplessMode: 'weak',
      replayGainMode: 'off',
      updatedAtMs: Date.now(),
    })
  })

  it('目录包含 mpv 时应设置环境变量并刷新状态', async () => {
    const mpvBinPath = 'C:/Tools/mpv/mpv.exe'
    mockState.resolveMpvBinPathFromDirectory.mockReturnValue(mpvBinPath)
    mockState.overrideMpvBinPath.mockResolvedValue({
      mode: 'mpv',
      desiredMode: 'mpv',
      mpvAvailable: true,
      mpvBinPath,
      usingFallback: false,
      lastError: null,
      activeDeviceId: null,
      exclusiveEnabled: false,
      gaplessMode: 'weak',
      replayGainMode: 'off',
      updatedAtMs: Date.now(),
    })

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.verifyAudioEngineMpvBin)
    if (!handler) {
      throw new Error('verifyAudioEngineMpvBin handler missing')
    }

    const response = await handler({}, { directory_path: 'C:/Tools/mpv' })

    expect(mockState.resolveMpvBinPathFromDirectory).toHaveBeenCalledWith('C:/Tools/mpv')
    expect(mockState.overrideMpvBinPath).toHaveBeenCalledWith(mpvBinPath)
    expect(process.env.MPX_MPV_BIN).toBe(mpvBinPath)
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        env_key: 'MPX_MPV_BIN',
        mpv_bin_path: mpvBinPath,
        state: expect.objectContaining({
          mode: 'mpv',
          mpv_bin_path: mpvBinPath,
        }),
      }),
    )
  })

  it('目录不包含 mpv 时应返回失败且不覆盖控制器路径', async () => {
    mockState.resolveMpvBinPathFromDirectory.mockReturnValue(null)

    registerBackendIpcHandlers()
    const handler = mockState.handlers.get(BACKEND_CHANNELS.verifyAudioEngineMpvBin)
    if (!handler) {
      throw new Error('verifyAudioEngineMpvBin handler missing')
    }

    const response = await handler({}, { directory_path: 'C:/missing-mpv' })

    expect(mockState.resolveMpvBinPathFromDirectory).toHaveBeenCalledWith('C:/missing-mpv')
    expect(mockState.overrideMpvBinPath).not.toHaveBeenCalled()
    expect(process.env.MPX_MPV_BIN).toBeUndefined()
    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        env_key: 'MPX_MPV_BIN',
        mpv_bin_path: null,
        state: expect.objectContaining({
          mode: 'chromium',
          mpv_available: false,
        }),
      }),
    )
  })
})
