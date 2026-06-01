import { z } from "zod";
export {
  batchRenameSidebarModeSchema,
  renameSidebarNodesRequestSchema,
  renameSidebarNodesResponseSchema,
  renameItemTargetSchema,
  renameItemsModeSchema,
  renameItemsRequestSchema,
  renameItemsResponseSchema,
} from "./backend.schemas.rename";
export {
  manageAdReviewSelectionScopeSchema,
  manageReviewModeSchema,
  manageAdReviewDecisionSourceSchema,
  manageAdReviewImageSourceSchema,
  manageAdReviewTaskStatusSchema,
  manageAdReviewExecutionModeSchema,
  manageAdReviewAllStrategySchema,
  manageAdReviewHeadTailStrategySchema,
  manageAdReviewStrategySchema,
  manageAdReviewTaskExecutionSchema,
  manageAdReviewPerformanceResultSchema,
  manageAdReviewSourceDistributionSchema,
  manageAdReviewTaskAuditSchema,
  manageAdReviewCandidateSchema,
  manageAdReviewTaskSchema,
  startManageAdReviewRequestSchema,
  startManageAdReviewResponseSchema,
  readManageAdReviewTaskRequestSchema,
  readManageAdReviewTaskResponseSchema,
  pauseManageAdReviewTaskRequestSchema,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelRequestSchema,
  testAdReviewVisionModelResponseSchema,
  confirmManageAdReviewDeleteRequestSchema,
  confirmManageAdReviewDeleteResponseSchema,
  readManageAdReviewKnownHashesResponseSchema,
  importManageAdReviewKnownHashesRequestSchema,
  importManageAdReviewKnownHashesResponseSchema,
  exportManageAdReviewKnownHashesRequestSchema,
  exportManageAdReviewKnownHashesResponseSchema,
  manageCoverReviewTaskSchema,
  startManageCoverReviewRequestSchema,
  startManageCoverReviewResponseSchema,
  readManageCoverReviewTaskRequestSchema,
  readManageCoverReviewTaskResponseSchema,
  pauseManageCoverReviewTaskRequestSchema,
  pauseManageCoverReviewTaskResponseSchema,
  confirmManageCoverReviewHideRequestSchema,
  confirmManageCoverReviewHideResponseSchema,
  manageSubtitleCleanupTaskStatusSchema,
  manageSubtitleCleanupStageSchema,
  manageSubtitleCleanupTaskSchema,
  startManageSubtitleCleanupRequestSchema,
  startManageSubtitleCleanupResponseSchema,
  readManageSubtitleCleanupTaskRequestSchema,
  readManageSubtitleCleanupTaskResponseSchema,
  runManageSubtitleCleanupRequestSchema,
  runManageSubtitleCleanupResponseSchema,
  saveManageSubtitleCleanupRequestSchema,
  saveManageSubtitleCleanupResponseSchema,
  imageConvertTaskStatusSchema,
  imageConvertFormatSchema,
  imageConvertAdjustModeSchema,
  imageConvertAdjustProfileSchema,
  imageConvertTaskSchema,
  startImageConvertTaskRequestSchema,
  startImageConvertTaskResponseSchema,
  readImageConvertTaskRequestSchema,
  readImageConvertTaskResponseSchema,
  cancelImageConvertTaskRequestSchema,
  cancelImageConvertTaskResponseSchema,
  audioTranscodeTaskStatusSchema,
  audioTranscodePresetSchema,
  audioTranscodePresetCapabilityReasonSchema,
  audioTranscodePresetCapabilitySchema,
  audioTranscodeMetadataModeSchema,
  audioTranscodeSampleRateSchema,
  audioTranscodeChannelsSchema,
  audioTranscodeWavBitDepthSchema,
  audioTranscodeParamsSchema,
  readAudioTranscodeCapabilitiesResponseSchema,
  audioTranscodeTaskSchema,
  startAudioTranscodeTaskRequestSchema,
  startAudioTranscodeTaskResponseSchema,
  readAudioTranscodeTaskRequestSchema,
  readAudioTranscodeTaskResponseSchema,
  cancelAudioTranscodeTaskRequestSchema,
  cancelAudioTranscodeTaskResponseSchema,
  videoTranscodeTaskStatusSchema,
  videoTranscodeContainerSchema,
  videoTranscodeVideoCodecSchema,
  videoTranscodeAudioModeSchema,
  videoTranscodeQualityModeSchema,
  videoTranscodePresetSchema,
  videoTranscodeCapabilityReasonSchema,
  videoTranscodeContainerCapabilitySchema,
  videoTranscodeCodecCapabilitySchema,
  videoTranscodeParamsSchema,
  videoTranscodeTaskSchema,
  startVideoTranscodeTaskRequestSchema,
  startVideoTranscodeTaskResponseSchema,
  readVideoTranscodeTaskRequestSchema,
  readVideoTranscodeTaskResponseSchema,
  cancelVideoTranscodeTaskRequestSchema,
  cancelVideoTranscodeTaskResponseSchema,
  readVideoTranscodeCapabilitiesResponseSchema,
  estimateVideoTranscodeOutputSizeRequestSchema,
  estimateVideoTranscodeOutputSizeResponseSchema,
  estimateVideoTranscodeMethodSchema,
  estimateVideoTranscodeConfidenceSchema,
  estimateVideoTranscodeRangeSchema,
} from "./backend.schemas.management";
import { readAudioTranscodeCapabilitiesResponseSchema } from "./backend.schemas.management";

const nonNegativeIntSchema = z.number().int().nonnegative();

export const browserModeDtoSchema = z.enum(["image", "video", "music"]);

export const featureFilterDtoSchema = z.object({
  name_query: z.string(),
  work_title_query: z.string(),
  series_id_query: z.string(),
  circle_query: z.string(),
  author_query: z.string(),
  tags: z.array(z.string()),
  grade: z.number().int().min(0).max(5).nullable(),
});

export const mediaLocatorDtoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("filesystem"),
    absolute_path: z.string().min(1),
    extension: z.string().min(1),
    media_type: z.enum(["image", "video", "audio", "subtitle"]),
    mime_type: z.string().min(1),
  }),
  z.object({
    kind: z.literal("archive-entry"),
    archive_path: z.string().min(1),
    archive_format: z.enum(["zip", "rar", "7z"]),
    entry_name: z.string().min(1),
    extension: z.string().min(1),
    media_type: z.enum(["image", "video", "audio", "subtitle"]),
    mime_type: z.string().min(1),
  }),
]);

export const imageItemDtoSchema = z.object({
  id: z.string().min(1),
  ordinal: z.number().int().positive(),
  width: nonNegativeIntSchema,
  height: nonNegativeIntSchema,
  size_kb: nonNegativeIntSchema,
  cluster: nonNegativeIntSchema,
  color: z.string().min(1),
  media_locator: mediaLocatorDtoSchema,
  hidden: z.boolean().optional(),
});

export const imageSourceExternalMetadataDtoSchema = z.object({
  source_site: z.enum(["nhentai", "ehentai", "others"]),
  source_url: z.string().min(1),
  source_remote_id: z.string().min(1),
  source_token: z.string(),
  title: z.string(),
  title_jpn: z.string(),
  group_name: z.string(),
  group_name_jpn: z.string(),
  artist: z.string(),
  artist_jpn: z.string(),
  posted: z.string(),
  rating: z.string().nullable().optional(),
  favorited: z.string().nullable().optional(),
  tags: z.record(z.string(), z.string()),
  raw_json: z.string(),
});

export const imageSourceCoverDtoSchema = z.object({
  cover_color: z.string().min(1),
  cover_image_path: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const imagePreferenceMetricsDtoSchema = z.object({
  event_count: nonNegativeIntSchema,
  pages_read: nonNegativeIntSchema,
  total_pages: nonNegativeIntSchema,
  completion_ratio: z.number().min(0).max(1),
  last_event_time_ms: z.number().int().positive().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const videoPreferenceMetricsDtoSchema = z.object({
  event_count: nonNegativeIntSchema,
  watch_seconds: z.number().min(0),
  total_seconds: nonNegativeIntSchema,
  completion_ratio: z.number().min(0).max(1),
  last_event_time_ms: z.number().int().positive().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const imagePackageDtoSchema = z.object({
  id: z.string().min(1),
  package_name: z.string().min(1),
  display_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  work_title: z.string().min(1),
  series_id: z.string().default(""),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  mock_grade: z.number().int().min(0).max(5).nullable(),
  external_metadata: imageSourceExternalMetadataDtoSchema.nullable().optional(),
  source_cover: imageSourceCoverDtoSchema.nullable().optional(),
  preference_metrics: imagePreferenceMetricsDtoSchema.nullable().optional(),
  images: z.array(imageItemDtoSchema),
});

export const imageSourceLiteDtoSchema = z.object({
  id: z.string().min(1),
  package_name: z.string().min(1),
  display_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  work_title: z.string().min(1),
  series_id: z.string().default(""),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  mock_grade: z.number().int().min(0).max(5).nullable(),
  external_metadata: imageSourceExternalMetadataDtoSchema.nullable().optional(),
  source_cover: imageSourceCoverDtoSchema.nullable().optional(),
  preference_metrics: imagePreferenceMetricsDtoSchema.nullable().optional(),
});

// 侧边栏源：lite 字段 + 可见图片数 + 封面 locator（不携带全库 images，按需加载）
export const imageSourceSidebarDtoSchema = imageSourceLiteDtoSchema.extend({
  image_count: nonNegativeIntSchema,
  cover_media_locator: mediaLocatorDtoSchema.nullable(),
});

export const videoItemDtoSchema = z.object({
  id: z.string().min(1),
  file_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  duration_sec: nonNegativeIntSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_mb: nonNegativeIntSchema,
  cover_color: z.string().min(1),
  cover_image_path: z.string().min(1).nullable().optional(),
  work_title: z.string().min(1),
  work_title_jpn: z.string().default(""),
  series_id: z.string().default(""),
  circle: z.string().min(1),
  circle_jpn: z.string().default(""),
  author: z.string().min(1),
  author_jpn: z.string().default(""),
  tags: z.array(z.string()),
  grade: z.number().int().min(0).max(5).nullable().optional(),
  preference_metrics: videoPreferenceMetricsDtoSchema.nullable().optional(),
  media_locator: mediaLocatorDtoSchema,
});

export const audioItemDtoSchema = z.object({
  id: z.string().min(1),
  file_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  duration_sec: nonNegativeIntSchema,
  size_mb: nonNegativeIntSchema,
  album: z.string().default(""),
  author: z.string().default(""),
  track_title: z.string().default(""),
  series_id: z.string().default(""),
  cue_source_path: z.string().min(1).optional(),
  cue_track_no: z.number().int().positive().optional(),
  cue_start_sec: z.number().min(0).optional(),
  cue_end_sec: z.number().min(0).nullable().optional(),
  media_locator: mediaLocatorDtoSchema,
});

export const focusedImageRefDtoSchema = z.object({
  package_id: z.string().min(1),
  image_index: nonNegativeIntSchema,
});

export const sidebarNodeDtoSchema: z.ZodType<{
  id: string;
  label: string;
  kind: "folder" | "package" | "video" | "audio";
  image_node_type?: "folder" | "package" | "directory";
  children: Array<unknown>;
  package_id?: string;
  video_id?: string;
  audio_id?: string;
  image_source_id?: string;
  cover_source_id?: string;
  cover_image_id?: string;
  direct_image_count?: number;
  descendant_package_count?: number;
  descendant_image_count?: number;
  descendant_node_count?: number;
  path_key: string;
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(["folder", "package", "video", "audio"]),
    image_node_type: z.enum(["folder", "package", "directory"]).optional(),
    children: z.array(sidebarNodeDtoSchema),
    package_id: z.string().min(1).optional(),
    video_id: z.string().min(1).optional(),
    audio_id: z.string().min(1).optional(),
    image_source_id: z.string().min(1).optional(),
    cover_source_id: z.string().min(1).optional(),
    cover_image_id: z.string().min(1).optional(),
    direct_image_count: nonNegativeIntSchema.optional(),
    descendant_package_count: nonNegativeIntSchema.optional(),
    descendant_image_count: nonNegativeIntSchema.optional(),
    descendant_node_count: nonNegativeIntSchema.optional(),
    path_key: z.string().min(1),
  }),
);

export const librarySnapshotDtoSchema = z.object({
  image_packages: z.array(imagePackageDtoSchema),
  image_directories: z.array(imagePackageDtoSchema),
  videos: z.array(videoItemDtoSchema),
  audios: z.array(audioItemDtoSchema).optional(),
});

export const librarySnapshotLiteDtoSchema = z.object({
  image_packages: z.array(imageSourceLiteDtoSchema),
  image_directories: z.array(imageSourceLiteDtoSchema),
  videos: z.array(videoItemDtoSchema),
  audios: z.array(audioItemDtoSchema).optional(),
});

export const gradeOverrideMapSchema = z.record(
  z.string(),
  z.number().int().min(0).max(5).nullable(),
);

export const readImageSidebarTreeRequestSchema = z.object({
  feature_filter: featureFilterDtoSchema,
  grade_overrides: gradeOverrideMapSchema.optional(),
  include_hidden: z.boolean().optional(),
});

export const readImageSidebarTreeResponseSchema = z.object({
  image_packages: z.array(imageSourceSidebarDtoSchema),
  image_directories: z.array(imageSourceSidebarDtoSchema),
  tree: z.array(sidebarNodeDtoSchema),
});

export const readImagePageRequestSchema = z.object({
  source_id: z.string().min(1).nullable(),
  page_index: nonNegativeIntSchema,
  page_size: z.number().int().positive(),
  show_names_only: z.boolean(),
  include_hidden: z.boolean().optional(),
  feature_filter: featureFilterDtoSchema,
  grade_overrides: gradeOverrideMapSchema.optional(),
});

export const readImagePageResponseSchema = z.object({
  source_id: z.string().min(1).nullable(),
  total_items: nonNegativeIntSchema,
  page_index: nonNegativeIntSchema,
  page_size: z.number().int().positive(),
  refs: z.array(focusedImageRefDtoSchema),
});

export const readSourceImagesRequestSchema = z.object({
  source_id: z.string().min(1),
  include_hidden: z.boolean().optional(),
});

export const readSourceImagesResponseSchema = z.object({
  source_id: z.string().min(1),
  images: z.array(imageItemDtoSchema),
});

export const readImageMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  image_index: nonNegativeIntSchema,
  include_hidden: z.boolean().optional(),
});

export const readImageMetadataResponseSchema = z
  .object({
    package: imagePackageDtoSchema,
    image: imageItemDtoSchema,
    grade: z.number().int().min(0).max(5).nullable(),
  })
  .nullable();

export const resolveMediaResourceRequestSchema = z.object({
  locator: mediaLocatorDtoSchema,
  preferred_variant: z.enum(["original", "thumbnail"]).optional(),
  thumbnail: z
    .object({
      max_edge: z.number().int().min(64).max(2048).optional(),
      quality: z.number().int().min(1).max(100).optional(),
      generation_concurrency: z.number().int().min(1).max(16).optional(),
      queue_size: z.number().int().min(16).max(256).optional(),
    })
    .optional(),
  fullscreen_resize: z
    .object({
      target_width: z.number().int().min(1).max(7680),
      target_height: z.number().int().min(1).max(4320),
      kernel: z.enum(["lanczos3", "mitchell", "nearest", "cubic"]),
    })
    .optional(),
});

export const resolveMediaResourceResponseSchema = z.object({
  resource_url: z.string().min(1),
  mime_type: z.string().min(1),
  expires_at_ms: z.number().int().positive(),
});

export const updatePerformanceConfigRequestSchema = z.object({
  cpu_token_limit: z.number().int().min(1).max(16),
});

export const updatePerformanceConfigResponseSchema = z.object({
  applied: z.boolean(),
});

export const writePackageGradeRequestSchema = z.object({
  package_id: z.string().min(1),
  grade: z.number().int().min(0).max(5).nullable(),
});

export const writePackageGradeResponseSchema = z.object({
  package_id: z.string().min(1),
  grade: z.number().int().min(0).max(5).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const setImageHiddenRequestSchema = z.object({
  image_ids: z.array(z.string().min(1)).min(1),
  hidden: z.boolean(),
});

export const setImageHiddenResponseSchema = z.object({
  updated_count: nonNegativeIntSchema,
  updated_at_ms: z.number().int().positive(),
});

export const deleteImageItemsRequestSchema = z.object({
  image_ids: z.array(z.string().min(1)).min(1),
});

export const deleteImageItemsResponseSchema = z.object({
  deleted_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      image_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
});

export const deleteSidebarNodesRequestSchema = z.object({
  node_ids: z.array(z.string().min(1)).min(1),
  delete_files: z.boolean().optional(),
});

export const deleteSidebarNodesResponseSchema = z.object({
  deleted_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      node_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
});

export const moveSidebarNodesRequestSchema = z.object({
  node_ids: z.array(z.string().min(1)).min(1),
  destination_directory: z.string().min(1),
  group_name: z.string().min(1).optional(),
});

export const moveSidebarNodesResponseSchema = z.object({
  moved_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      node_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  target_directory: z.string().min(1),
  updated_at_ms: z.number().int().positive(),
});

export const renameSidebarNodeRequestSchema = z.object({
  node_id: z.string().min(1),
  new_name: z.string().min(1),
});

export const renameSidebarNodeResponseSchema = z.object({
  renamed_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      node_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  target_path: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const writePackageMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  work_title: z.string().min(1),
  series_id: z.string().optional(),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  sync_work_title_to_package_name: z.boolean().optional(),
});

export const searchExternalMetadataRequestSchema = z.object({
  input_text: z.string().optional(),
  input_id: z.string().optional(),
  source: z.enum(["nhentai", "ehentai"]).optional(),
  proxy_server: z.string().optional(),
});

export const externalAuthProviderSchema = z.enum(["ehentai"]);

export const externalAuthStatusRequestSchema = z.object({
  provider: externalAuthProviderSchema,
});

export const externalAuthStatusResponseSchema = z.object({
  provider: externalAuthProviderSchema,
  state: z.enum(["connected", "disconnected", "error"]),
  connected: z.boolean(),
  message: z.string().min(1).nullable(),
  checked_at_ms: z.number().int().nonnegative(),
});

export const externalAuthConnectRequestSchema = z.object({
  provider: externalAuthProviderSchema,
});

export const externalAuthConnectResponseSchema = z.object({
  provider: externalAuthProviderSchema,
  opened: z.boolean(),
  connected: z.boolean(),
  message: z.string().min(1).nullable(),
  checked_at_ms: z.number().int().nonnegative(),
});

export const externalAuthDisconnectRequestSchema = z.object({
  provider: externalAuthProviderSchema,
});

export const externalAuthDisconnectResponseSchema = z.object({
  provider: externalAuthProviderSchema,
  disconnected: z.boolean(),
  message: z.string().min(1).nullable(),
  checked_at_ms: z.number().int().nonnegative(),
});

export const searchExternalMetadataDebugStepSchema = z.object({
  at_ms: z.number().int().nonnegative(),
  stage: z.string().min(1),
  message: z.string().min(1),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
});

export const searchExternalMetadataDebugSchema = z.object({
  source: z.enum(["nhentai", "ehentai"]),
  started_at_ms: z.number().int().nonnegative(),
  finished_at_ms: z.number().int().nonnegative(),
  success: z.boolean(),
  result_count: nonNegativeIntSchema,
  error_message: z.string().min(1).optional(),
  steps: z.array(searchExternalMetadataDebugStepSchema),
});

export const externalMetadataResultItemSchema = z.object({
  source: z.enum(["nhentai", "ehentai"]),
  id: z.string().min(1),
  title: z.string().min(1),
  title_original: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
  url: z.string().min(1),
  token: z.string().nullable().optional(),
  tags: z.array(z.string()),
  pages: z.number().int().positive().nullable().optional(),
  posted: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  favorited: z.number().int().nonnegative().nullable().optional(),
  raw: z.unknown(),
});

export const searchExternalMetadataResponseSchema = z.object({
  items: z.array(externalMetadataResultItemSchema),
  debug: searchExternalMetadataDebugSchema.optional(),
});

export const writePackageMetadataResponseSchema = z.object({
  package: imagePackageDtoSchema,
  updated_at_ms: z.number().int().positive(),
});

export const writePackageExternalMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  source_site: z.enum(["nhentai", "ehentai", "others"]),
  source_url: z.string().min(1),
  source_remote_id: z.string().min(1),
  source_token: z.string().optional(),
  title: z.string().optional(),
  title_jpn: z.string().optional(),
  group_name: z.string().optional(),
  group_name_jpn: z.string().optional(),
  artist: z.string().optional(),
  artist_jpn: z.string().optional(),
  posted: z.string().optional(),
  rating: z.string().nullable().optional(),
  favorited: z.string().nullable().optional(),
  tags: z.record(z.string(), z.string()),
  raw_json: z.string().min(1),
  thumb_url: z.string().optional(),
});

export const writePackageExternalMetadataResponseSchema = z.object({
  package: imagePackageDtoSchema,
  updated_at_ms: z.number().int().positive(),
});

export const writeVideoMetadataRequestSchema = z.object({
  video_id: z.string().min(1),
  work_title: z.string().min(1),
  work_title_jpn: z.string().optional(),
  series_id: z.string().optional(),
  circle: z.string().min(1),
  circle_jpn: z.string().optional(),
  author: z.string().min(1),
  author_jpn: z.string().optional(),
  tags: z.array(z.string()),
  grade: z.number().int().min(0).max(5).nullable().optional(),
  sync_file_name_to_work_title: z.boolean().optional(),
});

export const writeVideoMetadataResponseSchema = z.object({
  video: videoItemDtoSchema,
  updated_at_ms: z.number().int().positive(),
});

export const writeAudioMetadataRequestSchema = z.object({
  audio_id: z.string().min(1),
  album: z.string().optional(),
  author: z.string().optional(),
  track_title: z.string().optional(),
  series_id: z.string().optional(),
});

export const writeAudioMetadataResponseSchema = z.object({
  audio: audioItemDtoSchema,
  updated_at_ms: z.number().int().positive(),
});

export const saveVideoCoverRequestSchema = z.object({
  video_id: z.string().min(1),
  time_sec: z.number().nonnegative(),
  fallback_color: z.string().min(1).optional(),
});

export const saveVideoCoverResponseSchema = z.object({
  video_id: z.string().min(1),
  cover_color: z.string().min(1),
  cover_image_path: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const readPlaylistResponseSchema = z.object({
  video_ids: z.array(z.string().min(1)),
});

export const subtitleFormatDtoSchema = z.enum(["vtt", "srt", "ass", "ssa"]);

export const subtitleSourceDtoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source: z.enum(["external"]),
  format: subtitleFormatDtoSchema,
  locator: mediaLocatorDtoSchema,
});

export const listVideoSubtitlesRequestSchema = z.object({
  video_id: z.string().min(1),
});

export const listVideoSubtitlesResponseSchema = z.object({
  subtitles: z.array(subtitleSourceDtoSchema),
  ffmpeg_available: z.boolean(),
});

export const prepareSubtitleTrackRequestSchema = z.object({
  subtitle_id: z.string().min(1),
  locator: mediaLocatorDtoSchema,
  format: subtitleFormatDtoSchema,
});

export const prepareSubtitleTrackResponseSchema = z.object({
  locator: mediaLocatorDtoSchema,
  converted: z.boolean(),
});

export const writePlaylistRequestSchema = z.object({
  video_ids: z.array(z.string().min(1)),
});

export const writePlaylistResponseSchema = z.object({
  video_ids: z.array(z.string().min(1)),
  updated_at_ms: z.number().int().positive(),
});

export const importTaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export const importTaskSourceSchema = z.enum([
  "dialog-files",
  "dialog-folders",
  "drag-drop",
  "paste",
  "dialog-files-music",
  "dialog-folders-music",
  "drag-drop-music",
  "paste-music",
]);

export const importTaskDtoSchema = z.object({
  task_id: z.string().min(1),
  task_type: z.literal("import"),
  source: importTaskSourceSchema,
  paths: z.array(z.string().min(1)),
  status: importTaskStatusSchema,
  progress: z.number().min(0).max(1),
  processed_count: nonNegativeIntSchema,
  total_count: nonNegativeIntSchema,
  message: z.string().min(1).nullable(),
  error_detail: z.string().min(1).nullable(),
  created_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
});

export const enqueueImportTaskRequestSchema = z.object({
  source: importTaskSourceSchema,
  paths: z.array(z.string().min(1)).min(1),
});

export const enqueueImportTaskResponseSchema = z.object({
  task: importTaskDtoSchema,
});

export const readImportTasksResponseSchema = z.object({
  tasks: z.array(importTaskDtoSchema),
});

export const retryImportTaskRequestSchema = z.object({
  task_id: z.string().min(1),
});

export const retryImportTaskResponseSchema = z.object({
  task: importTaskDtoSchema,
});

export const pickImportPathsRequestSchema = z.object({
  mode: z.enum(["files", "folders"]),
  target_mode: z.enum(["image", "video", "music"]).optional(),
});

export const pickImportPathsResponseSchema = z.object({
  paths: z.array(z.string().min(1)),
});

export const fileDialogFilterSchema = z.object({
  name: z.string().min(1),
  extensions: z.array(z.string().min(1)).min(1),
});

export const pickFilePathRequestSchema = z.object({
  title: z.string().min(1).optional(),
  default_path: z.string().min(1).optional(),
  filters: z.array(fileDialogFilterSchema).optional(),
});

export const pickFilePathResponseSchema = z.object({
  canceled: z.boolean(),
  path: z.string().min(1).nullable(),
});

export const pickDirectoryPathRequestSchema = z.object({
  title: z.string().min(1).optional(),
  default_path: z.string().min(1).optional(),
});

export const pickDirectoryPathResponseSchema = z.object({
  canceled: z.boolean(),
  path: z.string().min(1).nullable(),
});

export const readClipboardImportPathsResponseSchema = z.object({
  paths: z.array(z.string().min(1)),
});

export const clearDatabaseResponseSchema = z.object({
  cleared: z.boolean(),
  cleared_at_ms: z.number().int().positive(),
});

export const readArchiveLoadStatusResponseSchema = z.object({
  running_archive_path: z.string().min(1).nullable(),
  running_archive_progress: z.number().min(0).max(1).nullable().optional(),
  running_archive_message: z.string().min(1).nullable().optional(),
  pending_archive_paths: z.array(z.string().min(1)),
  thumbnail_running_count: z.number().int().min(0).optional(),
  thumbnail_running_progress: z.number().min(0).max(1).nullable().optional(),
  thumbnail_running_message: z.string().min(1).nullable().optional(),
  updated_at_ms: z.number().int().positive(),
});

export const readAppStateRequestSchema = z.object({
  state_key: z.string().min(1),
  fallback_json: z.string().optional(),
});

export const readAppStateResponseSchema = z.object({
  state_json: z.string(),
});

export const writeAppStateRequestSchema = z.object({
  state_key: z.string().min(1),
  state_json: z.string().min(1),
});

export const writeAppStateResponseSchema = z.object({
  updated_at_ms: z.number().int().positive(),
});

export const openExternalUrlRequestSchema = z.object({
  url: z.string().url(),
});

export const openExternalUrlResponseSchema = z.object({
  ok: z.boolean(),
});

export const subtitleEngineProviderSchema = z.enum(["cpu", "directml"]);

export const subtitleEngineSourceSchema = z.enum([
  "optional-component",
  "node-modules",
  "none",
]);

export const readSubtitleEngineStatusResponseSchema = z.object({
  installed: z.boolean(),
  loadable: z.boolean(),
  optional_component_installed: z.boolean(),
  source: subtitleEngineSourceSchema,
  module_root: z.string().min(1).nullable(),
  optional_component_root: z.string().min(1).nullable(),
  providers: z.object({
    cpu: z.boolean(),
    directml: z.boolean(),
  }),
  available_providers: z.array(subtitleEngineProviderSchema),
  message: z.string().nullable(),
  checked_at_ms: z.number().int().positive(),
});

export const subtitleRemoteModelArtifactSchema = z.object({
  relative_path: z.string().min(1),
  url: z.string().url(),
  size_bytes: nonNegativeIntSchema.optional(),
  sha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
});

export const subtitleRemoteModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).nullable(),
  language_codes: z.array(z.string().min(1)).min(1),
  size_bytes: nonNegativeIntSchema,
  version: z.string().min(1),
  artifacts: z.array(subtitleRemoteModelArtifactSchema).min(1),
});

export const listSubtitleRemoteModelsResponseSchema = z.object({
  models: z.array(subtitleRemoteModelSchema),
  generated_at_ms: z.number().int().positive(),
});

export const subtitleLocalModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  model_dir: z.string().min(1),
  installed_at_ms: z.number().int().positive().nullable(),
  size_bytes: nonNegativeIntSchema,
  source: z.enum(["downloaded", "manual"]),
});

export const listSubtitleLocalModelsRequestSchema = z.object({
  model_dir: z.string().min(1),
});

export const listSubtitleLocalModelsResponseSchema = z.object({
  model_dir: z.string().min(1),
  models: z.array(subtitleLocalModelSchema),
});

export const subtitleModelDownloadStatusSchema = z.enum([
  "queued",
  "downloading",
  "verifying",
  "completed",
  "failed",
  "cancelled",
]);

export const subtitleModelDownloadTaskSchema = z.object({
  download_id: z.string().min(1),
  model_id: z.string().min(1),
  status: subtitleModelDownloadStatusSchema,
  done_bytes: nonNegativeIntSchema,
  total_bytes: nonNegativeIntSchema,
  percent: z.number().min(0).max(100),
  speed_bps: z.number().min(0),
  eta_sec: z.number().min(0).nullable(),
  use_proxy: z.boolean(),
  proxy_url: z.string().min(1).nullable(),
  message: z.string().min(1).nullable(),
  started_at_ms: z.number().int().positive(),
  updated_at_ms: z.number().int().positive(),
  completed_at_ms: z.number().int().positive().nullable(),
});

export const startSubtitleModelDownloadRequestSchema = z.object({
  model_id: z.string().min(1),
  model_dir: z.string().min(1),
  use_proxy: z.boolean(),
  proxy_url: z.string().min(1).nullable(),
});

export const startSubtitleModelDownloadResponseSchema = z.object({
  task: subtitleModelDownloadTaskSchema,
});

export const cancelSubtitleModelDownloadRequestSchema = z.object({
  download_id: z.string().min(1),
});

export const cancelSubtitleModelDownloadResponseSchema = z.object({
  ok: z.boolean(),
});

export const readSubtitleModelDownloadsResponseSchema = z.object({
  tasks: z.array(subtitleModelDownloadTaskSchema),
});

export const clearSubtitleLocalModelRequestSchema = z.object({
  model_dir: z.string().min(1),
  model_id: z.string().min(1),
});

export const clearSubtitleLocalModelResponseSchema = z.object({
  ok: z.boolean(),
  removed_path: z.string().min(1).nullable(),
  message: z.string().min(1).nullable(),
});

export const subtitleSessionProviderPreferenceSchema = z.enum([
  "auto",
  "cpu",
  "directml",
]);

export const subtitleSessionProviderSchema = subtitleEngineProviderSchema;

export const subtitleCueSchema = z.object({
  id: z.string().min(1),
  start_sec: z.number().min(0),
  end_sec: z.number().min(0),
  text: z.string().min(1),
  lang: z.string().min(1).nullable(),
  speaker: z.number().int().min(0).nullable().optional(),
  line: z.enum(["A", "B"]).optional(),
  speaker_changed: z.boolean().optional(),
  speaker_similarity: z.number().min(-1).max(1).optional(),
});

export const subtitleSessionEventSchema = z.object({
  code: z.string().min(1),
  level: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  at_ms: z.number().int().positive(),
});

export const startSubtitleSessionRequestSchema = z.object({
  model_dir: z.string().min(1),
  model_id: z.string().min(1),
  provider_preference: subtitleSessionProviderPreferenceSchema,
  language: z.string().min(1).default("auto"),
  fallback_to_cpu: z.boolean().default(true),
  render_mode: z.enum(["simple", "advanced"]).default("advanced"),
  advanced_options: z
    .object({
      vad: z
        .object({
          preset: z
            .enum(["balanced", "conservative", "aggressive"])
            .default("balanced"),
          threshold: z.number().min(0.1).max(0.9).default(0.42),
          min_silence_sec: z.number().min(0.1).max(1.2).default(0.14),
          min_speech_sec: z.number().min(0.05).max(1).default(0.18),
          max_speech_sec: z.number().min(3).max(30).default(3),
        })
        .optional(),
      speaker: z
        .object({
          similarity_threshold: z.number().min(0.45).max(0.85).default(0.5),
        })
        .optional(),
    })
    .optional(),
});

export const startSubtitleSessionResponseSchema = z.object({
  session_id: z.string().min(1),
  provider: subtitleSessionProviderSchema,
  fallback_applied: z.boolean(),
  events: z.array(subtitleSessionEventSchema),
  started_at_ms: z.number().int().positive(),
});

export const stopSubtitleSessionRequestSchema = z.object({
  reason: z.string().min(1).optional(),
});

export const stopSubtitleSessionResponseSchema = z.object({
  session_id: z.string().min(1).nullable(),
  stopped: z.boolean(),
  updated_at_ms: z.number().int().positive(),
});

export const resetSubtitleSessionRequestSchema = z.object({
  timeline_sec: z.number().min(0).nullable().optional(),
});

export const resetSubtitleSessionResponseSchema = z.object({
  session_id: z.string().min(1).nullable(),
  ok: z.boolean(),
  events: z.array(subtitleSessionEventSchema),
  updated_at_ms: z.number().int().positive(),
});

export const flushSubtitleSessionResponseSchema = z.object({
  session_id: z.string().min(1).nullable(),
  cues: z.array(subtitleCueSchema),
  events: z.array(subtitleSessionEventSchema),
  updated_at_ms: z.number().int().positive(),
});

export const pushSubtitleAudioRequestSchema = z
  .object({
    chunk_base64: z.string().min(1),
    sample_rate_hz: z.number().int().min(8_000).max(96_000),
    chunk_start_sec: z.number().min(0),
    chunk_end_sec: z.number().min(0),
    channel_count: z.number().int().min(1).max(8).default(1),
    session_epoch: z.number().int().min(0).default(0),
    chunk_seq: z.number().int().min(0).default(0),
  })
  .refine((value) => value.chunk_end_sec >= value.chunk_start_sec, {
    message: "chunk_end_sec must be >= chunk_start_sec",
  });

export const pushSubtitleAudioResponseSchema = z.object({
  session_id: z.string().min(1).nullable(),
  accepted: z.boolean(),
  provider: subtitleSessionProviderSchema.nullable(),
  cues: z.array(subtitleCueSchema),
  events: z.array(subtitleSessionEventSchema),
  session_epoch: z.number().int().min(0).default(0),
  chunk_seq: z.number().int().min(0).default(0),
  queue_len: z.number().int().min(0).default(0),
  updated_at_ms: z.number().int().positive(),
});

export const startSubtitlePersistenceRequestSchema = z.object({
  video_path: z.string().min(1),
  language: z.string().min(1).default("auto"),
  reset_existing: z.boolean().default(true),
  valid_playback_rate_threshold: z
    .number()
    .min(0.1)
    .max(10)
    .optional()
    .default(1.0),
});

export const startSubtitlePersistenceResponseSchema = z.object({
  enabled: z.boolean(),
  subtitle_path: z.string().min(1).nullable(),
  cue_count: z.number().int().min(0).default(0),
  updated_at_ms: z.number().int().positive(),
});

export const appendSubtitlePersistenceRequestSchema = z.object({
  cues: z.array(subtitleCueSchema),
  session_epoch: z.number().int().min(0).default(0),
  chunk_seq: z.number().int().min(0).default(0),
  batch_start_sec: z.number().min(0).nullable().default(null),
  batch_end_sec: z.number().min(0).nullable().default(null),
  playback_rate: z.number().min(0.1).max(10).optional().default(1.0),
  enforce_valid_range_guard: z.boolean().optional().default(false),
  allow_first_overlap_replace_once: z.boolean().optional().default(false),
  seek_anchor_sec: z.number().min(0).nullable().optional().default(null),
  current_valid_range: z
    .object({
      start_sec: z.number().min(0),
      end_sec: z.number().min(0),
    })
    .nullable()
    .optional()
    .default(null),
});

export const appendSubtitlePersistenceResponseSchema = z.object({
  accepted: z.boolean(),
  subtitle_path: z.string().min(1).nullable(),
  cue_count: z.number().int().min(0).default(0),
  accepted_cue_count: z.number().int().min(0).default(0),
  skipped_inner_cue_count: z.number().int().min(0).default(0),
  replaced_cue_count: z.number().int().min(0).default(0),
  updated_at_ms: z.number().int().positive(),
});

export const readSubtitlePersistenceWindowRequestSchema = z.object({
  timeline_sec: z.number().min(0),
  backtrack_sec: z.number().min(0).max(30).default(1),
  lookahead_sec: z.number().min(0).max(30).default(3),
  limit: z.number().int().min(1).max(200).default(24),
  prefer_persisted_file: z.boolean().optional().default(false),
});

export const subtitleGeneratedRangeSchema = z.object({
  start_sec: z.number().min(0),
  end_sec: z.number().min(0),
});

export const readSubtitlePersistenceWindowResponseSchema = z.object({
  subtitle_path: z.string().min(1).nullable(),
  cues: z.array(subtitleCueSchema),
  generated_ranges: z.array(subtitleGeneratedRangeSchema),
  timeline_in_generated_range: z.boolean().default(false),
  timeline_has_cue: z.boolean().default(false),
  generated_start_sec: z.number().min(0).nullable(),
  generated_end_sec: z.number().min(0).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const runtimeCapabilityStatusSchema = z.enum([
  "available",
  "degraded",
  "unavailable",
]);

export const runtimeCapabilityMatrixItemSchema = z.object({
  capability: z.string().min(1),
  status: runtimeCapabilityStatusSchema,
  note: z.string().min(1),
});

export const readRuntimeCapabilitiesResponseSchema = z.object({
  dependencies: z.object({
    sharp: z.boolean(),
    ffmpeg: z.boolean(),
    ffprobe: z.boolean(),
    seven_zip: z.boolean(),
    powershell: z.boolean(),
  }),
  strategies: z.object({
    thumbnail: z.enum(["sharp-webp-cache", "original-fallback"]),
    video_probe: z.enum(["ffprobe", "metadata-fallback"]),
    video_cover: z.enum(["ffmpeg", "color-only-fallback"]),
    archive_rar_7z: z.enum(["normalize-to-zip-store", "skip-unsupported"]),
    archive_zip_repack: z.enum(["repack-webp-store", "safe-entry-fallback"]),
  }),
  minimum_matrix: z.array(runtimeCapabilityMatrixItemSchema),
  generated_at_ms: z.number().int().positive(),
});

export const runtimeMediaCapabilityHintSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  content_type: z.string().min(1),
});

export const audioEngineModeSchema = z.enum(["chromium", "mpv"]);
export const audioGaplessModeSchema = z.enum(["no", "weak", "yes"]);
export const audioReplayGainModeSchema = z.enum(["off", "track", "album"]);

export const audioOutputDeviceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  is_default: z.boolean().default(false),
});

export const readAudioEngineStateResponseSchema = z.object({
  mode: audioEngineModeSchema,
  desired_mode: audioEngineModeSchema,
  mpv_available: z.boolean(),
  mpv_bin_path: z.string().min(1).nullable(),
  using_fallback: z.boolean(),
  last_error: z.string().nullable(),
  active_device_id: z.string().min(1).nullable(),
  exclusive_enabled: z.boolean(),
  gapless_mode: audioGaplessModeSchema,
  replaygain_mode: audioReplayGainModeSchema,
  updated_at_ms: z.number().int().positive(),
});

export const setAudioEngineModeRequestSchema = z.object({
  mode: audioEngineModeSchema,
});

export const setAudioEngineModeResponseSchema =
  readAudioEngineStateResponseSchema;

export const verifyAudioEngineMpvBinRequestSchema = z.object({
  directory_path: z.string().min(1),
});

export const verifyAudioEngineMpvBinResponseSchema = z.object({
  ok: z.boolean(),
  env_key: z.literal("MPX_MPV_BIN"),
  mpv_bin_path: z.string().min(1).nullable(),
  message: z.string().nullable(),
  state: readAudioEngineStateResponseSchema,
});

export const verifyAudioTranscodeFfmpegBinRequestSchema = z.object({
  directory_path: z.string().min(1),
});

export const verifyAudioTranscodeFfmpegBinResponseSchema = z.object({
  ok: z.boolean(),
  ffmpeg_env_key: z.literal("MPX_FFMPEG_BIN"),
  ffprobe_env_key: z.literal("MPX_FFPROBE_BIN"),
  ffmpeg_bin_path: z.string().min(1).nullable(),
  ffprobe_bin_path: z.string().min(1).nullable(),
  message: z.string().nullable(),
  capabilities: readAudioTranscodeCapabilitiesResponseSchema,
});

export const listAudioOutputDevicesResponseSchema = z.object({
  devices: z.array(audioOutputDeviceSchema),
  active_device_id: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const setAudioOutputDeviceRequestSchema = z.object({
  device_id: z.string().min(1),
});

export const setAudioOutputDeviceResponseSchema = z.object({
  ok: z.boolean(),
  active_device_id: z.string().min(1).nullable(),
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const setAudioExclusiveRequestSchema = z.object({
  enabled: z.boolean(),
});

export const setAudioExclusiveResponseSchema = z.object({
  ok: z.boolean(),
  enabled: z.boolean(),
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const setAudioGaplessModeRequestSchema = z.object({
  mode: audioGaplessModeSchema,
});

export const setAudioGaplessModeResponseSchema = z.object({
  ok: z.boolean(),
  mode: audioGaplessModeSchema,
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const setAudioReplayGainModeRequestSchema = z.object({
  mode: audioReplayGainModeSchema,
});

export const setAudioReplayGainModeResponseSchema = z.object({
  ok: z.boolean(),
  mode: audioReplayGainModeSchema,
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const audioEngineActionResponseSchema = z.object({
  ok: z.boolean(),
  mode: audioEngineModeSchema,
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const readAudioEnginePlaybackStatusResponseSchema = z.object({
  ok: z.boolean(),
  mode: audioEngineModeSchema,
  loaded: z.boolean(),
  paused: z.boolean().nullable(),
  time_sec: z.number().min(0).nullable(),
  duration_sec: z.number().min(0).nullable(),
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const readAudioEngineAnalysisFrameResponseSchema = z.object({
  ok: z.boolean(),
  mode: audioEngineModeSchema,
  loaded: z.boolean(),
  audio_level: z.number().min(0).max(1),
  audio_beat: z.number().min(0).max(1),
  frequency_bins: z.array(z.number().int().min(0).max(255)),
  waveform_bins: z.array(z.number().int().min(0).max(255)),
  message: z.string().nullable(),
  updated_at_ms: z.number().int().positive(),
});

export const audioEngineLoadTrackRequestSchema = z.object({
  file_path: z.string().min(1),
  start_sec: z.number().min(0).nullable().optional(),
  end_sec: z.number().min(0).nullable().optional(),
});

export const audioEngineSetPausedRequestSchema = z.object({
  paused: z.boolean(),
});

export const audioEngineSeekToRequestSchema = z.object({
  time_sec: z.number().min(0),
});

export const audioEngineSetVolumeRequestSchema = z.object({
  volume: z.number().min(0).max(100),
});

export const readRuntimeInfoResponseSchema = z.object({
  app_version: z.string().min(1),
  is_packaged: z.boolean(),
  platform: z.string().min(1),
  arch: z.string().min(1),
  user_data_path: z.string().min(1),
  library_root: z.string().min(1),
  database_path: z.string().min(1),
  thumbnail_cache_path: z.string().min(1),
  hardware_acceleration_enabled: z.boolean().optional(),
  gpu_feature_status: z.record(z.string(), z.string()).optional(),
  gpu_info_basic: z.record(z.string(), z.unknown()).optional(),
  media_capability_hints: z.array(runtimeMediaCapabilityHintSchema).optional(),
});

export const setRuntimeStoragePathsRequestSchema = z
  .object({
    database_dir: z.string().min(1).optional(),
    thumbnail_cache_dir: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.database_dir || value.thumbnail_cache_dir), {
    message: "database_dir / thumbnail_cache_dir 至少提供一个",
  });

export const setRuntimeStoragePathsResponseSchema = z.object({
  database_path: z.string().min(1),
  thumbnail_cache_path: z.string().min(1),
  moved_database: z.boolean(),
  updated_at_ms: z.number().int().positive(),
});

export const mediaAccessAuditResponseSchema = z.object({
  resolve_requests: nonNegativeIntSchema,
  resolve_granted: nonNegativeIntSchema,
  resolve_denied_total: nonNegativeIntSchema,
  resolve_denied_by_reason: z.record(z.string(), nonNegativeIntSchema),
  token_reads: nonNegativeIntSchema,
  token_hits: nonNegativeIntSchema,
  token_misses: nonNegativeIntSchema,
  token_expired: nonNegativeIntSchema,
  token_cleanup_removed: nonNegativeIntSchema,
  token_active: nonNegativeIntSchema,
  generated_at_ms: z.number().int().positive(),
});

export const requestExternalSourceFolderRefreshRequestSchema = z.object({
  path_key: z.string().min(1).max(8192),
});

export const requestExternalSourceFolderRefreshResponseSchema = z.object({
  matched_directory_root: z.string().min(1).nullable(),
  pruned_source_count: nonNegativeIntSchema,
  pruned_video_count: nonNegativeIntSchema,
  pruned_audio_count: nonNegativeIntSchema,
  removed_import_source_count: nonNegativeIntSchema,
  updated_at_ms: z.number().int().positive(),
});

export const setExternalSourceWatcherEnabledRequestSchema = z.object({
  enabled: z.boolean(),
});

export const setExternalSourceWatcherEnabledResponseSchema = z.object({
  enabled: z.boolean(),
  updated_at_ms: z.number().int().positive(),
});
