import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import ThemeParameterPanel from "./ThemeParameterPanel";

type RoleNameOption = { name?: string | RegExp } | undefined;

function normalizeRoleName(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function getElementAriaLabel(element: Element): string {
  return normalizeRoleName(element.getAttribute("aria-label"));
}

function getButtonAccessibleName(button: HTMLButtonElement): string {
  const ariaLabel = getElementAriaLabel(button);
  if (ariaLabel) {
    return ariaLabel;
  }

  const labelledBy = button.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    const normalized = normalizeRoleName(labelText);
    if (normalized) {
      return normalized;
    }
  }

  const textContent = normalizeRoleName(button.textContent);
  if (textContent) {
    return textContent;
  }

  return normalizeRoleName(button.getAttribute("title"));
}

function matchSingleElementByName<T extends Element>(
  elements: Iterable<T>,
  name: string,
  getName: (element: T) => string,
): T | null {
  const matches = Array.from(elements).filter(
    (element) => getName(element) === normalizeRoleName(name),
  );
  if (matches.length !== 1) {
    return null;
  }
  return matches[0];
}

function resolveFastRoleQuery(
  role: string,
  options: RoleNameOption,
): HTMLElement | null {
  const name = typeof options?.name === "string" ? options.name : null;
  if (!name) {
    return null;
  }

  if (role === "button") {
    return matchSingleElementByName(
      document.querySelectorAll<HTMLButtonElement>("button"),
      name,
      getButtonAccessibleName,
    );
  }

  if (role === "textbox") {
    return matchSingleElementByName(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input[aria-label]:not([type="number"]):not([type="range"]):not([type="color"]), textarea[aria-label]',
      ),
      name,
      getElementAriaLabel,
    ) as HTMLElement | null;
  }

  if (role === "spinbutton") {
    return matchSingleElementByName(
      document.querySelectorAll<HTMLInputElement>('input[type="number"][aria-label]'),
      name,
      getElementAriaLabel,
    );
  }

  return null;
}

const originalGetByRole = screen.getByRole.bind(screen);
const originalQueryByRole = screen.queryByRole.bind(screen);

function installFastRoleQueries(): () => void {
  const getByRoleSpy = vi
    .spyOn(screen, "getByRole")
    .mockImplementation((role, options) => {
      const fastMatch = resolveFastRoleQuery(role, options as RoleNameOption);
      if (fastMatch) {
        return fastMatch;
      }
      return originalGetByRole(role, options);
    });

  const queryByRoleSpy = vi
    .spyOn(screen, "queryByRole")
    .mockImplementation((role, options) => {
      const fastMatch = resolveFastRoleQuery(role, options as RoleNameOption);
      if (fastMatch) {
        return fastMatch;
      }
      return originalQueryByRole(role, options);
    });

  return () => {
    getByRoleSpy.mockRestore();
    queryByRoleSpy.mockRestore();
  };
}

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

function ensureDetailsOpen(summaryText: string): void {
  const details = getDetailsBySummaryText(summaryText);
  expect(details).not.toBeNull();
  if (!details?.open) {
    fireEvent.click(screen.getAllByText(summaryText)[0]);
  }
}

function ensureDetailsOpenWithin(container: HTMLElement, summaryText: string): void {
  const details = getDetailsBySummaryTextWithin(container, summaryText);
  expect(details).not.toBeNull();
  if (!details?.open) {
    fireEvent.click(within(container).getAllByText(summaryText)[0]);
  }
}

function getDetailsBySummaryText(summaryText: string): HTMLDetailsElement {
  const summary = screen.getAllByText(summaryText)[0];
  const ensuredSummary = summary as HTMLElement;
  const details = ensuredSummary.closest("details") as HTMLDetailsElement | null;
  expect(details).not.toBeNull();
  return details as HTMLDetailsElement;
}

function getOrderedFieldContainer(text: string): HTMLElement {
  const node = screen.getAllByText(text)[0];
  const container = node.closest("label, details") as HTMLElement | null;
  expect(container).not.toBeNull();
  return container as HTMLElement;
}

function getOrderedFieldContainerWithin(
  container: HTMLElement,
  text: string,
): HTMLElement {
  const node = within(container).getAllByText(text)[0];
  const fieldContainer = node.closest("label, details") as HTMLElement | null;
  expect(fieldContainer).not.toBeNull();
  return fieldContainer as HTMLElement;
}

function expectFieldOrder(texts: string[]): void {
  for (let index = 0; index < texts.length - 1; index += 1) {
    const current = getOrderedFieldContainer(texts[index]);
    const next = getOrderedFieldContainer(texts[index + 1]);
    expect(
      current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  }
}

function expectFieldOrderWithin(container: HTMLElement, texts: string[]): void {
  for (let index = 0; index < texts.length - 1; index += 1) {
    const current = getOrderedFieldContainerWithin(container, texts[index]);
    const next = getOrderedFieldContainerWithin(container, texts[index + 1]);
    expect(
      current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  }
}

function getDetailsBySummaryTextWithin(
  container: HTMLElement,
  summaryText: string,
): HTMLDetailsElement {
  const summary = within(container)
    .getAllByText(summaryText)
    .find((element) => element.tagName === "SUMMARY");
  if (!summary) {
    throw new Error(`Summary not found: ${summaryText}`);
  }
  const details = summary.closest("details") as HTMLDetailsElement | null;
  expect(details).not.toBeNull();
  return details as HTMLDetailsElement;
}

function getResetButtonByLabelText(text: string): HTMLButtonElement {
  const label = screen
    .getByText(text)
    .closest("label") as HTMLLabelElement | null;
  expect(label).not.toBeNull();
  const button = label?.querySelector(
    ".theme-parameter-reset-btn",
  ) as HTMLButtonElement | null;
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
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
  let restoreFastRoleQueries: (() => void) | null = null;

  beforeAll(() => {
    restoreFastRoleQueries = installFastRoleQueries();
  });

  afterAll(() => {
    restoreFastRoleQueries?.();
    restoreFastRoleQueries = null;
  });

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

  it("共享壳层圆角总控会同步四个分控，分控仍可继续覆盖", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.0 共享壳层");

    fireEvent.change(getSliderByLabelText("--mpx-container-frame-radius"), {
      target: { value: "20" },
    });

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-container-frame-radius",
      ),
    ).toBe("20px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-radius"),
    ).toBe("20px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-radius"),
    ).toBe("20px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-radius"),
    ).toBe("20px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-metadata-radius"),
    ).toBe("20px");

    ensureDetailsOpen("2.1 Header");
    ensureDetailsOpen("2.2 Sidebar");
    ensureDetailsOpen("2.3 Main");
    ensureDetailsOpen("2.4 Metadata");

    expect(getSliderByLabelText("--mpx-header-radius").value).toBe("20");
    expect(getSliderByLabelText("--mpx-sidebar-radius").value).toBe("20");
    expect(getSliderByLabelText("--mpx-main-radius").value).toBe("20");
    expect(getSliderByLabelText("--mpx-metadata-radius").value).toBe("20");

    fireEvent.change(getSliderByLabelText("--mpx-main-radius"), {
      target: { value: "8" },
    });

    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-radius"),
    ).toBe("8px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-radius"),
    ).toBe("20px");

    fireEvent.click(getResetButtonByLabelText("--mpx-container-frame-radius"));

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-container-frame-radius",
      ),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-radius"),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-radius"),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-metadata-radius"),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-radius"),
    ).toBe("8px");
  });

  it("共享壳层阴影总控会同步四个分控阴影，分控仍可继续覆盖", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.0 共享壳层");

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-container-frame-shadow-layer-0-offsetX",
      }),
      {
        target: { value: "9px" },
      },
    );

    const sharedShadow = document.documentElement.style.getPropertyValue(
      "--mpx-container-frame-shadow",
    );
    expect(sharedShadow).toContain("9px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-shadow"),
    ).toBe(sharedShadow);
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-shadow"),
    ).toBe(sharedShadow);
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-shadow"),
    ).toBe(sharedShadow);
    expect(
      document.documentElement.style.getPropertyValue("--mpx-metadata-shadow"),
    ).toBe(sharedShadow);

    ensureDetailsOpen("2.1 Header");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-header-shadow-layer-0-offsetX",
      }),
      {
        target: { value: "4px" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue("--mpx-header-shadow"),
    ).toContain("4px");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-shadow"),
    ).toBe(sharedShadow);
  }, 30000);

  it("共享壳层 fill 三件套会同步四个分控，分控仍可继续覆盖", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.0 共享壳层");

    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-container-frame-fill-start" }),
      {
        target: { value: "#111111" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-container-frame-fill-end" }),
      {
        target: { value: "#222222" },
      },
    );
    fireEvent.change(getSliderByLabelText("--mpx-container-frame-fill-angle"), {
      target: { value: "135" },
    });

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-fill-start",
      ),
    ).toBe("#111111");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-fill-end"),
    ).toBe("#222222");
    expect(
      document.documentElement.style.getPropertyValue("--mpx-main-fill-angle"),
    ).toBe("135deg");

    ensureDetailsOpen("2.2 Sidebar");
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-fill-start" }),
      {
        target: { value: "#333333" },
      },
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-container-frame-fill-start" }),
      {
        target: { value: "#444444" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-fill-start",
      ),
    ).toBe("#333333");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-header-fill-start",
      ),
    ).toBe("#444444");
  }, 30000);

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

  it("应用背景 fill 支持基础纯色快捷选择", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("1.0 背景");

    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-bg-app-fill" }),
      {
        target: { value: "linear-gradient(90deg, #112233, #445566)" },
      },
    );
    fireEvent.change(screen.getByLabelText("--mpx-bg-app-fill-solid-picker"), {
      target: { value: "#abcdef" },
    });

    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-bg-app-fill")
        .trim(),
    ).toBe("#abcdef");
  });

  it("按钮状态页颜色参数支持写入样式并进入快照", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "按钮样式调试" }));
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-btn-variant-default-bg-hover",
      }),
      {
        target: { value: "#112233" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-btn-variant-default-bg-hover",
      ),
    ).toBe("#112233");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"button-default-bg-hover": "#112233"',
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
    ensureDetailsOpen("1.0 背景");
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-bg-app-fill" }),
      {
        target: { value: "linear-gradient(180deg, #abcdef, #fedcba)" },
      },
    );

    const fieldLabel = screen.getByText("--mpx-bg-app-fill");
    const control = fieldLabel.closest(".theme-parameter-text-row");
    expect(control).not.toBeNull();
    const resetButton = control?.querySelector(
      ".theme-parameter-reset-btn",
    ) as HTMLButtonElement | null;
    expect(resetButton).not.toBeNull();
    fireEvent.click(resetButton as HTMLButtonElement);

    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-bg-app-fill")
        .trim(),
    ).toBe("");
  });
});
