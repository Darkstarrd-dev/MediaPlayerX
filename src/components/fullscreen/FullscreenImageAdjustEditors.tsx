import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

import type { ImageConvertAdjustProfile } from "../../features/app/useAppSessionState";
import {
  IMAGE_ADJUST_CURVE_CANVAS_HEIGHT,
  IMAGE_ADJUST_CURVE_CANVAS_WIDTH,
  IMAGE_ADJUST_CURVE_PADDING,
} from "./fullscreenImageAdjustUtils";

interface FullscreenLevelsEditorProps {
  profile: ImageConvertAdjustProfile;
  histogramBins: number[];
  levelBlackRatio: number;
  levelGammaRatio: number;
  levelWhiteRatio: number;
  levelsEditorTrackRef: RefObject<HTMLDivElement | null>;
  onStartLevelHandleDrag: (
    handle: "black" | "gamma" | "white",
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
}

export function FullscreenLevelsEditor({
  profile,
  histogramBins,
  levelBlackRatio,
  levelGammaRatio,
  levelWhiteRatio,
  levelsEditorTrackRef,
  onStartLevelHandleDrag,
}: FullscreenLevelsEditorProps) {
  return (
    <section className="fullscreen-image-adjust-editor-block">
      <header className="fullscreen-image-adjust-editor-head">
        <strong>Levels</strong>
        <span>
          B {Math.round(profile.level_input_black)}
          {" | "}G {profile.level_gamma.toFixed(2)}
          {" | "}W {Math.round(profile.level_input_white)}
        </span>
      </header>
      <div
        className="fullscreen-image-adjust-levels-editor"
        ref={levelsEditorTrackRef}
      >
        <div
          className="fullscreen-image-adjust-levels-histogram"
          aria-hidden="true"
        >
          {histogramBins.map((value, index) => (
            <span
              key={`level-hist-${index}`}
              className="fullscreen-image-adjust-levels-histogram-bar"
              style={{ height: `${Math.max(2, Math.round(value * 100))}%` }}
            />
          ))}
        </div>
        <div
          className="fullscreen-image-adjust-levels-track"
          aria-label="Levels editor"
        >
          <button
            aria-label="Input Black"
            className="fullscreen-image-adjust-levels-handle is-black"
            style={{ left: `${(levelBlackRatio * 100).toFixed(2)}%` }}
            type="button"
            onMouseDown={(event) => {
              onStartLevelHandleDrag("black", event);
            }}
          />
          <button
            aria-label="Gamma"
            className="fullscreen-image-adjust-levels-handle is-gamma"
            style={{ left: `${(levelGammaRatio * 100).toFixed(2)}%` }}
            type="button"
            onMouseDown={(event) => {
              onStartLevelHandleDrag("gamma", event);
            }}
          />
          <button
            aria-label="Input White"
            className="fullscreen-image-adjust-levels-handle is-white"
            style={{ left: `${(levelWhiteRatio * 100).toFixed(2)}%` }}
            type="button"
            onMouseDown={(event) => {
              onStartLevelHandleDrag("white", event);
            }}
          />
        </div>
      </div>
    </section>
  );
}

interface CurvePoint {
  key: "shadow" | "midtone" | "highlight";
  x: number;
  y: number;
}

interface CurveHistogramBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FullscreenCurveEditorProps {
  profile: ImageConvertAdjustProfile;
  curveSvgRef: RefObject<SVGSVGElement | null>;
  curveHistogramBars: CurveHistogramBar[];
  curvePathD: string;
  curvePoints: CurvePoint[];
  onStartCurvePointDrag: (
    pointKey: CurvePoint["key"],
    event: ReactMouseEvent<SVGCircleElement>,
  ) => void;
}

export function FullscreenCurveEditor({
  profile,
  curveSvgRef,
  curveHistogramBars,
  curvePathD,
  curvePoints,
  onStartCurvePointDrag,
}: FullscreenCurveEditorProps) {
  return (
    <section className="fullscreen-image-adjust-editor-block">
      <header className="fullscreen-image-adjust-editor-head">
        <strong>Curve (Master)</strong>
        <span>
          S {Math.round(profile.curve_shadow)}
          {" | "}M {Math.round(profile.curve_midtone)}
          {" | "}H {Math.round(profile.curve_highlight)}
        </span>
      </header>
      <svg
        ref={curveSvgRef}
        className="fullscreen-image-adjust-curve-svg"
        viewBox={`0 0 ${IMAGE_ADJUST_CURVE_CANVAS_WIDTH} ${IMAGE_ADJUST_CURVE_CANVAS_HEIGHT}`}
        role="img"
        aria-label="Curve editor"
      >
        <defs>
          <pattern
            id="fullscreen-image-adjust-curve-grid"
            width="54"
            height="54"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 54 0 L 0 0 0 54"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x={IMAGE_ADJUST_CURVE_PADDING}
          y={IMAGE_ADJUST_CURVE_PADDING}
          width={
            IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2
          }
          height={
            IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2
          }
          fill="url(#fullscreen-image-adjust-curve-grid)"
          stroke="currentColor"
          strokeOpacity="0.3"
        />
        <g
          className="fullscreen-image-adjust-curve-histogram"
          aria-hidden="true"
        >
          {curveHistogramBars.map((bar, index) => (
            <rect
              key={`curve-hist-${index}`}
              className="fullscreen-image-adjust-curve-histogram-bar"
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
            />
          ))}
        </g>
        <line
          x1={IMAGE_ADJUST_CURVE_PADDING}
          y1={IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING}
          x2={IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING}
          y2={IMAGE_ADJUST_CURVE_PADDING}
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="4 3"
        />
        <path
          d={curvePathD}
          fill="none"
          stroke="var(--mpx-accent-500, #58a6ff)"
          strokeWidth="2"
        />
        {curvePoints.map((point) => (
          <g key={`curve-point-${point.key}`}>
            <circle
              cx={point.x + IMAGE_ADJUST_CURVE_PADDING}
              cy={point.y + IMAGE_ADJUST_CURVE_PADDING}
              r={8}
              className="fullscreen-image-adjust-curve-point-hit"
              onMouseDown={(event) => {
                onStartCurvePointDrag(point.key, event);
              }}
            />
            <circle
              cx={point.x + IMAGE_ADJUST_CURVE_PADDING}
              cy={point.y + IMAGE_ADJUST_CURVE_PADDING}
              r={4}
              className="fullscreen-image-adjust-curve-point"
              onMouseDown={(event) => {
                onStartCurvePointDrag(point.key, event);
              }}
            />
          </g>
        ))}
      </svg>
    </section>
  );
}
