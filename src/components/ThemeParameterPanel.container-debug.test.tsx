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

describe("ThemeParameterPanel.container-debug", () => {
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

  it("Header/Sidebar/Main/Metadata 基础外观改为独立折叠，子节层级归位", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.1 Header");
    ensureDetailsOpen("2.2 Sidebar");
    ensureDetailsOpen("2.3 Main");
    ensureDetailsOpen("2.4 Metadata");

    const appearanceSummaries = screen.getAllByText("基础外观");
    expect(appearanceSummaries).toHaveLength(4);

    const headerAppearanceDetails = appearanceSummaries[0].closest(
      "details",
    ) as HTMLDetailsElement | null;
    expect(headerAppearanceDetails).not.toBeNull();
    const ensuredHeaderAppearanceDetails =
      headerAppearanceDetails as HTMLDetailsElement;
    const headerAppearanceContent =
      ensuredHeaderAppearanceDetails.querySelector(
        ".settings-collapsible-content",
      );
    expect(headerAppearanceContent?.textContent).toContain("视觉变换");
    fireEvent.click(ensuredHeaderAppearanceDetails.querySelector("summary")!);
    expect(ensuredHeaderAppearanceDetails.open).toBe(false);

    const sidebarRootDetails = getDetailsBySummaryText("2.2 Sidebar");
    const sidebarContent = sidebarRootDetails.querySelector(
      ".settings-collapsible-content",
    );
    expect(
      sidebarContent?.contains(screen.getByText("2.2.2.1 fg-sidebar-main")),
    ).toBe(true);

    const mainRootDetails = getDetailsBySummaryText("2.3 Main");
    const mainContent = mainRootDetails.querySelector(
      ".settings-collapsible-content",
    );
    expect(
      mainContent?.contains(screen.getByText("2.3.2.1 工作区 / 图片网格")),
    ).toBe(true);
    expect(
      mainContent?.contains(
        screen.getByText("2.3.2.2 fg-main-content-image-name-list"),
      ),
    ).toBe(true);
  });

  it("大容器层支持单容器 frame 参数与文本快照导出", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    expect(screen.queryByText("Header 悬浮间距")).toBeNull();
    fireEvent.click(screen.getByText("2.1 Header"));

    fireEvent.change(getSliderByLabelText("Header 水平位移"), {
      target: { value: "24" },
    });
    fireEvent.change(getSliderByLabelText("Header Z 轴旋转"), {
      target: { value: "-12" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-header-fill-start" }),
      {
        target: { value: "#111111" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-header-fill-end" }),
      {
        target: { value: "#222222" },
      },
    );
    fireEvent.change(getSliderByLabelText("--mpx-header-fill-angle"), {
      target: { value: "135" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-header-shadow" }),
      {
        target: { value: "0 8px 24px rgba(1, 2, 3, 0.4)" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-frame-translate-x",
      ),
    ).toBe("24px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-frame-rotate-z",
      ),
    ).toBe("-12deg");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-fill-start",
      ),
    ).toBe("#111111");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-fill-end"),
    ).toBe("#222222");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-fill-angle",
      ),
    ).toBe("135deg");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-shadow"),
    ).toBe("0 8px 24px rgba(1, 2, 3, 0.4)");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain('"header-frame-translate-x": 24');
    expect(snapshotTextarea.value).toContain('"header-frame-rotate-z": -12');
    expect(snapshotTextarea.value).toContain(
      '"container-header-fill-start": "#111111"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-header-fill-end": "#222222"',
    );
    expect(snapshotTextarea.value).toContain('"header-fill-angle": 135');
    expect(snapshotTextarea.value).toContain(
      '"container-header-shadow": "0 8px 24px rgba(1, 2, 3, 0.4)"',
    );
  }, 30000);

  it("大容器层的 Sidebar/Main/Metadata frame 数值项可写入变量", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    fireEvent.click(screen.getByText("2.2 Sidebar"));
    fireEvent.change(getSliderByLabelText("Sidebar 横向缩放"), {
      target: { value: "0.88" },
    });

    fireEvent.click(screen.getByText("2.3 Main"));
    fireEvent.change(getSliderByLabelText("Main 垂直位移"), {
      target: { value: "18" },
    });

    fireEvent.click(screen.getByText("2.4 Metadata"));
    fireEvent.change(getSliderByLabelText("Metadata 原点 Y"), {
      target: { value: "72" },
    });

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-frame-scale-x",
      ),
    ).toBe("0.88");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-frame-translate-y",
      ),
    ).toBe("18px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-frame-origin-y",
      ),
    ).toBe("72%");
  });

  it("Sidebar header root 与 Main header border 在仅改颜色时也会写入实色", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    ensureDetailsOpen("2.2 Sidebar");
    ensureDetailsOpen("2.2.1.0 Sidebar header 总控");
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-slot-fg-sidebar-header-bg" }),
      {
        target: { value: "#112233" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-sidebar-header-border",
      }),
      {
        target: { value: "#223344" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-sidebar-header-text",
      }),
      {
        target: { value: "#334455" },
      },
    );

    ensureDetailsOpen("2.3 Main");
    ensureDetailsOpen("2.3.1.0 Main header 总控");
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-main-header-border-color" }),
      {
        target: { value: "#445566" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-sidebar-header-bg",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-sidebar-header-border",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-sidebar-header-text",
      ),
    ).toBe("#334455");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-header-border-color",
      ),
    ).toBe("#445566");
  }, 15000);
});
