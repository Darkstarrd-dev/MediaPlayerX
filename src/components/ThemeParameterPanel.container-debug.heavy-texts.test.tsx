import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import { renderThemeParameterPanel } from "./ThemeParameterPanel.container-debug.test-utils";

describe("ThemeParameterPanel.container-debug.heavy-texts", () => {
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

  it("复杂文本变量支持结构化拆分编辑且导入导出保持原始 CSS 字符串", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.2.2.1 fg-sidebar-main"));

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-sidebar-main-label-bg-angle",
      }),
      {
        target: { value: "145" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-main-label-bg-color-1",
      }),
      {
        target: { value: "#111111" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-main-label-bg-color-2",
      }),
      {
        target: { value: "#222222" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-bg",
      ),
    ).toBe("linear-gradient(145deg, #111111, #222222)");

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-sidebar-main-label-hover-filter-value",
      }),
      {
        target: { value: "1.08" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-hover-filter",
      ),
    ).toBe("brightness(1.08)");

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-main-label-shadow-layer-0-offsetX",
      }),
      {
        target: { value: "1px" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-main-label-shadow-layer-0-color",
      }),
      {
        target: { value: "rgba(1, 2, 3, 0.4)" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-shadow",
      ),
    ).toContain("1px 2px 4px 0px rgba(1, 2, 3, 0.4)");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-label-bg": "linear-gradient(145deg, #111111, #222222)"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-label-hover-filter": "brightness(1.08)"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-label-shadow": "1px 2px 4px 0px rgba(1, 2, 3, 0.4), inset 0 1px 0 0px #ffffff"',
    );

    fireEvent.change(snapshotTextarea, {
      target: {
        value: JSON.stringify(
          {
            version: 1,
            styleId: "soft-skeuomorphic",
            debugTexts: {
              "container-sidebar-main-label-bg":
                "linear-gradient(150deg, #333333, #444444)",
              "container-sidebar-main-label-hover-filter": "brightness(0.93)",
            },
          },
          null,
          2,
        ),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));
    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.2.2.1 fg-sidebar-main"));

    expect(
      (
        screen.getByRole("spinbutton", {
          name: "--mpx-sidebar-main-label-bg-angle",
        }) as HTMLInputElement
      ).value,
    ).toBe("150");
    expect(
      (
        screen.getByRole("textbox", {
          name: "--mpx-sidebar-main-label-bg-color-1",
        }) as HTMLInputElement
      ).value,
    ).toBe("#333333");
    expect(
      (
        screen.getByRole("spinbutton", {
          name: "--mpx-sidebar-main-label-hover-filter-value",
        }) as HTMLInputElement
      ).value,
    ).toBe("0.93");
  }, 60000);
});
