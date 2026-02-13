import type { ImagePackage, SearchField, SidebarNode, VideoItem } from '../types'

type BrowserFile = File & {
  path?: string
  webkitRelativePath?: string
}

type DragEntry = {
  isFile: boolean
  isDirectory: boolean
  name: string
  fullPath?: string
}

export type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => DragEntry | null
}

export function serializeFile(file: File): {
  name: string
  type: string
  size: number
  lastModified: number
  relativePath?: string
  path?: string
} {
  const source = file as BrowserFile
  const relativePath = source.webkitRelativePath?.trim() || undefined
  let nativePath = typeof source.path === 'string' && source.path.trim() ? source.path : undefined

  if (!nativePath && typeof window !== 'undefined') {
    const getter = window.mediaPlayerPlatform?.getPathForFile
    if (typeof getter === 'function') {
      const resolved = getter(file)
      if (typeof resolved === 'string' && resolved.trim().length > 0) {
        nativePath = resolved
      }
    }
  }

  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified,
    relativePath,
    path: nativePath,
  }
}

function decodeFileUriToPath(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'file:') {
      return null
    }

    let pathname = decodeURIComponent(url.pathname)
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1)
    }

    return pathname.replace(/\//g, '\\')
  } catch {
    return null
  }
}

function isLikelyFilesystemPath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value) || /^\//.test(value)
}

export function extractPathsFromClipboard(raw: string): string[] {
  const tokens = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const paths: string[] = []
  for (const token of tokens) {
    const unquoted = token.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim()
    const decoded = decodeFileUriToPath(unquoted)
    const candidate = decoded ?? unquoted
    if (isLikelyFilesystemPath(candidate)) {
      paths.push(candidate)
    }
  }

  return Array.from(new Set(paths))
}

export function dataTransferHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false
  }

  if ((dataTransfer.files?.length ?? 0) > 0) {
    return true
  }

  if (Array.from(dataTransfer.items ?? []).some((item) => item.kind === 'file')) {
    return true
  }

  const normalizedTypes = Array.from(dataTransfer.types).map((type) => type.toLowerCase())
  if (normalizedTypes.includes('files')) {
    return true
  }

  try {
    const uriList = dataTransfer.getData('text/uri-list') ?? ''
    const plainText = dataTransfer.getData('text/plain') ?? ''
    if (extractPathsFromClipboard(uriList).length > 0 || extractPathsFromClipboard(plainText).length > 0) {
      return true
    }
  } catch {
    return false
  }

  return false
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function packageMatchesSearch(pkg: ImagePackage, field: SearchField, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  const tagsText = pkg.tags.join(' ')

  switch (field) {
    case 'name':
      return includesText(pkg.packageName, normalized) || includesText(pkg.displayName, normalized)
    case 'workTitle':
      return includesText(pkg.workTitle, normalized)
    case 'circle':
      return includesText(pkg.circle, normalized)
    case 'author':
      return includesText(pkg.author, normalized)
    case 'tags':
      return includesText(tagsText, normalized)
    case 'all':
    default:
      return [pkg.packageName, pkg.displayName, pkg.workTitle, pkg.circle, pkg.author, tagsText]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
  }
}

export function videoMatchesSearch(video: VideoItem, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  return [video.fileName, video.absolutePath].join(' ').toLowerCase().includes(query.trim().toLowerCase())
}

export function collectLeafIds(node: SidebarNode, kind: 'package' | 'video' | 'audio'): string[] {
  if (kind === 'package' && node.packageId) {
    return [node.packageId]
  }
  if (kind === 'video' && node.videoId) {
    return [node.videoId]
  }
  if (kind === 'audio' && node.audioId) {
    return [node.audioId]
  }

  return node.children.flatMap((child) => collectLeafIds(child, kind))
}

export function collectImageSourceIds(node: SidebarNode): string[] {
  const current = node.imageSourceId ? [node.imageSourceId] : []
  return [...current, ...node.children.flatMap((child) => collectImageSourceIds(child))]
}

export function buildInitialVideoCoverMap(videos: Array<Pick<VideoItem, 'id' | 'coverColor'>>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const video of videos) {
    if (video.coverColor) {
      map[video.id] = video.coverColor
      continue
    }

    let hash = 0
    for (let i = 0; i < video.id.length; i += 1) {
      hash = (hash * 31 + video.id.charCodeAt(i)) % 360
    }
    map[video.id] = `hsl(${hash}, 44%, 40%)`
  }
  return map
}

export function buildInitialVideoCoverImageMap(
  videos: Array<Pick<VideoItem, 'id' | 'coverImagePath'>>,
): Record<string, string | null> {
  const map: Record<string, string | null> = {}
  for (const video of videos) {
    map[video.id] = video.coverImagePath ?? null
  }
  return map
}

export function makeRandomCoverColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 40 + Math.floor(Math.random() * 35)
  const lightness = 35 + Math.floor(Math.random() * 25)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
