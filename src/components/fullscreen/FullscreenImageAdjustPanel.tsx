import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";

import type { ImageConvertAdjustProfile } from "../../features/app/useAppSessionState";
import {
  FullscreenCurveEditor,
  FullscreenLevelsEditor,
} from "./FullscreenImageAdjustEditors";

interface CurveHistogramBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CurvePoint {
  key: "shadow" | "midtone" | "highlight";
  x: number;
  y: number;
}

interface FullscreenImageAdjustPanelProps {
  visible: boolean;
  profile: ImageConvertAdjustProfile;
  histogramBins: number[];
  panelRef: RefObject<HTMLElement | null>;
  levelsEditorTrackRef: RefObject<HTMLDivElement | null>;
  curveSvgRef: RefObject<SVGSVGElement | null>;
  panelInlineStyle?: CSSProperties;
  panelDragging: boolean;
  levelBlackRatio: number;
  levelGammaRatio: number;
  levelWhiteRatio: number;
  curveHistogramBars: CurveHistogramBar[];
  curvePathD: string;
  curvePoints: CurvePoint[];
  onStartPanelDrag: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onUpdateProfile: (patch: Partial<ImageConvertAdjustProfile>) => void;
  onStartLevelHandleDrag: (
    handle: "black" | "gamma" | "white",
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
  onStartCurvePointDrag: (
    pointKey: CurvePoint["key"],
    event: ReactMouseEvent<SVGCircleElement>,
  ) => void;
  onReset: () => void;
  onCancel: () => void;
}

export function FullscreenImageAdjustPanel({
  visible,
  profile,
  histogramBins,
  panelRef,
  levelsEditorTrackRef,
  curveSvgRef,
  panelInlineStyle,
  panelDragging,
  levelBlackRatio,
  levelGammaRatio,
  levelWhiteRatio,
  curveHistogramBars,
  curvePathD,
  curvePoints,
  onStartPanelDrag,
  onUpdateProfile,
  onStartLevelHandleDrag,
  onStartCurvePointDrag,
  onReset,
  onCancel,
}: FullscreenImageAdjustPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="fullscreen-image-adjust-mask"
      data-slot="fs-image-controls-adjust-panel"
    >
      <section
        ref={panelRef}
        className={`fullscreen-image-adjust-panel${panelDragging ? " is-dragging" : ""}`}
        style={panelInlineStyle}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          className="fullscreen-image-adjust-drag-head"
          onMouseDown={onStartPanelDrag}
        >
          <h3>图像调节</h3>
          <span>拖拽移动</span>
        </div>
        <div className="fullscreen-image-adjust-mode-group">
          {(["basic", "levels", "curve"] as const).map((modeKey) => (
            <button
              key={modeKey}
              className={profile.mode === modeKey ? "is-active" : ""}
              type="button"
              onClick={() => {
                onUpdateProfile({ mode: modeKey });
              }}
            >
              {modeKey.toUpperCase()}
            </button>
          ))}
        </div>
        {profile.mode === "basic" ? (
          <>
            <label className="fullscreen-image-adjust-row">
              <span>Brightness {Math.round(profile.brightness)}</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={profile.brightness}
                onChange={(event) => {
                  onUpdateProfile({ brightness: Number(event.target.value) });
                }}
              />
            </label>
            <label className="fullscreen-image-adjust-row">
              <span>Contrast {Math.round(profile.contrast)}</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={profile.contrast}
                onChange={(event) => {
                  onUpdateProfile({ contrast: Number(event.target.value) });
                }}
              />
            </label>
          </>
        ) : null}
        {profile.mode === "levels" ? (
          <FullscreenLevelsEditor
            profile={profile}
            histogramBins={histogramBins}
            levelBlackRatio={levelBlackRatio}
            levelGammaRatio={levelGammaRatio}
            levelWhiteRatio={levelWhiteRatio}
            levelsEditorTrackRef={levelsEditorTrackRef}
            onStartLevelHandleDrag={onStartLevelHandleDrag}
          />
        ) : null}
        {profile.mode === "curve" ? (
          <FullscreenCurveEditor
            profile={profile}
            curveSvgRef={curveSvgRef}
            curveHistogramBars={curveHistogramBars}
            curvePathD={curvePathD}
            curvePoints={curvePoints}
            onStartCurvePointDrag={onStartCurvePointDrag}
          />
        ) : null}
        <div className="fullscreen-image-adjust-actions">
          <button type="button" onClick={onReset}>
            Reset
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
