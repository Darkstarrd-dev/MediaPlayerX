import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { buildImageSidebarTree, findNodeById } from "../../mockData";
import type { BrowserMode, SidebarTreeDisplayMode } from "../../types";
import type {
  AudioItem,
  FocusedImageRef,
  ImagePackage,
  VectorCandidate,
  VideoItem,
} from "../../types";
import type {
  ImageSidebarTreeViewModel,
  LibrarySnapshotViewModel,
} from "../backend";
import { buildImageNodeLoadState } from "./buildImageNodeLoadState";
import { buildVectorSidebarState } from "./buildVectorSidebarState";
import { normalizePathForCompare } from "./mediaPathUtils";
import { useImageSidebarBaseState } from "./useImageSidebarBaseState";
import { useRootScopedImageData } from "./useRootScopedImageData";
import { useScopedImageSourceStateSync } from "./useScopedImageSourceStateSync";
import { useVideoSidebarState } from "./useVideoSidebarState";
import { useAudioSidebarState } from "./useAudioSidebarState";
import { useManageSelection } from "../management/useManageSelection";
import { useSidebarNavigation } from "../sidebar/useSidebarNavigation";
import { resolvePreferredSidebarSources } from "./sidebarSourceSelection";
import { useSourceImageCache } from "./useSourceImageCache";
import { resolveSourceImageCount } from "../../utils/mediaHelpers";
import type { MediaRepository } from "../backend/repository";

interface ReadSliceSnapshot<T> {
  data: T | null;
  snapshot: T | null;
}

interface AppSidebarBackendReadState {
  sidebar: ReadSliceSnapshot<ImageSidebarTreeViewModel>;
  library: ReadSliceSnapshot<LibrarySnapshotViewModel>;
}

interface UseAppSidebarScopeStateParams {
  backendRead: AppSidebarBackendReadState;
  mode: BrowserMode;
  mediaRepository: MediaRepository;
  selectedPackageId: string;
  includeHidden: boolean;
  adReviewResultSourceIds: string[];
  adReviewResultImageIds: string[];
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  bootstrapLibrarySnapshot: LibrarySnapshotViewModel | null;
  bootstrapImagePackages: ImagePackage[];
  bootstrapImageDirectories: ImagePackage[];
  bootstrapVideos: VideoItem[];
  bootstrapAudios: AudioItem[];
  vectorSearchResults: VectorCandidate[];
  vectorResultsActive: boolean;
  featureSearchActive: boolean;
  featureNameQuery: string;
  featureWorkTitleQuery: string;
  featureSeriesIdQuery: string;
  featureCircleQuery: string;
  featureAuthorQuery: string;
  featureTags: string[];
  featureGradeFilter: number | null;
  sidebarTreeDisplayMode: SidebarTreeDisplayMode;
  archiveLoadStatus: {
    runningArchivePath: string | null;
    pendingArchivePaths: string[];
  };
  imageRootNodeId: string | null;
  videoRootNodeId: string | null;
  musicRootNodeId: string | null;
  selectedSidebarNodeId: string | null;
  appBodyRef: RefObject<HTMLDivElement | null>;
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedPackageId: Dispatch<SetStateAction<string>>;
  selectVideoFromBrowser: (videoId: string) => void;
  setSelectedAudioId: Dispatch<SetStateAction<string>>;
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>;
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>;
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>;
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>;
  updateSettings: (patch: {
    sidebarFocus?: "sidebar" | "main";
    imageRootNodeId?: string | null;
    videoRootNodeId?: string | null;
    musicRootNodeId?: string | null;
  }) => void;
}

interface UseAppSidebarScopeStateResult {
  scopedImageSourcesEffective: ImagePackage[];
  packageByIdEffective: Map<string, ImagePackage>;
  videoByIdEffective: Map<string, VideoItem>;
  audioByIdEffective: Map<string, AudioItem>;
  imageTreeForSidebar: ImageSidebarTreeViewModel["tree"];
  imageNodeLoadStateById: Record<string, "pending" | "running">;
  videosForSidebar: VideoItem[];
  videoTreeForSidebar: ImageSidebarTreeViewModel["tree"];
  audiosForSidebar: AudioItem[];
  audioTreeForSidebar: ImageSidebarTreeViewModel["tree"];
  rootScopedVideoIds: Set<string>;
  rootScopedAudioIds: Set<string>;
  imageRootNode: ImageSidebarTreeViewModel["tree"][number] | null;
  rootScopedPackageIds: Set<string>;
  rootScopedPackages: ImagePackage[];
  allScopedRefs: FocusedImageRef[];
  normalImageSourceNodeIdMap: Map<string, string>;
  vectorSidebarNodes: ImageSidebarTreeViewModel["tree"];
  vectorResultPackageNodeIdMap: Map<string, string>;
  flatSidebarNodes: ImageSidebarTreeViewModel["tree"];
  sidebarNodeById: Map<string, ImageSidebarTreeViewModel["tree"][number]>;
  imageSourceNodeIdMap: Map<string, string>;
  videoNodeIdMap: Map<string, string>;
  audioNodeIdMap: Map<string, string>;
  canSetCurrentRoot: boolean;
  currentRootLabel: string | null;
  applyCurrentRootFromSelection: () => void;
  ensureSidebarNodeVisible: (nodeId: string) => void;
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean;
  sidebarCheckedNodeIds: string[];
  sidebarCheckedNodeIdSet: Set<string>;
  imageCheckedIds: string[];
  imageCheckedIdSet: Set<string>;
  activeSelectionScope: "image" | "sidebar" | null;
  clearSidebarSelections: () => void;
  clearAllSelections: () => void;
  toggleSidebarNodeChecked: (nodeId: string, shiftKey: boolean) => void;
  checkSidebarNode: (nodeId: string) => void;
  toggleImageChecked: (
    imageId: string,
    checked?: boolean,
    options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
  ) => void;
  replaceImageCheckedIds: (ids: string[], append?: boolean) => void;
  orderedRootScopedPackages: ImagePackage[];
  orderedRootScopedImageRefs: FocusedImageRef[];
}

function buildImageSourceNodeIdMapFromSources(
  imagePackages: ImagePackage[],
  imageDirectories: ImagePackage[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const source of imagePackages) {
    const pathKey = source.treePath.join("/");
    map.set(source.id, `package:${pathKey}`);
  }

  for (const source of imageDirectories) {
    const pathKey = source.treePath.join("/");
    map.set(source.id, `folder:${pathKey}`);
  }

  return map;
}

export function useAppSidebarScopeState({
  backendRead,
  mode,
  mediaRepository,
  selectedPackageId,
  includeHidden,
  adReviewResultSourceIds,
  adReviewResultImageIds,
  fullscreenActive,
  fullscreenDisplay,
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
  sidebarTreeDisplayMode,
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
  const isImageMode = mode === "image";
  const isVideoMode = mode === "video";
  const isMusicMode = mode === "music";
  const imagePaneVisibleInFullscreen =
    fullscreenActive &&
    (fullscreenDisplay === "dual" || fullscreenDisplay === "image-only");
  const videoPaneVisibleInFullscreen =
    fullscreenActive &&
    (fullscreenDisplay === "dual" || fullscreenDisplay === "video-only");
  const shouldUseImageSidebarSnapshot =
    isImageMode || imagePaneVisibleInFullscreen;
  const shouldExposeVideoSidebar = isVideoMode || videoPaneVisibleInFullscreen;
  const sidebarSnapshot =
    backendRead.sidebar.data ?? backendRead.sidebar.snapshot;
  const librarySnapshotEffective =
    backendRead.library.data ??
    backendRead.library.snapshot ??
    bootstrapLibrarySnapshot;
  const imagePackagesFromLibrary =
    librarySnapshotEffective?.imagePackages ?? bootstrapImagePackages;
  const imageDirectoriesFromLibrary =
    librarySnapshotEffective?.imageDirectories ?? bootstrapImageDirectories;
  const scopedSearchPackagesEffective = useMemo(() => {
    if (!shouldUseImageSidebarSnapshot) {
      return imagePackagesFromLibrary;
    }
    return resolvePreferredSidebarSources(
      sidebarSnapshot?.imagePackages,
      imagePackagesFromLibrary,
      bootstrapImagePackages,
    );
  }, [
    bootstrapImagePackages,
    imagePackagesFromLibrary,
    shouldUseImageSidebarSnapshot,
    sidebarSnapshot,
  ]);

  const scopedSearchDirectoriesEffective = useMemo(() => {
    if (!shouldUseImageSidebarSnapshot) {
      return imageDirectoriesFromLibrary;
    }
    return resolvePreferredSidebarSources(
      sidebarSnapshot?.imageDirectories,
      imageDirectoriesFromLibrary,
      bootstrapImageDirectories,
    );
  }, [
    bootstrapImageDirectories,
    imageDirectoriesFromLibrary,
    shouldUseImageSidebarSnapshot,
    sidebarSnapshot,
  ]);
  const scopedImageSourcesEffective = useMemo(
    () => [
      ...scopedSearchPackagesEffective,
      ...scopedSearchDirectoriesEffective,
    ],
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  );
  const videosEffective = librarySnapshotEffective?.videos ?? bootstrapVideos;
  const audiosEffective = librarySnapshotEffective?.audios ?? bootstrapAudios;
  // 结构性分页：侧边栏源不再携带全库 images，按需加载当前包并合并。
  // 仅当源已知、images 为空（未加载）且确有图片（imageCount>0）时才触发加载，
  // 因此在旧链路（源已带 images）下本段完全惰性、零运行时影响。
  const neededSourceIds = useMemo(() => {
    const candidateIds = new Set<string>();
    if (selectedPackageId) {
      candidateIds.add(selectedPackageId);
    }
    // 向量检索结果横跨多个源，逐个确保加载以正常显示缩略图
    if (vectorResultsActive) {
      for (const candidate of vectorSearchResults) {
        candidateIds.add(candidate.packageId);
      }
    }
    // ad-review 结果横跨多个源（按候选包），逐源加载以正常显示与默认选中计数
    for (const sourceId of adReviewResultSourceIds) {
      candidateIds.add(sourceId);
    }
    if (candidateIds.size === 0) {
      return [];
    }
    const sourceById = new Map(
      scopedImageSourcesEffective.map((item) => [item.id, item]),
    );
    const result: string[] = [];
    for (const id of candidateIds) {
      const source = sourceById.get(id);
      // 仅当源已知、images 为空（未加载）且确有图片时才需要按需加载
      if (
        source &&
        source.images.length === 0 &&
        resolveSourceImageCount(source) > 0
      ) {
        result.push(id);
      }
    }
    return result;
  }, [
    scopedImageSourcesEffective,
    selectedPackageId,
    vectorResultsActive,
    vectorSearchResults,
    adReviewResultSourceIds,
  ]);
  const sidebarSnapshotForGeneration =
    backendRead.sidebar.data ?? backendRead.sidebar.snapshot;
  const [sourceCacheGeneration, setSourceCacheGeneration] = useState(0);
  const prevSidebarSnapshotRef = useRef(sidebarSnapshotForGeneration);
  useEffect(() => {
    if (prevSidebarSnapshotRef.current !== sidebarSnapshotForGeneration) {
      prevSidebarSnapshotRef.current = sidebarSnapshotForGeneration;
      setSourceCacheGeneration((value) => value + 1);
    }
  }, [sidebarSnapshotForGeneration]);
  const sourceImageCache = useSourceImageCache({
    repository: mediaRepository,
    neededSourceIds,
    includeHidden,
    generation: sourceCacheGeneration,
  });
  const packageByIdEffective = useMemo(() => {
    const map = new Map<string, ImagePackage>();
    for (const source of scopedImageSourcesEffective) {
      const cachedImages = sourceImageCache.get(source.id);
      map.set(
        source.id,
        cachedImages && source.images.length === 0
          ? { ...source, images: cachedImages }
          : source,
      );
    }
    return map;
  }, [scopedImageSourcesEffective, sourceImageCache]);
  const validImageIdSet = useMemo(() => {
    if (isMusicMode) {
      return new Set(audiosEffective.map((audio) => audio.id));
    }

    if (!isImageMode) {
      return new Set<string>();
    }

    const next = new Set<string>();
    for (const source of packageByIdEffective.values()) {
      for (const image of source.images) {
        next.add(image.id);
      }
    }
    // ad-review 候选 id 始终视为有效，避免按需加载窗口内被 useManageSelection 剪枝
    for (const imageId of adReviewResultImageIds) {
      next.add(imageId);
    }
    return next;
  }, [
    audiosEffective,
    isImageMode,
    isMusicMode,
    packageByIdEffective,
    adReviewResultImageIds,
  ]);
  const videoByIdEffective = useMemo(
    () => new Map(videosEffective.map((video) => [video.id, video])),
    [videosEffective],
  );
  const audioByIdEffective = useMemo(
    () => new Map(audiosEffective.map((audio) => [audio.id, audio])),
    [audiosEffective],
  );
  const sidebarTreeSnapshot = sidebarSnapshot?.tree ?? null;

  useScopedImageSourceStateSync({
    scopedImageSources: scopedImageSourcesEffective,
    setFocusByPackage,
    setPageByPackage,
    setGradeByPackage,
  });

  const imageTreeRawLocal = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? buildImageSidebarTree(
            scopedSearchPackagesEffective,
            scopedSearchDirectoriesEffective,
          )
        : [],
    [
      scopedSearchDirectoriesEffective,
      scopedSearchPackagesEffective,
      shouldUseImageSidebarSnapshot,
    ],
  );
  const imageTreeRaw = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? (sidebarTreeSnapshot ?? imageTreeRawLocal)
        : imageTreeRawLocal,
    [imageTreeRawLocal, shouldUseImageSidebarSnapshot, sidebarTreeSnapshot],
  );

  const imageRootNode = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? findNodeById(imageTreeRaw, imageRootNodeId)
        : null,
    [imageRootNodeId, imageTreeRaw, shouldUseImageSidebarSnapshot],
  );

  const rootScopedImageData = useRootScopedImageData({
    imageRootNode,
    scopedImageSources: shouldUseImageSidebarSnapshot
      ? scopedImageSourcesEffective
      : [],
  });

  const rootScopedPackageIds = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? rootScopedImageData.rootScopedPackageIds
        : new Set<string>(),
    [rootScopedImageData.rootScopedPackageIds, shouldUseImageSidebarSnapshot],
  );
  const rootScopedPackages = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? rootScopedImageData.rootScopedPackages
        : [],
    [rootScopedImageData.rootScopedPackages, shouldUseImageSidebarSnapshot],
  );
  const allScopedRefs = useMemo(
    () => (isImageMode ? rootScopedImageData.allScopedRefs : []),
    [isImageMode, rootScopedImageData.allScopedRefs],
  );

  const {
    imageTreeForSidebarNormal,
    normalImageSourceNodeIdMap: normalImageSourceNodeIdMapFromTree,
  } = useImageSidebarBaseState({
    imageTreeRaw,
    imageRootNode,
    sidebarTreeDisplayMode,
  });

  const normalImageSourceNodeIdMap = useMemo(
    () =>
      shouldUseImageSidebarSnapshot
        ? normalImageSourceNodeIdMapFromTree
        : buildImageSourceNodeIdMapFromSources(
            scopedSearchPackagesEffective,
            scopedSearchDirectoriesEffective,
          ),
    [
      normalImageSourceNodeIdMapFromTree,
      scopedSearchDirectoriesEffective,
      scopedSearchPackagesEffective,
      shouldUseImageSidebarSnapshot,
    ],
  );

  const vectorSidebarState = useMemo(
    () =>
      isImageMode
        ? buildVectorSidebarState(vectorSearchResults, packageByIdEffective)
        : { nodes: [], packageNodeIdMap: new Map<string, string>() },
    [isImageMode, packageByIdEffective, vectorSearchResults],
  );

  const vectorSidebarNodes = vectorSidebarState.nodes;
  const vectorResultPackageNodeIdMap = vectorSidebarState.packageNodeIdMap;

  const imageTreeForSidebar = useMemo(() => {
    if (!shouldUseImageSidebarSnapshot) {
      return [];
    }
    if (isImageMode && vectorResultsActive) {
      return vectorSidebarNodes;
    }
    return imageTreeForSidebarNormal;
  }, [
    imageTreeForSidebarNormal,
    isImageMode,
    shouldUseImageSidebarSnapshot,
    vectorResultsActive,
    vectorSidebarNodes,
  ]);

  const imageNodeLoadStateById = useMemo(() => {
    if (!isImageMode) {
      return {};
    }

    return buildImageNodeLoadState({
      archiveLoadStatus,
      imageTreeForSidebar,
      scopedImageSources: scopedImageSourcesEffective,
      normalizePathForCompare,
    });
  }, [
    archiveLoadStatus,
    imageTreeForSidebar,
    isImageMode,
    scopedImageSourcesEffective,
  ]);

  const normalizedVideoFeatureFilter = useMemo(
    () => ({
      nameQuery: featureNameQuery.trim().toLocaleLowerCase("zh-CN"),
      workTitleQuery: featureWorkTitleQuery.trim().toLocaleLowerCase("zh-CN"),
      seriesIdQuery: featureSeriesIdQuery.trim().toLocaleLowerCase("zh-CN"),
      circleQuery: featureCircleQuery.trim().toLocaleLowerCase("zh-CN"),
      authorQuery: featureAuthorQuery.trim().toLocaleLowerCase("zh-CN"),
      tags: featureTags
        .map((tag) => tag.trim().toLocaleLowerCase("zh-CN"))
        .filter(Boolean),
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
  );

  const searchedVideos = useMemo(() => {
    if (mode !== "video" || !featureSearchActive) {
      return videosEffective;
    }

    const textIncludes = (value: string, query: string) =>
      query.length === 0 || value.toLocaleLowerCase("zh-CN").includes(query);

    return videosEffective.filter((video) => {
      if (normalizedVideoFeatureFilter.nameQuery.length > 0) {
        const matched =
          textIncludes(
            video.fileName,
            normalizedVideoFeatureFilter.nameQuery,
          ) ||
          textIncludes(
            video.absolutePath,
            normalizedVideoFeatureFilter.nameQuery,
          );
        if (!matched) {
          return false;
        }
      }

      if (
        ![video.workTitle, video.workTitleJpn ?? ""].some((value) =>
          textIncludes(value, normalizedVideoFeatureFilter.workTitleQuery),
        )
      ) {
        return false;
      }

      if (
        !textIncludes(
          video.seriesId ?? "",
          normalizedVideoFeatureFilter.seriesIdQuery,
        )
      ) {
        return false;
      }

      if (
        ![video.circle, video.circleJpn ?? ""].some((value) =>
          textIncludes(value, normalizedVideoFeatureFilter.circleQuery),
        )
      ) {
        return false;
      }

      if (
        ![video.author, video.authorJpn ?? ""].some((value) =>
          textIncludes(value, normalizedVideoFeatureFilter.authorQuery),
        )
      ) {
        return false;
      }

      if (normalizedVideoFeatureFilter.tags.length > 0) {
        const lowerTags = video.tags.map((tag) =>
          tag.toLocaleLowerCase("zh-CN"),
        );
        const matched = normalizedVideoFeatureFilter.tags.every((tag) =>
          lowerTags.includes(tag),
        );
        if (!matched) {
          return false;
        }
      }

      if (normalizedVideoFeatureFilter.grade !== null) {
        const grade = video.grade ?? 0;
        if (grade !== normalizedVideoFeatureFilter.grade) {
          return false;
        }
      }

      return true;
    });
  }, [
    featureSearchActive,
    mode,
    normalizedVideoFeatureFilter,
    videosEffective,
  ]);

  const normalizedAudioFeatureFilter = useMemo(
    () => ({
      nameQuery: featureNameQuery.trim().toLocaleLowerCase("zh-CN"),
      workTitleQuery: featureWorkTitleQuery.trim().toLocaleLowerCase("zh-CN"),
      seriesIdQuery: featureSeriesIdQuery.trim().toLocaleLowerCase("zh-CN"),
      circleQuery: featureCircleQuery.trim().toLocaleLowerCase("zh-CN"),
      authorQuery: featureAuthorQuery.trim().toLocaleLowerCase("zh-CN"),
    }),
    [
      featureAuthorQuery,
      featureCircleQuery,
      featureNameQuery,
      featureSeriesIdQuery,
      featureWorkTitleQuery,
    ],
  );

  const searchedAudios = useMemo(() => {
    if (mode !== "music" || !featureSearchActive) {
      return audiosEffective;
    }

    const textIncludes = (value: string, query: string) =>
      query.length === 0 || value.toLocaleLowerCase("zh-CN").includes(query);

    return audiosEffective.filter((audio) => {
      if (normalizedAudioFeatureFilter.nameQuery.length > 0) {
        const matched =
          textIncludes(
            audio.fileName,
            normalizedAudioFeatureFilter.nameQuery,
          ) ||
          textIncludes(
            audio.absolutePath,
            normalizedAudioFeatureFilter.nameQuery,
          );
        if (!matched) {
          return false;
        }
      }

      if (
        !textIncludes(
          audio.trackTitle,
          normalizedAudioFeatureFilter.workTitleQuery,
        )
      ) {
        return false;
      }

      if (
        !textIncludes(
          audio.seriesId ?? "",
          normalizedAudioFeatureFilter.seriesIdQuery,
        )
      ) {
        return false;
      }

      if (
        !textIncludes(audio.album, normalizedAudioFeatureFilter.circleQuery)
      ) {
        return false;
      }

      if (
        !textIncludes(audio.author, normalizedAudioFeatureFilter.authorQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [
    audiosEffective,
    featureSearchActive,
    mode,
    normalizedAudioFeatureFilter,
  ]);

  const {
    videoRootNode,
    rootScopedVideoIds,
    videosForSidebar,
    videoTreeForSidebar,
  } = useVideoSidebarState({
    videos: shouldExposeVideoSidebar ? searchedVideos : [],
    videoRootNodeId,
    sidebarTreeDisplayMode,
  });

  const {
    musicRootNode,
    rootScopedAudioIds,
    audiosForSidebar,
    audioTreeForSidebar,
  } = useAudioSidebarState({
    audios: isMusicMode ? searchedAudios : [],
    musicRootNodeId,
    sidebarTreeDisplayMode,
  });

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
      setSelectedAudioId(audioId);
      setAudioPlaylistIds((previous) => {
        if (previous.includes(audioId)) {
          return previous;
        }
        return [...previous, audioId];
      });
    },
    onSetSidebarFocusMain: () => {
      updateSettings({ sidebarFocus: "main" });
    },
    onSetImageRootNodeId: (nodeId) => {
      updateSettings({ imageRootNodeId: nodeId });
    },
    onSetVideoRootNodeId: (nodeId) => {
      updateSettings({ videoRootNodeId: nodeId });
    },
    onSetMusicRootNodeId: (nodeId) => {
      updateSettings({ musicRootNodeId: nodeId });
    },
  });

  const sidebarDescendantNodeIdsById = useMemo(() => {
    const next = new Map<string, string[]>();
    const collectDescendantIds = (
      node: (typeof flatSidebarNodes)[number],
    ): string[] => {
      const descendants: string[] = [];
      const walk = (children: typeof node.children) => {
        for (const child of children) {
          descendants.push(child.id);
          if (child.children.length > 0) {
            walk(child.children);
          }
        }
      };

      if (node.children.length > 0) {
        walk(node.children);
      }
      return descendants;
    };

    for (const node of flatSidebarNodes) {
      next.set(node.id, collectDescendantIds(node));
    }
    return next;
  }, [flatSidebarNodes]);

  const flatSidebarNodeIds = useMemo(
    () => flatSidebarNodes.map((node) => node.id),
    [flatSidebarNodes],
  );

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
  });

  const sidebarOrderedImageSourceIds = useMemo(() => {
    const orderedIds: string[] = [];
    const seen = new Set<string>();

    for (const node of flatSidebarNodes) {
      const sourceId = node.imageSourceId;
      if (!sourceId || seen.has(sourceId)) {
        continue;
      }
      if (
        !rootScopedPackageIds.has(sourceId) ||
        !packageByIdEffective.has(sourceId)
      ) {
        continue;
      }
      seen.add(sourceId);
      orderedIds.push(sourceId);
    }

    if (orderedIds.length > 0) {
      return orderedIds;
    }

    return rootScopedPackages.map((pkg) => pkg.id);
  }, [
    flatSidebarNodes,
    packageByIdEffective,
    rootScopedPackageIds,
    rootScopedPackages,
  ]);

  const orderedRootScopedPackages = useMemo(() => {
    if (!shouldUseImageSidebarSnapshot) {
      return [];
    }

    return sidebarOrderedImageSourceIds
      .map((sourceId) => packageByIdEffective.get(sourceId))
      .filter((pkg): pkg is ImagePackage => Boolean(pkg));
  }, [
    packageByIdEffective,
    shouldUseImageSidebarSnapshot,
    sidebarOrderedImageSourceIds,
  ]);

  const orderedRootScopedImageRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = [];
    for (const pkg of orderedRootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex });
      });
    }
    return refs;
  }, [orderedRootScopedPackages]);

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
  };
}
