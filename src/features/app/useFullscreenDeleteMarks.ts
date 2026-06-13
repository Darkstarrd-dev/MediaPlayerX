import { useCallback, useEffect, useRef } from "react";

import { dispatchFullscreenDeleteFeedback } from "../../utils/fullscreenDeleteFeedback";

// 三连击 Del 直删的时间窗：同一 pane 相邻两次 Del 间隔在此窗内才累计连击
const TRIPLE_DELETE_WINDOW_MS = 500;

interface UseFullscreenDeleteMarksParams {
  fullscreenActive: boolean;
  deleteConfirmOpen: boolean;
  // 当前可标记目标对应的 sidebar 节点 id（图片包 / 视频），无则为 null
  imageDeleteTargetNodeId: string | null;
  videoDeleteTargetNodeId: string | null;
  clearAllSelections: () => void;
  checkSidebarNode: (nodeId: string) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  setManageOperationHint: (value: string | null) => void;
  // 连续三次 Del 时直接删除当前项（不退出全屏、不弹确认）
  onFullscreenDirectDelete: (pane: "image" | "video") => void;
}

interface UseFullscreenDeleteMarksResult {
  toggleFullscreenDeleteMark: (pane: "image" | "video") => void;
}

/**
 * 全屏浏览期间的「待删除」标记管理：
 * - 按 Del 在当前 focus 侧的包/视频上 toggle 标记，并派发红/蓝遮罩反馈事件。
 * - 退出全屏时若存在标记，将其灌入侧边栏勾选集并弹出现有的永久删除确认面板。
 * - 确认面板关闭（确认/取消/仅移除任一路径）后清空标记（“取消即清空”）。
 *
 * 标记集合使用 ref 持有：它不驱动任何渲染（遮罩为事件驱动、确认面板复用勾选集），
 * 用 ref 可避免 toggle 时的 state updater 副作用与不必要的重渲染。
 */
export function useFullscreenDeleteMarks({
  fullscreenActive,
  deleteConfirmOpen,
  imageDeleteTargetNodeId,
  videoDeleteTargetNodeId,
  clearAllSelections,
  checkSidebarNode,
  setDeleteConfirmOpen,
  setManageOperationHint,
  onFullscreenDirectDelete,
}: UseFullscreenDeleteMarksParams): UseFullscreenDeleteMarksResult {
  const markedNodeIdsRef = useRef<Set<string>>(new Set());
  const previousFullscreenActiveRef = useRef(fullscreenActive);
  const previousDeleteConfirmOpenRef = useRef(deleteConfirmOpen);
  const fullscreenDeletePendingRef = useRef(false);
  const imageDeleteTargetNodeIdRef = useRef(imageDeleteTargetNodeId);
  const videoDeleteTargetNodeIdRef = useRef(videoDeleteTargetNodeId);
  const onFullscreenDirectDeleteRef = useRef(onFullscreenDirectDelete);
  const lastDeleteAtRef = useRef(0);
  const lastDeletePaneRef = useRef<"image" | "video" | null>(null);
  const deleteStreakRef = useRef(0);

  useEffect(() => {
    onFullscreenDirectDeleteRef.current = onFullscreenDirectDelete;
  }, [onFullscreenDirectDelete]);

  useEffect(() => {
    imageDeleteTargetNodeIdRef.current = imageDeleteTargetNodeId;
  }, [imageDeleteTargetNodeId]);

  useEffect(() => {
    videoDeleteTargetNodeIdRef.current = videoDeleteTargetNodeId;
  }, [videoDeleteTargetNodeId]);

  const toggleFullscreenDeleteMark = useCallback((pane: "image" | "video") => {
    const nodeId =
      pane === "video"
        ? videoDeleteTargetNodeIdRef.current
        : imageDeleteTargetNodeIdRef.current;
    if (!nodeId) {
      return;
    }

    // 三连击 Del：同一 pane 在时间窗内连续按三次，直接删除当前项（不退出全屏、不弹确认）
    const now = performance.now();
    const withinWindow =
      lastDeletePaneRef.current === pane &&
      now - lastDeleteAtRef.current <= TRIPLE_DELETE_WINDOW_MS;
    deleteStreakRef.current = withinWindow ? deleteStreakRef.current + 1 : 1;
    lastDeleteAtRef.current = now;
    lastDeletePaneRef.current = pane;

    if (deleteStreakRef.current >= 3) {
      deleteStreakRef.current = 0;
      // 清除该节点的待删除标记，避免退出全屏时又把它灌入确认面板
      markedNodeIdsRef.current.delete(nodeId);
      onFullscreenDirectDeleteRef.current(pane);
      return;
    }

    const markedNodeIds = markedNodeIdsRef.current;
    let marked: boolean;
    if (markedNodeIds.has(nodeId)) {
      markedNodeIds.delete(nodeId);
      marked = false;
    } else {
      markedNodeIds.add(nodeId);
      marked = true;
    }

    dispatchFullscreenDeleteFeedback({ marked, pane });
  }, []);

  // 进入全屏清空残留标记；退出全屏时若有标记则灌入勾选并弹出永久删除确认面板
  useEffect(() => {
    const previous = previousFullscreenActiveRef.current;
    if (previous === fullscreenActive) {
      return;
    }
    previousFullscreenActiveRef.current = fullscreenActive;

    if (fullscreenActive) {
      markedNodeIdsRef.current = new Set();
      deleteStreakRef.current = 0;
      lastDeletePaneRef.current = null;
      return;
    }

    const markedIds = Array.from(markedNodeIdsRef.current);
    if (markedIds.length === 0) {
      return;
    }

    clearAllSelections();
    for (const nodeId of markedIds) {
      checkSidebarNode(nodeId);
    }
    setManageOperationHint(null);
    fullscreenDeletePendingRef.current = true;
    setDeleteConfirmOpen(true);
  }, [
    checkSidebarNode,
    clearAllSelections,
    fullscreenActive,
    setDeleteConfirmOpen,
    setManageOperationHint,
  ]);

  // 确认面板关闭后清空标记（确认/取消/仅移除任一路径均清空，满足“取消即清空”）
  useEffect(() => {
    const previous = previousDeleteConfirmOpenRef.current;
    if (previous === deleteConfirmOpen) {
      return;
    }
    previousDeleteConfirmOpenRef.current = deleteConfirmOpen;

    if (deleteConfirmOpen || !fullscreenDeletePendingRef.current) {
      return;
    }

    fullscreenDeletePendingRef.current = false;
    markedNodeIdsRef.current = new Set();
    clearAllSelections();
  }, [clearAllSelections, deleteConfirmOpen]);

  return { toggleFullscreenDeleteMark };
}
