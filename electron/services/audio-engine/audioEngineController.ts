import { resolveMpvBinPath } from '../../runtimeBinaryPaths'
import { MpvEngine } from './mpvEngine'

type AudioEngineMode = 'chromium' | 'mpv'
type AudioGaplessMode = 'no' | 'weak' | 'yes'
type AudioReplayGainMode = 'off' | 'track' | 'album'

export interface AudioOutputDeviceItem {
  id: string
  label: string
  isDefault: boolean
}

export interface AudioEngineStateSnapshot {
  mode: AudioEngineMode
  desiredMode: AudioEngineMode
  mpvAvailable: boolean
  mpvBinPath: string | null
  usingFallback: boolean
  lastError: string | null
  activeDeviceId: string | null
  exclusiveEnabled: boolean
  gaplessMode: AudioGaplessMode
  replayGainMode: AudioReplayGainMode
  updatedAtMs: number
}

export interface AudioEnginePlaybackStatusSnapshot {
  ok: boolean
  mode: AudioEngineMode
  loaded: boolean
  paused: boolean | null
  timeSec: number | null
  durationSec: number | null
  message: string | null
  updatedAtMs: number
}

export interface AudioEngineAnalysisFrameSnapshot {
  ok: boolean
  mode: AudioEngineMode
  loaded: boolean
  audioLevel: number
  audioBeat: number
  frequencyBins: number[]
  waveformBins: number[]
  message: string | null
  updatedAtMs: number
}

interface AudioEngineControllerOptions {
  projectRoot?: string
}

interface AudioEngineActionResult {
  ok: boolean
  mode: AudioEngineMode
  message: string | null
}

interface MpvProcessExitPayload {
  code: number | null
  signal: NodeJS.Signals | null
  unexpected: boolean
}

export class AudioEngineController {
  private static readonly MPV_RESTART_WINDOW_MS = 60_000

  private static readonly MPV_RESTART_MAX_ATTEMPTS = 3

  private static readonly MPV_RESTART_CIRCUIT_BREAKER_MS = 120_000

  private readonly mpvEngine = new MpvEngine()

  private mpvBinPath: string | null

  private mode: AudioEngineMode = 'chromium'

  private desiredMode: AudioEngineMode = 'chromium'

  private usingFallback = false

  private lastError: string | null = null

  private updatedAtMs = Date.now()

  private activeDeviceId: string | null = null

  private exclusiveEnabled = false

  private gaplessMode: AudioGaplessMode = 'weak'

  private replayGainMode: AudioReplayGainMode = 'off'

  private mpvUnexpectedExitAtMs: number[] = []

  private mpvRestartCircuitBreakerUntilMs = 0

  private mpvRestartInFlight = false

  constructor(options: AudioEngineControllerOptions = {}) {
    this.mpvBinPath = resolveMpvBinPath(options.projectRoot)
  }

  readState(): AudioEngineStateSnapshot {
    return {
      mode: this.mode,
      desiredMode: this.desiredMode,
      mpvAvailable: Boolean(this.mpvBinPath),
      mpvBinPath: this.mpvBinPath,
      usingFallback: this.usingFallback,
      lastError: this.lastError,
      activeDeviceId: this.activeDeviceId,
      exclusiveEnabled: this.exclusiveEnabled,
      gaplessMode: this.gaplessMode,
      replayGainMode: this.replayGainMode,
      updatedAtMs: this.updatedAtMs,
    }
  }

  async setMode(nextMode: AudioEngineMode): Promise<AudioEngineStateSnapshot> {
    this.desiredMode = nextMode
    this.updatedAtMs = Date.now()

    if (nextMode === 'chromium') {
      this.usingFallback = false
      this.lastError = null
      this.mode = 'chromium'
      this.maybeResetMpvRestartGuard()
      await this.mpvEngine.dispose()
      this.activeDeviceId = null
      this.exclusiveEnabled = false
      this.updatedAtMs = Date.now()
      return this.readState()
    }

    if (!this.mpvBinPath) {
      await this.mpvEngine.dispose()
      this.mode = 'chromium'
      this.usingFallback = true
      this.lastError = '未找到 mpv 可执行文件，已回退到兼容模式'
      this.activeDeviceId = null
      this.exclusiveEnabled = false
      this.updatedAtMs = Date.now()
      return this.readState()
    }

    const now = Date.now()
    if (this.isMpvRestartCircuitOpen(now)) {
      const remainSec = Math.max(1, Math.ceil((this.mpvRestartCircuitBreakerUntilMs - now) / 1000))
      await this.mpvEngine.dispose()
      this.mode = 'chromium'
      this.usingFallback = true
      this.lastError = `mpv 自动恢复已熔断，请 ${remainSec} 秒后重试增强模式`
      this.activeDeviceId = null
      this.exclusiveEnabled = false
      this.updatedAtMs = Date.now()
      return this.readState()
    }

    try {
      await this.mpvEngine.dispose()
      await this.initializeMpvEngine()
      await this.applyPlaybackTuning()
      this.maybeResetMpvRestartGuard()
      this.mode = 'mpv'
      this.usingFallback = false
      this.lastError = null
    } catch (error) {
      this.mode = 'chromium'
      this.usingFallback = true
      this.lastError = error instanceof Error ? error.message : String(error)
      await this.mpvEngine.dispose()
      this.activeDeviceId = null
      this.exclusiveEnabled = false
    }

    this.updatedAtMs = Date.now()
    return this.readState()
  }

  async overrideMpvBinPath(nextPath: string | null): Promise<AudioEngineStateSnapshot> {
    this.mpvBinPath = nextPath
    this.maybeResetMpvRestartGuard()
    this.updatedAtMs = Date.now()

    if (this.desiredMode === 'mpv') {
      return this.setMode('mpv')
    }

    this.usingFallback = false
    this.lastError = null
    return this.readState()
  }

  async listAudioDevices(): Promise<{ devices: AudioOutputDeviceItem[]; activeDeviceId: string | null }> {
    if (this.mode !== 'mpv') {
      return {
        devices: [],
        activeDeviceId: this.activeDeviceId,
      }
    }

    const rawDevices = await this.mpvEngine.listAudioDevices()
    const devices: AudioOutputDeviceItem[] = []

    for (const entry of rawDevices) {
      if (!entry || typeof entry !== 'object') {
        continue
      }
      const record = entry as Record<string, unknown>
      const id = typeof record.name === 'string' ? record.name.trim() : ''
      if (!id) {
        continue
      }
      const description =
        typeof record.description === 'string' && record.description.trim().length > 0
          ? record.description.trim()
          : id
      devices.push({
        id,
        label: description,
        isDefault: id === 'auto',
      })
    }

    this.updatedAtMs = Date.now()
    return {
      devices,
      activeDeviceId: this.activeDeviceId,
    }
  }

  async setAudioDevice(deviceId: string): Promise<{ ok: boolean; activeDeviceId: string | null; message: string | null }> {
    if (this.mode !== 'mpv') {
      return {
        ok: false,
        activeDeviceId: this.activeDeviceId,
        message: '当前为兼容模式，无法设置 mpv 输出设备',
      }
    }

    try {
      await this.mpvEngine.setAudioDevice(deviceId)
      this.activeDeviceId = deviceId
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        activeDeviceId: this.activeDeviceId,
        message: null,
      }
    } catch (error) {
      return {
        ok: false,
        activeDeviceId: this.activeDeviceId,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async setAudioExclusive(enabled: boolean): Promise<{ ok: boolean; enabled: boolean; message: string | null }> {
    if (this.mode !== 'mpv') {
      return {
        ok: false,
        enabled: this.exclusiveEnabled,
        message: '当前为兼容模式，无法设置独占输出',
      }
    }

    try {
      await this.mpvEngine.setAudioExclusive(enabled)
      this.exclusiveEnabled = enabled
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        enabled: this.exclusiveEnabled,
        message: null,
      }
    } catch (error) {
      return {
        ok: false,
        enabled: this.exclusiveEnabled,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async setGaplessMode(mode: AudioGaplessMode): Promise<{ ok: boolean; mode: AudioGaplessMode; message: string | null }> {
    this.gaplessMode = mode

    if (this.mode !== 'mpv') {
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode,
        message: '当前为兼容模式，已记录设置，切换增强模式后生效',
      }
    }

    try {
      await this.mpvEngine.setGaplessMode(mode)
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode,
        message: null,
      }
    } catch (error) {
      return {
        ok: false,
        mode: this.gaplessMode,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async setReplayGainMode(mode: AudioReplayGainMode): Promise<{ ok: boolean; mode: AudioReplayGainMode; message: string | null }> {
    this.replayGainMode = mode

    if (this.mode !== 'mpv') {
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode,
        message: '当前为兼容模式，已记录设置，切换增强模式后生效',
      }
    }

    try {
      await this.mpvEngine.setReplayGainMode(this.resolveMpvReplayGainMode(mode))
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode,
        message: null,
      }
    } catch (error) {
      return {
        ok: false,
        mode: this.replayGainMode,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async loadTrack(filePath: string, range?: { startSec?: number | null; endSec?: number | null }): Promise<AudioEngineActionResult> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    }

    try {
      await this.mpvEngine.playFile(filePath, range)
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        message,
      }
    }
  }

  async setPaused(paused: boolean): Promise<AudioEngineActionResult> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    }

    try {
      if (paused) {
        await this.mpvEngine.pause()
      } else {
        await this.mpvEngine.resume()
      }
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        message,
      }
    }
  }

  async stopPlayback(): Promise<AudioEngineActionResult> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    }

    try {
      await this.mpvEngine.stop()
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        message,
      }
    }
  }

  async seekToSec(timeSec: number): Promise<AudioEngineActionResult> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    }

    try {
      await this.mpvEngine.seekToSec(timeSec)
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        message,
      }
    }
  }

  async setVolume(volume: number): Promise<AudioEngineActionResult> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    }

    try {
      await this.mpvEngine.setVolume(volume)
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        message: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        message,
      }
    }
  }

  async readPlaybackStatus(): Promise<AudioEnginePlaybackStatusSnapshot> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        loaded: false,
        paused: null,
        timeSec: null,
        durationSec: null,
        message: null,
        updatedAtMs: Date.now(),
      }
    }

    try {
      const status = await this.mpvEngine.readPlaybackStatus()
      this.updatedAtMs = Date.now()
      return {
        ok: true,
        mode: this.mode,
        loaded: status.loaded,
        paused: status.paused,
        timeSec: status.timeSec,
        durationSec: status.durationSec,
        message: null,
        updatedAtMs: this.updatedAtMs,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      this.updatedAtMs = Date.now()
      return {
        ok: false,
        mode: this.mode,
        loaded: false,
        paused: null,
        timeSec: null,
        durationSec: null,
        message,
        updatedAtMs: this.updatedAtMs,
      }
    }
  }

  async readAnalysisFrame(): Promise<AudioEngineAnalysisFrameSnapshot> {
    if (this.mode !== 'mpv') {
      return {
        ok: true,
        mode: this.mode,
        loaded: false,
        audioLevel: 0,
        audioBeat: 0,
        frequencyBins: [],
        waveformBins: [],
        message: null,
        updatedAtMs: Date.now(),
      }
    }

    try {
      const frame = await this.mpvEngine.readAnalysisFrame()
      return {
        ok: true,
        mode: this.mode,
        loaded: frame.loaded,
        audioLevel: frame.audioLevel,
        audioBeat: frame.audioBeat,
        frequencyBins: frame.frequencyBins,
        waveformBins: frame.waveformBins,
        message: null,
        updatedAtMs: frame.updatedAtMs,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      return {
        ok: false,
        mode: this.mode,
        loaded: false,
        audioLevel: 0,
        audioBeat: 0,
        frequencyBins: [],
        waveformBins: [],
        message,
        updatedAtMs: Date.now(),
      }
    }
  }

  private resolveMpvReplayGainMode(mode: AudioReplayGainMode): 'no' | 'track' | 'album' {
    if (mode === 'off') {
      return 'no'
    }
    return mode
  }

  private async applyPlaybackTuning(): Promise<void> {
    await this.mpvEngine.setGaplessMode(this.gaplessMode)
    await this.mpvEngine.setReplayGainMode(this.resolveMpvReplayGainMode(this.replayGainMode))
    if (this.activeDeviceId) {
      await this.mpvEngine.setAudioDevice(this.activeDeviceId)
    }
    if (this.exclusiveEnabled) {
      await this.mpvEngine.setAudioExclusive(true)
    }
  }

  private async initializeMpvEngine(): Promise<void> {
    if (!this.mpvBinPath) {
      throw new Error('未找到 mpv 可执行文件，无法初始化增强模式')
    }

    await this.mpvEngine.initialize({
      mpvBinPath: this.mpvBinPath,
      extraArgs: ['--no-config', '--ao=wasapi', '--msg-level=all=warn'],
      onProcessExit: (payload) => {
        if (!payload.unexpected) {
          return
        }
        queueMicrotask(() => {
          void this.handleUnexpectedMpvExit(payload)
        })
      },
    })
  }

  private isMpvRestartCircuitOpen(now: number): boolean {
    return this.mpvRestartCircuitBreakerUntilMs > now
  }

  private recordUnexpectedMpvExit(now: number): number {
    const windowStart = now - AudioEngineController.MPV_RESTART_WINDOW_MS
    this.mpvUnexpectedExitAtMs = this.mpvUnexpectedExitAtMs.filter((ts) => ts >= windowStart)
    this.mpvUnexpectedExitAtMs.push(now)
    return this.mpvUnexpectedExitAtMs.length
  }

  private maybeResetMpvRestartGuard(): void {
    this.mpvUnexpectedExitAtMs = []
    this.mpvRestartCircuitBreakerUntilMs = 0
    this.mpvRestartInFlight = false
  }

  private async handleUnexpectedMpvExit(payload: MpvProcessExitPayload): Promise<void> {
    if (this.desiredMode !== 'mpv') {
      return
    }
    if (!this.mpvBinPath) {
      this.mode = 'chromium'
      this.usingFallback = true
      this.lastError = 'mpv 进程异常退出且路径不可用，已回退到兼容模式'
      this.activeDeviceId = null
      this.exclusiveEnabled = false
      this.updatedAtMs = Date.now()
      return
    }
    if (this.mpvRestartInFlight) {
      return
    }

    const now = Date.now()
    const restartCount = this.recordUnexpectedMpvExit(now)
    if (restartCount > AudioEngineController.MPV_RESTART_MAX_ATTEMPTS) {
      this.mode = 'chromium'
      this.usingFallback = true
      this.mpvRestartCircuitBreakerUntilMs =
        now + AudioEngineController.MPV_RESTART_CIRCUIT_BREAKER_MS
      const remainSec = Math.max(
        1,
        Math.ceil(AudioEngineController.MPV_RESTART_CIRCUIT_BREAKER_MS / 1000),
      )
      this.lastError =
        `mpv 异常退出过于频繁，已熔断并回退兼容模式，请 ${remainSec} 秒后重试 (code=${payload.code ?? 'null'}, signal=${payload.signal ?? 'null'})`
      this.activeDeviceId = null
      this.exclusiveEnabled = false
      this.updatedAtMs = Date.now()
      return
    }

    this.mpvRestartInFlight = true
    try {
      await this.initializeMpvEngine()
      await this.applyPlaybackTuning()
      this.mode = 'mpv'
      this.usingFallback = false
      this.lastError =
        `mpv 进程异常退出，已自动拉起 (${restartCount}/${AudioEngineController.MPV_RESTART_MAX_ATTEMPTS})`
    } catch (error) {
      this.mode = 'chromium'
      this.usingFallback = true
      this.lastError =
        `mpv 自动拉起失败，已回退兼容模式：${error instanceof Error ? error.message : String(error)}`
      this.activeDeviceId = null
      this.exclusiveEnabled = false
    } finally {
      this.mpvRestartInFlight = false
      this.updatedAtMs = Date.now()
    }
  }
}
