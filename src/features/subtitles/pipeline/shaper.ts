import {
  countReadableChars,
  isHardBreakToken,
  tokenizeSubtitleText,
  tokensToText,
} from './text'
import {
  DEFAULT_SUBTITLE_SHAPING_OPTIONS,
  type IngestSubtitleDeltaParams,
  type IngestSubtitleDeltaResult,
  type SubtitlePreviewCue,
  type SubtitleShapedCue,
  type SubtitleShapingOptions,
  type SubtitleToken,
} from './types'

interface InternalSubtitleToken extends SubtitleToken {
  charWeight: number
}

export class SubtitleCueShaper {
  private readonly options: SubtitleShapingOptions

  private readonly pendingTokens: InternalSubtitleToken[] = []

  private readonly stableCues: SubtitleShapedCue[] = []

  constructor(options?: Partial<SubtitleShapingOptions>) {
    this.options = {
      ...DEFAULT_SUBTITLE_SHAPING_OPTIONS,
      ...(options ?? {}),
    }
  }

  ingestDelta(params: IngestSubtitleDeltaParams): IngestSubtitleDeltaResult {
    const tokens = tokenizeSubtitleText(params.text)
    if (tokens.length === 0) {
      return {
        cues: [],
        preview: this.getPreviewCue(),
      }
    }

    this.pendingTokens.push(...this.createTimedTokens(tokens, params))
    const cues = this.flushByRules()

    return {
      cues,
      preview: this.getPreviewCue(),
    }
  }

  flushBySilence(nowSec: number): IngestSubtitleDeltaResult {
    const lastToken = this.pendingTokens[this.pendingTokens.length - 1]
    if (!lastToken) {
      return {
        cues: [],
        preview: null,
      }
    }

    if (nowSec - lastToken.endSec < this.options.pauseBreakSec) {
      return {
        cues: [],
        preview: this.getPreviewCue(),
      }
    }

    const cues = this.flushAll()
    return {
      cues,
      preview: null,
    }
  }

  flushAll(): SubtitleShapedCue[] {
    if (this.pendingTokens.length === 0) {
      return []
    }

    const cue = this.buildCue(this.pendingTokens.splice(0, this.pendingTokens.length), true)
    if (!cue) {
      return []
    }

    this.stableCues.push(cue)
    this.pruneStableCues()
    return [cue]
  }

  reset(): void {
    this.pendingTokens.length = 0
    this.stableCues.length = 0
  }

  getPreviewCue(): SubtitlePreviewCue | null {
    if (this.pendingTokens.length === 0) {
      return null
    }

    const cue = this.buildCue(this.pendingTokens, false)
    if (!cue) {
      return null
    }

    return {
      startSec: cue.startSec,
      endSec: cue.endSec,
      text: cue.text,
      speaker: cue.speaker,
    }
  }

  getStableCues(): SubtitleShapedCue[] {
    return [...this.stableCues]
  }

  private createTimedTokens(tokens: string[], params: IngestSubtitleDeltaParams): InternalSubtitleToken[] {
    const speaker = params.speaker ?? null
    const startSec = Math.max(0, params.startSec)
    const endSec = Math.max(startSec + 0.02, params.endSec)
    const totalDuration = endSec - startSec

    const charWeights = tokens.map((token) => Math.max(1, countReadableChars(token)))
    const weightSum = Math.max(1, charWeights.reduce((sum, item) => sum + item, 0))

    let cursor = startSec
    const timedTokens: InternalSubtitleToken[] = []
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      const tokenDuration = (totalDuration * charWeights[index]) / weightSum
      const tokenStart = cursor
      const tokenEnd = index === tokens.length - 1 ? endSec : Math.max(tokenStart + 0.01, tokenStart + tokenDuration)
      cursor = tokenEnd
      timedTokens.push({
        text: token,
        startSec: tokenStart,
        endSec: tokenEnd,
        speaker,
        charWeight: charWeights[index],
      })
    }

    return timedTokens
  }

  private flushByRules(): SubtitleShapedCue[] {
    const emitted: SubtitleShapedCue[] = []

    while (this.pendingTokens.length > 0) {
      const breakIndex = this.findBreakIndex()
      if (breakIndex < 0) {
        break
      }

      const segment = this.pendingTokens.splice(0, breakIndex + 1)
      const cue = this.buildCue(segment, false)
      if (!cue) {
        continue
      }

      this.stableCues.push(cue)
      emitted.push(cue)
      this.pruneStableCues()
    }

    return emitted
  }

  private findBreakIndex(): number {
    if (this.pendingTokens.length === 0) {
      return -1
    }

    const cueStart = this.pendingTokens[0].startSec
    let charCount = 0
    for (let index = 0; index < this.pendingTokens.length; index += 1) {
      const token = this.pendingTokens[index]
      charCount += token.charWeight
      const cueDuration = Math.max(0, token.endSec - cueStart)
      const nextToken = this.pendingTokens[index + 1]
      const gapSec = nextToken ? Math.max(0, nextToken.startSec - token.endSec) : 0

      const shouldBreak =
        isHardBreakToken(token.text) ||
        charCount >= this.options.maxCharsPerCue ||
        cueDuration >= this.options.maxCueSec ||
        gapSec >= this.options.pauseBreakSec

      if (!shouldBreak) {
        continue
      }

      if (nextToken) {
        const shortCue = charCount < this.options.minCharsPerCue || cueDuration < this.options.minCueSec
        if (shortCue && gapSec <= this.options.mergeGapSec) {
          continue
        }
      }

      return index
    }

    return -1
  }

  private buildCue(tokens: InternalSubtitleToken[], forceEmit: boolean): SubtitleShapedCue | null {
    if (tokens.length === 0) {
      return null
    }

    const text = tokensToText(tokens)
    if (!text) {
      return null
    }

    const startSec = Math.max(0, tokens[0].startSec)
    const endSec = Math.max(startSec + 0.06, tokens[tokens.length - 1].endSec)
    const speaker = tokens[0].speaker

    const charCount = countReadableChars(text)
    const duration = endSec - startSec
    if (!forceEmit && charCount < 1 && duration < 0.08) {
      return null
    }

    const normalizedText = this.options.speakerPrefix && speaker !== null ? `S${speaker + 1}: ${text}` : text

    return {
      startSec,
      endSec,
      text: normalizedText,
      speaker,
    }
  }

  private pruneStableCues(): void {
    if (this.stableCues.length <= 500) {
      return
    }
    this.stableCues.splice(0, this.stableCues.length - 500)
  }
}

export { DEFAULT_SUBTITLE_SHAPING_OPTIONS }
export type { SubtitlePreviewCue, SubtitleShapedCue, SubtitleShapingOptions }
