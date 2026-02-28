import { describe, expect, it } from 'vitest'

import {
  startAudioTranscodeTaskRequestSchema,
  readAudioTranscodeCapabilitiesResponseSchema,
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

  it('readAudioTranscodeCapabilitiesResponseSchema 应校验预设能力矩阵', () => {
    const parsed = readAudioTranscodeCapabilitiesResponseSchema.parse({
      enabled: true,
      ffmpeg_available: true,
      ffprobe_available: false,
      library_root_dir: 'C:/media/library',
      default_output_dir: 'C:/media/library/.mediaplayerx/transcoded',
      presets: {
        flac: { available: true, required_encoder: 'flac', required_muxer: 'flac', reason: null },
        alac: { available: true, required_encoder: 'alac', required_muxer: 'ipod/mp4', reason: null },
        wav: { available: true, required_encoder: 'pcm_s16le', required_muxer: 'wav', reason: null },
        opus: {
          available: false,
          required_encoder: 'libopus',
          required_muxer: 'opus',
          reason: 'muxer_unavailable',
        },
        aac: { available: true, required_encoder: 'aac', required_muxer: 'ipod/mp4', reason: null },
        mp3: {
          available: false,
          required_encoder: 'libmp3lame',
          required_muxer: 'mp3',
          reason: 'encoder_unavailable',
        },
      },
      checked_at_ms: Date.now(),
    })

    expect(parsed.presets.flac.available).toBe(true)
    expect(parsed.presets.mp3.reason).toBe('encoder_unavailable')
  })
})
