import type { MouseEvent as ReactMouseEvent } from "react";

import type { ImageConvertAdjustProfile } from "../../features/app/useAppSessionState";
import { clamp } from "../../utils/ui";
import {
  IMAGE_ADJUST_CURVE_CANVAS_HEIGHT,
  IMAGE_ADJUST_CURVE_CANVAS_WIDTH,
  IMAGE_ADJUST_CURVE_PADDING,
  IMAGE_ADJUST_PANEL_DRAG_MARGIN,
  clampByte,
} from "./fullscreenImageAdjustUtils";

export function resolveAdjustResetPatch(
  mode: ImageConvertAdjustProfile["mode"],
): Partial<ImageConvertAdjustProfile> {
  if (mode === "basic") {
    return {
      brightness: 0,
      contrast: 0,
    };
  }
  if (mode === "levels") {
    return {
      level_input_black: 0,
      level_input_white: 255,
      level_gamma: 1,
    };
  }
  return {
    curve_shadow_x: 64,
    curve_midtone_x: 128,
    curve_highlight_x: 192,
    curve_shadow: 0,
    curve_midtone: 0,
    curve_highlight: 0,
  };
}

export function startLevelHandleDrag(options: {
  handle: "black" | "gamma" | "white";
  event: ReactMouseEvent<HTMLButtonElement>;
  trackElement: HTMLDivElement | null;
  profile: ImageConvertAdjustProfile;
  onUpdateProfile: (patch: Partial<ImageConvertAdjustProfile>) => void;
}): void {
  const { handle, event, trackElement, profile, onUpdateProfile } = options;
  if (event.button !== 0 || !trackElement) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const onMouseMove = (moveEvent: MouseEvent) => {
    const rect = trackElement.getBoundingClientRect();
    if (rect.width <= 1) {
      return;
    }
    const rawRatio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
    const currentBlack = profile.level_input_black;
    const currentWhite = profile.level_input_white;
    if (handle === "black") {
      const nextBlack = Math.min(currentWhite - 1, Math.round(rawRatio * 255));
      onUpdateProfile({ level_input_black: nextBlack });
      return;
    }
    if (handle === "white") {
      const nextWhite = Math.max(currentBlack + 1, Math.round(rawRatio * 255));
      onUpdateProfile({ level_input_white: nextWhite });
      return;
    }
    const span = Math.max(1, currentWhite - currentBlack);
    const normalized = clamp((rawRatio * 255 - currentBlack) / span, 0.001, 0.999);
    const nextGamma = clamp(Math.log(normalized) / Math.log(0.5), 0.1, 5);
    onUpdateProfile({ level_gamma: Number(nextGamma.toFixed(3)) });
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

export function startAdjustPanelDrag(options: {
  event: ReactMouseEvent<HTMLDivElement>;
  panelElement: HTMLDivElement | null;
  viewport: { width: number; height: number };
  onDraggingChange: (dragging: boolean) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}): void {
  const {
    event,
    panelElement,
    viewport,
    onDraggingChange,
    onPositionChange,
  } = options;
  if (event.button !== 0 || !panelElement) {
    return;
  }

  const panelRect = panelElement.getBoundingClientRect();
  const dragOffsetX = event.clientX - panelRect.left;
  const dragOffsetY = event.clientY - panelRect.top;
  const panelWidth = panelElement.offsetWidth;
  const panelHeight = panelElement.offsetHeight;
  event.preventDefault();
  event.stopPropagation();
  onDraggingChange(true);

  const onMouseMove = (moveEvent: MouseEvent) => {
    const nextX = clamp(
      moveEvent.clientX - dragOffsetX,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        viewport.width - panelWidth - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    );
    const nextY = clamp(
      moveEvent.clientY - dragOffsetY,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        viewport.height - panelHeight - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    );
    onPositionChange({ x: nextX, y: nextY });
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    onDraggingChange(false);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

export function startCurvePointDrag(options: {
  pointKey: "shadow" | "midtone" | "highlight";
  event: ReactMouseEvent<SVGCircleElement>;
  svgElement: SVGSVGElement | null;
  profile: ImageConvertAdjustProfile;
  onUpdateProfile: (patch: Partial<ImageConvertAdjustProfile>) => void;
}): void {
  const { pointKey, event, svgElement, profile, onUpdateProfile } = options;
  if (event.button !== 0 || !svgElement) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const onMouseMove = (moveEvent: MouseEvent) => {
    const rect = svgElement.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      return;
    }
    const innerWidth = IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2;
    const innerHeight = IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2;
    const normalizedX = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((moveEvent.clientY - rect.top) / rect.height, 0, 1);
    const localX = clamp(
      normalizedX * IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING,
      0,
      innerWidth,
    );
    const localY = clamp(
      normalizedY * IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING,
      0,
      innerHeight,
    );
    const currentShadowX = profile.curve_shadow_x;
    const currentMidtoneX = profile.curve_midtone_x;
    const currentHighlightX = profile.curve_highlight_x;

    let nextX = Math.round((localX / innerWidth) * 255);
    if (pointKey === "shadow") {
      nextX = clamp(nextX, 1, currentMidtoneX - 1);
    } else if (pointKey === "midtone") {
      nextX = clamp(nextX, currentShadowX + 1, currentHighlightX - 1);
    } else {
      nextX = clamp(nextX, currentMidtoneX + 1, 254);
    }

    const nextAnchorY = clampByte(Math.round((1 - localY / innerHeight) * 255));
    const nextValue = clamp((nextX - nextAnchorY) / 0.52, -100, 100);

    if (pointKey === "shadow") {
      onUpdateProfile({
        curve_shadow_x: nextX,
        curve_shadow: Number(nextValue.toFixed(1)),
      });
    } else if (pointKey === "midtone") {
      onUpdateProfile({
        curve_midtone_x: nextX,
        curve_midtone: Number(nextValue.toFixed(1)),
      });
    } else {
      onUpdateProfile({
        curve_highlight_x: nextX,
        curve_highlight: Number(nextValue.toFixed(1)),
      });
    }
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}
