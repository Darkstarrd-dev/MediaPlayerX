import type { AudioItem, ImagePackage } from '../../types'
import { resolveSourceImageCount } from '../../utils/mediaHelpers'

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'
export const MUSIC_BOOKLET_AUTO_VALUE = '__auto__'
export const MUSIC_BOOKLET_NONE_VALUE = '__none__'
const DISC_DIRECTORY_PATTERN = /^(?:cd|disc|disk)\s*[-_ ]*\d+$/i
const COVER_HINT_KEYWORDS = ['cover', 'front', 'jacket', 'folder', 'art', 'artwork']
const BOOKLET_HINT_KEYWORDS = ['booklet', 'scan', 'scans', 'liner', 'lyric', 'bk']

export interface MusicBookletCandidate {
  sourceId: string
  absolutePath: string
  label: string
  imageCount: number
  relativeDepth: number
  coverHint: boolean
  bookletHint: boolean
}

export interface MusicBookletResolvedState {
  albumRootPath: string
  candidates: MusicBookletCandidate[]
  autoCoverSourceId: string | null
  autoBookletSourceId: string | null
  effectiveCoverSourceId: string | null
  effectiveBookletSourceId: string | null
  coverBindingValue: string
  bookletBindingValue: string
}

function extractPathKeyFromNodeId(nodeId: string): string {
  const separatorIndex = nodeId.indexOf(':')
  if (separatorIndex < 0) {
    return nodeId
  }
  return nodeId.slice(separatorIndex + 1)
}

export function resolveMusicBookletPreviewRootNodeId(params: {
  candidateSourceIds: string[]
  imageSourceNodeIdMap: Map<string, string>
}): string | null {
  const pathPartsList = params.candidateSourceIds
    .map((sourceId) => params.imageSourceNodeIdMap.get(sourceId))
    .filter((nodeId): nodeId is string => typeof nodeId === 'string' && nodeId.length > 0)
    .map((nodeId) => extractPathKeyFromNodeId(nodeId).split('/').filter(Boolean))

  if (pathPartsList.length === 0) {
    return null
  }

  let sharedParts = pathPartsList[0] ?? []
  for (let index = 1; index < pathPartsList.length; index += 1) {
    const currentParts = pathPartsList[index] ?? []
    const sharedLimit = Math.min(sharedParts.length, currentParts.length)
    const nextShared: string[] = []
    for (let partIndex = 0; partIndex < sharedLimit; partIndex += 1) {
      if ((sharedParts[partIndex] ?? '').toLocaleLowerCase('zh-CN') !== (currentParts[partIndex] ?? '').toLocaleLowerCase('zh-CN')) {
        break
      }
      nextShared.push(sharedParts[partIndex] as string)
    }
    sharedParts = nextShared
    if (sharedParts.length === 0) {
      return null
    }
  }

  return sharedParts.length > 0 ? `folder:${sharedParts.join('/')}` : null
}

function normalizeFsPath(value: string): string {
  const normalized = value.replace(/\\+/g, '/').replace(/\/+/g, '/').trim()
  if (!normalized) {
    return ''
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1)
  }
  return normalized
}

function normalizePathKey(value: string): string {
  return normalizeFsPath(value).toLowerCase()
}

function splitFsSegments(value: string): string[] {
  return normalizeFsPath(value)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function dirnameFsPath(value: string): string {
  const normalized = normalizeFsPath(value)
  if (!normalized) {
    return ''
  }

  const index = normalized.lastIndexOf('/')
  if (index <= 0) {
    return normalized
  }

  return normalized.slice(0, index)
}

function basenameFsPath(value: string): string {
  const normalized = normalizeFsPath(value)
  if (!normalized) {
    return ''
  }

  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function isPathInside(rootPath: string, targetPath: string): boolean {
  const normalizedRootKey = normalizePathKey(rootPath)
  const normalizedTargetKey = normalizePathKey(targetPath)
  if (!normalizedRootKey || !normalizedTargetKey) {
    return false
  }

  return normalizedTargetKey === normalizedRootKey || normalizedTargetKey.startsWith(`${normalizedRootKey}/`)
}

function commonAncestorPath(leftPath: string, rightPath: string): string {
  const left = splitFsSegments(leftPath)
  const right = splitFsSegments(rightPath)
  const limit = Math.min(left.length, right.length)
  const shared: string[] = []
  for (let index = 0; index < limit; index += 1) {
    if (left[index]?.toLowerCase() !== right[index]?.toLowerCase()) {
      break
    }
    shared.push(left[index] as string)
  }
  return shared.join('/')
}

function pathDepth(value: string): number {
  return splitFsSegments(value).length
}

function relativeSegmentsFromRoot(rootPath: string, targetPath: string): string[] {
  if (!isPathInside(rootPath, targetPath)) {
    return []
  }

  const rootSegments = splitFsSegments(rootPath)
  const targetSegments = splitFsSegments(targetPath)
  return targetSegments.slice(rootSegments.length)
}

function joinFsPath(basePath: string, segment: string): string {
  const normalizedBase = normalizeFsPath(basePath)
  const normalizedSegment = segment.replace(/\\+/g, '/').replace(/\/+$/g, '').replace(/^\/+/, '')
  if (!normalizedBase) {
    return normalizedSegment
  }
  if (!normalizedSegment) {
    return normalizedBase
  }
  return `${normalizedBase}/${normalizedSegment}`
}

function hasKeyword(text: string, keywords: readonly string[]): boolean {
  const normalized = text.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return keywords.some((keyword) => normalized.includes(keyword))
}

function resolveAlbumRootPath(params: {
  audioAbsolutePath: string
  bookletSources: Array<{ absolutePath: string }>
  musicImportDirectories: string[]
}): string {
  const normalizedAudioPath = normalizeFsPath(params.audioAbsolutePath)
  const audioDirectoryPath = dirnameFsPath(normalizedAudioPath)
  if (!audioDirectoryPath) {
    return normalizedAudioPath
  }

  const normalizedImportDirectories = Array.from(
    new Set(params.musicImportDirectories.map((value) => normalizeFsPath(value)).filter(Boolean)),
  )
  const matchedImportRoot = normalizedImportDirectories
    .filter((candidateRoot) => isPathInside(candidateRoot, normalizedAudioPath))
    .sort((left, right) => pathDepth(right) - pathDepth(left))[0]

  if (!matchedImportRoot) {
    let bestAncestor = ''
    for (const source of params.bookletSources) {
      const candidatePath = normalizeFsPath(source.absolutePath)
      if (!candidatePath) {
        continue
      }

      const ancestor = commonAncestorPath(audioDirectoryPath, candidatePath)
      if (!ancestor) {
        continue
      }

      if (pathDepth(ancestor) > pathDepth(bestAncestor)) {
        bestAncestor = ancestor
      }
    }

    if (bestAncestor && pathDepth(bestAncestor) >= 2) {
      const bestAncestorBase = basenameFsPath(bestAncestor)
      if (DISC_DIRECTORY_PATTERN.test(bestAncestorBase)) {
        return dirnameFsPath(bestAncestor) || bestAncestor
      }
      return bestAncestor
    }

    const baseName = basenameFsPath(audioDirectoryPath)
    if (DISC_DIRECTORY_PATTERN.test(baseName)) {
      return dirnameFsPath(audioDirectoryPath) || audioDirectoryPath
    }
    return audioDirectoryPath
  }

  let bestAncestor = ''
  for (const source of params.bookletSources) {
    const candidatePath = normalizeFsPath(source.absolutePath)
    if (!candidatePath || !isPathInside(matchedImportRoot, candidatePath)) {
      continue
    }

    const ancestor = commonAncestorPath(audioDirectoryPath, candidatePath)
    if (!ancestor || !isPathInside(matchedImportRoot, ancestor)) {
      continue
    }

    if (pathDepth(ancestor) > pathDepth(bestAncestor)) {
      bestAncestor = ancestor
    }
  }

  if (bestAncestor) {
    const bestAncestorBase = basenameFsPath(bestAncestor)
    if (DISC_DIRECTORY_PATTERN.test(bestAncestorBase)) {
      return dirnameFsPath(bestAncestor) || matchedImportRoot
    }
    return bestAncestor
  }

  const relativeSegments = relativeSegmentsFromRoot(matchedImportRoot, audioDirectoryPath)
  if (relativeSegments.length <= 0) {
    return matchedImportRoot
  }

  const firstSegment = relativeSegments[0] ?? ''
  if (!firstSegment || DISC_DIRECTORY_PATTERN.test(firstSegment)) {
    return matchedImportRoot
  }
  return joinFsPath(matchedImportRoot, firstSegment)
}

function buildMusicBookletCandidates(params: {
  bookletSources: ImagePackage[]
  albumRootPath: string
}): MusicBookletCandidate[] {
  return params.bookletSources
    .filter((source) => isPathInside(params.albumRootPath, source.absolutePath))
    .map((source) => {
      const relativeSegments = relativeSegmentsFromRoot(params.albumRootPath, source.absolutePath)
      const relativeLabel = relativeSegments.join('/')
      const baseName = basenameFsPath(source.absolutePath)
      return {
        sourceId: source.id,
        absolutePath: source.absolutePath,
        label: relativeLabel || baseName || source.displayName,
        imageCount: resolveSourceImageCount(source),
        relativeDepth: relativeSegments.length,
        coverHint: hasKeyword(baseName, COVER_HINT_KEYWORDS),
        bookletHint: hasKeyword(baseName, BOOKLET_HINT_KEYWORDS),
      }
    })
    .sort((left, right) => left.absolutePath.localeCompare(right.absolutePath, 'zh-CN', { sensitivity: 'base' }))
}

export function resolveMusicBookletState(params: {
  focusedAudio: AudioItem | null
  imageSources: ImagePackage[]
  musicImportDirectories: string[]
  bindingsByAlbumRoot: Record<string, { coverSourceId?: string | null; bookletSourceId?: string | null }>
}): MusicBookletResolvedState {
  if (!params.focusedAudio) {
    return {
      albumRootPath: '',
      candidates: [],
      autoCoverSourceId: null,
      autoBookletSourceId: null,
      effectiveCoverSourceId: null,
      effectiveBookletSourceId: null,
      coverBindingValue: MUSIC_BOOKLET_AUTO_VALUE,
      bookletBindingValue: MUSIC_BOOKLET_AUTO_VALUE,
    }
  }

  const preferredBookletSources = params.imageSources.filter((source) => source.treePath[0] === MUSIC_BOOKLET_ROOT_LABEL)

  const resolveBySourcePool = (bookletSources: ImagePackage[]) => {
    const albumRootPath = resolveAlbumRootPath({
      audioAbsolutePath: params.focusedAudio!.absolutePath,
      bookletSources,
      musicImportDirectories: params.musicImportDirectories,
    })
    const candidates = buildMusicBookletCandidates({ bookletSources, albumRootPath })
    return {
      albumRootPath,
      candidates,
    }
  }

  const primaryBookletSources = preferredBookletSources.length > 0 ? preferredBookletSources : params.imageSources
  let { albumRootPath, candidates } = resolveBySourcePool(primaryBookletSources)

  if (preferredBookletSources.length > 0 && candidates.length === 0) {
    const fallbackResolved = resolveBySourcePool(params.imageSources)
    if (fallbackResolved.candidates.length > 0) {
      albumRootPath = fallbackResolved.albumRootPath
      candidates = fallbackResolved.candidates
    }
  }

  const sortedForCover = [...candidates].sort((left, right) => {
    if (normalizePathKey(left.absolutePath) === normalizePathKey(albumRootPath)) {
      return -1
    }
    if (normalizePathKey(right.absolutePath) === normalizePathKey(albumRootPath)) {
      return 1
    }
    if (left.coverHint !== right.coverHint) {
      return left.coverHint ? -1 : 1
    }
    if (left.relativeDepth !== right.relativeDepth) {
      return left.relativeDepth - right.relativeDepth
    }
    if (left.imageCount !== right.imageCount) {
      return right.imageCount - left.imageCount
    }
    return left.label.localeCompare(right.label, 'zh-CN')
  })

  const sortedForBooklet = [...candidates].sort((left, right) => {
    if (left.bookletHint !== right.bookletHint) {
      return left.bookletHint ? -1 : 1
    }
    if (left.imageCount !== right.imageCount) {
      return right.imageCount - left.imageCount
    }
    if (left.relativeDepth !== right.relativeDepth) {
      return left.relativeDepth - right.relativeDepth
    }
    return left.label.localeCompare(right.label, 'zh-CN')
  })

  const autoCoverSourceId = sortedForCover[0]?.sourceId ?? null
  const autoBookletSourceId = sortedForBooklet[0]?.sourceId ?? null
  const candidateSourceIdSet = new Set(candidates.map((candidate) => candidate.sourceId))
  const manualOverride = params.bindingsByAlbumRoot[albumRootPath]

  const resolveEffectiveSourceId = (manualValue: string | null | undefined, autoValue: string | null): string | null => {
    if (typeof manualValue === 'undefined') {
      return autoValue
    }
    if (manualValue === null) {
      return null
    }
    return candidateSourceIdSet.has(manualValue) ? manualValue : autoValue
  }

  const effectiveCoverSourceId = resolveEffectiveSourceId(manualOverride?.coverSourceId, autoCoverSourceId)
  const effectiveBookletSourceId = resolveEffectiveSourceId(manualOverride?.bookletSourceId, autoBookletSourceId)

  return {
    albumRootPath,
    candidates,
    autoCoverSourceId,
    autoBookletSourceId,
    effectiveCoverSourceId,
    effectiveBookletSourceId,
    coverBindingValue:
      typeof manualOverride?.coverSourceId === 'undefined'
        ? MUSIC_BOOKLET_AUTO_VALUE
        : manualOverride.coverSourceId === null
          ? MUSIC_BOOKLET_NONE_VALUE
          : manualOverride.coverSourceId,
    bookletBindingValue:
      typeof manualOverride?.bookletSourceId === 'undefined'
        ? MUSIC_BOOKLET_AUTO_VALUE
        : manualOverride.bookletSourceId === null
          ? MUSIC_BOOKLET_NONE_VALUE
          : manualOverride.bookletSourceId,
  }
}
