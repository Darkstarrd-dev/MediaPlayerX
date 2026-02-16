import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { LibrarySnapshotDto } from "./contracts/backend";
import { MockMediaRepository } from "./features/backend/repository/mockRepository";
import { resetUiStoreState, useUiStore } from "./store/useUiStore";

describe("MediaPlayer 虚拟 UI", () => {
  const uiLongTestTimeoutMs = 25_000;

  const getMetadataManageModeButton = () =>
    screen.getByRole("button", {
      name: /切换到元数据模式|切换到图像模式|元数据管理/,
    });

  const getFirstManageNodeChecker = () =>
    document.querySelector(
      ".sidebar-row.is-manage .sidebar-manage-checker",
    ) as HTMLInputElement | null;

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

  it("支持图片/视频模式切换", async () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "检索" })).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "视频模式" }));

    expect(
      await screen.findByRole("button", { name: "播放" }),
    ).toBeInTheDocument();
  });

  it("应用启动阶段不会触发 Maximum update depth exceeded", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<App />);

    for (let i = 0; i < 3; i += 1) {
      fireEvent(window, new Event("resize"));
    }

    await waitFor(() => {
      const hasMaxDepthError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(" ");
        return message.includes("Maximum update depth exceeded");
      });
      expect(hasMaxDepthError).toBe(false);
    });
  });

  it("管理模式可展开管理容器并与检索容器互斥", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "检索" }));
    expect(screen.getByLabelText("名称")).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "文件管理" }));
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
    expect(screen.queryByLabelText("名称")).not.toBeInTheDocument();
  });

  it("文件管理与元数据管理互斥，且可一键切换到检索模式", async () => {
    render(<App />);

    const searchButton = screen.getByRole("button", {
      name: "检索",
    }) as HTMLButtonElement;
    const fileManageButton = screen.getByRole("button", { name: "文件管理" });
    const metadataManageButton = getMetadataManageModeButton();

    await click(metadataManageButton);
    expect(searchButton.disabled).toBe(false);
    expect(metadataManageButton.classList.contains("is-active")).toBe(true);
    expect(fileManageButton.classList.contains("is-active")).toBe(false);

    await click(searchButton);
    expect(searchButton.classList.contains("is-active")).toBe(true);
    expect(metadataManageButton.classList.contains("is-active")).toBe(false);
    expect(screen.getByLabelText("名称")).toBeInTheDocument();

    await click(fileManageButton);
    expect(searchButton.classList.contains("is-active")).toBe(false);
    expect(fileManageButton.classList.contains("is-active")).toBe(true);
    expect(screen.queryByLabelText("名称")).toBeNull();
  });

  it("文件管理控件改为主工具栏承载，且摘要右对齐显示", async () => {
    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    expect(document.querySelector(".manage-panel")).toBeNull();
    expect(document.querySelector(".main-toolbar-summary")).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByText("未选择条目")).toBeInTheDocument();
    });
  });

  it("检索/文件管理/元数据管理快速切换不会抛出运行时错误", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<App />);

    const searchButton = screen.getByRole("button", { name: "检索" });
    const manageButton = screen.getByRole("button", { name: "文件管理" });
    const metadataManageButton = getMetadataManageModeButton();

    for (let index = 0; index < 5; index += 1) {
      await click(manageButton);
      await click(metadataManageButton);
      await click(searchButton);
    }

    await waitFor(() => {
      const hasRuntimeError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(" ");
        return (
          message.includes("Error:") ||
          message.includes("TypeError") ||
          message.includes("Maximum update depth exceeded")
        );
      });
      expect(hasRuntimeError).toBe(false);
    });
  });

  it("快速切换 Sidebar 节点时缩略图列表保持可渲染且不抛错", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<App />);

    const node1 = screen.getByRole("button", { name: "海岸" });
    const node2 = screen.getByRole("button", { name: "画廊A" });

    for (let index = 0; index < 8; index += 1) {
      await click(node1);
      await click(node2);
    }

    await waitFor(() => {
      expect(
        document.querySelectorAll(".thumb-card-main").length,
      ).toBeGreaterThan(0);
    });

    const hasRuntimeError = consoleErrorSpy.mock.calls.some((call) => {
      const message = call.map((item) => String(item)).join(" ");
      return message.includes("Error:") || message.includes("TypeError");
    });
    expect(hasRuntimeError).toBe(false);
  });

  it("Sidebar 包节点在无英文/日文标题时显示文件名", async () => {
    render(<App />);
    await flushUiUpdates();

    expect(
      screen.getByRole("button", { name: "coastline_album.zip" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "海岸线合集" })).toBeNull();
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
    "管理模式删除确认弹窗需勾选不可逆确认后才能提交",
    async () => {
      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
      });

      const firstManageNodeChecker = getFirstManageNodeChecker();
      expect(firstManageNodeChecker).not.toBeNull();
      await click(firstManageNodeChecker as HTMLInputElement);

      await click(screen.getByRole("button", { name: "删除" }));
      expect(
        screen.getByRole("dialog", { name: "永久删除确认" }),
      ).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", {
        name: "确定删除",
      }) as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(true);

      await click(
        screen.getByRole("checkbox", {
          name: "我了解此操作将永久不可逆地删除选中数据",
        }),
      );
      expect(confirmButton.disabled).toBe(false);

      await click(screen.getByRole("button", { name: "取消" }));
      expect(
        screen.queryByRole("dialog", { name: "永久删除确认" }),
      ).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "Esc 按优先级先关闭删除确认，再关闭管理面板",
    async () => {
      render(<App />);
      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
      });

      await click(getFirstManageNodeChecker() as HTMLInputElement);
      await click(screen.getByRole("button", { name: "删除" }));
      expect(
        screen.getByRole("dialog", { name: "永久删除确认" }),
      ).toBeInTheDocument();

      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("dialog", { name: "永久删除确认" })).toBeNull();
      expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();

      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("button", { name: "删除" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it("Esc 可关闭设置与检索状态，且主区右键不误关闭检索", async () => {
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

    const mainPane = document.querySelector(".main-pane") as HTMLElement | null;
    expect(mainPane).not.toBeNull();
    await mouseDown(mainPane as HTMLElement, { button: 2 });
    expect(screen.getByLabelText("名称")).toBeInTheDocument();

    await keyDown(window, { key: "Escape", code: "Escape" });
    expect(screen.queryByLabelText("名称")).toBeNull();
  });

  it("Esc 关闭元数据管理，右键关闭全屏层", async () => {
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
  });

  it("管理模式下 Sidebar 与主视图 checker 互斥，且视频模式可进入管理", async () => {
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

    const firstSidebarRow = document.querySelector(
      ".sidebar-row.is-manage",
    ) as HTMLElement | null;
    expect(firstSidebarRow).not.toBeNull();
    await click(getFirstManageNodeChecker() as HTMLInputElement);
    expect(
      (firstSidebarRow as HTMLElement).classList.contains("is-selected"),
    ).toBe(true);

    const firstThumbCard = document.querySelector(
      ".thumb-card.is-manage",
    ) as HTMLElement | null;
    expect(firstThumbCard).not.toBeNull();
    await mouseDown(
      document.querySelector(".thumb-card-main") as HTMLButtonElement,
      { button: 0 },
    );
    fireEvent.mouseUp(window);
    expect(
      (firstThumbCard as HTMLElement).classList.contains("is-selected"),
    ).toBe(true);
    expect(
      (firstSidebarRow as HTMLElement).classList.contains("is-selected"),
    ).toBe(false);

    await click(screen.getByRole("button", { name: "视频模式" }));
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "隐藏" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消隐藏" })).toBeDisabled();
  });

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

  it("管理模式在紧凑窗口下保持稳定：无最大更新深度报错、无折叠按钮、缩略图容器不可滚动", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    await waitFor(() => {
      expect(document.querySelector(".image-grid.is-manage")).not.toBeNull();
    });

    expect(screen.queryByRole("button", { name: "折叠" })).toBeNull();

    const grid = document.querySelector(
      ".image-grid.is-manage",
    ) as HTMLElement | null;
    expect(grid).not.toBeNull();
    expect(grid?.classList.contains("is-manage")).toBe(true);

    for (let i = 0; i < 5; i += 1) {
      fireEvent(window, new Event("resize"));
    }

    await waitFor(() => {
      const hasMaxDepthError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(" ");
        return message.includes("Maximum update depth exceeded");
      });
      expect(hasMaxDepthError).toBe(false);
    });
  });

  it(
    "隐藏项在非管理模式不可见",
    async () => {
      render(<App />);

      expect(screen.queryAllByText("幻旅系列 001 #1").length).toBeGreaterThan(
        0,
      );

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
      await click(screen.getByRole("button", { name: "隐藏" }));

      await waitFor(() => {
        expect(screen.getByText("隐藏完成：1 项")).toBeInTheDocument();
      });

      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(screen.queryByText("幻旅系列 001 #1")).not.toBeInTheDocument();
      });

      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(screen.queryAllByText("幻旅系列 001 #1").length).toBeGreaterThan(
          0,
        );
      });

      const hiddenThumbButton = screen
        .getAllByText("幻旅系列 001 #1")[0]
        ?.closest("button");
      expect(hiddenThumbButton).not.toBeNull();
      await mouseDown(hiddenThumbButton as HTMLButtonElement, { button: 0 });
      fireEvent.mouseUp(window);
      await click(screen.getByRole("button", { name: "取消隐藏" }));

      await waitFor(() => {
        expect(screen.getByText("取消隐藏完成：1 项")).toBeInTheDocument();
      });

      await click(screen.getByRole("button", { name: "文件管理" }));

      await waitFor(() => {
        expect(screen.queryAllByText("幻旅系列 001 #1").length).toBeGreaterThan(
          0,
        );
      });
    },
    uiLongTestTimeoutMs,
  );

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

  it("管理异常显示在主工具栏提示中，不占用顶部异常横幅", async () => {
    vi.spyOn(
      MockMediaRepository.prototype,
      "deleteSidebarNodes",
    ).mockImplementation(async () => {
      throw new Error("manage-delete-failed");
    });

    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    await waitFor(() => {
      expect(
        document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
          .length,
      ).toBeGreaterThan(0);
    });
    await click(getFirstManageNodeChecker() as HTMLInputElement);

    await click(screen.getByRole("button", { name: "删除" }));
    await click(
      screen.getByRole("checkbox", {
        name: "我了解此操作将永久不可逆地删除选中数据",
      }),
    );
    await click(screen.getByRole("button", { name: "确定删除" }));

    await waitFor(() => {
      expect(screen.getByText(/manage-delete-failed/)).toBeInTheDocument();
    });

    expect(document.querySelector(".backend-error-banner")).toBeNull();
  });

  it("管理删除 Sidebar 节点部分失败时，提示文案与 failed 计数保持一致", async () => {
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

    await click(getFirstManageNodeChecker() as HTMLInputElement);
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
  });

  it("管理删除图片部分失败时，提示文案与 failed 计数保持一致", async () => {
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
  });

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

  it("AI广告审核通过后仅显示工具栏按钮，点击后才展开审核面板", async () => {
    useUiStore.setState({
      adReviewVisionEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
      adReviewVisionModel: "mock-vision-model",
      adReviewVisionVerified: true,
    });

    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "广告审核" }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("group", { name: "AI广告审核控制" })).toBeNull();

    await click(screen.getByRole("button", { name: "广告审核" }));
    await waitFor(() => {
      expect(
        screen.getByRole("group", { name: "AI广告审核控制" }),
      ).toBeInTheDocument();
    });
  });

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

  it("视频模式检索面板仅展示特征检索", async () => {
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
  });

  it("布局锁定开启后，主界面分割条拖动失效", async () => {
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
  });

  it(
    "元数据管理使用主工具栏承载同步名称与获取元数据动作",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());

      expect(
        screen.getByRole("button", { name: "同步名称" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "获取元数据" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "自动生成标签" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "视觉模型生成标签" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "生成嵌入向量" })).toBeNull();
      expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it("获取元数据弹窗展示双源结果列与分源请求响应预览", async () => {
    render(<App />);

    await click(getMetadataManageModeButton());
    await click(screen.getByRole("button", { name: "获取元数据" }));

    const searchExternalMetadata = vi.fn(
      async (request: { source?: "nhentai" | "ehentai" }) => {
        if (request.source === "ehentai") {
          return {
            items: [
              {
                source: "ehentai" as const,
                id: "1919810",
                title: "[Circle] mock-eh-title",
                title_original: null,
                cover: null,
                url: "https://example.com/eh/1919810",
                token: "token1919810",
                tags: ["parody:original"],
                pages: 1,
                posted: null,
                rating: null,
                favorited: null,
                raw: { source: "ehentai", mock: true },
              },
            ],
            debug: {
              source: "ehentai" as const,
              started_at_ms: 1,
              finished_at_ms: 2,
              success: true,
              result_count: 1,
              steps: [
                {
                  at_ms: 1,
                  stage: "ehentai.search-page.request",
                  message: "开始请求",
                  request: { url: "https://e-hentai.org/" },
                },
              ],
            },
          };
        }

        return {
          items: [
            {
              source: "nhentai" as const,
              id: "114514",
              title: "mock-nh-title",
              title_original: null,
              cover: null,
              url: "https://example.com/nh/114514",
              token: "",
              tags: ["language:chinese"],
              pages: 1,
              posted: null,
              rating: null,
              favorited: null,
              raw: { source: "nhentai", mock: true },
            },
          ],
          debug: {
            source: "nhentai" as const,
            started_at_ms: 1,
            finished_at_ms: 2,
            success: true,
            result_count: 1,
            steps: [
              {
                at_ms: 1,
                stage: "nhentai.gallery.request",
                message: "开始请求",
                request: { url: "https://nhentai.net/api/gallery/114514" },
              },
            ],
          },
        };
      },
    );

    window.mediaPlayerBackend = {
      searchExternalMetadata,
    } as unknown as typeof window.mediaPlayerBackend;

    const dialog = screen.getByRole("dialog", { name: "获取元数据" });
    const scope = within(dialog);

    expect(
      dialog.querySelectorAll(".metadata-fetch-source-column").length,
    ).toBe(2);

    await click(scope.getByRole("button", { name: "检索" }));

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledTimes(2);
    });

    const calledSources = searchExternalMetadata.mock.calls.map(
      (call) => call[0]?.source,
    );
    expect(calledSources).toEqual(
      expect.arrayContaining(["nhentai", "ehentai"]),
    );

    const nhColumn = dialog.querySelector(
      '[data-source="nhentai"]',
    ) as HTMLElement | null;
    const ehColumn = dialog.querySelector(
      '[data-source="ehentai"]',
    ) as HTMLElement | null;
    expect(nhColumn).not.toBeNull();
    expect(ehColumn).not.toBeNull();

    await waitFor(() => {
      const nhScope = within(nhColumn as HTMLElement);
      const ehScope = within(ehColumn as HTMLElement);
      const nhRequest = nhScope.getByLabelText(
        "Request Body",
      ) as HTMLTextAreaElement;
      const nhResponse = nhScope.getByLabelText(
        "Response Body",
      ) as HTMLTextAreaElement;
      const nhDebug = nhScope.getByLabelText(
        "Debug Trace",
      ) as HTMLTextAreaElement;
      const ehRequest = ehScope.getByLabelText(
        "Request Body",
      ) as HTMLTextAreaElement;
      const ehResponse = ehScope.getByLabelText(
        "Response Body",
      ) as HTMLTextAreaElement;
      const ehDebug = ehScope.getByLabelText(
        "Debug Trace",
      ) as HTMLTextAreaElement;

      expect(nhRequest.value).toContain('"source": "nhentai"');
      expect(nhResponse.value).toContain('"source": "nhentai"');
      expect(nhDebug.value).toContain('"nhentai.gallery.request"');
      expect(ehRequest.value).toContain('"source": "ehentai"');
      expect(ehResponse.value).toContain('"source": "ehentai"');
      expect(ehDebug.value).toContain('"ehentai.search-page.request"');
    });

    await keyDown(window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "获取元数据" })).toBeNull();
    });
  });

  it(
    "获取元数据支持按来源过滤、回车检索并可解析 ehentai 结果",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));
      fireEvent.change(screen.getByLabelText("E-Hentai Cookies"), {
        target: { value: "ipb_member_id=123; ipb_pass_hash=abc" },
      });
      await click(screen.getByRole("button", { name: "关闭" }));

      await click(getMetadataManageModeButton());
      await click(screen.getByRole("button", { name: "获取元数据" }));

      const searchExternalMetadata = vi.fn(async () => ({
        items: [
          {
            source: "ehentai" as const,
            id: "1919810",
            title: "[Circle] mock-eh-title",
            title_original: "[サークル] mock-eh-title-jpn",
            cover: null,
            url: "https://e-hentai.org/g/1919810/mocktoken/",
            token: "mocktoken",
            tags: ["parody:original", "female:big breasts"],
            pages: 12,
            posted: "1700000000",
            rating: "4.8",
            favorited: null,
            raw: {
              gid: "1919810",
              token: "mocktoken",
              title: "[Circle] mock-eh-title",
              title_jpn: "[サークル] mock-eh-title-jpn",
            },
          },
        ],
        debug: {
          source: "ehentai" as const,
          started_at_ms: 1,
          finished_at_ms: 2,
          success: true,
          result_count: 1,
          steps: [
            {
              at_ms: 1,
              stage: "ehentai.gdata.response",
              message: "请求成功",
              response: { status: 200 },
            },
          ],
        },
      }));

      window.mediaPlayerBackend = {
        searchExternalMetadata,
      } as unknown as typeof window.mediaPlayerBackend;

      const dialog = screen.getByRole("dialog", { name: "获取元数据" });
      const scope = within(dialog);

      await click(scope.getByRole("button", { name: "EH" }));

      const idInput = scope.getByLabelText("检索ID") as HTMLInputElement;
      fireEvent.change(idInput, { target: { value: "1919810" } });
      await keyDown(idInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(searchExternalMetadata).toHaveBeenCalledTimes(1);
      });

      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "ehentai",
          input_id: "1919810",
          ehentai_cookies: "ipb_member_id=123; ipb_pass_hash=abc",
        }),
      );

      const nhColumn = dialog.querySelector(
        '[data-source="nhentai"]',
      ) as HTMLElement | null;
      const ehColumn = dialog.querySelector(
        '[data-source="ehentai"]',
      ) as HTMLElement | null;
      expect(nhColumn).not.toBeNull();
      expect(ehColumn).not.toBeNull();

      await waitFor(() => {
        const nhScope = within(nhColumn as HTMLElement);
        const ehScope = within(ehColumn as HTMLElement);
        const nhRequest = nhScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const nhResponse = nhScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const nhDebug = nhScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;
        const ehRequest = ehScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const ehResponse = ehScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const ehDebug = ehScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;

        expect(nhRequest.value).toBe("");
        expect(nhResponse.value).toBe("");
        expect(nhDebug.value).toBe("");
        expect(ehRequest.value).toContain('"source": "ehentai"');
        expect(ehResponse.value).toContain('"source": "ehentai"');
        expect(ehDebug.value).toContain('"ehentai.gdata.response"');
      });

      await click(
        within(ehColumn as HTMLElement).getByRole("button", { name: "解析" }),
      );

      await waitFor(() => {
        const parsed = within(ehColumn as HTMLElement).getByLabelText(
          "Parsed",
        ) as HTMLTextAreaElement;
        expect(parsed.value).toContain('"site": "ehentai"');
      });

      await waitFor(() => {
        expect(
          within(ehColumn as HTMLElement).queryByLabelText("Request Body"),
        ).toBeNull();
        expect(
          within(ehColumn as HTMLElement).queryByLabelText("Response Body"),
        ).toBeNull();
      });

      await click(
        within(ehColumn as HTMLElement).getByRole("button", {
          name: /Request Body/,
        }),
      );
      await waitFor(() => {
        expect(
          within(ehColumn as HTMLElement).getByLabelText("Request Body"),
        ).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it("元数据面板标题可折叠，并可恢复展开", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "元数据面板" }));
    expect(
      screen.getByRole("button", { name: "展开元数据面板" }),
    ).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "展开元数据面板" }));
    expect(
      screen.getByRole("button", { name: "元数据面板" }),
    ).toBeInTheDocument();
  });

  it("进入元数据管理时自动退出原图显示并回到元数据编辑视图", async () => {
    render(<App />);

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    await waitFor(() => {
      expect(document.querySelector(".metadata-image-real")).not.toBeNull();
    });

    await click(getMetadataManageModeButton());

    await waitFor(() => {
      expect(document.querySelector(".metadata-image-real")).toBeNull();
      expect(
        screen.getByRole("group", { name: "图包评分" }),
      ).toBeInTheDocument();
    });
  });

  it("原图显示阶段不再渲染旧版分辨率色块占位", async () => {
    render(<App />);

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    await waitFor(() => {
      expect(document.querySelector(".metadata-image-real")).not.toBeNull();
      expect(document.querySelector(".metadata-image-media")).toBeNull();
    });
  });

  it("原图说明仅显示文件名/分辨率/大小三行，不重复图包标题", async () => {
    render(<App />);

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    await waitFor(() => {
      const caption = document.querySelector(
        ".metadata-image-caption",
      ) as HTMLElement | null;
      expect(caption).not.toBeNull();
      const lines = caption?.querySelectorAll("span") ?? [];
      expect(lines).toHaveLength(3);
      expect(lines[0]?.textContent ?? "").toContain("img_0001.jpg");
      expect(lines[1]?.textContent ?? "").toBe("920 x 920");
      expect(lines[2]?.textContent ?? "").toBe("180KB");
      expect(caption?.querySelector("strong")).toBeNull();
    });
  });

  it("退出原图显示后元数据面板恢复常规布局，不保持 focus 容器样式", async () => {
    render(<App />);

    const firstThumbButton = screen
      .getByText("幻旅系列 001 #1")
      .closest("button");
    expect(firstThumbButton).not.toBeNull();
    await click(firstThumbButton as HTMLButtonElement);

    await waitFor(() => {
      expect(document.querySelector(".metadata-content-focus")).not.toBeNull();
    });

    await click(screen.getByRole("button", { name: "切换到元数据显示" }));

    await waitFor(() => {
      expect(document.querySelector(".metadata-content-focus")).toBeNull();
      expect(document.querySelector(".metadata-rating-group")).not.toBeNull();
    });
  });

  it(
    "元数据评分支持清空到空星，并可继续点击设星",
    async () => {
      render(<App />);
      await click(getMetadataManageModeButton());

      const ratingGroup = screen.getByRole("group", { name: "图包评分" });
      const readStars = () =>
        within(ratingGroup)
          .getAllByRole("button")
          .map((button) => button.textContent);

      await click(screen.getByRole("button", { name: "图包评分 2 星" }));
      expect(readStars()).toEqual(["×", "★", "★", "☆", "☆", "☆"]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "图包评分 2 星" }),
        ).not.toBeDisabled();
      });

      await mouseDown(screen.getByRole("button", { name: "清空评分" }), {
        button: 0,
      });
      expect(readStars()).toEqual(["×", "☆", "☆", "☆", "☆", "☆"]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "图包评分 2 星" }),
        ).not.toBeDisabled();
      });
    },
    uiLongTestTimeoutMs,
  );

  it("图片模式只读元数据评分可用并可写入", async () => {
    const writePackageGradeSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writePackageGradeSync",
    );
    render(<App />);

    const ratingGroup = screen.getByRole("group", { name: "图包评分" });
    const ratingThreeStar = within(ratingGroup).getByRole("button", {
      name: "图包评分 3 星",
    }) as HTMLButtonElement;
    expect(ratingThreeStar.disabled).toBe(false);

    await click(ratingThreeStar);
    expect(writePackageGradeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: 3,
      }),
    );

    await waitFor(() => {
      expect(ratingThreeStar.disabled).toBe(false);
    });

    await mouseDown(screen.getByRole("button", { name: "清空评分" }), {
      button: 0,
    });
    await waitFor(() => {
      expect(writePackageGradeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          grade: null,
        }),
      );
    });
  });

  it("视频模式元数据默认只读，包含评分与操作区", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await click(screen.getByRole("button", { name: "视频信息" }));

    expect(screen.getByLabelText("文件名")).toBeInTheDocument();
    expect(screen.getByText("作品名")).toBeInTheDocument();
    expect(screen.getByText("社团")).toBeInTheDocument();
    expect(screen.getByText("作者")).toBeInTheDocument();
    expect(
      document.querySelectorAll(
        ".metadata-localized-field .metadata-localized-value.is-clickable",
      ).length,
    ).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/标签|Tags/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "视频评分" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "视频评分 无评分" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "同步文件名到作品名" }),
    ).toBeNull();
    expect(document.querySelector(".metadata-video-stats")).toBeNull();
  });

  it("视频信息字段回车会触发 writeVideoMetadata 调用", async () => {
    const writeVideoMetadataSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writeVideoMetadataSync",
    );
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await click(getMetadataManageModeButton());
    await click(screen.getByRole("button", { name: "视频信息" }));

    const workTitleInput = screen.getByLabelText(
      "英文标题",
    ) as HTMLInputElement;
    fireEvent.change(workTitleInput, { target: { value: "新的视频作品名" } });
    await keyDown(workTitleInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(writeVideoMetadataSpy).toHaveBeenCalled();
      expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          work_title: "新的视频作品名",
        }),
      );
    });
  });

  it("系列ID匹配时支持动画版/漫画版双向跳转", async () => {
    render(<App />);

    const jumpToAnimation = screen.getByRole("button", { name: "动画版" });
    const imageToolbarActions = jumpToAnimation.closest(".toolbar-actions");
    expect(imageToolbarActions?.firstElementChild).toBe(jumpToAnimation);
    expect(jumpToAnimation).toBeEnabled();
    await click(jumpToAnimation);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "漫画版" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: "scene_motion.mp4" }),
    ).toHaveLength(0);
    expect(
      screen.queryAllByRole("button", { name: "teaser_city.mp4" }).length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      const toolbarTitle =
        document.querySelector(".main-toolbar-title.is-video")?.textContent ??
        "";
      expect(toolbarTitle).toContain("teaser_city");
    });

    const jumpToManga = screen.getByRole("button", { name: "漫画版" });
    const videoToolbarActions = jumpToManga.closest(".toolbar-actions");
    expect(videoToolbarActions?.firstElementChild).toBe(jumpToManga);
    expect(jumpToManga).toBeEnabled();
    await click(jumpToManga);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "动画版" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: "forest_pack.zip" }),
    ).toHaveLength(0);

    await waitFor(() => {
      const toolbarTitle =
        document.querySelector(".main-toolbar-title")?.textContent ?? "";
      expect(toolbarTitle).toContain("幻旅系列 001");
    });
  });

  it("未配置系列ID的条目不显示动画版/漫画版跳转按钮", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "forest_pack.zip" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "动画版" })).toBeNull();
    });

    await click(screen.getByRole("button", { name: "视频模式" }));
    await click(screen.getAllByRole("button", { name: "scene_motion.mp4" })[0]);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "漫画版" })).toBeNull();
    });
  });

  it("音乐模式支持按系列ID跳转到动画版/漫画版", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "音乐模式" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "漫画版" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "动画版" }),
      ).toBeInTheDocument();
    });

    await click(screen.getByRole("button", { name: "动画版" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "漫画版" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "漫画版" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "动画版" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
  });

  it("非元数据管理模式下打开封面/打开Booklet可用，并可从非 CD Booklet 树定位", async () => {
    const originalGetInitialLibrarySnapshot =
      MockMediaRepository.prototype.getInitialLibrarySnapshot;
    vi.spyOn(
      MockMediaRepository.prototype,
      "getInitialLibrarySnapshot",
    ).mockImplementation(function (
      this: MockMediaRepository,
    ): LibrarySnapshotDto {
      const snapshot = originalGetInitialLibrarySnapshot.call(this);
      const templateDirectory = snapshot.image_directories[0];
      if (!templateDirectory) {
        return snapshot;
      }

      const fallbackBookletDirectory: LibrarySnapshotDto["image_directories"][number] =
        {
          ...templateDirectory,
          id: "dir-music-booklet-fallback",
          package_name: "[DIR] Orbit Booklet",
          display_name: "Orbit Booklet",
          absolute_path: "X:/音乐/Orbit/booklet",
          tree_path: ["X盘", "音乐", "Orbit", "booklet"],
          images: templateDirectory.images
            .slice(0, 2)
            .map(
              (
                image,
                index,
              ): LibrarySnapshotDto["image_directories"][number]["images"][number] => ({
                ...image,
                id: `dir-music-booklet-fallback-img-${index + 1}`,
              }),
            ),
        };

      return {
        ...snapshot,
        image_directories: [
          ...snapshot.image_directories,
          fallbackBookletDirectory,
        ],
      };
    });

    render(<App />);
    await click(screen.getByRole("button", { name: "音乐模式" }));

    const openCoverButton = await screen.findByRole("button", {
      name: "打开封面",
    });
    const openBookletButton = screen.getByRole("button", {
      name: "打开Booklet",
    });

    expect(openCoverButton).toBeEnabled();
    expect(openBookletButton).toBeEnabled();

    await click(openBookletButton);

    await waitFor(() => {
      const imageModeButton = screen.getByRole("button", {
        name: "图片模式",
      }) as HTMLButtonElement;
      expect(imageModeButton.classList.contains("is-active")).toBe(true);
    });
  });

  it("元数据管理支持写入图片与视频系列ID", async () => {
    const writePackageMetadataSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writePackageMetadataSync",
    );
    const writeVideoMetadataSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writeVideoMetadataSync",
    );
    render(<App />);

    await click(getMetadataManageModeButton());

    const imageSeriesLabel = await screen.findByText("系列ID");
    const imageSeriesInput = imageSeriesLabel
      .closest("label")
      ?.querySelector("input") as HTMLInputElement;
    expect(imageSeriesInput).toBeInTheDocument();
    fireEvent.change(imageSeriesInput, {
      target: { value: "series-image-001" },
    });
    await keyDown(imageSeriesInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(writePackageMetadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          series_id: "series-image-001",
        }),
      );
    });

    await click(screen.getByRole("button", { name: "视频模式" }));
    await click(screen.getByRole("button", { name: "视频信息" }));

    const videoSeriesLabel = await screen.findByText("系列ID");
    const videoSeriesInput = videoSeriesLabel
      .closest("label")
      ?.querySelector("input") as HTMLInputElement;
    expect(videoSeriesInput).toBeInTheDocument();
    fireEvent.change(videoSeriesInput, {
      target: { value: "series-video-001" },
    });
    await keyDown(videoSeriesInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          series_id: "series-video-001",
        }),
      );
    });
  });

  it("视频评分可点击并写入 grade", async () => {
    const writeVideoMetadataSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writeVideoMetadataSync",
    );
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await click(getMetadataManageModeButton());
    await click(screen.getByRole("button", { name: "视频信息" }));
    await click(screen.getByRole("button", { name: "视频评分 5 星" }));

    await waitFor(() => {
      expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          grade: 5,
        }),
      );
    });
  });

  it("默认只读元数据作品名标题复制当前值，点击值不触发切换", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    const workTitleField = screen
      .getAllByText("作品名")
      .find((node) =>
        node.classList.contains("metadata-field-name"),
      ) as HTMLElement;
    const workTitleLabel = workTitleField.closest("label") as HTMLElement;
    const workTitleValue = workTitleLabel.querySelector(
      ".metadata-localized-value",
    ) as HTMLElement;
    const workTitleLangButton = within(workTitleLabel).getByRole(
      "button",
    ) as HTMLButtonElement;
    const beforeLang = workTitleLangButton.textContent;
    const beforeValue = workTitleValue.textContent?.trim() ?? "";

    await click(workTitleField);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(beforeValue);
    });

    await click(workTitleValue);

    expect(
      (within(workTitleLabel).getByRole("button") as HTMLButtonElement)
        .textContent,
    ).toBe(beforeLang);
    expect(workTitleValue.textContent?.trim() ?? "").toBe(beforeValue);
    expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
  });

  it("默认只读元数据作者与社团标题点击复制当前值", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    const authorFieldName = screen
      .getAllByText("作者")
      .find((node) =>
        node.classList.contains("metadata-field-name"),
      ) as HTMLElement;
    const authorLabel = authorFieldName.closest("label") as HTMLElement;
    const authorValue = authorLabel.querySelector(
      ".metadata-localized-value",
    ) as HTMLElement;
    await click(authorFieldName);

    const circleFieldName = screen
      .getAllByText("社团")
      .find((node) =>
        node.classList.contains("metadata-field-name"),
      ) as HTMLElement;
    const circleLabel = circleFieldName.closest("label") as HTMLElement;
    const circleValue = circleLabel.querySelector(
      ".metadata-localized-value",
    ) as HTMLElement;
    await click(circleFieldName);

    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(
        1,
        authorValue.textContent?.trim() ?? "",
      );
      expect(writeText).toHaveBeenNthCalledWith(
        2,
        circleValue.textContent?.trim() ?? "",
      );
    });
  });

  it("默认只读元数据点击作者值可静默触发检索并通过返回按钮清空", async () => {
    render(<App />);

    const authorFieldName = screen
      .getAllByText("作者")
      .find((node) =>
        node.classList.contains("metadata-field-name"),
      ) as HTMLElement;
    const authorLabel = authorFieldName.closest("label") as HTMLElement;
    const authorValue = authorLabel.querySelector(
      ".metadata-localized-value.is-clickable",
    ) as HTMLElement;
    await click(authorValue);

    expect(
      screen.queryByRole("group", { name: "search-mode-switch" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

    await click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
    expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
    expect(screen.getByRole("button", { name: "设为根" })).toBeInTheDocument();
  });

  it("默认只读元数据点击社团值可静默触发检索并通过返回按钮清空", async () => {
    render(<App />);

    const circleFieldName = screen
      .getAllByText("社团")
      .find((node) =>
        node.classList.contains("metadata-field-name"),
      ) as HTMLElement;
    const circleLabel = circleFieldName.closest("label") as HTMLElement;
    const circleValue = circleLabel.querySelector(
      ".metadata-localized-value.is-clickable",
    ) as HTMLElement;
    await click(circleValue);

    expect(
      screen.queryByRole("group", { name: "search-mode-switch" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

    await click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
    expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
    expect(screen.getByRole("button", { name: "设为根" })).toBeInTheDocument();
  });

  it("视频模式只读元数据点击社团可静默触发检索并通过返回按钮清空", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));

    const circleLabel = screen
      .getByText("社团")
      .closest("label") as HTMLElement;
    const circleValue = circleLabel.querySelector(
      ".metadata-localized-value.is-clickable",
    ) as HTMLElement;
    await click(circleValue);

    expect(
      screen.queryByRole("group", { name: "search-mode-switch" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "检索结果" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

    await click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
    expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
    expect(screen.getByRole("button", { name: "设为根" })).toBeInTheDocument();
  });

  it("元数据管理支持按字段回车批量写入，不覆盖未提交字段", async () => {
    const writePackageMetadataSpy = vi.spyOn(
      MockMediaRepository.prototype,
      "writePackageMetadataSync",
    );
    render(<App />);

    await click(getMetadataManageModeButton());

    await waitFor(() => {
      expect(
        document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
          .length,
      ).toBeGreaterThan(0);
    });

    await click(
      document.querySelector(
        ".sidebar-row.is-manage .sidebar-label",
      ) as HTMLButtonElement,
    );
    const circleInput = screen.getByLabelText("英文社团名") as HTMLInputElement;
    fireEvent.change(circleInput, { target: { value: "批量社团更名" } });
    await keyDown(circleInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(writePackageMetadataSpy).toHaveBeenCalled();
    });

    const payloads = writePackageMetadataSpy.mock.calls.map((call) => call[0]);
    expect(payloads.every((payload) => payload.circle === "批量社团更名")).toBe(
      true,
    );
    expect(
      new Set(payloads.map((payload) => payload.package_id)).size,
    ).toBeGreaterThan(1);
    expect(
      new Set(payloads.map((payload) => payload.author)).size,
    ).toBeGreaterThan(1);
  });

  it("元数据管理面板已移除自动标签与嵌入按钮，仅保留同步名称", async () => {
    render(<App />);

    await click(getMetadataManageModeButton());

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "同步名称" }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "自动生成标签" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "视觉模型生成标签" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "生成嵌入向量" })).toBeNull();
  });

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

      const fullscreenLayer = document.querySelector(".fullscreen-layer") as Element;
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

      expect(
        screen.getByRole("button", { name: "自动播放" }),
      ).toHaveAttribute("aria-pressed", "false");

      await keyDown(window, { key: "f", code: "KeyF" });
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

  it("全屏默认按当前模式进入单显示，双显示切回单显示时恢复入口模式", async () => {
    render(<App />);

    await keyDown(window, { key: "ArrowRight", code: "ArrowRight" });

    await keyDown(window, { key: "f", code: "KeyF" });
    expect(screen.getByAltText("图片 #2")).toBeInTheDocument();
    expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();

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
    expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();
    expect(screen.getByAltText("图片 #2")).toBeInTheDocument();
    expect(document.querySelector(".video-screen-cover-image")).toBeNull();

    await keyDown(window, { key: "f", code: "KeyF" });
    expect(screen.queryByAltText("图片 #2")).not.toBeInTheDocument();
  });

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

  it("视频模式全屏使用 video-controls-shell，单视频隐藏 footer，双显示保留悬浮控件自适应", async () => {
    render(<App />);

    await click(screen.getByRole("button", { name: "视频模式" }));
    await keyDown(window, { key: "f", code: "KeyF" });

    expect(
      document.querySelector(".fullscreen-media-video-element"),
    ).not.toBeNull();
    expect(screen.queryByLabelText("调整全屏分屏比例")).not.toBeInTheDocument();

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
    expect(screen.getByLabelText("全屏视频进度滑条")).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "独立/复合" }));

    const videoPane = document.querySelector(".fullscreen-video");
    expect(videoPane).not.toBeNull();
    fireEvent.mouseEnter(videoPane as Element);

    const dualFloatingControls = document.querySelector(
      ".fullscreen-stage .fullscreen-video-controls",
    ) as HTMLElement | null;
    expect(dualFloatingControls).not.toBeNull();
    const shellDefault = dualFloatingControls?.querySelector(
      ".fullscreen-video-controls-shell",
    ) as HTMLElement | null;
    expect(
      shellDefault?.firstElementChild?.classList.contains(
        "video-controls-progress",
      ),
    ).toBe(true);

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
  });

  it(
    "设置面板按 side/main 分栏并包含界面设置聚合与快捷键鼠标录入",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      const settingsPanel = document.querySelector(
        ".settings-panel",
      ) as HTMLElement | null;
      expect(settingsPanel).not.toBeNull();

      expect(
        screen.getByRole("button", { name: "界面设置" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "AI模型设置" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "快捷键设置" }),
      ).toBeInTheDocument();

      expect(screen.queryByRole("button", { name: "缩略图设置" })).toBeNull();
      expect(screen.queryByRole("button", { name: "theme 设置" })).toBeNull();

      expect(screen.getByText("主题设置")).toBeInTheDocument();
      expect(screen.getByText("缩略图设置")).toBeInTheDocument();
      expect(screen.queryByText("频谱可视化设置")).toBeNull();
      expect(screen.getByText("布局参数")).toBeInTheDocument();

      const styleSelect = screen.getByRole("combobox", {
        name: "Style",
      }) as HTMLSelectElement;
      const paletteSelect = screen.getByRole("combobox", {
        name: "日间默认 Palette",
      }) as HTMLSelectElement;
      expect(styleSelect.value.length).toBeGreaterThan(0);
      expect(
        Array.from(styleSelect.options).some(
          (option) => option.value === styleSelect.value,
        ),
      ).toBe(true);
      expect(paletteSelect.value.length).toBeGreaterThan(0);
      expect(
        Array.from(paletteSelect.options).some(
          (option) => option.value === paletteSelect.value,
        ),
      ).toBe(true);

      expect(screen.getByLabelText(/缩略图间距系数/)).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图质量")).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图宽度")).toBeInTheDocument();
      expect(screen.queryByLabelText("实际渲染长边分辨率")).toBeNull();
      expect(screen.queryByLabelText("渲染帧率上限")).toBeNull();
      expect(screen.queryByLabelText("Tone Mapping")).toBeNull();
      expect(
        screen.getByLabelText("调试显示 Electron 外框与菜单"),
      ).toBeInTheDocument();

      const settingsFontSlider = screen.getByLabelText(/设置面板字体系数/);
      const fontSizeBefore = settingsPanel?.style.fontSize;
      fireEvent.change(settingsFontSlider, { target: { value: "1.2" } });
      expect(settingsPanel?.style.fontSize).not.toBe(fontSizeBefore);

      await click(screen.getByRole("button", { name: "AI模型设置" }));
      expect(screen.getByLabelText("视觉模型端口")).toBeInTheDocument();
      expect(screen.getByLabelText("视觉模型ID")).toBeInTheDocument();
      expect(screen.queryByLabelText("LM Studio Endpoint")).toBeNull();
      expect(screen.queryByRole("button", { name: "选择ONNX文件" })).toBeNull();
      expect(screen.queryByRole("button", { name: "选择CSV文件" })).toBeNull();

      await click(screen.getByRole("button", { name: "数据库设置" }));
      expect(screen.getByText("数据库目录设置")).toBeInTheDocument();
      expect(screen.getByLabelText("SQL 库路径")).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图目录")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "选择SQL目录" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "选择缩略图目录" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("向量数据管理")).toBeNull();
      expect(screen.queryByRole("button", { name: "选择向量目录" })).toBeNull();

      await click(screen.getByRole("button", { name: "快捷键设置" }));
      expect(screen.getByText("全屏：上对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：下对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：左对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：右对齐")).toBeInTheDocument();

      const alignUpRow = screen
        .getByText("全屏：上对齐")
        .closest(".shortcut-row") as HTMLElement;
      expect(alignUpRow).not.toBeNull();
      const alignUpBindingButton = alignUpRow.querySelector(
        "button",
      ) as HTMLButtonElement;
      await click(alignUpBindingButton);
      const shortcutEditDialog = screen.getByRole("dialog", {
        name: "快捷键编辑",
      });
      expect(shortcutEditDialog).toBeInTheDocument();
      expect(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      ).toBeInTheDocument();
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "清除" }),
      );
      expect(screen.getByText("当前未设置快捷键。")).toBeInTheDocument();
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      );
      const captureDialog = screen.getByRole("dialog", { name: "录入快捷键" });
      await click(
        within(captureDialog).getByRole("button", { name: "鼠标右键" }),
      );
      await click(screen.getByRole("button", { name: "确认新增" }));
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      );
      const wheelCaptureDialog = screen.getByRole("dialog", {
        name: "录入快捷键",
      });
      await click(
        within(wheelCaptureDialog).getByRole("button", { name: "滚轮下" }),
      );
      await click(screen.getByRole("button", { name: "确认新增" }));
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "关闭" }),
      );
      expect(alignUpBindingButton.textContent).toContain("MouseRight");
      expect(alignUpBindingButton.textContent).toContain("WheelDown");
    },
    uiLongTestTimeoutMs,
  );

  it(
    "数据库目录选择器可触发 SQL 与缩略图目录选择",
    async () => {
      const pickDirectoryPathSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "pickDirectoryPathSync",
      );

      render(<App />);
      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));
      await click(screen.getByRole("button", { name: "选择SQL目录" }));
      await click(screen.getByRole("button", { name: "选择缩略图目录" }));

      await waitFor(() => {
        expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2);
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "数据库目录设置会调用后端路径持久化并显示反馈",
    async () => {
      const pickDirectoryPathSpy = vi
        .spyOn(MockMediaRepository.prototype, "pickDirectoryPathSync")
        .mockImplementation((request) => ({
          canceled: false,
          path: request.title?.includes("SQL")
            ? "D:/media-db"
            : "D:/media-thumb-cache",
        }));

      const setRuntimeStoragePaths = vi
        .fn()
        .mockResolvedValueOnce({
          database_path: "D:/media-db/library.sqlite",
          thumbnail_cache_path: "C:/legacy-thumb-cache",
          moved_database: true,
          updated_at_ms: Date.now(),
        })
        .mockResolvedValueOnce({
          database_path: "D:/media-db/library.sqlite",
          thumbnail_cache_path: "D:/media-thumb-cache",
          moved_database: false,
          updated_at_ms: Date.now(),
        });

      const readRuntimeInfo = vi.fn().mockResolvedValue({
        app_version: "0.0.0-test",
        is_packaged: false,
        platform: "win32",
        arch: "x64",
        user_data_path: "C:/Users/test/AppData/Roaming/MediaPlayerX",
        library_root: "C:/Users/test/Pictures/MediaPlayerXLibrary",
        database_path: "D:/media-db/library.sqlite",
        thumbnail_cache_path: "D:/media-thumb-cache",
      });

      render(<App />);

      window.mediaPlayerBackend = {
        setRuntimeStoragePaths,
        readRuntimeInfo,
      } as unknown as typeof window.mediaPlayerBackend;

      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));

      await click(screen.getByRole("button", { name: "选择SQL目录" }));
      await waitFor(() => {
        expect(setRuntimeStoragePaths).toHaveBeenCalledWith({
          database_dir: "D:/media-db",
        });
      });

      await click(screen.getByRole("button", { name: "选择缩略图目录" }));
      await waitFor(() => {
        expect(setRuntimeStoragePaths).toHaveBeenCalledWith({
          thumbnail_cache_dir: "D:/media-thumb-cache",
        });
      });

      expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.getByText(/目录已保存/)).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "AI模型保存会持久化测试通过状态",
    async () => {
      const writeAppStateSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writeAppState",
      );

      render(<App />);
      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "AI模型设置" }));

      act(() => {
        useUiStore.getState().updateSettings({
          adReviewVisionModel: "mock-vision-model",
          adReviewVisionVerified: true,
        });
      });

      await click(screen.getByRole("button", { name: "保存视觉模型配置" }));
      await waitFor(() => {
        expect(screen.getByText("视觉模型配置已保存")).toBeInTheDocument();
      });

      const hasPersistedVerifiedTrue = writeAppStateSpy.mock.calls.some(
        ([request]) => {
          try {
            const parsed = JSON.parse(request.state_json) as Record<
              string,
              unknown
            >;
            return parsed.adReviewVisionVerified === true;
          } catch {
            return false;
          }
        },
      );
      expect(hasPersistedVerifiedTrue).toBe(true);
    },
    uiLongTestTimeoutMs,
  );
});
