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
import { resolveFullscreenControlsWidth } from "../components/fullscreen/controlsWidth";
import { toAbsolutePx } from "../components/settings/settingsScale";
import { resetUiStoreState } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI - fullscreen", () => {
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

  const wheel = async (target: Element | Window, init?: WheelEventInit) => {
    fireEvent.wheel(target as Element, init);
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
    "全屏默认按当前模式进入单显示，双显示切回单显示时恢复入口模式",
    async () => {
      render(<App />);

      await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });

      await keyDown(window, { key: "f", code: "KeyF" });
      expect(screen.getByAltText("图片 #2")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("调整全屏分屏比例"),
      ).not.toBeInTheDocument();

      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as HTMLElement | null;
      expect(fullscreenLayer).not.toBeNull();
      fireEvent.mouseMove(fullscreenLayer as Element, {
        clientY: window.innerHeight - 4,
      });
      await click(screen.getByRole("button", { name: "双显示" }));
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();

      await keyDown(window, { key: "Tab", code: "Tab" });
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "单显示" }));
      expect(
        screen.queryByLabelText("调整全屏分屏比例"),
      ).not.toBeInTheDocument();
      expect(screen.getByAltText("图片 #2")).toBeInTheDocument();
      expect(document.querySelector(".video-screen-cover-image")).toBeNull();

      await keyDown(window, { key: "f", code: "KeyF" });
      expect(screen.queryByAltText("图片 #2")).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it("全屏图片支持首末跳转、跨包翻页与上个包下个包按钮", async () => {
    render(<App />);

    const readToolbarTitle = () =>
      document.querySelector(".main-toolbar strong")?.textContent ?? "";
    const readFullscreenImageAlt = () =>
      (
        document.querySelector(
          ".fullscreen-media-image-element",
        ) as HTMLImageElement | null
      )?.getAttribute("alt") ?? "";

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    await keyDown(window, { key: "f", code: "KeyF" });

    await keyDown(window, { key: "ArrowDown", code: "ArrowDown" });
    expect(readFullscreenImageAlt()).toBe("图片 #36");

    const titleBeforeCross = readToolbarTitle();
    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    expect(readFullscreenImageAlt()).toBe("图片 #1");
    expect(readToolbarTitle()).not.toBe(titleBeforeCross);

    await keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    expect(readFullscreenImageAlt()).toBe("图片 #1");

    const titleBeforeCtrlPackage = readToolbarTitle();
    await keyDown(window, {
      key: "ArrowLeft",
      code: "ArrowLeft",
      ctrlKey: true,
    });
    expect(readToolbarTitle()).not.toBe(titleBeforeCtrlPackage);

    const fullscreenLayer = document.querySelector(".fullscreen-layer");
    expect(fullscreenLayer).not.toBeNull();
    fireEvent.mouseMove(fullscreenLayer as Element, {
      clientY: window.innerHeight - 4,
    });

    expect(screen.queryByLabelText("全屏自动播放速度")).toBeNull();

    const titleBeforeFooterPackage = readToolbarTitle();
    await click(screen.getByRole("button", { name: "下个包" }));
    expect(readToolbarTitle()).not.toBe(titleBeforeFooterPackage);
  });

  it("全屏模式支持鼠标滚轮上下翻页", async () => {
    render(<App />);

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    await keyDown(window, { key: "f", code: "KeyF" });

    const fullscreenImagePane = document.querySelector(
      ".fullscreen-image",
    ) as HTMLElement | null;
    expect(fullscreenImagePane).not.toBeNull();

    const readFullscreenImageAlt = () =>
      (
        document.querySelector(
          ".fullscreen-media-image-element",
        ) as HTMLImageElement | null
      )?.getAttribute("alt") ?? "";

    const imageBeforeWheelDown = readFullscreenImageAlt();
    await wheel(fullscreenImagePane as HTMLElement, { deltaY: 120 });
    const imageAfterWheelDown = readFullscreenImageAlt();
    expect(imageAfterWheelDown).not.toBe(imageBeforeWheelDown);

    await wheel(fullscreenImagePane as HTMLElement, { deltaY: -120 });
    expect(readFullscreenImageAlt()).toBe(imageBeforeWheelDown);
  });

  it("图片模式未建立焦点时按 F 仍可进入全屏并回退到首个图包首图", async () => {
    render(<App />);

    await keyDown(window, { key: "Escape", code: "Escape" });
    await keyDown(window, { key: "f", code: "KeyF" });

    await waitFor(() => {
      expect(document.querySelector(".fullscreen-layer")).not.toBeNull();
    });

    const fullscreenImage = document.querySelector(
      ".fullscreen-media-image-element",
    ) as HTMLImageElement | null;
    expect(fullscreenImage).not.toBeNull();
    expect(fullscreenImage?.getAttribute("alt")).toBe("图片 #1");
  });

  it("图片全屏 footer 滑条交互不会触发图片拖拽", async () => {
    render(<App />);

    await keyDown(window, { key: "f", code: "KeyF" });

    const fullscreenLayer = document.querySelector(
      ".fullscreen-layer",
    ) as HTMLElement | null;
    expect(fullscreenLayer).not.toBeNull();
    fireEvent.mouseMove(fullscreenLayer as HTMLElement, {
      clientX: 40,
      clientY: window.innerHeight,
    });
    await flushUiUpdates();

    const imageStage = document.querySelector(
      ".fullscreen-image .fullscreen-stage",
    ) as HTMLElement | null;
    expect(imageStage).not.toBeNull();

    const autoplayControl = document.querySelector(
      ".fullscreen-autoplay-control",
    ) as HTMLElement | null;
    expect(autoplayControl).not.toBeNull();
    fireEvent.mouseEnter(autoplayControl as HTMLElement);
    await flushUiUpdates();

    const autoplaySlider = (autoplayControl as HTMLElement).querySelector(
      "input[type='range']",
    ) as HTMLInputElement | null;
    expect(autoplaySlider).not.toBeNull();
    await mouseDown(autoplaySlider as HTMLElement, {
      button: 0,
      clientX: 24,
      clientY: 24,
    });
    expect((imageStage as HTMLElement).classList.contains("is-dragging")).toBe(
      false,
    );

    const zoomControl = document.querySelector(
      ".fullscreen-zoom-control",
    ) as HTMLElement | null;
    expect(zoomControl).not.toBeNull();
    fireEvent.mouseEnter(zoomControl as HTMLElement);
    await flushUiUpdates();

    const zoomSlider = (zoomControl as HTMLElement).querySelector(
      "input[type='range']",
    ) as HTMLInputElement | null;
    expect(zoomSlider).not.toBeNull();
    await mouseDown(zoomSlider as HTMLElement, {
      button: 0,
      clientX: 24,
      clientY: 24,
    });
    expect((imageStage as HTMLElement).classList.contains("is-dragging")).toBe(
      false,
    );

    fireEvent.mouseUp(window);
  });

  it(
    "全屏非双屏支持 F1/F2/F3 切换图片/视频/音乐模式",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      const fullscreenControlsWidthScaleSlider = screen.getByLabelText(
        /全屏视频控件最大宽度系数|Fullscreen video controls max width scale/,
      ) as HTMLInputElement;
      const fullscreenControlsWidthScale = 0.8;
      fireEvent.change(fullscreenControlsWidthScaleSlider, {
        target: { value: String(fullscreenControlsWidthScale) },
      });
      await flushUiUpdates();
      await keyDown(window, { key: "Escape", code: "Escape" });

      const imageModeButton = screen.getByRole("button", {
        name: "图片模式",
      }) as HTMLButtonElement;
      const videoModeButton = screen.getByRole("button", {
        name: "视频模式",
      }) as HTMLButtonElement;
      const musicModeButton = screen.getByRole("button", {
        name: "音乐模式",
      }) as HTMLButtonElement;

      await keyDown(window, { key: "f", code: "KeyF" });
      expect(imageModeButton.classList.contains("is-active")).toBe(true);
      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as HTMLElement | null;
      expect(fullscreenLayer).not.toBeNull();
      const imageControlsWidth = (
        fullscreenLayer as HTMLElement
      ).style.getPropertyValue("--mpx-fullscreen-controls-width");
      expect(imageControlsWidth).not.toBe("");
      const expectedControlsWidth = `${resolveFullscreenControlsWidth({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        widthCap: toAbsolutePx(
          "fullscreenVideoControlsMaxWidth",
          fullscreenControlsWidthScale,
        ),
      })}px`;
      expect(imageControlsWidth).toBe(expectedControlsWidth);

      await keyDown(window, { key: "F2", code: "F2" });
      await waitFor(() => {
        expect(videoModeButton.classList.contains("is-active")).toBe(true);
      });
      const videoControlsWidth = (
        fullscreenLayer as HTMLElement
      ).style.getPropertyValue("--mpx-fullscreen-controls-width");
      expect(videoControlsWidth).toBe(imageControlsWidth);
      const videoControlsShell = document.querySelector(
        ".fullscreen-video-controls-shell.fullscreen-controls-shell",
      ) as HTMLElement | null;
      expect(videoControlsShell).not.toBeNull();

      await keyDown(window, { key: "F3", code: "F3" });
      await waitFor(() => {
        expect(musicModeButton.classList.contains("is-active")).toBe(true);
      });
      const musicFullscreenRoot = document.querySelector(
        ".music-visualizer.is-fullscreen",
      ) as HTMLElement | null;
      expect(musicFullscreenRoot).not.toBeNull();
      const musicControlsWidth = (
        musicFullscreenRoot as HTMLElement
      ).style.getPropertyValue("--mpx-fullscreen-controls-width");
      expect(musicControlsWidth).toBe(imageControlsWidth);
      const musicControlsShell = document.querySelector(
        ".music-controls-shell.is-fullscreen-floating.fullscreen-controls-shell",
      ) as HTMLElement | null;
      expect(musicControlsShell).not.toBeNull();

      await keyDown(window, { key: "F1", code: "F1" });
      await waitFor(() => {
        expect(imageModeButton.classList.contains("is-active")).toBe(true);
      });
      expect(screen.queryByText("无可用图片")).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it("全屏双显示下 F1/F2/F3 不切换模式", async () => {
    render(<App />);

    const imageModeButton = screen.getByRole("button", {
      name: "图片模式",
    }) as HTMLButtonElement;
    const videoModeButton = screen.getByRole("button", {
      name: "视频模式",
    }) as HTMLButtonElement;

    await click(videoModeButton);
    expect(videoModeButton.classList.contains("is-active")).toBe(true);

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
    expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();

    await keyDown(window, { key: "F1", code: "F1" });

    expect(videoModeButton.classList.contains("is-active")).toBe(true);
    expect(imageModeButton.classList.contains("is-active")).toBe(false);
  });

  it("全屏 D/S 快捷键支持双屏切换、按焦点回单屏与左右交换", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });
    expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();

    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const imagePane = document.querySelector(
      ".fullscreen-image",
    ) as HTMLElement | null;
    const videoPane = document.querySelector(
      ".fullscreen-video",
    ) as HTMLElement | null;
    expect(imagePane).not.toBeNull();
    expect(videoPane).not.toBeNull();
    expect(
      document.querySelector(".fullscreen-media-image-element"),
    ).not.toBeNull();
    expect((videoPane as HTMLElement).classList.contains("is-pane-focus")).toBe(
      true,
    );

    fireEvent.mouseMove(imagePane as HTMLElement, { clientX: 24, clientY: 24 });
    expect((imagePane as HTMLElement).classList.contains("is-pane-focus")).toBe(
      true,
    );

    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(
        screen.queryByLabelText("调整全屏分屏比例"),
      ).not.toBeInTheDocument();
    });
    expect(document.querySelector(".fullscreen-image")).not.toBeNull();
    expect(document.querySelector(".fullscreen-video")).toBeNull();

    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const fullscreenContent = document.querySelector(
      ".fullscreen-content",
    ) as HTMLElement | null;
    expect(fullscreenContent).not.toBeNull();
    const firstPaneBeforeSwap = fullscreenContent?.querySelector(
      ".fullscreen-pane",
    ) as HTMLElement | null;
    const beforeImageFirst =
      firstPaneBeforeSwap?.classList.contains("fullscreen-image") ?? false;

    await keyDown(window, { key: "s", code: "KeyS" });
    const firstPaneAfterSwap = fullscreenContent?.querySelector(
      ".fullscreen-pane",
    ) as HTMLElement | null;
    const afterImageFirst =
      firstPaneAfterSwap?.classList.contains("fullscreen-image") ?? false;
    expect(afterImageFirst).toBe(!beforeImageFirst);
  });

  it("从video模式进入dual模式时，image pane应自动加载图片且autoplay按钮可用", async () => {
    render(<App />);

    // 切换到video模式
    await click(screen.getByRole("button", { name: "视频模式" }));
    
    // 进入全屏（video-only）
    await keyDown(window, { key: "f", code: "KeyF" });
    expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();

    // 切换到dual模式
    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    // 验证image pane存在且已加载图片
    const imagePane = document.querySelector(".fullscreen-image") as HTMLElement | null;
    expect(imagePane).not.toBeNull();
    expect(document.querySelector(".fullscreen-media-image-element")).not.toBeNull();

    // 切换焦点到image pane
    fireEvent.mouseMove(imagePane as HTMLElement, { clientX: 24, clientY: 24 });
    await flushUiUpdates();
    expect((imagePane as HTMLElement).classList.contains("is-pane-focus")).toBe(true);

    // 显示footer
    const fullscreenLayer = document.querySelector(".fullscreen-layer") as HTMLElement | null;
    expect(fullscreenLayer).not.toBeNull();
    fireEvent.mouseMove(fullscreenLayer as Element, {
      clientY: window.innerHeight - 4,
    });
    await flushUiUpdates();

    // 验证autoplay按钮存在且可用
    const autoplayButton = screen.queryByRole("button", { name: /自动播放|autoplay/i });
    expect(autoplayButton).not.toBeNull();
    expect(autoplayButton).not.toBeDisabled();
  });

  it("从video模式切到image-only时，autoplay可启用并自动翻页", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });
    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const imagePane = document.querySelector(".fullscreen-image") as HTMLElement | null;
    expect(imagePane).not.toBeNull();
    fireEvent.mouseMove(imagePane as HTMLElement, { clientX: 24, clientY: 24 });
    await flushUiUpdates();

    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();
    });
    expect(document.querySelector(".fullscreen-image")).not.toBeNull();
    expect(document.querySelector(".fullscreen-video")).toBeNull();

    const fullscreenLayer = document.querySelector(".fullscreen-layer") as HTMLElement | null;
    expect(fullscreenLayer).not.toBeNull();
    fireEvent.mouseMove(fullscreenLayer as Element, {
      clientY: window.innerHeight - 4,
    });
    await flushUiUpdates();

    const autoplayButton = screen.getByRole("button", { name: /自动播放|autoplay/i });
    expect(autoplayButton).not.toBeDisabled();

    const readImageSrc = () =>
      (document.querySelector(".fullscreen-media-image-element") as HTMLImageElement | null)
        ?.getAttribute("src") ?? null;

    const beforeSrc = readImageSrc();
    expect(beforeSrc).not.toBeNull();

    await click(autoplayButton);
    expect(autoplayButton).toHaveAttribute("aria-pressed", "true");

    await waitFor(
      () => {
        const afterSrc = readImageSrc();
        expect(afterSrc).not.toBeNull();
        expect(afterSrc).not.toBe(beforeSrc);
      },
      { timeout: 3600 },
    );
  });

  it("从video模式进入dual后，image pane焦点下可用滚轮翻页", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });
    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const imagePane = document.querySelector(".fullscreen-image") as HTMLElement | null;
    expect(imagePane).not.toBeNull();
    fireEvent.mouseMove(imagePane as HTMLElement, { clientX: 24, clientY: 24 });
    await flushUiUpdates();

    const readImageSrc = () =>
      (document.querySelector(".fullscreen-media-image-element") as HTMLImageElement | null)
        ?.getAttribute("src") ?? null;

    const beforeSrc = readImageSrc();
    expect(beforeSrc).not.toBeNull();

    fireEvent.wheel(imagePane as HTMLElement, { deltaY: 120 });
    await flushUiUpdates();

    await waitFor(() => {
      const afterSrc = readImageSrc();
      expect(afterSrc).not.toBeNull();
      expect(afterSrc).not.toBe(beforeSrc);
    });
  });

  it("video模式全屏下，Ctrl+上下可切换播放对象（video-only 与 dual）", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });

    const readVideoSrc = () =>
      (document.querySelector(".fullscreen-media-video-element") as HTMLVideoElement | null)
        ?.getAttribute("src") ?? null;

    const firstSrc = readVideoSrc();
    expect(firstSrc).not.toBeNull();

    await keyDown(window, {
      key: "ArrowDown",
      code: "ArrowDown",
      ctrlKey: true,
    });
    await waitFor(() => {
      const secondSrc = readVideoSrc();
      expect(secondSrc).not.toBeNull();
      expect(secondSrc).not.toBe(firstSrc);
    });

    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const beforeDualNextSrc = readVideoSrc();
    expect(beforeDualNextSrc).not.toBeNull();

    await keyDown(window, {
      key: "ArrowDown",
      code: "ArrowDown",
      ctrlKey: true,
    });
    await waitFor(() => {
      const afterDualNextSrc = readVideoSrc();
      expect(afterDualNextSrc).not.toBeNull();
      expect(afterDualNextSrc).not.toBe(beforeDualNextSrc);
    });
  });

  it("video模式全屏列表循环下，播放结束会自动切到下一个对象", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });

    const readVideoSrc = () =>
      (document.querySelector(".fullscreen-media-video-element") as HTMLVideoElement | null)
        ?.getAttribute("src") ?? null;

    const beforeEndedSrc = readVideoSrc();
    expect(beforeEndedSrc).not.toBeNull();

    const video = document.querySelector(".fullscreen-media-video-element") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    fireEvent.ended(video as HTMLVideoElement);
    await flushUiUpdates();

    await waitFor(() => {
      const afterEndedSrc = readVideoSrc();
      expect(afterEndedSrc).not.toBeNull();
      expect(afterEndedSrc).not.toBe(beforeEndedSrc);
    });
  });

  it("image已有焦点时从video进入dual后，快捷键P可切换autoplay", async () => {
    render(<App />);

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });
    await keyDown(window, { key: "d", code: "KeyD" });
    await waitFor(() => {
      expect(screen.getByLabelText("调整全屏分屏比例")).toBeInTheDocument();
    });

    const imagePane = document.querySelector(".fullscreen-image") as HTMLElement | null;
    expect(imagePane).not.toBeNull();
    fireEvent.mouseMove(imagePane as HTMLElement, { clientX: 24, clientY: 24 });
    await flushUiUpdates();

    const fullscreenLayer = document.querySelector(".fullscreen-layer") as HTMLElement | null;
    expect(fullscreenLayer).not.toBeNull();
    fireEvent.mouseMove(fullscreenLayer as Element, {
      clientY: window.innerHeight - 4,
    });
    await flushUiUpdates();

    const autoplayButton = screen.getByRole("button", { name: /自动播放|autoplay/i });
    expect(autoplayButton).toHaveAttribute("aria-pressed", "false");

    await keyDown(window, { key: "p", code: "KeyP" });

    await waitFor(() => {
      expect(autoplayButton).toHaveAttribute("aria-pressed", "true");
    });
  });
});
