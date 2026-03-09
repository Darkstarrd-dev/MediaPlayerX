import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import {
  ensureDetailsOpen,
  getDetailsBySummaryText,
  getSliderByLabelText,
  renderThemeParameterPanel,
} from "./ThemeParameterPanel.container-debug.test-utils";

describe("ThemeParameterPanel.panel-layers", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    act(() => {
      resetThemeParameterPanelSessionStateForTest();
      resetUiStoreState();
      useUiStore.getState().updateSettings({ uiLocale: "zh-CN" });
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    act(() => {
      resetThemeParameterPanelSessionStateForTest();
      resetUiStoreState();
    });
  });

  it("常用控件调试页支持变量写入并进入快照", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "常用控件调试" }));
    expect(screen.getByText("6.3 文件列表样式")).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-control-preview-scrollbar-horizontal"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-control-preview-slider-player-horizontal"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-control-preview-slider-vertical-stack"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("theme-control-preview-slider-player-vertical"),
    ).toBeNull();
    expect(
      screen.getByLabelText("slider-vertical-up-preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("slider-vertical-down-preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-control-preview-file-list-horizontal"),
    ).toBeInTheDocument();
    expect(screen.getByText("1、bg 背景与外层链路")).toBeInTheDocument();
    expect(screen.getByText("2、header 表头链路")).toBeInTheDocument();
    expect(screen.getByText("3、table 表格主体链路")).toBeInTheDocument();

    const fileListDetails = getDetailsBySummaryText("6.3 文件列表样式");
    expect(fileListDetails.open).toBe(true);
    fireEvent.click(screen.getByText("6.3 文件列表样式"));
    expect(fileListDetails.open).toBe(false);
    fireEvent.click(screen.getByText("6.3 文件列表样式"));
    expect(fileListDetails.open).toBe(true);

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-tree-scrollbar-thumb-bg",
      }),
      {
        target: { value: "#224466" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-range-track-bg" }),
      {
        target: { value: "#556677" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-file-list-row-main-hover-bg",
      }),
      {
        target: { value: "#667788" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-tree-scrollbar-thumb-bg",
      ),
    ).toBe("#224466");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-range-track-bg"),
    ).toBe("#556677");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-file-list-row-main-hover-bg",
      ),
    ).toBe("#667788");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"control-scrollbar-thumb-bg": "#224466"',
    );
    expect(snapshotTextarea.value).toContain(
      '"control-slider-base-track-bg": "#556677"',
    );
    expect(snapshotTextarea.value).toContain(
      '"control-file-list-row-main-hover-bg": "#667788"',
    );
  });

  it("文件列表源头与 main/metadata 派生变量可独立写入且互不覆盖", () => {
    renderThemeParameterPanel();
    fireEvent.click(screen.getByRole("button", { name: "常用控件调试" }));
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-file-list-row-main-hover-bg",
      }),
      {
        target: { value: "#112233" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.3 Main"));
    fireEvent.click(
      screen.getByText("2.3.2.2 fg-main-content-image-name-list"),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-main-image-name-list-row-main-hover-bg",
      }),
      {
        target: { value: "#223344" },
      },
    );
    fireEvent.click(screen.getByText("2.4 Metadata"));
    fireEvent.click(screen.getByText("2.4.2.4 文件列表"));
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-file-list-row-main-hover-bg",
      }),
      {
        target: { value: "#334455" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-file-list-row-main-hover-bg",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-image-name-list-row-main-hover-bg",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-file-list-row-main-hover-bg",
      ),
    ).toBe("#334455");
  }, 20_000);

  it("大面板层调试按根层、共享总控与分控重排，并切到 fill 三件套", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));

    expect(screen.getByText("3.0 Root / Shell")).toBeInTheDocument();
    expect(
      screen.getByText("3.1 Head / Side / Main 共享总控"),
    ).toBeInTheDocument();
    expect(screen.getByText("3.2 Head")).toBeInTheDocument();
    expect(screen.getByText("3.3 Side")).toBeInTheDocument();
    expect(screen.getByText("3.4 Main")).toBeInTheDocument();
    expect(screen.getByText("3.10 内部件")).toBeInTheDocument();

    ensureDetailsOpen("3.0 Root / Shell");
    expect(
      screen.getByRole("textbox", { name: "--mpx-large-panel-fill-start" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "--mpx-large-panel-fill-end" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Theme Parameter")).toBeInTheDocument();
    const fillEndField = screen.getByRole("textbox", {
      name: "--mpx-large-panel-fill-end",
    });
    const fillAngleSlider = getSliderByLabelText(
      "--mpx-large-panel-fill-angle",
    );
    expect(
      fillEndField.compareDocumentPosition(fillAngleSlider) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      screen.queryByRole("textbox", { name: "--mpx-large-panel-bg" }),
    ).toBeNull();
    expect(
      screen.getAllByText("仅用于大面板 root 本体").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("仅用于大面板 shell 分栏容器").length,
    ).toBeGreaterThan(0);

    ensureDetailsOpen("3.10 内部件");
    expect(screen.getByText("3.10.1 导入任务")).toBeInTheDocument();
    expect(screen.getByText("3.10.2 元数据抓取")).toBeInTheDocument();
    expect(screen.getByText("3.10.3 Metadata 偏好记录")).toBeInTheDocument();
    expect(screen.getByText("3.10.4 Booklet 绑定")).toBeInTheDocument();
    expect(screen.getByText("3.10.5 标签检索")).toBeInTheDocument();
    expect(screen.getByText("3.10.6 字幕清理")).toBeInTheDocument();
    expect(screen.getByText("3.10.7 转码")).toBeInTheDocument();
    expect(screen.getByText("3.10.8 侧栏批量重命名预览")).toBeInTheDocument();

    ensureDetailsOpen("3.10.2 元数据抓取");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-fetch-control-font-size",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-text",
      }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-text",
      }),
    ).toBeInTheDocument();
  }, 15000);

  it("小面板层调试按 root 与面板族重排", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));

    expect(screen.getByText("5.0 Root")).toBeInTheDocument();
    expect(screen.getByText("5.1 Shortcut Edit")).toBeInTheDocument();
    expect(screen.getByText("5.2 Shortcut Capture")).toBeInTheDocument();
    expect(screen.getByText("5.3 Group Name")).toBeInTheDocument();
    expect(screen.getByText("5.4 Delete Confirm")).toBeInTheDocument();
    expect(screen.getByText("5.5 Ad Review Start")).toBeInTheDocument();
    expect(screen.getByText("5.6 Convert")).toBeInTheDocument();
    expect(screen.getByText("5.7 Playlist Name Dialog")).toBeInTheDocument();
    expect(screen.getByText("5.8 Rename Single")).toBeInTheDocument();

    ensureDetailsOpen("5.0 Root");
    expect(
      screen.getByRole("textbox", { name: "--mpx-dialog-panel-bg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-dialog-panel-shadow-layer-0-blur",
      }),
    ).toBeInTheDocument();

    ensureDetailsOpen("5.7 Playlist Name Dialog");
    expect(screen.getAllByText("Panel Slot Override").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Shared Internals").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-bg",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-playlist-name-dialog-input-bg",
      }),
    ).toBeInTheDocument();

    ensureDetailsOpen("5.8 Rename Single");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-bg",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-control-hover-bg",
      }),
    ).toBeInTheDocument();
  }, 15000);

  it("大面板根层变量会作用到 Theme Parameter 面板本体", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    ensureDetailsOpen("3.0 Root / Shell");

    const panel = document.querySelector(
      ".theme-parameter-panel",
    ) as HTMLElement;
    const heading = screen.getByRole("heading", { name: "Theme Parameter" });

    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-large-panel-border-color" }),
      { target: { value: "#123456" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-large-panel-shadow-layer-0-blur",
      }),
      { target: { value: "40px" } },
    );
    fireEvent.change(getSliderByLabelText("--mpx-large-panel-width"), {
      target: { value: "70" },
    });
    fireEvent.change(getSliderByLabelText("--mpx-large-panel-height"), {
      target: { value: "60" },
    });

    ensureDetailsOpen("3.2 Head");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-large-panel-head-border-color",
      }),
      { target: { value: "#654321" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-large-panel-head-text" }),
      { target: { value: "#224466" } },
    );

    expect(panel.getAttribute("style") ?? "").not.toContain(
      "--mpx-large-panel-width",
    );
    expect(panel.getAttribute("style") ?? "").not.toContain(
      "--mpx-large-panel-height",
    );
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-border-color")
        .trim(),
    ).toBe("#123456");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-shadow")
        .trim(),
    ).toContain("40px");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-width")
        .trim(),
    ).toBe("70vw");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-height")
        .trim(),
    ).toBe("60vh");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-head-border-color")
        .trim(),
    ).toBe("#654321");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-head-text")
        .trim(),
    ).toBe("#224466");
    expect(heading.getAttribute("style")).toContain(
      "color: var(--mpx-large-panel-head-text, inherit)",
    );
  }, 15000);

  it("大面板层共享总控会同步 Head/Side/Main 分控，分控仍可继续覆盖", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    ensureDetailsOpen("3.1 Head / Side / Main 共享总控");

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-large-panel-section-fill-start",
      }),
      { target: { value: "#112233" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-large-panel-section-fill-start-alpha",
      }),
      { target: { value: "100" } },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-head-fill-start",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-side-fill-start",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-main-fill-start",
      ),
    ).toBe("#112233");

    fireEvent.change(
      getSliderByLabelText("--mpx-large-panel-section-border-width"),
      {
        target: { value: "3" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-head-border-width",
      ),
    ).toBe("3px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-side-border-width",
      ),
    ).toBe("3px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-main-border-width",
      ),
    ).toBe("3px");

    ensureDetailsOpen("3.2 Head");
    fireEvent.change(
      screen.getAllByRole("textbox", {
        name: "--mpx-large-panel-head-fill-start",
      })[0],
      { target: { value: "#445566" } },
    );
    fireEvent.change(
      screen.getAllByRole("spinbutton", {
        name: "--mpx-large-panel-head-fill-start-alpha",
      })[0],
      { target: { value: "100" } },
    );
    fireEvent.change(
      getSliderByLabelText("--mpx-large-panel-head-border-width"),
      {
        target: { value: "2" },
      },
    );

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-large-panel-section-fill-start",
      }),
      { target: { value: "#223344" } },
    );
    fireEvent.change(
      getSliderByLabelText("--mpx-large-panel-section-border-width"),
      {
        target: { value: "4" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-head-fill-start",
      ),
    ).toBe("#445566");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-side-fill-start",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-main-fill-start",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-head-border-width",
      ),
    ).toBe("2px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-side-border-width",
      ),
    ).toBe("4px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-large-panel-main-border-width",
      ),
    ).toBe("4px");
  }, 30000);
});
