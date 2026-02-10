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
