import { z } from 'zod'

const nonNegativeIntSchema = z.number().int().nonnegative()

export const browserModeDtoSchema = z.enum(['image', 'video'])

export const featureFilterDtoSchema = z.object({
  name_query: z.string(),
  work_title_query: z.string(),
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
    media_type: z.enum(['image', 'video']),
    mime_type: z.string().min(1),
  }),
  z.object({
    kind: z.literal('archive-entry'),
    archive_path: z.string().min(1),
    archive_format: z.enum(['zip', 'rar', '7z']),
    entry_name: z.string().min(1),
    extension: z.string().min(1),
    media_type: z.enum(['image', 'video']),
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
  feature_vector: z.array(z.number()),
  media_locator: mediaLocatorDtoSchema,
})

export const imagePackageDtoSchema = z.object({
  id: z.string().min(1),
  package_name: z.string().min(1),
  display_name: z.string().min(1),
  absolute_path: z.string().min(1),
  tree_path: z.array(z.string().min(1)).min(1),
  work_title: z.string().min(1),
  circle: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()),
  mock_grade: z.number().int().min(0).max(5).nullable(),
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
  media_locator: mediaLocatorDtoSchema,
})

export const focusedImageRefDtoSchema = z.object({
  package_id: z.string().min(1),
  image_index: nonNegativeIntSchema,
})

export const sidebarNodeDtoSchema: z.ZodType<{
  id: string
  label: string
  kind: 'folder' | 'package' | 'video'
  children: Array<unknown>
  package_id?: string
  video_id?: string
  image_source_id?: string
  direct_image_count?: number
  path_key: string
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(['folder', 'package', 'video']),
    children: z.array(sidebarNodeDtoSchema),
    package_id: z.string().min(1).optional(),
    video_id: z.string().min(1).optional(),
    image_source_id: z.string().min(1).optional(),
    direct_image_count: nonNegativeIntSchema.optional(),
    path_key: z.string().min(1),
  }),
)

export const librarySnapshotDtoSchema = z.object({
  image_packages: z.array(imagePackageDtoSchema),
  image_directories: z.array(imagePackageDtoSchema),
  videos: z.array(videoItemDtoSchema),
})

export const gradeOverrideMapSchema = z.record(z.string(), z.number().int().min(0).max(5).nullable())

export const readImageSidebarTreeRequestSchema = z.object({
  feature_filter: featureFilterDtoSchema,
  grade_overrides: gradeOverrideMapSchema.optional(),
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
      quality: z.number().int().min(50).max(95).optional(),
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

export const writePlaylistRequestSchema = z.object({
  video_ids: z.array(z.string().min(1)),
})

export const writePlaylistResponseSchema = z.object({
  video_ids: z.array(z.string().min(1)),
  updated_at_ms: z.number().int().positive(),
})

export const importTaskStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])

export const importTaskSourceSchema = z.enum(['dialog-files', 'dialog-folders', 'drag-drop', 'paste'])

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
})

export const pickImportPathsResponseSchema = z.object({
  paths: z.array(z.string().min(1)),
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
export type SaveVideoCoverRequestDto = z.infer<typeof saveVideoCoverRequestSchema>
export type SaveVideoCoverResponseDto = z.infer<typeof saveVideoCoverResponseSchema>
export type ReadPlaylistResponseDto = z.infer<typeof readPlaylistResponseSchema>
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
export type ReadClipboardImportPathsResponseDto = z.infer<typeof readClipboardImportPathsResponseSchema>
export type ClearDatabaseResponseDto = z.infer<typeof clearDatabaseResponseSchema>
export type ReadArchiveLoadStatusResponseDto = z.infer<typeof readArchiveLoadStatusResponseSchema>
export type RuntimeCapabilityStatusDto = z.infer<typeof runtimeCapabilityStatusSchema>
export type RuntimeCapabilityMatrixItemDto = z.infer<typeof runtimeCapabilityMatrixItemSchema>
export type ReadRuntimeCapabilitiesResponseDto = z.infer<typeof readRuntimeCapabilitiesResponseSchema>
export type MediaAccessAuditResponseDto = z.infer<typeof mediaAccessAuditResponseSchema>
