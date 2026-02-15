import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => {
  return {
    app: {},
  }
})

import { buildSceneApplyScript } from './themeGalleryCaptureRuntime'

describe('themeGalleryCaptureRuntime selectors', () => {
  it('prefers stable data-a11y-id selectors for app controls', () => {
    const script = buildSceneApplyScript('flush', 'parchment', 'image-default')

    expect(script).toContain('button[data-a11y-id="header.mode.image"]')
    expect(script).toContain('button[data-a11y-id="header.mode.video"]')
    expect(script).toContain('button[data-a11y-id="header.mode.music"]')
    expect(script).toContain('button[data-a11y-id="header.search"]')
    expect(script).toContain('button[data-a11y-id="header.manage"]')
    expect(script).toContain('button[data-a11y-id="header.metadataToggle"]')
    expect(script).toContain('button[data-a11y-id="header.settings"]')
    expect(script).toContain('button[data-a11y-id="settings.close"]')
  })
})
