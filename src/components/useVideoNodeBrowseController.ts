import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface VideoNodeBrowseItem {
  nodeId: string;
  videoId?: string;
}

interface UseVideoNodeBrowseControllerOptions<
  TNodeBrowseItem extends VideoNodeBrowseItem,
> {
  nodeBrowseMode: boolean;
  nodeBrowseItems: TNodeBrowseItem[];
  nodeBrowsePageStart: number;
  nodeBrowsePageSize: number;
  thumbnailColumns: number;
  displayThumbnailScaleLevel: number;
  popoverDebugPinned: boolean;
  onGridElementChange?: (element: HTMLDivElement | null) => void;
  onPreviewNodeBrowseItem?: (nodeId: string, videoId?: string) => void;
  onActivateNodeBrowseItem?: (nodeId: string, videoId?: string) => void;
}

export function useVideoNodeBrowseController<
  TNodeBrowseItem extends VideoNodeBrowseItem,
>({
  nodeBrowseMode,
  nodeBrowseItems,
  nodeBrowsePageStart,
  nodeBrowsePageSize,
  thumbnailColumns,
  displayThumbnailScaleLevel,
  popoverDebugPinned,
  onGridElementChange,
  onPreviewNodeBrowseItem,
  onActivateNodeBrowseItem,
}: UseVideoNodeBrowseControllerOptions<TNodeBrowseItem>) {
  const [openScalePopover, setOpenScalePopover] = useState(false);
  const [scaleDraftValue, setScaleDraftValue] = useState(
    Math.max(1, Math.round(displayThumbnailScaleLevel)),
  );
  const [focusedBrowseIndex, setFocusedBrowseIndex] = useState(0);
  const scalePopoverHideTimerRef = useRef<number | null>(null);
  const browseCardButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const nodeBrowseGridRef = useRef<HTMLDivElement | null>(null);

  const effectiveNodeBrowsePageSize = Math.max(1, Math.floor(nodeBrowsePageSize));
  const effectiveNodeBrowsePageStart = Math.max(0, Math.floor(nodeBrowsePageStart));
  const pagedNodeBrowseItems = useMemo(
    () =>
      nodeBrowseMode
        ? nodeBrowseItems.slice(
            effectiveNodeBrowsePageStart,
            effectiveNodeBrowsePageStart + effectiveNodeBrowsePageSize,
          )
        : [],
    [
      effectiveNodeBrowsePageSize,
      effectiveNodeBrowsePageStart,
      nodeBrowseItems,
      nodeBrowseMode,
    ],
  );

  useEffect(() => {
    setScaleDraftValue(Math.max(1, Math.round(displayThumbnailScaleLevel)));
  }, [displayThumbnailScaleLevel]);

  const clearScalePopoverHideTimer = useCallback(() => {
    if (scalePopoverHideTimerRef.current == null) {
      return;
    }
    window.clearTimeout(scalePopoverHideTimerRef.current);
    scalePopoverHideTimerRef.current = null;
  }, []);

  const openScalePopoverByHover = useCallback(() => {
    clearScalePopoverHideTimer();
    setOpenScalePopover(true);
  }, [clearScalePopoverHideTimer]);

  const closeScalePopoverByHover = useCallback(() => {
    if (popoverDebugPinned) {
      return;
    }
    clearScalePopoverHideTimer();
    scalePopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenScalePopover(false);
      scalePopoverHideTimerRef.current = null;
    }, 140);
  }, [clearScalePopoverHideTimer, popoverDebugPinned]);

  const effectiveOpenScalePopover = popoverDebugPinned || openScalePopover;

  useEffect(() => {
    return () => {
      clearScalePopoverHideTimer();
    };
  }, [clearScalePopoverHideTimer]);

  useEffect(() => {
    if (pagedNodeBrowseItems.length === 0) {
      setFocusedBrowseIndex(0);
      return;
    }
    setFocusedBrowseIndex((previous) =>
      Math.max(0, Math.min(pagedNodeBrowseItems.length - 1, previous)),
    );
  }, [pagedNodeBrowseItems.length]);

  useEffect(() => {
    if (!onGridElementChange) {
      return;
    }

    if (!nodeBrowseMode) {
      onGridElementChange(null);
      return;
    }

    onGridElementChange(nodeBrowseGridRef.current);
    return () => {
      onGridElementChange(null);
    };
  }, [nodeBrowseMode, onGridElementChange]);

  const handlePreviewNodeBrowseItem = useCallback(
    (item: TNodeBrowseItem) => {
      onPreviewNodeBrowseItem?.(item.nodeId, item.videoId);
    },
    [onPreviewNodeBrowseItem],
  );

  const handleActivateNodeBrowseItem = useCallback(
    (item: TNodeBrowseItem) => {
      onActivateNodeBrowseItem?.(item.nodeId, item.videoId);
    },
    [onActivateNodeBrowseItem],
  );

  const handleNodeBrowseGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!nodeBrowseMode || pagedNodeBrowseItems.length === 0) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const target = pagedNodeBrowseItems[focusedBrowseIndex];
        if (target) {
          handleActivateNodeBrowseItem(target);
        }
        return;
      }

      const currentIndex = focusedBrowseIndex;
      let nextIndex = currentIndex;
      const stepByRow = Math.max(1, thumbnailColumns);
      if (event.key === "ArrowRight") {
        nextIndex = Math.min(pagedNodeBrowseItems.length - 1, currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === "ArrowDown") {
        nextIndex = Math.min(
          pagedNodeBrowseItems.length - 1,
          currentIndex + stepByRow,
        );
      } else if (event.key === "ArrowUp") {
        nextIndex = Math.max(0, currentIndex - stepByRow);
      } else {
        return;
      }

      event.preventDefault();
      if (nextIndex === currentIndex) {
        return;
      }
      setFocusedBrowseIndex(nextIndex);
      const nextItem = pagedNodeBrowseItems[nextIndex];
      if (nextItem) {
        handlePreviewNodeBrowseItem(nextItem);
      }
      const targetButton = browseCardButtonRefs.current[nextIndex];
      targetButton?.focus();
    },
    [
      focusedBrowseIndex,
      handleActivateNodeBrowseItem,
      handlePreviewNodeBrowseItem,
      nodeBrowseMode,
      pagedNodeBrowseItems,
      thumbnailColumns,
    ],
  );

  return {
    scaleDraftValue,
    setScaleDraftValue,
    effectiveOpenScalePopover,
    openScalePopoverByHover,
    closeScalePopoverByHover,
    focusedBrowseIndex,
    setFocusedBrowseIndex,
    pagedNodeBrowseItems,
    browseCardButtonRefs,
    nodeBrowseGridRef,
    handlePreviewNodeBrowseItem,
    handleActivateNodeBrowseItem,
    handleNodeBrowseGridKeyDown,
  };
}
