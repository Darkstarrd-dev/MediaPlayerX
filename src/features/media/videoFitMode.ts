export type VideoFitMode = 'contain' | 'fill' | 'original'

export const VIDEO_FIT_MODE_ORDER: VideoFitMode[] = ['contain', 'fill', 'original']

export function cycleVideoFitMode(current: VideoFitMode): VideoFitMode {
  const currentIndex = VIDEO_FIT_MODE_ORDER.indexOf(current)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % VIDEO_FIT_MODE_ORDER.length
  return VIDEO_FIT_MODE_ORDER[nextIndex]
}

export function videoFitModeLabel(mode: VideoFitMode): string {
  if (mode === 'fill') {
    return '拉伸'
  }
  if (mode === 'original') {
    return '原始'
  }
  return '适应'
}

export function videoFitModeObjectFit(mode: VideoFitMode): 'contain' | 'fill' | 'none' {
  if (mode === 'fill') {
    return 'fill'
  }
  if (mode === 'original') {
    return 'none'
  }
  return 'contain'
}
