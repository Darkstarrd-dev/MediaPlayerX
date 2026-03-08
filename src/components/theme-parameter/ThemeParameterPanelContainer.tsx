import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type SetStateAction,
} from "react";

import { MainUiIcon } from "../MainUiIcon";
import { useDraggablePanel } from "../useDraggablePanel";
import { buildA11yProps } from "../../i18n/a11y";
import { useI18n } from "../../i18n/useI18n";
import { ThemeParameterPanelMain } from "./ThemeParameterPanelMain";
import type {
  ThemeParameterPageId,
  ThemeParameterPreviewMode,
} from "./ThemeParameterPanelMain";
import { includesSearch, readFileAsText } from "./themeParameterUtils";
import {
  COMMON_PARAMETERS,
  CONTAINER_FRAME_PARAMETERS,
  EMPTY_PARAMETERS,
  LARGE_PANEL_PARAMETERS,
  SMALL_PANEL_PARAMETERS,
  readParameterValues,
  resolveParameterLabel,
  resolveStyleGroup,
  STYLE_PARAMETERS,
  type ThemeParameterDefinition,
  type ThemeParameterValues,
} from "./themeParameterDefinitions";
import {
  clearContainerDebugSessionState,
  readContainerDebugSessionState,
  readThemeParameterUiSessionState,
  updateThemeParameterUiSessionState,
  writeContainerDebugSessionState,
  writeThemeParameterUiSessionState,
} from "./themeParameterPanelSessionState";

const PREVIEW_MODE_ATTR = "data-mpx-theme-debug-preview";
const THEME_PARAMETER_RESET_EVENT = "mpx-theme-parameter-reset";
const CONTAINER_RADIUS_SYNC_PARAMETER_IDS = [
  "header-radius",
  "sidebar-radius",
  "main-radius",
  "metadata-radius",
] as const;
const CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS = [
  "header-fill-angle",
  "sidebar-fill-angle",
  "main-fill-angle",
  "metadata-fill-angle",
] as const;
const LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS = [
  "large-panel-head-fill-angle",
  "large-panel-side-fill-angle",
  "large-panel-main-fill-angle",
] as const;
const LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS = [
  "large-panel-head-border-width",
  "large-panel-side-border-width",
  "large-panel-main-border-width",
] as const;

const CONTAINER_LAYER_PARAMETER_IDS = new Set([
  "layout-padding",
  "splitter-width",
  "container-frame-radius",
  "container-frame-fill-angle",
  "header-fill-angle",
  "sidebar-fill-angle",
  "main-fill-angle",
  "main-header-fill-angle",
  "metadata-fill-angle",
  "metadata-header-fill-angle",
  "header-radius",
  "header-z-index",
  "sidebar-radius",
  "sidebar-z-index",
  "main-radius",
  "main-z-index",
  "metadata-radius",
  "metadata-z-index",
  "skeuo-pane-elevation",
  "skeuo-container-elevation",
  "liquid-glass-surface-opacity",
  "neobrutalism-shadow-offset",
  "neobrutalism-border-width",
  "neobrutalism-corner-radius",
]);

function isContainerLayerParameter(
  parameter: ThemeParameterDefinition,
): boolean {
  if (CONTAINER_LAYER_PARAMETER_IDS.has(parameter.id)) {
    return true;
  }
  return parameter.id.includes("-pane-") || parameter.id.includes("-frame-");
}

interface ThemeParameterPanelProps {
  open: boolean;
  hidden?: boolean;
  styleId: string;
  settingsFontSize: number;
  onClose: () => void;
  onHide?: () => void;
}

interface ThemeParameterSnapshot {
  version: 1;
  styleId: string;
  values?: Record<string, number>;
  debugColors?: Record<string, string>;
  debugTexts?: Record<string, string>;
}

interface SnapshotColorField {
  id: string;
  cssVar: string;
  fallback: string;
}

interface SnapshotTextField {
  id: string;
  cssVar: string;
}

const SNAPSHOT_COLOR_FIELDS: readonly SnapshotColorField[] = [
  {
    id: "container-bg-workspace",
    cssVar: "--mpx-bg-workspace",
    fallback: "#f3f0ea",
  },
  {
    id: "container-bg-panel",
    cssVar: "--mpx-bg-panel",
    fallback: "#fbf8f3",
  },
  {
    id: "container-bg-elevated",
    cssVar: "--mpx-bg-elevated",
    fallback: "#ffffff",
  },
  {
    id: "container-frame-fill-start",
    cssVar: "--mpx-container-frame-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-frame-fill-end",
    cssVar: "--mpx-container-frame-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-frame-edge-color",
    cssVar: "--mpx-container-frame-edge-color",
    fallback: "#cdc7bb",
  },
  {
    id: "container-frame-border-color",
    cssVar: "--mpx-container-frame-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-header-fill-start",
    cssVar: "--mpx-header-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-header-fill-end",
    cssVar: "--mpx-header-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-header-border-color",
    cssVar: "--mpx-header-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-header-buttons-border",
    cssVar: "--mpx-slot-fg-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-buttons-bg",
    cssVar: "--mpx-slot-fg-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-buttons-text",
    cssVar: "--mpx-slot-fg-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-logo-border",
    cssVar: "--mpx-slot-fg-header-logo-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-logo-bg",
    cssVar: "--mpx-slot-fg-header-logo-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-logo-text",
    cssVar: "--mpx-slot-fg-header-logo-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g1-border",
    cssVar: "--mpx-slot-fg-header-g1-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g1-bg",
    cssVar: "--mpx-slot-fg-header-g1-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g1-text",
    cssVar: "--mpx-slot-fg-header-g1-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g2-mode-border",
    cssVar: "--mpx-slot-fg-header-g2-mode-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g2-mode-bg",
    cssVar: "--mpx-slot-fg-header-g2-mode-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g2-mode-text",
    cssVar: "--mpx-slot-fg-header-g2-mode-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g-debug-border",
    cssVar: "--mpx-slot-fg-header-g-debug-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g-debug-bg",
    cssVar: "--mpx-slot-fg-header-g-debug-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g-debug-text",
    cssVar: "--mpx-slot-fg-header-g-debug-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g3-border",
    cssVar: "--mpx-slot-fg-header-g3-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g3-bg",
    cssVar: "--mpx-slot-fg-header-g3-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g3-text",
    cssVar: "--mpx-slot-fg-header-g3-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-fill-start",
    cssVar: "--mpx-sidebar-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-sidebar-fill-end",
    cssVar: "--mpx-sidebar-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-sidebar-border-color",
    cssVar: "--mpx-sidebar-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-sidebar-header-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-header-border",
    cssVar: "--mpx-slot-fg-sidebar-header-border",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-header-text",
    cssVar: "--mpx-slot-fg-sidebar-header-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-button-border",
    cssVar: "--mpx-slot-fg-sidebar-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-button-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-button-text",
    cssVar: "--mpx-slot-fg-sidebar-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-title-border",
    cssVar: "--mpx-slot-fg-sidebar-header-title-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-title-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-title-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-title-text",
    cssVar: "--mpx-slot-fg-sidebar-header-title-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-action-border",
    cssVar: "--mpx-slot-fg-sidebar-header-action-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-action-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-action-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-action-text",
    cssVar: "--mpx-slot-fg-sidebar-header-action-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-main-fill-start",
    cssVar: "--mpx-main-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-main-fill-end",
    cssVar: "--mpx-main-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-main-border-color",
    cssVar: "--mpx-main-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-main-header-fill-start",
    cssVar: "--mpx-main-header-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-fill-end",
    cssVar: "--mpx-main-header-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-border-color",
    cssVar: "--mpx-main-header-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-button-border",
    cssVar: "--mpx-slot-fg-main-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-main-header-button-bg",
    cssVar: "--mpx-slot-fg-main-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-main-header-button-text",
    cssVar: "--mpx-slot-fg-main-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-fill-start",
    cssVar: "--mpx-metadata-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-metadata-fill-end",
    cssVar: "--mpx-metadata-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-metadata-border-color",
    cssVar: "--mpx-metadata-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-metadata-header-fill-start",
    cssVar: "--mpx-metadata-header-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-fill-end",
    cssVar: "--mpx-metadata-header-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-border-color",
    cssVar: "--mpx-metadata-header-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-button-border",
    cssVar: "--mpx-slot-fg-meta-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-metadata-header-button-bg",
    cssVar: "--mpx-slot-fg-meta-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-metadata-header-button-text",
    cssVar: "--mpx-slot-fg-meta-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-border-1",
    cssVar: "--mpx-border-1",
    fallback: "#d6cfc1",
  },
  {
    id: "container-border-2",
    cssVar: "--mpx-border-2",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-main-bg",
    cssVar: "--mpx-sidebar-main-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-label-text",
    cssVar: "--mpx-sidebar-main-label-text",
    fallback: "#30271d",
  },
  {
    id: "container-sidebar-main-label-border",
    cssVar: "--mpx-sidebar-main-label-border",
    fallback: "#bcc1c9",
  },
  {
    id: "container-sidebar-main-label-plain-border",
    cssVar: "--mpx-sidebar-main-label-plain-border",
    fallback: "#d5d0c8",
  },
  {
    id: "container-sidebar-main-label-active-bg",
    cssVar: "--mpx-sidebar-main-label-active-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-active-ring",
    cssVar: "--mpx-sidebar-main-active-ring",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-active-underlay",
    cssVar: "--mpx-sidebar-main-active-underlay",
    fallback: "#e6e2da",
  },
  {
    id: "container-sidebar-main-label-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-marker-focus-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-marker-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-sidebar-main-label-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-manage-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-sidebar-main-label-toggle-text",
    cssVar: "--mpx-sidebar-main-label-toggle-text",
    fallback: "#5b4f3f",
  },
  {
    id: "container-sidebar-main-count-text",
    cssVar: "--mpx-sidebar-main-count-text",
    fallback: "#000000",
  },
  {
    id: "container-sidebar-main-count-border",
    cssVar: "--mpx-sidebar-main-count-border",
    fallback: "#bcc4cf",
  },
  {
    id: "container-sidebar-main-count-bg",
    cssVar: "--mpx-sidebar-main-count-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-count-packages-text",
    cssVar: "--mpx-sidebar-main-count-packages-text",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-count-packages-border",
    cssVar: "--mpx-sidebar-main-count-packages-border",
    fallback: "#d8cba8",
  },
  {
    id: "container-sidebar-main-count-packages-bg",
    cssVar: "--mpx-sidebar-main-count-packages-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-count-images-text",
    cssVar: "--mpx-sidebar-main-count-images-text",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-count-images-border",
    cssVar: "--mpx-sidebar-main-count-images-border",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-count-images-bg",
    cssVar: "--mpx-sidebar-main-count-images-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-bullet-pending-bg",
    cssVar: "--mpx-sidebar-main-bullet-pending-bg",
    fallback: "#98836a",
  },
  {
    id: "container-sidebar-main-bullet-running-bg",
    cssVar: "--mpx-sidebar-main-bullet-running-bg",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-bullet-running-ring",
    cssVar: "--mpx-sidebar-main-bullet-running-ring",
    fallback: "#93b4bc",
  },
  {
    id: "container-sidebar-main-bullet-active-bg",
    cssVar: "--mpx-sidebar-main-bullet-active-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-main-image-name-list-border",
    cssVar: "--mpx-main-image-name-list-border",
    fallback: "#c7d0d8",
  },
  {
    id: "container-main-image-name-list-bg",
    cssVar: "--mpx-main-image-name-list-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "container-main-image-name-list-text",
    cssVar: "--mpx-main-image-name-list-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-border",
    cssVar: "--mpx-main-image-name-list-row-border",
    fallback: "#dce1e7",
  },
  {
    id: "container-main-image-name-list-row-bg",
    cssVar: "--mpx-main-image-name-list-row-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-text",
    cssVar: "--mpx-main-image-name-list-row-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-label-text",
    cssVar: "--mpx-main-image-name-list-label-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-head-border",
    cssVar: "--mpx-main-image-name-list-head-border",
    fallback: "#b5bdc8",
  },
  {
    id: "container-main-image-name-list-head-bg",
    cssVar: "--mpx-main-image-name-list-head-bg",
    fallback: "#d6dbe1",
  },
  {
    id: "container-main-image-name-list-head-text",
    cssVar: "--mpx-main-image-name-list-head-text",
    fallback: "#544634",
  },
  {
    id: "container-main-image-name-list-body-bg",
    cssVar: "--mpx-main-image-name-list-body-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-hover-bg",
    cssVar: "--mpx-main-image-name-list-row-hover-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-focused-border-left",
    cssVar: "--mpx-main-image-name-list-row-focused-border-left",
    fallback: "#2d6e7d",
  },
  {
    id: "container-main-image-name-list-row-selected-border-left",
    cssVar: "--mpx-main-image-name-list-row-selected-border-left",
    fallback: "#9a885f",
  },
  {
    id: "container-main-image-name-list-row-selected-focused-border-left",
    cssVar: "--mpx-main-image-name-list-row-selected-focused-border-left",
    fallback: "#2d6e7d",
  },
  {
    id: "container-main-image-name-list-row-manage-selected-bg",
    cssVar: "--mpx-main-image-name-list-row-manage-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-main-image-name-list-row-main-text",
    cssVar: "--mpx-main-image-name-list-row-main-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-main-hover-bg",
    cssVar: "--mpx-main-image-name-list-row-main-hover-bg",
    fallback: "#f3f6f8",
  },
  {
    id: "container-main-image-name-list-row-main-active-bg",
    cssVar: "--mpx-main-image-name-list-row-main-active-bg",
    fallback: "#d7dde4",
  },
  {
    id: "container-main-image-name-list-row-main-pressed-bg",
    cssVar: "--mpx-main-image-name-list-row-main-pressed-bg",
    fallback: "#d7dde4",
  },
  {
    id: "container-main-image-name-list-row-main-hover-text",
    cssVar: "--mpx-main-image-name-list-row-main-hover-text",
    fallback: "#2f5f6d",
  },
  {
    id: "container-main-image-name-list-row-main-active-text",
    cssVar: "--mpx-main-image-name-list-row-main-active-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-main-pressed-text",
    cssVar: "--mpx-main-image-name-list-row-main-pressed-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-main-focus-outline-color",
    cssVar: "--mpx-main-image-name-list-row-main-focus-outline-color",
    fallback: "#2d6e7d",
  },
  {
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-fill-start",
    cssVar: "--mpx-large-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-fill-end",
    cssVar: "--mpx-large-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-section-fill-start",
    cssVar: "--mpx-large-panel-section-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-section-fill-end",
    cssVar: "--mpx-large-panel-section-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-section-border-color",
    cssVar: "--mpx-large-panel-section-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-head-fill-start",
    cssVar: "--mpx-large-panel-head-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-head-fill-end",
    cssVar: "--mpx-large-panel-head-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-head-text",
    cssVar: "--mpx-large-panel-head-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-side-fill-start",
    cssVar: "--mpx-large-panel-side-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-side-fill-end",
    cssVar: "--mpx-large-panel-side-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-main-fill-start",
    cssVar: "--mpx-large-panel-main-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-fill-end",
    cssVar: "--mpx-large-panel-main-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-bg",
    cssVar: "--mpx-large-panel-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-head-bg",
    cssVar: "--mpx-large-panel-head-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-side-bg",
    cssVar: "--mpx-large-panel-side-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-bg",
    cssVar: "--mpx-large-panel-main-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-import-task-error-border",
    cssVar: "--mpx-import-task-error-border",
    fallback: "#d7a596",
  },
  {
    id: "large-panel-import-task-error-bg",
    cssVar: "--mpx-import-task-error-bg",
    fallback: "#fdeee8",
  },
  {
    id: "large-panel-import-task-error-text",
    cssVar: "--mpx-import-task-error-text",
    fallback: "#5f2a1e",
  },
  {
    id: "large-panel-import-task-hint-border",
    cssVar: "--mpx-import-task-hint-border",
    fallback: "#c5d6de",
  },
  {
    id: "large-panel-import-task-hint-bg",
    cssVar: "--mpx-import-task-hint-bg",
    fallback: "#edf6f9",
  },
  {
    id: "large-panel-import-task-hint-text",
    cssVar: "--mpx-import-task-hint-text",
    fallback: "#173b47",
  },
  {
    id: "large-panel-import-task-review-notice-border",
    cssVar: "--mpx-import-task-review-notice-border",
    fallback: "#d8c69b",
  },
  {
    id: "large-panel-import-task-review-notice-bg",
    cssVar: "--mpx-import-task-review-notice-bg",
    fallback: "#fff7e7",
  },
  {
    id: "large-panel-import-task-review-notice-text",
    cssVar: "--mpx-import-task-review-notice-text",
    fallback: "#5a3b12",
  },
  {
    id: "large-panel-import-task-hash-log-border",
    cssVar: "--mpx-import-task-hash-log-border",
    fallback: "#c5d6de",
  },
  {
    id: "large-panel-import-task-hash-log-bg",
    cssVar: "--mpx-import-task-hash-log-bg",
    fallback: "#edf6f9",
  },
  {
    id: "large-panel-import-task-hash-log-text",
    cssVar: "--mpx-import-task-hash-log-text",
    fallback: "#173b47",
  },
  {
    id: "large-panel-metadata-fetch-control-border",
    cssVar: "--mpx-metadata-fetch-control-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-fetch-control-bg",
    cssVar: "--mpx-metadata-fetch-control-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-control-hover-bg",
    cssVar: "--mpx-metadata-fetch-control-hover-bg",
    fallback: "#f7f3ee",
  },
  {
    id: "large-panel-metadata-fetch-control-focus-bg",
    cssVar: "--mpx-metadata-fetch-control-focus-bg",
    fallback: "#efe9df",
  },
  {
    id: "large-panel-metadata-fetch-control-text",
    cssVar: "--mpx-metadata-fetch-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-fetch-control-placeholder",
    cssVar: "--mpx-metadata-fetch-control-placeholder",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-results-border",
    cssVar: "--mpx-metadata-fetch-results-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-fetch-results-bg",
    cssVar: "--mpx-metadata-fetch-results-bg",
    fallback: "#fffcf8",
  },
  {
    id: "large-panel-metadata-fetch-results-active-ring",
    cssVar: "--mpx-metadata-fetch-results-active-ring",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-metadata-fetch-head-border",
    cssVar: "--mpx-metadata-fetch-head-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-metadata-fetch-head-bg",
    cssVar: "--mpx-metadata-fetch-head-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-metadata-fetch-head-text",
    cssVar: "--mpx-metadata-fetch-head-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-body-bg",
    cssVar: "--mpx-metadata-fetch-body-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-result-meta-text",
    cssVar: "--mpx-metadata-fetch-result-meta-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-result-hover-text",
    cssVar: "--mpx-metadata-fetch-result-hover-text",
    fallback: "#2f5f6d",
  },
  {
    id: "large-panel-metadata-fetch-preview-divider",
    cssVar: "--mpx-metadata-fetch-preview-divider",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-metadata-fetch-preview-bg",
    cssVar: "--mpx-metadata-fetch-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-border",
    cssVar: "--mpx-metadata-fetch-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-text",
    cssVar: "--mpx-metadata-fetch-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-hover-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-active-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-focus-outline",
    cssVar: "--mpx-metadata-fetch-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-metadata-preference-record-border",
    cssVar: "--mpx-metadata-preference-record-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-metadata-preference-record-bg",
    cssVar: "--mpx-metadata-preference-record-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-preference-record-text",
    cssVar: "--mpx-metadata-preference-record-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-preference-record-summary-text",
    cssVar: "--mpx-metadata-preference-record-summary-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-preference-record-hint-text",
    cssVar: "--mpx-metadata-preference-record-hint-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-preference-record-field-border",
    cssVar: "--mpx-metadata-preference-record-field-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-preference-record-field-bg",
    cssVar: "--mpx-metadata-preference-record-field-bg",
    fallback: "#f8f5ef",
  },
  {
    id: "large-panel-metadata-preference-record-field-text",
    cssVar: "--mpx-metadata-preference-record-field-text",
    fallback: "#6b6356",
  },
  {
    id: "large-panel-metadata-booklet-binding-border",
    cssVar: "--mpx-metadata-booklet-binding-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-metadata-booklet-binding-bg",
    cssVar: "--mpx-metadata-booklet-binding-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-booklet-binding-text",
    cssVar: "--mpx-metadata-booklet-binding-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-booklet-binding-meta-text",
    cssVar: "--mpx-metadata-booklet-binding-meta-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-border",
    cssVar: "--mpx-metadata-booklet-binding-control-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-bg",
    cssVar: "--mpx-metadata-booklet-binding-control-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-text",
    cssVar: "--mpx-metadata-booklet-binding-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-hint-text",
    cssVar: "--mpx-metadata-feature-tag-picker-hint-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-group-key-text",
    cssVar: "--mpx-metadata-feature-tag-picker-group-key-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-border",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-border",
    fallback: "#2e6f7f",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-bg",
    fallback: "#dcecf0",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-text",
    fallback: "#2e6f7f",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-border",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-border",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-transcode-dialog-control-border",
    cssVar: "--mpx-transcode-dialog-control-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-transcode-dialog-control-bg",
    cssVar: "--mpx-transcode-dialog-control-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-transcode-dialog-control-hover-bg",
    cssVar: "--mpx-transcode-dialog-control-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-transcode-dialog-control-focus-bg",
    cssVar: "--mpx-transcode-dialog-control-focus-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-transcode-dialog-control-text",
    cssVar: "--mpx-transcode-dialog-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-transcode-dialog-control-placeholder",
    cssVar: "--mpx-transcode-dialog-control-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-border",
    cssVar: "--mpx-transcode-dialog-action-btn-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-bg",
    cssVar: "--mpx-transcode-dialog-action-btn-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-text",
    cssVar: "--mpx-transcode-dialog-action-btn-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-hover-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-focus-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-focus-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-preview-border",
    cssVar: "--mpx-sidebar-rename-preview-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-sidebar-rename-preview-bg",
    cssVar: "--mpx-sidebar-rename-preview-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-border",
    cssVar: "--mpx-sidebar-rename-preview-head-border",
    fallback: "#bcc7d1",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-bg",
    cssVar: "--mpx-sidebar-rename-preview-head-bg",
    fallback: "#d1d5db",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-text",
    cssVar: "--mpx-sidebar-rename-preview-head-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-preview-list-bg",
    cssVar: "--mpx-sidebar-rename-preview-list-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-border",
    cssVar: "--mpx-sidebar-rename-preview-row-border",
    fallback: "#cfd7df",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-text",
    cssVar: "--mpx-sidebar-rename-preview-row-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-preview-arrow-text",
    cssVar: "--mpx-sidebar-rename-preview-arrow-text",
    fallback: "rgba(106, 99, 88, 0.7)",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-hover-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-active-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-active-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-pressed-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-pressed-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-changed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-changed-accent",
    fallback: "#9fb1c3",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-accent",
    fallback: "#c7928a",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-text",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-text",
    fallback: "#5f2a1e",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-unchanged-text",
    cssVar: "--mpx-sidebar-rename-preview-row-unchanged-text",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-border-color",
    cssVar: "--mpx-dialog-panel-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-bg",
    cssVar: "--mpx-dialog-panel-bg",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-border",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-bg",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-bg",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-placeholder",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
  },
  {
    id: "button-side-idle-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-idle-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "button-side-idle-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-text",
    fallback: "#4a4a4a",
  },
  {
    id: "button-side-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
    fallback: "#f8fafc",
  },
  {
    id: "button-side-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-text",
    fallback: "#4a4a4a",
  },
  {
    id: "button-side-active-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-active-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-bg",
    fallback: "#dce2e8",
  },
  {
    id: "button-side-active-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-text",
    fallback: "#334155",
  },
  {
    id: "button-side-selected-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-border",
    fallback: "#d6cfc1",
  },
  {
    id: "button-side-selected-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-bg",
    fallback: "#ffffff",
  },
  {
    id: "button-side-selected-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-text",
    fallback: "#2e2a22",
  },
  {
    id: "button-side-pressed-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-pressed-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-bg",
    fallback: "#d6dee5",
  },
  {
    id: "button-side-pressed-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-text",
    fallback: "#555555",
  },
  {
    id: "button-side-disabled-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-disabled-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "button-side-disabled-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-text",
    fallback: "#9b8465",
  },
  {
    id: "button-side-pending-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-border",
    fallback: "#d7ba8a",
  },
  {
    id: "button-side-pending-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-bg",
    fallback: "#fbf1e0",
  },
  {
    id: "button-side-pending-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-text",
    fallback: "#6a4b1e",
  },
  {
    id: "button-side-danger-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-border",
    fallback: "#fca5a5",
  },
  {
    id: "button-side-danger-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-bg",
    fallback: "#fee2e2",
  },
  {
    id: "button-side-danger-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-text",
    fallback: "#dc2626",
  },
  {
    id: "control-scrollbar-track-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-bg",
    fallback: "#ece5d9",
  },
  {
    id: "control-scrollbar-thumb-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-bg",
    fallback: "#b7ab95",
  },
  {
    id: "control-scrollbar-thumb-hover-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-hover-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-scrollbar-thumb-active-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-scrollbar-color-thumb",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-thumb",
    fallback: "#b7ab95",
  },
  {
    id: "control-scrollbar-color-track",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-track",
    fallback: "#ece5d9",
  },
  {
    id: "control-scrollbar-thumb-border-color",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "control-slider-base-track-bg",
    cssVar: "--mpx-range-track-bg",
    fallback: "#d6cfc1",
  },
  {
    id: "control-slider-base-thumb-bg",
    cssVar: "--mpx-range-thumb-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-slider-base-thumb-border",
    cssVar: "--mpx-range-thumb-border",
    fallback: "#ffffff",
  },
  {
    id: "control-slider-player-fill-gold",
    cssVar: "--mpx-runway-fill-gold",
    fallback: "linear-gradient(90deg, #cba468 0%, #b5853b 100%)",
  },
  {
    id: "control-slider-player-fill-graphite",
    cssVar: "--mpx-runway-fill-graphite",
    fallback: "linear-gradient(90deg, #9ca3af 0%, #4b5563 55%, #374151 100%)",
  },
  {
    id: "control-slider-player-thumb-shell-pearl",
    cssVar: "--mpx-runway-thumb-shell-pearl",
    fallback: "linear-gradient(90deg, #d6bc86 0%, #c79d4a 50%, #d6bc86 100%)",
  },
  {
    id: "control-slider-player-thumb-shell-graphite",
    cssVar: "--mpx-runway-thumb-shell-graphite",
    fallback: "linear-gradient(145deg, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%)",
  },
  {
    id: "control-slider-vertical-accent-fill",
    cssVar: "--mpx-skeuo-accent-fill",
    fallback: "#8a6a3b",
  },
  {
    id: "control-slider-vertical-inset-bg",
    cssVar: "--mpx-skeuo-inset-bg",
    fallback: "#f3e9d8",
  },
  {
    id: "control-slider-settings-groove-bg",
    cssVar: "--mpx-slider-settings-groove-bg",
    fallback: "#e9ecf0",
  },
];

const SNAPSHOT_TEXT_FIELDS: readonly SnapshotTextField[] = [
  {
    id: "container-bg-app-fill",
    cssVar: "--mpx-bg-app-fill",
  },
  {
    id: "container-frame-shadow",
    cssVar: "--mpx-container-frame-shadow",
  },
  {
    id: "container-header-shadow",
    cssVar: "--mpx-header-shadow",
  },
  {
    id: "container-sidebar-shadow",
    cssVar: "--mpx-sidebar-shadow",
  },
  {
    id: "container-main-shadow",
    cssVar: "--mpx-main-shadow",
  },
  {
    id: "container-metadata-shadow",
    cssVar: "--mpx-metadata-shadow",
  },
  {
    id: "container-sidebar-main-label-bg",
    cssVar: "--mpx-sidebar-main-label-bg",
  },
  {
    id: "container-sidebar-main-label-shadow",
    cssVar: "--mpx-sidebar-main-label-shadow",
  },
  {
    id: "container-sidebar-main-label-hover-filter",
    cssVar: "--mpx-sidebar-main-label-hover-filter",
  },
  {
    id: "container-sidebar-main-label-collapsed-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-bg",
  },
  {
    id: "container-sidebar-main-label-expanded-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-bg",
  },
  {
    id: "container-sidebar-main-label-plain-bg",
    cssVar: "--mpx-sidebar-main-label-plain-bg",
  },
  {
    id: "container-sidebar-main-label-active-shadow",
    cssVar: "--mpx-sidebar-main-label-active-shadow",
  },
  {
    id: "container-sidebar-main-label-active-hover-shadow",
    cssVar: "--mpx-sidebar-main-label-active-hover-shadow",
  },
  {
    id: "container-sidebar-main-label-manage-selected-shadow",
    cssVar: "--mpx-sidebar-main-label-manage-selected-shadow",
  },
  {
    id: "container-sidebar-main-count-shadow",
    cssVar: "--mpx-sidebar-main-count-shadow",
  },
  {
    id: "container-sidebar-main-count-packages-shadow",
    cssVar: "--mpx-sidebar-main-count-packages-shadow",
  },
  {
    id: "container-main-image-name-list-row-main-focus-outline-width",
    cssVar: "--mpx-main-image-name-list-row-main-focus-outline-width",
  },
  {
    id: "container-main-image-name-list-row-main-pressed-font-weight",
    cssVar: "--mpx-main-image-name-list-row-main-pressed-font-weight",
  },
  {
    id: "large-panel-shadow",
    cssVar: "--mpx-large-panel-shadow",
  },
  {
    id: "large-panel-metadata-fetch-control-font-size",
    cssVar: "--mpx-metadata-fetch-control-font-size",
  },
  {
    id: "large-panel-metadata-fetch-head-font-size",
    cssVar: "--mpx-metadata-fetch-head-font-size",
  },
  {
    id: "large-panel-metadata-fetch-head-font-family",
    cssVar: "--mpx-metadata-fetch-head-font-family",
  },
  {
    id: "small-panel-shadow",
    cssVar: "--mpx-dialog-panel-shadow",
  },
  {
    id: "control-scrollbar-size",
    cssVar: "--mpx-sidebar-tree-scrollbar-size",
  },
  {
    id: "control-scrollbar-track-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-radius",
  },
  {
    id: "control-scrollbar-thumb-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-radius",
  },
  {
    id: "control-scrollbar-track-border",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-border",
  },
  {
    id: "control-scrollbar-track-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-shadow",
  },
  {
    id: "control-scrollbar-end-gap",
    cssVar: "--mpx-sidebar-tree-scrollbar-end-gap",
  },
  {
    id: "control-scrollbar-thumb-min-height",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-min-height",
  },
  {
    id: "control-scrollbar-thumb-border-width",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-width",
  },
  {
    id: "control-scrollbar-thumb-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-shadow",
  },
  {
    id: "control-scrollbar-thumb-active-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-shadow",
  },
  {
    id: "control-slider-base-track-height",
    cssVar: "--mpx-range-track-height",
  },
  {
    id: "control-slider-base-thumb-size",
    cssVar: "--mpx-range-thumb-size",
  },
  {
    id: "control-slider-base-thumb-border-width",
    cssVar: "--mpx-range-thumb-border-width",
  },
  {
    id: "control-slider-base-thumb-shadow",
    cssVar: "--mpx-range-thumb-shadow",
  },
  {
    id: "control-slider-base-thumb-hover-shadow",
    cssVar: "--mpx-range-thumb-hover-shadow",
  },
  {
    id: "control-slider-base-thumb-active-shadow",
    cssVar: "--mpx-range-thumb-active-shadow",
  },
  {
    id: "control-slider-base-thumb-focus-ring",
    cssVar: "--mpx-range-thumb-focus-ring",
  },
  {
    id: "control-slider-base-thumb-hover-scale",
    cssVar: "--mpx-range-thumb-hover-scale",
  },
  {
    id: "control-slider-base-thumb-active-scale",
    cssVar: "--mpx-range-thumb-active-scale",
  },
  {
    id: "control-slider-player-fill-shadow-gold",
    cssVar: "--mpx-runway-fill-shadow-gold",
  },
  {
    id: "control-slider-player-fill-shadow-graphite",
    cssVar: "--mpx-runway-fill-shadow-graphite",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-pearl",
    cssVar: "--mpx-runway-thumb-shell-shadow-pearl",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-graphite",
    cssVar: "--mpx-runway-thumb-shell-shadow-graphite",
  },
  {
    id: "control-slider-player-thumb-core-pearl",
    cssVar: "--mpx-runway-thumb-core-pearl",
  },
  {
    id: "control-slider-player-thumb-core-graphite",
    cssVar: "--mpx-runway-thumb-core-graphite",
  },
  {
    id: "control-slider-player-thumb-core-shadow-pearl",
    cssVar: "--mpx-runway-thumb-core-shadow-pearl",
  },
  {
    id: "control-slider-player-thumb-core-shadow-graphite",
    cssVar: "--mpx-runway-thumb-core-shadow-graphite",
  },
  {
    id: "control-slider-vertical-shadow-dark",
    cssVar: "--mpx-skeuo-shadow-dark",
  },
  {
    id: "control-slider-vertical-shadow-light",
    cssVar: "--mpx-skeuo-shadow-light",
  },
  {
    id: "control-slider-settings-groove-shadow",
    cssVar: "--mpx-slider-settings-groove-shadow",
  },
];

const CONTAINER_DEBUG_COLOR_FIELDS = SNAPSHOT_COLOR_FIELDS.filter((field) =>
  field.id.startsWith("container-"),
);

const CONTAINER_DEBUG_TEXT_FIELDS = SNAPSHOT_TEXT_FIELDS.filter((field) =>
  field.id.startsWith("container-"),
);

const LEGACY_CONTAINER_SLOT_PREFIX_TO_SEMANTIC: ReadonlyArray<{
  legacyPrefix: string;
  semanticPrefix: string;
}> = [
  {
    legacyPrefix: "--mpx-slot-fg-sidebar-main-",
    semanticPrefix: "--mpx-sidebar-main-",
  },
  {
    legacyPrefix: "--mpx-slot-fg-main-content-image-name-list-",
    semanticPrefix: "--mpx-main-image-name-list-",
  },
];

function resolveLegacyContainerSemanticVar(
  legacyCssVar: string,
): string | null {
  for (const mapping of LEGACY_CONTAINER_SLOT_PREFIX_TO_SEMANTIC) {
    if (!legacyCssVar.startsWith(mapping.legacyPrefix)) {
      continue;
    }
    return `${mapping.semanticPrefix}${legacyCssVar.slice(mapping.legacyPrefix.length)}`;
  }
  return null;
}

function migrateLegacySidebarMainSlots(root: HTMLElement): void {
  const legacyPairs: Array<{ legacyCssVar: string; semanticCssVar: string }> =
    [];
  for (let index = 0; index < root.style.length; index += 1) {
    const legacyCssVar = root.style.item(index);
    const semanticCssVar = resolveLegacyContainerSemanticVar(legacyCssVar);
    if (!semanticCssVar) {
      continue;
    }
    legacyPairs.push({ legacyCssVar, semanticCssVar });
  }

  for (const pair of legacyPairs) {
    const semanticValue = root.style
      .getPropertyValue(pair.semanticCssVar)
      .trim();
    const legacyValue = root.style.getPropertyValue(pair.legacyCssVar).trim();
    if (legacyValue && !semanticValue) {
      root.style.setProperty(pair.semanticCssVar, legacyValue);
    }
    root.style.removeProperty(pair.legacyCssVar);
  }
}

function resolveNextState<T>(action: SetStateAction<T>, previous: T): T {
  if (typeof action === "function") {
    return (action as (previousValue: T) => T)(previous);
  }
  return action;
}

function captureContainerDebugSessionState(root: HTMLElement): void {
  const nextColors: Record<string, string> = {};
  for (const field of CONTAINER_DEBUG_COLOR_FIELDS) {
    const raw = root.style.getPropertyValue(field.cssVar).trim();
    if (raw) {
      nextColors[field.cssVar] = raw;
    }
  }
  const nextTexts: Record<string, string> = {};
  for (const field of CONTAINER_DEBUG_TEXT_FIELDS) {
    const raw = root.style.getPropertyValue(field.cssVar).trim();
    if (raw) {
      nextTexts[field.cssVar] = raw;
    }
  }
  writeContainerDebugSessionState({
    colors: nextColors,
    texts: nextTexts,
  });
}

function applyContainerDebugSessionState(root: HTMLElement): void {
  const sessionState = readContainerDebugSessionState();
  for (const [cssVar, value] of Object.entries(sessionState.colors)) {
    root.style.setProperty(cssVar, value);
  }
  for (const [cssVar, value] of Object.entries(sessionState.texts)) {
    root.style.setProperty(cssVar, value);
  }
}

function ThemeParameterPanel({
  open,
  hidden = false,
  styleId,
  settingsFontSize,
  onClose,
  onHide = () => {},
}: ThemeParameterPanelProps) {
  const initialUiSessionState = readThemeParameterUiSessionState();
  const { t } = useI18n();
  const styleGroup = resolveStyleGroup(styleId);
  const styleParameters =
    styleGroup === "default" ? EMPTY_PARAMETERS : STYLE_PARAMETERS[styleGroup];
  const parameters = useMemo(
    () =>
      styleGroup === "default"
        ? [
            ...COMMON_PARAMETERS,
            ...CONTAINER_FRAME_PARAMETERS,
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ]
        : [
            ...COMMON_PARAMETERS,
            ...CONTAINER_FRAME_PARAMETERS,
            ...STYLE_PARAMETERS[styleGroup],
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ],
    [styleGroup],
  );
  const parameterMap = useMemo(
    () => new Map(parameters.map((parameter) => [parameter.id, parameter])),
    [parameters],
  );
  const [values, setValues] = useState<ThemeParameterValues>({});
  const syncedContainerRadiusOverridesRef = useRef<Set<string>>(new Set());
  const syncedContainerFillAngleOverridesRef = useRef<Set<string>>(new Set());
  const syncedLargePanelSectionFillAngleOverridesRef = useRef<Set<string>>(
    new Set(),
  );
  const syncedLargePanelSectionBorderWidthOverridesRef = useRef<Set<string>>(
    new Set(),
  );
  const [activePage, setActivePageState] = useState<ThemeParameterPageId>(
    initialUiSessionState.activePage,
  );
  const [activePreviewMode, setActivePreviewMode] =
    useState<ThemeParameterPreviewMode>("none");
  const [searchText, setSearchText] = useState("");
  const [commonExpanded, setCommonExpandedState] = useState(
    initialUiSessionState.commonExpanded,
  );
  const [styleExpanded, setStyleExpandedState] = useState(
    initialUiSessionState.styleExpanded,
  );
  const [containerBackgroundExpanded, setContainerBackgroundExpandedState] =
    useState(initialUiSessionState.containerBackgroundExpanded);
  const [containerSharedShellExpanded, setContainerSharedShellExpandedState] =
    useState(initialUiSessionState.containerSharedShellExpanded);
  const [containerHeaderExpanded, setContainerHeaderExpandedState] = useState(
    initialUiSessionState.containerHeaderExpanded,
  );
  const [
    containerHeaderAppearanceExpanded,
    setContainerHeaderAppearanceExpandedState,
  ] = useState(initialUiSessionState.containerHeaderAppearanceExpanded);
  const [
    containerHeaderButtonsExpanded,
    setContainerHeaderButtonsExpandedState,
  ] = useState(initialUiSessionState.containerHeaderButtonsExpanded);
  const [containerHeaderLogoExpanded, setContainerHeaderLogoExpandedState] =
    useState(initialUiSessionState.containerHeaderLogoExpanded);
  const [containerHeaderG1Expanded, setContainerHeaderG1ExpandedState] =
    useState(initialUiSessionState.containerHeaderG1Expanded);
  const [containerHeaderG2Expanded, setContainerHeaderG2ExpandedState] =
    useState(initialUiSessionState.containerHeaderG2Expanded);
  const [containerHeaderGDebugExpanded, setContainerHeaderGDebugExpandedState] =
    useState(initialUiSessionState.containerHeaderGDebugExpanded);
  const [containerHeaderG3Expanded, setContainerHeaderG3ExpandedState] =
    useState(initialUiSessionState.containerHeaderG3Expanded);
  const [containerSidebarExpanded, setContainerSidebarExpandedState] = useState(
    initialUiSessionState.containerSidebarExpanded,
  );
  const [
    containerSidebarAppearanceExpanded,
    setContainerSidebarAppearanceExpandedState,
  ] = useState(initialUiSessionState.containerSidebarAppearanceExpanded);
  const [
    containerSidebarHeaderExpanded,
    setContainerSidebarHeaderExpandedState,
  ] = useState(initialUiSessionState.containerSidebarHeaderExpanded);
  const [
    containerSidebarHeaderTitleExpanded,
    setContainerSidebarHeaderTitleExpandedState,
  ] = useState(initialUiSessionState.containerSidebarHeaderTitleExpanded);
  const [
    containerSidebarHeaderActionsExpanded,
    setContainerSidebarHeaderActionsExpandedState,
  ] = useState(initialUiSessionState.containerSidebarHeaderActionsExpanded);
  const [containerMainExpanded, setContainerMainExpandedState] = useState(
    initialUiSessionState.containerMainExpanded,
  );
  const [
    containerMainAppearanceExpanded,
    setContainerMainAppearanceExpandedState,
  ] = useState(initialUiSessionState.containerMainAppearanceExpanded);
  const [containerMainHeaderExpanded, setContainerMainHeaderExpandedState] =
    useState(initialUiSessionState.containerMainHeaderExpanded);
  const [
    containerMainHeaderButtonsExpanded,
    setContainerMainHeaderButtonsExpandedState,
  ] = useState(initialUiSessionState.containerMainHeaderButtonsExpanded);
  const [
    containerMainWorkspaceExpanded,
    setContainerMainWorkspaceExpandedState,
  ] = useState(initialUiSessionState.containerMainWorkspaceExpanded);
  const [containerMetadataExpanded, setContainerMetadataExpandedState] =
    useState(initialUiSessionState.containerMetadataExpanded);
  const [
    containerMetadataAppearanceExpanded,
    setContainerMetadataAppearanceExpandedState,
  ] = useState(initialUiSessionState.containerMetadataAppearanceExpanded);
  const [
    containerMetadataHeaderExpanded,
    setContainerMetadataHeaderExpandedState,
  ] = useState(initialUiSessionState.containerMetadataHeaderExpanded);
  const [
    containerMetadataHeaderButtonsExpanded,
    setContainerMetadataHeaderButtonsExpandedState,
  ] = useState(initialUiSessionState.containerMetadataHeaderButtonsExpanded);
  const [containerSidebarMainExpanded, setContainerSidebarMainExpandedState] =
    useState(initialUiSessionState.containerSidebarMainExpanded);
  const [
    containerMainImageNameListExpanded,
    setContainerMainImageNameListExpandedState,
  ] = useState(initialUiSessionState.containerMainImageNameListExpanded);
  const [largePanelRootExpanded, setLargePanelRootExpandedState] = useState(
    initialUiSessionState.largePanelRootExpanded,
  );
  const [
    largePanelSharedSectionExpanded,
    setLargePanelSharedSectionExpandedState,
  ] = useState(initialUiSessionState.largePanelSharedSectionExpanded);
  const [largePanelHeadExpanded, setLargePanelHeadExpandedState] = useState(
    initialUiSessionState.largePanelHeadExpanded,
  );
  const [largePanelSideExpanded, setLargePanelSideExpandedState] = useState(
    initialUiSessionState.largePanelSideExpanded,
  );
  const [largePanelMainExpanded, setLargePanelMainExpandedState] = useState(
    initialUiSessionState.largePanelMainExpanded,
  );
  const [largePanelInternalExpanded, setLargePanelInternalExpandedState] =
    useState(initialUiSessionState.largePanelInternalExpanded);
  const [snapshotJson, setSnapshotJson] = useState("");
  const [snapshotIncludeComputedValues, setSnapshotIncludeComputedValues] =
    useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotExplicitParameterIds, setSnapshotExplicitParameterIds] =
    useState<Set<string>>(new Set());
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotBaselineRef = useRef<ThemeParameterSnapshot | null>(null);
  const mainScrollElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const { panelOffset, panelDragging, headHandlers } = useDraggablePanel(open);

  const capturePageScrollTop = (page: ThemeParameterPageId) => {
    const scrollTop = mainScrollElementRef.current?.scrollTop ?? 0;
    const sessionState = readThemeParameterUiSessionState();
    writeThemeParameterUiSessionState({
      ...sessionState,
      pageScrollTops: {
        ...sessionState.pageScrollTops,
        [page]: scrollTop,
      },
    });
  };

  const setActivePage = (action: SetStateAction<ThemeParameterPageId>) => {
    setActivePageState((previous) => {
      capturePageScrollTop(previous);
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ activePage: next });
      return next;
    });
  };

  const setCommonExpanded = (action: SetStateAction<boolean>) => {
    setCommonExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ commonExpanded: next });
      return next;
    });
  };

  const setStyleExpanded = (action: SetStateAction<boolean>) => {
    setStyleExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ styleExpanded: next });
      return next;
    });
  };

  const setContainerBackgroundExpanded = (action: SetStateAction<boolean>) => {
    setContainerBackgroundExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerBackgroundExpanded: next });
      return next;
    });
  };

  const setContainerSharedShellExpanded = (action: SetStateAction<boolean>) => {
    setContainerSharedShellExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSharedShellExpanded: next,
      });
      return next;
    });
  };

  const setContainerHeaderExpanded = (action: SetStateAction<boolean>) => {
    setContainerHeaderExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerHeaderExpanded: next });
      return next;
    });
  };

  const setContainerHeaderAppearanceExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerHeaderAppearanceExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerHeaderAppearanceExpanded: next,
      });
      return next;
    });
  };

  const setContainerHeaderButtonsExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerHeaderButtonsExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerHeaderButtonsExpanded: next,
      });
      return next;
    });
  };

  const setContainerHeaderLogoExpanded = (action: SetStateAction<boolean>) => {
    setContainerHeaderLogoExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerHeaderLogoExpanded: next });
      return next;
    });
  };

  const setContainerHeaderG1Expanded = (action: SetStateAction<boolean>) => {
    setContainerHeaderG1ExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerHeaderG1Expanded: next });
      return next;
    });
  };

  const setContainerHeaderG2Expanded = (action: SetStateAction<boolean>) => {
    setContainerHeaderG2ExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerHeaderG2Expanded: next });
      return next;
    });
  };

  const setContainerHeaderGDebugExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerHeaderGDebugExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerHeaderGDebugExpanded: next,
      });
      return next;
    });
  };

  const setContainerHeaderG3Expanded = (action: SetStateAction<boolean>) => {
    setContainerHeaderG3ExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerHeaderG3Expanded: next });
      return next;
    });
  };

  const setContainerSidebarExpanded = (action: SetStateAction<boolean>) => {
    setContainerSidebarExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerSidebarExpanded: next });
      return next;
    });
  };

  const setContainerSidebarAppearanceExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerSidebarAppearanceExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSidebarAppearanceExpanded: next,
      });
      return next;
    });
  };

  const setContainerSidebarHeaderExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerSidebarHeaderExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSidebarHeaderExpanded: next,
      });
      return next;
    });
  };

  const setContainerSidebarHeaderTitleExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerSidebarHeaderTitleExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSidebarHeaderTitleExpanded: next,
      });
      return next;
    });
  };

  const setContainerSidebarHeaderActionsExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerSidebarHeaderActionsExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSidebarHeaderActionsExpanded: next,
      });
      return next;
    });
  };

  const setContainerMainExpanded = (action: SetStateAction<boolean>) => {
    setContainerMainExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerMainExpanded: next });
      return next;
    });
  };

  const setContainerMainAppearanceExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMainAppearanceExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMainAppearanceExpanded: next,
      });
      return next;
    });
  };

  const setContainerMainHeaderExpanded = (action: SetStateAction<boolean>) => {
    setContainerMainHeaderExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerMainHeaderExpanded: next });
      return next;
    });
  };

  const setContainerMainHeaderButtonsExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMainHeaderButtonsExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMainHeaderButtonsExpanded: next,
      });
      return next;
    });
  };

  const setContainerMainWorkspaceExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMainWorkspaceExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMainWorkspaceExpanded: next,
      });
      return next;
    });
  };

  const setContainerMetadataExpanded = (action: SetStateAction<boolean>) => {
    setContainerMetadataExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ containerMetadataExpanded: next });
      return next;
    });
  };

  const setContainerMetadataAppearanceExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMetadataAppearanceExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMetadataAppearanceExpanded: next,
      });
      return next;
    });
  };

  const setContainerMetadataHeaderExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMetadataHeaderExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMetadataHeaderExpanded: next,
      });
      return next;
    });
  };

  const setContainerMetadataHeaderButtonsExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMetadataHeaderButtonsExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMetadataHeaderButtonsExpanded: next,
      });
      return next;
    });
  };

  const setContainerSidebarMainExpanded = (action: SetStateAction<boolean>) => {
    setContainerSidebarMainExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerSidebarMainExpanded: next,
      });
      return next;
    });
  };

  const setContainerMainImageNameListExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setContainerMainImageNameListExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        containerMainImageNameListExpanded: next,
      });
      return next;
    });
  };

  const setLargePanelRootExpanded = (action: SetStateAction<boolean>) => {
    setLargePanelRootExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ largePanelRootExpanded: next });
      return next;
    });
  };

  const setLargePanelSharedSectionExpanded = (
    action: SetStateAction<boolean>,
  ) => {
    setLargePanelSharedSectionExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({
        largePanelSharedSectionExpanded: next,
      });
      return next;
    });
  };

  const setLargePanelHeadExpanded = (action: SetStateAction<boolean>) => {
    setLargePanelHeadExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ largePanelHeadExpanded: next });
      return next;
    });
  };

  const setLargePanelSideExpanded = (action: SetStateAction<boolean>) => {
    setLargePanelSideExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ largePanelSideExpanded: next });
      return next;
    });
  };

  const setLargePanelMainExpanded = (action: SetStateAction<boolean>) => {
    setLargePanelMainExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ largePanelMainExpanded: next });
      return next;
    });
  };

  const setLargePanelInternalExpanded = (action: SetStateAction<boolean>) => {
    setLargePanelInternalExpandedState((previous) => {
      const next = resolveNextState(action, previous);
      updateThemeParameterUiSessionState({ largePanelInternalExpanded: next });
      return next;
    });
  };

  const containerLayerParameters = useMemo(
    () => parameters.filter(isContainerLayerParameter),
    [parameters],
  );

  const filteredCommonParameters = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      return COMMON_PARAMETERS;
    }
    return COMMON_PARAMETERS.filter((parameter) =>
      includesSearch(resolveParameterLabel(parameter, t), keyword),
    );
  }, [searchText, t]);

  const filteredStyleParameters = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      return styleParameters;
    }
    return styleParameters.filter((parameter) =>
      includesSearch(resolveParameterLabel(parameter, t), keyword),
    );
  }, [searchText, styleParameters, t]);

  const buildSnapshotPayload = (options?: {
    includeComputedValues?: boolean;
    sourceValues?: ThemeParameterValues;
  }): ThemeParameterSnapshot => {
    const computed = getComputedStyle(document.documentElement);
    const includeComputedValues =
      options?.includeComputedValues ?? snapshotIncludeComputedValues;
    const sourceValues = options?.sourceValues ?? values;
    const valueEntries = parameters
      .filter(
        (parameter) =>
          includeComputedValues ||
          snapshotExplicitParameterIds.has(parameter.id),
      )
      .map(
        (parameter) =>
          [
            parameter.id,
            sourceValues[parameter.id] ?? parameter.read(computed),
          ] as const,
      );
    const snapshotValues = Object.fromEntries(valueEntries);

    return {
      version: 1,
      styleId,
      ...(Object.keys(snapshotValues).length > 0
        ? { values: snapshotValues }
        : {}),
      debugColors: Object.fromEntries(
        SNAPSHOT_COLOR_FIELDS.map((field) => [
          field.id,
          computed.getPropertyValue(field.cssVar).trim(),
        ]),
      ),
      debugTexts: Object.fromEntries(
        SNAPSHOT_TEXT_FIELDS.map((field) => [
          field.id,
          computed.getPropertyValue(field.cssVar).trim(),
        ]),
      ),
    };
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    wasOpenRef.current = true;
    syncedContainerRadiusOverridesRef.current = new Set();
    syncedContainerFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionBorderWidthOverridesRef.current = new Set();
    const root = document.documentElement;
    migrateLegacySidebarMainSlots(root);
    applyContainerDebugSessionState(root);
    const initialValues = readParameterValues(parameters);
    const computed = getComputedStyle(root);
    const uiSessionState = readThemeParameterUiSessionState();
    setActivePageState(uiSessionState.activePage);
    setCommonExpandedState(uiSessionState.commonExpanded);
    setStyleExpandedState(uiSessionState.styleExpanded);
    setContainerBackgroundExpandedState(
      uiSessionState.containerBackgroundExpanded,
    );
    setContainerSharedShellExpandedState(
      uiSessionState.containerSharedShellExpanded,
    );
    setContainerHeaderExpandedState(uiSessionState.containerHeaderExpanded);
    setContainerHeaderAppearanceExpandedState(
      uiSessionState.containerHeaderAppearanceExpanded,
    );
    setContainerHeaderButtonsExpandedState(
      uiSessionState.containerHeaderButtonsExpanded,
    );
    setContainerHeaderLogoExpandedState(
      uiSessionState.containerHeaderLogoExpanded,
    );
    setContainerHeaderG1ExpandedState(uiSessionState.containerHeaderG1Expanded);
    setContainerHeaderG2ExpandedState(uiSessionState.containerHeaderG2Expanded);
    setContainerHeaderGDebugExpandedState(
      uiSessionState.containerHeaderGDebugExpanded,
    );
    setContainerHeaderG3ExpandedState(uiSessionState.containerHeaderG3Expanded);
    setContainerSidebarExpandedState(uiSessionState.containerSidebarExpanded);
    setContainerSidebarAppearanceExpandedState(
      uiSessionState.containerSidebarAppearanceExpanded,
    );
    setContainerSidebarHeaderExpandedState(
      uiSessionState.containerSidebarHeaderExpanded,
    );
    setContainerSidebarHeaderTitleExpandedState(
      uiSessionState.containerSidebarHeaderTitleExpanded,
    );
    setContainerSidebarHeaderActionsExpandedState(
      uiSessionState.containerSidebarHeaderActionsExpanded,
    );
    setContainerMainExpandedState(uiSessionState.containerMainExpanded);
    setContainerMainAppearanceExpandedState(
      uiSessionState.containerMainAppearanceExpanded,
    );
    setContainerMainHeaderExpandedState(
      uiSessionState.containerMainHeaderExpanded,
    );
    setContainerMainHeaderButtonsExpandedState(
      uiSessionState.containerMainHeaderButtonsExpanded,
    );
    setContainerMetadataExpandedState(uiSessionState.containerMetadataExpanded);
    setContainerMetadataAppearanceExpandedState(
      uiSessionState.containerMetadataAppearanceExpanded,
    );
    setContainerMetadataHeaderExpandedState(
      uiSessionState.containerMetadataHeaderExpanded,
    );
    setContainerMetadataHeaderButtonsExpandedState(
      uiSessionState.containerMetadataHeaderButtonsExpanded,
    );
    setContainerSidebarMainExpandedState(
      uiSessionState.containerSidebarMainExpanded,
    );
    setContainerMainImageNameListExpandedState(
      uiSessionState.containerMainImageNameListExpanded,
    );
    setLargePanelRootExpandedState(uiSessionState.largePanelRootExpanded);
    setLargePanelSharedSectionExpandedState(
      uiSessionState.largePanelSharedSectionExpanded,
    );
    setLargePanelHeadExpandedState(uiSessionState.largePanelHeadExpanded);
    setLargePanelSideExpandedState(uiSessionState.largePanelSideExpanded);
    setLargePanelMainExpandedState(uiSessionState.largePanelMainExpanded);
    setLargePanelInternalExpandedState(
      uiSessionState.largePanelInternalExpanded,
    );
    setActivePreviewMode("none");
    setValues(initialValues);
    setSnapshotMessage("");
    setSnapshotExplicitParameterIds(new Set());
    snapshotBaselineRef.current = {
      version: 1,
      styleId,
      values: Object.fromEntries(
        parameters.map((parameter) => [
          parameter.id,
          initialValues[parameter.id] ?? parameter.read(computed),
        ]),
      ),
      debugColors: Object.fromEntries(
        SNAPSHOT_COLOR_FIELDS.map((field) => [
          field.id,
          computed.getPropertyValue(field.cssVar).trim(),
        ]),
      ),
      debugTexts: Object.fromEntries(
        SNAPSHOT_TEXT_FIELDS.map((field) => [
          field.id,
          computed.getPropertyValue(field.cssVar).trim(),
        ]),
      ),
    };
  }, [open, parameters, styleId]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const scrollTop =
      readThemeParameterUiSessionState().pageScrollTops[activePage] ?? 0;
    if (mainScrollElementRef.current) {
      mainScrollElementRef.current.scrollTop = scrollTop;
    }
  }, [activePage, open]);

  useEffect(() => {
    if (open) {
      return;
    }
    if (!wasOpenRef.current) {
      return;
    }
    const sessionState = readThemeParameterUiSessionState();
    const scrollTop =
      mainScrollElementRef.current?.scrollTop ??
      sessionState.pageScrollTops[activePage] ??
      0;
    captureContainerDebugSessionState(document.documentElement);
    writeThemeParameterUiSessionState({
      activePage,
      pageScrollTops: {
        ...sessionState.pageScrollTops,
        [activePage]: scrollTop,
      },
      containerBackgroundExpanded,
      containerSharedShellExpanded,
      containerHeaderExpanded,
      containerHeaderAppearanceExpanded,
      containerHeaderButtonsExpanded,
      containerHeaderLogoExpanded,
      containerHeaderG1Expanded,
      containerHeaderG2Expanded,
      containerHeaderGDebugExpanded,
      containerHeaderG3Expanded,
      containerSidebarExpanded,
      containerSidebarAppearanceExpanded,
      containerSidebarHeaderExpanded,
      containerSidebarHeaderTitleExpanded,
      containerSidebarHeaderActionsExpanded,
      containerMainExpanded,
      containerMainAppearanceExpanded,
      containerMainHeaderExpanded,
      containerMainHeaderButtonsExpanded,
      containerMainWorkspaceExpanded,
      containerMetadataExpanded,
      containerMetadataAppearanceExpanded,
      containerMetadataHeaderExpanded,
      containerMetadataHeaderButtonsExpanded,
      containerSidebarMainExpanded,
      containerMainImageNameListExpanded,
      largePanelRootExpanded,
      largePanelSharedSectionExpanded,
      largePanelHeadExpanded,
      largePanelSideExpanded,
      largePanelMainExpanded,
      largePanelInternalExpanded,
      commonExpanded,
      styleExpanded,
    });
    wasOpenRef.current = false;
  }, [
    activePage,
    commonExpanded,
    containerBackgroundExpanded,
    containerSharedShellExpanded,
    containerHeaderExpanded,
    containerHeaderAppearanceExpanded,
    containerHeaderButtonsExpanded,
    containerHeaderLogoExpanded,
    containerHeaderG1Expanded,
    containerHeaderG2Expanded,
    containerHeaderGDebugExpanded,
    containerHeaderG3Expanded,
    containerSidebarExpanded,
    containerSidebarAppearanceExpanded,
    containerSidebarHeaderExpanded,
    containerSidebarHeaderTitleExpanded,
    containerSidebarHeaderActionsExpanded,
    containerMainExpanded,
    containerMainAppearanceExpanded,
    containerMainHeaderExpanded,
    containerMainHeaderButtonsExpanded,
    containerMainWorkspaceExpanded,
    containerMetadataExpanded,
    containerMetadataAppearanceExpanded,
    containerMetadataHeaderExpanded,
    containerMetadataHeaderButtonsExpanded,
    containerMainImageNameListExpanded,
    containerSidebarMainExpanded,
    largePanelRootExpanded,
    largePanelSharedSectionExpanded,
    largePanelHeadExpanded,
    largePanelSideExpanded,
    largePanelMainExpanded,
    largePanelInternalExpanded,
    open,
    styleExpanded,
  ]);

  useEffect(() => {
    if (!open || activePreviewMode === "none") {
      document.documentElement.removeAttribute(PREVIEW_MODE_ATTR);
      return;
    }
    document.documentElement.setAttribute(PREVIEW_MODE_ATTR, activePreviewMode);
    return () => {
      document.documentElement.removeAttribute(PREVIEW_MODE_ATTR);
    };
  }, [activePreviewMode, open]);

  useEffect(() => {
    if (!open || hidden) {
      return;
    }
    const handlePanelReset = () => {
      handleResetToOpenState();
    };
    window.addEventListener(THEME_PARAMETER_RESET_EVENT, handlePanelReset);
    return () => {
      window.removeEventListener(THEME_PARAMETER_RESET_EVENT, handlePanelReset);
    };
  }, [hidden, open]);

  if (!open || hidden) {
    return null;
  }

  const panelA11y = buildA11yProps({
    id: "themeParameter.panel",
    labelKey: "a11y.themeParameter.panel",
    t,
  });
  const closeA11y = buildA11yProps({
    id: "themeParameter.close",
    labelKey: "a11y.themeParameter.close",
    titleKey: "tip.themeParameter.close",
    t,
  });
  const hideA11y = buildA11yProps({
    id: "themeParameter.hide",
    labelKey: "a11y.themeParameter.hide",
    titleKey: "tip.themeParameter.hide",
    t,
  });
  const resetA11y = buildA11yProps({
    id: "themeParameter.reset",
    labelKey: "a11y.themeParameter.reset",
    titleKey: "tip.themeParameter.reset",
    t,
  });

  const applyParameter = (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => {
    const nextValue = Math.max(
      parameter.min,
      Math.min(
        parameter.max,
        Number(
          (Math.round(rawValue / parameter.step) * parameter.step).toFixed(
            parameter.step < 1 ? 2 : 0,
          ),
        ),
      ),
    );
    const root = document.documentElement;
    const isContainerFrameRadius = parameter.id === "container-frame-radius";
    const isContainerFrameFillAngle =
      parameter.id === "container-frame-fill-angle";
    const isLargePanelSectionFillAngle =
      parameter.id === "large-panel-section-fill-angle";
    const isLargePanelSectionBorderWidth =
      parameter.id === "large-panel-section-border-width";
    setSnapshotExplicitParameterIds((previous) => {
      const next = new Set(previous);
      next.add(parameter.id);
      if (isContainerFrameRadius) {
        for (const parameterId of CONTAINER_RADIUS_SYNC_PARAMETER_IDS) {
          next.add(parameterId);
        }
      }
      if (isContainerFrameFillAngle) {
        for (const parameterId of CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS) {
          next.add(parameterId);
        }
      }
      if (isLargePanelSectionFillAngle) {
        for (const parameterId of LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS) {
          next.add(parameterId);
        }
      }
      if (isLargePanelSectionBorderWidth) {
        for (const parameterId of LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS) {
          next.add(parameterId);
        }
      }
      return next;
    });
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      };
      parameter.apply(root, nextValue, nextValues);
      if (isContainerFrameRadius) {
        if (syncedContainerRadiusOverridesRef.current.size === 0) {
          syncedContainerRadiusOverridesRef.current = new Set(
            CONTAINER_RADIUS_SYNC_PARAMETER_IDS,
          );
        }
        for (const parameterId of syncedContainerRadiusOverridesRef.current) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = nextValue;
          syncParameter.apply(root, nextValue, nextValues);
        }
      } else if (isContainerFrameFillAngle) {
        if (syncedContainerFillAngleOverridesRef.current.size === 0) {
          syncedContainerFillAngleOverridesRef.current = new Set(
            CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS,
          );
        }
        for (const parameterId of syncedContainerFillAngleOverridesRef.current) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = nextValue;
          syncParameter.apply(root, nextValue, nextValues);
        }
      } else if (isLargePanelSectionFillAngle) {
        if (syncedLargePanelSectionFillAngleOverridesRef.current.size === 0) {
          syncedLargePanelSectionFillAngleOverridesRef.current = new Set(
            LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS,
          );
        }
        for (const parameterId of syncedLargePanelSectionFillAngleOverridesRef.current) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = nextValue;
          syncParameter.apply(root, nextValue, nextValues);
        }
      } else if (isLargePanelSectionBorderWidth) {
        if (syncedLargePanelSectionBorderWidthOverridesRef.current.size === 0) {
          syncedLargePanelSectionBorderWidthOverridesRef.current = new Set(
            LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS,
          );
        }
        for (const parameterId of syncedLargePanelSectionBorderWidthOverridesRef.current) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = nextValue;
          syncParameter.apply(root, nextValue, nextValues);
        }
      } else if (
        CONTAINER_RADIUS_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof CONTAINER_RADIUS_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedContainerRadiusOverridesRef.current.delete(parameter.id);
      } else if (
        CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedContainerFillAngleOverridesRef.current.delete(parameter.id);
      } else if (
        LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedLargePanelSectionFillAngleOverridesRef.current.delete(
          parameter.id,
        );
      } else if (
        LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedLargePanelSectionBorderWidthOverridesRef.current.delete(
          parameter.id,
        );
      }
      return nextValues;
    });
  };

  const buildSnapshotJson = (): string => {
    return JSON.stringify(buildSnapshotPayload(), null, 2);
  };

  const exportSnapshotJson = () => {
    setSnapshotJson(buildSnapshotJson());
    setSnapshotMessage(t("ui.themeParameter.snapshotExported"));
  };

  const downloadSnapshotJson = () => {
    const snapshotText = buildSnapshotJson();
    setSnapshotJson(snapshotText);

    try {
      if (typeof URL.createObjectURL !== "function") {
        throw new Error("blob url unavailable");
      }
      const blob = new Blob([snapshotText], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const normalizedStyleId = styleId.replace(/[^a-zA-Z0-9-_]/g, "-");
      link.href = blobUrl;
      link.download = `theme-parameter-${normalizedStyleId}-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      setSnapshotMessage(t("ui.themeParameter.snapshotDownloaded"));
    } catch {
      setSnapshotMessage(t("ui.themeParameter.snapshotDownloadFailed"));
    }
  };

  const openSnapshotFilePicker = () => {
    snapshotFileInputRef.current?.click();
  };

  const loadSnapshotFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await readFileAsText(file);
      setSnapshotJson(text);
      setSnapshotMessage(
        t("ui.themeParameter.snapshotFileLoaded", { fileName: file.name }),
      );
    } catch {
      setSnapshotMessage(t("ui.themeParameter.snapshotFileLoadFailed"));
    } finally {
      event.target.value = "";
    }
  };

  const copySnapshotJson = async () => {
    if (!snapshotJson.trim()) {
      setSnapshotMessage(t("ui.themeParameter.snapshotEmpty"));
      return;
    }

    const copyText = async (text: string): Promise<boolean> => {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // noop
        }
      }

      if (typeof document === "undefined") {
        return false;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);

      try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      const copied = await copyText(snapshotJson);
      setSnapshotMessage(
        copied
          ? t("ui.themeParameter.snapshotCopied")
          : t("ui.themeParameter.snapshotCopyFailed"),
      );
    } catch {
      setSnapshotMessage(t("ui.themeParameter.snapshotCopyFailed"));
    }
  };

  const applySnapshotPayload = (
    payload: Partial<ThemeParameterSnapshot>,
    options?: {
      successMessageKey?: string;
      reportStyleMismatch?: boolean;
    },
  ) => {
    const hasValues = payload.values !== undefined;
    const hasDebugColors = payload.debugColors !== undefined;
    const hasDebugTexts = payload.debugTexts !== undefined;

    if (
      (!hasValues && !hasDebugColors && !hasDebugTexts) ||
      (hasValues &&
        (!payload.values ||
          typeof payload.values !== "object" ||
          Array.isArray(payload.values))) ||
      (hasDebugColors &&
        (!payload.debugColors ||
          typeof payload.debugColors !== "object" ||
          Array.isArray(payload.debugColors))) ||
      (hasDebugTexts &&
        (!payload.debugTexts ||
          typeof payload.debugTexts !== "object" ||
          Array.isArray(payload.debugTexts)))
    ) {
      setSnapshotMessage(t("ui.themeParameter.snapshotImportFailed"));
      return false;
    }

    const importedValues = (payload.values ?? {}) as Record<string, unknown>;
    const root = document.documentElement;
    const nextValues: ThemeParameterValues = { ...values };
    const importedParameterIds = new Set<string>();
    syncedContainerRadiusOverridesRef.current = new Set();
    syncedContainerFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionBorderWidthOverridesRef.current = new Set();
    for (const parameter of parameters) {
      const rawValue = importedValues[parameter.id];
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        continue;
      }
      const normalized = Math.max(
        parameter.min,
        Math.min(
          parameter.max,
          Number(
            (Math.round(rawValue / parameter.step) * parameter.step).toFixed(
              parameter.step < 1 ? 2 : 0,
            ),
          ),
        ),
      );
      nextValues[parameter.id] = normalized;
      importedParameterIds.add(parameter.id);
      parameter.apply(root, normalized, nextValues);
      if (parameter.id === "container-frame-radius") {
        syncedContainerRadiusOverridesRef.current = new Set(
          CONTAINER_RADIUS_SYNC_PARAMETER_IDS,
        );
        for (const parameterId of syncedContainerRadiusOverridesRef.current) {
          if (
            typeof importedValues[parameterId] === "number" &&
            Number.isFinite(importedValues[parameterId])
          ) {
            continue;
          }
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = normalized;
          importedParameterIds.add(parameterId);
          syncParameter.apply(root, normalized, nextValues);
        }
      } else if (parameter.id === "container-frame-fill-angle") {
        syncedContainerFillAngleOverridesRef.current = new Set(
          CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS,
        );
        for (const parameterId of syncedContainerFillAngleOverridesRef.current) {
          if (
            typeof importedValues[parameterId] === "number" &&
            Number.isFinite(importedValues[parameterId])
          ) {
            continue;
          }
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = normalized;
          importedParameterIds.add(parameterId);
          syncParameter.apply(root, normalized, nextValues);
        }
      } else if (parameter.id === "large-panel-section-fill-angle") {
        syncedLargePanelSectionFillAngleOverridesRef.current = new Set(
          LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS,
        );
        for (const parameterId of syncedLargePanelSectionFillAngleOverridesRef.current) {
          if (
            typeof importedValues[parameterId] === "number" &&
            Number.isFinite(importedValues[parameterId])
          ) {
            continue;
          }
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = normalized;
          importedParameterIds.add(parameterId);
          syncParameter.apply(root, normalized, nextValues);
        }
      } else if (parameter.id === "large-panel-section-border-width") {
        syncedLargePanelSectionBorderWidthOverridesRef.current = new Set(
          LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS,
        );
        for (const parameterId of syncedLargePanelSectionBorderWidthOverridesRef.current) {
          if (
            typeof importedValues[parameterId] === "number" &&
            Number.isFinite(importedValues[parameterId])
          ) {
            continue;
          }
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = normalized;
          importedParameterIds.add(parameterId);
          syncParameter.apply(root, normalized, nextValues);
        }
      } else if (
        CONTAINER_RADIUS_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof CONTAINER_RADIUS_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedContainerRadiusOverridesRef.current.delete(parameter.id);
      } else if (
        CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedContainerFillAngleOverridesRef.current.delete(parameter.id);
      } else if (
        LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedLargePanelSectionFillAngleOverridesRef.current.delete(
          parameter.id,
        );
      } else if (
        LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS.includes(
          parameter.id as (typeof LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS)[number],
        )
      ) {
        syncedLargePanelSectionBorderWidthOverridesRef.current.delete(
          parameter.id,
        );
      }
    }
    if (payload.debugColors && typeof payload.debugColors === "object") {
      const debugColors = payload.debugColors as Record<string, unknown>;
      for (const field of SNAPSHOT_COLOR_FIELDS) {
        const rawColor = debugColors[field.id];
        if (typeof rawColor !== "string") {
          continue;
        }
        const normalizedColor = rawColor.trim();
        if (!normalizedColor) {
          root.style.removeProperty(field.cssVar);
          continue;
        }
        root.style.setProperty(field.cssVar, normalizedColor);
      }
    }
    if (payload.debugTexts && typeof payload.debugTexts === "object") {
      const debugTexts = payload.debugTexts as Record<string, unknown>;
      for (const field of SNAPSHOT_TEXT_FIELDS) {
        const rawText = debugTexts[field.id];
        if (typeof rawText !== "string") {
          continue;
        }
        if (!rawText.trim()) {
          root.style.removeProperty(field.cssVar);
          continue;
        }
        root.style.setProperty(field.cssVar, rawText);
      }
    }
    setValues(nextValues);
    if (importedParameterIds.size > 0) {
      setSnapshotExplicitParameterIds((previous) => {
        const next = new Set(previous);
        for (const parameterId of importedParameterIds) {
          next.add(parameterId);
        }
        return next;
      });
    }
    if (payload.styleId && payload.styleId !== styleId) {
      if (options?.reportStyleMismatch !== false) {
        setSnapshotMessage(
          t("ui.themeParameter.snapshotImportedStyleMismatch", {
            styleId: payload.styleId,
          }),
        );
      }
      return false;
    }
    setSnapshotMessage(
      t(options?.successMessageKey ?? "ui.themeParameter.snapshotImported"),
    );
    return true;
  };

  const importSnapshotJson = () => {
    if (!snapshotJson.trim()) {
      setSnapshotMessage(t("ui.themeParameter.snapshotEmpty"));
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(snapshotJson);
    } catch {
      setSnapshotMessage(t("ui.themeParameter.snapshotImportFailed"));
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setSnapshotMessage(t("ui.themeParameter.snapshotImportFailed"));
      return;
    }
    applySnapshotPayload(parsed as Partial<ThemeParameterSnapshot>, {
      reportStyleMismatch: true,
    });
  };

  const resetSnapshotToBaseline = () => {
    const baseline = snapshotBaselineRef.current;
    if (!baseline) {
      setSnapshotMessage(t("ui.themeParameter.snapshotImportFailed"));
      return;
    }
    setSnapshotJson(JSON.stringify(baseline, null, 2));
    applySnapshotPayload(baseline, {
      successMessageKey: "ui.themeParameter.snapshotResetToOpenState",
      reportStyleMismatch: false,
    });
  };

  const isParameterChanged = (parameter: ThemeParameterDefinition): boolean => {
    if (parameter.cssVarName) {
      return (
        document.documentElement.style
          .getPropertyValue(parameter.cssVarName)
          .trim().length > 0
      );
    }
    const value = values[parameter.id] ?? parameter.fallback;
    return Math.abs(value - parameter.fallback) > 1e-6;
  };

  const resetSingleParameter = (parameter: ThemeParameterDefinition) => {
    const root = document.documentElement;
    const isContainerFrameRadius = parameter.id === "container-frame-radius";
    const isContainerFrameFillAngle =
      parameter.id === "container-frame-fill-angle";
    const isLargePanelSectionFillAngle =
      parameter.id === "large-panel-section-fill-angle";
    const isLargePanelSectionBorderWidth =
      parameter.id === "large-panel-section-border-width";
    if (isContainerFrameRadius) {
      const syncedIds = Array.from(syncedContainerRadiusOverridesRef.current);
      parameter.reset(root);
      for (const parameterId of syncedIds) {
        parameterMap.get(parameterId)?.reset(root);
      }
      const computed = getComputedStyle(root);
      setValues((previous) => {
        const nextValues = {
          ...previous,
          [parameter.id]: parameter.read(computed),
        };
        for (const parameterId of syncedIds) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = syncParameter.read(computed);
        }
        return nextValues;
      });
      setSnapshotExplicitParameterIds((previous) => {
        const next = new Set(previous);
        next.delete(parameter.id);
        for (const parameterId of syncedIds) {
          next.delete(parameterId);
        }
        return next;
      });
      syncedContainerRadiusOverridesRef.current = new Set();
      return;
    }
    if (isContainerFrameFillAngle) {
      const syncedIds = Array.from(
        syncedContainerFillAngleOverridesRef.current,
      );
      parameter.reset(root);
      for (const parameterId of syncedIds) {
        parameterMap.get(parameterId)?.reset(root);
      }
      const computed = getComputedStyle(root);
      setValues((previous) => {
        const nextValues = {
          ...previous,
          [parameter.id]: parameter.read(computed),
        };
        for (const parameterId of syncedIds) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = syncParameter.read(computed);
        }
        return nextValues;
      });
      setSnapshotExplicitParameterIds((previous) => {
        const next = new Set(previous);
        next.delete(parameter.id);
        for (const parameterId of syncedIds) {
          next.delete(parameterId);
        }
        return next;
      });
      syncedContainerFillAngleOverridesRef.current = new Set();
      return;
    }
    if (isLargePanelSectionFillAngle) {
      const syncedIds = Array.from(
        syncedLargePanelSectionFillAngleOverridesRef.current,
      );
      parameter.reset(root);
      for (const parameterId of syncedIds) {
        parameterMap.get(parameterId)?.reset(root);
      }
      const computed = getComputedStyle(root);
      setValues((previous) => {
        const nextValues = {
          ...previous,
          [parameter.id]: parameter.read(computed),
        };
        for (const parameterId of syncedIds) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = syncParameter.read(computed);
        }
        return nextValues;
      });
      setSnapshotExplicitParameterIds((previous) => {
        const next = new Set(previous);
        next.delete(parameter.id);
        for (const parameterId of syncedIds) {
          next.delete(parameterId);
        }
        return next;
      });
      syncedLargePanelSectionFillAngleOverridesRef.current = new Set();
      return;
    }
    if (isLargePanelSectionBorderWidth) {
      const syncedIds = Array.from(
        syncedLargePanelSectionBorderWidthOverridesRef.current,
      );
      parameter.reset(root);
      for (const parameterId of syncedIds) {
        parameterMap.get(parameterId)?.reset(root);
      }
      const computed = getComputedStyle(root);
      setValues((previous) => {
        const nextValues = {
          ...previous,
          [parameter.id]: parameter.read(computed),
        };
        for (const parameterId of syncedIds) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = syncParameter.read(computed);
        }
        return nextValues;
      });
      setSnapshotExplicitParameterIds((previous) => {
        const next = new Set(previous);
        next.delete(parameter.id);
        for (const parameterId of syncedIds) {
          next.delete(parameterId);
        }
        return next;
      });
      syncedLargePanelSectionBorderWidthOverridesRef.current = new Set();
      return;
    }
    parameter.reset(root);
    const computed = getComputedStyle(root);
    const nextValue = parameter.read(computed);
    setValues((previous) => ({
      ...previous,
      [parameter.id]: nextValue,
    }));
    setSnapshotExplicitParameterIds((previous) => {
      const next = new Set(previous);
      next.delete(parameter.id);
      return next;
    });
    if (
      CONTAINER_RADIUS_SYNC_PARAMETER_IDS.includes(
        parameter.id as (typeof CONTAINER_RADIUS_SYNC_PARAMETER_IDS)[number],
      )
    ) {
      syncedContainerRadiusOverridesRef.current.delete(parameter.id);
    }
    if (
      CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
        parameter.id as (typeof CONTAINER_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
      )
    ) {
      syncedContainerFillAngleOverridesRef.current.delete(parameter.id);
    }
    if (
      LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS.includes(
        parameter.id as (typeof LARGE_PANEL_SECTION_FILL_ANGLE_SYNC_PARAMETER_IDS)[number],
      )
    ) {
      syncedLargePanelSectionFillAngleOverridesRef.current.delete(parameter.id);
    }
    if (
      LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS.includes(
        parameter.id as (typeof LARGE_PANEL_SECTION_BORDER_WIDTH_SYNC_PARAMETER_IDS)[number],
      )
    ) {
      syncedLargePanelSectionBorderWidthOverridesRef.current.delete(
        parameter.id,
      );
    }
  };

  const resolveLabel = (parameter: ThemeParameterDefinition): string => {
    return resolveParameterLabel(parameter, t);
  };

  const togglePreviewMode = (
    mode: Exclude<ThemeParameterPreviewMode, "none">,
  ) => {
    setActivePreviewMode((previous) => (previous === mode ? "none" : mode));
  };

  const handleContainerDebugChanged = () => {
    captureContainerDebugSessionState(document.documentElement);
  };

  const handleResetToOpenState = () => {
    clearContainerDebugSessionState();
    syncedContainerRadiusOverridesRef.current = new Set();
    syncedContainerFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionFillAngleOverridesRef.current = new Set();
    syncedLargePanelSectionBorderWidthOverridesRef.current = new Set();
    resetSnapshotToBaseline();
  };

  return (
    <div
      {...panelA11y}
      className="settings-mask"
      data-slot="fg-header-g3-theme-parameter-root-ovl"
      role="dialog"
      aria-modal="true"
      data-overlay-close="theme-parameter"
    >
      {activePreviewMode === "bg-plus-large-panel" ? (
        <div
          className="theme-debug-large-panel-preview-layer"
          aria-hidden="true"
        >
          <section className="mpx-large-panel theme-debug-large-panel-preview">
            <header className="mpx-large-panel-head theme-debug-large-panel-preview-head">
              <span className="mpx-large-panel-head-spacer settings-head-spacer" />
              <h3 className="theme-debug-large-panel-preview-head-title">
                {t("ui.themeParameter.panel")}
              </h3>
              <span className="theme-debug-large-panel-preview-head-action">
                Debug
              </span>
            </header>
            <div className="mpx-large-panel-shell theme-debug-large-panel-preview-shell">
              <aside className="mpx-large-panel-side theme-debug-large-panel-preview-side">
                <div className="theme-debug-large-panel-preview-item" />
                <div className="theme-debug-large-panel-preview-item" />
                <div className="theme-debug-large-panel-preview-item" />
              </aside>
              <main className="mpx-large-panel-main theme-debug-large-panel-preview-main">
                <article className="theme-debug-large-panel-preview-card">
                  <h4 className="theme-debug-large-panel-preview-card-title">
                    Preview Content
                  </h4>
                  <div className="theme-debug-large-panel-preview-card-line" />
                  <div className="theme-debug-large-panel-preview-card-line" />
                  <div className="theme-debug-large-panel-preview-card-line is-short" />
                </article>
              </main>
            </div>
          </section>
        </div>
      ) : null}
      {activePreviewMode === "bg-plus-small-panel" ? (
        <div
          className="theme-debug-small-panel-preview-layer"
          aria-hidden="true"
        >
          <section className="mpx-dialog-panel theme-debug-small-panel-preview">
            <h3>Dialog Preview</h3>
            <div className="theme-debug-small-panel-preview-content" />
            <div className="theme-debug-small-panel-preview-actions" />
          </section>
        </div>
      ) : null}
      <section
        className={`mpx-large-panel mpx-large-panel--theme-parameter settings-panel theme-parameter-panel ${panelDragging ? "is-dragging" : ""}`}
        data-slot="fg-header-g3-theme-parameter-root-panel"
        style={{
          fontSize: `${settingsFontSize}px`,
          transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)`,
        }}
      >
        <div
          className="mpx-large-panel-head settings-head settings-head-draggable"
          {...headHandlers}
        >
          <span
            className="mpx-large-panel-head-spacer settings-head-spacer"
            aria-hidden="true"
          />
          <h2 style={{ color: "var(--mpx-large-panel-head-text, inherit)" }}>
            {t("ui.themeParameter.panel")}
          </h2>
          <div className="settings-head-actions">
            <button
              {...resetA11y}
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              onClick={handleResetToOpenState}
            >
              <MainUiIcon name="refresh" />
            </button>
            <button
              {...hideA11y}
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              onClick={onHide}
            >
              <MainUiIcon name="hidden" />
            </button>
            <button
              {...closeA11y}
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              onClick={onClose}
            >
              <MainUiIcon name="close" />
            </button>
          </div>
        </div>

        <ThemeParameterPanelMain
          t={t}
          styleId={styleId}
          activePage={activePage}
          setActivePage={setActivePage}
          activePreviewMode={activePreviewMode}
          togglePreviewMode={togglePreviewMode}
          searchText={searchText}
          setSearchText={setSearchText}
          snapshotJson={snapshotJson}
          setSnapshotJson={setSnapshotJson}
          snapshotIncludeComputedValues={snapshotIncludeComputedValues}
          setSnapshotIncludeComputedValues={setSnapshotIncludeComputedValues}
          snapshotMessage={snapshotMessage}
          setSnapshotMessage={setSnapshotMessage}
          snapshotFileInputRef={snapshotFileInputRef}
          loadSnapshotFile={loadSnapshotFile}
          exportSnapshotJson={exportSnapshotJson}
          downloadSnapshotJson={downloadSnapshotJson}
          openSnapshotFilePicker={openSnapshotFilePicker}
          copySnapshotJson={copySnapshotJson}
          importSnapshotJson={importSnapshotJson}
          setMainScrollElement={(element) => {
            mainScrollElementRef.current = element;
          }}
          onMainScroll={() => {
            capturePageScrollTop(activePage);
          }}
          commonExpanded={commonExpanded}
          setCommonExpanded={setCommonExpanded}
          styleExpanded={styleExpanded}
          setStyleExpanded={setStyleExpanded}
          containerBackgroundExpanded={containerBackgroundExpanded}
          setContainerBackgroundExpanded={setContainerBackgroundExpanded}
          containerSharedShellExpanded={containerSharedShellExpanded}
          setContainerSharedShellExpanded={setContainerSharedShellExpanded}
          containerHeaderExpanded={containerHeaderExpanded}
          setContainerHeaderExpanded={setContainerHeaderExpanded}
          containerHeaderAppearanceExpanded={containerHeaderAppearanceExpanded}
          setContainerHeaderAppearanceExpanded={
            setContainerHeaderAppearanceExpanded
          }
          containerHeaderButtonsExpanded={containerHeaderButtonsExpanded}
          setContainerHeaderButtonsExpanded={setContainerHeaderButtonsExpanded}
          containerHeaderLogoExpanded={containerHeaderLogoExpanded}
          setContainerHeaderLogoExpanded={setContainerHeaderLogoExpanded}
          containerHeaderG1Expanded={containerHeaderG1Expanded}
          setContainerHeaderG1Expanded={setContainerHeaderG1Expanded}
          containerHeaderG2Expanded={containerHeaderG2Expanded}
          setContainerHeaderG2Expanded={setContainerHeaderG2Expanded}
          containerHeaderGDebugExpanded={containerHeaderGDebugExpanded}
          setContainerHeaderGDebugExpanded={setContainerHeaderGDebugExpanded}
          containerHeaderG3Expanded={containerHeaderG3Expanded}
          setContainerHeaderG3Expanded={setContainerHeaderG3Expanded}
          containerSidebarExpanded={containerSidebarExpanded}
          setContainerSidebarExpanded={setContainerSidebarExpanded}
          containerSidebarAppearanceExpanded={
            containerSidebarAppearanceExpanded
          }
          setContainerSidebarAppearanceExpanded={
            setContainerSidebarAppearanceExpanded
          }
          containerSidebarHeaderExpanded={containerSidebarHeaderExpanded}
          setContainerSidebarHeaderExpanded={setContainerSidebarHeaderExpanded}
          containerSidebarHeaderTitleExpanded={
            containerSidebarHeaderTitleExpanded
          }
          setContainerSidebarHeaderTitleExpanded={
            setContainerSidebarHeaderTitleExpanded
          }
          containerSidebarHeaderActionsExpanded={
            containerSidebarHeaderActionsExpanded
          }
          setContainerSidebarHeaderActionsExpanded={
            setContainerSidebarHeaderActionsExpanded
          }
          containerMainExpanded={containerMainExpanded}
          setContainerMainExpanded={setContainerMainExpanded}
          containerMainAppearanceExpanded={containerMainAppearanceExpanded}
          setContainerMainAppearanceExpanded={
            setContainerMainAppearanceExpanded
          }
          containerMainHeaderExpanded={containerMainHeaderExpanded}
          setContainerMainHeaderExpanded={setContainerMainHeaderExpanded}
          containerMainHeaderButtonsExpanded={
            containerMainHeaderButtonsExpanded
          }
          setContainerMainHeaderButtonsExpanded={
            setContainerMainHeaderButtonsExpanded
          }
          containerMainWorkspaceExpanded={containerMainWorkspaceExpanded}
          setContainerMainWorkspaceExpanded={setContainerMainWorkspaceExpanded}
          containerMetadataExpanded={containerMetadataExpanded}
          setContainerMetadataExpanded={setContainerMetadataExpanded}
          containerMetadataAppearanceExpanded={
            containerMetadataAppearanceExpanded
          }
          setContainerMetadataAppearanceExpanded={
            setContainerMetadataAppearanceExpanded
          }
          containerMetadataHeaderExpanded={containerMetadataHeaderExpanded}
          setContainerMetadataHeaderExpanded={
            setContainerMetadataHeaderExpanded
          }
          containerMetadataHeaderButtonsExpanded={
            containerMetadataHeaderButtonsExpanded
          }
          setContainerMetadataHeaderButtonsExpanded={
            setContainerMetadataHeaderButtonsExpanded
          }
          containerSidebarMainExpanded={containerSidebarMainExpanded}
          setContainerSidebarMainExpanded={setContainerSidebarMainExpanded}
          containerMainImageNameListExpanded={
            containerMainImageNameListExpanded
          }
          setContainerMainImageNameListExpanded={
            setContainerMainImageNameListExpanded
          }
          largePanelRootExpanded={largePanelRootExpanded}
          setLargePanelRootExpanded={setLargePanelRootExpanded}
          largePanelSharedSectionExpanded={largePanelSharedSectionExpanded}
          setLargePanelSharedSectionExpanded={
            setLargePanelSharedSectionExpanded
          }
          largePanelHeadExpanded={largePanelHeadExpanded}
          setLargePanelHeadExpanded={setLargePanelHeadExpanded}
          largePanelSideExpanded={largePanelSideExpanded}
          setLargePanelSideExpanded={setLargePanelSideExpanded}
          largePanelMainExpanded={largePanelMainExpanded}
          setLargePanelMainExpanded={setLargePanelMainExpanded}
          largePanelInternalExpanded={largePanelInternalExpanded}
          setLargePanelInternalExpanded={setLargePanelInternalExpanded}
          filteredCommonParameters={filteredCommonParameters}
          filteredStyleParameters={filteredStyleParameters}
          styleParameters={styleParameters}
          containerLayerParameters={containerLayerParameters}
          largePanelLayerParameters={LARGE_PANEL_PARAMETERS}
          smallPanelLayerParameters={SMALL_PANEL_PARAMETERS}
          values={values}
          applyParameter={applyParameter}
          isParameterChanged={isParameterChanged}
          resetSingleParameter={resetSingleParameter}
          resolveLabel={resolveLabel}
          onContainerDebugChanged={handleContainerDebugChanged}
        />
      </section>
    </div>
  );
}

export type { ThemeParameterDefinition, ThemeParameterValues };

export default ThemeParameterPanel;
