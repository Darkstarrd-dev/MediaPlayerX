import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import {
  getSliderByLabelText,
  renderThemeParameterPanel,
} from "./ThemeParameterPanel.container-debug.test-utils";

describe("ThemeParameterPanel.import-export", () => {
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

  it("支持导出与导入参数快照 JSON", () => {
    renderThemeParameterPanel();

    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-bg-app-fill" }),
      {
        target: { value: "#123456" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain('"styleId": "soft-skeuomorphic"');
    expect(snapshotTextarea.value).toContain('"layout-padding": 14');
    expect(snapshotTextarea.value).toContain('"debugTexts"');
    expect(snapshotTextarea.value).toContain(
      '"container-bg-app-fill": "#123456"',
    );

    fireEvent.change(snapshotTextarea, {
      target: {
        value: JSON.stringify(
          {
            version: 1,
            styleId: "liquid-glass",
            values: {
              "layout-padding": 9,
              "skeuo-shadow-strength": 26,
            },
            debugTexts: {
              "container-bg-app-fill":
                "linear-gradient(90deg, #112233, #445566)",
            },
          },
          null,
          2,
        ),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));

    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("9px");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-skeuo-shadow-dark",
      ),
    ).toContain("26%");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-bg-app-fill")
        .trim(),
    ).toBe("linear-gradient(90deg, #112233, #445566)");
    expect(screen.getByText(/快照来自风格 liquid-glass/)).toBeInTheDocument();
  }, 15000);

  it("默认导出不包含计算值，可手动切换包含", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    const snapshotWithoutComputed = JSON.parse(snapshotTextarea.value) as {
      values?: Record<string, number>;
    };
    expect(
      snapshotWithoutComputed.values?.["header-floating-gap"],
    ).toBeUndefined();

    fireEvent.click(screen.getByLabelText("导出包含计算值"));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotWithComputed = JSON.parse(snapshotTextarea.value) as {
      values?: Record<string, number>;
    };
    expect(typeof snapshotWithComputed.values?.["header-floating-gap"]).toBe(
      "number",
    );
  });

  it("导出后直接导入不会把空调试项写成默认色", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    const snapshotPayload = JSON.parse(snapshotTextarea.value) as {
      debugColors?: Record<string, string>;
    };
    expect(snapshotPayload.debugColors?.["large-panel-bg"] ?? "").toBe("");

    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-large-panel-bg")
        .trim(),
    ).toBe("");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-header-floating-gap")
        .trim(),
    ).toBe("");
  });

  it("导入缺失值时保持已有参数不变", () => {
    renderThemeParameterPanel();

    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    fireEvent.change(snapshotTextarea, {
      target: {
        value: JSON.stringify(
          {
            version: 1,
            styleId: "soft-skeuomorphic",
            values: {
              "splitter-width": 16,
            },
          },
          null,
          2,
        ),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));

    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("14px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-splitter-width"),
    ).toBe("16px");
  });

  it("仅导入 debugTexts 时不覆盖现有数值参数", () => {
    renderThemeParameterPanel();

    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    fireEvent.change(snapshotTextarea, {
      target: {
        value: JSON.stringify(
          {
            version: 1,
            styleId: "soft-skeuomorphic",
            debugTexts: {
              "container-bg-app-fill":
                "linear-gradient(90deg, #112233, #445566)",
            },
          },
          null,
          2,
        ),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));

    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("14px");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-bg-app-fill")
        .trim(),
    ).toBe("linear-gradient(90deg, #112233, #445566)");
  });

  it("复制 JSON 在剪贴板不可用时回退 execCommand", async () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const originalClipboard = window.navigator.clipboard;
    const originalExecCommand = document.execCommand;
    const execCommandSpy = vi.fn(() => true);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommandSpy,
    });

    try {
      fireEvent.click(screen.getByRole("button", { name: "复制 JSON" }));
      expect(
        await screen.findByText("参数快照已复制到剪贴板。"),
      ).toBeInTheDocument();
      expect(execCommandSpy).toHaveBeenCalledWith("copy");
    } finally {
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: originalExecCommand,
      });
    }
  });

  it("支持下载与加载参数快照 JSON 文件", async () => {
    const createObjectUrl = vi.fn(() => "blob:theme-parameter");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));

    fireEvent.click(screen.getByRole("button", { name: "下载 JSON文件" }));
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);

    const fileInput = document.querySelector(
      ".theme-parameter-file-input",
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(
      [
        JSON.stringify(
          {
            version: 1,
            styleId: "soft-skeuomorphic",
            values: {
              "layout-padding": 11,
            },
          },
          null,
          2,
        ),
      ],
      "snapshot.json",
      { type: "application/json" },
    );
    Object.defineProperty(fileInput as HTMLInputElement, "files", {
      configurable: true,
      value: [file],
    });
    await act(async () => {
      fireEvent.change(fileInput as HTMLInputElement);
    });

    expect(
      await screen.findByText("已加载快照文件：snapshot.json。"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "应用导入" }));
    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("11px");

    anchorClickSpy.mockRestore();
  });
});
