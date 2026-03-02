import { createRef } from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFocusedThumbOriginSync } from "./useFocusedThumbOriginSync";

function mountFocusedThumbGrid() {
  const grid = document.createElement("div");
  const card = document.createElement("div");
  card.className = "thumb-card is-focused";
  const inner = document.createElement("button");
  card.appendChild(inner);
  grid.appendChild(card);
  document.body.appendChild(grid);
  return { grid, inner };
}

describe("useFocusedThumbOriginSync", () => {
  let originalScrollIntoView:
    | typeof HTMLElement.prototype.scrollIntoView
    | undefined;

  afterEach(() => {
    document.documentElement.removeAttribute("data-mpx-thumb-input");
    document.body.innerHTML = "";
    if (originalScrollIntoView) {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
    originalScrollIntoView = undefined;
    vi.restoreAllMocks();
  });

  it("键盘焦点变更时不触发 scrollIntoView，避免横向抖动", () => {
    const { grid } = mountFocusedThumbGrid();
    const gridRef = createRef<HTMLDivElement>();
    gridRef.current = grid;
    document.documentElement.dataset.mpxThumbInput = "keyboard";

    originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

    renderHook(() =>
      useFocusedThumbOriginSync({
        gridRef,
        focusedRef: { packageId: "pkg-1", imageIndex: 0 },
        nodeBrowseMode: false,
        showNamesOnly: false,
        isTestMode: true,
      }),
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("显式传入目标元素时仍保持最近邻滚动行为", () => {
    const { grid, inner } = mountFocusedThumbGrid();
    const gridRef = createRef<HTMLDivElement>();
    gridRef.current = grid;

    originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

    const { result } = renderHook(() =>
      useFocusedThumbOriginSync({
        gridRef,
        focusedRef: { packageId: "pkg-1", imageIndex: 0 },
        nodeBrowseMode: false,
        showNamesOnly: false,
        isTestMode: true,
      }),
    );

    act(() => {
      result.current.scrollFocusedThumbIntoView(inner);
    });

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  });

  it("键盘焦点变更时仍会同步 transform-origin", () => {
    const { grid } = mountFocusedThumbGrid();
    const card = grid.querySelector(".thumb-card") as HTMLDivElement;
    const gridRef = createRef<HTMLDivElement>();
    gridRef.current = grid;
    document.documentElement.dataset.mpxThumbInput = "keyboard";

    Object.defineProperty(grid, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 420,
        bottom: 300,
        width: 420,
        height: 300,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(card, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 100,
        left: 0,
        top: 100,
        right: 120,
        bottom: 220,
        width: 120,
        height: 120,
        toJSON: () => ({}),
      }),
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    renderHook(() =>
      useFocusedThumbOriginSync({
        gridRef,
        focusedRef: { packageId: "pkg-1", imageIndex: 0 },
        nodeBrowseMode: false,
        showNamesOnly: false,
        isTestMode: true,
      }),
    );

    expect(card.style.getPropertyValue("--mpx-thumb-origin-x")).toBe("0%");
  });
});
