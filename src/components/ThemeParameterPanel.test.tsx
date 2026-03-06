import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import ThemeParameterPanel from "./ThemeParameterPanel";

function getSliderByLabelText(text: string): HTMLInputElement {
  const label = screen
    .getByText(text)
    .closest("label") as HTMLLabelElement | null;
  expect(label).not.toBeNull();
  const slider = label?.querySelector(
    'input[type="range"]',
  ) as HTMLInputElement | null;
  expect(slider).not.toBeNull();
  return slider as HTMLInputElement;
}

function getThemeParameterMain(): HTMLElement {
  const container = document.querySelector(
    ".theme-parameter-main",
  ) as HTMLElement | null;
  expect(container).not.toBeNull();
  return container as HTMLElement;
}

function renderThemeParameterPanel(
  overrides: Partial<ComponentProps<typeof ThemeParameterPanel>> = {},
) {
  const props: ComponentProps<typeof ThemeParameterPanel> = {
    open: true,
    styleId: "soft-skeuomorphic",
    settingsFontSize: 14,
    onClose: vi.fn(),
    ...overrides,
  };

  return render(
    <I18nProvider browserLocale="en-US">
      <ThemeParameterPanel {...props} />
    </I18nProvider>,
  );
}

describe("ThemeParameterPanel", () => {
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

  it("支持调节与重置通用/风格参数", () => {
    renderThemeParameterPanel();

    const baselineLayoutPadding = getSliderByLabelText("布局内边距").value;
    const baselineSkeuoShadowStrength =
      getSliderByLabelText("拟物阴影强度").value;
    const baselineSkeuoPaneElevation =
      getSliderByLabelText("拟物面板浮起高度").value;

    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("14px");

    fireEvent.change(getSliderByLabelText("拟物阴影强度"), {
      target: { value: "24" },
    });
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-skeuo-shadow-dark",
      ),
    ).toContain("color-mix");

    fireEvent.change(getSliderByLabelText("侧栏面板浮起高度"), {
      target: { value: "18" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-shadow"),
    ).toContain("18px");

    fireEvent.change(getSliderByLabelText("主区面板浮起高度"), {
      target: { value: "17" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-shadow"),
    ).toContain("17px");

    fireEvent.change(getSliderByLabelText("拟物面板浮起高度"), {
      target: { value: "18" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-panel-shadow"),
    ).toContain("18px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-shadow"),
    ).toBe("var(--mpx-panel-shadow)");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-shadow"),
    ).toBe("var(--mpx-panel-shadow)");

    fireEvent.change(getSliderByLabelText("面板圆角"), {
      target: { value: "18" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-panel-radius"),
    ).toBe("18px");

    fireEvent.click(screen.getByRole("button", { name: "恢复到打开时状态" }));
    fireEvent.click(screen.getByRole("button", { name: "参数调节" }));
    expect(getSliderByLabelText("布局内边距").value).toBe(
      baselineLayoutPadding,
    );
    expect(getSliderByLabelText("拟物阴影强度").value).toBe(
      baselineSkeuoShadowStrength,
    );
    expect(getSliderByLabelText("拟物面板浮起高度").value).toBe(
      baselineSkeuoPaneElevation,
    );
  });

  it("按 style 切换专属参数并应用变量覆盖", () => {
    const { rerender } = renderThemeParameterPanel({ styleId: "liquid-glass" });

    const glassOpacitySlider = getSliderByLabelText("液态玻璃表面透明度");
    fireEvent.change(glassOpacitySlider, { target: { value: "68" } });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-bg-panel"),
    ).toContain("68%");

    rerender(
      <I18nProvider browserLocale="en-US">
        <ThemeParameterPanel
          open
          styleId="neobrutalism"
          settingsFontSize={14}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("液态玻璃表面透明度")).toBeNull();

    fireEvent.change(getSliderByLabelText("新粗野边框粗细"), {
      target: { value: "5" },
    });
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-panel-border-width",
      ),
    ).toBe("5px");
  });

  it("支持关键字过滤参数列表", () => {
    renderThemeParameterPanel({ styleId: "liquid-glass" });

    fireEvent.change(screen.getByLabelText("参数搜索"), {
      target: { value: "玻璃" },
    });
    expect(screen.queryByText("布局内边距")).toBeNull();
    expect(screen.getByText("液态玻璃模糊强度")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("参数搜索"), {
      target: { value: "不存在参数" },
    });
    expect(screen.getAllByText("无结果").length).toBeGreaterThan(0);
  });

  it("支持导出与导入参数快照 JSON", () => {
    renderThemeParameterPanel();

    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.change(screen.getByRole("textbox", { name: "--mpx-bg-app" }), {
      target: { value: "#123456" },
    });
    fireEvent.change(screen.getByLabelText("--mpx-bg-app-alpha"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain('"styleId": "soft-skeuomorphic"');
    expect(snapshotTextarea.value).toContain('"layout-padding": 14');
    expect(snapshotTextarea.value).toContain('"debugColors"');
    expect(snapshotTextarea.value).toContain(
      '"container-bg-app": "rgba(18, 52, 86, 0.4)"',
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
            debugColors: {
              "container-bg-app": "#112233",
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
      document.documentElement.style.getPropertyValue("--mpx-bg-app").trim(),
    ).toBe("#112233");
    expect(screen.getByText(/快照来自风格 liquid-glass/)).toBeInTheDocument();
  });

  it("按钮状态页颜色参数支持写入样式并进入快照", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "按钮样式调试" }));
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
      }),
      {
        target: { value: "#112233" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
      ),
    ).toBe("#112233");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"button-side-hover-bg": "#112233"',
    );
  });

  it("常用控件调试页支持变量写入并进入快照", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "常用控件调试" }));
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
    expect(screen.getByLabelText("slider-vertical-up-preview")).toBeInTheDocument();
    expect(
      screen.getByLabelText("slider-vertical-down-preview"),
    ).toBeInTheDocument();

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

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-tree-scrollbar-thumb-bg",
      ),
    ).toBe("#224466");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-range-track-bg"),
    ).toBe("#556677");

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
  });

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

  it("header 全局复位支持恢复到打开时状态", () => {
    renderThemeParameterPanel();

    const layoutPaddingSlider = getSliderByLabelText("布局内边距");
    const baselineLayoutPaddingValue = layoutPaddingSlider.value;
    fireEvent.change(getSliderByLabelText("布局内边距"), {
      target: { value: "14" },
    });
    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("14px");

    fireEvent.click(screen.getByRole("button", { name: "恢复到打开时状态" }));

    expect(getSliderByLabelText("布局内边距").value).toBe(
      baselineLayoutPaddingValue,
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

  it("仅导入 debugColors 时不覆盖现有数值参数", () => {
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
            debugColors: {
              "container-bg-app": "#112233",
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
      document.documentElement.style.getPropertyValue("--mpx-bg-app").trim(),
    ).toBe("#112233");
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

  it("关闭按钮触发关闭回调", () => {
    const onClose = vi.fn();
    renderThemeParameterPanel({ styleId: "flush", onClose });

    fireEvent.click(screen.getByRole("button", { name: "关闭主题参数面板" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("隐藏按钮触发隐藏回调", () => {
    const onHide = vi.fn();
    renderThemeParameterPanel({ onHide });

    fireEvent.click(
      screen.getByRole("button", { name: "临时隐藏主题参数面板" }),
    );
    expect(onHide).toHaveBeenCalledTimes(1);
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
  });

  it("大容器层调试拆分为三段可折叠，并支持新增槽位调试与快照导出", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    expect(screen.getByText("2.0 共享壳层")).toBeInTheDocument();
    expect(screen.getByText("2.1 Header")).toBeInTheDocument();
    expect(screen.getByText("2.2 Sidebar")).toBeInTheDocument();
    expect(screen.getByText("2.3 Main")).toBeInTheDocument();
    expect(screen.getByText("2.4 Metadata")).toBeInTheDocument();
    const sidebarSummary = screen.getByText("2.2.2.1 fg-sidebar-main");
    const nameListSummary = screen.getByText(
      "2.3.2.2 fg-main-content-image-name-list",
    );
    expect(sidebarSummary).toBeInTheDocument();
    expect(nameListSummary).toBeInTheDocument();

    fireEvent.click(sidebarSummary);
    expect(screen.getByText("1、sidebar-main 本体与容器链路")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-bg" }),
      {
        target: { value: "#112233" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-label-border" }),
      {
        target: { value: "#223344" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-bg",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-border",
      ),
    ).toBe("#223344");

    fireEvent.click(nameListSummary);
    expect(screen.getByText("1、bg 背景与外层链路")).toBeInTheDocument();
    expect(screen.getByText("2、header 表头链路")).toBeInTheDocument();
    expect(screen.getByText("3、table 表格主体链路")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-main-image-name-list-row-bg",
      }),
      {
        target: { value: "#334455" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-main-image-name-list-head-bg",
      }),
      {
        target: { value: "#445566" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-image-name-list-row-bg",
      ),
    ).toBe("#334455");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-image-name-list-head-bg",
      ),
    ).toBe("#445566");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));
    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-bg": "#112233"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-label-border": "#223344"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-main-image-name-list-row-bg": "#334455"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-main-image-name-list-head-bg": "#445566"',
    );
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
      screen.getByRole("textbox", { name: "--mpx-header-bg" }),
      {
        target: {
          value: "linear-gradient(135deg, #111111, #222222)",
        },
      },
    );
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
      document.documentElement.style.getPropertyValue("--mpx-header-frame-rotate-z"),
    ).toBe("-12deg");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-bg"),
    ).toBe("linear-gradient(135deg, #111111, #222222)");
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
      '"container-header-fill": "linear-gradient(135deg, #111111, #222222)"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-header-shadow": "0 8px 24px rgba(1, 2, 3, 0.4)"',
    );
  });

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
      document.documentElement.style.getPropertyValue("--mpx-sidebar-frame-scale-x"),
    ).toBe("0.88");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-frame-translate-y"),
    ).toBe("18px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-metadata-frame-origin-y"),
    ).toBe("72%");
  });

  it(
    "复杂文本变量支持结构化拆分编辑且导入导出保持原始 CSS 字符串",
    () => {
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
      (screen.getByRole("spinbutton", {
        name: "--mpx-sidebar-main-label-bg-angle",
      }) as HTMLInputElement).value,
    ).toBe("150");
    expect(
      (screen.getByRole("textbox", {
        name: "--mpx-sidebar-main-label-bg-color-1",
      }) as HTMLInputElement).value,
    ).toBe("#333333");
    expect(
      (screen.getByRole("spinbutton", {
        name: "--mpx-sidebar-main-label-hover-filter-value",
      }) as HTMLInputElement).value,
    ).toBe("0.93");
    },
    10000,
  );

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
  });

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
  });

  it("打开主题参数面板时会迁移旧 sidebar slot 覆写到语义 token", () => {
    document.documentElement.style.setProperty(
      "--mpx-slot-fg-sidebar-main-bg",
      "#2468ac",
    );

    renderThemeParameterPanel();

    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-main-bg"),
    ).toBe("#2468ac");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-slot-fg-sidebar-main-bg")
        .trim(),
    ).toBe("");
  });

  it("写入语义 token 时会清理对应 legacy slot 覆写", () => {
    document.documentElement.style.setProperty(
      "--mpx-slot-fg-sidebar-main-label-border",
      "#8899aa",
    );

    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.click(screen.getByText("2.2.2.1 fg-sidebar-main"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-label-border" }),
      {
        target: { value: "#223344" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-border",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-slot-fg-sidebar-main-label-border")
        .trim(),
    ).toBe("");
  });

  it("大容器层颜色项支持复位到主题默认值", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    fireEvent.change(screen.getByRole("textbox", { name: "--mpx-bg-app" }), {
      target: { value: "#abcdef" },
    });

    const fieldInput = screen.getByRole("textbox", { name: "--mpx-bg-app" });
    const control = fieldInput.closest(".theme-parameter-color-control");
    expect(control).not.toBeNull();
    const resetButton = control?.querySelector(
      ".theme-parameter-reset-btn",
    ) as HTMLButtonElement | null;
    expect(resetButton).not.toBeNull();
    fireEvent.click(resetButton as HTMLButtonElement);

    expect(
      document.documentElement.style.getPropertyValue("--mpx-bg-app").trim(),
    ).toBe("");
  });
});
