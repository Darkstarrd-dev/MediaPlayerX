function resolveConcurrency(rawValue: string | undefined, fallback: number, max: number): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.max(1, Math.min(max, Math.round(parsed)))
}

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.mov'])

export const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.opus', '.aac'])

export const SUBTITLE_EXTENSIONS = new Set(['.vtt', '.srt', '.ass', '.ssa'])

export const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z'])

export const COLOR_PALETTE = ['#dd6b66', '#d58b45', '#6da249', '#4aa6a1', '#4f86cf', '#8868d6']

export const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001

export const ZIP_COMPRESSION_STORE = 0

export const ZIP_COMPRESSION_DEFLATE = 8

/**
 * 令牌有效期取 5 分钟：
 * - 足够覆盖翻页/全屏/重试等短会话的连续资源请求，避免频繁 401 风格失败。
 * - 又不会长期暴露可复用 token，把资源 URL 泄漏后的可利用窗口限制在可控范围。
 */
export const MEDIA_TOKEN_TTL_MS = 5 * 60 * 1000

export const FFMPEG_BIN = process.env.MEDIA_PLAYERX_FFMPEG_BIN ?? 'ffmpeg'

export const FFPROBE_BIN = process.env.MEDIA_PLAYERX_FFPROBE_BIN ?? 'ffprobe'

export const ARCHIVE_NORMALIZE_DIR_NAME = '.mediaplayerx/normalized-archives'

export const THUMBNAIL_CACHE_DIR_NAME = '.mediaplayerx/thumbnail-cache'

export const LEGACY_IMPORTS_DIR_NAME = 'imports'

export const DIRECTORY_SCAN_CONCURRENCY = resolveConcurrency(process.env.MEDIA_PLAYERX_SCAN_CONCURRENCY, 16, 64)

export const ARCHIVE_SCAN_CONCURRENCY = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_SCAN_CONCURRENCY, 10, 32)

export const ARCHIVE_NORMALIZE_IDLE_MS = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_NORMALIZE_IDLE_MS, 1800, 10_000)

export const ARCHIVE_NORMALIZE_RECHECK_MS = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_NORMALIZE_RECHECK_MS, 400, 5_000)

export const IMAGE_EXTENSIONS_FOR_WEBP_CONVERT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'])
