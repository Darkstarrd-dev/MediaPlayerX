import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";

import {
  dispatchMusicPlaybackControl,
  onMusicPlaybackState,
} from "../features/media/musicPlaybackBridge";
import { buildA11yPropsByRegistry } from "../i18n/a11y";
import { a11yRegistry } from "../i18n/ariaRegistry";
import { useI18n } from "../i18n/useI18n";
import type { BrowserMode } from "../types";
import {
  canReplaySweepWhenGlobalMediaIdle,
  useRandomSweepAnimation,
} from "./useRandomSweepAnimation";

type HeaderIconName =
  | "statusIdle"
  | "statusBusy"
  | "image"
  | "video"
  | "music"
  | "search"
  | "edit"
  | "metadata"
  | "dataMode"
  | "autoplayOn"
  | "autoplayOff"
  | "settings"
  | "day"
  | "night"
  | "minus"
  | "plus"
  | "zoom"
  | "play"
  | "pause"
  | "stop"
  | "windowMinimize"
  | "windowMaximize"
  | "windowRestore"
  | "windowFullscreen"
  | "windowExitFullscreen"
  | "windowClose"
  | "help";

const HEADER_ICON_NODES: Record<HeaderIconName, ReactElement> = {
  statusIdle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  statusBusy: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  edit: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <line x1="9" y1="15" x2="15" y2="9" />
      <line x1="15" y1="15" x2="9" y2="9" />
    </>
  ),
  metadata: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  dataMode: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <rect x="3" y="4" width="4" height="4" />
      <rect x="3" y="10" width="4" height="4" />
      <rect x="3" y="16" width="4" height="4" />
    </>
  ),
  autoplayOn: (
    <>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <polygon points="10 8 16 12 10 16 10 8" />
      <path d="M22 12c0-5.52-4.48-10-10-10" />
    </>
  ),
  autoplayOff: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  day: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  night: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  minus: <path d="M6 12h12" />,
  plus: (
    <>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </>
  ),
  zoom: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </>
  ),
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  windowMinimize: <path d="M5 19h14" />,
  windowMaximize: <rect x="3" y="3" width="18" height="18" rx="2" />,
  windowRestore: (
    <>
      <rect x="3" y="11" width="10" height="10" rx="1" />
      <path d="M11 3h7a1 1 0 0 1 1 1v7" />
      <path d="M11 3v4" />
      <path d="M15 11h4" />
    </>
  ),
  windowFullscreen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v5H4" />
      <path d="M15 3v5h5" />
      <path d="M9 21v-5H4" />
      <path d="M15 21v-5h5" />
    </>
  ),
  windowExitFullscreen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 8V3H4" />
      <path d="M15 8V3h5" />
      <path d="M9 16v5H4" />
      <path d="M15 16v5h5" />
    </>
  ),
  windowClose: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
};

function HeaderActionIcon({ name }: { name: HeaderIconName }) {
  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 24 24">
      {HEADER_ICON_NODES[name]}
    </svg>
  );
}

export interface AppHeaderProps {
  headerHeight: number;
  mode: BrowserMode;
  searchPanelOpen: boolean;
  manageMode: boolean;
  metadataManageMode: boolean;
  thumbnailScaleLevel: number;
  canThumbnailScaleDown: boolean;
  canThumbnailScaleUp: boolean;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  paletteMode: "day" | "night";
  interactionLocked?: boolean;
  importMenuOpen: boolean;
  taskStatusLabel: string;
  taskStatusBusy: boolean;
  importReviewAlerting?: boolean;
  importTaskPanelOpen: boolean;
  autoPlayPresets: number[];
  onToggleImportMenu: () => void;
  onToggleImportTaskPanel: () => void;
  onCloseImportMenu: () => void;
  onImportFiles: () => void;
  onImportFolders: () => void;
  onModeChange: (mode: BrowserMode) => void;
  onToggleSearchPanel: () => void;
  onToggleManageMode: () => void;
  onToggleMetadataManageMode: () => void;
  onThumbnailScaleDown: () => void;
  onThumbnailScaleUp: () => void;
  onAutoPlayEnabledChange: (enabled: boolean) => void;
  onAutoPlayIntervalChange: (value: number) => void;
  onTogglePaletteMode: () => void;
  headerDebugGroupVisible: boolean;
  tooltipEnabled: boolean;
  onTooltipEnabledChange: (value: boolean) => void;
  electronNativeChromeEnabled: boolean;
  onElectronNativeChromeEnabledChange: (value: boolean) => void;
  themeParameterButtonVisible: boolean;
  onThemeParameterButtonVisibleChange: (value: boolean) => void;
  onOpenThemeParameter: () => void;
  popoverDebugPinned: boolean;
  settingsOpen?: boolean;
  helpOpen?: boolean;
  themeParameterPanelOpen?: boolean;
  onTogglePopoverDebugPinned: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  sidebarCollapsed?: boolean;
  metadataCollapsed?: boolean;
  showPanelToggleControls?: boolean;
  onToggleSidebarPanel?: () => void;
  onToggleMetadataPanel?: () => void;
  layoutConvergedInsetPx?: number;
}

function AppHeader(props: AppHeaderProps) {
  const {
    mode,
    paletteMode,
    interactionLocked = false,
    importMenuOpen,
    taskStatusLabel,
    taskStatusBusy,
    importReviewAlerting = false,
    importTaskPanelOpen,
    onToggleImportMenu,
    onToggleImportTaskPanel,
    onCloseImportMenu,
    onImportFiles,
    onImportFolders,
    onModeChange,
    onTogglePaletteMode,
    headerDebugGroupVisible,
    tooltipEnabled,
    onTooltipEnabledChange,
    electronNativeChromeEnabled,
    onElectronNativeChromeEnabledChange,
    themeParameterButtonVisible,
    onThemeParameterButtonVisibleChange,
    onOpenThemeParameter,
    popoverDebugPinned,
    settingsOpen = false,
    helpOpen = false,
    themeParameterPanelOpen = false,
    onTogglePopoverDebugPinned,
    onOpenHelp,
    onOpenSettings,
    sidebarCollapsed = false,
    metadataCollapsed = false,
    showPanelToggleControls = false,
    onToggleSidebarPanel,
    onToggleMetadataPanel,
    layoutConvergedInsetPx = 0,
  } = props;
  const { t } = useI18n();
  const [windowMaximized, setWindowMaximized] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const [showMusicQuickActions, setShowMusicQuickActions] = useState(false);
  const [musicQuickPlaying, setMusicQuickPlaying] = useState(false);
  const { sweeping: logoSweeping, onAnimationEnd: handleLogoSweepAnimationEnd } =
    useRandomSweepAnimation({
      enabled: true,
      playOnEnable: true,
      playOnEnableDelayRangeMs: [0, 0],
      idleReplayEnabled: true,
      idleThresholdMs: 120000,
      idleDelayRangeMs: [165000, 420000],
      stopOnInteraction: true,
      canReplayWhenIdle: canReplaySweepWhenGlobalMediaIdle,
    });
  const musicQuickSessionArmedRef = useRef(false);
  const previousModeRef = useRef<BrowserMode>(mode);

  useEffect(() => {
    if (mode === "music") {
      musicQuickSessionArmedRef.current = false;
      setShowMusicQuickActions(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "music" && musicQuickPlaying) {
      musicQuickSessionArmedRef.current = true;
    }
  }, [mode, musicQuickPlaying]);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (
      previousMode === "music" &&
      mode !== "music" &&
      musicQuickSessionArmedRef.current
    ) {
      setShowMusicQuickActions(true);
    }
    previousModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const windowApi = window.mediaPlayerWindow;
    if (!windowApi) {
      return;
    }

    let active = true;
    void Promise.all([windowApi.isMaximized(), windowApi.isFullscreen()])
      .then(([maximized, fullscreen]) => {
        if (active) {
          setWindowMaximized(maximized);
          setWindowFullscreen(fullscreen);
        }
      })
      .catch(() => undefined);

    const unsubscribeMaximized = windowApi.onMaximizedStateChange(
      (maximized) => {
        setWindowMaximized(maximized);
      },
    );
    const unsubscribeFullscreen = windowApi.onFullscreenStateChange(
      (fullscreen) => {
        setWindowFullscreen(fullscreen);
      },
    );

    return () => {
      active = false;
      unsubscribeMaximized();
      unsubscribeFullscreen();
    };
  }, []);

  useEffect(() => {
    return onMusicPlaybackState((detail) => {
      setMusicQuickPlaying(detail.playing);
    });
  }, []);

  const settingsButtonA11y = buildA11yPropsByRegistry({
    key: "headerSettings",
    t,
  });
  const themeParameterButtonA11y = buildA11yPropsByRegistry({
    key: "headerThemeParameter",
    t,
  });
  const popoverDebugPinnedButtonA11y = buildA11yPropsByRegistry({
    key: "headerPopoverDebugPinned",
    t,
  });
  const helpButtonA11y = buildA11yPropsByRegistry({ key: "headerHelp", t });
  const windowMaxRestoreLabel = windowFullscreen
    ? t("a11y.header.windowExitFullscreen")
    : windowMaximized
      ? t("a11y.header.windowEnterFullscreen")
      : t("a11y.header.windowMaximize");
  const windowMaxRestoreIconName: HeaderIconName = windowFullscreen
    ? "windowExitFullscreen"
    : windowMaximized
      ? "windowFullscreen"
      : "windowMaximize";
  const taskStateSlot = importTaskPanelOpen
    ? "fg-header-logo-state-open"
    : importReviewAlerting
      ? "fg-header-logo-state-review-alert"
    : taskStatusBusy
      ? "fg-header-logo-state-busy"
      : "fg-header-logo-state-idle";
  const dualCollapsed = sidebarCollapsed && metadataCollapsed;
  const tooltipLabel = t("ui.settings.debugTooltips");
  const nativeChromeLabel = t("ui.settings.debugNativeChrome");
  const collapseSidebarLabel = t("a11y.common.collapseSidebar");
  const collapseMetadataPanelLabel = t("a11y.common.collapseMetadataPanel");

  return (
    <header
      className="app-header"
      data-slot="fg-header-root"
      style={{
        ...(dualCollapsed
          ? {
              width: "100%",
              maxWidth: `calc(100% - ${layoutConvergedInsetPx}px - (var(--mpx-slot-bg-app-workspace-padding, var(--mpx-layout-padding)) * 2))`,
              marginInline: "auto",
            }
          : {}),
      }}
    >
      <div className="header-left">
        <div className="header-logo-group">
          <div
            className="logo-wrap"
            onMouseEnter={() => {
              if (!importMenuOpen) {
                onToggleImportMenu();
              }
            }}
            onMouseLeave={onCloseImportMenu}
          >
            <button
              aria-label={taskStatusLabel}
              className={`logo-btn mpx-random-sheen-host ${taskStatusBusy ? "is-task-busy" : "is-task-idle"} ${importTaskPanelOpen ? "is-task-open" : ""} ${importReviewAlerting ? "is-review-alert" : ""} ${logoSweeping ? "is-sweeping" : ""}`}
              data-slot="fg-header-logo"
              data-slot-state={taskStateSlot}
              data-tooltip-label={taskStatusLabel}
              type="button"
              onClick={onToggleImportTaskPanel}
              onAnimationEnd={handleLogoSweepAnimationEnd}
            >
              <span className="logo-btn-text">
                {taskStatusBusy ? "Processing..." : "MediaPlayerX"}
              </span>
            </button>
            {importMenuOpen ? (
              <div
                className="import-menu"
                data-slot="fg-header-logo-import-menu-panel"
              >
                <button
                  type="button"
                  onClick={() => {
                    onImportFiles();
                    onCloseImportMenu();
                  }}
                >
                  {t("ui.header.importFiles")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportFolders();
                    onCloseImportMenu();
                  }}
                >
                  {t("ui.header.importFolders")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="header-group header-group-primary"
          data-slot="fg-header-g1"
        >
          {showPanelToggleControls ? (
            <div
              className="panel-toggle-wrap"
              data-slot="fg-header-g1-panel-toggles"
            >
              <button
                className={`mode-action-btn panel-toggle-btn ${sidebarCollapsed ? "is-collapsed" : ""}`}
                data-slot="fg-header-g1-toggle-sidebar"
                type="button"
                aria-label={
                  sidebarCollapsed
                    ? t("a11y.common.expandSidebar")
                    : collapseSidebarLabel
                }
                data-tooltip-label={
                  sidebarCollapsed
                    ? t("a11y.common.expandSidebar")
                    : collapseSidebarLabel
                }
                onClick={() => {
                  onToggleSidebarPanel?.();
                }}
              >
                <span className="window-control-btn-text">L</span>
              </button>
              <button
                className={`mode-action-btn panel-toggle-btn ${metadataCollapsed ? "is-collapsed" : ""}`}
                data-slot="fg-header-g1-toggle-metadata"
                type="button"
                aria-label={
                  metadataCollapsed
                    ? t("a11y.common.expandMetadataPanel")
                    : collapseMetadataPanelLabel
                }
                data-tooltip-label={
                  metadataCollapsed
                    ? t("a11y.common.expandMetadataPanel")
                    : collapseMetadataPanelLabel
                }
                onClick={() => {
                  onToggleMetadataPanel?.();
                }}
              >
                <span className="window-control-btn-text">R</span>
              </button>
            </div>
          ) : null}

          <button
            aria-label={
              paletteMode === "day"
                ? t("a11y.header.switchToNightPalette")
                : t("a11y.header.switchToDayPalette")
            }
            className="window-control-btn"
            data-slot="fg-header-g1-palette"
            data-tooltip-label={
              paletteMode === "day"
                ? t("a11y.header.switchToNightPalette")
                : t("a11y.header.switchToDayPalette")
            }
            type="button"
            onClick={onTogglePaletteMode}
          >
            <HeaderActionIcon name={paletteMode === "day" ? "day" : "night"} />
          </button>

          <button
            {...settingsButtonA11y}
            aria-pressed={settingsOpen}
            className="window-control-btn"
            data-slot="fg-header-g1-settings"
            type="button"
            onClick={onOpenSettings}
          >
            <HeaderActionIcon name="settings" />
          </button>
        </div>

        <div
          className="header-group header-group-modes"
          data-slot="fg-header-g2"
        >
          <div className="mode-switch-wrap">
            <div
              className="mode-switch mpx-btn-group is-groove"
              role="group"
              aria-label={t(a11yRegistry.headerModeSwitch.labelKey)}
            >
              <button
                {...buildA11yPropsByRegistry({ key: "headerModeImage", t })}
                aria-pressed={mode === "image"}
                className={mode === "image" ? "is-active" : ""}
                data-slot="fg-header-g2-mode-image"
                type="button"
                disabled={interactionLocked}
                onClick={() => onModeChange("image")}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="image" />
                  </span>
                  <span className="header-btn-label">
                    {t("ui.header.imageMode")}
                  </span>
                </span>
              </button>
              <button
                {...buildA11yPropsByRegistry({ key: "headerModeVideo", t })}
                aria-pressed={mode === "video"}
                className={mode === "video" ? "is-active" : ""}
                data-slot="fg-header-g2-mode-video"
                type="button"
                disabled={interactionLocked}
                onClick={() => onModeChange("video")}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="video" />
                  </span>
                  <span className="header-btn-label">
                    {t("ui.header.videoMode")}
                  </span>
                </span>
              </button>
              <button
                {...buildA11yPropsByRegistry({ key: "headerModeMusic", t })}
                aria-pressed={mode === "music"}
                className={mode === "music" ? "is-active" : ""}
                data-slot="fg-header-g2-mode-music"
                type="button"
                disabled={interactionLocked}
                onClick={() => onModeChange("music")}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="music" />
                  </span>
                  <span className="header-btn-label">
                    {t("ui.header.musicMode")}
                  </span>
                </span>
              </button>
              <div
                className={`music-quick-actions ${showMusicQuickActions && mode !== "music" ? "is-visible" : ""}`}
                data-slot="fg-header-g2-music-quick"
              >
                <button
                  aria-label={
                    musicQuickPlaying
                      ? t("a11y.header.musicPause")
                      : t("a11y.header.musicPlay")
                  }
                  className="mode-action-btn"
                  data-tooltip-label={
                    musicQuickPlaying
                      ? t("a11y.header.musicPause")
                      : t("a11y.header.musicPlay")
                  }
                  type="button"
                  onClick={() => {
                    dispatchMusicPlaybackControl("toggle-playback");
                  }}
                >
                  <HeaderActionIcon
                    name={musicQuickPlaying ? "pause" : "play"}
                  />
                </button>
                <button
                  {...buildA11yPropsByRegistry({ key: "headerMusicStop", t })}
                  className="mode-action-btn"
                  type="button"
                  onClick={() => {
                    setShowMusicQuickActions(false);
                    musicQuickSessionArmedRef.current = false;
                    dispatchMusicPlaybackControl("stop");
                  }}
                >
                  <HeaderActionIcon name="stop" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        {themeParameterButtonVisible && !headerDebugGroupVisible ? (
          <button
            {...themeParameterButtonA11y}
            aria-pressed={themeParameterPanelOpen}
            className="window-control-btn window-control-btn--theme-parameter"
            data-slot="fg-header-g3-theme-parameter"
            type="button"
            onClick={onOpenThemeParameter}
          >
            <span className="window-control-btn-text">T</span>
          </button>
        ) : null}
        {headerDebugGroupVisible ? (
          <div
            aria-label={t("ui.settings.sectionDebug")}
            className="header-group header-group-debug"
            data-slot="fg-header-g-debug"
            role="group"
          >
            <button
              aria-label={tooltipLabel}
              aria-pressed={tooltipEnabled}
              className="window-control-btn window-control-btn--theme-parameter"
              data-tooltip-label={tooltipLabel}
              data-slot="fg-header-g-debug-tooltips"
              type="button"
              onClick={() => {
                onTooltipEnabledChange(!tooltipEnabled);
              }}
            >
              <span className="window-control-btn-text">
                TT {tooltipEnabled ? "on" : "off"}
              </span>
            </button>
            <button
              aria-label={nativeChromeLabel}
              aria-pressed={electronNativeChromeEnabled}
              className="window-control-btn window-control-btn--theme-parameter"
              data-tooltip-label={nativeChromeLabel}
              data-slot="fg-header-g-debug-native-chrome"
              type="button"
              onClick={() => {
                onElectronNativeChromeEnabledChange(
                  !electronNativeChromeEnabled,
                );
              }}
            >
              <span className="window-control-btn-text">
                N {electronNativeChromeEnabled ? "on" : "off"}
              </span>
            </button>
            <button
              {...themeParameterButtonA11y}
              aria-pressed={themeParameterPanelOpen}
              className="window-control-btn window-control-btn--theme-parameter"
              data-slot="fg-header-g-debug-theme-parameter"
              type="button"
              onClick={() => {
                if (!themeParameterButtonVisible) {
                  onThemeParameterButtonVisibleChange(true);
                }
                onOpenThemeParameter();
              }}
            >
              <span className="window-control-btn-text">
                T {themeParameterPanelOpen ? "on" : "off"}
              </span>
            </button>
            <button
              {...popoverDebugPinnedButtonA11y}
              aria-pressed={popoverDebugPinned}
              className="window-control-btn window-control-btn--theme-parameter"
              data-slot="fg-header-g3-popover-debug-pin"
              type="button"
              onClick={onTogglePopoverDebugPinned}
            >
              <span className="window-control-btn-text">
                {popoverDebugPinned ? "O" : "C"}
              </span>
            </button>
          </div>
        ) : null}
        <div
          aria-label={t(a11yRegistry.headerWindowControls.labelKey)}
          className="window-controls header-group header-group-window"
          data-slot="fg-header-g3"
          role="group"
        >
            <button
              {...helpButtonA11y}
              aria-pressed={helpOpen}
              className="window-control-btn"
              data-slot="fg-header-g3-help"
            type="button"
            onClick={onOpenHelp}
          >
            <HeaderActionIcon name="help" />
          </button>
          <button
            aria-label={t(a11yRegistry.headerWindowMinimize.labelKey)}
            className="window-control-btn"
            data-slot="fg-header-g3-window-min"
            data-tooltip-label={t(a11yRegistry.headerWindowMinimize.labelKey)}
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.minimize();
            }}
          >
            <HeaderActionIcon name="windowMinimize" />
          </button>
          <button
            aria-label={windowMaxRestoreLabel}
            className="window-control-btn"
            data-slot="fg-header-g3-window-maxrestore"
            data-tooltip-label={windowMaxRestoreLabel}
            type="button"
            onClick={async () => {
              const windowApi = window.mediaPlayerWindow;
              if (!windowApi) {
                return;
              }

              if (windowFullscreen) {
                await windowApi.setFullscreen(false);
                const maximized = await windowApi
                  .isMaximized()
                  .catch(() => false);
                if (maximized) {
                  await windowApi.toggleMaximize();
                }
                return;
              }

              if (windowMaximized) {
                await windowApi.setFullscreen(true);
                return;
              }

              await windowApi.toggleMaximize();
            }}
          >
            <HeaderActionIcon name={windowMaxRestoreIconName} />
          </button>
          <button
            aria-label={t(a11yRegistry.headerWindowClose.labelKey)}
            className="window-control-btn window-control-btn--close"
            data-slot="fg-header-g3-window-close"
            data-tooltip-label={t(a11yRegistry.headerWindowClose.labelKey)}
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.close();
            }}
          >
            <HeaderActionIcon name="windowClose" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
