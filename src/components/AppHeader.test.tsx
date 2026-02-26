import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppHeader, { type AppHeaderProps } from "./AppHeader";
import {
  emitMusicPlaybackState,
  onMusicPlaybackControl,
  type MusicPlaybackControlAction,
} from "../features/media/musicPlaybackBridge";

function createHeaderProps(
  overrides: Partial<AppHeaderProps> = {},
): AppHeaderProps {
  return {
    headerHeight: 56,
    mode: "image",
    searchPanelOpen: false,
    manageMode: false,
    metadataManageMode: false,
    thumbnailScaleLevel: 4,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    autoPlayEnabled: false,
    autoPlayInterval: 3,
    paletteMode: "day",
    interactionLocked: false,
    importMenuOpen: false,
    taskStatusLabel: "idle",
    taskStatusBusy: false,
    importTaskPanelOpen: false,
    autoPlayPresets: [1, 2, 3, 4, 5, 6, 7, 8, 9],
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

function emitPlaybackState(playing: boolean) {
  act(() => {
    emitMusicPlaybackState({ playing });
  });
}

afterEach(() => {
  emitPlaybackState(false);
});

describe("AppHeader music quick actions", () => {
  it("仅在音乐模式播放后切到非音乐模式才显示", () => {
    const baseProps = createHeaderProps();
    const { container, rerender } = render(
      <AppHeader {...baseProps} mode="music" />,
    );

    emitPlaybackState(true);
    const quickActions = container.querySelector(
      ".music-quick-actions",
    ) as HTMLElement;
    expect(quickActions.classList.contains("is-visible")).toBe(false);

    rerender(<AppHeader {...baseProps} mode="image" />);
    expect(quickActions.classList.contains("is-visible")).toBe(true);
  });

  it("非音乐模式快捷控制可切换播放并在 stop 后等待下一次音乐播放", () => {
    const actions: MusicPlaybackControlAction[] = [];
    const unsubscribe = onMusicPlaybackControl((action) => {
      actions.push(action);
    });

    const baseProps = createHeaderProps();
    const { container, rerender } = render(
      <AppHeader {...baseProps} mode="music" />,
    );

    emitPlaybackState(true);
    rerender(<AppHeader {...baseProps} mode="video" />);

    const quickActions = container.querySelector(
      ".music-quick-actions",
    ) as HTMLElement;
    expect(quickActions.classList.contains("is-visible")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "暂停音乐" }));
    expect(actions.at(-1)).toBe("toggle-playback");

    emitPlaybackState(false);
    fireEvent.click(screen.getByRole("button", { name: "播放音乐" }));
    expect(actions.at(-1)).toBe("toggle-playback");

    emitPlaybackState(true);
    fireEvent.click(screen.getByRole("button", { name: "停止音乐" }));
    expect(actions.at(-1)).toBe("stop");
    expect(quickActions.classList.contains("is-visible")).toBe(false);

    rerender(<AppHeader {...baseProps} mode="image" />);
    expect(quickActions.classList.contains("is-visible")).toBe(false);

    rerender(<AppHeader {...baseProps} mode="music" />);
    emitPlaybackState(true);
    expect(quickActions.classList.contains("is-visible")).toBe(false);

    rerender(<AppHeader {...baseProps} mode="image" />);
    expect(quickActions.classList.contains("is-visible")).toBe(true);

    unsubscribe();
  });

  it("点击 Debug 组 T 按钮会打开界面参数面板，并在关闭态时自动开启显示开关", () => {
    const onThemeParameterButtonVisibleChange = vi.fn();
    const onOpenThemeParameter = vi.fn();
    render(
      <AppHeader
        {...createHeaderProps({
          headerDebugGroupVisible: true,
          themeParameterButtonVisible: false,
          onThemeParameterButtonVisibleChange,
          onOpenThemeParameter,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "主题参数" }));
    expect(onThemeParameterButtonVisibleChange).toHaveBeenCalledTimes(1);
    expect(onThemeParameterButtonVisibleChange).toHaveBeenCalledWith(true);
    expect(onOpenThemeParameter).toHaveBeenCalledTimes(1);
  });

  it("点击 O/C 按钮会触发调试固定开关", () => {
    const onTogglePopoverDebugPinned = vi.fn();
    render(
      <AppHeader
        {...createHeaderProps({
          headerDebugGroupVisible: true,
          onTogglePopoverDebugPinned,
          popoverDebugPinned: false,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "调试固定悬浮层" }));
    expect(onTogglePopoverDebugPinned).toHaveBeenCalledTimes(1);
  });

  it("点击 Debug 组 N 按钮会触发 Electron 外框与菜单开关", () => {
    const onElectronNativeChromeEnabledChange = vi.fn();
    render(
      <AppHeader
        {...createHeaderProps({
          headerDebugGroupVisible: true,
          electronNativeChromeEnabled: false,
          onElectronNativeChromeEnabledChange,
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "显示 Electron 外框与菜单" }),
    );
    expect(onElectronNativeChromeEnabledChange).toHaveBeenCalledTimes(1);
    expect(onElectronNativeChromeEnabledChange).toHaveBeenCalledWith(true);
  });

  it("点击 Debug 组 TT 按钮会触发 Tooltips 开关", () => {
    const onTooltipEnabledChange = vi.fn();
    render(
      <AppHeader
        {...createHeaderProps({
          headerDebugGroupVisible: true,
          tooltipEnabled: true,
          onTooltipEnabledChange,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "tooltips" }));
    expect(onTooltipEnabledChange).toHaveBeenCalledTimes(1);
    expect(onTooltipEnabledChange).toHaveBeenCalledWith(false);
  });

  it("双侧折叠收敛时对 header 应用居中宽度约束", () => {
    const { container } = render(
      <AppHeader
        {...createHeaderProps({
          sidebarCollapsed: true,
          metadataCollapsed: true,
          layoutConvergedInsetPx: 96,
        })}
      />,
    );

    const header = container.querySelector(".app-header") as HTMLElement | null;
    expect(header).not.toBeNull();
    expect(header?.style.width).toBe("100%");
    expect(header?.style.maxWidth).toBe(
      "calc(100% - 96px - (var(--mpx-slot-bg-app-workspace-padding, var(--mpx-layout-padding)) * 2))",
    );
    expect(header?.style.marginInline).toBe("auto");
  });
});
