import { describe, expect, it } from "vitest";

import {
  startAudioTranscodeTaskRequestSchema,
  readAudioTranscodeCapabilitiesResponseSchema,
  audioTranscodeTaskSchema,
  readAudioTranscodeTaskResponseSchema,
  startVideoTranscodeTaskRequestSchema,
  estimateVideoTranscodeOutputSizeRequestSchema,
  estimateVideoTranscodeOutputSizeResponseSchema,
  readVideoTranscodeCapabilitiesResponseSchema,
  videoTranscodeTaskSchema,
  readVideoTranscodeTaskResponseSchema,
} from "./backend.schemas.management";

describe("backend.schemas.management audio transcode contracts", () => {
  it("startAudioTranscodeTaskRequestSchema 应接受最小有效请求", () => {
    const parsed = startAudioTranscodeTaskRequestSchema.parse({
      audio_ids: ["audio-1"],
      preset: "flac",
    });

    expect(parsed).toEqual({
      audio_ids: ["audio-1"],
      preset: "flac",
    });
  });

  it("startAudioTranscodeTaskRequestSchema 应拒绝空 audio_ids", () => {
    expect(() =>
      startAudioTranscodeTaskRequestSchema.parse({
        audio_ids: [],
        preset: "mp3",
      }),
    ).toThrowError();
  });

  it("startAudioTranscodeTaskRequestSchema 应接受参数覆盖配置", () => {
    const parsed = startAudioTranscodeTaskRequestSchema.parse({
      audio_ids: ["audio-1"],
      preset: "mp3",
      params_override: {
        bitrate_kbps: 192,
        vbr_quality: 2,
        sample_rate_hz: 48_000,
        channels: 2,
        metadata_mode: "copy_and_override",
        metadata_override: {
          album: "demo",
        },
      },
    });

    expect(parsed.params_override?.bitrate_kbps).toBe(192);
    expect(parsed.params_override?.metadata_mode).toBe("copy_and_override");
  });

  it("audioTranscodeTaskSchema/readAudioTranscodeTaskResponseSchema 应校验输出字段", () => {
    const task = audioTranscodeTaskSchema.parse({
      task_id: "audio-transcode-1",
      status: "completed",
      progress: 1,
      total_count: 2,
      processed_count: 2,
      success_count: 2,
      failed_count: 0,
      output_files: ["D:/music/a.flac", "D:/music/b.flac"],
      message: "done",
      error_detail: null,
      created_at_ms: Date.now(),
      updated_at_ms: Date.now(),
    });

    const response = readAudioTranscodeTaskResponseSchema.parse({ task });
    expect(response.task?.output_files.length).toBe(2);
  });

  it("readAudioTranscodeCapabilitiesResponseSchema 应校验预设能力矩阵", () => {
    const parsed = readAudioTranscodeCapabilitiesResponseSchema.parse({
      enabled: true,
      ffmpeg_available: true,
      ffprobe_available: false,
      library_root_dir: "C:/media/library",
      default_output_dir: "C:/media/library/.mediaplayerx/transcoded",
      presets: {
        flac: {
          available: true,
          required_encoder: "flac",
          required_muxer: "flac",
          reason: null,
        },
        alac: {
          available: true,
          required_encoder: "alac",
          required_muxer: "ipod/mp4",
          reason: null,
        },
        wav: {
          available: true,
          required_encoder: "pcm_s16le",
          required_muxer: "wav",
          reason: null,
        },
        opus: {
          available: false,
          required_encoder: "libopus",
          required_muxer: "opus",
          reason: "muxer_unavailable",
        },
        aac: {
          available: true,
          required_encoder: "aac",
          required_muxer: "ipod/mp4",
          reason: null,
        },
        mp3: {
          available: false,
          required_encoder: "libmp3lame",
          required_muxer: "mp3",
          reason: "encoder_unavailable",
        },
      },
      checked_at_ms: Date.now(),
    });

    expect(parsed.presets.flac.available).toBe(true);
    expect(parsed.presets.mp3.reason).toBe("encoder_unavailable");
  });
});

describe("backend.schemas.management video transcode contracts", () => {
  it("startVideoTranscodeTaskRequestSchema 应接受最小有效请求", () => {
    const parsed = startVideoTranscodeTaskRequestSchema.parse({
      video_ids: ["video-1"],
    });

    expect(parsed).toEqual({
      video_ids: ["video-1"],
    });
  });

  it("startVideoTranscodeTaskRequestSchema 应接受参数覆盖配置", () => {
    const parsed = startVideoTranscodeTaskRequestSchema.parse({
      video_ids: ["video-1"],
      params_override: {
        container: "mp4",
        video_codec: "h264",
        quality_mode: "crf",
        crf: 23,
        audio_mode: "encode",
        audio_bitrate_kbps: 192,
        faststart: true,
      },
    });

    expect(parsed.params_override?.container).toBe("mp4");
    expect(parsed.params_override?.video_codec).toBe("h264");
  });

  it("estimateVideoTranscodeOutputSizeRequestSchema 应接受最小请求", () => {
    const parsed = estimateVideoTranscodeOutputSizeRequestSchema.parse({
      video_ids: ["video-1"],
    });

    expect(parsed.video_ids).toEqual(["video-1"]);
  });

  it("videoTranscodeTaskSchema/readVideoTranscodeTaskResponseSchema 应校验输出字段", () => {
    const task = videoTranscodeTaskSchema.parse({
      task_id: "video-transcode-1",
      status: "completed",
      progress: 1,
      total_count: 2,
      processed_count: 2,
      success_count: 2,
      failed_count: 0,
      output_files: ["D:/video/a.mp4", "D:/video/b.mp4"],
      message: "done",
      error_detail: null,
      created_at_ms: Date.now(),
      updated_at_ms: Date.now(),
    });

    const response = readVideoTranscodeTaskResponseSchema.parse({ task });
    expect(response.task?.output_files.length).toBe(2);
  });

  it("readVideoTranscodeCapabilitiesResponseSchema 应校验能力矩阵", () => {
    const parsed = readVideoTranscodeCapabilitiesResponseSchema.parse({
      enabled: true,
      ffmpeg_available: true,
      ffprobe_available: true,
      library_root_dir: "C:/media/library",
      default_output_dir: "C:/media/library/transcoded/video",
      containers: {
        mp4: { available: true, required_muxer: "mp4", reason: null },
        mkv: { available: true, required_muxer: "matroska", reason: null },
        webm: {
          available: false,
          required_muxer: "webm",
          reason: "muxer_unavailable",
        },
      },
      video_codecs: {
        h264: { available: true, required_encoder: "libx264", reason: null },
        h265: {
          available: false,
          required_encoder: "libx265",
          reason: "encoder_unavailable",
        },
        vp9: { available: true, required_encoder: "libvpx-vp9", reason: null },
        av1: { available: true, required_encoder: "libaom-av1", reason: null },
        copy: { available: true, required_encoder: "copy", reason: null },
      },
      checked_at_ms: Date.now(),
    });

    expect(parsed.containers.mp4.available).toBe(true);
    expect(parsed.video_codecs.h265.reason).toBe("encoder_unavailable");
  });

  it("estimateVideoTranscodeOutputSizeResponseSchema 应校验估算结果", () => {
    const parsed = estimateVideoTranscodeOutputSizeResponseSchema.parse({
      source_total_bytes: 512_000_000,
      estimated_bytes: 210_000_000,
      range: {
        low_bytes: 160_000_000,
        high_bytes: 290_000_000,
      },
      method: "crf_heuristic",
      confidence: "medium",
      target_video_count: 2,
      details: {
        duration_sec: 120,
        assumed_video_bitrate_kbps: 10_500,
        audio_bitrate_kbps: 128,
        overhead_factor: 1.03,
      },
    });

    expect(parsed.method).toBe("crf_heuristic");
    expect(parsed.range?.low_bytes).toBeLessThan(parsed.range?.high_bytes ?? 0);
  });
});
