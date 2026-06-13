import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FULLSCREEN_DELETE_FEEDBACK_EVENT,
  type FullscreenDeleteFeedbackDetail,
} from "../../utils/fullscreenDeleteFeedback";
import { useFullscreenDeleteMarks } from "./useFullscreenDeleteMarks";

type Params = Parameters<typeof useFullscreenDeleteMarks>[0];

afterEach(() => {
  vi.restoreAllMocks();
});

function listenDeleteFeedback() {
  const events: FullscreenDeleteFeedbackDetail[] = [];
  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<FullscreenDeleteFeedbackDetail>)
      .detail;
    if (detail) {
      events.push(detail);
    }
  };
  window.addEventListener(FULLSCREEN_DELETE_FEEDBACK_EVENT, onEvent);
  return {
    events,
    dispose: () =>
      window.removeEventListener(FULLSCREEN_DELETE_FEEDBACK_EVENT, onEvent),
  };
}

function createParams(overrides: Partial<Params> = {}): Params {
  return {
    fullscreenActive: true,
    deleteConfirmOpen: false,
    imageDeleteTargetNodeId: "node-image",
    videoDeleteTargetNodeId: "node-video",
    clearAllSelections: vi.fn(),
    checkSidebarNode: vi.fn(),
    setDeleteConfirmOpen: vi.fn(),
    setManageOperationHint: vi.fn(),
    onFullscreenDirectDelete: vi.fn(),
    ...overrides,
  };
}

describe("useFullscreenDeleteMarks", () => {
  it("toggles a mark and dispatches red then blue feedback", () => {
    const feedback = listenDeleteFeedback();
    const params = createParams();
    const { result } = renderHook(() => useFullscreenDeleteMarks(params));

    act(() => result.current.toggleFullscreenDeleteMark("image"));
    act(() => result.current.toggleFullscreenDeleteMark("image"));

    expect(feedback.events).toEqual([
      { marked: true, pane: "image" },
      { marked: false, pane: "image" },
    ]);
    feedback.dispose();
  });

  it("does nothing when the target node id is null", () => {
    const feedback = listenDeleteFeedback();
    const params = createParams({ imageDeleteTargetNodeId: null });
    const { result } = renderHook(() => useFullscreenDeleteMarks(params));

    act(() => result.current.toggleFullscreenDeleteMark("image"));

    expect(feedback.events).toHaveLength(0);
    feedback.dispose();
  });

  it("opens delete confirm with marked nodes checked on fullscreen exit", () => {
    const params = createParams();
    const { result, rerender } = renderHook(
      (props: Params) => useFullscreenDeleteMarks(props),
      { initialProps: params },
    );

    act(() => {
      result.current.toggleFullscreenDeleteMark("image");
      result.current.toggleFullscreenDeleteMark("video");
    });

    rerender({ ...params, fullscreenActive: false });

    expect(params.clearAllSelections).toHaveBeenCalled();
    expect(params.checkSidebarNode).toHaveBeenCalledWith("node-image");
    expect(params.checkSidebarNode).toHaveBeenCalledWith("node-video");
    expect(params.setDeleteConfirmOpen).toHaveBeenCalledWith(true);
  });

  it("does not open delete confirm when there are no marks on exit", () => {
    const params = createParams();
    const { rerender } = renderHook(
      (props: Params) => useFullscreenDeleteMarks(props),
      { initialProps: params },
    );

    rerender({ ...params, fullscreenActive: false });

    expect(params.setDeleteConfirmOpen).not.toHaveBeenCalled();
  });

  it("clears marks after the confirm dialog closes (cancel discards marks)", () => {
    const setDeleteConfirmOpen = vi.fn();
    const params = createParams({ setDeleteConfirmOpen });
    const { result, rerender } = renderHook(
      (props: Params) => useFullscreenDeleteMarks(props),
      { initialProps: params },
    );

    act(() => result.current.toggleFullscreenDeleteMark("image"));

    // 退出全屏 -> 弹出确认面板
    rerender({ ...params, fullscreenActive: false });
    expect(setDeleteConfirmOpen).toHaveBeenCalledWith(true);

    // 面板打开后再关闭（取消/确认任一路径）-> 清空标记
    rerender({ ...params, fullscreenActive: false, deleteConfirmOpen: true });
    rerender({ ...params, fullscreenActive: false, deleteConfirmOpen: false });

    // 标记已清空：再次进入并退出全屏，不应再弹面板
    setDeleteConfirmOpen.mockClear();
    rerender({ ...params, fullscreenActive: true });
    rerender({ ...params, fullscreenActive: false });

    expect(setDeleteConfirmOpen).not.toHaveBeenCalled();
  });

  it("连按三次 Del 触发直接删除，前两次仍 toggle、第三次不再派发标记反馈", () => {
    const feedback = listenDeleteFeedback();
    const onFullscreenDirectDelete = vi.fn();
    const params = createParams({ onFullscreenDirectDelete });
    const { result } = renderHook(() => useFullscreenDeleteMarks(params));

    act(() => {
      result.current.toggleFullscreenDeleteMark("image");
      result.current.toggleFullscreenDeleteMark("image");
      result.current.toggleFullscreenDeleteMark("image");
    });

    expect(onFullscreenDirectDelete).toHaveBeenCalledTimes(1);
    expect(onFullscreenDirectDelete).toHaveBeenCalledWith("image");
    expect(feedback.events).toEqual([
      { marked: true, pane: "image" },
      { marked: false, pane: "image" },
    ]);
    feedback.dispose();
  });

  it("超过时间窗的 Del 不累计连击，不触发直接删除", () => {
    const nowSpy = vi.spyOn(performance, "now");
    const onFullscreenDirectDelete = vi.fn();
    const params = createParams({ onFullscreenDirectDelete });
    const { result } = renderHook(() => useFullscreenDeleteMarks(params));

    nowSpy.mockReturnValue(0);
    act(() => result.current.toggleFullscreenDeleteMark("image"));
    nowSpy.mockReturnValue(1000);
    act(() => result.current.toggleFullscreenDeleteMark("image"));
    nowSpy.mockReturnValue(2000);
    act(() => result.current.toggleFullscreenDeleteMark("image"));

    expect(onFullscreenDirectDelete).not.toHaveBeenCalled();
  });
});
