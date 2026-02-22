import { buildA11yPropsByRegistry } from "../i18n/a11y";
import type { useI18n } from "../i18n/useI18n";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface ImageMainScaleControlProps {
  t: TranslateFn;
  openScalePopover: boolean;
  canThumbnailScaleDown: boolean;
  canThumbnailScaleUp: boolean;
  thumbnailScaleLevelCount: number;
  scaleDraftValue: number;
  onOpenByHover: () => void;
  onCloseByHover: () => void;
  onScaleDraftChange: (value: number) => void;
  onScaleChange: (level: number) => void;
}

export function ImageMainScaleControl({
  t,
  openScalePopover,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
  thumbnailScaleLevelCount,
  scaleDraftValue,
  onOpenByHover,
  onCloseByHover,
  onScaleDraftChange,
  onScaleChange,
}: ImageMainScaleControlProps) {
  return (
    <div
      className={`header-popover-control main-toolbar-scale-control ${openScalePopover ? "is-open" : ""}`}
      data-slot="fg-main-toolbar-image-scale-pop"
      role="group"
      aria-label={t("a11y.header.thumbnailScaleGroup")}
      onMouseEnter={onOpenByHover}
      onMouseLeave={onCloseByHover}
    >
      <button
        {...buildA11yPropsByRegistry({
          key: "headerThumbnailScale",
          t,
        })}
        className="toolbar-icon-btn header-popover-trigger"
        disabled={!canThumbnailScaleDown && !canThumbnailScaleUp}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="main-ui-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>

      <div
        className="header-popover-panel"
        hidden={!openScalePopover}
        role="dialog"
        aria-label={t("a11y.header.scaleSettings")}
      >
        <div
          className="header-vertical-slider"
          role="group"
          aria-label={t("a11y.header.scaleLevels")}
        >
          <div className="header-vertical-slider-value">
            {Math.max(
              1,
              Math.min(thumbnailScaleLevelCount, Math.round(scaleDraftValue)),
            )}
          </div>
          <div className="header-vertical-slider-body">
            <input
              {...buildA11yPropsByRegistry({
                key: "headerScaleSlider",
                t,
              })}
              className="header-vertical-range"
              max={thumbnailScaleLevelCount}
              min={1}
              step={0.01}
              type="range"
              value={scaleDraftValue}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                onScaleDraftChange(nextValue);
                const roundedLevel = Math.max(
                  1,
                  Math.min(thumbnailScaleLevelCount, Math.round(nextValue)),
                );
                onScaleChange(roundedLevel);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
