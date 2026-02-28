import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => {
  const resolveMpvBinPath = vi.fn(() => 'C:/tools/mpv/mpv.exe')
  const initialize = vi.fn(async (options: { onProcessExit?: (payload: { code: number | null; signal: NodeJS.Signals | null; unexpected: boolean }) => void }) => {
    mockState.onProcessExit = options.onProcessExit ?? null
  })
  const dispose = vi.fn(async () => undefined)
  const setGaplessMode = vi.fn(async () => undefined)
  const setReplayGainMode = vi.fn(async () => undefined)
  const setAudioDevice = vi.fn(async () => undefined)
  const setAudioExclusive = vi.fn(async () => undefined)
  const listAudioDevices = vi.fn(async () => [])
  const playFile = vi.fn(async () => undefined)
  const pause = vi.fn(async () => undefined)
  const resume = vi.fn(async () => undefined)
  const stop = vi.fn(async () => undefined)
  const seekToSec = vi.fn(async () => undefined)
  const setVolume = vi.fn(async () => undefined)
  const readPlaybackStatus = vi.fn(async () => ({
    loaded: false,
    paused: null,
    timeSec: null,
    durationSec: null,
  }))
  const readAnalysisFrame = vi.fn(async () => ({
    loaded: false,
    audioLevel: 0,
    audioBeat: 0,
    frequencyBins: [],
    waveformBins: [],
    updatedAtMs: Date.now(),
  }))

  return {
    resolveMpvBinPath,
    initialize,
    dispose,
    setGaplessMode,
    setReplayGainMode,
    setAudioDevice,
    setAudioExclusive,
    listAudioDevices,
    playFile,
    pause,
    resume,
    stop,
    seekToSec,
    setVolume,
    readPlaybackStatus,
    readAnalysisFrame,
    onProcessExit: null as ((payload: { code: number | null; signal: NodeJS.Signals | null; unexpected: boolean }) => void) | null,
  }
})

vi.mock('../../runtimeBinaryPaths', () => ({
  resolveMpvBinPath: mockState.resolveMpvBinPath,
}))

vi.mock('./mpvEngine', () => {
  class MockMpvEngine {
    initialize = mockState.initialize
    dispose = mockState.dispose
    setGaplessMode = mockState.setGaplessMode
    setReplayGainMode = mockState.setReplayGainMode
    setAudioDevice = mockState.setAudioDevice
    setAudioExclusive = mockState.setAudioExclusive
    listAudioDevices = mockState.listAudioDevices
    playFile = mockState.playFile
    pause = mockState.pause
    resume = mockState.resume
    stop = mockState.stop
    seekToSec = mockState.seekToSec
    setVolume = mockState.setVolume
    readPlaybackStatus = mockState.readPlaybackStatus
    readAnalysisFrame = mockState.readAnalysisFrame
  }

  return {
    MpvEngine: MockMpvEngine,
  }
})

import { AudioEngineController } from './audioEngineController'

async function waitForCondition(
  checker: () => boolean,
  timeoutMs = 1_500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (checker()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('waitForCondition timeout')
}

describe('AudioEngineController mpv restart guard', () => {
  beforeEach(() => {
    mockState.resolveMpvBinPath.mockReset()
    mockState.resolveMpvBinPath.mockReturnValue('C:/tools/mpv/mpv.exe')
    mockState.initialize.mockClear()
    mockState.dispose.mockClear()
    mockState.setGaplessMode.mockClear()
    mockState.setReplayGainMode.mockClear()
    mockState.setAudioDevice.mockClear()
    mockState.setAudioExclusive.mockClear()
    mockState.onProcessExit = null
  })

  it('mpv 异常退出后应自动拉起并保持增强模式', async () => {
    const controller = new AudioEngineController({ projectRoot: 'C:/opencode/MediaPlayer' })

    const started = await controller.setMode('mpv')
    expect(started.mode).toBe('mpv')
    expect(mockState.initialize).toHaveBeenCalledTimes(1)

    const onProcessExit = mockState.onProcessExit
    expect(onProcessExit).toBeTypeOf('function')
    onProcessExit?.({ code: 1, signal: null, unexpected: true })

    await waitForCondition(() => mockState.initialize.mock.calls.length >= 2)

    const state = controller.readState()
    expect(state.mode).toBe('mpv')
    expect(state.usingFallback).toBe(false)
    expect(state.lastError).toContain('已自动拉起')
  })

  it('短时间连续崩溃应触发熔断并回退兼容模式', async () => {
    const controller = new AudioEngineController({ projectRoot: 'C:/opencode/MediaPlayer' })

    await controller.setMode('mpv')
    for (let round = 0; round < 4; round += 1) {
      const onProcessExit = mockState.onProcessExit
      expect(onProcessExit).toBeTypeOf('function')
      onProcessExit?.({ code: 3221225477, signal: null, unexpected: true })
      await new Promise((resolve) => setTimeout(resolve, 30))
    }

    await waitForCondition(() => controller.readState().mode === 'chromium')
    const afterBreaker = controller.readState()
    expect(afterBreaker.mode).toBe('chromium')
    expect(afterBreaker.usingFallback).toBe(true)
    expect(afterBreaker.lastError).toContain('熔断')

    const retryState = await controller.setMode('mpv')
    expect(retryState.mode).toBe('chromium')
    expect(retryState.lastError).toContain('熔断')
  })
})
