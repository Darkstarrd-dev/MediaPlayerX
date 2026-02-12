import { describe, expect, it, vi } from 'vitest'

import { FileSystemSystemHandlers } from './FileSystemSystemHandlers'
import type { FileSystemFacadeContext } from './types'

describe('FileSystemSystemHandlers', () => {
  it('writeAppState should pass positional args to database', async () => {
    const ensureStateLoaded = vi.fn().mockResolvedValue(undefined)
    const writeAppState = vi.fn()
    const handlers = new FileSystemSystemHandlers({
      ensureStateLoaded,
      database: {
        writeAppState,
      },
    } as unknown as FileSystemFacadeContext)

    const response = await handlers.writeAppState({
      state_key: 'ui_settings_v1',
      state_json: JSON.stringify({ adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions' }),
    })

    expect(ensureStateLoaded).toHaveBeenCalledTimes(1)
    expect(writeAppState).toHaveBeenCalledWith('ui_settings_v1', {
      adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
    })
    expect(response.updated_at_ms).toBeTypeOf('number')
    expect(response.updated_at_ms).toBeGreaterThan(0)
  })
})
