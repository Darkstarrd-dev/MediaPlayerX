import { buildA11yPropsByRegistry } from "../i18n/a11y";
import { useRef } from "react";
import type { useI18n } from "../i18n/useI18n";
import { SkeuoRunway } from "./primitives/SkeuoRunway";

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
  const lastEmittedScaleRef = useRef<number | null>(null);
  const roundedScaleLevel = Math.max(
    1,
    Math.min(thumbnailScaleLevelCount, Math.round(scaleDraftValue)),
  );
  const displayScaleLevel = roundedScaleLevel;
  const scaleRangePercent =
    thumbnailScaleLevelCount <= 1
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            ((scaleDraftValue - 1) / (thumbnailScaleLevelCount - 1)) * 100,
          ),
        );

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
          <div className="header-vertical-slider-value">{displayScaleLevel}</div>
          <div className="header-vertical-slider-body">
            <div className="mpx-runway-axis is-vertical">
              <SkeuoRunway
                ariaLabel={t("a11y.header.scaleSlider")}
                orientation="vertical"
                preset="control"
                inputClassName="video-ctrl-volume-range"
                max={thumbnailScaleLevelCount}
                min={1}
                rangePercent={scaleRangePercent}
                step={0.01}
                value={scaleDraftValue}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  onScaleDraftChange(nextValue);
                  const roundedLevel = Math.max(
                    1,
                    Math.min(thumbnailScaleLevelCount, Math.round(nextValue)),
                  );
                  if (lastEmittedScaleRef.current !== roundedLevel) {
                    lastEmittedScaleRef.current = roundedLevel;
                    onScaleChange(roundedLevel);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
