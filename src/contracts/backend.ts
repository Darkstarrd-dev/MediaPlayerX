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
  width: z.number().int().positive(),
  height: z.number().int().positive(),
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
})

export const resolveMediaResourceResponseSchema = z.object({
  resource_url: z.string().min(1),
  mime_type: z.string().min(1),
  expires_at_ms: z.number().int().positive(),
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
