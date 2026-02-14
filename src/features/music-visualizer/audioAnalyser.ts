const AUDIO_TEXTURE_WIDTH = 512

function sampleByIndex(data: Uint8Array, normalizedIndex: number): number {
  if (data.length === 0) {
    return 0
  }
  const rawIndex = Math.max(0, Math.min(data.length - 1, Math.round(normalizedIndex * (data.length - 1))))
  return data[rawIndex] ?? 0
}

export class MusicAudioAnalyser {
  readonly frequencyData = new Uint8Array(AUDIO_TEXTURE_WIDTH)
  readonly waveformData = new Uint8Array(AUDIO_TEXTURE_WIDTH)

  private attachedAudioElement: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private mediaSourceNode: MediaElementAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private frequencyScratch = new Uint8Array(0)
  private waveformScratch = new Uint8Array(0)

  lastError: string | null = null

  attach(audioElement: HTMLAudioElement | null): void {
    if (!audioElement) {
      return
    }

    if (this.attachedAudioElement === audioElement && this.analyserNode) {
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

      if (!this.mediaSourceNode || this.attachedAudioElement !== audioElement) {
        this.mediaSourceNode = this.audioContext.createMediaElementSource(audioElement)
        this.mediaSourceNode.connect(this.analyserNode)
        this.analyserNode.connect(this.audioContext.destination)
      }

      this.attachedAudioElement = audioElement
      this.lastError = null
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
    }
  }

  sample(): void {
    const analyserNode = this.analyserNode
    if (!analyserNode) {
      this.frequencyData.fill(0)
      this.waveformData.fill(128)
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
  }

  async resume(): Promise<void> {
    if (!this.audioContext || this.audioContext.state !== 'suspended') {
      return
    }
    await this.audioContext.resume()
  }

  dispose(): void {
    this.disposeGraph()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close()
    }
    this.audioContext = null
    this.lastError = null
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
}
