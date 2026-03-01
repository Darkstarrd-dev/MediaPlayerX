import {
  useCallback,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type RefObject,
} from "react";

import { clamp } from "../../utils/ui";
import type {
  HorizontalResizeCommitContext,
  HorizontalResizeLiveContext,
} from "./thumbnailHorizontalSnap";

const LIVE_RESIZE_THROTTLE_MS = 80;
const LIVE_RESIZE_DELTA_STEP_PX = 28;
const METADATA_MAX_APP_RATIO = 0.45;
const METADATA_RATIO_HARD_MAX = 0.95;

interface UsePaneResizersParams {
  appBodyRef: RefObject<HTMLDivElement | null>;
  workspaceRef: RefObject<HTMLElement | null>;
  workspaceBodyRef: RefObject<HTMLDivElement | null>;
  appBodyWidth: number;
  sidebarRatio: number;
  sidebarMinWidth: number;
  metadataRatio: number;
  metadataMinWidthPx: number;
  workspaceBottomPanelHeight: number;
  layoutLocked: boolean;
  searchPanelCollapsed: boolean;
  sidebarCollapseRatio: number;
  lastExpandedSidebarRatioRef: MutableRefObject<number>;
  onSetSidebarRatio: (value: number) => void;
  onSetMetadataRatio: (value: number) => void;
  onSetWorkspaceBottomPanelHeight: (value: number) => void;
}

interface UsePaneResizersResult {
  sidebarCollapsed: boolean;
  normalizeSidebarRatio: (candidate: number) => number;
  applySidebarRatio: (candidate: number) => void;
  applyMetadataRatio: (candidate: number) => void;
  horizontalResizing: boolean;
  horizontalResizeCommitCount: number;
  horizontalResizeCommitContext: HorizontalResizeCommitContext | null;
  horizontalResizeLiveContext: HorizontalResizeLiveContext | null;
  onStartSidebarResize: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartMetadataResize: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartWorkspaceBottomPanelResize: (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => void;
  onExpandSidebar: () => void;
}

export function usePaneResizers({
  appBodyRef,
  workspaceRef,
  workspaceBodyRef,
  appBodyWidth,
  sidebarRatio,
  sidebarMinWidth,
  metadataRatio,
  metadataMinWidthPx,
  workspaceBottomPanelHeight,
  layoutLocked,
  searchPanelCollapsed,
  sidebarCollapseRatio,
  lastExpandedSidebarRatioRef,
  onSetSidebarRatio,
  onSetMetadataRatio,
  onSetWorkspaceBottomPanelHeight,
}: UsePaneResizersParams): UsePaneResizersResult {
  const [horizontalResizing, setHorizontalResizing] = useState(false);
  const [horizontalResizeCommitCount, setHorizontalResizeCommitCount] =
    useState(0);
  const [horizontalResizeCommitContext, setHorizontalResizeCommitContext] =
    useState<HorizontalResizeCommitContext | null>(null);
  const [horizontalResizeLiveContext, setHorizontalResizeLiveContext] =
    useState<HorizontalResizeLiveContext | null>(null);

  const readAppBodyWidth = useCallback(() => {
    const measured = appBodyRef.current?.getBoundingClientRect().width;
    if (measured && measured > 0) {
      return measured;
    }
    if (appBodyWidth > 0) {
      return appBodyWidth;
    }
    return window.innerWidth;
  }, [appBodyRef, appBodyWidth]);

  const normalizeSidebarRatio = useCallback(
    (candidate: number) => {
      const bounded = clamp(candidate, 0, 0.95);
      if (bounded < sidebarCollapseRatio) {
        return 0;
      }

      const bodyWidth = readAppBodyWidth();
      if (bodyWidth <= 0) {
        return Number(bounded.toFixed(3));
      }

      const minRatio = clamp(sidebarMinWidth / bodyWidth, 0, 0.95);
      return Number(Math.max(bounded, minRatio).toFixed(3));
    },
    [readAppBodyWidth, sidebarCollapseRatio, sidebarMinWidth],
  );

  const applySidebarRatio = useCallback(
    (candidate: number) => {
      const next = normalizeSidebarRatio(candidate);
      if (Math.abs(next - sidebarRatio) < 0.0005) {
        return;
      }
      onSetSidebarRatio(next);
    },
    [normalizeSidebarRatio, onSetSidebarRatio, sidebarRatio],
  );

  const sidebarCollapsed = sidebarRatio < sidebarCollapseRatio;

  const updateSidebarRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = appBodyRef.current?.getBoundingClientRect();
      if (!bodyRect || bodyRect.width <= 0) {
        return;
      }

      const ratio = clamp((clientX - bodyRect.left) / bodyRect.width, 0, 0.95);
      applySidebarRatio(ratio);
    },
    [appBodyRef, applySidebarRatio],
  );

  const onStartSidebarResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked) {
        return;
      }
      event.preventDefault();
      setHorizontalResizing(true);
      setHorizontalResizeLiveContext(null);
      const startClientX = event.clientX;
      let lastEmitAt = performance.now();
      let lastEmitDelta = 0;
      let liveTickId = 0;

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateSidebarRatioByClientX(moveEvent.clientX);

        const deltaX = moveEvent.clientX - startClientX;
        const now = performance.now();
        const movedEnough =
          Math.abs(deltaX - lastEmitDelta) >= LIVE_RESIZE_DELTA_STEP_PX;
        const elapsedEnough = now - lastEmitAt >= LIVE_RESIZE_THROTTLE_MS;
        if (!movedEnough || !elapsedEnough) {
          return;
        }

        liveTickId += 1;
        lastEmitAt = now;
        lastEmitDelta = deltaX;
        setHorizontalResizeLiveContext({
          source: "sidebar",
          deltaX,
          tickId: liveTickId,
        });
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        const nextCommitId = horizontalResizeCommitCount + 1;
        setHorizontalResizeCommitContext({
          source: "sidebar",
          deltaX: upEvent.clientX - startClientX,
          commitId: nextCommitId,
        });
        setHorizontalResizeLiveContext(null);
        setHorizontalResizing(false);
        setHorizontalResizeCommitCount(nextCommitId);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [horizontalResizeCommitCount, layoutLocked, updateSidebarRatioByClientX],
  );

  const onExpandSidebar = useCallback(() => {
    const bodyWidth = readAppBodyWidth();
    const minRatio =
      bodyWidth > 0
        ? clamp(sidebarMinWidth / bodyWidth, sidebarCollapseRatio, 0.95)
        : sidebarCollapseRatio;
    const nextRatio = Math.max(lastExpandedSidebarRatioRef.current, minRatio);
    onSetSidebarRatio(Number(nextRatio.toFixed(3)));
  }, [
    lastExpandedSidebarRatioRef,
    onSetSidebarRatio,
    readAppBodyWidth,
    sidebarCollapseRatio,
    sidebarMinWidth,
  ]);

  const applyMetadataRatio = useCallback(
    (candidate: number) => {
      const workspaceWidth =
        workspaceBodyRef.current?.getBoundingClientRect().width ?? 0;
      if (workspaceWidth <= 1) {
        const fallback = Number(
          clamp(candidate, 0, METADATA_RATIO_HARD_MAX).toFixed(3),
        );
        if (Math.abs(fallback - metadataRatio) < 0.0005) {
          return;
        }
        onSetMetadataRatio(fallback);
        return;
      }

      const appWidth = readAppBodyWidth();
      const maxRatioByApp =
        appWidth > 1
          ? (appWidth * METADATA_MAX_APP_RATIO) / workspaceWidth
          : METADATA_RATIO_HARD_MAX;
      const metadataMaxRatio = clamp(maxRatioByApp, 0, METADATA_RATIO_HARD_MAX);
      const metadataMinRatio = clamp(
        metadataMinWidthPx / workspaceWidth,
        0,
        metadataMaxRatio,
      );
      const next = Number(
        clamp(candidate, metadataMinRatio, metadataMaxRatio).toFixed(3),
      );
      if (Math.abs(next - metadataRatio) < 0.0005) {
        return;
      }
      onSetMetadataRatio(next);
    },
    [
      metadataMinWidthPx,
      metadataRatio,
      onSetMetadataRatio,
      readAppBodyWidth,
      workspaceBodyRef,
    ],
  );

  const updateMetadataRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = workspaceBodyRef.current?.getBoundingClientRect();
      if (!bodyRect || bodyRect.width <= 0) {
        return;
      }
      const ratio = (bodyRect.right - clientX) / bodyRect.width;
      applyMetadataRatio(ratio);
    },
    [applyMetadataRatio, workspaceBodyRef],
  );

  const onStartMetadataResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked) {
        return;
      }
      event.preventDefault();
      setHorizontalResizing(true);
      setHorizontalResizeLiveContext(null);
      const startClientX = event.clientX;
      let lastEmitAt = performance.now();
      let lastEmitDelta = 0;
      let liveTickId = 0;

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateMetadataRatioByClientX(moveEvent.clientX);

        const deltaX = moveEvent.clientX - startClientX;
        const now = performance.now();
        const movedEnough =
          Math.abs(deltaX - lastEmitDelta) >= LIVE_RESIZE_DELTA_STEP_PX;
        const elapsedEnough = now - lastEmitAt >= LIVE_RESIZE_THROTTLE_MS;
        if (!movedEnough || !elapsedEnough) {
          return;
        }

        liveTickId += 1;
        lastEmitAt = now;
        lastEmitDelta = deltaX;
        setHorizontalResizeLiveContext({
          source: "metadata",
          deltaX,
          tickId: liveTickId,
        });
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        const nextCommitId = horizontalResizeCommitCount + 1;
        setHorizontalResizeCommitContext({
          source: "metadata",
          deltaX: upEvent.clientX - startClientX,
          commitId: nextCommitId,
        });
        setHorizontalResizeLiveContext(null);
        setHorizontalResizing(false);
        setHorizontalResizeCommitCount(nextCommitId);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [horizontalResizeCommitCount, layoutLocked, updateMetadataRatioByClientX],
  );

  const updateWorkspaceBottomPanelHeightByClientY = useCallback(
    (clientY: number) => {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect || rect.height <= 0) {
        return;
      }

      const minHeight = 80;
      const maxHeight = Math.max(
        minHeight,
        Math.min(360, Math.floor(rect.height - 120)),
      );
      const nextHeight = clamp(
        Math.round(clientY - rect.top),
        minHeight,
        maxHeight,
      );
      if (Math.abs(nextHeight - workspaceBottomPanelHeight) < 1) {
        return;
      }

      onSetWorkspaceBottomPanelHeight(nextHeight);
    },
    [onSetWorkspaceBottomPanelHeight, workspaceBottomPanelHeight, workspaceRef],
  );

  const onStartWorkspaceBottomPanelResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked || searchPanelCollapsed) {
        return;
      }
      event.preventDefault();

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateWorkspaceBottomPanelHeightByClientY(moveEvent.clientY);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [
      layoutLocked,
      searchPanelCollapsed,
      updateWorkspaceBottomPanelHeightByClientY,
    ],
  );

  return {
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    horizontalResizing,
    horizontalResizeCommitCount,
    horizontalResizeCommitContext,
    horizontalResizeLiveContext,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
    onExpandSidebar,
  };
}
