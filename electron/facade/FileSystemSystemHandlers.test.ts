import { describe, expect, it, vi } from 'vitest'

import { FileSystemSystemHandlers } from './FileSystemSystemHandlers'
import type { FileSystemFacadeContext } from './types'

describe('FileSystemSystemHandlers', () => {
  it('readAppState should delegate to libraryReadWriteService', async () => {
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({ themeId: 'parchment' }),
    })
    const handlers = new FileSystemSystemHandlers({
      libraryReadWriteService: {
        readAppState,
      },
    } as unknown as FileSystemFacadeContext)

    const response = await handlers.readAppState({
      state_key: 'ui_settings_v1',
    })

    expect(readAppState).toHaveBeenCalledWith({
      state_key: 'ui_settings_v1',
    })
    expect(response).toEqual({
      state_json: JSON.stringify({ themeId: 'parchment' }),
    })
  })

  it('writeAppState should delegate to libraryReadWriteService', async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: 1730000000000 })
    const handlers = new FileSystemSystemHandlers({
      libraryReadWriteService: {
        writeAppState,
      },
    } as unknown as FileSystemFacadeContext)

    const response = await handlers.writeAppState({
      state_key: 'ui_settings_v1',
      state_json: JSON.stringify({ adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions' }),
    })

    expect(writeAppState).toHaveBeenCalledWith({
      state_key: 'ui_settings_v1',
      state_json: JSON.stringify({ adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions' }),
    })
    expect(response).toEqual({ updated_at_ms: 1730000000000 })
  })
})
