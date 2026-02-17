export interface SubtitleToken {
  text: string
  startSec: number
  endSec: number
  speaker: number | null
}

export interface SubtitleShapedCue {
  startSec: number
  endSec: number
  text: string
  speaker: number | null
}

export interface SubtitlePreviewCue {
  startSec: number
  endSec: number
  text: string
  speaker: number | null
}

export interface SubtitleShapingOptions {
  maxCharsPerCue: number
  maxCueSec: number
  pauseBreakSec: number
  minCueSec: number
  minCharsPerCue: number
  mergeGapSec: number
  speakerPrefix: boolean
}

export const DEFAULT_SUBTITLE_SHAPING_OPTIONS: SubtitleShapingOptions = {
  maxCharsPerCue: 24,
  maxCueSec: 6.5,
  pauseBreakSec: 0.75,
  minCueSec: 0.75,
  minCharsPerCue: 6,
  mergeGapSec: 0.35,
  speakerPrefix: false,
}

export interface IngestSubtitleDeltaParams {
  text: string
  startSec: number
  endSec: number
  speaker?: number | null
}

export interface IngestSubtitleDeltaResult {
  cues: SubtitleShapedCue[]
  preview: SubtitlePreviewCue | null
}
