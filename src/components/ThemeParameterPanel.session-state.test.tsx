import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import ThemeParameterPanel from "./ThemeParameterPanel";
import {
  ensureDetailsOpen,
  getThemeParameterMain,
  renderThemeParameterPanel,
} from "./ThemeParameterPanel.container-debug.test-utils";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";

describe("ThemeParameterPanel.session-state", () => {
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

  it("支持大容器层与大面板层全局预览开关，并在面板关闭后恢复", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByRole("button", { name: "仅背景层预览" }));
    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBe("bg-only");

    fireEvent.click(screen.getByRole("button", { name: "仅背景层预览" }));
    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "背景层 + 大容器层预览" }),
    );
    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBe("bg-plus-container");

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    fireEvent.click(
      screen.getByRole("button", { name: "背景层 + 大面板层预览" }),
    );
    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBe("bg-plus-large-panel");
    expect(
      document.querySelector(".theme-debug-large-panel-preview-side"),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));
    fireEvent.click(
      screen.getByRole("button", { name: "背景层 + 小面板层预览" }),
    );
    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBe("bg-plus-small-panel");
    expect(
      document.querySelector(".theme-debug-small-panel-preview"),
    ).not.toBeNull();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(
      document.documentElement.getAttribute("data-mpx-theme-debug-preview"),
    ).toBeNull();
  }, 15000);

  it("大容器层调试值在关闭后重新打开保持，点击全局复位后清空", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    const sidebarSummary = screen.getByText("2.2.2.1 fg-sidebar-main");
    fireEvent.click(sidebarSummary);
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-bg" }),
      {
        target: { value: "#123456" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-main-bg"),
    ).toBe("#123456");

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-main-bg"),
    ).toBe("#123456");

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "恢复到打开时状态" }));

    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-sidebar-main-bg")
        .trim(),
    ).toBe("#123456");
  }, 15000);

  it("关闭后重开保持当前分页", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    expect(screen.getByLabelText("参数快照 JSON")).toBeInTheDocument();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByLabelText("参数快照 JSON")).toBeInTheDocument();
  });

  it("切页后返回保持分页内滚动位置", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.2.2.1 fg-sidebar-main"));

    const main = getThemeParameterMain();
    main.scrollTop = 180;
    fireEvent.scroll(main);

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    expect(getThemeParameterMain().scrollTop).toBe(180);
  });

  it("关闭后重开保持分页内滚动位置", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "常用控件调试" }));
    const main = getThemeParameterMain();
    main.scrollTop = 220;
    fireEvent.scroll(main);

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(getThemeParameterMain().scrollTop).toBe(220);
  });

  it("关闭后重开保持容器折叠状态", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.2.2.1 fg-sidebar-main"));
    expect(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-bg" }),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    expect(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-bg" }),
    ).toBeInTheDocument();
  }, 15000);

  it("关闭后重开保持新的 header 子分节折叠状态", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.1 Header");
    ensureDetailsOpen("2.1.0 Header 按钮总控");
    expect(
      screen.getByRole("textbox", { name: "--mpx-slot-fg-header-button-bg" }),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    expect(
      screen.getByRole("textbox", { name: "--mpx-slot-fg-header-button-bg" }),
    ).toBeInTheDocument();
  }, 15000);

  it("关闭后重开保持大面板内部件子分区折叠状态", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    ensureDetailsOpen("3.10 内部件");
    ensureDetailsOpen("3.10.2 元数据抓取");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-fetch-control-font-size",
      }),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-fetch-control-font-size",
      }),
    ).toBeInTheDocument();
  }, 15000);

  it("关闭后重开保持小面板分区折叠状态", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));
    ensureDetailsOpen("5.8 Rename Single");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-control-hover-bg",
      }),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open={false}
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="soft-skeuomorphic"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-control-hover-bg",
      }),
    ).toBeInTheDocument();
  }, 15000);
});
