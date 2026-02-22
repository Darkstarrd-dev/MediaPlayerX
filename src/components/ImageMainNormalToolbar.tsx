import { MainUiIcon } from "./MainUiIcon";
import { ToolbarTitleMarquee } from "./ToolbarTitleMarquee";
import { VideoControlIcon } from "./VideoControlIcon";
import { ImageMainScaleControl } from "./ImageMainScaleControl";
import type { useI18n } from "../i18n/useI18n";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface ImageMainNormalToolbarProps {
  t: TranslateFn;
  browseToolbarTitle: string;
  showNamesOnly: boolean;
  openScalePopover: boolean;
  canThumbnailScaleDown: boolean;
  canThumbnailScaleUp: boolean;
  thumbnailScaleLevelCount: number;
  scaleDraftValue: number;
  focusedImageExists: boolean;
  canJumpToMusicFromBooklet: boolean;
  canJumpToAnimation: boolean;
  canJumpToMusic: boolean;
  onToggleShowNamesOnly: () => void;
  onEnterFullscreen: () => void;
  onJumpToMusicFromBooklet: () => void;
  onJumpToAnimation: () => void;
  onJumpToMusic: () => void;
  onOpenScalePopoverByHover: () => void;
  onCloseScalePopoverByHover: () => void;
  onScaleDraftChange: (value: number) => void;
  onScaleChange: (level: number) => void;
}

export function ImageMainNormalToolbar({
  t,
  browseToolbarTitle,
  showNamesOnly,
  openScalePopover,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
  thumbnailScaleLevelCount,
  scaleDraftValue,
  focusedImageExists,
  canJumpToMusicFromBooklet,
  canJumpToAnimation,
  canJumpToMusic,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  onJumpToMusicFromBooklet,
  onJumpToAnimation,
  onJumpToMusic,
  onOpenScalePopoverByHover,
  onCloseScalePopoverByHover,
  onScaleDraftChange,
  onScaleChange,
}: ImageMainNormalToolbarProps) {
  return (
    <>
      <span hidden data-slot="fg-main-toolbar-state-normal" />
      <ToolbarTitleMarquee text={browseToolbarTitle} />
      <div className="toolbar-actions toolbar-actions-image-mode">
        <div className="toolbar-actions toolbar-actions-image-primary">
          <button
            className={`toolbar-icon-btn ${showNamesOnly ? "is-names-mode" : "is-grid-mode"}`}
            type="button"
            aria-label={
              showNamesOnly
                ? t("a11y.image.switchToGridMode")
                : t("a11y.image.switchToNamesMode")
            }
            title={
              showNamesOnly
                ? t("tip.image.switchToGridMode")
                : t("tip.image.switchToNamesMode")
            }
            onClick={onToggleShowNamesOnly}
          >
            <MainUiIcon name={showNamesOnly ? "thumbnail" : "fileList"} />
          </button>
          <ImageMainScaleControl
            t={t}
            openScalePopover={openScalePopover}
            canThumbnailScaleDown={canThumbnailScaleDown}
            canThumbnailScaleUp={canThumbnailScaleUp}
            thumbnailScaleLevelCount={thumbnailScaleLevelCount}
            scaleDraftValue={scaleDraftValue}
            onOpenByHover={onOpenScalePopoverByHover}
            onCloseByHover={onCloseScalePopoverByHover}
            onScaleDraftChange={onScaleDraftChange}
            onScaleChange={onScaleChange}
          />
          <button
            className="toolbar-icon-btn"
            type="button"
            aria-label={t("a11y.media.enterFullscreen")}
            title={t("tip.media.enterFullscreen")}
            onClick={onEnterFullscreen}
            disabled={!focusedImageExists}
          >
            <VideoControlIcon
              className="main-ui-icon"
              name="fullscreenExpand"
            />
          </button>
          {canJumpToMusicFromBooklet ? (
            <button
              className="toolbar-icon-btn"
              type="button"
              aria-label={t("a11y.media.music")}
              title={t("tip.media.music")}
              onClick={onJumpToMusicFromBooklet}
            >
              <MainUiIcon name="musicMode" />
            </button>
          ) : null}
        </div>
        {canJumpToAnimation ||
        (canJumpToMusic && !canJumpToMusicFromBooklet) ? (
          <div className="toolbar-actions toolbar-actions-series-jump">
            {canJumpToAnimation ? (
              <button
                className="toolbar-icon-btn"
                type="button"
                aria-label={t("a11y.media.animation")}
                title={t("tip.media.animation")}
                onClick={onJumpToAnimation}
              >
                <MainUiIcon name="videoMode" />
              </button>
            ) : null}
            {canJumpToMusic && !canJumpToMusicFromBooklet ? (
              <button
                className="toolbar-icon-btn"
                type="button"
                aria-label={t("a11y.media.music")}
                title={t("tip.media.music")}
                onClick={onJumpToMusic}
              >
                <MainUiIcon name="musicMode" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
