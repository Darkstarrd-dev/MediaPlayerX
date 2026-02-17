export interface CapturedAudioChunk {
  sampleRateHz: number
  channelCount: number
  startSec: number
  endSec: number
  samples: Float32Array
}

type ChunkListener = (chunk: CapturedAudioChunk) => void

interface AudioWorkletChunkMessage {
  type: 'chunk'
  sampleRate: number
  channelCount: number
  audioTimeEnd: number
  samples: ArrayBuffer
}

function toWorkletModuleUrl(): string {
  return new URL('./audio-worklets/video-audio-capture.worklet.js', window.location.href).toString()
}

export class VideoSubtitleCapture {
  private audioContext: AudioContext | null = null
  private readonly sourceNodeByVideo = new WeakMap<HTMLVideoElement, MediaElementAudioSourceNode>()
  private sourceNode: MediaElementAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private attachedVideo: HTMLVideoElement | null = null
  private chunkListener: ChunkListener | null = null

  async attach(video: HTMLVideoElement, onChunk: ChunkListener): Promise<void> {
    if (this.attachedVideo === video && this.workletNode) {
      this.chunkListener = onChunk
      return
    }

    this.detach()

    this.chunkListener = onChunk
    this.attachedVideo = video

    const context = this.audioContext ?? new AudioContext({ latencyHint: 'interactive' })
    this.audioContext = context

    if (context.state !== 'running') {
      await context.resume()
    }

    await context.audioWorklet.addModule(toWorkletModuleUrl())

    const sourceNode = this.sourceNodeByVideo.get(video) ?? context.createMediaElementSource(video)
    this.sourceNodeByVideo.set(video, sourceNode)
    const workletNode = new AudioWorkletNode(context, 'video-audio-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: {
        targetSampleRate: 16_000,
        chunkSamples: 1_600,
      },
    })

    workletNode.port.onmessage = (event: MessageEvent<AudioWorkletChunkMessage>) => {
      const message = event.data
      if (!message || message.type !== 'chunk' || !this.attachedVideo || !this.chunkListener) {
        return
      }

      const sampleRate = Math.max(8_000, Number(message.sampleRate) || 16_000)
      const channelCount = Math.max(1, Number(message.channelCount) || 1)
      const samples = new Float32Array(message.samples)
      if (samples.length === 0) {
        return
      }

      const playbackRate = Math.max(0.1, this.attachedVideo.playbackRate || 1)
      const chunkDurationSec = samples.length / sampleRate
      const videoDurationSec = chunkDurationSec * playbackRate
      const endSec = Math.max(0, this.attachedVideo.currentTime || 0)
      const startSec = Math.max(0, endSec - videoDurationSec)

      this.chunkListener({
        sampleRateHz: sampleRate,
        channelCount,
        startSec,
        endSec,
        samples,
      })
    }

    sourceNode.connect(workletNode).connect(context.destination)

    this.sourceNode = sourceNode
    this.workletNode = workletNode
  }

  detach(): void {
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null
      } catch {
        // ignore cleanup errors
      }
      try {
        this.workletNode.disconnect()
      } catch {
        // ignore cleanup errors
      }
      this.workletNode = null
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        // ignore cleanup errors
      }
      this.sourceNode = null
    }

    this.attachedVideo = null
    this.chunkListener = null
  }

  dispose(): void {
    this.detach()
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined)
      this.audioContext = null
    }
  }
}
