import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFullscreenImageSoftRemove } from "./useFullscreenImageSoftRemove";

type Params = Parameters<typeof useFullscreenImageSoftRemove>[0];

function createParams(overrides: Partial<Params> = {}): Params {
  return {
    fullscreenActive: true,
    deleteConfirmOpen: false,
    getRemovedImageIds: vi.fn(() => []),
    clearImageRemovalMarks: vi.fn(),
    clearAllSelections: vi.fn(),
    replaceImageCheckedIds: vi.fn(),
    setDeleteConfirmOpen: vi.fn(),
    setManageOperationHint: vi.fn(),
    ...overrides,
  };
}

describe("useFullscreenImageSoftRemove", () => {
  it("进入全屏时清空残留软删标记", () => {
    const clearImageRemovalMarks = vi.fn();
    const params = createParams({
      fullscreenActive: false,
      clearImageRemovalMarks,
    });
    const { rerender } = renderHook(
      (props: Params) => useFullscreenImageSoftRemove(props),
      { initialProps: params },
    );

    rerender({ ...params, fullscreenActive: true });

    expect(clearImageRemovalMarks).toHaveBeenCalled();
  });

  it("退出全屏且有标记时：清勾选 → 灌入图片勾选 → 弹出删除确认面板", () => {
    const getRemovedImageIds = vi.fn(() => ["img-1", "img-2"]);
    const params = createParams({
      fullscreenActive: true,
      getRemovedImageIds,
    });
    const { rerender } = renderHook(
      (props: Params) => useFullscreenImageSoftRemove(props),
      { initialProps: params },
    );

    rerender({ ...params, fullscreenActive: false });

    expect(params.clearAllSelections).toHaveBeenCalled();
    expect(params.replaceImageCheckedIds).toHaveBeenCalledWith([
      "img-1",
      "img-2",
    ]);
    expect(params.setManageOperationHint).toHaveBeenCalledWith(null);
    expect(params.setDeleteConfirmOpen).toHaveBeenCalledWith(true);
  });

  it("退出全屏但无标记时不弹面板", () => {
    const params = createParams({
      fullscreenActive: true,
      getRemovedImageIds: vi.fn(() => []),
    });
    const { rerender } = renderHook(
      (props: Params) => useFullscreenImageSoftRemove(props),
      { initialProps: params },
    );

    rerender({ ...params, fullscreenActive: false });

    expect(params.setDeleteConfirmOpen).not.toHaveBeenCalled();
    expect(params.replaceImageCheckedIds).not.toHaveBeenCalled();
  });

  it("面板关闭（确认/取消任一路径）后清空软删标记与勾选（取消即清空）", () => {
    const getRemovedImageIds = vi.fn(() => ["img-1"]);
    const clearImageRemovalMarks = vi.fn();
    const clearAllSelections = vi.fn();
    // 先在全屏态挂载（首渲染无 transition，不清标记），再退出全屏以置 pending
    const params = createParams({
      fullscreenActive: true,
      getRemovedImageIds,
      clearImageRemovalMarks,
      clearAllSelections,
    });
    const { rerender } = renderHook(
      (props: Params) => useFullscreenImageSoftRemove(props),
      { initialProps: params },
    );

    // 退出全屏 → 退出 effect 调 clearAllSelections + replaceImageCheckedIds + setDeleteConfirmOpen(true)，置 pending
    rerender({ ...params, fullscreenActive: false });
    expect(params.setDeleteConfirmOpen).toHaveBeenCalledWith(true);

    // 面板打开后再关闭（取消/确认任一路径）→ 关闭 effect 清空标记 + clearAllSelections
    rerender({ ...params, fullscreenActive: false, deleteConfirmOpen: true });
    rerender({ ...params, fullscreenActive: false, deleteConfirmOpen: false });

    // 关闭 effect 触发了清空标记
    expect(clearImageRemovalMarks).toHaveBeenCalled();
    // 退出 effect + 关闭 effect 各调一次 clearAllSelections
    expect(clearAllSelections).toHaveBeenCalledTimes(2);
  });

  it("未置 pending 时面板关闭不清空软删标记（不干扰常规 manage 删除流）", () => {
    const clearImageRemovalMarks = vi.fn();
    // 进入全屏（不退出 → 不 pending）后直接观察 deleteConfirmOpen 关闭
    const params = createParams({
      fullscreenActive: true,
      deleteConfirmOpen: true,
      clearImageRemovalMarks,
    });
    const { rerender } = renderHook(
      (props: Params) => useFullscreenImageSoftRemove(props),
      { initialProps: params },
    );

    rerender({ ...params, deleteConfirmOpen: false });

    expect(clearImageRemovalMarks).not.toHaveBeenCalled();
  });
});
