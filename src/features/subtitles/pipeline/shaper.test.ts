import { describe, expect, it } from 'vitest'

import { SubtitleCueShaper } from './shaper'

describe('SubtitleCueShaper', () => {
  it('splits by max chars and keeps remaining text as preview', () => {
    const shaper = new SubtitleCueShaper({
      maxCharsPerCue: 4,
      minCharsPerCue: 1,
      minCueSec: 0.1,
      pauseBreakSec: 0.75,
    })

    const result = shaper.ingestDelta({
      text: '你好世界今天',
      startSec: 0,
      endSec: 2,
    })

    expect(result.cues).toHaveLength(1)
    expect(result.cues[0]?.text).toBe('你好世界')
    expect(result.preview?.text).toBe('今天')
  })

  it('flushes pending preview on silence threshold', () => {
    const shaper = new SubtitleCueShaper({
      maxCharsPerCue: 64,
      minCharsPerCue: 1,
      minCueSec: 0.1,
      pauseBreakSec: 0.5,
    })

    shaper.ingestDelta({
      text: 'alpha beta',
      startSec: 0,
      endSec: 1,
    })

    const shortSilence = shaper.flushBySilence(1.2)
    expect(shortSilence.cues).toHaveLength(0)
    expect(shortSilence.preview?.text).toBe('alpha beta')

    const longSilence = shaper.flushBySilence(1.7)
    expect(longSilence.cues).toHaveLength(1)
    expect(longSilence.cues[0]?.text).toBe('alpha beta')
    expect(longSilence.preview).toBeNull()
  })

  it('adds speaker prefix when enabled', () => {
    const shaper = new SubtitleCueShaper({
      maxCharsPerCue: 64,
      minCharsPerCue: 1,
      minCueSec: 0.1,
      speakerPrefix: true,
    })

    shaper.ingestDelta({
      text: 'hello world',
      startSec: 0,
      endSec: 1,
      speaker: 1,
    })

    const cues = shaper.flushAll()
    expect(cues).toHaveLength(1)
    expect(cues[0]?.text).toBe('S2: hello world')
  })
})
