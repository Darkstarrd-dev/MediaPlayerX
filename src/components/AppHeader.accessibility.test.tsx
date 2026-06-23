import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import AppHeader, { type AppHeaderProps } from "./AppHeader";

function createProps(overrides: Partial<AppHeaderProps> = {}): AppHeaderProps {
  return {
    headerHeight: 72,
    mode: "image",
    searchPanelOpen: false,
    manageMode: false,
    metadataManageMode: false,
    thumbnailScaleLevel: 3,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    autoPlayEnabled: false,
    autoPlayInterval: 3,
    paletteMode: "day",
    importMenuOpen: false,
    taskStatusLabel: "空闲",
    taskStatusBusy: false,
    importTaskPanelOpen: false,
    autoPlayPresets: [1, 3, 5],
    onToggleImportMenu: vi.fn(),
    onToggleImportTaskPanel: vi.fn(),
    onCloseImportMenu: vi.fn(),
    onImportFiles: vi.fn(),
    onImportFolders: vi.fn(),
    onModeChange: vi.fn(),
    onToggleSearchPanel: vi.fn(),
    onToggleManageMode: vi.fn(),
    onToggleMetadataManageMode: vi.fn(),
    onThumbnailScaleDown: vi.fn(),
    onThumbnailScaleUp: vi.fn(),
    onAutoPlayEnabledChange: vi.fn(),
    onAutoPlayIntervalChange: vi.fn(),
    onTogglePaletteMode: vi.fn(),
    headerDebugGroupVisible: false,
    tooltipEnabled: true,
    onTooltipEnabledChange: vi.fn(),
    electronNativeChromeEnabled: false,
    onElectronNativeChromeEnabledChange: vi.fn(),
    themeParameterButtonVisible: false,
    onThemeParameterButtonVisibleChange: vi.fn(),
    onOpenThemeParameter: vi.fn(),
    popoverDebugPinned: false,
    onTogglePopoverDebugPinned: vi.fn(),
    onOpenHelp: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
}

describe("AppHeader accessibility labels", () => {
  afterEach(() => {
    act(() => {
      resetUiStoreState();
    });
  });

  it("keeps stable header button labels in normal mode", () => {
    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: "zh-CN" });
    });

    const { container } = render(
      <I18nProvider browserLocale="en-US">
        <AppHeader {...createProps({ metadataManageMode: false })} />
      </I18nProvider>,
    );

    const helpButton = container.querySelector(
      'button[data-a11y-id="header.help"]',
    );
    const settingsButton = container.querySelector(
      'button[data-a11y-id="header.settings"]',
    );

    expect(settingsButton).toBeInTheDocument();
    expect(helpButton?.getAttribute("data-tooltip-label")).toBe("打开帮助");
    expect(
      screen.getByRole("button", { name: "切换到深色主题" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("uses task label on logo button for accessibility", () => {
    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: "zh-CN" });
    });

    render(
      <I18nProvider browserLocale="en-US">
        <AppHeader
          {...createProps({ taskStatusLabel: "处理中", taskStatusBusy: true })}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "处理中" })).toBeInTheDocument();
  });
});
