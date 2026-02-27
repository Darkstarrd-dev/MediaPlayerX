const AUDIO_TEXTURE_WIDTH = 512

const ENVELOPE_ATTACK_SEC = 0.06
const ENVELOPE_RELEASE_SEC = 0.28
const SLOW_ENVELOPE_SEC = 0.55
const BEAT_DECAY_SEC = 0.34
const IDLE_DECAY_SEC = 0.22
const ONSET_THRESHOLD = 0.014
const ONSET_GAIN = 5.4

function sampleByIndex(data: Uint8Array, normalizedIndex: number): number {
  if (data.length === 0) {
    return 0
  }
  const rawIndex = Math.max(0, Math.min(data.length - 1, Math.round(normalizedIndex * (data.length - 1))))
  return data[rawIndex] ?? 0
}

function resolveLerpAlpha(deltaSec: number, timeConstantSec: number): number {
  if (timeConstantSec <= 0) {
    return 1
  }
  return 1 - Math.exp(-deltaSec / timeConstantSec)
}

function averageFrequencyEnergy(data: Uint8Array, fromNormalized: number, toNormalized: number): number {
  if (data.length === 0) {
    return 0
  }

  const low = Math.min(fromNormalized, toNormalized)
  const high = Math.max(fromNormalized, toNormalized)
  const start = Math.max(0, Math.min(data.length - 1, Math.floor(low * (data.length - 1))))
  const end = Math.max(start, Math.min(data.length - 1, Math.ceil(high * (data.length - 1))))

  let sum = 0
  let count = 0
  for (let index = start; index <= end; index += 1) {
    sum += data[index] ?? 0
    count += 1
  }

  if (count <= 0) {
    return 0
  }
  return sum / count / 255
}

function computeWaveformRms(data: Uint8Array): number {
  if (data.length === 0) {
    return 0
  }

  const sampleStep = Math.max(1, Math.floor(data.length / 128))
  let sumSquares = 0
  let count = 0
  for (let index = 0; index < data.length; index += sampleStep) {
    const centered = ((data[index] ?? 128) - 128) / 128
    sumSquares += centered * centered
    count += 1
  }

  if (count <= 0) {
    return 0
  }
  return Math.sqrt(sumSquares / count)
}

export class MusicAudioAnalyser {
  readonly frequencyData = new Uint8Array(AUDIO_TEXTURE_WIDTH)
  readonly waveformData = new Uint8Array(AUDIO_TEXTURE_WIDTH)

  audioLevel = 0
  audioBeat = 0

  private attachedAudioElement: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private mediaSourceNode: MediaElementAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private frequencyScratch = new Uint8Array(0)
  private waveformScratch = new Uint8Array(0)
  private envelopeFast = 0
  private envelopeSlow = 0
  private lastSampleTimeSec = 0

  lastError: string | null = null

  attach(audioElement: HTMLAudioElement | null): void {
    if (!audioElement) {
      return
    }

    if (this.attachedAudioElement === audioElement && this.analyserNode && this.mediaSourceNode) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      this.lastError = '当前环境不支持 AudioContext'
      return
    }

    try {
      if (this.attachedAudioElement && this.attachedAudioElement !== audioElement) {
        this.disposeGraph()
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContextCtor()
      }

      if (!this.analyserNode) {
        this.analyserNode = this.audioContext.createAnalyser()
        this.analyserNode.fftSize = 2048
        this.analyserNode.smoothingTimeConstant = 0.82
        this.frequencyScratch = new Uint8Array(this.analyserNode.frequencyBinCount)
        this.waveformScratch = new Uint8Array(this.analyserNode.fftSize)
      }

      this.attachedAudioElement = audioElement
      this.ensureMediaSourceConnected(audioElement)
      this.lastError = null
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
    }
  }

  sample(): void {
    const deltaSec = this.resolveSampleDeltaSec()
    const analyserNode = this.analyserNode
    if (!analyserNode) {
      this.frequencyData.fill(0)
      this.waveformData.fill(128)
      this.applyComfortEnvelope(0, deltaSec, false)
      return
    }

    if (this.frequencyScratch.length !== analyserNode.frequencyBinCount) {
      this.frequencyScratch = new Uint8Array(analyserNode.frequencyBinCount)
    }
    if (this.waveformScratch.length !== analyserNode.fftSize) {
      this.waveformScratch = new Uint8Array(analyserNode.fftSize)
    }

    analyserNode.getByteFrequencyData(this.frequencyScratch)
    analyserNode.getByteTimeDomainData(this.waveformScratch)

    for (let index = 0; index < AUDIO_TEXTURE_WIDTH; index += 1) {
      const t = AUDIO_TEXTURE_WIDTH <= 1 ? 0 : index / (AUDIO_TEXTURE_WIDTH - 1)
      this.frequencyData[index] = sampleByIndex(this.frequencyScratch, t)
      this.waveformData[index] = sampleByIndex(this.waveformScratch, t)
    }

    const lowEnergy = averageFrequencyEnergy(this.frequencyScratch, 0.01, 0.08)
    const midEnergy = averageFrequencyEnergy(this.frequencyScratch, 0.10, 0.22)
    const highEnergy = averageFrequencyEnergy(this.frequencyScratch, 0.24, 0.44)
    const waveformRms = computeWaveformRms(this.waveformScratch)

    let rawLevel = lowEnergy * 0.62 + midEnergy * 0.26 + highEnergy * 0.12 + waveformRms * 0.24
    rawLevel = Math.max(0, Math.min(1, rawLevel))

    const playbackActive = this.resolvePlaybackActive()
    if (!playbackActive) {
      rawLevel = 0
    }

    this.applyComfortEnvelope(rawLevel, deltaSec, playbackActive)
  }

  async resume(): Promise<void> {
    if (!this.audioContext) {
      return
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    if (this.attachedAudioElement) {
      this.ensureMediaSourceConnected(this.attachedAudioElement)
    }
  }

  suspend(): void {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      return
    }
    void this.audioContext.suspend().catch(() => undefined)
  }

  dispose(): void {
    this.disposeGraph()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close()
    }
    this.audioContext = null
    this.lastError = null
    this.audioLevel = 0
    this.audioBeat = 0
    this.envelopeFast = 0
    this.envelopeSlow = 0
    this.lastSampleTimeSec = 0
  }

  private resolveSampleDeltaSec(): number {
    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001
    const fallbackDeltaSec = 1 / 60
    if (this.lastSampleTimeSec <= 0) {
      this.lastSampleTimeSec = nowSec
      return fallbackDeltaSec
    }
    const deltaSec = Math.max(1 / 240, Math.min(0.25, nowSec - this.lastSampleTimeSec))
    this.lastSampleTimeSec = nowSec
    return deltaSec
  }

  private resolvePlaybackActive(): boolean {
    const audioElement = this.attachedAudioElement
    if (!audioElement) {
      return false
    }

    const audible = !audioElement.muted && audioElement.volume > 0.0001
    return !audioElement.paused && !audioElement.ended && audioElement.readyState >= 2 && audible
  }

  private applyComfortEnvelope(rawLevel: number, deltaSec: number, playbackActive: boolean): void {
    const attackAlpha = resolveLerpAlpha(deltaSec, ENVELOPE_ATTACK_SEC)
    const releaseAlpha = resolveLerpAlpha(deltaSec, ENVELOPE_RELEASE_SEC)
    const levelAlpha = rawLevel > this.envelopeFast ? attackAlpha : releaseAlpha
    this.envelopeFast += (rawLevel - this.envelopeFast) * levelAlpha

    const slowAlpha = resolveLerpAlpha(deltaSec, SLOW_ENVELOPE_SEC)
    this.envelopeSlow += (this.envelopeFast - this.envelopeSlow) * slowAlpha

    const onset = Math.max(0, this.envelopeFast - this.envelopeSlow - ONSET_THRESHOLD)
    const beatTarget = Math.max(0, Math.min(1, onset * ONSET_GAIN))
    const beatDecay = Math.exp(-deltaSec / BEAT_DECAY_SEC)
    this.audioBeat = Math.max(beatTarget, this.audioBeat * beatDecay)

    if (!playbackActive) {
      const idleDecay = Math.exp(-deltaSec / IDLE_DECAY_SEC)
      this.envelopeFast *= idleDecay
      this.envelopeSlow *= idleDecay
      this.audioBeat *= idleDecay
    }

    this.audioLevel = Math.max(0, Math.min(1, this.envelopeFast))
    this.audioBeat = Math.max(0, Math.min(1, this.audioBeat))
  }

  private disposeGraph(): void {
    if (this.mediaSourceNode) {
      this.mediaSourceNode.disconnect()
      this.mediaSourceNode = null
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }
    this.attachedAudioElement = null
  }

  private ensureMediaSourceConnected(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.analyserNode || this.mediaSourceNode) {
      return
    }
    if (this.audioContext.state !== 'running') {
      return
    }

    this.mediaSourceNode = this.audioContext.createMediaElementSource(audioElement)
    this.mediaSourceNode.connect(this.analyserNode)
    this.analyserNode.connect(this.audioContext.destination)
  }
}
