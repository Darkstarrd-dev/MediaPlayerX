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

function getThemeParameterMain(): HTMLElement {
  const container = document.querySelector(
    ".theme-parameter-main",
  ) as HTMLElement | null;
  expect(container).not.toBeNull();
  return container as HTMLElement;
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
    expect(
      document.querySelector(
        '.theme-debug-small-panel-preview-card[data-slot="fg-header-g1-settings-shortcut-edit-panel"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(
        '.theme-debug-small-panel-preview-card[data-slot="fg-sidebar-shortcut-rename-single-panel"]',
      ),
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

  it("大面板层调试按根层、共享总控与分控重排，并切到 fill 三件套", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));

    expect(screen.getByText("3.0 Root/Shell 共用层")).toBeInTheDocument();
    expect(
      screen.getByText("3.1 Head / Side / Main 共享总控"),
    ).toBeInTheDocument();
    expect(screen.getByText("3.2 Head")).toBeInTheDocument();
    expect(screen.getByText("3.3 Side")).toBeInTheDocument();
    expect(screen.getByText("3.4 Main")).toBeInTheDocument();
    expect(screen.getByText("3.5 Button 按钮总控")).toBeInTheDocument();
    expect(screen.getByText("3.10 内部件")).toBeInTheDocument();

    ensureDetailsOpen("3.0 Root/Shell 共用层");
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
    expect(screen.getByText("3.10.5 标签检索")).toBeInTheDocument();
    expect(screen.getByText("3.10.6 字幕清理")).toBeInTheDocument();
    expect(screen.getByText("3.10.7 转码")).toBeInTheDocument();
    expect(
      screen.getByText("3.10.8 侧栏重命名（共享内部件 + 预览）"),
    ).toBeInTheDocument();

    ensureDetailsOpen("3.10.1 导入任务");
    const importTaskDetails = getDetailsBySummaryText("3.10.1 导入任务");
    expectFieldOrderWithin(importTaskDetails, [
      "--mpx-import-task-error-border",
      "--mpx-import-task-error-bg",
      "--mpx-import-task-error-text",
      "--mpx-import-task-hint-border",
      "--mpx-import-task-hint-bg",
      "--mpx-import-task-hint-text",
      "--mpx-import-task-review-notice-border",
      "--mpx-import-task-review-notice-bg",
      "--mpx-import-task-review-notice-text",
      "--mpx-import-task-hash-log-border",
      "--mpx-import-task-hash-log-bg",
      "--mpx-import-task-hash-log-text",
    ]);
    expect(
      within(importTaskDetails).getByText("错误事件边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("错误事件背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("错误事件文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("提示事件边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("提示事件背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("提示事件文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("审核提醒事件边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("审核提醒事件背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("审核提醒事件文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("哈希日志事件边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("哈希日志事件背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(importTaskDetails).getByText("哈希日志事件文字颜色"),
    ).toBeInTheDocument();

    ensureDetailsOpen("3.10.0 设置/帮助/主题参数");
    const settingsDetails = getDetailsBySummaryText(
      "3.10.0 设置/帮助/主题参数",
    );
    ensureDetailsOpenWithin(settingsDetails, "Side");
    ensureDetailsOpenWithin(settingsDetails, "Main");
    const sideDetails = getDetailsBySummaryTextWithin(settingsDetails, "Side");
    const mainDetails = getDetailsBySummaryTextWithin(settingsDetails, "Main");
    expectFieldOrderWithin(sideDetails, [
      "--mpx-settings-side-border",
      "--mpx-settings-side-bg",
      "--mpx-settings-side-text",
      "--mpx-settings-side-item-bg",
      "--mpx-settings-side-item-hover-bg",
      "--mpx-settings-side-item-active-bg",
      "--mpx-settings-side-item-active-text",
    ]);
    expect(
      within(sideDetails).getByText("大面板side容器边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器标签背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器标签hover状态背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器标签focused状态背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(sideDetails).getByText("大面板side容器标签focused状态文字颜色"),
    ).toBeInTheDocument();

    expectFieldOrderWithin(mainDetails, [
      "--mpx-settings-main-border",
      "--mpx-settings-main-bg",
      "--mpx-settings-main-text",
      "--mpx-settings-group-border",
      "--mpx-settings-group-head-text",
      "--mpx-settings-item-label-text",
      "--mpx-settings-item-value-text",
      "--mpx-settings-item-input-bg",
      "--mpx-settings-item-input-border",
      "--mpx-settings-danger-btn-border",
      "--mpx-settings-danger-btn-bg",
      "--mpx-settings-danger-btn-text",
    ]);
    expect(
      within(mainDetails).getByText("大面板main容器边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器文字A颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组大标题文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组小标题文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组输入框文字颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组输入框背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内分组输入框边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内高危按钮边框颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内高危按钮背景颜色"),
    ).toBeInTheDocument();
    expect(
      within(mainDetails).getByText("大面板main容器内高危按钮文字颜色"),
    ).toBeInTheDocument();

    ensureDetailsOpen("3.10.2 元数据抓取");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-fetch-control-font-size",
      }),
    ).toBeInTheDocument();
    ensureDetailsOpen("3.10.8 侧栏重命名（共享内部件 + 预览）");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-text",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "小面板层调试" }));
    expect(
      screen.queryByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-text",
      }),
    ).toBeNull();
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
      screen.getByRole("textbox", {
        name: "--mpx-dialog-panel-root-fill-start",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-dialog-panel-root-fill-end",
      }),
    ).toBeInTheDocument();
    expect(
      getSliderByLabelText("--mpx-dialog-panel-root-fill-angle"),
    ).toBeInTheDocument();
    expect(
      getSliderByLabelText("--mpx-dialog-panel-height"),
    ).toBeInTheDocument();
    expect(
      getSliderByLabelText("--mpx-dialog-panel-max-height"),
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
        name: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-start",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-end",
      }),
    ).toBeInTheDocument();
    expect(
      getSliderByLabelText(
        "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-angle",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-playlist-name-dialog-input-bg",
      }),
    ).toBeInTheDocument();

    ensureDetailsOpen("5.8 Rename Single");
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-start",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-end",
      }),
    ).toBeInTheDocument();
    expect(
      getSliderByLabelText(
        "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-angle",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", {
        name: "--mpx-sidebar-rename-dialog-control-hover-bg",
      }),
    ).toBeNull();
  }, 15000);

  it("大面板根层变量会作用到 Theme Parameter 面板本体", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大面板层调试" }));
    ensureDetailsOpen("3.0 Root/Shell 共用层");
    ensureDetailsOpen("大面板背景阴影设置");

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

  it("Metadata 偏好记录与 Booklet 绑定调试值会按大容器会话态恢复", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.4 Metadata");
    ensureDetailsOpen("2.4.2.5 Metadata 偏好记录");
    ensureDetailsOpen("2.4.2.6 Music Metadata Booklet 绑定");

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-preference-record-bg",
      }),
      {
        target: { value: "#345678" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-booklet-binding-bg",
      }),
      {
        target: { value: "#456789" },
      },
    );

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

    document.documentElement.style.removeProperty(
      "--mpx-metadata-preference-record-bg",
    );
    document.documentElement.style.removeProperty(
      "--mpx-metadata-booklet-binding-bg",
    );
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-metadata-preference-record-bg")
        .trim(),
    ).toBe("");
    expect(
      document.documentElement.style
        .getPropertyValue("--mpx-metadata-booklet-binding-bg")
        .trim(),
    ).toBe("");

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

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-preference-record-bg",
      ),
    ).toBe("#345678");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-booklet-binding-bg",
      ),
    ).toBe("#456789");
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

  it("关闭后重开保持 Metadata 偏好记录与 Booklet 绑定折叠状态", () => {
    const { rerender } = renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    ensureDetailsOpen("2.4 Metadata");
    ensureDetailsOpen("2.4.2.5 Metadata 偏好记录");
    ensureDetailsOpen("2.4.2.6 Music Metadata Booklet 绑定");

    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-preference-record-bg",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-booklet-binding-bg",
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

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-preference-record-bg",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-booklet-binding-bg",
      }),
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
        name: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-start",
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
        name: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-start",
      }),
    ).toBeInTheDocument();
  }, 15000);

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
