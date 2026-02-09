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
  vectorSearchResults: VectorCandidate[]
  vectorResultsActive: boolean
  archiveLoadStatus: {
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  selectedSidebarNodeId: string | null
  appBodyRef: RefObject<HTMLDivElement | null>
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  selectVideoFromBrowser: (videoId: string) => void
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
  updateSettings: (patch: {
    sidebarFocus?: 'sidebar' | 'main'
    imageRootNodeId?: string | null
    videoRootNodeId?: string | null
  }) => void
}

interface UseAppSidebarScopeStateResult {
  scopedImageSourcesEffective: ImagePackage[]
  packageByIdEffective: Map<string, ImagePackage>
  videoByIdEffective: Map<string, VideoItem>
  imageTreeForSidebar: ImageSidebarTreeViewModel['tree']
  imageNodeLoadStateById: Record<string, 'pending' | 'running'>
  videosForSidebar: VideoItem[]
  videoTreeForSidebar: ImageSidebarTreeViewModel['tree']
  rootScopedVideoIds: Set<string>
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
  clearAllSelections: () => void
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void
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
  vectorSearchResults,
  vectorResultsActive,
  archiveLoadStatus,
  imageRootNodeId,
  videoRootNodeId,
  selectedSidebarNodeId,
  appBodyRef,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  selectVideoFromBrowser,
  setFocusByPackage,
  setPageByPackage,
  setGradeByPackage,
  updateSettings,
}: UseAppSidebarScopeStateParams): UseAppSidebarScopeStateResult {
  const sidebarSnapshot = backendRead.sidebar.data ?? backendRead.sidebar.snapshot
  const scopedSearchPackagesEffective = sidebarSnapshot?.imagePackages ?? bootstrapImagePackages
  const scopedSearchDirectoriesEffective = sidebarSnapshot?.imageDirectories ?? bootstrapImageDirectories
  const scopedImageSourcesEffective = useMemo(
    () => [...scopedSearchPackagesEffective, ...scopedSearchDirectoriesEffective],
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  )
  const librarySnapshotEffective = backendRead.library.data ?? backendRead.library.snapshot ?? bootstrapLibrarySnapshot
  const videosEffective = librarySnapshotEffective?.videos ?? bootstrapVideos
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
  const sidebarTreeSnapshot = sidebarSnapshot?.tree ?? null

  useScopedImageSourceStateSync({
    scopedImageSources: scopedImageSourcesEffective,
    setFocusByPackage,
    setPageByPackage,
    setGradeByPackage,
  })

  const imageTreeRawLocal = useMemo(
    () => buildImageSidebarTree(bootstrapImagePackages, bootstrapImageDirectories),
    [bootstrapImageDirectories, bootstrapImagePackages],
  )
  const imageTreeRaw = useMemo(
    () => sidebarTreeSnapshot ?? imageTreeRawLocal,
    [imageTreeRawLocal, sidebarTreeSnapshot],
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

  const searchedVideos = useMemo(() => videosEffective, [videosEffective])

  const { videoRootNode, rootScopedVideoIds, videosForSidebar, videoTreeForSidebar } = useVideoSidebarState({
    videos: searchedVideos,
    videoRootNodeId,
  })

  const {
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
  } = useSidebarNavigation({
    mode,
    imageTreeForSidebar,
    videoTreeForSidebar,
    imageRootNode,
    videoRootNode,
    selectedSidebarNodeId,
    appBodyRef,
    onSetSelectedSidebarNodeId: setSelectedSidebarNodeId,
    onSelectPackage: setSelectedPackageId,
    onSelectVideo: selectVideoFromBrowser,
    onSetSidebarFocusMain: () => {
      updateSettings({ sidebarFocus: 'main' })
    },
    onSetImageRootNodeId: (nodeId) => {
      updateSettings({ imageRootNodeId: nodeId })
    },
    onSetVideoRootNodeId: (nodeId) => {
      updateSettings({ videoRootNodeId: nodeId })
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
    clearAllSelections,
    toggleSidebarNodeChecked,
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
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    rootScopedVideoIds,
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
    clearAllSelections,
    toggleSidebarNodeChecked,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
  }
}
