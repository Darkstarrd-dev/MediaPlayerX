import { describe, expect, it } from 'vitest'

import {
  startAudioTranscodeTaskRequestSchema,
  audioTranscodeTaskSchema,
  readAudioTranscodeTaskResponseSchema,
} from './backend.schemas.management'

describe('backend.schemas.management audio transcode contracts', () => {
  it('startAudioTranscodeTaskRequestSchema 应接受最小有效请求', () => {
    const parsed = startAudioTranscodeTaskRequestSchema.parse({
      audio_ids: ['audio-1'],
      preset: 'flac',
    })

    expect(parsed).toEqual({
      audio_ids: ['audio-1'],
      preset: 'flac',
    })
  })

  it('startAudioTranscodeTaskRequestSchema 应拒绝空 audio_ids', () => {
    expect(() =>
      startAudioTranscodeTaskRequestSchema.parse({
        audio_ids: [],
        preset: 'mp3',
      }),
    ).toThrowError()
  })

  it('audioTranscodeTaskSchema/readAudioTranscodeTaskResponseSchema 应校验输出字段', () => {
    const task = audioTranscodeTaskSchema.parse({
      task_id: 'audio-transcode-1',
      status: 'completed',
      progress: 1,
      total_count: 2,
      processed_count: 2,
      success_count: 2,
      failed_count: 0,
      output_files: ['D:/music/a.flac', 'D:/music/b.flac'],
      message: 'done',
      error_detail: null,
      created_at_ms: Date.now(),
      updated_at_ms: Date.now(),
    })

    const response = readAudioTranscodeTaskResponseSchema.parse({ task })
    expect(response.task?.output_files.length).toBe(2)
  })
})
