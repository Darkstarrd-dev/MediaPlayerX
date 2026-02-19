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

interface SharedAudioChain {
  context: AudioContext
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
}

const sharedAudioChainByVideo = new WeakMap<HTMLVideoElement, SharedAudioChain>()

function toWorkletModuleUrl(): string {
  return new URL('./audio-worklets/video-audio-capture.worklet.js', window.location.href).toString()
}

export class VideoSubtitleCapture {
  private audioContext: AudioContext | null = null
  private readonly originalDescriptorsByVideo = new WeakMap<HTMLVideoElement, {
    muted: PropertyDescriptor | undefined
    volume: PropertyDescriptor | undefined
  }>()
  private sourceNode: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private attachedVideo: HTMLVideoElement | null = null
  private chunkListener: ChunkListener | null = null
  private internalMuted: boolean = false
  private internalVolume: number = 1

  async attach(video: HTMLVideoElement, onChunk: ChunkListener): Promise<void> {
    if (this.attachedVideo === video && this.workletNode) {
      this.chunkListener = onChunk
      return
    }

    this.detach()

    this.chunkListener = onChunk
    this.attachedVideo = video

    // Save current muted/volume state
    this.internalMuted = video.muted
    this.internalVolume = video.volume

    const sharedChain = sharedAudioChainByVideo.get(video)
    const context = sharedChain?.context ?? this.audioContext ?? new AudioContext({ latencyHint: 'interactive' })
    this.audioContext = context

    if (context.state !== 'running') {
      await context.resume()
    }

    await context.audioWorklet.addModule(toWorkletModuleUrl())

    // Force video to unmuted and full volume BEFORE creating source node
    // This ensures MediaElementAudioSourceNode gets full audio data
    const originalMutedDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted')
    const originalVolumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')
    this.originalDescriptorsByVideo.set(video, {
      muted: originalMutedDescriptor,
      volume: originalVolumeDescriptor,
    })

    // Override muted/volume properties to intercept changes
    Object.defineProperty(video, 'muted', {
      get: () => this.internalMuted,
      set: (value: boolean) => {
        this.internalMuted = value
        if (this.gainNode) {
          this.gainNode.gain.value = this.internalMuted ? 0 : this.internalVolume
        }
      },
      configurable: true,
    })

    Object.defineProperty(video, 'volume', {
      get: () => this.internalVolume,
      set: (value: number) => {
        this.internalVolume = Math.max(0, Math.min(1, value))
        if (this.gainNode) {
          this.gainNode.gain.value = this.internalMuted ? 0 : this.internalVolume
        }
      },
      configurable: true,
    })

    // Set actual video element to unmuted and full volume for audio capture
    if (originalMutedDescriptor?.set) {
      originalMutedDescriptor.set.call(video, false)
    }
    if (originalVolumeDescriptor?.set) {
      originalVolumeDescriptor.set.call(video, 1)
    }

    // Reuse shared chain for same video element to avoid
    // "HTMLMediaElement already connected previously" runtime error.
    const sourceNode = sharedChain?.sourceNode ?? context.createMediaElementSource(video)
    const gainNode = sharedChain?.gainNode ?? context.createGain()
    if (!sharedChain) {
      sharedAudioChainByVideo.set(video, {
        context,
        sourceNode,
        gainNode,
      })
    }
    
    // Set initial gain based on internal state
    gainNode.gain.value = this.internalMuted ? 0 : this.internalVolume
    
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

    // Connect audio path: sourceNode -> workletNode -> gainNode -> destination
    // - sourceNode gets full audio (video is forced to unmuted/volume=1)
    // - workletNode processes for ASR and passes through
    // - gainNode controls actual playback volume based on intercepted muted/volume
    sourceNode.connect(workletNode)
    workletNode.connect(gainNode)
    gainNode.connect(context.destination)

    this.sourceNode = sourceNode
    this.gainNode = gainNode
    this.workletNode = workletNode
  }

  detach(): void {
    // Restore original property descriptors
    if (this.attachedVideo) {
      const originalDescriptors = this.originalDescriptorsByVideo.get(this.attachedVideo)
      if (originalDescriptors) {
        if (originalDescriptors.muted) {
          Object.defineProperty(this.attachedVideo, 'muted', originalDescriptors.muted)
        } else {
          delete (this.attachedVideo as unknown as Record<string, unknown>).muted
        }
        if (originalDescriptors.volume) {
          Object.defineProperty(this.attachedVideo, 'volume', originalDescriptors.volume)
        } else {
          delete (this.attachedVideo as unknown as Record<string, unknown>).volume
        }
        
        // Restore the internal state to the video element
        if (originalDescriptors.muted?.set) {
          originalDescriptors.muted.set.call(this.attachedVideo, this.internalMuted)
        }
        if (originalDescriptors.volume?.set) {
          originalDescriptors.volume.set.call(this.attachedVideo, this.internalVolume)
        }
      }
    }

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

    if (this.gainNode) {
      try {
        this.gainNode.disconnect()
      } catch {
        // ignore cleanup errors
      }
      this.gainNode = null
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

  resetBuffer(): void {
    if (!this.workletNode) {
      return
    }
    try {
      this.workletNode.port.postMessage({ type: 'reset' })
    } catch {
      // ignore reset failures
    }
  }

  dispose(): void {
    this.detach()
    // Do not close context here. Closing + reattaching the same video element
    // can trigger createMediaElementSource errors in some browsers/electron builds.
    this.audioContext = null
  }
}
