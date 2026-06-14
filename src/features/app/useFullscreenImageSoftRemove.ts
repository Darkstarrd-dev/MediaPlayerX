import { useEffect, useRef } from "react";

/**
 * 全屏浏览期间的「单张图软删」退出复核机制（与 useFullscreenDeleteMarks 平行）：
 *
 * - Backspace 在普通全屏图片浏览时，把当前单张图标记为「待删」并从浏览队列软移除
 *   （见 useImageBrowserViewModel 的 markImageRemoved + moveImage 跳过逻辑）。
 * - 退出全屏时若存在软删标记，把这些图 id 灌入图片勾选集（replaceImageCheckedIds，
 *   单图粒度，会清空侧边栏勾选），并弹出与 Del 整包标记相同的永久删除确认面板。
 * - 确认面板关闭（确认/取消任一路径）后清空标记（“取消即清空”）。
 *
 * 与 useFullscreenDeleteMarks 的差异：Del 标记整包节点（走 checkSidebarNode），
 * Backspace 标记单张图（走 replaceImageCheckedIds）。两者各自独立跑退出 effect；
 * 若同一次退出两者都有标记，后挂载的本 hook 后执行，图片粒度勾选会覆盖包粒度勾选
 * （更具体，符合预期）。
 *
 * 软删标记本身由 useImageBrowserViewModel 内部 ref 持有，本 hook 只负责：
 * 退出全屏时读取（getRemovedImageIds）、灌入勾选、面板关闭后清空（clearImageRemovalMarks）。
 */
interface UseFullscreenImageSoftRemoveParams {
  fullscreenActive: boolean;
  deleteConfirmOpen: boolean;
  getRemovedImageIds: () => string[];
  clearImageRemovalMarks: () => void;
  clearAllSelections: () => void;
  replaceImageCheckedIds: (imageIds: string[]) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  setManageOperationHint: (value: string | null) => void;
}

export function useFullscreenImageSoftRemove({
  fullscreenActive,
  deleteConfirmOpen,
  getRemovedImageIds,
  clearImageRemovalMarks,
  clearAllSelections,
  replaceImageCheckedIds,
  setDeleteConfirmOpen,
  setManageOperationHint,
}: UseFullscreenImageSoftRemoveParams): void {
  const previousFullscreenActiveRef = useRef(fullscreenActive);
  const previousDeleteConfirmOpenRef = useRef(deleteConfirmOpen);
  const pendingRef = useRef(false);

  // 进入全屏清空残留软删标记；退出全屏时若有标记则灌入图片勾选并弹出永久删除确认面板
  useEffect(() => {
    const previous = previousFullscreenActiveRef.current;
    if (previous === fullscreenActive) {
      return;
    }
    previousFullscreenActiveRef.current = fullscreenActive;

    if (fullscreenActive) {
      clearImageRemovalMarks();
      return;
    }

    const markedIds = getRemovedImageIds();
    if (markedIds.length === 0) {
      return;
    }

    clearAllSelections();
    replaceImageCheckedIds(markedIds);
    setManageOperationHint(null);
    pendingRef.current = true;
    setDeleteConfirmOpen(true);
  }, [
    clearAllSelections,
    clearImageRemovalMarks,
    fullscreenActive,
    getRemovedImageIds,
    replaceImageCheckedIds,
    setDeleteConfirmOpen,
    setManageOperationHint,
  ]);

  // 确认面板关闭后清空软删标记（确认/取消任一路径均清空，满足“取消即清空”）
  useEffect(() => {
    const previous = previousDeleteConfirmOpenRef.current;
    if (previous === deleteConfirmOpen) {
      return;
    }
    previousDeleteConfirmOpenRef.current = deleteConfirmOpen;

    if (deleteConfirmOpen || !pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    clearImageRemovalMarks();
    clearAllSelections();
  }, [clearAllSelections, clearImageRemovalMarks, deleteConfirmOpen]);
}
