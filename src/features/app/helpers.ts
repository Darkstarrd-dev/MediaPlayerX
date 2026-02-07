import type { ImagePackage, SearchField, SidebarNode, VideoItem } from '../../types'

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
  const nativePath = typeof source.path === 'string' && source.path.trim() ? source.path : undefined

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

  return Array.from(dataTransfer.types).includes('Files')
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

export function collectLeafIds(node: SidebarNode, kind: 'package' | 'video'): string[] {
  if (kind === 'package' && node.packageId) {
    return [node.packageId]
  }
  if (kind === 'video' && node.videoId) {
    return [node.videoId]
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

export function makeRandomCoverColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 40 + Math.floor(Math.random() * 35)
  const lightness = 35 + Math.floor(Math.random() * 25)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
