export interface SourceRow {
  id: string
  source_type: 'package' | 'directory'
  package_name: string
  display_name: string
  absolute_path: string
  tree_path_json: string
  work_title: string
  circle: string
  author: string
  tags_json: string
  mock_grade: number | null
  source_site: 'nhentai' | 'ehentai' | null
  source_url: string | null
  source_remote_id: string | null
  source_token: string | null
  external_title: string | null
  title_jpn: string | null
  group_name: string | null
  group_name_jpn: string | null
  artist: string | null
  artist_jpn: string | null
  posted: string | null
  rating: string | null
  favorited: string | null
  external_tags_json: string | null
  external_raw_json: string | null
  source_cover_color: string | null
  source_cover_image_path: string | null
  source_cover_updated_at_ms: number | null
}

export interface ImageRow {
  id: string
  ordinal: number
  width: number
  height: number
  size_kb: number
  cluster: number
  color: string
  feature_vector_json: string
  media_locator_json: string
  hidden: number
}

export interface VideoRow {
  id: string
  file_name: string
  absolute_path: string
  tree_path_json: string
  duration_sec: number
  width: number
  height: number
  size_mb: number
  media_locator_json: string
  cover_color: string | null
  cover_image_path: string | null
  work_title: string | null
  circle: string | null
  author: string | null
  tags_json: string | null
  grade: number | null
}

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}
