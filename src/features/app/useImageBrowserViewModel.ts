import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  BrowserMode,
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  VectorCandidate,
} from "../../types";
import { clamp } from "../../utils/ui";
import { resolveSourceImageCount } from "../../utils/mediaHelpers";
import {
  resolveFullscreenImageNavigationEnabled,
  type FullscreenImageNavigationSource,
} from "../../utils/fullscreenAutoplay";

interface UseImageBrowserViewModelParams {
  mode: BrowserMode;
  selectedPackageId: string;
  setSelectedPackageId: Dispatch<SetStateAction<string>>;
  imageFocusActive: boolean;
  setImageFocusActive: Dispatch<SetStateAction<boolean>>;
  focusByPackage: Record<string, number>;
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>;
  pageByPackage: Record<string, number>;
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>;
  vectorSearchResults: VectorCandidate[];
  vectorFocusIndex: number;
  setVectorFocusIndex: Dispatch<SetStateAction<number>>;
  vectorPage: number;
  setVectorPage: Dispatch<SetStateAction<number>>;
  gradeByPackage: Record<string, number | null>;
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>;
  packageById: Map<string, ImagePackage>;
  orderedRootScopedPackages: ImagePackage[];
  vectorResultsActive: boolean;
  showNamesOnly: boolean;
  thumbnailColumns: number;
  pagedPageSize: number;
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  fullscreenVideoFocus: boolean;
}

interface UseImageBrowserViewModelResult {
  activePackage: ImagePackage | null;
  focusedRef: FocusedImageRef | null;
  focusedImage: ImageItem | null;
  focusedImagePackage: ImagePackage | null;
  metadataImagePackage: ImagePackage | null;
  currentGrade: number | null;
  visibleImageRefs: FocusedImageRef[];
  imageTotalPages: number;
  normalizedPageIndex: number;
  pageStart: number;
  refsInPage: FocusedImageRef[];
  setImageFocus: (packageId: string, imageIndex: number) => void;
  moveImage: (delta: number, source?: FullscreenImageNavigationSource) => void;
  moveImageVertical: (direction: "up" | "down") => void;
  jumpImageBoundary: (target: "first" | "last") => void;
  goPackage: (delta: number) => void;
  setPackageGrade: (grade: number | null) => void;
  goPrevPage: () => void;
  goNextPage: () => void;
  goPageByDelta: (delta: number) => void;
}

export function useImageBrowserViewModel({
  mode,
  selectedPackageId,
  setSelectedPackageId,
  imageFocusActive,
  setImageFocusActive,
  focusByPackage,
  setFocusByPackage,
  pageByPackage,
  setPageByPackage,
  vectorSearchResults,
  vectorFocusIndex,
  setVectorFocusIndex,
  vectorPage,
  setVectorPage,
  gradeByPackage,
  setGradeByPackage,
  packageById,
  orderedRootScopedPackages,
  vectorResultsActive,
  showNamesOnly,
  thumbnailColumns,
  pagedPageSize,
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
}: UseImageBrowserViewModelParams): UseImageBrowserViewModelResult {
  const canNavigateImageInFullscreenManualContext =
    resolveFullscreenImageNavigationEnabled({
      fullscreenActive,
      fullscreenDisplay,
      fullscreenVideoFocus,
      source: "manual",
    });

  const canNavigateImageInCurrentContext =
    mode === "image" || canNavigateImageInFullscreenManualContext;

  const activePackage =
    packageById.get(selectedPackageId) ?? orderedRootScopedPackages[0] ?? null;

  const activeVectorRef = vectorSearchResults[vectorFocusIndex];
  const focusedRef = useMemo<FocusedImageRef | null>(() => {
    if (mode === "image" && vectorResultsActive) {
      if (!activeVectorRef) {
        return null;
      }
      return {
        packageId: activeVectorRef.packageId,
        imageIndex: activeVectorRef.imageIndex,
      };
    }

    if (!activePackage || !imageFocusActive) {
      return null;
    }

    return {
      packageId: activePackage.id,
      imageIndex: clamp(
        focusByPackage[activePackage.id] ?? 0,
        0,
        resolveSourceImageCount(activePackage) - 1,
      ),
    };
  }, [
    activePackage,
    activeVectorRef,
    focusByPackage,
    imageFocusActive,
    mode,
    vectorResultsActive,
  ]);

  const focusedImage = useMemo(() => {
    if (!focusedRef) {
      return null;
    }
    return (
      packageById.get(focusedRef.packageId)?.images[focusedRef.imageIndex] ??
      null
    );
  }, [focusedRef, packageById]);

  const focusedImagePackage = useMemo(() => {
    if (!focusedRef) {
      return null;
    }
    return packageById.get(focusedRef.packageId) ?? null;
  }, [focusedRef, packageById]);

  const metadataImagePackage = focusedImagePackage ?? activePackage;

  const currentGrade =
    mode === "image" && metadataImagePackage
      ? (gradeByPackage[metadataImagePackage.id] ?? null)
      : null;

  const visibleImageRefs = useMemo(() => {
    if (mode !== "image") {
      return [];
    }

    if (vectorResultsActive) {
      return vectorSearchResults.map((candidate) => ({
        packageId: candidate.packageId,
        imageIndex: candidate.imageIndex,
      }));
    }

    if (!activePackage) {
      return [];
    }

    return Array.from(
      { length: resolveSourceImageCount(activePackage) },
      (_, imageIndex) => ({
        packageId: activePackage.id,
        imageIndex,
      }),
    );
  }, [activePackage, mode, vectorResultsActive, vectorSearchResults]);

  const imagePageIndex = showNamesOnly
    ? 0
    : vectorResultsActive
      ? vectorPage
      : (pageByPackage[selectedPackageId] ?? 0);
  const imageTotalPages = showNamesOnly
    ? 1
    : Math.max(1, Math.ceil(visibleImageRefs.length / pagedPageSize));
  const normalizedPageIndex = showNamesOnly
    ? 0
    : clamp(imagePageIndex, 0, imageTotalPages - 1);
  const pageStart = showNamesOnly ? 0 : normalizedPageIndex * pagedPageSize;
  const pageEnd = showNamesOnly
    ? visibleImageRefs.length
    : pageStart + pagedPageSize;
  const refsInPage = showNamesOnly
    ? visibleImageRefs
    : visibleImageRefs.slice(pageStart, pageEnd);

  const setImageFocus = useCallback(
    (packageId: string, imageIndex: number) => {
      const pkg = packageById.get(packageId);
      if (!pkg) {
        return;
      }

      const clampedIndex = clamp(
        imageIndex,
        0,
        resolveSourceImageCount(pkg) - 1,
      );
      setImageFocusActive(true);
      setSelectedPackageId(packageId);
      setFocusByPackage((previous) => ({
        ...previous,
        [packageId]: clampedIndex,
      }));
      setPageByPackage((previous) => ({
        ...previous,
        [packageId]: Math.floor(clampedIndex / pagedPageSize),
      }));
    },
    [
      packageById,
      pagedPageSize,
      setFocusByPackage,
      setImageFocusActive,
      setPageByPackage,
      setSelectedPackageId,
    ],
  );

  const moveImage = useCallback(
    (delta: number, source: FullscreenImageNavigationSource = "manual") => {
      const canNavigateBySource =
        source === "autoplay"
          ? resolveFullscreenImageNavigationEnabled({
              fullscreenActive,
              fullscreenDisplay,
              fullscreenVideoFocus,
              source,
            })
          : canNavigateImageInCurrentContext;

      if (!canNavigateBySource) {
        return;
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return;
        }

        const currentIndex = clamp(
          vectorFocusIndex,
          0,
          vectorSearchResults.length - 1,
        );
        const nextIndex = clamp(
          currentIndex + delta,
          0,
          vectorSearchResults.length - 1,
        );
        const nextRef = vectorSearchResults[nextIndex];
        if (!nextRef) {
          return;
        }

        setVectorFocusIndex(nextIndex);
        setImageFocus(nextRef.packageId, nextRef.imageIndex);
        return;
      }

      if (!activePackage) {
        return;
      }

      const current = focusByPackage[activePackage.id] ?? 0;
      const activeImageCount = resolveSourceImageCount(activePackage);
      const target = current + delta;

      // 非全屏：包内移动（越界由 setImageFocus 内部 clamp 处理）
      if (!fullscreenActive) {
        setImageFocus(activePackage.id, target);
        return;
      }

      // 全屏包内：目标落在当前包范围内直接移动
      if (target >= 0 && target < activeImageCount) {
        setImageFocus(activePackage.id, target);
        return;
      }

      // 全屏跨包：按 sidebar 顺序（orderedRootScopedPackages）定位相邻包。
      // 不依赖 orderedRootScopedImageRefs —— 结构性分页后该扁平列表仅含「已加载 images」的包，
      // 用它跨包会跳到非顺序的包（问题1），autoplay 到包末尾也会停在原地（问题5）。
      // 注：moveImage 的 delta 实际恒为 ±1（手动翻页 / 滚轮逐页 / autoplay），跨包只需跳到相邻包首/末张。
      const packageIndex =
        orderedRootScopedPackages.length > 0
          ? orderedRootScopedPackages.findIndex(
              (pkg) => pkg.id === activePackage.id,
            )
          : -1;

      if (packageIndex < 0) {
        // 无有序包信息：退化为包内 clamp
        setImageFocus(activePackage.id, target);
        return;
      }

      if (target >= activeImageCount) {
        const nextPackage = orderedRootScopedPackages[packageIndex + 1];
        if (!nextPackage) {
          // 已是最后一个包：停在当前末张（全库末尾，不循环）
          setImageFocus(activePackage.id, activeImageCount - 1);
          return;
        }
        setImageFocus(nextPackage.id, 0);
        return;
      }

      // target < 0：越过头部 → 上一个包最后一张
      const previousPackage = orderedRootScopedPackages[packageIndex - 1];
      if (!previousPackage) {
        setImageFocus(activePackage.id, 0);
        return;
      }
      setImageFocus(
        previousPackage.id,
        resolveSourceImageCount(previousPackage) - 1,
      );
    },
    [
      activePackage,
      canNavigateImageInCurrentContext,
      focusByPackage,
      fullscreenActive,
      fullscreenDisplay,
      fullscreenVideoFocus,
      orderedRootScopedPackages,
      setImageFocus,
      setVectorFocusIndex,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  );

  const moveImageVertical = useCallback(
    (direction: "up" | "down") => {
      if (!canNavigateImageInCurrentContext) {
        return;
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return;
        }

        const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns);
        const currentIndex = clamp(
          vectorFocusIndex,
          0,
          vectorSearchResults.length - 1,
        );
        const candidate =
          direction === "up" ? currentIndex - step : currentIndex + step;
        const nextIndex = clamp(candidate, 0, vectorSearchResults.length - 1);
        const nextRef = vectorSearchResults[nextIndex];
        if (!nextRef) {
          return;
        }

        setVectorFocusIndex(nextIndex);
        setImageFocus(nextRef.packageId, nextRef.imageIndex);
        return;
      }

      if (!activePackage) {
        return;
      }

      const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns);
      const current = focusByPackage[activePackage.id] ?? 0;
      const candidate = direction === "up" ? current - step : current + step;

      if (candidate < 0) {
        setImageFocus(activePackage.id, 0);
        return;
      }

      if (candidate >= resolveSourceImageCount(activePackage)) {
        setImageFocus(
          activePackage.id,
          resolveSourceImageCount(activePackage) - 1,
        );
        return;
      }

      setImageFocus(activePackage.id, candidate);
    },
    [
      activePackage,
      canNavigateImageInCurrentContext,
      focusByPackage,
      setImageFocus,
      setVectorFocusIndex,
      showNamesOnly,
      thumbnailColumns,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  );

  const jumpImageBoundary = useCallback(
    (target: "first" | "last") => {
      if (!canNavigateImageInCurrentContext) {
        return;
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return;
        }

        const nextIndex =
          target === "first" ? 0 : vectorSearchResults.length - 1;
        const nextRef = vectorSearchResults[nextIndex];
        if (!nextRef) {
          return;
        }

        setVectorFocusIndex(nextIndex);
        setImageFocus(nextRef.packageId, nextRef.imageIndex);
        return;
      }

      if (!activePackage) {
        return;
      }

      const nextIndex =
        target === "first" ? 0 : resolveSourceImageCount(activePackage) - 1;
      setImageFocus(activePackage.id, nextIndex);
    },
    [
      activePackage,
      canNavigateImageInCurrentContext,
      setImageFocus,
      setVectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  );

  const goPackage = useCallback(
    (delta: number) => {
      if (!canNavigateImageInCurrentContext || vectorResultsActive) {
        return;
      }

      if (orderedRootScopedPackages.length === 0) {
        return;
      }

      const currentIndexInList = orderedRootScopedPackages.findIndex(
        (pkg) => pkg.id === selectedPackageId,
      );
      const safeCurrent = currentIndexInList >= 0 ? currentIndexInList : 0;
      const nextIndex = clamp(
        safeCurrent + delta,
        0,
        orderedRootScopedPackages.length - 1,
      );
      const nextPackage = orderedRootScopedPackages[nextIndex];
      if (!nextPackage) {
        return;
      }

      setSelectedPackageId(nextPackage.id);
    },
    [
      canNavigateImageInCurrentContext,
      orderedRootScopedPackages,
      selectedPackageId,
      setSelectedPackageId,
      vectorResultsActive,
    ],
  );

  const setPackageGrade = useCallback(
    (grade: number | null) => {
      if (mode !== "image" || !metadataImagePackage) {
        return;
      }

      setGradeByPackage((previous) => ({
        ...previous,
        [metadataImagePackage.id]: grade,
      }));
    },
    [metadataImagePackage, mode, setGradeByPackage],
  );

  const goPrevPage = useCallback(() => {
    if (showNamesOnly) {
      return;
    }

    if (vectorResultsActive) {
      setVectorPage((value) => clamp(value - 1, 0, imageTotalPages - 1));
      return;
    }

    setPageByPackage((previous) => ({
      ...previous,
      [selectedPackageId]: clamp(
        (previous[selectedPackageId] ?? 0) - 1,
        0,
        imageTotalPages - 1,
      ),
    }));
  }, [
    imageTotalPages,
    selectedPackageId,
    setPageByPackage,
    setVectorPage,
    showNamesOnly,
    vectorResultsActive,
  ]);

  const goNextPage = useCallback(() => {
    if (showNamesOnly) {
      return;
    }

    if (vectorResultsActive) {
      setVectorPage((value) => clamp(value + 1, 0, imageTotalPages - 1));
      return;
    }

    setPageByPackage((previous) => ({
      ...previous,
      [selectedPackageId]: clamp(
        (previous[selectedPackageId] ?? 0) + 1,
        0,
        imageTotalPages - 1,
      ),
    }));
  }, [
    imageTotalPages,
    selectedPackageId,
    setPageByPackage,
    setVectorPage,
    showNamesOnly,
    vectorResultsActive,
  ]);

  const goPageByDelta = useCallback(
    (delta: number) => {
      if (showNamesOnly || delta === 0) {
        return;
      }

      if (vectorResultsActive) {
        setVectorPage((value) => clamp(value + delta, 0, imageTotalPages - 1));
        return;
      }

      setPageByPackage((previous) => ({
        ...previous,
        [selectedPackageId]: clamp(
          (previous[selectedPackageId] ?? 0) + delta,
          0,
          imageTotalPages - 1,
        ),
      }));
    },
    [
      imageTotalPages,
      selectedPackageId,
      setPageByPackage,
      setVectorPage,
      showNamesOnly,
      vectorResultsActive,
    ],
  );

  return {
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    setPackageGrade,
    goPrevPage,
    goNextPage,
    goPageByDelta,
  };
}
