import { describe, expect, it } from 'vitest'

import {
  normalizeShortcutBinding,
  shortcutWheelMatches,
  wheelEventToCombo,
} from './shortcuts'

describe('shortcuts wheel bindings', () => {
  it('normalizes wheel tokens with modifiers', () => {
    expect(normalizeShortcutBinding('wheelup|ctrl+wheeldown')).toBe('WheelUp|Ctrl+WheelDown')
  })

  it('converts wheel events to wheel combos', () => {
    expect(
      wheelEventToCombo({
        deltaY: -120,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe('WheelUp')

    expect(
      wheelEventToCombo({
        deltaY: 12,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe('Ctrl+WheelDown')
  })

  it('matches wheel bindings against wheel events', () => {
    expect(
      shortcutWheelMatches('WheelDown|Ctrl+WheelUp', {
        deltaY: 90,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(true)

    expect(
      shortcutWheelMatches('WheelDown|Ctrl+WheelUp', {
        deltaY: -90,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(true)

    expect(
      shortcutWheelMatches('WheelDown', {
        deltaY: -90,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(false)
  })
})
