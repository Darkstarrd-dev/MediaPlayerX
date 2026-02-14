import {
  buildImageMainSectionProps,
} from './buildImageMainSectionProps'
import type { BackendErrorRow } from './buildBackendErrorRows'
import { buildMainFooter } from './buildMainFooter'
import { buildManagementPanelProps } from './buildManagementPanelProps'
import { buildMetadataManagementPanelProps } from './buildMetadataManagementPanelProps'
import { buildMetadataPanelProps } from './buildMetadataPanelProps'
import { buildSearchPanelProps } from './buildSearchPanelProps'
import { buildSidebarPanelProps } from './buildSidebarPanelProps'
import { buildMusicMainSectionProps } from './buildMusicMainSectionProps'
import { buildVideoMainSectionProps } from './buildVideoMainSectionProps'
import type { MusicBookletBindingsResult } from './useMusicBookletBindings'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { ManageAdReviewActionsResult } from './useManageAdReviewActions'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { WriteDataAccessResult } from '../backend'
import type { AudioItem, BrowserMode, FocusedImageRef, ImageItem, ImagePackage, MusicLoopMode, SidebarNode, VectorCandidate, VideoItem } from '../../types'
import type { UiBenchSettings } from '../perf/benchSettings'
import type { VideoFitMode } from '../media/videoFitMode'
import type {
  Dispatch,
  MouseEvent,
  RefObject,
  SetStateAction,
} from 'react'

interface UseAppWorkspacePropsParams {
  appSettings: AppSettingsStoreSnapshot
  benchSettings: UiBenchSettings
  mode: BrowserMode
  vectorMode: boolean
  manageMode: boolean
  metadataManageMode: boolean
  adReviewPanelOpen: boolean
  setAdReviewPanelOpen: Dispatch<SetStateAction<boolean>>
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  workspaceBottomPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  vectorSearchResults: VectorCandidate[]
  scopedImageSourcesEffective: ImagePackage[]
  musicBookletImageSources: ImagePackage[]
  videosForSidebarCount: number
  audiosForSidebarCount: number
  audiosForSidebar: AudioItem[]
  focusedRef: FocusedImageRef | null
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  featureNameQuery: string
  setFeatureNameQuery: Dispatch<SetStateAction<string>>
  featureWorkTitleQuery: string
  setFeatureWorkTitleQuery: Dispatch<SetStateAction<string>>
  featureCircleQuery: string
  setFeatureCircleQuery: Dispatch<SetStateAction<string>>
  featureAuthorQuery: string
  setFeatureAuthorQuery: Dispatch<SetStateAction<string>>
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  applyQuickFeatureSearch: (patch: { workTitle?: string; seriesId?: string; circle?: string; author?: string; tag?: string }) => void
  featureTagPickerOpen: boolean
  setFeatureTagPickerOpen: Dispatch<SetStateAction<boolean>>
  featureTags: string[]
  setFeatureTags: Dispatch<SetStateAction<string[]>>
  featureGradeFilter: number | null
  setFeatureGradeFilter: Dispatch<SetStateAction<number | null>>
  onStartWorkspaceBottomPanelResize: (event: MouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
  currentRootLabel: string | null
  managementErrorRows: BackendErrorRow[]
  sidebarCheckedNodeIds: string[]
  imageCheckedIds: string[]
  activeSelectionScope: 'image' | 'sidebar' | null
  backendWrite: WriteDataAccessResult
  manageOperationHint: string | null
  requestManageDelete: () => void
  runManageHideAction: (hidden: boolean) => Promise<void>
  manageAdReview: ManageAdReviewActionsResult
  clearAllSelections: () => void
  vectorResultsActive: boolean
  showNamesOnly: boolean
  backendPageLoading: boolean
  pagedPageSize: number
  activePackageForDisplay: ImagePackage | null
  visibleImageRefs: FocusedImageRef[]
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  actualThumbnailGap: number
  normalizedPageIndexEffective: number
  imageTotalPagesEffective: number
  packageByIdEffective: Map<string, ImagePackage>
  thumbnailImageUrlById: Record<string, string>
  sourceCoverImageUrlBySourceId: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  onGridElementChange: (element: HTMLDivElement | null) => void
  imageCheckedIdSet: Set<string>
  setFullscreenActiveWithAutoStop: (value: boolean | ((previous: boolean) => boolean)) => void
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  toggleImageChecked: (imageId: string, checked?: boolean) => void
  replaceImageCheckedIds: (ids: string[], append?: boolean) => void
  goPrevPage: () => void
  goNextPage: () => void
  focusedVideoDurationSec: number
  focusedAudio: AudioItem | null
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  focusedVideoSrc: string | null
  focusedAudioSrc: string | null
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
  fullscreenActive: boolean
  focusedVideoCoverColor: string
  focusedVideoCoverImageSrc: string | null
  focusedVideoEffective: VideoItem | null
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  cycleVideoFitMode: () => void
  imageFocusActive: boolean
  metadataImageEffective: ImageItem | null
  metadataImageSrc: string | null
  metadataImagePackageEffective: ImagePackage | null
  currentGradeEffective: number | null
  metadataWriteBindings: MetadataWriteBindingsResult
  metadataTab: 'info' | 'playlist'
  playlistIds: string[]
  selectedVideoId: string
  selectedAudioId: string
  audioPlaylistIds: string[]
  musicLoopMode: MusicLoopMode
  musicPlayRequestNonce: number
  dragVideoId: string | null
  videoByIdEffective: Map<string, VideoItem>
  audioByIdEffective: Map<string, AudioItem>
  setMetadataTab: Dispatch<SetStateAction<'info' | 'playlist'>>
  selectVideoFromBrowser: (videoId: string) => void
  setPlaylistIds: Dispatch<SetStateAction<string[]>>
  setDragVideoId: Dispatch<SetStateAction<string | null>>
  sidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNodeId: string | null
  searchResultsMode: boolean
  canSetCurrentRoot: boolean
  normalImageSourceNodeIdMap: Map<string, string>
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  musicRootNodeId: string | null
  imageTreeForSidebar: SidebarNode[]
  videoTreeForSidebar: SidebarNode[]
  audioTreeForSidebar: SidebarNode[]
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  featureSearchActive: boolean
  searchResultsReadOnly: boolean
  sidebarCheckedNodeIdSet: Set<string>
  goToFromSearchMode: () => void
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  setMusicLoopMode: Dispatch<SetStateAction<MusicLoopMode>>
  collapseSidebar: () => void
  applyCurrentRootFromSelection: () => void
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>
  requestMusicPlay: () => void
  musicBookletBindings: MusicBookletBindingsResult
}

function normalizeFeatureTags(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(/[\n,，;；|/]+/g))
    .map((value) => value.trim())
    .filter(Boolean)
}

function flattenExternalTags(value: Record<string, string>): string[] {
  const tags: string[] = []
  for (const [namespace, raw] of Object.entries(value)) {
    const normalizedNamespace = namespace.trim()
    if (!normalizedNamespace) {
      continue
    }
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    for (const part of parts) {
      tags.push(`${normalizedNamespace}:${part}`)
    }
  }
  return Array.from(new Set(tags))
}

function flattenExternalTagValues(value: Record<string, string>): string[] {
  const tags: string[] = []
  for (const raw of Object.values(value)) {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    tags.push(...parts)
  }
  return Array.from(new Set(tags))
}

function normalizeSeriesId(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function compareAbsolutePath(left: { absolutePath: string }, right: { absolutePath: string }): number {
  return left.absolutePath.localeCompare(right.absolutePath, 'zh-CN', { sensitivity: 'base' })
}

function collectAudioIdsBySidebarOrder(nodes: SidebarNode[], audios: AudioItem[]): string[] {
  const folderOrderByPath = new Map<string, number>()
  let order = 0
  const walk = (currentNodes: SidebarNode[]) => {
    for (const node of currentNodes) {
      folderOrderByPath.set(node.pathKey, order)
      order += 1
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)

  const resolveFolderPath = (audio: AudioItem): string => audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')

  return [...audios]
    .sort((left, right) => {
      const leftOrder = folderOrderByPath.get(resolveFolderPath(left)) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = folderOrderByPath.get(resolveFolderPath(right)) ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }
      return left.absolutePath.localeCompare(right.absolutePath, 'zh-CN', { sensitivity: 'base' })
    })
    .map((audio) => audio.id)
}

function collectScopedAudioIdsByFolderNode(params: {
  selectedSidebarNode: SidebarNode | null
  audiosForSidebar: AudioItem[]
  audioSidebarOrderedIds: string[]
}): string[] {
  const { selectedSidebarNode, audiosForSidebar, audioSidebarOrderedIds } = params
  if (!selectedSidebarNode || selectedSidebarNode.kind !== 'folder') {
    return audioSidebarOrderedIds
  }

  const selectedPath = selectedSidebarNode.pathKey
  const selectedPrefix = `${selectedPath}/`
  const scopedIdSet = new Set(
    audiosForSidebar
      .filter((audio) => {
        const folderPath = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')
        return folderPath === selectedPath || folderPath.startsWith(selectedPrefix)
      })
      .map((audio) => audio.id),
  )

  if (scopedIdSet.size === 0) {
    return audioSidebarOrderedIds
  }

  return audioSidebarOrderedIds.filter((audioId) => scopedIdSet.has(audioId))
}

function extractPathKeyFromNodeId(nodeId: string): string {
  const separatorIndex = nodeId.indexOf(':')
  if (separatorIndex < 0) {
    return nodeId
  }
  return nodeId.slice(separatorIndex + 1)
}

function resolveMusicBookletPreviewRootNodeId(params: {
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

function pickFirstBySeriesId<T extends { seriesId?: string; absolutePath: string }>(
  items: Iterable<T>,
  seriesId: string,
): T | null {
  if (!seriesId) {
    return null
  }

  const matches: T[] = []
  for (const item of items) {
    if (normalizeSeriesId(item.seriesId) === seriesId) {
      matches.push(item)
    }
  }

  if (matches.length === 0) {
    return null
  }
  matches.sort(compareAbsolutePath)
  return matches[0]
}

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'
const MUSIC_BOOKLET_AUTO_VALUE = '__auto__'
const MUSIC_BOOKLET_NONE_VALUE = '__none__'
const DISC_DIRECTORY_PATTERN = /^(?:cd|disc|disk)\s*[-_ ]*\d+$/i
const COVER_HINT_KEYWORDS = ['cover', 'front', 'jacket', 'folder', 'art', 'artwork']
const BOOKLET_HINT_KEYWORDS = ['booklet', 'scan', 'scans', 'liner', 'lyric', 'bk']

interface MusicBookletCandidate {
  sourceId: string
  absolutePath: string
  label: string
  imageCount: number
  relativeDepth: number
  coverHint: boolean
  bookletHint: boolean
}

interface MusicBookletResolvedState {
  albumRootPath: string
  candidates: MusicBookletCandidate[]
  autoCoverSourceId: string | null
  autoBookletSourceId: string | null
  effectiveCoverSourceId: string | null
  effectiveBookletSourceId: string | null
  coverBindingValue: string
  bookletBindingValue: string
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
        imageCount: source.images.length,
        relativeDepth: relativeSegments.length,
        coverHint: hasKeyword(baseName, COVER_HINT_KEYWORDS),
        bookletHint: hasKeyword(baseName, BOOKLET_HINT_KEYWORDS),
      }
    })
    .sort((left, right) => left.absolutePath.localeCompare(right.absolutePath, 'zh-CN', { sensitivity: 'base' }))
}

function resolveMusicBookletState(params: {
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

export function useAppWorkspaceProps({
  appSettings,
  benchSettings,
  mode,
  vectorMode,
  manageMode,
  metadataManageMode,
  adReviewPanelOpen,
  setAdReviewPanelOpen,
  searchPanelCollapsed,
  setSearchPanelCollapsed,
  workspaceBottomPanelHeight,
  vectorPanelRef,
  vectorPanelContentRef,
  vectorSearchResults,
  scopedImageSourcesEffective,
  musicBookletImageSources,
  videosForSidebarCount,
  audiosForSidebarCount,
  audiosForSidebar,
  focusedRef,
  focusedImage,
  focusedImagePackage,
  featureNameQuery,
  setFeatureNameQuery,
  featureWorkTitleQuery,
  setFeatureWorkTitleQuery,
  featureCircleQuery,
  setFeatureCircleQuery,
  featureAuthorQuery,
  setFeatureAuthorQuery,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  applyQuickFeatureSearch,
  featureTagPickerOpen,
  setFeatureTagPickerOpen,
  featureTags,
  setFeatureTags,
  featureGradeFilter,
  setFeatureGradeFilter,
  onStartWorkspaceBottomPanelResize,
  layoutLocked,
  currentRootLabel,
  managementErrorRows,
  sidebarCheckedNodeIds,
  imageCheckedIds,
  activeSelectionScope,
  backendWrite,
  manageOperationHint,
  requestManageDelete,
  runManageHideAction,
  manageAdReview,
  clearAllSelections,
  vectorResultsActive,
  showNamesOnly,
  backendPageLoading,
  pagedPageSize,
  activePackageForDisplay,
  visibleImageRefs,
  refsInPageEffective,
  pageStartEffective,
  actualCellWidth,
  actualMediaHeight,
  thumbnailColumns,
  actualThumbnailGap,
  normalizedPageIndexEffective,
  imageTotalPagesEffective,
  packageByIdEffective,
  thumbnailImageUrlById,
  sourceCoverImageUrlBySourceId,
  gridRef,
  onGridElementChange,
  imageCheckedIdSet,
  setFullscreenActiveWithAutoStop,
  setVectorFocusIndex,
  setImageFocus,
  toggleImageChecked,
  replaceImageCheckedIds,
  goPrevPage,
  goNextPage,
  focusedVideoDurationSec,
  focusedAudio,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  focusedVideoSrc,
  focusedAudioSrc,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  setSubtitleVisible,
  selectSubtitleById,
  fullscreenActive,
  focusedVideoCoverColor,
  focusedVideoCoverImageSrc,
  focusedVideoEffective,
  setVideoPlaying,
  goPlaylist,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  cycleVideoFitMode,
  imageFocusActive,
  metadataImageEffective,
  metadataImageSrc,
  metadataImagePackageEffective,
  currentGradeEffective,
  metadataWriteBindings,
  metadataTab,
  playlistIds,
  selectedVideoId,
  selectedAudioId,
  audioPlaylistIds,
  musicLoopMode,
  musicPlayRequestNonce,
  dragVideoId,
  videoByIdEffective,
  audioByIdEffective,
  setMetadataTab,
  selectVideoFromBrowser,
  setPlaylistIds,
  setDragVideoId,
  sidebarNodeById,
  selectedSidebarNodeId,
  searchResultsMode,
  canSetCurrentRoot,
  normalImageSourceNodeIdMap,
  imageRootNodeId,
  videoRootNodeId,
  musicRootNodeId,
  imageTreeForSidebar,
  videoTreeForSidebar,
  audioTreeForSidebar,
  imageNodeLoadStateById,
  selectedPackageId,
  featureSearchActive,
  searchResultsReadOnly,
  sidebarCheckedNodeIdSet,
  goToFromSearchMode,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  setSelectedAudioId,
  setMusicLoopMode,
  collapseSidebar,
  applyCurrentRootFromSelection,
  toggleSidebarNodeChecked,
  setAudioPlaylistIds,
  requestMusicPlay,
  musicBookletBindings,
}: UseAppWorkspacePropsParams) {
  /**
   * Workspace 层只做视图模型组装：
   * - 输入是上游状态层已收敛的读写能力；
   * - 输出是 Sidebar/Main/Metadata 的稳定 props。
   */
  const featureTagOptionsEffective = Array.from(
    new Set(
      normalizeFeatureTags(
        mode === 'image'
          ? scopedImageSourcesEffective.flatMap((source) => [
              ...source.tags,
              ...flattenExternalTagValues(source.externalMetadata?.tags ?? {}),
            ])
          : featureTagOptions,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'))

  const sidebarPanelProps = buildSidebarPanelProps({
    mode,
    sidebarFocus: appSettings.sidebarFocus,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    currentRootLabel,
    searchResultsMode,
    selectedSidebarNodeId,
    canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    musicRootNodeId,
    imageTreeNodes: imageTreeForSidebar,
    videoTreeNodes: videoTreeForSidebar,
    audioTreeNodes: audioTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    selectedVideoId,
    selectedAudioId,
    vectorResultsActive,
    featureSearchActive,
    searchResultsReadOnly,
    manageMode,
    metadataManageMode,
    checkedSidebarNodeIdSet: sidebarCheckedNodeIdSet,
    focusedRef,
    playlistIds,
    goToFromSearchMode,
    setSelectedSidebarNodeId,
    updateSettings: appSettings.updateSettings,
    setSelectedPackageId,
    selectVideoFromBrowser,
    setSelectedAudioId,
    collapseSidebar,
    applyCurrentRootFromSelection,
    setPlaylistIds,
    audioPlaylistIds,
    setAudioPlaylistIds,
    onToggleManageNode: toggleSidebarNodeChecked,
  })

  const searchPanelProps = buildSearchPanelProps({
    vectorMode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    featureResultCount:
      mode === 'video' ? videosForSidebarCount : mode === 'music' ? audiosForSidebarCount : scopedImageSourcesEffective.length,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
  })

  const managementPanelProps = buildManagementPanelProps({
    mode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pending: backendWrite.pending.manage,
    operationHint: manageOperationHint,
    errorRows: managementErrorRows,
    onDelete: requestManageDelete,
    onHide: () => {
      void runManageHideAction(true)
    },
    onUnhide: () => {
      void runManageHideAction(false)
    },
    onClearSelection: clearAllSelections,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPending: manageAdReview.pending,
    adReviewTask: manageAdReview.task,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: () => {
      void manageAdReview.startManageAdReview()
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview()
    },
    onToggleHideUncheckedNonChecked: manageAdReview.toggleHideUncheckedNonChecked,
    onAdReviewStrategyModeChange: (value) => {
      appSettings.updateSettings({ adReviewStrategyMode: value })
    },
    onAdReviewMaxConcurrencyChange: (value) => {
      appSettings.updateSettings({
        adReviewMaxConcurrency: Math.max(4, Math.min(12, Math.floor(value))),
      })
    },
    onAdReviewHeadNChange: (value) => {
      appSettings.updateSettings({
        adReviewHeadN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailNChange: (value) => {
      appSettings.updateSettings({
        adReviewTailN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailStopCleanStreakChange: (value) => {
      appSettings.updateSettings({
        adReviewTailStopCleanStreak: Math.max(1, Math.min(200, Math.floor(value))),
      })
    },
    onDismissAdReviewTask: manageAdReview.dismissTask,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
  })

  const applyMetadataSyncName = () => {
    if (mode === 'image') {
      metadataWriteBindings.applyPackageSyncName()
      return
    }
    if (mode === 'music') {
      return
    }
    metadataWriteBindings.applyVideoSyncName()
  }

  const saveParsedMetadata = async (parsed: ParsedExternalMetadata) => {
    if (mode !== 'image') {
      throw new Error('当前模式不支持写入图包元数据')
    }
    const packageId = metadataImagePackageEffective?.id
    if (!packageId) {
      throw new Error('当前无可用图包，无法保存')
    }
    await metadataWriteBindings.applyPackageMetadataById(packageId, {
      workTitle: parsed.title,
      circle: parsed.group,
      author: parsed.artist,
      tags: flattenExternalTags(parsed.tags),
    })
    await metadataWriteBindings.applyPackageExternalMetadataById(packageId, {
      sourceSite: parsed.source.site,
      sourceUrl: parsed.source.url,
      sourceRemoteId: parsed.source.id,
      sourceToken: parsed.source.token,
      title: parsed.title,
      titleJpn: parsed.title_jpn,
      group: parsed.group,
      groupJpn: parsed.group_jpn,
      artist: parsed.artist,
      artistJpn: parsed.artist_jpn,
      posted: parsed.posted,
      rating: parsed.rating,
      favorited: parsed.favorited,
      thumbUrl: parsed.thumb,
      tags: parsed.tags,
      rawJson: JSON.stringify(parsed),
    })
  }

  const metadataManagementPanelProps = buildMetadataManagementPanelProps({
    metadataManageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    metadataPending: metadataWriteBindings.metadataPending,
    operationHint: manageOperationHint,
    onSyncName: applyMetadataSyncName,
    onSaveParsedMetadata: saveParsedMetadata,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
    targetPackageName: metadataImagePackageEffective?.packageName ?? '',
    targetPackageLabel: metadataImagePackageEffective?.displayName ?? '-',
    proxyServer: appSettings.proxyServer,
    ehentaiCookies: appSettings.ehentaiCookies,
  })

  const enableLoadingSkeleton = benchSettings.enabled ? benchSettings.imageLoadingSkeleton.mode === 'replace' : true

  const selectedSidebarNode = selectedSidebarNodeId ? sidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const audioSidebarOrderedIds = collectAudioIdsBySidebarOrder(audioTreeForSidebar, audiosForSidebar)
  const metadataMusicPlaylistIds = collectScopedAudioIdsByFolderNode({
    selectedSidebarNode,
    audiosForSidebar,
    audioSidebarOrderedIds,
  })
  const nodeBrowseMode =
    mode === 'image' &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !manageMode &&
    Boolean(selectedSidebarNode && selectedSidebarNode.imageNodeType === 'folder' && selectedSidebarNode.children.length > 0)

  const resolveNodePreviewSourceId = (node: SidebarNode): string | null => {
    if (node.imageSourceId) {
      return node.imageSourceId
    }
    for (const child of node.children) {
      const found = resolveNodePreviewSourceId(child)
      if (found) {
        return found
      }
    }
    return null
  }

  const nodeBrowseItems = nodeBrowseMode
    ? (selectedSidebarNode?.children ?? []).map((child) => {
        const hasOwnImages = child.imageNodeType === 'package' || child.imageNodeType === 'directory'
        const previewSourceId = hasOwnImages ? (child.imageSourceId ?? resolveNodePreviewSourceId(child)) : resolveNodePreviewSourceId(child)
        const previewSource = previewSourceId ? packageByIdEffective.get(previewSourceId) : null
        const fallbackImageId = previewSource?.images.find((image) => !image.hidden)?.id
        const visibleImageCount = previewSource
          ? previewSource.images.reduce((count, image) => (image.hidden ? count : count + 1), 0)
          : child.directImageCount ?? 0
        const coverImageUrl =
          (previewSourceId ? sourceCoverImageUrlBySourceId[previewSourceId] : null) ??
          (fallbackImageId ? thumbnailImageUrlById[fallbackImageId] ?? null : null)

        return {
          nodeId: child.id,
          imageSourceId: child.imageSourceId,
          imageNodeType: child.imageNodeType ?? 'folder',
          label: child.label,
          packageCount: child.descendantPackageCount ?? 0,
          imageCount: hasOwnImages ? visibleImageCount : child.descendantImageCount ?? 0,
          descendantNodeCount: child.descendantNodeCount ?? child.children.length,
          coverImageUrl,
        }
      })
    : []

  const refsInPageForDisplay =
    manageMode && manageAdReview.hideUncheckedNonChecked
      ? refsInPageEffective.filter((ref) => {
          const imageId = packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]?.id
          return Boolean(imageId && imageCheckedIdSet.has(imageId))
        })
      : refsInPageEffective

  const adReviewScopeImageIdSet = new Set(manageAdReview.scopeImageIds)
  const adReviewLlmReviewedImageIdSet = new Set(manageAdReview.llmReviewedImageIds)
  const adReviewNonLlmReviewedImageIdSet = new Set(manageAdReview.nonLlmReviewedImageIds)

  const imageSeriesId = normalizeSeriesId(metadataImagePackageEffective?.seriesId)
  const videoSeriesId = normalizeSeriesId(focusedVideoEffective?.seriesId)
  const audioSeriesId = normalizeSeriesId(focusedAudio?.seriesId)
  const jumpTargetVideo = pickFirstBySeriesId(videoByIdEffective.values(), imageSeriesId)
  const jumpTargetImage = pickFirstBySeriesId(packageByIdEffective.values(), videoSeriesId)
  const jumpTargetImageFromAudio = pickFirstBySeriesId(packageByIdEffective.values(), audioSeriesId)
  const jumpTargetVideoFromAudio = pickFirstBySeriesId(videoByIdEffective.values(), audioSeriesId)
  const musicBookletState = resolveMusicBookletState({
    focusedAudio,
    imageSources: musicBookletImageSources,
    musicImportDirectories: musicBookletBindings.musicImportDirectories,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
  })
  const openMusicCoverSourceId = metadataManageMode
    ? musicBookletState.effectiveCoverSourceId
    : musicBookletState.effectiveCoverSourceId ?? musicBookletState.autoCoverSourceId
  const openMusicBookletSourceId = metadataManageMode
    ? musicBookletState.effectiveBookletSourceId ?? musicBookletState.effectiveCoverSourceId
    :
        musicBookletState.effectiveBookletSourceId ??
        musicBookletState.effectiveCoverSourceId ??
        musicBookletState.autoBookletSourceId ??
        musicBookletState.autoCoverSourceId
  const musicBookletPreviewRootNodeId = resolveMusicBookletPreviewRootNodeId({
    candidateSourceIds: musicBookletState.candidates.map((candidate) => candidate.sourceId),
    imageSourceNodeIdMap: normalImageSourceNodeIdMap,
  })

  const jumpToAnimation = () => {
    if (!jumpTargetVideo || !imageSeriesId) {
      return
    }
    applyQuickFeatureSearch({ seriesId: imageSeriesId })
    appSettings.updateSettings({ mode: 'video' })
    selectVideoFromBrowser(jumpTargetVideo.id)
    setMetadataTab('info')
  }

  const jumpToManga = () => {
    if (!jumpTargetImage || !videoSeriesId) {
      return
    }
    applyQuickFeatureSearch({ seriesId: videoSeriesId })
    appSettings.updateSettings({ mode: 'image' })
    setSelectedPackageId(jumpTargetImage.id)
  }

  const jumpMusicToManga = () => {
    if (!jumpTargetImageFromAudio || !audioSeriesId) {
      return
    }
    applyQuickFeatureSearch({ seriesId: audioSeriesId })
    appSettings.updateSettings({ mode: 'image' })
    setSelectedPackageId(jumpTargetImageFromAudio.id)
    setMetadataTab('info')
  }

  const jumpMusicToAnimation = () => {
    if (!jumpTargetVideoFromAudio || !audioSeriesId) {
      return
    }
    applyQuickFeatureSearch({ seriesId: audioSeriesId })
    appSettings.updateSettings({ mode: 'video' })
    selectVideoFromBrowser(jumpTargetVideoFromAudio.id)
    setMetadataTab('info')
  }

  const jumpMusicToCover = () => {
    const coverSourceId = openMusicCoverSourceId
    if (!coverSourceId) {
      return
    }

    applyQuickFeatureSearch({})
    appSettings.updateSettings({ mode: 'image', imageRootNodeId: musicBookletPreviewRootNodeId })
    setSelectedPackageId(coverSourceId)
    setMetadataTab('info')
  }

  const jumpMusicToBooklet = () => {
    const bookletSourceId = openMusicBookletSourceId
    if (!bookletSourceId) {
      return
    }

    applyQuickFeatureSearch({})
    appSettings.updateSettings({ mode: 'image', imageRootNodeId: musicBookletPreviewRootNodeId })
    setSelectedPackageId(bookletSourceId)
    setMetadataTab('info')
  }

  const updateMusicCoverBinding = (bindingValue: string) => {
    const albumRootPath = musicBookletState.albumRootPath
    if (!albumRootPath) {
      return
    }

    if (bindingValue === MUSIC_BOOKLET_AUTO_VALUE) {
      const current = musicBookletBindings.bindingsByAlbumRoot[albumRootPath]
      if (!current) {
        return
      }
      if (typeof current.bookletSourceId === 'undefined') {
        musicBookletBindings.resetBindingOverride(albumRootPath)
        return
      }
      musicBookletBindings.setBindingOverride(albumRootPath, { coverSourceId: undefined })
      return
    }

    if (bindingValue === MUSIC_BOOKLET_NONE_VALUE) {
      musicBookletBindings.setBindingOverride(albumRootPath, { coverSourceId: null })
      return
    }

    musicBookletBindings.setBindingOverride(albumRootPath, { coverSourceId: bindingValue })
  }

  const updateMusicBookletBinding = (bindingValue: string) => {
    const albumRootPath = musicBookletState.albumRootPath
    if (!albumRootPath) {
      return
    }

    if (bindingValue === MUSIC_BOOKLET_AUTO_VALUE) {
      const current = musicBookletBindings.bindingsByAlbumRoot[albumRootPath]
      if (!current) {
        return
      }
      if (typeof current.coverSourceId === 'undefined') {
        musicBookletBindings.resetBindingOverride(albumRootPath)
        return
      }
      musicBookletBindings.setBindingOverride(albumRootPath, { bookletSourceId: undefined })
      return
    }

    if (bindingValue === MUSIC_BOOKLET_NONE_VALUE) {
      musicBookletBindings.setBindingOverride(albumRootPath, { bookletSourceId: null })
      return
    }

    musicBookletBindings.setBindingOverride(albumRootPath, { bookletSourceId: bindingValue })
  }

  const imageMainSectionProps = buildImageMainSectionProps({
    vectorResultsActive,
    showNamesOnly,
    metadataManageMode,
    backendPageLoading,
    pagedPageSize,
    enableLoadingSkeleton,
    activePackageForDisplay,
    focusedRef,
    focusedImageExists: Boolean(focusedImage),
    visibleImageRefs,
    refsInPageEffective: refsInPageForDisplay,
    pageStartEffective,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    actualThumbnailGap,
    vectorSearchResults,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
    onGridElementChange,
    manageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageHide: mode === 'image' && imageCheckedIds.length > 0,
    canManageUnhide: mode === 'image' && imageCheckedIds.length > 0,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    checkedImageIdSet: imageCheckedIdSet,
    adReviewScopeImageIdSet,
    adReviewLlmReviewedImageIdSet,
    adReviewNonLlmReviewedImageIdSet,
    updateSettings: appSettings.updateSettings,
    setFullscreenActiveWithAutoStop,
    setVectorFocusIndex,
    setImageFocus,
    canJumpToAnimation: Boolean(jumpTargetVideo),
    onJumpToAnimation: jumpToAnimation,
    metadataPending: metadataWriteBindings.metadataPending,
    metadataTargetPackageLabel: metadataImagePackageEffective?.displayName ?? '-',
    metadataFetchDefaultText: metadataManagementPanelProps.defaultFetchText,
    metadataProxyServer: appSettings.proxyServer,
    metadataEhentaiCookies: appSettings.ehentaiCookies,
    onMetadataSyncName: applyMetadataSyncName,
    onMetadataSaveParsed: saveParsedMetadata,
    onToggleImageChecked: toggleImageChecked,
    onReplaceCheckedImages: replaceImageCheckedIds,
    onManageDelete: requestManageDelete,
    onManageHide: () => {
      void runManageHideAction(true)
    },
    onManageUnhide: () => {
      void runManageHideAction(false)
    },
    onToggleAdReviewPanel: () => setAdReviewPanelOpen((value) => !value),
    onClearManageSelection: clearAllSelections,
    nodeBrowseMode,
    nodeBrowseLabel: nodeBrowseMode ? (selectedSidebarNode?.label ?? '节点浏览') : '',
    nodeBrowseItems,
    onSelectNodeBrowseItem: (nodeId, imageSourceId) => {
      setSelectedSidebarNodeId(nodeId)
      if (imageSourceId) {
        setSelectedPackageId(imageSourceId)
      }
    },
  })

  const videoMainSectionProps = buildVideoMainSectionProps({
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageHide: mode === 'image' && imageCheckedIds.length > 0,
    canManageUnhide: mode === 'image' && imageCheckedIds.length > 0,
    onManageDelete: requestManageDelete,
    onManageHide: () => {
      void runManageHideAction(true)
    },
    onManageUnhide: () => {
      void runManageHideAction(false)
    },
    onClearManageSelection: clearAllSelections,
    durationSec: focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoSourceUrl: focusedVideoSrc,
    subtitleTrackUrl,
    subtitleVisible,
    subtitleLoading,
    subtitleMessage,
    subtitleOptions,
    selectedSubtitleId,
    setSubtitleVisible,
    selectSubtitleById,
    fullscreenActive,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedVideo: focusedVideoEffective,
    setVideoPlaying,
    canJumpToManga: Boolean(jumpTargetImage),
    onJumpToManga: jumpToManga,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoFitMode,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
    metadataPending: metadataWriteBindings.metadataPending,
    onMetadataSyncName: applyMetadataSyncName,
  })

  const musicMainSectionProps = buildMusicMainSectionProps({
    mode,
    fullscreenActive,
    videoPlaying,
    playRequestNonce: musicPlayRequestNonce,
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction: backendWrite.pending.manage,
    manageOperationHint,
    canManageDelete: sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    onManageDelete: requestManageDelete,
    onClearManageSelection: clearAllSelections,
    canJumpToManga: Boolean(jumpTargetImageFromAudio),
    canJumpToAnimation: Boolean(jumpTargetVideoFromAudio),
    canJumpToBooklet: Boolean(openMusicBookletSourceId),
    onJumpToManga: jumpMusicToManga,
    onJumpToAnimation: jumpMusicToAnimation,
    onJumpToBooklet: jumpMusicToBooklet,
    audiosForSidebar,
    audioSidebarOrderedIds,
    focusedAudio,
    focusedAudioSrc,
    selectedAudioId,
    musicLoopMode,
    audioByIdEffective,
    setSelectedAudioId,
    setMusicLoopMode,
    setFullscreenActiveWithAutoStop,
    musicVisualizerSelectedShaderId: appSettings.musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx: appSettings.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: appSettings.musicVisualizerFpsCap,
    musicVisualizerToneMapMode: appSettings.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: appSettings.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: appSettings.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: appSettings.musicVisualizerShowFps,
    musicVisualizerRenderer: appSettings.musicVisualizerRenderer,
    updateSettings: appSettings.updateSettings,
  })

  const applyMetadataFeatureSearch = (patch: {
    workTitle?: string
    circle?: string
    author?: string
    tag?: string
  }) => {
    applyQuickFeatureSearch(patch)
  }

  const metadataPanelProps = buildMetadataPanelProps({
    mode,
    manageMode,
    searchModeActive: vectorMode && !manageMode && !metadataManageMode,
    featureResultCount:
      mode === 'video' ? videosForSidebarCount : mode === 'music' ? audiosForSidebarCount : scopedImageSourcesEffective.length,
    featureNameQuery,
    onFeatureNameQueryChange: setFeatureNameQuery,
    featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: setFeatureWorkTitleQuery,
    featureCircleQuery,
    onFeatureCircleQueryChange: setFeatureCircleQuery,
    featureAuthorQuery,
    onFeatureAuthorQueryChange: setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    onToggleFeatureTagPicker: () => setFeatureTagPickerOpen((value) => !value),
    featureTags,
    onSetFeatureTags: (tags) => {
      const normalized = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
      setFeatureTags(normalized)
    },
    onClearFeatureTags: () => setFeatureTags([]),
    featureGradeFilter,
    onFeatureGradeFilterChange: setFeatureGradeFilter,
    adReviewFeatureVisible: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    canExecuteAdReview: (activeSelectionScope === 'sidebar' && sidebarCheckedNodeIds.length > 0) || imageCheckedIds.length > 0,
    adReviewPending: manageAdReview.pending,
    adReviewTask: manageAdReview.task,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: () => {
      void manageAdReview.startManageAdReview()
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview()
    },
    onToggleHideUncheckedNonChecked: manageAdReview.toggleHideUncheckedNonChecked,
    onAdReviewStrategyModeChange: (value) => {
      appSettings.updateSettings({ adReviewStrategyMode: value })
    },
    onAdReviewMaxConcurrencyChange: (value) => {
      appSettings.updateSettings({
        adReviewMaxConcurrency: Math.max(4, Math.min(12, Math.floor(value))),
      })
    },
    onAdReviewHeadNChange: (value) => {
      appSettings.updateSettings({
        adReviewHeadN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailNChange: (value) => {
      appSettings.updateSettings({
        adReviewTailN: Math.max(0, Math.min(200, Math.floor(value))),
      })
    },
    onAdReviewTailStopCleanStreakChange: (value) => {
      appSettings.updateSettings({
        adReviewTailStopCleanStreak: Math.max(1, Math.min(200, Math.floor(value))),
      })
    },
    onDismissAdReviewTask: manageAdReview.dismissTask,
    metadataCollapsed: appSettings.metadataCollapsed,
    metadataRatio: appSettings.metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    currentVideoGrade: focusedVideoEffective?.grade ?? null,
    metadataPending: metadataWriteBindings.metadataPending,
    editable: metadataManageMode,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    audioPlaylistIds: metadataMusicPlaylistIds,
    selectedAudioId,
    audioById: audioByIdEffective,
    musicBookletAlbumRootPath: musicBookletState.albumRootPath,
    musicBookletCandidates: musicBookletState.candidates.map((candidate) => ({
      sourceId: candidate.sourceId,
      label: candidate.label,
      imageCount: candidate.imageCount,
    })),
    musicCoverBindingValue: musicBookletState.coverBindingValue,
    musicBookletBindingValue: musicBookletState.bookletBindingValue,
    canOpenMusicCover: Boolean(openMusicCoverSourceId),
    canOpenMusicBooklet: Boolean(openMusicBookletSourceId),
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoById: videoByIdEffective,
    updateSettings: appSettings.updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSavePackageParsedMetadata: saveParsedMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
    onSaveAudioMetadata: metadataWriteBindings.applyAudioMetadata,
    onSearchByWorkTitle: (value) => {
      applyMetadataFeatureSearch({ workTitle: value })
    },
    onSearchByCircle: (value) => {
      applyMetadataFeatureSearch({ circle: value })
    },
    onSearchByAuthor: (value) => {
      applyMetadataFeatureSearch({ author: value })
    },
    onSearchByTag: (value) => {
      applyMetadataFeatureSearch({ tag: value })
    },
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: selectVideoFromBrowser,
    onSelectAudio: (audioId) => {
      setSelectedAudioId(audioId)
      appSettings.updateSettings({ sidebarFocus: 'main' })
    },
    onSelectAudioAndPlay: (audioId) => {
      setSelectedAudioId(audioId)
      requestMusicPlay()
      appSettings.updateSettings({ sidebarFocus: 'main' })
    },
    onMusicCoverBindingChange: updateMusicCoverBinding,
    onMusicBookletBindingChange: updateMusicBookletBinding,
    onOpenMusicCover: jumpMusicToCover,
    onOpenMusicBooklet: jumpMusicToBooklet,
    onResetMusicBookletBinding: () => {
      if (!musicBookletState.albumRootPath) {
        return
      }
      musicBookletBindings.resetBindingOverride(musicBookletState.albumRootPath)
    },
    setPlaylistIds,
    setDragVideoId,
  })

  const mainFooter = buildMainFooter({
    mode,
    focusedImage,
    focusedImagePackage,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    sidebarFocusedPath: selectedSidebarNodeId ? (sidebarNodeById.get(selectedSidebarNodeId)?.pathKey ?? null) : null,
    nodeBrowseMode,
    normalizedPageIndex: normalizedPageIndexEffective,
    imageTotalPages: imageTotalPagesEffective,
    onPrevPage: goPrevPage,
    onNextPage: goNextPage,
  })

  return {
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    musicMainSectionProps,
    metadataPanelProps,
    mainFooter,
  }
}

export type AppWorkspacePropsResult = ReturnType<typeof useAppWorkspaceProps>
