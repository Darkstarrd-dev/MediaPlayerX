import type { MusicVisualizerFrameInput, MusicVisualizerRenderer } from './types'

const BAR_COUNT = 40

function resolveFrequencyValue(frequencyData: Uint8Array, index: number, total: number): number {
  if (frequencyData.length === 0) {
    return 0
  }
  const normalized = total <= 1 ? 0 : index / (total - 1)
  const sourceIndex = Math.max(0, Math.min(frequencyData.length - 1, Math.round(normalized * (frequencyData.length - 1))))
  return (frequencyData[sourceIndex] ?? 0) / 255
}

export class CpuMusicVisualizerRenderer implements MusicVisualizerRenderer {
  readonly backend = 'cpu' as const
  readonly shaderId = 'cpu-fallback-bars'
  readonly rendererLabel = 'Canvas2D CPU Fallback'

  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas2d_unavailable')
    }
    this.ctx = ctx
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    if (this.canvas.width !== nextWidth) {
      this.canvas.width = nextWidth
    }
    if (this.canvas.height !== nextHeight) {
      this.canvas.height = nextHeight
    }
  }

  render({ width, height, timeSec, frequencyData, waveformData }: MusicVisualizerFrameInput): void {
    const ctx = this.ctx

    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#191e5f')
    gradient.addColorStop(0.5, '#2f2b8f')
    gradient.addColorStop(1, '#120f37')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const barAreaHeight = height * 0.7
    const baselineY = height * 0.88
    const gap = Math.max(1, width / (BAR_COUNT * 3.4))
    const barWidth = Math.max(2, (width - gap * (BAR_COUNT + 1)) / BAR_COUNT)

    for (let index = 0; index < BAR_COUNT; index += 1) {
      const energy = resolveFrequencyValue(frequencyData, index, BAR_COUNT)
      const eased = 1 - Math.exp(-energy * 3.2)
      const barHeight = Math.max(4, eased * barAreaHeight)
      const x = gap + index * (barWidth + gap)
      const y = baselineY - barHeight

      const hue = 220 + index * 1.8 + Math.sin(timeSec * 0.7 + index * 0.2) * 10
      ctx.fillStyle = `hsla(${hue.toFixed(1)}, 86%, 66%, 0.96)`
      ctx.fillRect(x, y, barWidth, barHeight)
    }

    ctx.lineWidth = Math.max(1.2, width / 780)
    ctx.strokeStyle = 'rgba(238, 236, 255, 0.88)'
    ctx.beginPath()
    for (let index = 0; index < waveformData.length; index += 1) {
      const x = (index / Math.max(1, waveformData.length - 1)) * width
      const normalized = (waveformData[index] ?? 128) / 255
      const y = height * 0.16 + (normalized - 0.5) * height * 0.22
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  dispose(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
