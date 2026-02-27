import { MpvHost } from './mpvHost'

export interface MpvEngineInitOptions {
  mpvBinPath: string
  extraArgs?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  onProcessExit?: (payload: {
    code: number | null
    signal: NodeJS.Signals | null
    unexpected: boolean
  }) => void
}

export interface MpvPlaybackStatus {
  loaded: boolean
  paused: boolean | null
  timeSec: number | null
  durationSec: number | null
}

export interface MpvAnalysisFrame {
  loaded: boolean
  audioLevel: number
  audioBeat: number
  frequencyBins: number[]
  waveformBins: number[]
  updatedAtMs: number
}

const ANALYSIS_BIN_COUNT = 512

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value <= 0) {
    return 0
  }
  if (value >= 1) {
    return 1
  }
  return value
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

function normalizeSec(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

export class MpvEngine {
  private readonly host = new MpvHost()

  private started = false

  private analysisFilterReady = false

  private previousAudioLevel = 0

  private beatCooldownFrames = 0

  async initialize(options: MpvEngineInitOptions): Promise<void> {
    if (this.started) {
      return
    }
    await this.host.start({
      mpvBinPath: options.mpvBinPath,
      extraArgs: options.extraArgs,
      cwd: options.cwd,
      env: options.env,
      onProcessExit: options.onProcessExit,
    })
    this.started = true
    this.analysisFilterReady = false
    this.previousAudioLevel = 0
    this.beatCooldownFrames = 0
  }

  async dispose(): Promise<void> {
    if (!this.started) {
      return
    }
    this.started = false
    this.analysisFilterReady = false
    this.previousAudioLevel = 0
    this.beatCooldownFrames = 0
    await this.host.stop()
  }

  async playFile(filePath: string, range?: { startSec?: number | null; endSec?: number | null }): Promise<void> {
    const startSec = normalizeSec(range?.startSec)
    const endSec = normalizeSec(range?.endSec)
    const optionItems: string[] = []

    if (startSec !== null) {
      optionItems.push(`start=${startSec.toFixed(3)}`)
    }
    if (endSec !== null && (startSec === null || endSec > startSec)) {
      optionItems.push(`end=${endSec.toFixed(3)}`)
    }

    const command: unknown[] = ['loadfile', filePath, 'replace', -1]
    if (optionItems.length > 0) {
      command.push(optionItems.join(','))
    }

    await this.host.sendCommand(command)
  }

  async pause(): Promise<void> {
    await this.host.sendCommand(['set_property', 'pause', true])
  }

  async resume(): Promise<void> {
    await this.host.sendCommand(['set_property', 'pause', false])
  }

  async stop(): Promise<void> {
    await this.host.sendCommand(['set_property', 'pause', true]).catch(() => undefined)
    await this.host.sendCommand(['set_property', 'time-pos', 0]).catch(() => undefined)
  }

  async seekToSec(seconds: number): Promise<void> {
    const normalized = normalizeSec(seconds)
    if (normalized === null) {
      return
    }
    await this.host.sendCommand(['set_property', 'time-pos', normalized])
  }

  async setVolume(volume: number): Promise<void> {
    const normalized = Math.max(0, Math.min(100, Number.isFinite(volume) ? volume : 100))
    await this.host.sendCommand(['set_property', 'volume', normalized])
  }

  async listAudioDevices(): Promise<unknown[]> {
    const response = await this.host.sendCommand(['get_property', 'audio-device-list'])
    if (!Array.isArray(response.data)) {
      return []
    }
    return response.data
  }

  async setAudioDevice(deviceName: string): Promise<void> {
    await this.host.sendCommand(['set_property', 'audio-device', deviceName])
  }

  async setAudioExclusive(enabled: boolean): Promise<void> {
    await this.host.sendCommand(['set_property', 'audio-exclusive', Boolean(enabled)])
  }

  async setGaplessMode(mode: 'no' | 'weak' | 'yes'): Promise<void> {
    await this.host.sendCommand(['set_property', 'gapless-audio', mode])
  }

  async setReplayGainMode(mode: 'no' | 'track' | 'album'): Promise<void> {
    await this.host.sendCommand(['set_property', 'replaygain', mode])
  }

  async readPlaybackStatus(): Promise<MpvPlaybackStatus> {
    const pathResponse = await this.host.sendCommand(['get_property', 'path']).catch(() => null)
    const pathValue = pathResponse && pathResponse.error === 'success' ? pathResponse.data : null
    if (typeof pathValue !== 'string' || pathValue.trim().length === 0) {
      return {
        loaded: false,
        paused: null,
        timeSec: null,
        durationSec: null,
      }
    }

    const pauseResponse = await this.host.sendCommand(['get_property', 'pause']).catch(() => null)
    const timeResponse = await this.host.sendCommand(['get_property', 'time-pos']).catch(() => null)
    const durationResponse = await this.host.sendCommand(['get_property', 'duration']).catch(() => null)

    const paused =
      pauseResponse && pauseResponse.error === 'success' && typeof pauseResponse.data === 'boolean'
        ? pauseResponse.data
        : null
    const timeSec =
      timeResponse &&
      timeResponse.error === 'success' &&
      typeof timeResponse.data === 'number' &&
      Number.isFinite(timeResponse.data) &&
      timeResponse.data >= 0
        ? timeResponse.data
        : null
    const durationSec =
      durationResponse &&
      durationResponse.error === 'success' &&
      typeof durationResponse.data === 'number' &&
      Number.isFinite(durationResponse.data) &&
      durationResponse.data >= 0
        ? durationResponse.data
        : null

    return {
      loaded: true,
      paused,
      timeSec,
      durationSec,
    }
  }

  async readAnalysisFrame(): Promise<MpvAnalysisFrame> {
    const status = await this.readPlaybackStatus()
    if (!status.loaded) {
      this.previousAudioLevel = 0
      this.beatCooldownFrames = 0
      return {
        loaded: false,
        audioLevel: 0,
        audioBeat: 0,
        frequencyBins: new Array<number>(ANALYSIS_BIN_COUNT).fill(0),
        waveformBins: new Array<number>(ANALYSIS_BIN_COUNT).fill(128),
        updatedAtMs: Date.now(),
      }
    }

    await this.ensureAnalysisFilter()
    const metadata = await this.readAnalysisMetadata()
    const audioLevel = clamp01(this.resolveAudioLevel(metadata))
    const audioBeat = this.resolveAudioBeat(audioLevel)
    const phase = status.timeSec ?? 0

    const frequencyBins = new Array<number>(ANALYSIS_BIN_COUNT)
    const waveformBins = new Array<number>(ANALYSIS_BIN_COUNT)
    for (let index = 0; index < ANALYSIS_BIN_COUNT; index += 1) {
      const indexRatio = index / ANALYSIS_BIN_COUNT
      const harmonic = 0.45 + 0.55 * Math.sin(indexRatio * Math.PI * 10 + phase * 2.2)
      const envelope = Math.pow(Math.max(0, 1 - indexRatio), 0.8)
      const beatGain = audioBeat > 0 ? 0.2 : 0
      const magnitude = clamp01((audioLevel + beatGain) * envelope * (0.35 + 0.65 * harmonic))
      frequencyBins[index] = Math.max(0, Math.min(255, Math.round(magnitude * 255)))

      const waveform = Math.sin(phase * 5.2 + indexRatio * Math.PI * 6) * (0.15 + audioLevel * 0.5)
      waveformBins[index] = Math.max(0, Math.min(255, Math.round((0.5 + waveform * 0.5) * 255)))
    }

    return {
      loaded: true,
      audioLevel,
      audioBeat,
      frequencyBins,
      waveformBins,
      updatedAtMs: Date.now(),
    }
  }

  private async ensureAnalysisFilter(): Promise<void> {
    if (this.analysisFilterReady) {
      return
    }

    await this.host.sendCommand(['af', 'add', '@mpxstats:lavfi=[astats=metadata=1:reset=1]']).catch(() => undefined)
    this.analysisFilterReady = true
  }

  private async readAnalysisMetadata(): Promise<Record<string, unknown> | null> {
    const response = await this.host.sendCommand(['get_property', 'af-metadata/mpxstats']).catch(() => null)
    if (!response || response.error !== 'success') {
      return null
    }
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      return null
    }
    return response.data as Record<string, unknown>
  }

  private resolveAudioLevel(metadata: Record<string, unknown> | null): number {
    const candidates: unknown[] = []
    if (metadata) {
      candidates.push(
        metadata['lavfi.astats.Overall.RMS_level'],
        metadata['lavfi.astats.Overall.Peak_level'],
        metadata['astats.Overall.RMS_level'],
        metadata['astats.Overall.Peak_level'],
        metadata['Overall.RMS_level'],
        metadata['Overall.Peak_level'],
      )
    }

    for (const candidate of candidates) {
      const value = toFiniteNumber(candidate)
      if (value == null) {
        continue
      }

      if (value <= 0 && value >= -120) {
        return clamp01((value + 60) / 60)
      }
      if (value >= 0 && value <= 1) {
        return clamp01(value)
      }
      if (value > 1 && value <= 100) {
        return clamp01(value / 100)
      }
    }

    return 0
  }

  private resolveAudioBeat(currentLevel: number): number {
    const levelDelta = currentLevel - this.previousAudioLevel
    const hasBeat = levelDelta > 0.12 && currentLevel > 0.22 && this.beatCooldownFrames <= 0
    this.previousAudioLevel = currentLevel
    if (hasBeat) {
      this.beatCooldownFrames = 4
      return 1
    }
    if (this.beatCooldownFrames > 0) {
      this.beatCooldownFrames -= 1
    }
    return 0
  }
}
