import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";
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
      resetUiStoreState();
      useUiStore.getState().updateSettings({ uiLocale: "zh-CN" });
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    act(() => {
      resetUiStoreState();
    });
  });

  it("支持调节与重置通用/风格参数", () => {
    renderThemeParameterPanel();

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

    fireEvent.click(screen.getByRole("button", { name: "重置当前风格参数" }));
    expect(
      document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-skeuo-shadow-dark",
      ),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-panel-shadow"),
    ).toBe("");
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
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain('"styleId": "soft-skeuomorphic"');
    expect(snapshotTextarea.value).toContain('"layout-padding": 14');

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
    expect(screen.getByText(/快照来自风格 liquid-glass/)).toBeInTheDocument();
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
});
