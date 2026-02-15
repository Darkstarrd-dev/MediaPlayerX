import { z } from 'zod'

const nonNegativeIntSchema = z.number().int().nonnegative()

export const browserModeDtoSchema = z.enum(['image', 'video', 'music'])

export const featureFilterDtoSchema = z.object({
  name_query: z.string(),
  work_title_query: z.string(),
  series_id_query: z.string(),
  circle_query: z.string(),
  author_query: z.string(),
  tags: z.array(z.string()),
  grade: z.number().int().min(0).max(5).nullable(),
})

export const mediaLocatorDtoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('filesystem'),
    absolute_path: z.string().min(1),
    extension: z.string().min(1),
    media_type: z.enum(['image', 'video', 'audio', 'subtitle']),
    mime_type: z.string().min(1),
  }),
  z.object({
    kind: z.literal('archive-entry'),
    archive_path: z.string().min(1),
    archive_format: z.enum(['zip', 'rar', '7z']),
    entry_name: z.string().min(1),
    extension: z.string().min(1),
    media_type: z.enum(['image', 'video', 'audio', 'subtitle']),
    mime_type: z.string().min(1),
  }),
])

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
})

export const imageSourceExternalMetadataDtoSchema = z.object({
  source_site: z.enum(['nhentai', 'ehentai', 'others']),
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
})

export const imageSourceCoverDtoSchema = z.object({
  cover_color: z.string().min(1),
  cover_image_path: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
})

export const imagePackageDtoSchema = z.object({
  id: z.string().min(1),
  package_name: z.string().min(1),
  display_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  work_title: z.string().min(1),
  series_id: z.string().default(''),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  mock_grade: z.number().int().min(0).max(5).nullable(),
  external_metadata: imageSourceExternalMetadataDtoSchema.nullable().optional(),
  source_cover: imageSourceCoverDtoSchema.nullable().optional(),
  images: z.array(imageItemDtoSchema),
})

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
  work_title_jpn: z.string().default(''),
  series_id: z.string().default(''),
  circle: z.string().min(1),
  circle_jpn: z.string().default(''),
  author: z.string().min(1),
  author_jpn: z.string().default(''),
  tags: z.array(z.string()),
  grade: z.number().int().min(0).max(5).nullable().optional(),
  media_locator: mediaLocatorDtoSchema,
})

export const audioItemDtoSchema = z.object({
  id: z.string().min(1),
  file_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  duration_sec: nonNegativeIntSchema,
  size_mb: nonNegativeIntSchema,
  album: z.string().default(''),
  author: z.string().default(''),
  track_title: z.string().default(''),
  series_id: z.string().default(''),
  media_locator: mediaLocatorDtoSchema,
})

export const focusedImageRefDtoSchema = z.object({
  package_id: z.string().min(1),
  image_index: nonNegativeIntSchema,
})

export const sidebarNodeDtoSchema: z.ZodType<{
  id: string
  label: string
  kind: 'folder' | 'package' | 'video' | 'audio'
  image_node_type?: 'folder' | 'package' | 'directory'
  children: Array<unknown>
  package_id?: string
  video_id?: string
  audio_id?: string
  image_source_id?: string
  direct_image_count?: number
  descendant_package_count?: number
  descendant_image_count?: number
  descendant_node_count?: number
  path_key: string
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(['folder', 'package', 'video', 'audio']),
    image_node_type: z.enum(['folder', 'package', 'directory']).optional(),
    children: z.array(sidebarNodeDtoSchema),
    package_id: z.string().min(1).optional(),
    video_id: z.string().min(1).optional(),
    audio_id: z.string().min(1).optional(),
    image_source_id: z.string().min(1).optional(),
    direct_image_count: nonNegativeIntSchema.optional(),
    descendant_package_count: nonNegativeIntSchema.optional(),
    descendant_image_count: nonNegativeIntSchema.optional(),
    descendant_node_count: nonNegativeIntSchema.optional(),
    path_key: z.string().min(1),
  }),
)

export const librarySnapshotDtoSchema = z.object({
  image_packages: z.array(imagePackageDtoSchema),
  image_directories: z.array(imagePackageDtoSchema),
  videos: z.array(videoItemDtoSchema),
  audios: z.array(audioItemDtoSchema).optional(),
})

export const gradeOverrideMapSchema = z.record(z.string(), z.number().int().min(0).max(5).nullable())

export const readImageSidebarTreeRequestSchema = z.object({
  feature_filter: featureFilterDtoSchema,
  grade_overrides: gradeOverrideMapSchema.optional(),
  include_hidden: z.boolean().optional(),
})

export const readImageSidebarTreeResponseSchema = z.object({
  image_packages: z.array(imagePackageDtoSchema),
  image_directories: z.array(imagePackageDtoSchema),
  tree: z.array(sidebarNodeDtoSchema),
})

export const readImagePageRequestSchema = z.object({
  source_id: z.string().min(1).nullable(),
  page_index: nonNegativeIntSchema,
  page_size: z.number().int().positive(),
  show_names_only: z.boolean(),
  include_hidden: z.boolean().optional(),
  feature_filter: featureFilterDtoSchema,
  grade_overrides: gradeOverrideMapSchema.optional(),
})

export const readImagePageResponseSchema = z.object({
  source_id: z.string().min(1).nullable(),
  total_items: nonNegativeIntSchema,
  page_index: nonNegativeIntSchema,
  page_size: z.number().int().positive(),
  refs: z.array(focusedImageRefDtoSchema),
})

export const readImageMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  image_index: nonNegativeIntSchema,
  include_hidden: z.boolean().optional(),
})

export const readImageMetadataResponseSchema = z
  .object({
    package: imagePackageDtoSchema,
    image: imageItemDtoSchema,
    grade: z.number().int().min(0).max(5).nullable(),
  })
  .nullable()

export const resolveMediaResourceRequestSchema = z.object({
  locator: mediaLocatorDtoSchema,
  preferred_variant: z.enum(['original', 'thumbnail']).optional(),
  thumbnail: z
    .object({
      max_edge: z.number().int().min(64).max(2048).optional(),
      quality: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
})

export const resolveMediaResourceResponseSchema = z.object({
  resource_url: z.string().min(1),
  mime_type: z.string().min(1),
  expires_at_ms: z.number().int().positive(),
})

export const writePackageGradeRequestSchema = z.object({
  package_id: z.string().min(1),
  grade: z.number().int().min(0).max(5).nullable(),
})

export const writePackageGradeResponseSchema = z.object({
  package_id: z.string().min(1),
  grade: z.number().int().min(0).max(5).nullable(),
  updated_at_ms: z.number().int().positive(),
})

export const setImageHiddenRequestSchema = z.object({
  image_ids: z.array(z.string().min(1)).min(1),
  hidden: z.boolean(),
})

export const setImageHiddenResponseSchema = z.object({
  updated_count: nonNegativeIntSchema,
  updated_at_ms: z.number().int().positive(),
})

export const deleteImageItemsRequestSchema = z.object({
  image_ids: z.array(z.string().min(1)).min(1),
})

export const deleteImageItemsResponseSchema = z.object({
  deleted_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      image_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
})

export const deleteSidebarNodesRequestSchema = z.object({
  node_ids: z.array(z.string().min(1)).min(1),
})

export const deleteSidebarNodesResponseSchema = z.object({
  deleted_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      node_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
})

export const manageAdReviewSelectionScopeSchema = z.enum(['image', 'sidebar'])

export const manageAdReviewDecisionSourceSchema = z.enum(['known-hash', 'llm'])

export const manageAdReviewImageSourceSchema = z.enum([
  'known-hash',
  'llm',
  'llm-error',
  'strategy-skip',
])

export const manageAdReviewTaskStatusSchema = z.enum(['pending', 'running', 'paused', 'review', 'failed'])

export const manageAdReviewAllStrategySchema = z.object({
  mode: z.literal('all'),
})

export const manageAdReviewHeadTailStrategySchema = z.object({
  mode: z.literal('head-tail'),
  head_n: nonNegativeIntSchema,
  tail_n: nonNegativeIntSchema,
  tail_stop_clean_streak: z.number().int().min(1).max(200),
})

export const manageAdReviewStrategySchema = z.discriminatedUnion('mode', [
  manageAdReviewAllStrategySchema,
  manageAdReviewHeadTailStrategySchema,
])

export const manageAdReviewTaskExecutionSchema = z.object({
  strategy: manageAdReviewStrategySchema,
  max_concurrency: z.number().int().min(4).max(12),
})

export const manageAdReviewSourceDistributionSchema = z.object({
  known_hash: nonNegativeIntSchema,
  llm_suspected: nonNegativeIntSchema,
  llm_clean: nonNegativeIntSchema,
  llm_failed: nonNegativeIntSchema,
  strategy_skipped: nonNegativeIntSchema,
})

export const manageAdReviewTaskAuditSchema = z.object({
  source_distribution: manageAdReviewSourceDistributionSchema,
  llm_hit_rate: z.number().min(0).max(1),
  overall_hit_rate: z.number().min(0).max(1),
})

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
})

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
})

export const startManageAdReviewRequestSchema = z.object({
  selection_scope: manageAdReviewSelectionScopeSchema,
  image_ids: z.array(z.string().min(1)).optional(),
  node_ids: z.array(z.string().min(1)).optional(),
  llm_endpoint: z.string().min(1),
  llm_model: z.string().min(1),
  strategy: manageAdReviewStrategySchema.optional(),
  max_concurrency: z.number().int().min(4).max(12).optional(),
})

export const startManageAdReviewResponseSchema = z.object({
  task: manageAdReviewTaskSchema,
})

export const readManageAdReviewTaskRequestSchema = z.object({
  task_id: z.string().min(1),
})

export const readManageAdReviewTaskResponseSchema = z.object({
  task: manageAdReviewTaskSchema.nullable(),
})

export const pauseManageAdReviewTaskRequestSchema = z.object({
  task_id: z.string().min(1),
})

export const pauseManageAdReviewTaskResponseSchema = z.object({
  task: manageAdReviewTaskSchema,
})

export const testAdReviewVisionModelRequestSchema = z.object({
  llm_endpoint: z.string().min(1),
  llm_model: z.string().min(1),
  image_base64: z.string().min(1),
  timeout_ms: z.number().int().min(1_000).max(60_000).optional(),
})

export const testAdReviewVisionModelResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().min(1),
})

export const confirmManageAdReviewDeleteRequestSchema = z.object({
  task_id: z.string().min(1),
  image_ids: z.array(z.string().min(1)).min(1),
})

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
})

export const writePackageMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  work_title: z.string().min(1),
  series_id: z.string().optional(),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  sync_work_title_to_package_name: z.boolean().optional(),
})

export const searchExternalMetadataRequestSchema = z.object({
  input_text: z.string().optional(),
  input_id: z.string().optional(),
  source: z.enum(['nhentai', 'ehentai']).optional(),
  proxy_server: z.string().optional(),
  ehentai_cookies: z.string().optional(),
})

export const searchExternalMetadataDebugStepSchema = z.object({
  at_ms: z.number().int().nonnegative(),
  stage: z.string().min(1),
  message: z.string().min(1),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
})

export const searchExternalMetadataDebugSchema = z.object({
  source: z.enum(['nhentai', 'ehentai']),
  started_at_ms: z.number().int().nonnegative(),
  finished_at_ms: z.number().int().nonnegative(),
  success: z.boolean(),
  result_count: nonNegativeIntSchema,
  error_message: z.string().min(1).optional(),
  steps: z.array(searchExternalMetadataDebugStepSchema),
})

export const externalMetadataResultItemSchema = z.object({
  source: z.enum(['nhentai', 'ehentai']),
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
})

export const searchExternalMetadataResponseSchema = z.object({
  items: z.array(externalMetadataResultItemSchema),
  debug: searchExternalMetadataDebugSchema.optional(),
})

export const writePackageMetadataResponseSchema = z.object({
  package: imagePackageDtoSchema,
  updated_at_ms: z.number().int().positive(),
})

export const writePackageExternalMetadataRequestSchema = z.object({
  package_id: z.string().min(1),
  source_site: z.enum(['nhentai', 'ehentai', 'others']),
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
})

export const writePackageExternalMetadataResponseSchema = z.object({
  package: imagePackageDtoSchema,
  updated_at_ms: z.number().int().positive(),
})

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
})

export const writeVideoMetadataResponseSchema = z.object({
  video: videoItemDtoSchema,
  updated_at_ms: z.number().int().positive(),
})

export const writeAudioMetadataRequestSchema = z.object({
  audio_id: z.string().min(1),
  album: z.string().optional(),
  author: z.string().optional(),
  track_title: z.string().optional(),
  series_id: z.string().optional(),
})

export const writeAudioMetadataResponseSchema = z.object({
  audio: audioItemDtoSchema,
  updated_at_ms: z.number().int().positive(),
})

export const saveVideoCoverRequestSchema = z.object({
  video_id: z.string().min(1),
  time_sec: z.number().nonnegative(),
  fallback_color: z.string().min(1).optional(),
})

export const saveVideoCoverResponseSchema = z.object({
  video_id: z.string().min(1),
  cover_color: z.string().min(1),
  cover_image_path: z.string().min(1).nullable(),
  updated_at_ms: z.number().int().positive(),
})

export const readPlaylistResponseSchema = z.object({
  video_ids: z.array(z.string().min(1)),
})

export const subtitleFormatDtoSchema = z.enum(['vtt', 'srt', 'ass', 'ssa'])

export const subtitleSourceDtoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source: z.enum(['external']),
  format: subtitleFormatDtoSchema,
  locator: mediaLocatorDtoSchema,
})

export const listVideoSubtitlesRequestSchema = z.object({
  video_id: z.string().min(1),
})

export const listVideoSubtitlesResponseSchema = z.object({
  subtitles: z.array(subtitleSourceDtoSchema),
  ffmpeg_available: z.boolean(),
})

export const prepareSubtitleTrackRequestSchema = z.object({
  subtitle_id: z.string().min(1),
  locator: mediaLocatorDtoSchema,
  format: subtitleFormatDtoSchema,
})

export const prepareSubtitleTrackResponseSchema = z.object({
  locator: mediaLocatorDtoSchema,
  converted: z.boolean(),
})

export const writePlaylistRequestSchema = z.object({
  video_ids: z.array(z.string().min(1)),
})

export const writePlaylistResponseSchema = z.object({
  video_ids: z.array(z.string().min(1)),
  updated_at_ms: z.number().int().positive(),
})

export const importTaskStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])

export const importTaskSourceSchema = z.enum([
  'dialog-files',
  'dialog-folders',
  'drag-drop',
  'paste',
  'dialog-files-music',
  'dialog-folders-music',
  'drag-drop-music',
  'paste-music',
])

export const importTaskDtoSchema = z.object({
  task_id: z.string().min(1),
  task_type: z.literal('import'),
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
})

export const enqueueImportTaskRequestSchema = z.object({
  source: importTaskSourceSchema,
  paths: z.array(z.string().min(1)).min(1),
})

export const enqueueImportTaskResponseSchema = z.object({
  task: importTaskDtoSchema,
})

export const readImportTasksResponseSchema = z.object({
  tasks: z.array(importTaskDtoSchema),
})

export const retryImportTaskRequestSchema = z.object({
  task_id: z.string().min(1),
})

export const retryImportTaskResponseSchema = z.object({
  task: importTaskDtoSchema,
})

export const pickImportPathsRequestSchema = z.object({
  mode: z.enum(['files', 'folders']),
  target_mode: z.enum(['image', 'video', 'music']).optional(),
})

export const pickImportPathsResponseSchema = z.object({
  paths: z.array(z.string().min(1)),
})

export const fileDialogFilterSchema = z.object({
  name: z.string().min(1),
  extensions: z.array(z.string().min(1)).min(1),
})

export const pickFilePathRequestSchema = z.object({
  title: z.string().min(1).optional(),
  default_path: z.string().min(1).optional(),
  filters: z.array(fileDialogFilterSchema).optional(),
})

export const pickFilePathResponseSchema = z.object({
  canceled: z.boolean(),
  path: z.string().min(1).nullable(),
})

export const pickDirectoryPathRequestSchema = z.object({
  title: z.string().min(1).optional(),
  default_path: z.string().min(1).optional(),
})

export const pickDirectoryPathResponseSchema = z.object({
  canceled: z.boolean(),
  path: z.string().min(1).nullable(),
})

export const readClipboardImportPathsResponseSchema = z.object({
  paths: z.array(z.string().min(1)),
})

export const clearDatabaseResponseSchema = z.object({
  cleared: z.boolean(),
  cleared_at_ms: z.number().int().positive(),
})

export const readArchiveLoadStatusResponseSchema = z.object({
  running_archive_path: z.string().min(1).nullable(),
  pending_archive_paths: z.array(z.string().min(1)),
  updated_at_ms: z.number().int().positive(),
})

export const readAppStateRequestSchema = z.object({
  state_key: z.string().min(1),
  fallback_json: z.string().optional(),
})

export const readAppStateResponseSchema = z.object({
  state_json: z.string(),
})

export const writeAppStateRequestSchema = z.object({
  state_key: z.string().min(1),
  state_json: z.string().min(1),
})

export const writeAppStateResponseSchema = z.object({
  updated_at_ms: z.number().int().positive(),
})

export const openExternalUrlRequestSchema = z.object({
  url: z.string().url(),
})

export const openExternalUrlResponseSchema = z.object({
  ok: z.boolean(),
})

export const runtimeCapabilityStatusSchema = z.enum(['available', 'degraded', 'unavailable'])

export const runtimeCapabilityMatrixItemSchema = z.object({
  capability: z.string().min(1),
  status: runtimeCapabilityStatusSchema,
  note: z.string().min(1),
})

export const readRuntimeCapabilitiesResponseSchema = z.object({
  dependencies: z.object({
    sharp: z.boolean(),
    ffmpeg: z.boolean(),
    ffprobe: z.boolean(),
    seven_zip: z.boolean(),
    powershell: z.boolean(),
  }),
  strategies: z.object({
    thumbnail: z.enum(['sharp-webp-cache', 'original-fallback']),
    video_probe: z.enum(['ffprobe', 'metadata-fallback']),
    video_cover: z.enum(['ffmpeg', 'color-only-fallback']),
    archive_rar_7z: z.enum(['normalize-to-zip-store', 'skip-unsupported']),
    archive_zip_repack: z.enum(['repack-webp-store', 'safe-entry-fallback']),
  }),
  minimum_matrix: z.array(runtimeCapabilityMatrixItemSchema),
  generated_at_ms: z.number().int().positive(),
})

export const readRuntimeInfoResponseSchema = z.object({
  app_version: z.string().min(1),
  is_packaged: z.boolean(),
  platform: z.string().min(1),
  arch: z.string().min(1),
  user_data_path: z.string().min(1),
  library_root: z.string().min(1),
  database_path: z.string().min(1),
  thumbnail_cache_path: z.string().min(1),
})

export const setRuntimeStoragePathsRequestSchema = z
  .object({
    database_dir: z.string().min(1).optional(),
    thumbnail_cache_dir: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.database_dir || value.thumbnail_cache_dir), {
    message: 'database_dir / thumbnail_cache_dir 至少提供一个',
  })

export const setRuntimeStoragePathsResponseSchema = z.object({
  database_path: z.string().min(1),
  thumbnail_cache_path: z.string().min(1),
  moved_database: z.boolean(),
  updated_at_ms: z.number().int().positive(),
})

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
})

export type FeatureFilterDto = z.infer<typeof featureFilterDtoSchema>
export type MediaLocatorDto = z.infer<typeof mediaLocatorDtoSchema>
export type ImageItemDto = z.infer<typeof imageItemDtoSchema>
export type ImagePackageDto = z.infer<typeof imagePackageDtoSchema>
export type VideoItemDto = z.infer<typeof videoItemDtoSchema>
export type AudioItemDto = z.infer<typeof audioItemDtoSchema>
export type FocusedImageRefDto = z.infer<typeof focusedImageRefDtoSchema>
export type SidebarNodeDto = z.infer<typeof sidebarNodeDtoSchema>
export type LibrarySnapshotDto = z.infer<typeof librarySnapshotDtoSchema>
export type ReadImageSidebarTreeRequestDto = z.infer<typeof readImageSidebarTreeRequestSchema>
export type ReadImageSidebarTreeResponseDto = z.infer<typeof readImageSidebarTreeResponseSchema>
export type ReadImagePageRequestDto = z.infer<typeof readImagePageRequestSchema>
export type ReadImagePageResponseDto = z.infer<typeof readImagePageResponseSchema>
export type ReadImageMetadataRequestDto = z.infer<typeof readImageMetadataRequestSchema>
export type ReadImageMetadataResponseDto = z.infer<typeof readImageMetadataResponseSchema>
export type ResolveMediaResourceRequestDto = z.infer<typeof resolveMediaResourceRequestSchema>
export type ResolveMediaResourceResponseDto = z.infer<typeof resolveMediaResourceResponseSchema>
export type WritePackageGradeRequestDto = z.infer<typeof writePackageGradeRequestSchema>
export type WritePackageGradeResponseDto = z.infer<typeof writePackageGradeResponseSchema>
export type SetImageHiddenRequestDto = z.infer<typeof setImageHiddenRequestSchema>
export type SetImageHiddenResponseDto = z.infer<typeof setImageHiddenResponseSchema>
export type DeleteImageItemsRequestDto = z.infer<typeof deleteImageItemsRequestSchema>
export type DeleteImageItemsResponseDto = z.infer<typeof deleteImageItemsResponseSchema>
export type DeleteSidebarNodesRequestDto = z.infer<typeof deleteSidebarNodesRequestSchema>
export type DeleteSidebarNodesResponseDto = z.infer<typeof deleteSidebarNodesResponseSchema>
export type ManageAdReviewSelectionScopeDto = z.infer<typeof manageAdReviewSelectionScopeSchema>
export type ManageAdReviewDecisionSourceDto = z.infer<typeof manageAdReviewDecisionSourceSchema>
export type ManageAdReviewImageSourceDto = z.infer<typeof manageAdReviewImageSourceSchema>
export type ManageAdReviewTaskStatusDto = z.infer<typeof manageAdReviewTaskStatusSchema>
export type ManageAdReviewAllStrategyDto = z.infer<typeof manageAdReviewAllStrategySchema>
export type ManageAdReviewHeadTailStrategyDto = z.infer<typeof manageAdReviewHeadTailStrategySchema>
export type ManageAdReviewStrategyDto = z.infer<typeof manageAdReviewStrategySchema>
export type ManageAdReviewTaskExecutionDto = z.infer<typeof manageAdReviewTaskExecutionSchema>
export type ManageAdReviewSourceDistributionDto = z.infer<typeof manageAdReviewSourceDistributionSchema>
export type ManageAdReviewTaskAuditDto = z.infer<typeof manageAdReviewTaskAuditSchema>
export type ManageAdReviewCandidateDto = z.infer<typeof manageAdReviewCandidateSchema>
export type ManageAdReviewTaskDto = z.infer<typeof manageAdReviewTaskSchema>
export type StartManageAdReviewRequestDto = z.infer<typeof startManageAdReviewRequestSchema>
export type StartManageAdReviewResponseDto = z.infer<typeof startManageAdReviewResponseSchema>
export type ReadManageAdReviewTaskRequestDto = z.infer<typeof readManageAdReviewTaskRequestSchema>
export type ReadManageAdReviewTaskResponseDto = z.infer<typeof readManageAdReviewTaskResponseSchema>
export type PauseManageAdReviewTaskRequestDto = z.infer<typeof pauseManageAdReviewTaskRequestSchema>
export type PauseManageAdReviewTaskResponseDto = z.infer<typeof pauseManageAdReviewTaskResponseSchema>
export type TestAdReviewVisionModelRequestDto = z.infer<typeof testAdReviewVisionModelRequestSchema>
export type TestAdReviewVisionModelResponseDto = z.infer<typeof testAdReviewVisionModelResponseSchema>
export type ConfirmManageAdReviewDeleteRequestDto = z.infer<typeof confirmManageAdReviewDeleteRequestSchema>
export type ConfirmManageAdReviewDeleteResponseDto = z.infer<typeof confirmManageAdReviewDeleteResponseSchema>
export type WritePackageMetadataRequestDto = z.infer<typeof writePackageMetadataRequestSchema>
export type WritePackageMetadataResponseDto = z.infer<typeof writePackageMetadataResponseSchema>
export type WritePackageExternalMetadataRequestDto = z.infer<typeof writePackageExternalMetadataRequestSchema>
export type WritePackageExternalMetadataResponseDto = z.infer<typeof writePackageExternalMetadataResponseSchema>
export type SearchExternalMetadataRequestDto = z.infer<typeof searchExternalMetadataRequestSchema>
export type ExternalMetadataResultItemDto = z.infer<typeof externalMetadataResultItemSchema>
export type SearchExternalMetadataDebugStepDto = z.infer<typeof searchExternalMetadataDebugStepSchema>
export type SearchExternalMetadataDebugDto = z.infer<typeof searchExternalMetadataDebugSchema>
export type SearchExternalMetadataResponseDto = z.infer<typeof searchExternalMetadataResponseSchema>
export type WriteVideoMetadataRequestDto = z.infer<typeof writeVideoMetadataRequestSchema>
export type WriteVideoMetadataResponseDto = z.infer<typeof writeVideoMetadataResponseSchema>
export type WriteAudioMetadataRequestDto = z.infer<typeof writeAudioMetadataRequestSchema>
export type WriteAudioMetadataResponseDto = z.infer<typeof writeAudioMetadataResponseSchema>
export type SaveVideoCoverRequestDto = z.infer<typeof saveVideoCoverRequestSchema>
export type SaveVideoCoverResponseDto = z.infer<typeof saveVideoCoverResponseSchema>
export type ReadPlaylistResponseDto = z.infer<typeof readPlaylistResponseSchema>
export type SubtitleFormatDto = z.infer<typeof subtitleFormatDtoSchema>
export type SubtitleSourceDto = z.infer<typeof subtitleSourceDtoSchema>
export type ListVideoSubtitlesRequestDto = z.infer<typeof listVideoSubtitlesRequestSchema>
export type ListVideoSubtitlesResponseDto = z.infer<typeof listVideoSubtitlesResponseSchema>
export type PrepareSubtitleTrackRequestDto = z.infer<typeof prepareSubtitleTrackRequestSchema>
export type PrepareSubtitleTrackResponseDto = z.infer<typeof prepareSubtitleTrackResponseSchema>
export type WritePlaylistRequestDto = z.infer<typeof writePlaylistRequestSchema>
export type WritePlaylistResponseDto = z.infer<typeof writePlaylistResponseSchema>
export type ImportTaskStatusDto = z.infer<typeof importTaskStatusSchema>
export type ImportTaskSourceDto = z.infer<typeof importTaskSourceSchema>
export type ImportTaskDto = z.infer<typeof importTaskDtoSchema>
export type EnqueueImportTaskRequestDto = z.infer<typeof enqueueImportTaskRequestSchema>
export type EnqueueImportTaskResponseDto = z.infer<typeof enqueueImportTaskResponseSchema>
export type ReadImportTasksResponseDto = z.infer<typeof readImportTasksResponseSchema>
export type RetryImportTaskRequestDto = z.infer<typeof retryImportTaskRequestSchema>
export type RetryImportTaskResponseDto = z.infer<typeof retryImportTaskResponseSchema>
export type PickImportPathsRequestDto = z.infer<typeof pickImportPathsRequestSchema>
export type PickImportPathsResponseDto = z.infer<typeof pickImportPathsResponseSchema>
export type FileDialogFilterDto = z.infer<typeof fileDialogFilterSchema>
export type PickFilePathRequestDto = z.infer<typeof pickFilePathRequestSchema>
export type PickFilePathResponseDto = z.infer<typeof pickFilePathResponseSchema>
export type PickDirectoryPathRequestDto = z.infer<typeof pickDirectoryPathRequestSchema>
export type PickDirectoryPathResponseDto = z.infer<typeof pickDirectoryPathResponseSchema>
export type ReadClipboardImportPathsResponseDto = z.infer<typeof readClipboardImportPathsResponseSchema>
export type ClearDatabaseResponseDto = z.infer<typeof clearDatabaseResponseSchema>
export type ReadArchiveLoadStatusResponseDto = z.infer<typeof readArchiveLoadStatusResponseSchema>
export type ReadAppStateRequestDto = z.infer<typeof readAppStateRequestSchema>
export type ReadAppStateResponseDto = z.infer<typeof readAppStateResponseSchema>
export type WriteAppStateRequestDto = z.infer<typeof writeAppStateRequestSchema>
export type WriteAppStateResponseDto = z.infer<typeof writeAppStateResponseSchema>
export type OpenExternalUrlRequestDto = z.infer<typeof openExternalUrlRequestSchema>
export type OpenExternalUrlResponseDto = z.infer<typeof openExternalUrlResponseSchema>
export type RuntimeCapabilityStatusDto = z.infer<typeof runtimeCapabilityStatusSchema>
export type RuntimeCapabilityMatrixItemDto = z.infer<typeof runtimeCapabilityMatrixItemSchema>
export type ReadRuntimeCapabilitiesResponseDto = z.infer<typeof readRuntimeCapabilitiesResponseSchema>
export type ReadRuntimeInfoResponseDto = z.infer<typeof readRuntimeInfoResponseSchema>
export type SetRuntimeStoragePathsRequestDto = z.infer<typeof setRuntimeStoragePathsRequestSchema>
export type SetRuntimeStoragePathsResponseDto = z.infer<typeof setRuntimeStoragePathsResponseSchema>
export type MediaAccessAuditResponseDto = z.infer<typeof mediaAccessAuditResponseSchema>
