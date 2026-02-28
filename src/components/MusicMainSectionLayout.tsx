import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import type { TranslateFn } from "../i18n/context";
import { MainUiIcon } from "./MainUiIcon";
import { ToolbarTitleMarquee } from "./ToolbarTitleMarquee";

interface MusicMainSectionLayoutProps {
  active: boolean;
  t: TranslateFn;
  manageMode: boolean;
  metadataManageMode: boolean;
  metadataManageSelectionMode: "single" | "multiple";
  metadataSelectionToggleLabel: string;
  sidebarSelectedCount: number;
  imageSelectedCount: number;
  activeSelectionScope: "sidebar" | "image" | null;
  pendingManageAction: boolean;
  manageOperationHint: string | null;
  canManageDelete: boolean;
  canManageMoveNodes: boolean;
  canManageAudioTranscode: boolean;
  audioTranscodePanelOpen: boolean;
  canJumpToManga: boolean;
  canJumpToAnimation: boolean;
  canJumpToCover: boolean;
  canJumpToBooklet: boolean;
  onManageDelete: () => void;
  onManageGroup: () => void;
  onToggleAudioTranscodePanel: () => void;
  onToggleMetadataManageSelectionMode: () => void;
  onJumpToManga: () => void;
  onJumpToAnimation: () => void;
  onJumpToCover: () => void;
  onJumpToBooklet: () => void;
  musicToolbarTitle: string;
  fullscreenActive: boolean;
  visualizerPane: ReactNode;
  musicControlsShell: ReactNode;
  audioTranscodePanel: ReactNode;
}

function resolveManageSummary(
  t: TranslateFn,
  activeSelectionScope: "sidebar" | "image" | null,
  sidebarSelectedCount: number,
  imageSelectedCount: number,
): string {
  if (activeSelectionScope === "sidebar") {
    return t("a11y.manage.selectedSidebarNodes", { count: sidebarSelectedCount });
  }
  if (activeSelectionScope === "image") {
    return t("a11y.manage.selectedMediaItems", { count: imageSelectedCount });
  }
  return t("a11y.manage.noSelection");
}

export function MusicMainSectionLayout({
  active,
  t,
  manageMode,
  metadataManageMode,
  metadataManageSelectionMode,
  metadataSelectionToggleLabel,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageMoveNodes,
  canManageAudioTranscode,
  audioTranscodePanelOpen,
  canJumpToManga,
  canJumpToAnimation,
  canJumpToCover,
  canJumpToBooklet,
  onManageDelete,
  onManageGroup,
  onToggleAudioTranscodePanel,
  onToggleMetadataManageSelectionMode,
  onJumpToManga,
  onJumpToAnimation,
  onJumpToCover,
  onJumpToBooklet,
  musicToolbarTitle,
  fullscreenActive,
  visualizerPane,
  musicControlsShell,
  audioTranscodePanel,
}: MusicMainSectionLayoutProps) {
  if (!active) {
    return null;
  }

  const manageSummary = resolveManageSummary(
    t,
    activeSelectionScope,
    sidebarSelectedCount,
    imageSelectedCount,
  );

  return (
    <>
      <div className="main-toolbar" data-slot="fg-main-toolbar">
        {manageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-manage" />
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.organize")}
                data-tooltip-label={t("tip.common.organize")}
                disabled={!canManageMoveNodes || pendingManageAction}
                onClick={onManageGroup}
              >
                <MainUiIcon name="organize" />
              </button>
              <button
                className={`feature-action-btn main-icon-square-btn ${audioTranscodePanelOpen ? "is-active" : ""}`}
                type="button"
                aria-label="TC"
                data-tooltip-label="TC"
                disabled={!canManageAudioTranscode || pendingManageAction}
                onClick={onToggleAudioTranscodePanel}
              >
                <span aria-hidden="true">TC</span>
              </button>
              <button
                className="vector-search-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.delete")}
                data-tooltip-label={t("tip.common.delete")}
                disabled={!canManageDelete || pendingManageAction}
                onClick={onManageDelete}
              >
                <MainUiIcon name="delete" />
              </button>
              {manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
              {audioTranscodePanel}
            </div>
            <strong className="main-toolbar-summary" data-tooltip-label={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-metadata" />
            <strong className="main-toolbar-title">{t("ui.header.metadataManage")}</strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={metadataSelectionToggleLabel}
                data-tooltip-label={metadataSelectionToggleLabel}
                onClick={onToggleMetadataManageSelectionMode}
              >
                {metadataManageSelectionMode === "single" ? "S" : "M"}
              </button>
              {manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <span hidden data-slot="fg-main-toolbar-state-normal" />
            <ToolbarTitleMarquee text={musicToolbarTitle} />
            {canJumpToManga || canJumpToAnimation || canJumpToCover || canJumpToBooklet ? (
              <div className="toolbar-actions">
                {canJumpToCover ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("ui.metadata.openCover")}
                    data-tooltip-label={t("ui.metadata.openCover")}
                    onClick={onJumpToCover}
                  >
                    <MainUiIcon name="cover" />
                  </button>
                ) : null}
                {canJumpToBooklet ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.booklet")}
                    data-tooltip-label={t("tip.media.booklet")}
                    onClick={onJumpToBooklet}
                  >
                    <MainUiIcon name="booklet" />
                  </button>
                ) : null}
                {canJumpToManga ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.manga")}
                    data-tooltip-label={t("tip.media.manga")}
                    onClick={onJumpToManga}
                  >
                    <MainUiIcon name="imageMode" />
                  </button>
                ) : null}
                {canJumpToAnimation ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.animation")}
                    data-tooltip-label={t("tip.media.animation")}
                    onClick={onJumpToAnimation}
                  >
                    <MainUiIcon name="videoMode" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {fullscreenActive && typeof document !== "undefined"
        ? createPortal(
            <div className="music-fullscreen-layer" data-overlay-close="fullscreen">
              {visualizerPane}
            </div>,
            document.body,
          )
        : visualizerPane}

      {!fullscreenActive ? musicControlsShell : null}
    </>
  );
}
