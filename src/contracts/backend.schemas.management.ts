import { z } from "zod";

const nonNegativeIntSchema = z.number().int().nonnegative();

export const manageAdReviewSelectionScopeSchema = z.enum(["image", "sidebar"]);
export const manageReviewModeSchema = z.enum(["ad", "cover"]);
export const manageAdReviewDecisionSourceSchema = z.enum(["known-hash", "llm"]);
export const manageAdReviewImageSourceSchema = z.enum([
  "known-hash",
  "llm",
  "llm-error",
  "strategy-skip",
]);
export const manageAdReviewTaskStatusSchema = z.enum([
  "pending",
  "running",
  "paused",
  "review",
  "failed",
]);
export const manageAdReviewAllStrategySchema = z.object({
  mode: z.literal("all"),
});
export const manageAdReviewHeadTailStrategySchema = z.object({
  mode: z.literal("head-tail"),
  head_n: z.number().int().min(1).max(20),
  tail_n: z.number().int().min(1).max(20),
  tail_stop_clean_streak: z.number().int().min(1).max(20),
});
export const manageAdReviewStrategySchema = z.discriminatedUnion("mode", [
  manageAdReviewAllStrategySchema,
  manageAdReviewHeadTailStrategySchema,
]);
export const manageAdReviewTaskExecutionSchema = z.object({
  strategy: manageAdReviewStrategySchema,
  max_concurrency: z.number().int().min(1).max(20),
});
export const manageAdReviewSourceDistributionSchema = z.object({
  known_hash: nonNegativeIntSchema,
  llm_suspected: nonNegativeIntSchema,
  llm_clean: nonNegativeIntSchema,
  llm_failed: nonNegativeIntSchema,
  strategy_skipped: nonNegativeIntSchema,
});
export const manageAdReviewTaskAuditSchema = z.object({
  source_distribution: manageAdReviewSourceDistributionSchema,
  llm_hit_rate: z.number().min(0).max(1),
  overall_hit_rate: z.number().min(0).max(1),
});
export const manageAdReviewCandidateSchema = z.object({
  image_id: z.string().min(1),
  package_id: z.string().min(1),
  package_name: z.string().min(1),
  display_name: z.string().min(1),
  ordinal: z.number().int().positive(),
  file_name: z.string().min(1).nullable(),
  reason: z.string().min(1),
  source: manageAdReviewDecisionSourceSchema,
  hash: z.string().min(1),
});
export const manageAdReviewTaskSchema = z.object({
  task_id: z.string().min(1),
  status: manageAdReviewTaskStatusSchema,
  progress: z.number().min(0).max(1),
  total_count: nonNegativeIntSchema,
  reviewed_count: nonNegativeIntSchema,
  suspected_count: nonNegativeIntSchema,
  failed_count: nonNegativeIntSchema,
  known_hash_hits: nonNegativeIntSchema,
  llm_calls: nonNegativeIntSchema,
  scope_image_ids: z.array(z.string().min(1)),
  image_source_by_id: z.record(z.string(), manageAdReviewImageSourceSchema),
  execution: manageAdReviewTaskExecutionSchema.optional(),
  audit: manageAdReviewTaskAuditSchema.optional(),
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  candidates: z.array(manageAdReviewCandidateSchema),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});
export const startManageAdReviewRequestSchema = z.object({
  selection_scope: manageAdReviewSelectionScopeSchema,
  image_ids: z.array(z.string().min(1)).optional(),
  node_ids: z.array(z.string().min(1)).optional(),
  skip_reviewed_nodes: z.boolean().optional(),
  llm_endpoint: z.string().min(1),
  llm_model: z.string().min(1),
  strategy: manageAdReviewStrategySchema.optional(),
  max_concurrency: z.number().int().min(1).max(20).optional(),
});
export const startManageAdReviewResponseSchema = z.object({
  task: manageAdReviewTaskSchema,
});
export const readManageAdReviewTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});
export const readManageAdReviewTaskResponseSchema = z.object({
  task: manageAdReviewTaskSchema.nullable(),
});
export const pauseManageAdReviewTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});
export const pauseManageAdReviewTaskResponseSchema = z.object({
  task: manageAdReviewTaskSchema,
});
export const testAdReviewVisionModelRequestSchema = z.object({
  llm_endpoint: z.string().min(1),
  llm_model: z.string().min(1),
  image_base64: z.string().min(1),
  timeout_ms: z.number().int().min(1_000).max(60_000).optional(),
});
export const testAdReviewVisionModelResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().min(1),
});
export const confirmManageAdReviewDeleteRequestSchema = z.object({
  task_id: z.string().min(1),
  image_ids: z.array(z.string().min(1)).min(1),
});
export const confirmManageAdReviewDeleteResponseSchema = z.object({
  task: manageAdReviewTaskSchema,
  deleted_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      image_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
});

export const manageCoverReviewTaskSchema = manageAdReviewTaskSchema;
export const startManageCoverReviewRequestSchema =
  startManageAdReviewRequestSchema;
export const startManageCoverReviewResponseSchema = z.object({
  task: manageCoverReviewTaskSchema,
});
export const readManageCoverReviewTaskRequestSchema =
  readManageAdReviewTaskRequestSchema;
export const readManageCoverReviewTaskResponseSchema = z.object({
  task: manageCoverReviewTaskSchema.nullable(),
});
export const pauseManageCoverReviewTaskRequestSchema =
  pauseManageAdReviewTaskRequestSchema;
export const pauseManageCoverReviewTaskResponseSchema = z.object({
  task: manageCoverReviewTaskSchema,
});
export const confirmManageCoverReviewHideRequestSchema = z.object({
  task_id: z.string().min(1),
  image_ids: z.array(z.string().min(1)).min(1),
});
export const confirmManageCoverReviewHideResponseSchema = z.object({
  task: manageCoverReviewTaskSchema,
  updated_count: nonNegativeIntSchema,
  requested_count: nonNegativeIntSchema,
  updated_at_ms: z.number().int().positive(),
});

export const manageSubtitleCleanupTaskStatusSchema = z.enum([
  "running",
  "review",
  "failed",
]);
export const manageSubtitleCleanupStageSchema = z.enum([
  "pending",
  "running",
  "ready",
  "failed",
]);
export const manageSubtitleCleanupTaskSchema = z.object({
  task_id: z.string().min(1),
  video_id: z.string().min(1),
  subtitle_path: z.string().min(1),
  status: manageSubtitleCleanupTaskStatusSchema,
  raw_stage: manageSubtitleCleanupStageSchema,
  cleanup_stage: manageSubtitleCleanupStageSchema,
  raw_subtitle_text: z.string(),
  cleaned_subtitle_text: z.string(),
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});
export const startManageSubtitleCleanupRequestSchema = z.object({
  video_id: z.string().min(1),
});
export const startManageSubtitleCleanupResponseSchema = z.object({
  task: manageSubtitleCleanupTaskSchema,
});
export const readManageSubtitleCleanupTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});
export const readManageSubtitleCleanupTaskResponseSchema = z.object({
  task: manageSubtitleCleanupTaskSchema.nullable(),
});
export const runManageSubtitleCleanupRequestSchema = z.object({
  task_id: z.string().min(1),
  llm_endpoint: z.string().min(1),
  llm_model: z.string().min(1),
  llm_prompt: z.string().optional(),
});
export const runManageSubtitleCleanupResponseSchema = z.object({
  task: manageSubtitleCleanupTaskSchema,
});
export const saveManageSubtitleCleanupRequestSchema = z.object({
  task_id: z.string().min(1),
  cleaned_subtitle_text: z.string(),
});
export const saveManageSubtitleCleanupResponseSchema = z.object({
  task: manageSubtitleCleanupTaskSchema,
  saved_path: z.string().min(1),
  updated_at_ms: z.number().int().positive(),
});

export const imageConvertTaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "cancelled",
  "failed",
]);
export const imageConvertFormatSchema = z.enum(["webp", "jpeg", "png", "avif"]);
export const imageConvertAdjustModeSchema = z.enum([
  "basic",
  "levels",
  "curve",
]);
export const imageConvertAdjustProfileSchema = z.object({
  mode: imageConvertAdjustModeSchema,
  brightness: z.number().min(-100).max(100),
  contrast: z.number().min(-100).max(100),
  level_input_black: z.number().int().min(0).max(254),
  level_input_white: z.number().int().min(1).max(255),
  level_gamma: z.number().min(0.1).max(5),
  curve_shadow_x: z.number().int().min(1).max(254),
  curve_midtone_x: z.number().int().min(1).max(254),
  curve_highlight_x: z.number().int().min(1).max(254),
  curve_shadow: z.number().min(-100).max(100),
  curve_midtone: z.number().min(-100).max(100),
  curve_highlight: z.number().min(-100).max(100),
});
export const imageConvertTaskSchema = z.object({
  task_id: z.string().min(1),
  status: imageConvertTaskStatusSchema,
  progress: z.number().min(0).max(1),
  total_count: nonNegativeIntSchema,
  processed_count: nonNegativeIntSchema,
  success_count: nonNegativeIntSchema,
  failed_count: nonNegativeIntSchema,
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});
export const startImageConvertTaskRequestSchema = z.object({
  node_ids: z.array(z.string().min(1)).min(1),
  scale_factor: z.number().min(0.1).max(1.0),
  longest_edge_px: z.number().int().min(1).max(16384).optional(),
  adjust: imageConvertAdjustProfileSchema.optional(),
  target_format: imageConvertFormatSchema,
  quality: z.number().int().min(10).max(100),
  concurrency: z.number().int().min(1).max(16),
});
export const startImageConvertTaskResponseSchema = z.object({
  task: imageConvertTaskSchema,
});
export const readImageConvertTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});
export const readImageConvertTaskResponseSchema = z.object({
  task: imageConvertTaskSchema.nullable(),
});
export const cancelImageConvertTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});
export const cancelImageConvertTaskResponseSchema = z.object({
  task: imageConvertTaskSchema,
});

export const audioTranscodeTaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "cancelled",
  "failed",
]);

export const audioTranscodePresetSchema = z.enum([
  "flac",
  "alac",
  "wav",
  "opus",
  "aac",
  "mp3",
]);

export const audioTranscodePresetCapabilityReasonSchema = z.enum([
  "ffmpeg_unavailable",
  "encoder_unavailable",
  "muxer_unavailable",
]);

export const audioTranscodePresetCapabilitySchema = z.object({
  available: z.boolean(),
  required_encoder: z.string().min(1),
  required_muxer: z.string().min(1),
  reason: audioTranscodePresetCapabilityReasonSchema.nullable(),
});

export const audioTranscodeMetadataModeSchema = z.enum([
  "copy",
  "none",
  "copy_and_override",
]);

export const audioTranscodeSampleRateSchema = z.union([
  z.literal(44_100),
  z.literal(48_000),
  z.literal(96_000),
]);

export const audioTranscodeChannelsSchema = z.union([
  z.literal(1),
  z.literal(2),
]);

export const audioTranscodeWavBitDepthSchema = z.union([
  z.literal(16),
  z.literal(24),
]);

export const audioTranscodeParamsSchema = z.object({
  bitrate_kbps: z.number().int().min(8).max(1536).optional(),
  vbr_quality: z.number().int().min(0).max(9).optional(),
  sample_rate_hz: audioTranscodeSampleRateSchema.optional(),
  channels: audioTranscodeChannelsSchema.optional(),
  flac_compression_level: z.number().int().min(0).max(12).optional(),
  wav_bit_depth: audioTranscodeWavBitDepthSchema.optional(),
  metadata_mode: audioTranscodeMetadataModeSchema.optional(),
  metadata_override: z.record(z.string().min(1), z.string()).optional(),
});

export const readAudioTranscodeCapabilitiesResponseSchema = z.object({
  enabled: z.boolean(),
  ffmpeg_available: z.boolean(),
  ffprobe_available: z.boolean(),
  library_root_dir: z.string().min(1),
  default_output_dir: z.string().min(1),
  presets: z.object({
    flac: audioTranscodePresetCapabilitySchema,
    alac: audioTranscodePresetCapabilitySchema,
    wav: audioTranscodePresetCapabilitySchema,
    opus: audioTranscodePresetCapabilitySchema,
    aac: audioTranscodePresetCapabilitySchema,
    mp3: audioTranscodePresetCapabilitySchema,
  }),
  checked_at_ms: z.number().int().positive(),
});

export const audioTranscodeTaskSchema = z.object({
  task_id: z.string().min(1),
  status: audioTranscodeTaskStatusSchema,
  progress: z.number().min(0).max(1),
  total_count: nonNegativeIntSchema,
  processed_count: nonNegativeIntSchema,
  success_count: nonNegativeIntSchema,
  failed_count: nonNegativeIntSchema,
  output_files: z.array(z.string().min(1)),
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});

export const startAudioTranscodeTaskRequestSchema = z.object({
  audio_ids: z.array(z.string().min(1)).min(1),
  preset: audioTranscodePresetSchema,
  params_override: audioTranscodeParamsSchema.optional(),
  output_dir: z.string().min(1).optional(),
  overwrite: z.boolean().optional(),
  copy_metadata: z.boolean().optional(),
  add_output_to_music_sources: z.boolean().optional(),
});

export const startAudioTranscodeTaskResponseSchema = z.object({
  task: audioTranscodeTaskSchema,
});

export const readAudioTranscodeTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});

export const readAudioTranscodeTaskResponseSchema = z.object({
  task: audioTranscodeTaskSchema.nullable(),
});

export const cancelAudioTranscodeTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});

export const cancelAudioTranscodeTaskResponseSchema = z.object({
  task: audioTranscodeTaskSchema,
});

export const videoTranscodeTaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "cancelled",
  "failed",
]);

export const videoTranscodeContainerSchema = z.enum(["mp4", "mkv", "webm"]);

export const videoTranscodeVideoCodecSchema = z.enum([
  "h264",
  "h265",
  "vp9",
  "av1",
  "copy",
]);

export const videoTranscodeAudioModeSchema = z.enum(["copy", "encode", "drop"]);

export const videoTranscodeQualityModeSchema = z.enum([
  "copy",
  "crf",
  "bitrate",
]);

export const videoTranscodePresetSchema = z.enum([
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
]);

export const videoTranscodeCapabilityReasonSchema = z.enum([
  "ffmpeg_unavailable",
  "encoder_unavailable",
  "muxer_unavailable",
]);

export const videoTranscodeContainerCapabilitySchema = z.object({
  available: z.boolean(),
  required_muxer: z.string().min(1),
  reason: videoTranscodeCapabilityReasonSchema.nullable(),
});

export const videoTranscodeCodecCapabilitySchema = z.object({
  available: z.boolean(),
  required_encoder: z.string().min(1),
  reason: videoTranscodeCapabilityReasonSchema.nullable(),
});

export const videoTranscodeParamsSchema = z.object({
  container: videoTranscodeContainerSchema.optional(),
  video_codec: videoTranscodeVideoCodecSchema.optional(),
  quality_mode: videoTranscodeQualityModeSchema.optional(),
  crf: z.number().int().min(0).max(51).optional(),
  video_bitrate_kbps: z.number().int().min(100).max(200_000).optional(),
  encoder_preset: videoTranscodePresetSchema.optional(),
  scale_long_edge_px: z.number().int().min(240).max(7_680).optional(),
  fps: z.number().min(1).max(240).optional(),
  audio_mode: videoTranscodeAudioModeSchema.optional(),
  audio_bitrate_kbps: z.number().int().min(16).max(1_536).optional(),
  faststart: z.boolean().optional(),
});

export const videoTranscodeTaskSchema = z.object({
  task_id: z.string().min(1),
  status: videoTranscodeTaskStatusSchema,
  progress: z.number().min(0).max(1),
  total_count: nonNegativeIntSchema,
  processed_count: nonNegativeIntSchema,
  success_count: nonNegativeIntSchema,
  failed_count: nonNegativeIntSchema,
  output_files: z.array(z.string().min(1)),
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});

export const startVideoTranscodeTaskRequestSchema = z.object({
  video_ids: z.array(z.string().min(1)).min(1),
  params_override: videoTranscodeParamsSchema.optional(),
  output_dir: z.string().min(1).optional(),
  overwrite: z.boolean().optional(),
  add_output_to_sources: z.boolean().optional(),
});

export const startVideoTranscodeTaskResponseSchema = z.object({
  task: videoTranscodeTaskSchema,
});

export const readVideoTranscodeTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});

export const readVideoTranscodeTaskResponseSchema = z.object({
  task: videoTranscodeTaskSchema.nullable(),
});

export const cancelVideoTranscodeTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});

export const cancelVideoTranscodeTaskResponseSchema = z.object({
  task: videoTranscodeTaskSchema,
});

export const estimateVideoTranscodeOutputSizeRequestSchema = z.object({
  video_ids: z.array(z.string().min(1)).min(1),
  params_override: videoTranscodeParamsSchema.optional(),
});

export const estimateVideoTranscodeMethodSchema = z.enum([
  "bitrate_formula",
  "crf_heuristic",
]);

export const estimateVideoTranscodeConfidenceSchema = z.enum([
  "low",
  "medium",
  "high",
]);

export const estimateVideoTranscodeRangeSchema = z.object({
  low_bytes: nonNegativeIntSchema,
  high_bytes: nonNegativeIntSchema,
});

export const estimateVideoTranscodeOutputSizeResponseSchema = z.object({
  source_total_bytes: nonNegativeIntSchema,
  estimated_bytes: nonNegativeIntSchema,
  range: estimateVideoTranscodeRangeSchema.nullable(),
  method: estimateVideoTranscodeMethodSchema,
  confidence: estimateVideoTranscodeConfidenceSchema,
  target_video_count: nonNegativeIntSchema,
  details: z.object({
    duration_sec: z.number().min(0),
    assumed_video_bitrate_kbps: z.number().min(0).nullable(),
    audio_bitrate_kbps: z.number().min(0).nullable(),
    overhead_factor: z.number().min(1),
  }),
});

export const readVideoTranscodeCapabilitiesResponseSchema = z.object({
  enabled: z.boolean(),
  ffmpeg_available: z.boolean(),
  ffprobe_available: z.boolean(),
  library_root_dir: z.string().min(1),
  default_output_dir: z.string().min(1),
  containers: z.object({
    mp4: videoTranscodeContainerCapabilitySchema,
    mkv: videoTranscodeContainerCapabilitySchema,
    webm: videoTranscodeContainerCapabilitySchema,
  }),
  video_codecs: z.object({
    h264: videoTranscodeCodecCapabilitySchema,
    h265: videoTranscodeCodecCapabilitySchema,
    vp9: videoTranscodeCodecCapabilitySchema,
    av1: videoTranscodeCodecCapabilitySchema,
    copy: videoTranscodeCodecCapabilitySchema,
  }),
  checked_at_ms: z.number().int().positive(),
});
