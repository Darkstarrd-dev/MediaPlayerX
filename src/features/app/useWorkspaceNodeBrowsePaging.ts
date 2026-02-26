import { useEffect, useState } from "react";

interface UseWorkspaceNodeBrowsePagingParams {
  nodeBrowseMode: boolean;
  nodeBrowseNodeId: string;
  nodeBrowseItemsLength: number;
  pagedPageSize: number;
  adReviewResultsMode: boolean;
  imageTotalPagesForMain: number;
  normalizedPageIndexForMain: number;
  setAdReviewPageIndex: React.Dispatch<React.SetStateAction<number>>;
  goPrevPage: () => void;
  goNextPage: () => void;
  goPageByDelta: (delta: number) => void;
}

interface UseWorkspaceNodeBrowsePagingResult {
  nodeBrowsePageStart: number;
  nodeBrowsePageSize: number;
  nodeBrowseNormalizedPageIndex: number;
  nodeBrowseTotalPages: number;
  normalizedPageIndexForFooterWithPreview: number;
  imageTotalPagesForFooter: number;
  onPrevPageForMain: () => void;
  onNextPageForMain: () => void;
  onThumbnailWheelTurnPage: (delta: number) => void;
  onThumbnailWheelDeltaPreview: (accumulatedDelta: number) => void;
}

export function useWorkspaceNodeBrowsePaging({
  nodeBrowseMode,
  nodeBrowseNodeId,
  nodeBrowseItemsLength,
  pagedPageSize,
  adReviewResultsMode,
  imageTotalPagesForMain,
  normalizedPageIndexForMain,
  setAdReviewPageIndex,
  goPrevPage,
  goNextPage,
  goPageByDelta,
}: UseWorkspaceNodeBrowsePagingParams): UseWorkspaceNodeBrowsePagingResult {
  const [nodeBrowsePageByNodeId, setNodeBrowsePageByNodeId] = useState<
    Record<string, number>
  >({});
  const [wheelTargetPage, setWheelTargetPage] = useState<number | null>(null);

  const nodeBrowsePageSize = Math.max(1, pagedPageSize);
  const nodeBrowseRawPageIndex =
    nodeBrowseNodeId && nodeBrowsePageByNodeId[nodeBrowseNodeId] != null
      ? nodeBrowsePageByNodeId[nodeBrowseNodeId]
      : 0;
  const nodeBrowseTotalPages = nodeBrowseMode
    ? Math.max(1, Math.ceil(nodeBrowseItemsLength / nodeBrowsePageSize))
    : 1;
  const nodeBrowseNormalizedPageIndex = nodeBrowseMode
    ? Math.max(0, Math.min(nodeBrowseTotalPages - 1, nodeBrowseRawPageIndex))
    : 0;
  const nodeBrowsePageStart = nodeBrowseMode
    ? nodeBrowseNormalizedPageIndex * nodeBrowsePageSize
    : 0;

  useEffect(() => {
    if (!nodeBrowseMode || !nodeBrowseNodeId) {
      return;
    }
    if (nodeBrowseRawPageIndex === nodeBrowseNormalizedPageIndex) {
      return;
    }
    setNodeBrowsePageByNodeId((previous) => ({
      ...previous,
      [nodeBrowseNodeId]: nodeBrowseNormalizedPageIndex,
    }));
  }, [
    nodeBrowseMode,
    nodeBrowseNodeId,
    nodeBrowseNormalizedPageIndex,
    nodeBrowseRawPageIndex,
  ]);

  const setNodeBrowsePage = (updater: (value: number) => number) => {
    if (!nodeBrowseMode || !nodeBrowseNodeId) {
      return;
    }
    setNodeBrowsePageByNodeId((previous) => {
      const currentRaw = previous[nodeBrowseNodeId] ?? 0;
      const current = Math.max(0, Math.min(nodeBrowseTotalPages - 1, currentRaw));
      const next = Math.max(0, Math.min(nodeBrowseTotalPages - 1, updater(current)));
      if (next === currentRaw) {
        return previous;
      }
      return {
        ...previous,
        [nodeBrowseNodeId]: next,
      };
    });
  };

  const onPrevPageForMain = nodeBrowseMode
    ? () => setNodeBrowsePage((value) => value - 1)
    : adReviewResultsMode
      ? () => setAdReviewPageIndex((value) => Math.max(0, value - 1))
      : goPrevPage;
  const onNextPageForMain = nodeBrowseMode
    ? () => setNodeBrowsePage((value) => value + 1)
    : adReviewResultsMode
      ? () =>
          setAdReviewPageIndex((value) =>
            Math.min(Math.max(0, imageTotalPagesForMain - 1), value + 1),
          )
      : goNextPage;
  const normalizedPageIndexForFooter = nodeBrowseMode
    ? nodeBrowseNormalizedPageIndex
    : normalizedPageIndexForMain;
  const imageTotalPagesForFooter = nodeBrowseMode
    ? nodeBrowseTotalPages
    : imageTotalPagesForMain;

  const onThumbnailWheelDeltaPreview = (accumulatedDelta: number) => {
    if (accumulatedDelta === 0) {
      return;
    }
    setWheelTargetPage(
      Math.max(
        0,
        Math.min(
          imageTotalPagesForFooter - 1,
          normalizedPageIndexForFooter + accumulatedDelta,
        ),
      ),
    );
  };

  useEffect(() => {
    if (wheelTargetPage === null) {
      return;
    }
    if (normalizedPageIndexForFooter === wheelTargetPage) {
      setWheelTargetPage(null);
    }
  }, [normalizedPageIndexForFooter, wheelTargetPage]);

  useEffect(() => {
    if (wheelTargetPage === null) {
      return;
    }
    const timer = setTimeout(() => setWheelTargetPage(null), 2000);
    return () => clearTimeout(timer);
  }, [wheelTargetPage]);

  const normalizedPageIndexForFooterWithPreview =
    wheelTargetPage ?? normalizedPageIndexForFooter;

  const onThumbnailWheelTurnPage = (delta: number) => {
    if (nodeBrowseMode) {
      setNodeBrowsePage((value) => value + delta);
      return;
    }
    if (adReviewResultsMode) {
      setAdReviewPageIndex((value) => {
        const maxPage = Math.max(0, imageTotalPagesForMain - 1);
        return Math.max(0, Math.min(maxPage, value + delta));
      });
      return;
    }
    goPageByDelta(delta);
  };

  return {
    nodeBrowsePageStart,
    nodeBrowsePageSize,
    nodeBrowseNormalizedPageIndex,
    nodeBrowseTotalPages,
    normalizedPageIndexForFooterWithPreview,
    imageTotalPagesForFooter,
    onPrevPageForMain,
    onNextPageForMain,
    onThumbnailWheelTurnPage,
    onThumbnailWheelDeltaPreview,
  };
}
