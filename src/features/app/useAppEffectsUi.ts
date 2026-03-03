import { useEffect, type MutableRefObject, type RefObject } from "react";

import type { AppSettings } from "../../contracts/settings";
import type { BrowserMode } from "../../types";
import { clamp } from "../../utils/ui";
import {
  resolveFullscreenImageAutoplayEnabled,
  type FullscreenImageNavigationSource,
} from "../../utils/fullscreenAutoplay";
import {
  resolvePaletteIdForStyle,
  resolvePalettePairForStyle,
  resolveStyleId,
} from "../theme/themeRegistry";
import {
  resolveRuntimeSpacing,
  resolveRuntimeViewportWidth,
} from "../layout/runtimeSpacing";

const TOP_PANEL_MIN_HEIGHT = 80;
const TOP_PANEL_MAX_HEIGHT = 360;

interface UseAppFullscreenEffectsParams {
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  mode: BrowserMode;
  wasFullscreenRef: MutableRefObject<boolean>;
  setFullscreenEntryDisplay: (value: "image-only" | "video-only") => void;
  setFullscreenDisplay: (value: "dual" | "video-only" | "image-only") => void;
  setFullscreenVideoFocus: (value: boolean) => void;
  setFullscreenSwapped: (value: boolean) => void;
  setShowFullscreenFooter: (value: boolean) => void;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  moveImage: (delta: number, source?: FullscreenImageNavigationSource) => void;
}

export function useAppFullscreenEffects({
  fullscreenActive,
  fullscreenDisplay,
  mode,
  wasFullscreenRef,
  setFullscreenEntryDisplay,
  setFullscreenDisplay,
  setFullscreenVideoFocus,
  setFullscreenSwapped,
  setShowFullscreenFooter,
  autoPlayEnabled,
  autoPlayInterval,
  moveImage,
}: UseAppFullscreenEffectsParams): void {
  useEffect(() => {
    const enteringFullscreen = fullscreenActive && !wasFullscreenRef.current;
    if (enteringFullscreen) {
      const entryDisplay = mode === "video" ? "video-only" : "image-only";
      setFullscreenEntryDisplay(entryDisplay);
      setFullscreenDisplay(entryDisplay);
      setFullscreenVideoFocus(mode === "video");
      setFullscreenSwapped(false);
      setShowFullscreenFooter(false);
    }
    wasFullscreenRef.current = fullscreenActive;
  }, [
    fullscreenActive,
    mode,
    setFullscreenDisplay,
    setFullscreenEntryDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setShowFullscreenFooter,
    wasFullscreenRef,
  ]);

  useEffect(() => {
    const canAutoplayImages = resolveFullscreenImageAutoplayEnabled({
      fullscreenActive,
      fullscreenDisplay,
    });
    if (!canAutoplayImages || !autoPlayEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      moveImage(1, "autoplay");
    }, autoPlayInterval * 1000);

    return () => window.clearInterval(timer);
  }, [
    autoPlayEnabled,
    autoPlayInterval,
    fullscreenActive,
    fullscreenDisplay,
    moveImage,
  ]);
}

interface UseAppThemeAndLayoutEffectsParams {
  manageMode: boolean;
  metadataManageMode: boolean;
  vectorMode: boolean;
  searchPanelCollapsed: boolean;
  searchPanelMode: "vector" | "feature";
  featureTagPickerOpen: boolean;
  vectorPanelContentRef: RefObject<HTMLDivElement | null>;
  workspaceBottomPanelHeight: number;
  updateSettings: (patch: Partial<AppSettings>) => void;
  styleId: string;
  paletteId: string;
  paletteMode: "day" | "night";
  paletteDayId: string;
  paletteNightId: string;
  themeId: string;
  settingsBackdropOpacity: number;
  layoutGapScaleCoeff: number;
  paneInnerGapScaleCoeff: number;
  paneStackGapScaleCoeff: number;
  sidebarInnerGapScaleCoeff: number;
  thumbnailGapScaleCoeff: number;
  buttonGroupInsetScaleCoeff: number;
  paneToolbarHeightScaleCoeff: number;
  paneFooterHeightScaleCoeff: number;
  radiusCascadeScaleCoeff: number;
  radiusValueScaleCoeff: number;
}

export function useAppThemeAndLayoutEffects({
  manageMode,
  metadataManageMode,
  vectorMode,
  searchPanelCollapsed,
  searchPanelMode,
  featureTagPickerOpen,
  vectorPanelContentRef,
  workspaceBottomPanelHeight,
  updateSettings,
  styleId,
  paletteId,
  paletteMode,
  paletteDayId,
  paletteNightId,
  themeId,
  settingsBackdropOpacity,
  layoutGapScaleCoeff,
  paneInnerGapScaleCoeff,
  paneStackGapScaleCoeff,
  sidebarInnerGapScaleCoeff,
  thumbnailGapScaleCoeff,
  buttonGroupInsetScaleCoeff,
  paneToolbarHeightScaleCoeff,
  paneFooterHeightScaleCoeff,
  radiusCascadeScaleCoeff,
  radiusValueScaleCoeff,
}: UseAppThemeAndLayoutEffectsParams): void {
  const activeTopPanelKind = manageMode
    ? "manage"
    : metadataManageMode
      ? "metadata"
      : vectorMode
        ? "search"
        : "none";

  useEffect(() => {
    if (searchPanelCollapsed || activeTopPanelKind === "none") {
      return;
    }

    const content = vectorPanelContentRef.current;
    if (!content) {
      return;
    }

    const measurePanelHeight = () => {
      const panel = content.parentElement;
      const styles = panel ? window.getComputedStyle(panel) : null;
      const readPx = (value: string | undefined) => {
        const parsed = Number.parseFloat(value ?? "");
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const chromeHeight = styles
        ? readPx(styles.paddingTop) +
          readPx(styles.paddingBottom) +
          readPx(styles.borderTopWidth) +
          readPx(styles.borderBottomWidth)
        : 20;
      const measured = clamp(
        Math.ceil(content.scrollHeight + chromeHeight + 1),
        TOP_PANEL_MIN_HEIGHT,
        TOP_PANEL_MAX_HEIGHT,
      );
      if (Math.abs(measured - workspaceBottomPanelHeight) < 1) {
        return;
      }
      updateSettings({ workspaceBottomPanelHeight: measured });
    };

    const rafId = window.requestAnimationFrame(measurePanelHeight);
    const observer = new ResizeObserver(() => {
      measurePanelHeight();
    });
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    activeTopPanelKind,
    featureTagPickerOpen,
    searchPanelCollapsed,
    searchPanelMode,
    updateSettings,
    vectorPanelContentRef,
    workspaceBottomPanelHeight,
  ]);

  useEffect(() => {
    const nextStyleId = resolveStyleId(styleId);
    const nextPalettePair = resolvePalettePairForStyle(
      nextStyleId,
      paletteDayId,
      paletteNightId,
    );
    const targetPaletteId =
      paletteMode === "night" ? nextPalettePair.night : nextPalettePair.day;
    const nextPaletteId = resolvePaletteIdForStyle(
      targetPaletteId,
      nextStyleId,
    );
    const nextThemeId = nextPaletteId;

    if (
      nextStyleId !== styleId ||
      nextPaletteId !== paletteId ||
      nextThemeId !== themeId ||
      nextPalettePair.day !== paletteDayId ||
      nextPalettePair.night !== paletteNightId
    ) {
      updateSettings({
        styleId: nextStyleId,
        paletteId: nextPaletteId,
        paletteDayId: nextPalettePair.day,
        paletteNightId: nextPalettePair.night,
        themeId: nextThemeId,
      });
    }

    document.documentElement.dataset.mpxStyle = nextStyleId;
    document.documentElement.dataset.mpxPalette = nextPaletteId;
    document.documentElement.dataset.mpxTheme = nextThemeId;
    document.documentElement.dataset.mpxPaletteMode = paletteMode;
  }, [
    paletteDayId,
    paletteId,
    paletteMode,
    paletteNightId,
    styleId,
    themeId,
    updateSettings,
  ]);

  useEffect(() => {
    const normalizedOpacity = Math.max(
      0,
      Math.min(100, settingsBackdropOpacity),
    );
    document.documentElement.style.setProperty(
      "--mpx-settings-backdrop-opacity",
      `${normalizedOpacity.toFixed(0)}%`,
    );
  }, [settingsBackdropOpacity]);

  useEffect(() => {
    const applyLayoutGapVars = () => {
      const runtimeSpacing = resolveRuntimeSpacing({
        viewportWidth: resolveRuntimeViewportWidth(),
        layoutGapScaleCoeff,
        paneInnerGapScaleCoeff,
        paneStackGapScaleCoeff,
        sidebarInnerGapScaleCoeff,
        thumbnailGapScaleCoeff,
        buttonGroupInsetScaleCoeff,
        paneToolbarHeightScaleCoeff,
        paneFooterHeightScaleCoeff,
      });
      const normalizedRadiusCascadeScale = Math.max(
        0,
        Math.min(2, radiusCascadeScaleCoeff),
      );
      const normalizedRadiusValueScale = Math.max(
        0,
        Math.min(2, radiusValueScaleCoeff),
      );
      const resolvedIconButtonSizePx = Math.max(
        34,
        Math.round(34 + runtimeSpacing.paneInnerGapScaleCoeff * 3),
      );
      const resolvedHeaderButtonSizePx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(34 + runtimeSpacing.paneInnerGapScaleCoeff * 4),
      );
      const resolvedPanelHeadHeightPx = Math.max(
        resolvedHeaderButtonSizePx,
        Math.round(
          resolvedHeaderButtonSizePx *
            runtimeSpacing.paneToolbarHeightScaleCoeff,
        ),
      );
      const basePanelFooterMinHeightPx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(
          resolvedHeaderButtonSizePx + runtimeSpacing.paneRecessedPaddingPx * 2,
        ),
      );
      const resolvedPanelFooterMinHeightPx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(
          basePanelFooterMinHeightPx *
            runtimeSpacing.paneFooterHeightScaleCoeff,
        ),
      );
      const resolvedControlPaddingXPx = Math.max(
        0,
        Math.round(runtimeSpacing.paneInnerGapScaleCoeff * 4),
      );

      document.documentElement.style.setProperty(
        "--mpx-layout-gap-scale",
        runtimeSpacing.layoutGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-inner-gap-scale",
        runtimeSpacing.paneInnerGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-stack-gap-scale",
        runtimeSpacing.paneStackGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-sidebar-inner-gap-scale",
        runtimeSpacing.sidebarInnerGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-thumbnail-gap-scale",
        runtimeSpacing.thumbnailGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-button-group-inset-scale",
        runtimeSpacing.buttonGroupInsetScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-toolbar-height-scale",
        runtimeSpacing.paneToolbarHeightScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-footer-height-scale",
        runtimeSpacing.paneFooterHeightScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-radius-cascade-scale-coeff",
        normalizedRadiusCascadeScale.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-radius-value-scale-coeff",
        normalizedRadiusValueScale.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-layout-gap-px",
        `${runtimeSpacing.layoutGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-inner-padding-px",
        `${runtimeSpacing.paneInnerPaddingPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-stack-gap-px",
        `${runtimeSpacing.paneStackGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-section-gap-px",
        `${runtimeSpacing.paneSectionGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-recessed-padding-px",
        `${runtimeSpacing.paneRecessedPaddingPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-sidebar-gap-px",
        `${runtimeSpacing.sidebarGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-thumbnail-gap-px",
        `${runtimeSpacing.thumbnailGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-button-group-inset-px",
        `${runtimeSpacing.buttonGroupInsetPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-control-group-gap-px",
        `${runtimeSpacing.controlGroupGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-metadata-edit-grid-label-gap-px",
        `${runtimeSpacing.metadataEditGridLabelGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-icon-button-size-px",
        `${resolvedIconButtonSizePx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-header-btn-size-px",
        `${resolvedHeaderButtonSizePx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-panel-head-height-px",
        `${resolvedPanelHeadHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-toolbar-height-px",
        `${resolvedPanelHeadHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-footer-height-px",
        `${resolvedPanelFooterMinHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-panel-footer-min-height",
        `${resolvedPanelFooterMinHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-control-padding-x",
        `${resolvedControlPaddingXPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-header-btn-padding-x",
        `${resolvedControlPaddingXPx}px`,
      );
    };

    applyLayoutGapVars();
    window.addEventListener("resize", applyLayoutGapVars);
    return () => {
      window.removeEventListener("resize", applyLayoutGapVars);
    };
  }, [
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    paneToolbarHeightScaleCoeff,
    paneFooterHeightScaleCoeff,
    radiusCascadeScaleCoeff,
    radiusValueScaleCoeff,
  ]);
}
