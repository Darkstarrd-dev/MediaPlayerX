import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import ThemeParameterPanel from "./ThemeParameterPanel";

export function getSliderByLabelText(text: string): HTMLInputElement {
  const label = screen
    .getByText(text)
    .closest("label") as HTMLLabelElement | null;
  if (!label) {
    throw new Error(`未找到滑块标签: ${text}`);
  }
  const slider = label.querySelector(
    'input[type="range"]',
  ) as HTMLInputElement | null;
  if (!slider) {
    throw new Error(`未找到滑块输入框: ${text}`);
  }
  return slider;
}

export function getDetailsBySummaryText(
  summaryText: string,
): HTMLDetailsElement {
  const summary = screen.getByText(summaryText);
  const details = summary.closest("details") as HTMLDetailsElement | null;
  if (!details) {
    throw new Error(`未找到 details 节点: ${summaryText}`);
  }
  return details;
}

export function ensureDetailsOpen(summaryText: string): void {
  const details = getDetailsBySummaryText(summaryText);
  if (!details.open) {
    fireEvent.click(screen.getByText(summaryText));
  }
}

export function getThemeParameterMain(): HTMLElement {
  const container = document.querySelector(
    ".theme-parameter-main",
  ) as HTMLElement | null;
  if (!container) {
    throw new Error("未找到 theme-parameter-main 容器");
  }
  return container;
}

export function renderThemeParameterPanel(
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
