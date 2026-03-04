import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { MockMediaRepository } from "../features/backend/repository/mockRepository";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI - management", () => {
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

  const pointerDown = async (
    target: Element | Window,
    init?: PointerEventInit,
  ) => {
    fireEvent.pointerDown(target as Element, init);
    await flushUiUpdates();
  };

  const pointerUp = async (target: Element | Window, init?: PointerEventInit) => {
    fireEvent.pointerUp(target as Element, init);
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
    "管理模式可展开管理容器并与检索容器互斥",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "检索" }));
      expect(screen.getByLabelText("名称")).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "文件管理" }));
      expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
      expect(screen.queryByLabelText("名称")).not.toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "文件管理与元数据管理互斥，且可一键切换到检索模式",
    async () => {
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
    },
    uiLongTestTimeoutMs,
  );

  it("文件管理控件改为主工具栏承载，且摘要右对齐显示", async () => {
    render(<App />);
    await click(screen.getByRole("button", { name: "文件管理" }));

    expect(document.querySelector(".manage-panel")).toBeNull();
    expect(document.querySelector(".main-header-summary")).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByText("未选择条目")).toBeInTheDocument();
    });
  });

  it(
    "通过文件管理按钮进入后，Sidebar focus 变化会同步缩略图与元数据面板",
    async () => {
      render(<App />);

      const packageNameInput = screen.getByLabelText("图包名") as HTMLInputElement;
      const initialPackageName = packageNameInput.value;

      await click(screen.getByRole("button", { name: "文件管理" }));
      expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();

      const focusTarget =
        initialPackageName.includes("海岸")
          ? {
              nodeLabel: "画廊A",
              packageName: "[DIR] 画廊A",
              thumbLabel: "画廊A（目录直读） #1",
            }
          : {
              nodeLabel: "海岸",
              packageName: "[DIR] 海岸",
              thumbLabel: "海岸（目录直读） #1",
            };

      const targetSidebarButton = screen.getByRole("button", {
        name: focusTarget.nodeLabel,
      });

      await pointerDown(targetSidebarButton, {
        button: 0,
        pointerId: 11,
        clientX: 200,
        clientY: 120,
      });
      await pointerUp(window, {
        button: 0,
        pointerId: 11,
        clientX: 200,
        clientY: 120,
      });

      await waitFor(() => {
        expect((screen.getByLabelText("图包名") as HTMLInputElement).value).toBe(
          focusTarget.packageName,
        );
        expect(screen.getByText(focusTarget.thumbLabel)).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "检索/文件管理/元数据管理快速切换不会抛出运行时错误",
    async () => {
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
    },
    uiLongTestTimeoutMs,
  );

  it(
    "快速切换 Sidebar 节点时缩略图列表保持可渲染且不抛错",
    async () => {
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
    },
    uiLongTestTimeoutMs,
  );

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

      const firstManageNodeButton = getFirstManageSidebarNodeButton();
      expect(firstManageNodeButton).not.toBeNull();
      await click(firstManageNodeButton as HTMLButtonElement);

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

      await click(getFirstManageSidebarNodeButton() as HTMLButtonElement);
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

  it(
    "管理模式在紧凑窗口下保持稳定：无最大更新深度报错、无折叠按钮、缩略图容器不可滚动",
    async () => {
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
    },
    uiLongTestTimeoutMs,
  );

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
        {
          button: 0,
        },
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
    },
    uiLongTestTimeoutMs,
  );

  it(
    "管理异常显示在主工具栏提示中，不占用顶部异常横幅",
    async () => {
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
      await click(getFirstManageSidebarNodeButton() as HTMLButtonElement);

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
    },
    uiLongTestTimeoutMs,
  );

  it(
    "AI广告审核通过后仅显示工具栏按钮，点击后才展开审核面板",
    async () => {
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
      expect(
        screen.queryByRole("group", { name: "AI广告审核控制" }),
      ).toBeNull();

      const adReviewToggleButton = screen.getByRole("button", {
        name: "广告审核",
      });
      await waitFor(
        () => {
          expect(adReviewToggleButton).toBeEnabled();
        },
        { timeout: 12_000 },
      );

      await click(screen.getByRole("button", { name: "广告审核" }));
      await waitFor(() => {
        expect(
          screen
            .getByRole("button", { name: "广告审核" })
            .classList.contains("is-active"),
        ).toBe(true);
      });
    },
    uiLongTestTimeoutMs,
  );
});
