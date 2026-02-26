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
import { MockMediaRepository } from "../features/backend/repository/mockRepository";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI", () => {
  const uiLongTestTimeoutMs = 25_000;

  const getMetadataManageModeButton = () =>
    screen.getByRole("button", {
      name: /切换到元数据模式|切换到图像模式|元数据管理/,
    });

  const getFirstManageSidebarNodeButton = () =>
    document.querySelector(
      ".sidebar-row.is-manage .sidebar-label",
    ) as HTMLButtonElement | null;

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

  it("Sidebar 包节点在无英文/日文标题时显示文件名", async () => {
    render(<App />);
    await flushUiUpdates();

    expect(
      screen.getByRole("button", { name: "forest_pack.zip" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "森林图集" })).toBeNull();
  });

  it("Sidebar 目录源节点在无英文/日文标题时显示目录名", async () => {
    render(<App />);
    await flushUiUpdates();

    expect(
      screen.getByRole("button", { name: "仅图片目录" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "目录直读：仅图片目录" }),
    ).toBeNull();
  });

  it(
    "Sidebar 聚焦目录节点时双击可稳定折叠与展开",
    async () => {
      render(<App />);
      await flushUiUpdates();

      const rootFolderButton = screen.getByRole("button", {
        name: /X盘\/收藏/,
      });
      expect(screen.getByRole("button", { name: /收藏/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "画廊A" })).toBeInTheDocument();

      await click(rootFolderButton);
      fireEvent.doubleClick(rootFolderButton);
      await flushUiUpdates();

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "画廊A" })).toBeNull();
      });

      fireEvent.doubleClick(rootFolderButton);
      await flushUiUpdates();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "画廊A" }),
        ).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it("非全屏 Sidebar 焦点按 R 打开重命名弹窗，Esc 可关闭", async () => {
    render(<App />);
    await flushUiUpdates();

    const sidebarNodeButton = screen.getByRole("button", {
      name: "forest_pack.zip",
    });
    await click(sidebarNodeButton);
    await keyDown(sidebarNodeButton, { key: "r", code: "KeyR" });

    const renameDialog = screen.getByRole("dialog", { name: "重命名" });
    expect(renameDialog).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "重命名" })).toBeInTheDocument();

    await keyDown(screen.getByRole("textbox", { name: "重命名" }), {
      key: "Escape",
      code: "Escape",
    });
    expect(screen.queryByRole("dialog", { name: "重命名" })).toBeNull();
  });

  it(
    "非全屏 Sidebar 焦点按 Delete 直接打开删除确认弹窗",
    async () => {
      render(<App />);
      await flushUiUpdates();

      const sidebarNodeButton = screen.getByRole("button", {
        name: "forest_pack.zip",
      });
      await click(sidebarNodeButton);
      await keyDown(sidebarNodeButton, { key: "Delete", code: "Delete" });

      expect(
        screen.getByRole("dialog", { name: "永久删除确认" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "仅移除" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "Esc 可关闭设置与检索状态，且主区右键不误关闭检索",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      expect(
        screen.getByRole("dialog", { name: "设置面板" }),
      ).toBeInTheDocument();
      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("dialog", { name: "设置面板" })).toBeNull();

      await click(screen.getByRole("button", { name: "设置" }));
      const settingsMask = document.querySelector(
        ".settings-mask",
      ) as HTMLElement | null;
      expect(settingsMask).not.toBeNull();
      await mouseDown(settingsMask as HTMLElement, { button: 2 });
      expect(screen.queryByRole("dialog", { name: "设置面板" })).toBeNull();

      await click(screen.getByRole("button", { name: "检索" }));
      expect(screen.getByLabelText("名称")).toBeInTheDocument();

      const mainPane = document.querySelector(
        ".main-pane",
      ) as HTMLElement | null;
      expect(mainPane).not.toBeNull();
      await mouseDown(mainPane as HTMLElement, { button: 2 });
      expect(screen.getByLabelText("名称")).toBeInTheDocument();

      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByLabelText("名称")).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "Esc 关闭元数据管理，右键关闭全屏层",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());
      expect(
        screen.getByRole("button", { name: "同步名称" }),
      ).toBeInTheDocument();
      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("button", { name: "同步名称" })).toBeNull();

      await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
      await keyDown(window, { key: "f", code: "KeyF" });

      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).not.toBeNull();
      });

      const fullscreenLayer = document.querySelector(
        ".fullscreen-layer",
      ) as HTMLElement | null;
      expect(fullscreenLayer).not.toBeNull();
      await mouseDown(fullscreenLayer as HTMLElement, { button: 2 });

      await waitFor(() => {
        expect(document.querySelector(".fullscreen-layer")).toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "管理模式下 Sidebar 与主视图 checker 互斥，且视频模式可进入管理",
    async () => {
      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
        expect(
          document.querySelectorAll(".thumb-card-main").length,
        ).toBeGreaterThan(0);
      });

      const targetSidebarButton = screen.getByRole("button", {
        name: "画廊A",
      }) as HTMLButtonElement;
      const targetSidebarRow = targetSidebarButton.closest(
        ".sidebar-row",
      ) as HTMLElement | null;
      expect(targetSidebarRow).not.toBeNull();
      await click(targetSidebarButton);
      expect(
        (targetSidebarRow as HTMLElement).classList.contains("is-selected"),
      ).toBe(true);

      const firstThumbCard = document.querySelector(
        ".image-grid.is-manage .thumb-card",
      ) as HTMLElement | null;
      expect(firstThumbCard).not.toBeNull();
      await mouseDown(
        document.querySelector(
          ".image-grid.is-manage .thumb-card-main",
        ) as HTMLButtonElement,
        { button: 0 },
      );
      fireEvent.mouseUp(window);
      expect(
        (firstThumbCard as HTMLElement).classList.contains("is-selected"),
      ).toBe(true);
      expect(
        (targetSidebarRow as HTMLElement).classList.contains("is-selected"),
      ).toBe(false);

      await click(screen.getByRole("button", { name: "视频模式" }));
      expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "隐藏" })).toBeNull();
      expect(screen.queryByRole("button", { name: "取消隐藏" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it("管理模式下点击缩略图即可切换 checker 状态", async () => {
    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    await waitFor(() => {
      expect(document.querySelector(".thumb-card-main")).not.toBeNull();
    });

    const firstCard = document.querySelector(
      ".thumb-card.is-manage",
    ) as HTMLElement | null;
    const thumbCardMain = document.querySelector(
      ".thumb-card-main",
    ) as HTMLButtonElement | null;
    expect(firstCard).not.toBeNull();
    expect(thumbCardMain).not.toBeNull();

    await mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 });
    fireEvent.mouseUp(window);
    expect((firstCard as HTMLElement).classList.contains("is-selected")).toBe(
      true,
    );

    await mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 });
    fireEvent.mouseUp(window);
    expect((firstCard as HTMLElement).classList.contains("is-selected")).toBe(
      false,
    );
  });

  it("main-footer 始终显示，focus 清空后显示当前 Sidebar 路径", async () => {
    render(<App />);

    const footer = document.querySelector(".main-footer") as HTMLElement | null;
    expect(footer).not.toBeNull();
    expect((footer?.textContent ?? "").trim().length).toBeGreaterThan(0);

    await click(screen.getByRole("button", { name: "画廊A" }));
    await keyDown(window, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      const footerSpans = document.querySelectorAll(".main-footer span");
      expect(footerSpans.length).toBeGreaterThanOrEqual(1);
      expect(footerSpans[0]?.textContent ?? "").toContain("X盘/收藏/画廊A");
    });
  });

  it(
    "管理删除 Sidebar 节点部分失败时，提示文案与 failed 计数保持一致",
    async () => {
      vi.spyOn(
        MockMediaRepository.prototype,
        "deleteSidebarNodesSync",
      ).mockImplementation(() => ({
        deleted_count: 1,
        failed: [
          {
            node_id: "folder:not-found",
            reason: "node not found",
          },
        ],
        updated_at_ms: Date.now(),
      }));

      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
      });

      await click(getFirstManageSidebarNodeButton() as HTMLButtonElement);
      await click(screen.getByRole("button", { name: "删除" }));
      await click(
        screen.getByRole("checkbox", {
          name: "我了解此操作将永久不可逆地删除选中数据",
        }),
      );
      await click(screen.getByRole("button", { name: "确定删除" }));

      await waitFor(() => {
        expect(screen.getByText("已删除 1 项，失败 1 项")).toBeInTheDocument();
      });

      expect(screen.queryByText(/管理操作:/)).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "管理删除图片部分失败时，提示文案与 failed 计数保持一致",
    async () => {
      vi.spyOn(
        MockMediaRepository.prototype,
        "deleteImageItemsSync",
      ).mockImplementation(() => ({
        deleted_count: 1,
        failed: [
          {
            image_id: "img-not-found",
            reason: "image not found",
          },
        ],
        updated_at_ms: Date.now(),
      }));

      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".thumb-card-main").length,
        ).toBeGreaterThan(0);
      });

      await mouseDown(
        document.querySelector(".thumb-card-main") as HTMLButtonElement,
        { button: 0 },
      );
      fireEvent.mouseUp(window);
      await click(screen.getByRole("button", { name: "删除" }));
      await click(
        screen.getByRole("checkbox", {
          name: "我了解此操作将永久不可逆地删除选中数据",
        }),
      );
      await click(screen.getByRole("button", { name: "确定删除" }));

      await waitFor(() => {
        expect(screen.getByText("已删除 1 张，失败 1 项")).toBeInTheDocument();
      });

      expect(screen.queryByText(/管理操作:/)).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "文件管理改为工具栏后仍可执行删除流程",
    async () => {
      vi.spyOn(
        MockMediaRepository.prototype,
        "deleteImageItemsSync",
      ).mockImplementation((request) => ({
        deleted_count: request.image_ids.length,
        failed: [],
        updated_at_ms: Date.now(),
      }));

      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".thumb-card-main").length,
        ).toBeGreaterThan(0);
      });

      expect(
        screen.queryByRole("group", { name: "AI广告审核控制" }),
      ).toBeNull();

      await mouseDown(
        document.querySelector(".thumb-card-main") as HTMLButtonElement,
        { button: 0 },
      );
      fireEvent.mouseUp(window);
      await click(screen.getByRole("button", { name: "删除" }));
      await click(
        screen.getByRole("checkbox", {
          name: "我了解此操作将永久不可逆地删除选中数据",
        }),
      );
      await click(screen.getByRole("button", { name: "确定删除" }));

      await waitFor(() => {
        expect(screen.getByText("已删除 1 张")).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it("真实渲染链路可输出可渲染媒体 URL（Main/Metadata/Fullscreen）", async () => {
    render(<App />);

    await waitFor(() => {
      const firstThumbImage = document.querySelector(
        ".thumb-media-image",
      ) as HTMLImageElement | null;
      expect(firstThumbImage).not.toBeNull();
      expect(firstThumbImage?.getAttribute("src")).toContain(
        "data:image/svg+xml",
      );
    });

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    await waitFor(() => {
      const metadataImage = document.querySelector(
        ".metadata-image-real",
      ) as HTMLImageElement | null;
      expect(metadataImage).not.toBeNull();
      expect(metadataImage?.getAttribute("src")).toContain(
        "data:image/svg+xml",
      );
    });

    await keyDown(window, { key: "f", code: "KeyF" });

    await waitFor(() => {
      const fullscreenImage = document.querySelector(
        ".fullscreen-media-image-element",
      ) as HTMLImageElement | null;
      expect(fullscreenImage).not.toBeNull();
      expect(fullscreenImage?.getAttribute("src")).toContain(
        "data:image/svg+xml",
      );
    });

    const fullscreenImagePane = document.querySelector(
      ".fullscreen-image",
    ) as HTMLElement | null;
    expect(fullscreenImagePane).not.toBeNull();
    fireEvent.mouseEnter(fullscreenImagePane as HTMLElement);

    await keyDown(window, { key: "d", code: "KeyD" });

    await waitFor(() => {
      expect(screen.queryByText("无可用视频源")).not.toBeInTheDocument();
      const fullscreenVideo = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(fullscreenVideo).not.toBeNull();
      expect(fullscreenVideo?.getAttribute("src")).toContain(
        "about:blank#mock-video",
      );
    });

    const fullscreenVideoPane = document.querySelector(
      ".fullscreen-video",
    ) as HTMLElement | null;
    expect(fullscreenVideoPane).not.toBeNull();
    fireEvent.mouseMove(fullscreenVideoPane as HTMLElement);

    await keyDown(window, { key: "d", code: "KeyD" });

    await waitFor(() => {
      expect(screen.queryByText("无可用视频源")).not.toBeInTheDocument();
      const singleVideo = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(singleVideo).not.toBeNull();
      expect(singleVideo?.getAttribute("src")).toContain(
        "about:blank#mock-video",
      );
    });

    await keyDown(window, { key: "f", code: "KeyF" });
    await click(screen.getByRole("button", { name: "视频模式" }));

    await waitFor(() => {
      const videoElement = document.querySelector(
        ".video-screen-media",
      ) as HTMLVideoElement | null;
      expect(videoElement).not.toBeNull();
      expect(videoElement?.getAttribute("src")).toContain(
        "about:blank#mock-video",
      );
    });

    await keyDown(window, { key: "f", code: "KeyF" });

    await waitFor(() => {
      const fullscreenVideo = document.querySelector(
        ".fullscreen-media-video-element",
      ) as HTMLVideoElement | null;
      expect(fullscreenVideo).not.toBeNull();
      expect(fullscreenVideo?.getAttribute("src")).toContain(
        "about:blank#mock-video",
      );
    });

    await keyDown(window, { key: "d", code: "KeyD" });

    await waitFor(() => {
      const dualImage = document.querySelector(
        ".fullscreen-media-image-element",
      ) as HTMLImageElement | null;
      expect(dualImage).not.toBeNull();
    });

    const dualImagePane = document.querySelector(
      ".fullscreen-image",
    ) as HTMLElement | null;
    expect(dualImagePane).not.toBeNull();
    fireEvent.mouseMove(dualImagePane as HTMLElement);

    await keyDown(window, { key: "d", code: "KeyD" });

    await waitFor(() => {
      expect(screen.queryByText("无可用图片")).not.toBeInTheDocument();
      const singleImage = document.querySelector(
        ".fullscreen-media-image-element",
      ) as HTMLImageElement | null;
      expect(singleImage).not.toBeNull();
      expect(singleImage?.getAttribute("src")).toContain("data:image/svg+xml");
    });

    await keyDown(window, { key: "f", code: "KeyF" });
  });

  it(
    "检索模式将筛选控件渲染到元数据编辑区顶部并实时生效",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "检索" }));
      const featureControls = document.querySelector(
        ".feature-controls",
      ) as HTMLElement | null;
      expect(featureControls).not.toBeNull();
      const featureScope = within(featureControls as HTMLElement);
      expect(
        featureScope.getByPlaceholderText("按名称模糊匹配"),
      ).toBeInTheDocument();
      expect(
        featureScope.getByPlaceholderText("按作品名模糊匹配"),
      ).toBeInTheDocument();
      expect(screen.getByText(/命中节点:/)).toBeInTheDocument();

      fireEvent.change(featureScope.getByPlaceholderText("按名称模糊匹配"), {
        target: { value: "002" },
      });
      fireEvent.change(
        featureScope.getByPlaceholderText("输入作者，支持自动补完"),
        { target: { value: "Nori" } },
      );
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "视频模式检索面板仅展示特征检索",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await click(screen.getByRole("button", { name: "检索" }));

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "向量检索" })).toBeNull();
      expect(screen.queryByText(/当前结果:/)).toBeNull();
      expect(screen.getByText(/命中节点:/)).toBeInTheDocument();

      const featureControls = document.querySelector(
        ".feature-controls",
      ) as HTMLElement | null;
      expect(featureControls).not.toBeNull();
      const featureScope = within(featureControls as HTMLElement);
      expect(featureScope.getByLabelText("名称")).toBeInTheDocument();
      expect(featureScope.getByLabelText("作品名")).toBeInTheDocument();
      expect(featureScope.getByLabelText("社团")).toBeInTheDocument();
      expect(featureScope.getByLabelText("作者")).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "布局锁定开启后，主界面分割条拖动失效",
    async () => {
      render(<App />);

      const sidebar = document.querySelector(".sidebar") as HTMLElement | null;
      expect(sidebar).not.toBeNull();
      const widthBeforeLock = sidebar!.style.width;

      await click(screen.getByRole("button", { name: "设置" }));
      const layoutLockToggle = screen.getByLabelText("布局锁定");
      await click(layoutLockToggle);
      await click(screen.getByRole("button", { name: "关闭" }));

      const sidebarSplitter = screen.getByRole("separator", {
        name: "调整 Sidebar 宽度",
      });
      await mouseDown(sidebarSplitter, { clientX: 220 });
      fireEvent.mouseMove(window, { clientX: 640 });
      fireEvent.mouseUp(window);

      const widthAfterLock = (document.querySelector(".sidebar") as HTMLElement)
        .style.width;
      expect(widthAfterLock).toBe(widthBeforeLock);
    },
    uiLongTestTimeoutMs,
  );

  it("方向键右键在无 focus 时可建立并切换图片 focus", async () => {
    render(<App />);

    const readToolbarProgress = () => {
      const line =
        document.querySelector(".main-toolbar-title")?.textContent ?? "";
      const matched = line.match(/\((\d+)\/(\d+)\)/);
      return {
        current: Number(matched?.[1] ?? 0),
        total: Number(matched?.[2] ?? 0),
      };
    };

    expect(readToolbarProgress().current).toBe(1);
    expect(readToolbarProgress().total).toBeGreaterThan(1);
    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });

    expect(readToolbarProgress().current).toBe(2);
  });

  it("图片主工具栏标题显示当前图片序号与图包总数", async () => {
    render(<App />);
    await flushUiUpdates();

    const toolbarTitle =
      document.querySelector(".main-toolbar-title")?.textContent ?? "";
    expect(toolbarTitle).toContain("幻旅系列 001");
    expect(toolbarTitle).toMatch(/\(\d+\/\d+\)/);
  });

  it("快捷键支持将滚轮下绑定为下一张图片", async () => {
    const current = useUiStore.getState().shortcuts;
    useUiStore.setState({
      shortcuts: {
        ...current,
        imageNext: "WheelDown",
      },
    });

    render(<App />);

    const readToolbarProgress = () => {
      const line =
        document.querySelector(".main-toolbar-title")?.textContent ?? "";
      const matched = line.match(/\((\d+)\/(\d+)\)/);
      return Number(matched?.[1] ?? 0);
    };

    expect(readToolbarProgress()).toBe(1);
    await wheel(window, { deltaY: 80 });
    expect(readToolbarProgress()).toBe(2);
  });

  it("鼠标点击与键盘方向键共享 focus，Esc 可清空 focus", async () => {
    render(<App />);

    const readToolbarProgress = () => {
      const line =
        document.querySelector(".main-toolbar-title")?.textContent ?? "";
      const matched = line.match(/\((\d+)\/(\d+)\)/);
      return Number(matched?.[1] ?? 0);
    };

    expect(screen.getByLabelText("图包名")).toBeInTheDocument();

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    expect(screen.queryByLabelText("图包名")).not.toBeInTheDocument();
    expect(readToolbarProgress()).toBe(1);

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    expect(readToolbarProgress()).toBe(2);

    await keyDown(window, { key: "Escape", code: "Escape" });
    expect(readToolbarProgress()).toBe(1);
    expect(screen.getByLabelText("图包名")).toBeInTheDocument();
  });

  it("方向键上下按网格移动，到边界时钳制到首末项", async () => {
    render(<App />);

    const readFocusedOrdinal = () => {
      const line =
        document.querySelector(".main-toolbar-title")?.textContent ?? "";
      const matched = line.match(/\((\d+)\/(\d+)\)/);
      return Number(matched?.[1] ?? 0);
    };

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    const afterRight = readFocusedOrdinal();
    expect(afterRight).toBe(2);

    await keyDown(window, { key: "ArrowDown", code: "ArrowDown" });
    const afterDown = readFocusedOrdinal();
    expect(afterDown).toBeGreaterThan(afterRight);

    await keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    const afterUp = readFocusedOrdinal();
    expect(afterUp).toBe(afterRight);

    await keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    const afterSecondUp = readFocusedOrdinal();
    expect(afterSecondUp).toBe(1);
  });

  it("纯文件名模式为滚动列表且不显示分页控件", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: /切换到纯文件名模式/ }));

    expect(screen.getByText("文件名")).toBeInTheDocument();
    expect(screen.getByText(/img_0001\.jpg/)).toBeInTheDocument();
    expect(
      screen.queryByText(/第\s+\d+\s+\/\s+\d+\s+页/),
    ).not.toBeInTheDocument();
  });

});
