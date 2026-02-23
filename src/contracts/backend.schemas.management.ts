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
export const imageConvertAdjustModeSchema = z.enum(["basic", "levels", "curve"]);
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
