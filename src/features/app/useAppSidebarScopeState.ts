import {
  useMemo,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'

import {
  buildImageSidebarTree,
  findNodeById,
} from '../../mockData'
import type { BrowserMode } from '../../types'
import type {
  AudioItem,
  FocusedImageRef,
  ImagePackage,
  VectorCandidate,
  VideoItem,
} from '../../types'
import type {
  ImageSidebarTreeViewModel,
  LibrarySnapshotViewModel,
} from '../backend'
import { buildImageNodeLoadState } from './buildImageNodeLoadState'
import { buildVectorSidebarState } from './buildVectorSidebarState'
import { normalizePathForCompare } from './mediaPathUtils'
import { useImageSidebarBaseState } from './useImageSidebarBaseState'
import { useRootScopedImageData } from './useRootScopedImageData'
import { useScopedImageSourceStateSync } from './useScopedImageSourceStateSync'
import { useVideoSidebarState } from './useVideoSidebarState'
import { useAudioSidebarState } from './useAudioSidebarState'
import { useManageSelection } from '../management/useManageSelection'
import { useSidebarNavigation } from '../sidebar/useSidebarNavigation'

interface ReadSliceSnapshot<T> {
  data: T | null
  snapshot: T | null
}

interface AppSidebarBackendReadState {
  sidebar: ReadSliceSnapshot<ImageSidebarTreeViewModel>
  library: ReadSliceSnapshot<LibrarySnapshotViewModel>
}

interface UseAppSidebarScopeStateParams {
  backendRead: AppSidebarBackendReadState
  mode: BrowserMode
  bootstrapLibrarySnapshot: LibrarySnapshotViewModel | null
  bootstrapImagePackages: ImagePackage[]
  bootstrapImageDirectories: ImagePackage[]
  bootstrapVideos: VideoItem[]
  bootstrapAudios: AudioItem[]
  vectorSearchResults: VectorCandidate[]
  vectorResultsActive: boolean
  featureSearchActive: boolean
  featureNameQuery: string
  featureWorkTitleQuery: string
  featureSeriesIdQuery: string
  featureCircleQuery: string
  featureAuthorQuery: string
  featureTags: string[]
  featureGradeFilter: number | null
  archiveLoadStatus: {
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  musicRootNodeId: string | null
  selectedSidebarNodeId: string | null
  appBodyRef: RefObject<HTMLDivElement | null>
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  selectVideoFromBrowser: (videoId: string) => void
  setSelectedAudioId: Dispatch<SetStateAction<string>>
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
  updateSettings: (patch: {
    sidebarFocus?: 'sidebar' | 'main'
    imageRootNodeId?: string | null
    videoRootNodeId?: string | null
    musicRootNodeId?: string | null
  }) => void
}

interface UseAppSidebarScopeStateResult {
  scopedImageSourcesEffective: ImagePackage[]
  packageByIdEffective: Map<string, ImagePackage>
  videoByIdEffective: Map<string, VideoItem>
  audioByIdEffective: Map<string, AudioItem>
  imageTreeForSidebar: ImageSidebarTreeViewModel['tree']
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  videosForSidebar: VideoItem[]
  videoTreeForSidebar: ImageSidebarTreeViewModel['tree']
  audiosForSidebar: AudioItem[]
  audioTreeForSidebar: ImageSidebarTreeViewModel['tree']
  rootScopedVideoIds: Set<string>
  rootScopedAudioIds: Set<string>
  imageRootNode: ImageSidebarTreeViewModel['tree'][number] | null
  rootScopedPackageIds: Set<string>
  rootScopedPackages: ImagePackage[]
  allScopedRefs: FocusedImageRef[]
  normalImageSourceNodeIdMap: Map<string, string>
  vectorSidebarNodes: ImageSidebarTreeViewModel['tree']
  vectorResultPackageNodeIdMap: Map<string, string>
  flatSidebarNodes: ImageSidebarTreeViewModel['tree']
  sidebarNodeById: Map<string, ImageSidebarTreeViewModel['tree'][number]>
  imageSourceNodeIdMap: Map<string, string>
  videoNodeIdMap: Map<string, string>
  audioNodeIdMap: Map<string, string>
  canSetCurrentRoot: boolean
  currentRootLabel: string | null
  applyCurrentRootFromSelection: () => void
  ensureSidebarNodeVisible: (nodeId: string) => void
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean
  sidebarCheckedNodeIds: string[]
  sidebarCheckedNodeIdSet: Set<string>
  imageCheckedIds: string[]
  imageCheckedIdSet: Set<string>
  activeSelectionScope: 'image' | 'sidebar' | null
  clearSidebarSelections: () => void
  clearAllSelections: () => void
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void
  checkSidebarNode: (nodeId: string) => void
  toggleImageChecked: (imageId: string, checked?: boolean) => void
  replaceImageCheckedIds: (ids: string[], append?: boolean) => void
  orderedRootScopedPackages: ImagePackage[]
  orderedRootScopedImageRefs: FocusedImageRef[]
}

export function useAppSidebarScopeState({
  backendRead,
  mode,
  bootstrapLibrarySnapshot,
  bootstrapImagePackages,
  bootstrapImageDirectories,
  bootstrapVideos,
  bootstrapAudios,
  vectorSearchResults,
  vectorResultsActive,
  featureSearchActive,
  featureNameQuery,
  featureWorkTitleQuery,
  featureSeriesIdQuery,
  featureCircleQuery,
  featureAuthorQuery,
  featureTags,
  featureGradeFilter,
  archiveLoadStatus,
  imageRootNodeId,
  videoRootNodeId,
  musicRootNodeId,
  selectedSidebarNodeId,
  appBodyRef,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  selectVideoFromBrowser,
  setSelectedAudioId,
  setAudioPlaylistIds,
  setFocusByPackage,
  setPageByPackage,
  setGradeByPackage,
  updateSettings,
}: UseAppSidebarScopeStateParams): UseAppSidebarScopeStateResult {
  const sidebarSnapshot = backendRead.sidebar.data ?? backendRead.sidebar.snapshot
  const librarySnapshotEffective = backendRead.library.data ?? backendRead.library.snapshot ?? bootstrapLibrarySnapshot
  const imagePackagesFromLibrary = librarySnapshotEffective?.imagePackages ?? bootstrapImagePackages
  const imageDirectoriesFromLibrary = librarySnapshotEffective?.imageDirectories ?? bootstrapImageDirectories
  const scopedSearchPackagesEffective = useMemo(() => {
    if (mode !== 'image') {
      return imagePackagesFromLibrary
    }
    const snapshotPackages = sidebarSnapshot?.imagePackages
    return snapshotPackages && snapshotPackages.length > 0 ? snapshotPackages : imagePackagesFromLibrary
  }, [imagePackagesFromLibrary, mode, sidebarSnapshot])

  const scopedSearchDirectoriesEffective = useMemo(() => {
    if (mode !== 'image') {
      return imageDirectoriesFromLibrary
    }
    const snapshotDirectories = sidebarSnapshot?.imageDirectories
    return snapshotDirectories && snapshotDirectories.length > 0 ? snapshotDirectories : imageDirectoriesFromLibrary
  }, [imageDirectoriesFromLibrary, mode, sidebarSnapshot])
  const scopedImageSourcesEffective = useMemo(
    () => [...scopedSearchPackagesEffective, ...scopedSearchDirectoriesEffective],
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  )
  const videosEffective = librarySnapshotEffective?.videos ?? bootstrapVideos
  const audiosEffective = librarySnapshotEffective?.audios ?? bootstrapAudios
  const packageByIdEffective = useMemo(
    () => new Map(scopedImageSourcesEffective.map((source) => [source.id, source])),
    [scopedImageSourcesEffective],
  )
  const validImageIdSet = useMemo(() => {
    const next = new Set<string>()
    for (const source of scopedImageSourcesEffective) {
      for (const image of source.images) {
        next.add(image.id)
      }
    }
    return next
  }, [scopedImageSourcesEffective])
  const videoByIdEffective = useMemo(
    () => new Map(videosEffective.map((video) => [video.id, video])),
    [videosEffective],
  )
  const audioByIdEffective = useMemo(
    () => new Map(audiosEffective.map((audio) => [audio.id, audio])),
    [audiosEffective],
  )
  const sidebarTreeSnapshot = sidebarSnapshot?.tree ?? null

  useScopedImageSourceStateSync({
    scopedImageSources: scopedImageSourcesEffective,
    setFocusByPackage,
    setPageByPackage,
    setGradeByPackage,
  })

  const imageTreeRawLocal = useMemo(
    () => buildImageSidebarTree(scopedSearchPackagesEffective, scopedSearchDirectoriesEffective),
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  )
  const imageTreeRaw = useMemo(
    () => (mode === 'image' ? (sidebarTreeSnapshot ?? imageTreeRawLocal) : imageTreeRawLocal),
    [imageTreeRawLocal, mode, sidebarTreeSnapshot],
  )

  const imageRootNode = useMemo(
    () => findNodeById(imageTreeRaw, imageRootNodeId),
    [imageTreeRaw, imageRootNodeId],
  )

  const { rootScopedPackageIds, rootScopedPackages, allScopedRefs } = useRootScopedImageData({
    imageRootNode,
    scopedImageSources: scopedImageSourcesEffective,
  })

  const { imageTreeForSidebarNormal, normalImageSourceNodeIdMap } = useImageSidebarBaseState({
    imageTreeRaw,
    imageRootNode,
  })

  const vectorSidebarState = useMemo(
    () => buildVectorSidebarState(vectorSearchResults, packageByIdEffective),
    [packageByIdEffective, vectorSearchResults],
  )

  const vectorSidebarNodes = vectorSidebarState.nodes
  const vectorResultPackageNodeIdMap = vectorSidebarState.packageNodeIdMap

  const imageTreeForSidebar = useMemo(() => {
    if (vectorResultsActive) {
      return vectorSidebarNodes
    }
    return imageTreeForSidebarNormal
  }, [imageTreeForSidebarNormal, vectorResultsActive, vectorSidebarNodes])

  const imageNodeLoadStateById = useMemo(
    () =>
      buildImageNodeLoadState({
        archiveLoadStatus,
        imageTreeForSidebar,
        scopedImageSources: scopedImageSourcesEffective,
        normalizePathForCompare,
      }),
    [archiveLoadStatus, imageTreeForSidebar, scopedImageSourcesEffective],
  )

  const normalizedVideoFeatureFilter = useMemo(
    () => ({
      nameQuery: featureNameQuery.trim().toLocaleLowerCase('zh-CN'),
      workTitleQuery: featureWorkTitleQuery.trim().toLocaleLowerCase('zh-CN'),
      seriesIdQuery: featureSeriesIdQuery.trim().toLocaleLowerCase('zh-CN'),
      circleQuery: featureCircleQuery.trim().toLocaleLowerCase('zh-CN'),
      authorQuery: featureAuthorQuery.trim().toLocaleLowerCase('zh-CN'),
      tags: featureTags.map((tag) => tag.trim().toLocaleLowerCase('zh-CN')).filter(Boolean),
      grade: featureGradeFilter,
    }),
    [
      featureAuthorQuery,
      featureCircleQuery,
      featureGradeFilter,
      featureNameQuery,
      featureSeriesIdQuery,
      featureTags,
      featureWorkTitleQuery,
    ],
  )

  const searchedVideos = useMemo(() => {
    if (mode !== 'video' || !featureSearchActive) {
      return videosEffective
    }

    const textIncludes = (value: string, query: string) =>
      query.length === 0 || value.toLocaleLowerCase('zh-CN').includes(query)

    return videosEffective.filter((video) => {
      if (normalizedVideoFeatureFilter.nameQuery.length > 0) {
        const matched =
          textIncludes(video.fileName, normalizedVideoFeatureFilter.nameQuery) ||
          textIncludes(video.absolutePath, normalizedVideoFeatureFilter.nameQuery)
        if (!matched) {
          return false
        }
      }

      if (
        ![video.workTitle, video.workTitleJpn ?? ''].some((value) =>
          textIncludes(value, normalizedVideoFeatureFilter.workTitleQuery),
        )
      ) {
        return false
      }

      if (!textIncludes(video.seriesId ?? '', normalizedVideoFeatureFilter.seriesIdQuery)) {
        return false
      }

      if (
        ![video.circle, video.circleJpn ?? ''].some((value) => textIncludes(value, normalizedVideoFeatureFilter.circleQuery))
      ) {
        return false
      }

      if (
        ![video.author, video.authorJpn ?? ''].some((value) => textIncludes(value, normalizedVideoFeatureFilter.authorQuery))
      ) {
        return false
      }

      if (normalizedVideoFeatureFilter.tags.length > 0) {
        const lowerTags = video.tags.map((tag) => tag.toLocaleLowerCase('zh-CN'))
        const matched = normalizedVideoFeatureFilter.tags.every((tag) => lowerTags.includes(tag))
        if (!matched) {
          return false
        }
      }

      if (normalizedVideoFeatureFilter.grade !== null) {
        const grade = video.grade ?? 0
        if (grade !== normalizedVideoFeatureFilter.grade) {
          return false
        }
      }

      return true
    })
  }, [featureSearchActive, mode, normalizedVideoFeatureFilter, videosEffective])

  const normalizedAudioFeatureFilter = useMemo(
    () => ({
      nameQuery: featureNameQuery.trim().toLocaleLowerCase('zh-CN'),
      workTitleQuery: featureWorkTitleQuery.trim().toLocaleLowerCase('zh-CN'),
      seriesIdQuery: featureSeriesIdQuery.trim().toLocaleLowerCase('zh-CN'),
      circleQuery: featureCircleQuery.trim().toLocaleLowerCase('zh-CN'),
      authorQuery: featureAuthorQuery.trim().toLocaleLowerCase('zh-CN'),
    }),
    [featureAuthorQuery, featureCircleQuery, featureNameQuery, featureSeriesIdQuery, featureWorkTitleQuery],
  )

  const searchedAudios = useMemo(() => {
    if (mode !== 'music' || !featureSearchActive) {
      return audiosEffective
    }

    const textIncludes = (value: string, query: string) =>
      query.length === 0 || value.toLocaleLowerCase('zh-CN').includes(query)

    return audiosEffective.filter((audio) => {
      if (normalizedAudioFeatureFilter.nameQuery.length > 0) {
        const matched =
          textIncludes(audio.fileName, normalizedAudioFeatureFilter.nameQuery) ||
          textIncludes(audio.absolutePath, normalizedAudioFeatureFilter.nameQuery)
        if (!matched) {
          return false
        }
      }

      if (!textIncludes(audio.trackTitle, normalizedAudioFeatureFilter.workTitleQuery)) {
        return false
      }

      if (!textIncludes(audio.seriesId ?? '', normalizedAudioFeatureFilter.seriesIdQuery)) {
        return false
      }

      if (!textIncludes(audio.album, normalizedAudioFeatureFilter.circleQuery)) {
        return false
      }

      if (!textIncludes(audio.author, normalizedAudioFeatureFilter.authorQuery)) {
        return false
      }

      return true
    })
  }, [audiosEffective, featureSearchActive, mode, normalizedAudioFeatureFilter])

  const { videoRootNode, rootScopedVideoIds, videosForSidebar, videoTreeForSidebar } = useVideoSidebarState({
    videos: searchedVideos,
    videoRootNodeId,
  })

  const { musicRootNode, rootScopedAudioIds, audiosForSidebar, audioTreeForSidebar } = useAudioSidebarState({
    audios: searchedAudios,
    musicRootNodeId,
  })

  const {
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
  } = useSidebarNavigation({
    mode,
    imageTreeForSidebar,
    videoTreeForSidebar,
    audioTreeForSidebar,
    audiosForSidebar,
    imageRootNode,
    videoRootNode,
    musicRootNode,
    selectedSidebarNodeId,
    appBodyRef,
    onSetSelectedSidebarNodeId: setSelectedSidebarNodeId,
    onSelectPackage: setSelectedPackageId,
    onSelectVideo: selectVideoFromBrowser,
    onSelectAudio: (audioId) => {
      setSelectedAudioId(audioId)
      setAudioPlaylistIds((previous) => {
        if (previous.includes(audioId)) {
          return previous
        }
        return [...previous, audioId]
      })
    },
    onSetSidebarFocusMain: () => {
      updateSettings({ sidebarFocus: 'main' })
    },
    onSetImageRootNodeId: (nodeId) => {
      updateSettings({ imageRootNodeId: nodeId })
    },
    onSetVideoRootNodeId: (nodeId) => {
      updateSettings({ videoRootNodeId: nodeId })
    },
    onSetMusicRootNodeId: (nodeId) => {
      updateSettings({ musicRootNodeId: nodeId })
    },
  })

  const sidebarDescendantNodeIdsById = useMemo(() => {
    const next = new Map<string, string[]>()
    const collectDescendantIds = (node: (typeof flatSidebarNodes)[number]): string[] => {
      const descendants: string[] = []
      const walk = (children: typeof node.children) => {
        for (const child of children) {
          descendants.push(child.id)
          if (child.children.length > 0) {
            walk(child.children)
          }
        }
      }

      if (node.children.length > 0) {
        walk(node.children)
      }
      return descendants
    }

    for (const node of flatSidebarNodes) {
      next.set(node.id, collectDescendantIds(node))
    }
    return next
  }, [flatSidebarNodes])

  const flatSidebarNodeIds = useMemo(() => flatSidebarNodes.map((node) => node.id), [flatSidebarNodes])

  const {
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearSidebarSelections,
    clearAllSelections,
    toggleSidebarNodeChecked,
    checkSidebarNode,
    toggleImageChecked,
    replaceImageCheckedIds,
  } = useManageSelection({
    flatSidebarNodeIds,
    validImageIdSet,
    sidebarDescendantNodeIdsById,
  })

  const sidebarOrderedImageSourceIds = useMemo(() => {
    const orderedIds: string[] = []
    const seen = new Set<string>()

    for (const node of flatSidebarNodes) {
      const sourceId = node.imageSourceId
      if (!sourceId || seen.has(sourceId)) {
        continue
      }
      if (!rootScopedPackageIds.has(sourceId) || !packageByIdEffective.has(sourceId)) {
        continue
      }
      seen.add(sourceId)
      orderedIds.push(sourceId)
    }

    if (orderedIds.length > 0) {
      return orderedIds
    }

    return rootScopedPackages.map((pkg) => pkg.id)
  }, [flatSidebarNodes, packageByIdEffective, rootScopedPackageIds, rootScopedPackages])

  const orderedRootScopedPackages = useMemo(
    () =>
      sidebarOrderedImageSourceIds
        .map((sourceId) => packageByIdEffective.get(sourceId))
        .filter((pkg): pkg is ImagePackage => Boolean(pkg)),
    [packageByIdEffective, sidebarOrderedImageSourceIds],
  )

  const orderedRootScopedImageRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of orderedRootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [orderedRootScopedPackages])

  return {
    scopedImageSourcesEffective,
    packageByIdEffective,
    videoByIdEffective,
    audioByIdEffective,
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    audiosForSidebar,
    audioTreeForSidebar,
    rootScopedVideoIds,
    rootScopedAudioIds,
    imageRootNode,
    rootScopedPackageIds,
    rootScopedPackages,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearSidebarSelections,
    clearAllSelections,
    toggleSidebarNodeChecked,
    checkSidebarNode,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
  }
}
