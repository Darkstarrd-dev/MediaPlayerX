import type { MouseEvent } from "react";

import type { ImageMainSectionProps } from "./ImageMainSection.types";

interface ImageConvertSettingsPanelProps {
  open: boolean;
  fullscreenActive: boolean;
  imageConvertPreviewMode: boolean;
  imageConvertExecuting: boolean;
  imageConvertScale: number;
  imageConvertLongestEdgePx: number | null;
  imageConvertFormat: ImageMainSectionProps["imageConvertFormat"];
  imageConvertQuality: number;
  imageConvertConcurrency: number;
  imageConvertTaskStatus:
    | "pending"
    | "running"
    | "completed"
    | "cancelled"
    | "failed"
    | null;
  imageConvertTaskProgress: number;
  imageConvertTaskMessage: string | null;
  imageConvertPreviewScale: number;
  imageConvertPreviewFormat: NonNullable<
    ImageMainSectionProps["imageConvertPreviewFormat"]
  >;
  imageConvertPreviewQuality: number;
  onCloseMask: () => void;
  onPanelMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onScaleChange: (value: number) => void;
  onLongestEdgeChange: (value: number | null) => void;
  onFormatChange: (value: "webp" | "jpeg" | "png" | "avif") => void;
  onQualityChange: (value: number) => void;
  onConcurrencyChange: (value: number) => void;
  onPreview: () => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

export function ImageConvertSettingsPanel({
  open,
  fullscreenActive,
  imageConvertPreviewMode,
  imageConvertExecuting,
  imageConvertScale,
  imageConvertLongestEdgePx,
  imageConvertFormat,
  imageConvertQuality,
  imageConvertConcurrency,
  imageConvertTaskStatus,
  imageConvertTaskProgress,
  imageConvertTaskMessage,
  imageConvertPreviewScale,
  imageConvertPreviewFormat,
  imageConvertPreviewQuality,
  onCloseMask,
  onPanelMouseDown,
  onScaleChange,
  onLongestEdgeChange,
  onFormatChange,
  onQualityChange,
  onConcurrencyChange,
  onPreview,
  onConfirm,
  onCancel,
}: ImageConvertSettingsPanelProps) {
  if (!open || fullscreenActive || imageConvertPreviewMode) {
    return null;
  }

  return (
    <div
      className="settings-floating-mask"
      data-slot="fg-main-toolbar-image-convert-ovl"
      role="dialog"
      aria-modal="true"
      aria-label="RS 转换设置"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || imageConvertExecuting) {
          return;
        }
        onCloseMask();
      }}
    >
      <section
        className="settings-floating-panel main-toolbar-image-convert-panel main-toolbar-image-convert-dialog"
        data-slot="fg-main-toolbar-image-convert-panel"
        onMouseDown={onPanelMouseDown}
      >
        <h3 className="main-toolbar-image-convert-title">RS 转换设置</h3>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>Scale {imageConvertScale.toFixed(1)}</span>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.1}
            value={imageConvertScale}
            disabled={imageConvertExecuting}
            onChange={(event) => onScaleChange(Number(event.target.value))}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>Longest Edge</span>
          <input
            type="number"
            min={1}
            max={16384}
            step={1}
            placeholder="留空=按Scale"
            value={
              imageConvertLongestEdgePx == null ? "" : imageConvertLongestEdgePx
            }
            disabled={imageConvertExecuting}
            onChange={(event) => {
              const rawValue = event.target.value.trim();
              if (rawValue.length === 0) {
                onLongestEdgeChange(null);
                return;
              }
              const parsed = Number(rawValue);
              if (!Number.isFinite(parsed)) {
                return;
              }
              onLongestEdgeChange(parsed);
            }}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>Format</span>
          <select
            value={imageConvertFormat}
            disabled={imageConvertExecuting}
            onChange={(event) =>
              onFormatChange(
                event.target.value as "webp" | "jpeg" | "png" | "avif",
              )
            }
          >
            <option value="webp">Webp</option>
            <option value="jpeg">Jpeg</option>
            <option value="png">Png</option>
            <option value="avif">Avif</option>
          </select>
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>Quality {imageConvertQuality}</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={imageConvertQuality}
            disabled={imageConvertExecuting}
            onChange={(event) => onQualityChange(Number(event.target.value))}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>Threads {imageConvertConcurrency}</span>
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={imageConvertConcurrency}
            disabled={imageConvertExecuting}
            onChange={(event) =>
              onConcurrencyChange(Number(event.target.value))
            }
          />
        </label>
        {imageConvertTaskStatus ? (
          <p className="main-toolbar-hint">
            {`RS ${imageConvertTaskStatus} ${Math.round(imageConvertTaskProgress * 100)}%${imageConvertTaskMessage ? ` | ${imageConvertTaskMessage}` : ""}`}
          </p>
        ) : null}
        <div className="mpx-overlay-actions mpx-overlay-actions-start">
          <button
            type="button"
            disabled={imageConvertExecuting}
            data-tooltip-label={
              imageConvertPreviewMode
                ? `Preview ${imageConvertPreviewScale.toFixed(1)} ${imageConvertPreviewFormat.toUpperCase()} Q${Math.round(imageConvertPreviewQuality)}`
                : "预览"
            }
            onClick={onPreview}
          >
            预览
          </button>
          <button
            type="button"
            disabled={imageConvertExecuting}
            onClick={() => void onConfirm()}
          >
            确定
          </button>
          <button type="button" onClick={() => void onCancel()}>
            取消
          </button>
        </div>
      </section>
    </div>
  );
}
