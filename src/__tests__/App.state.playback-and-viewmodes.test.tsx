import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { resetUiStoreState } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI", () => {
  const uiLongTestTimeoutMs = 25_000;

  const flushUiUpdates = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const click = async (target: Element | Window, init?: MouseEventInit) => {
    fireEvent.click(target as Element, init);
    await flushUiUpdates();
  };

  const keyDown = async (target: Element | Window, init: KeyboardEventInit) => {
    fireEvent.keyDown(target as Element, init);
    await flushUiUpdates();
  };

  const mouseDown = async (target: Element | Window, init?: MouseEventInit) => {
    fireEvent.mouseDown(target as Element, init);
    await flushUiUpdates();
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it(
    "Main 工具栏使用图标按钮，退出全屏会自动关闭自动播放，且不显示加载中文案",
    async () => {
      render(<App />);

      const toolbarIconButtons = document.querySelectorAll(
        ".toolbar-actions .toolbar-icon-btn",
      );
      expect(toolbarIconButtons.length).toBeGreaterThanOrEqual(3);
      expect(
        screen.getByRole("button", { name: "动画版" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "纯文件名模式" }),
      ).not.toBeInTheDocument();
      const viewModeToggleButton = screen.getByRole("button", {
        name: /切换到纯文件名模式/,
      });
      await click(viewModeToggleButton);
      expect(
        screen.getByRole("button", { name: /切换到缩略图模式/ }),
      ).toBeInTheDocument();

      await click(screen.getByRole("button", { name: /切换到缩略图模式/ }));
      expect(
        screen.getByRole("button", { name: /切换到纯文件名模式/ }),
      ).toBeInTheDocument();

      await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();

      await keyDown(window, { key: "f", code: "KeyF" });
      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).not.toBeNull();
      });

      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as Element;
      fireEvent.mouseMove(fullscreenLayer, {
        clientY: window.innerHeight - 4,
      });

      const autoplayToggle = screen.getByRole("button", { name: "自动播放" });
      await click(autoplayToggle);
      expect(autoplayToggle).toHaveAttribute("aria-pressed", "true");

      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();

      await keyDown(window, { key: "f", code: "KeyF" });
      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).toBeNull();
      });

      await keyDown(window, { key: "f", code: "KeyF" });
      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).not.toBeNull();
      });

      const fullscreenLayerAfterReopen = document.querySelector(
        ".fullscreen-layer",
      ) as Element;
      fireEvent.mouseMove(fullscreenLayerAfterReopen, {
        clientY: window.innerHeight - 4,
      });

      expect(screen.getByRole("button", { name: "自动播放" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      await keyDown(window, { key: "f", code: "KeyF" });
    },
    uiLongTestTimeoutMs,
  );


  it(
    "非全屏场景即使自动播放已启用也不会继续自动翻页",
    async () => {
      render(<App />);

      const readMainFocusedOrdinal = () => {
        const title =
          document.querySelector(".main-toolbar-title")?.textContent ?? "";
        const matched = title.match(/\((\d+)\/(\d+)\)/);
        return Number(matched?.[1] ?? 0);
      };

      const readFullscreenImageSrc = () =>
        (
          document.querySelector(
            ".fullscreen-media-image-element",
          ) as HTMLImageElement | null
        )?.getAttribute("src") ?? null;

      await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
      await keyDown(window, { key: "f", code: "KeyF" });
      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).not.toBeNull();
      });

      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as Element;
      fireEvent.mouseMove(fullscreenLayer, {
        clientY: window.innerHeight - 4,
      });

      const beforeAutoplaySrc = readFullscreenImageSrc();
      expect(beforeAutoplaySrc).not.toBeNull();

      const autoplayToggle = screen.getByRole("button", { name: "自动播放" });
      await click(autoplayToggle);
      expect(autoplayToggle).toHaveAttribute("aria-pressed", "true");

      await waitFor(
        () => {
          const nextSrc = readFullscreenImageSrc();
          expect(nextSrc).not.toBeNull();
          expect(nextSrc).not.toBe(beforeAutoplaySrc);
        },
        { timeout: 3_600 },
      );

      await keyDown(window, { key: "f", code: "KeyF" });
      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).toBeNull();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
      });
      const ordinalAfterExit = readMainFocusedOrdinal();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3_400));
      });

      expect(readMainFocusedOrdinal()).toBe(ordinalAfterExit);
    },
    uiLongTestTimeoutMs,
  );


  it(
    "视频播放后暂停保留当前画面，切换视频后回到封面态，Save as cover 走后端写链路并保持封面态",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await click(screen.getByRole("button", { name: "播放" }));
      expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "暂停" }));
      expect(screen.getByRole("button", { name: "播放" })).toBeInTheDocument();
      expect(document.querySelector(".video-screen-cover-image")).toBeNull();

      await click(
        screen.getAllByRole("button", { name: "teaser_forest.mp4" })[0],
      );
      expect(screen.getByRole("button", { name: "播放" })).toBeInTheDocument();

      await click(
        screen.getByRole("button", { name: /Save as cover|保存为封面/ }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "播放" }),
        ).toBeInTheDocument();
      });

      fireEvent.mouseEnter(screen.getByRole("button", { name: "倍速 x1.00" }));
      await click(screen.getByRole("button", { name: "2x" }));
      expect(
        screen.getByRole("button", { name: "倍速 x2.00" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );


  it(
    "视频模式全屏使用 video-controls-shell，单视频隐藏 footer，双显示保留悬浮控件自适应",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await keyDown(window, { key: "f", code: "KeyF" });

      expect(
        document.querySelector(".fullscreen-media-video-element"),
      ).not.toBeNull();
      expect(
        screen.queryByLabelText("调整全屏分屏比例"),
      ).not.toBeInTheDocument();

      const fullscreenLayer = document.querySelector(".fullscreen-layer");
      expect(fullscreenLayer).not.toBeNull();
      const singleVideoPane = document.querySelector(".fullscreen-video");
      expect(singleVideoPane).not.toBeNull();
      fireEvent.mouseEnter(singleVideoPane as Element);

      const fullscreenFooter = document.querySelector(
        ".fullscreen-footer",
      ) as HTMLElement | null;
      expect(fullscreenFooter).toBeNull();
      const floatingControls = document.querySelector(
        ".fullscreen-stage .fullscreen-video-controls",
      ) as HTMLElement | null;
      expect(floatingControls).not.toBeNull();
      expect(
        floatingControls?.querySelector(".video-controls-shell"),
      ).not.toBeNull();
      expect(
        floatingControls?.querySelector(".fullscreen-meta-row"),
      ).not.toBeNull();
      expect(screen.getByLabelText("全屏视频进度滑条")).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "独立/复合" }));

      const videoPane = document.querySelector(".fullscreen-video");
      expect(videoPane).not.toBeNull();
      fireEvent.mouseEnter(videoPane as Element);

      const dualFloatingControls = document.querySelector(
        ".fullscreen-stage .fullscreen-video-controls",
      ) as HTMLElement | null;
      expect(dualFloatingControls).not.toBeNull();
      expect(dualFloatingControls?.style.bottom).toBe(
        "var(--mpx-fullscreen-controls-bottom, 5%)",
      );
      expect(dualFloatingControls?.style.top).toBe("");
      expect(
        dualFloatingControls?.querySelector(".fullscreen-meta-row"),
      ).not.toBeNull();
      const shellDefault = dualFloatingControls?.querySelector(
        ".fullscreen-video-controls-shell",
      ) as HTMLElement | null;
      expect(
        shellDefault?.querySelector(".video-controls-progress"),
      ).not.toBeNull();

      await keyDown(window, {
        key: "ArrowDown",
        code: "ArrowDown",
        altKey: true,
      });
      const shellAfterAlignDown = dualFloatingControls?.querySelector(
        ".fullscreen-video-controls-shell",
      ) as HTMLElement | null;
      expect(
        shellAfterAlignDown?.querySelector(".video-controls-progress"),
      ).not.toBeNull();
      expect(
        shellAfterAlignDown?.querySelector(".video-controls-row"),
      ).not.toBeNull();

      await keyDown(window, { key: "ArrowUp", code: "ArrowUp", altKey: true });
      const shellAfterAlignUp = dualFloatingControls?.querySelector(
        ".fullscreen-video-controls-shell",
      ) as HTMLElement | null;
      expect(
        shellAfterAlignUp?.querySelector(".video-controls-progress"),
      ).not.toBeNull();
      expect(
        shellAfterAlignUp?.querySelector(".video-controls-row"),
      ).not.toBeNull();

      const dualVideoStage = document.querySelector(
        ".fullscreen-video .fullscreen-stage",
      );
      const dualVideoMedia = document.querySelector(
        ".fullscreen-video .fullscreen-media-video",
      ) as HTMLElement;
      const dualImageStage = document.querySelector(
        ".fullscreen-image .fullscreen-stage",
      );
      expect(dualVideoStage?.classList.contains("is-draggable")).toBe(true);
      expect(dualImageStage?.classList.contains("is-draggable")).toBe(false);

      const transformBeforeDrag = dualVideoMedia.style.transform;
      await mouseDown(dualVideoStage as Element, {
        button: 0,
        clientX: 120,
        clientY: 60,
      });
      expect(dualVideoStage?.classList.contains("is-dragging")).toBe(true);
      fireEvent.mouseMove(window, { clientX: 120, clientY: 120 });
      fireEvent.mouseUp(window);
      expect(dualVideoStage?.classList.contains("is-dragging")).toBe(false);

      const transformAfterDrag = dualVideoMedia.style.transform;
      expect(transformAfterDrag).not.toBe(transformBeforeDrag);
      const yOffset = transformAfterDrag.match(
        /translate3d\([^,]+,\s*([-\d.]+)px,\s*0\)/,
      )?.[1];
      expect(Number(yOffset ?? "0")).not.toBe(0);
    },
    uiLongTestTimeoutMs,
  );


  it(
    "视频全屏单显示下，单视频循环在播放结束后不会跳到下一条",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await keyDown(window, { key: "f", code: "KeyF" });

      const videoPane = document.querySelector(
        ".fullscreen-video",
      ) as HTMLElement | null;
      expect(videoPane).not.toBeNull();
      fireEvent.mouseEnter(videoPane as HTMLElement);

      const loopButton = within(videoPane as HTMLElement).getByRole("button", {
        name: "视频循环模式：文件列表循环",
      });
      await click(loopButton);
      expect(
        within(videoPane as HTMLElement).getByRole("button", {
          name: "视频循环模式：单视频循环",
        }),
      ).toBeInTheDocument();

      const videoElementBefore = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(videoElementBefore).not.toBeNull();
      const srcBefore = videoElementBefore?.getAttribute("src") ?? "";
      expect(srcBefore.length).toBeGreaterThan(0);

      fireEvent.ended(videoElementBefore as HTMLVideoElement);
      await flushUiUpdates();

      const videoElementAfter = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      const srcAfter = videoElementAfter?.getAttribute("src") ?? "";
      expect(srcAfter).toBe(srcBefore);
    },
    uiLongTestTimeoutMs,
  );

  it(
    "应用初始进入 image 全屏后切到 dual，首次播放结束应直接切到下一条",
    async () => {
      render(<App />);

      await keyDown(window, { key: "f", code: "KeyF" });

      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as HTMLElement | null;
      expect(fullscreenLayer).not.toBeNull();
      fireEvent.mouseMove(fullscreenLayer as HTMLElement, {
        clientY: window.innerHeight - 4,
      });

      await click(
        screen.getByRole("button", {
          name: "双显示",
        }),
      );

      const dualVideoPane = document.querySelector(
        ".fullscreen-video",
      ) as HTMLElement | null;
      expect(dualVideoPane).not.toBeNull();
      fireEvent.mouseEnter(dualVideoPane as HTMLElement);

      const videoElementBefore = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(videoElementBefore).not.toBeNull();
      const srcBefore = videoElementBefore?.getAttribute("src") ?? "";
      expect(srcBefore.length).toBeGreaterThan(0);

      fireEvent.ended(videoElementBefore as HTMLVideoElement);
      await flushUiUpdates();

      const videoElementAfter = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      const srcAfter = videoElementAfter?.getAttribute("src") ?? "";
      expect(srcAfter).not.toBe(srcBefore);
    },
    uiLongTestTimeoutMs,
  );


  it(
    "视频全屏双显示下，文件列表循环在播放结束后会切到下一条",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await keyDown(window, { key: "f", code: "KeyF" });

      const singleVideoPane = document.querySelector(
        ".fullscreen-video",
      ) as HTMLElement | null;
      expect(singleVideoPane).not.toBeNull();
      fireEvent.mouseEnter(singleVideoPane as HTMLElement);

      await click(
        within(singleVideoPane as HTMLElement).getByRole("button", {
          name: "独立/复合",
        }),
      );

      const dualVideoPane = document.querySelector(
        ".fullscreen-video",
      ) as HTMLElement | null;
      expect(dualVideoPane).not.toBeNull();
      fireEvent.mouseEnter(dualVideoPane as HTMLElement);

      const singleLoopButton = within(dualVideoPane as HTMLElement).queryByRole(
        "button",
        { name: "视频循环模式：单视频循环" },
      );
      if (singleLoopButton) {
        await click(singleLoopButton);
      }
      expect(
        within(dualVideoPane as HTMLElement).getByRole("button", {
          name: "视频循环模式：文件列表循环",
        }),
      ).toBeInTheDocument();

      const videoElementBefore = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(videoElementBefore).not.toBeNull();
      const srcBefore = videoElementBefore?.getAttribute("src") ?? "";
      expect(srcBefore.length).toBeGreaterThan(0);

      fireEvent.ended(videoElementBefore as HTMLVideoElement);
      await flushUiUpdates();

      const videoElementAfter = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      const srcAfter = videoElementAfter?.getAttribute("src") ?? "";
      expect(srcAfter).not.toBe(srcBefore);
    },
    uiLongTestTimeoutMs,
  );

});
