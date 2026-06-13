import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS,
  useFullscreenWheelPager,
} from "./useFullscreenWheelPager";

describe("useFullscreenWheelPager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("单次输入在一个最小间隔后翻一页，队列清空后停表", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() =>
      useFullscreenWheelPager({ enabled: true, onStep }),
    );

    act(() => {
      result.current.enqueue(1);
    });
    expect(onStep).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS);
    });
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenLastCalledWith(1);

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS * 3);
    });
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("快速多步累加，按最小间隔逐页消费、不丢页也不超发", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() =>
      useFullscreenWheelPager({ enabled: true, onStep }),
    );

    act(() => {
      result.current.enqueue(1);
      result.current.enqueue(1);
      result.current.enqueue(1);
    });
    expect(onStep).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS);
    });
    expect(onStep).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS);
    });
    expect(onStep).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS);
    });
    expect(onStep).toHaveBeenCalledTimes(3);
    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(3, 1);

    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS * 2);
    });
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it("反向输入可抵消，不触发翻页", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() =>
      useFullscreenWheelPager({ enabled: true, onStep }),
    );

    act(() => {
      result.current.enqueue(1);
      result.current.enqueue(-1);
    });
    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS * 2);
    });
    expect(onStep).not.toHaveBeenCalled();
  });

  it("enabled 变为 false 时清空待翻页队列", () => {
    const onStep = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFullscreenWheelPager({ enabled, onStep }),
      { initialProps: { enabled: true } },
    );

    act(() => {
      result.current.enqueue(1);
      result.current.enqueue(1);
    });
    rerender({ enabled: false });
    act(() => {
      vi.advanceTimersByTime(IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS * 3);
    });
    expect(onStep).not.toHaveBeenCalled();
  });
});
