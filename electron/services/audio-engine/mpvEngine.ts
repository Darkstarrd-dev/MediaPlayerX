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

function normalizeSec(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

export class MpvEngine {
  private readonly host = new MpvHost()

  private started = false

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
  }

  async dispose(): Promise<void> {
    if (!this.started) {
      return
    }
    this.started = false
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
    await this.host.sendCommand(['stop'])
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
}
