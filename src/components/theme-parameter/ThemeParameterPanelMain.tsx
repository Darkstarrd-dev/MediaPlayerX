import type {
  ChangeEvent,
  CSSProperties,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useState } from "react";
import { SkeuoRunway } from "../primitives/SkeuoRunway";

import {
  formatBoxShadowValue,
  formatColorStateAsCss,
  formatSimpleFilterFunction,
  formatSimpleLinearGradient,
  formatValue,
  parseBoxShadowValue,
  parseColorState,
  parseSimpleFilterFunction,
  parseSimpleLinearGradient,
  readCssColorState,
  type BoxShadowLayerValue,
  type ColorState,
  type SimpleFilterFunctionValue,
  type SimpleLinearGradientValue,
} from "./themeParameterUtils";
import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";

interface ThemeParameterPanelMainProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  styleId: string;
  activePage: ThemeParameterPageId;
  setActivePage: Dispatch<SetStateAction<ThemeParameterPageId>>;
  activePreviewMode: ThemeParameterPreviewMode;
  togglePreviewMode: (mode: Exclude<ThemeParameterPreviewMode, "none">) => void;
  searchText: string;
  setSearchText: Dispatch<SetStateAction<string>>;
  snapshotJson: string;
  setSnapshotJson: Dispatch<SetStateAction<string>>;
  snapshotIncludeComputedValues: boolean;
  setSnapshotIncludeComputedValues: Dispatch<SetStateAction<boolean>>;
  snapshotMessage: string;
  setSnapshotMessage: Dispatch<SetStateAction<string>>;
  snapshotFileInputRef: MutableRefObject<HTMLInputElement | null>;
  loadSnapshotFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportSnapshotJson: () => void;
  downloadSnapshotJson: () => void;
  openSnapshotFilePicker: () => void;
  copySnapshotJson: () => Promise<void>;
  importSnapshotJson: () => void;
  onContainerDebugChanged: () => void;
  setMainScrollElement: (element: HTMLElement | null) => void;
  onMainScroll: () => void;
  commonExpanded: boolean;
  setCommonExpanded: Dispatch<SetStateAction<boolean>>;
  styleExpanded: boolean;
  setStyleExpanded: Dispatch<SetStateAction<boolean>>;
  containerLegacyExpanded: boolean;
  setContainerLegacyExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarMainExpanded: boolean;
  setContainerSidebarMainExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainImageNameListExpanded: boolean;
  setContainerMainImageNameListExpanded: Dispatch<SetStateAction<boolean>>;
  filteredCommonParameters: ThemeParameterDefinition[];
  filteredStyleParameters: ThemeParameterDefinition[];
  styleParameters: ThemeParameterDefinition[];
  containerLayerParameters: ThemeParameterDefinition[];
  largePanelLayerParameters: ThemeParameterDefinition[];
  smallPanelLayerParameters: ThemeParameterDefinition[];
  values: ThemeParameterValues;
  applyParameter: (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => void;
  isParameterChanged: (parameter: ThemeParameterDefinition) => boolean;
  resetSingleParameter: (parameter: ThemeParameterDefinition) => void;
  resolveLabel: (parameter: ThemeParameterDefinition) => string;
}

export type ThemeParameterPageId =
  | "parameters"
  | "snapshot"
  | "containerLayer"
  | "largePanelLayer"
  | "smallPanelLayer"
  | "commonControls"
  | "buttonStates";

export type ThemeParameterPreviewMode =
  | "none"
  | "bg-only"
  | "bg-plus-container"
  | "bg-plus-large-panel"
  | "bg-plus-small-panel";

type ThemeDebugNumberGroupId =
  | "box"
  | "border"
  | "shadow"
  | "root"
  | "head"
  | "shell"
  | "side"
  | "main";

type ThemeControlSectionId =
  | "control-scrollbar"
  | "control-slider-base"
  | "control-slider-player"
  | "control-slider-vertical"
  | "control-slider-settings";

interface ThemeDebugColorField {
  id: string;
  cssVar: string;
  fallback: string;
  fallbackAlpha?: number;
  groupId: ThemeDebugNumberGroupId;
  sectionId?: ThemeControlSectionId;
}

interface ThemeDebugTextField {
  id: string;
  cssVar: string;
  fallback: string;
  groupId: ThemeDebugNumberGroupId;
  sectionId?: ThemeControlSectionId;
}

interface ControlPreviewValues {
  sliderBaseHorizontal: number;
  sliderPlayerProgress: number;
  sliderVerticalReference: number;
  sliderVerticalUp: number;
  sliderVerticalDown: number;
  sliderSettingsHorizontal: number;
}

interface SidebarMainDebugSection {
  id: string;
  title: string;
  tag: string;
  cssVars: readonly string[];
}

interface MainImageNameListDebugSection {
  id: string;
  title: string;
  tag: string;
  cssVars: readonly string[];
}

type ButtonStateKey =
  | "idle"
  | "hover"
  | "active"
  | "selected"
  | "pressed"
  | "disabled"
  | "pending"
  | "close-hover";

const CONTAINER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-bg-app",
    cssVar: "--mpx-bg-app",
    fallback: "#f2eee7",
    groupId: "box",
  },
  {
    id: "container-bg-workspace",
    cssVar: "--mpx-bg-workspace",
    fallback: "#f3f0ea",
    groupId: "box",
  },
  {
    id: "container-bg-panel",
    cssVar: "--mpx-bg-panel",
    fallback: "#fbf8f3",
    groupId: "box",
  },
  {
    id: "container-bg-elevated",
    cssVar: "--mpx-bg-elevated",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "container-metal-light",
    cssVar: "--mpx-metal-light",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-metal-base",
    cssVar: "--mpx-metal-base",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-metal-dark",
    cssVar: "--mpx-metal-dark",
    fallback: "#cdc7bb",
    groupId: "shadow",
  },
  {
    id: "container-border-1",
    cssVar: "--mpx-border-1",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "container-border-2",
    cssVar: "--mpx-border-2",
    fallback: "#b7ab95",
    groupId: "border",
  },
];

const CONTAINER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-surface-chrome-shell-shadow",
    cssVar: "--mpx-surface-chrome-shell-shadow",
    fallback:
      "2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15), 0 0 0 1px color-mix(in srgb, var(--mpx-metal-dark) 60%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-metal-light) 50%, transparent)",
    groupId: "shadow",
  },
];

const CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-sidebar-main-bg",
    cssVar: "--mpx-sidebar-main-bg",
    fallback: "#000000",
    fallbackAlpha: 1,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-text",
    cssVar: "--mpx-sidebar-main-label-text",
    fallback: "#30271d",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-border",
    cssVar: "--mpx-sidebar-main-label-border",
    fallback: "#bcc1c9",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-border",
    cssVar: "--mpx-sidebar-main-label-plain-border",
    fallback: "#d5d0c8",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-bg",
    cssVar: "--mpx-sidebar-main-label-active-bg",
    fallback: "#2d6e7d",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-collapsed-active-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-active-bg",
    fallback: "#f2d796",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-expanded-active-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-active-bg",
    fallback: "#f2d796",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-active-bg",
    cssVar: "--mpx-sidebar-main-label-plain-active-bg",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-ring",
    cssVar: "--mpx-sidebar-main-active-ring",
    fallback: "#2d6e7d",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-underlay",
    cssVar: "--mpx-sidebar-main-active-underlay",
    fallback: "#e6e2da",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-marker-focus-bg",
    fallback: "#2d6e7d",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-collapsed-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-marker-focus-bg",
    fallback: "#f2d796",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-expanded-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-marker-focus-bg",
    fallback: "#f2d796",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-plain-marker-focus-bg",
    fallback: "#f2d796",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-marker-selected-bg",
    fallback: "#9a885f",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-collapsed-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-marker-selected-bg",
    fallback: "#8a919a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-expanded-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-marker-selected-bg",
    fallback: "#8a919a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-plain-marker-selected-bg",
    fallback: "#8a919a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-manage-selected-bg",
    fallback: "#9a885f",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-collapsed-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-manage-selected-bg",
    fallback: "#8a919a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-expanded-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-manage-selected-bg",
    fallback: "#8a919a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-plain-manage-selected-bg",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-toggle-text",
    cssVar: "--mpx-sidebar-main-label-toggle-text",
    fallback: "#5b4f3f",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-text",
    cssVar: "--mpx-sidebar-main-count-text",
    fallback: "#000000",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-border",
    cssVar: "--mpx-sidebar-main-count-border",
    fallback: "#bcc4cf",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-bg",
    cssVar: "--mpx-sidebar-main-count-bg",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-packages-text",
    cssVar: "--mpx-sidebar-main-count-packages-text",
    fallback: "#2d6e7d",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-packages-border",
    cssVar: "--mpx-sidebar-main-count-packages-border",
    fallback: "#d8cba8",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-packages-bg",
    cssVar: "--mpx-sidebar-main-count-packages-bg",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-images-text",
    cssVar: "--mpx-sidebar-main-count-images-text",
    fallback: "#4ea87c",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-images-border",
    cssVar: "--mpx-sidebar-main-count-images-border",
    fallback: "#4ea87c",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-images-bg",
    cssVar: "--mpx-sidebar-main-count-images-bg",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-main-bullet-pending-bg",
    cssVar: "--mpx-sidebar-main-bullet-pending-bg",
    fallback: "#98836a",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-bullet-running-bg",
    cssVar: "--mpx-sidebar-main-bullet-running-bg",
    fallback: "#4ea87c",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-bullet-running-ring",
    cssVar: "--mpx-sidebar-main-bullet-running-ring",
    fallback: "#93b4bc",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-bullet-active-bg",
    cssVar: "--mpx-sidebar-main-bullet-active-bg",
    fallback: "#2d6e7d",
    groupId: "side",
  },
];

const CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-sidebar-main-label-bg",
    cssVar: "--mpx-sidebar-main-label-bg",
    fallback: "linear-gradient(135deg, #e4e6ea, #c8ccd3)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-shadow",
    cssVar: "--mpx-sidebar-main-label-shadow",
    fallback: "0 2px 4px rgba(150, 140, 130, 0.2), inset 0 1px 0 #ffffff",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-hover-filter",
    cssVar: "--mpx-sidebar-main-label-hover-filter",
    fallback: "brightness(0.97)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-collapsed-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-bg",
    fallback: "linear-gradient(135deg, #ede6d6, #ddd4bf)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-expanded-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-bg",
    fallback: "linear-gradient(135deg, #f8f4eb, #ede6d6)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-plain-bg",
    cssVar: "--mpx-sidebar-main-label-plain-bg",
    fallback: "linear-gradient(135deg, #f3f0ea, #e9e5de)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-shadow",
    cssVar: "--mpx-sidebar-main-label-active-shadow",
    fallback: "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-hover-shadow",
    cssVar: "--mpx-sidebar-main-label-active-hover-shadow",
    fallback: "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-manage-selected-shadow",
    cssVar: "--mpx-sidebar-main-label-manage-selected-shadow",
    fallback: "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-shadow",
    cssVar: "--mpx-sidebar-main-count-shadow",
    fallback: "var(--mpx-runway-groove-shadow)",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-count-packages-shadow",
    cssVar: "--mpx-sidebar-main-count-packages-shadow",
    fallback:
      "inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 1)",
    groupId: "side",
  },
];

const SIDEBAR_MAIN_DEBUG_SECTIONS: readonly SidebarMainDebugSection[] = [
  {
    id: "sidebar-main-shell",
    title: "1、sidebar-main 本体与容器链路",
    tag: "容器",
    cssVars: [
      "--mpx-sidebar-main-bg",
      "--mpx-sidebar-main-label-text",
      "--mpx-sidebar-main-label-border",
      "--mpx-sidebar-main-label-bg",
      "--mpx-sidebar-main-label-shadow",
      "--mpx-sidebar-main-label-hover-filter",
      "--mpx-sidebar-main-label-active-bg",
      "--mpx-sidebar-main-label-manage-selected-bg",
      "--mpx-sidebar-main-active-ring",
      "--mpx-sidebar-main-active-underlay",
      "--mpx-sidebar-main-label-active-shadow",
      "--mpx-sidebar-main-label-active-hover-shadow",
      "--mpx-sidebar-main-label-manage-selected-shadow",
      "--mpx-sidebar-main-label-marker-focus-bg",
      "--mpx-sidebar-main-label-marker-selected-bg",
    ],
  },
  {
    id: "sidebar-main-collapsible",
    title: "2、可折叠节点调节",
    tag: "可折叠",
    cssVars: [
      "--mpx-sidebar-main-label-toggle-text",
      "--mpx-sidebar-main-label-collapsed-bg",
      "--mpx-sidebar-main-label-expanded-bg",
      "--mpx-sidebar-main-label-collapsed-active-bg",
      "--mpx-sidebar-main-label-expanded-active-bg",
      "--mpx-sidebar-main-label-collapsed-manage-selected-bg",
      "--mpx-sidebar-main-label-expanded-manage-selected-bg",
      "--mpx-sidebar-main-label-collapsed-marker-focus-bg",
      "--mpx-sidebar-main-label-expanded-marker-focus-bg",
      "--mpx-sidebar-main-label-collapsed-marker-selected-bg",
      "--mpx-sidebar-main-label-expanded-marker-selected-bg",
    ],
  },
  {
    id: "sidebar-main-plain",
    title: "3、不可折叠节点调节",
    tag: "不可折叠",
    cssVars: [
      "--mpx-sidebar-main-label-plain-border",
      "--mpx-sidebar-main-label-plain-bg",
      "--mpx-sidebar-main-label-plain-active-bg",
      "--mpx-sidebar-main-label-plain-manage-selected-bg",
      "--mpx-sidebar-main-label-plain-marker-focus-bg",
      "--mpx-sidebar-main-label-plain-marker-selected-bg",
    ],
  },
  {
    id: "sidebar-main-count",
    title: "4、计数器调节",
    tag: "计数器",
    cssVars: [
      "--mpx-sidebar-main-count-text",
      "--mpx-sidebar-main-count-border",
      "--mpx-sidebar-main-count-bg",
      "--mpx-sidebar-main-count-shadow",
      "--mpx-sidebar-main-count-packages-text",
      "--mpx-sidebar-main-count-packages-border",
      "--mpx-sidebar-main-count-packages-bg",
      "--mpx-sidebar-main-count-packages-shadow",
      "--mpx-sidebar-main-count-images-text",
      "--mpx-sidebar-main-count-images-border",
      "--mpx-sidebar-main-count-images-bg",
    ],
  },
  {
    id: "sidebar-main-bullet",
    title: "5、bullet 调节",
    tag: "Bullet",
    cssVars: [
      "--mpx-sidebar-main-bullet-pending-bg",
      "--mpx-sidebar-main-bullet-running-bg",
      "--mpx-sidebar-main-bullet-running-ring",
      "--mpx-sidebar-main-bullet-active-bg",
    ],
  },
];

const CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-image-name-list-border",
      cssVar: "--mpx-main-image-name-list-border",
      fallback: "#c7d0d8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-bg",
      cssVar: "--mpx-main-image-name-list-bg",
      fallback: "#ecf0f3",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-text",
      cssVar: "--mpx-main-image-name-list-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-border",
      cssVar: "--mpx-main-image-name-list-row-border",
      fallback: "#dce1e7",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-bg",
      cssVar: "--mpx-main-image-name-list-row-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-text",
      cssVar: "--mpx-main-image-name-list-row-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-label-text",
      cssVar: "--mpx-main-image-name-list-label-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-border",
      cssVar: "--mpx-main-image-name-list-head-border",
      fallback: "#b5bdc8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-bg",
      cssVar: "--mpx-main-image-name-list-head-bg",
      fallback: "#d6dbe1",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-text",
      cssVar: "--mpx-main-image-name-list-head-text",
      fallback: "#544634",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-body-bg",
      cssVar: "--mpx-main-image-name-list-body-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-hover-bg",
      cssVar: "--mpx-main-image-name-list-row-hover-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-focused-border-left",
      cssVar: "--mpx-main-image-name-list-row-focused-border-left",
      fallback: "#2d6e7d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-selected-border-left",
      cssVar: "--mpx-main-image-name-list-row-selected-border-left",
      fallback: "#9a885f",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-selected-focused-border-left",
      cssVar: "--mpx-main-image-name-list-row-selected-focused-border-left",
      fallback: "#2d6e7d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-manage-selected-bg",
      cssVar: "--mpx-main-image-name-list-row-manage-selected-bg",
      fallback: "#9a885f",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-text",
      cssVar: "--mpx-main-image-name-list-row-main-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-hover-bg",
      cssVar: "--mpx-main-image-name-list-row-main-hover-bg",
      fallback: "#f3f6f8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-active-bg",
      cssVar: "--mpx-main-image-name-list-row-main-active-bg",
      fallback: "#d7dde4",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-pressed-bg",
      cssVar: "--mpx-main-image-name-list-row-main-pressed-bg",
      fallback: "#d7dde4",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-hover-text",
      cssVar: "--mpx-main-image-name-list-row-main-hover-text",
      fallback: "#2f5f6d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-active-text",
      cssVar: "--mpx-main-image-name-list-row-main-active-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-pressed-text",
      cssVar: "--mpx-main-image-name-list-row-main-pressed-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-focus-outline-color",
      cssVar: "--mpx-main-image-name-list-row-main-focus-outline-color",
      fallback: "#2d6e7d",
      groupId: "main",
    },
  ];

const CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  [
    {
      id: "container-main-image-name-list-row-main-focus-outline-width",
      cssVar: "--mpx-main-image-name-list-row-main-focus-outline-width",
      fallback: "1px",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-pressed-font-weight",
      cssVar: "--mpx-main-image-name-list-row-main-pressed-font-weight",
      fallback: "600",
      groupId: "main",
    },
  ];

const MAIN_IMAGE_NAME_LIST_DEBUG_SECTIONS: readonly MainImageNameListDebugSection[] =
  [
    {
      id: "main-image-name-list-bg",
      title: "1、bg 背景与外层链路",
      tag: "bg",
      cssVars: [
        "--mpx-main-image-name-list-border",
        "--mpx-main-image-name-list-bg",
        "--mpx-main-image-name-list-text",
        "--mpx-main-image-name-list-label-text",
      ],
    },
    {
      id: "main-image-name-list-header",
      title: "2、header 表头链路",
      tag: "header",
      cssVars: [
        "--mpx-main-image-name-list-head-border",
        "--mpx-main-image-name-list-head-bg",
        "--mpx-main-image-name-list-head-text",
      ],
    },
    {
      id: "main-image-name-list-table",
      title: "3、table 表格主体链路",
      tag: "table",
      cssVars: [
        "--mpx-main-image-name-list-body-bg",
        "--mpx-main-image-name-list-row-border",
        "--mpx-main-image-name-list-row-bg",
        "--mpx-main-image-name-list-row-text",
        "--mpx-main-image-name-list-row-hover-bg",
        "--mpx-main-image-name-list-row-focused-border-left",
        "--mpx-main-image-name-list-row-selected-border-left",
        "--mpx-main-image-name-list-row-selected-focused-border-left",
        "--mpx-main-image-name-list-row-manage-selected-bg",
        "--mpx-main-image-name-list-row-main-text",
        "--mpx-main-image-name-list-row-main-hover-bg",
        "--mpx-main-image-name-list-row-main-active-bg",
        "--mpx-main-image-name-list-row-main-pressed-bg",
        "--mpx-main-image-name-list-row-main-hover-text",
        "--mpx-main-image-name-list-row-main-active-text",
        "--mpx-main-image-name-list-row-main-pressed-text",
        "--mpx-main-image-name-list-row-main-focus-outline-width",
        "--mpx-main-image-name-list-row-main-focus-outline-color",
        "--mpx-main-image-name-list-row-main-pressed-font-weight",
      ],
    },
  ];

const CONTAINER_LAYER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  ...CONTAINER_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS,
  ...CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS,
];

const CONTAINER_LAYER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  ...CONTAINER_TEXT_FIELDS,
  ...CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS,
  ...CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS,
];

const CONTAINER_SEMANTIC_PREFIX_TO_LEGACY_SLOT: ReadonlyArray<{
  semanticPrefix: string;
  slotPrefix: string;
}> = [
  {
    semanticPrefix: "--mpx-sidebar-main-",
    slotPrefix: "--mpx-slot-fg-sidebar-main-",
  },
  {
    semanticPrefix: "--mpx-main-image-name-list-",
    slotPrefix: "--mpx-slot-fg-main-content-image-name-list-",
  },
];

function resolveLegacySlotVarForSemanticVar(cssVar: string): string | null {
  for (const mapping of CONTAINER_SEMANTIC_PREFIX_TO_LEGACY_SLOT) {
    if (!cssVar.startsWith(mapping.semanticPrefix)) {
      continue;
    }
    return `${mapping.slotPrefix}${cssVar.slice(mapping.semanticPrefix.length)}`;
  }
  return null;
}

function clearLegacySlotOverrideForSemanticVar(
  root: HTMLElement,
  cssVar: string,
): void {
  const legacySlotVar = resolveLegacySlotVarForSemanticVar(cssVar);
  if (!legacySlotVar) {
    return;
  }
  root.style.removeProperty(legacySlotVar);
}

function resolveDebugVarUsage(cssVar: string): string {
  if (cssVar === "--mpx-sidebar-main-bg") {
    return "用于侧栏主列表壳层背景（.sidebar-tree）";
  }
  if (cssVar === "--mpx-sidebar-main-label-border") {
    return "用于侧栏主列表标签边框（.sidebar-label）";
  }
  if (cssVar === "--mpx-sidebar-main-label-active-bg") {
    return "用于侧栏主列表标签激活背景（.sidebar-row.is-active .sidebar-label）";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-active-bg") {
    return "用于可折叠-折叠节点激活背景（.sidebar-label.is-collapsible.is-collapsed）";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-active-bg") {
    return "用于可折叠-展开节点激活背景（.sidebar-label.is-collapsible:not(.is-collapsed)）";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-active-bg") {
    return "用于非可折叠节点激活背景（.sidebar-label:not(.is-collapsible)）";
  }
  if (cssVar === "--mpx-sidebar-main-active-ring") {
    return "用于侧栏主列表标签激活外圈（active ring）";
  }
  if (cssVar === "--mpx-sidebar-main-active-underlay") {
    return "用于侧栏主列表标签激活内圈衬底（active underlay）";
  }
  if (cssVar === "--mpx-sidebar-main-label-toggle-text") {
    return "用于侧栏可折叠箭头颜色（.sidebar-toggle-arrow）";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-marker-focus-bg") {
    return "用于可折叠-折叠节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-marker-focus-bg") {
    return "用于可折叠-展开节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-marker-focus-bg") {
    return "用于非可折叠节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-marker-selected-bg") {
    return "用于可折叠-折叠节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-marker-selected-bg") {
    return "用于可折叠-展开节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-marker-selected-bg") {
    return "用于非可折叠节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-manage-selected-bg") {
    return "用于可折叠-折叠节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-manage-selected-bg") {
    return "用于可折叠-展开节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-manage-selected-bg") {
    return "用于非可折叠节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-count-bg") {
    return "用于侧栏计数徽标通用背景（.sidebar-count）";
  }
  if (cssVar.startsWith("--mpx-sidebar-main-")) {
    return "用于侧栏主列表（fg-sidebar-main）样式链路";
  }
  if (cssVar.startsWith("--mpx-main-image-name-list-")) {
    return "用于图片文件名列表（fg-main-content-image-name-list）样式链路";
  }
  if (cssVar.startsWith("--mpx-large-panel-")) {
    return "用于大面板骨架（root/head/shell/side/main）";
  }
  if (cssVar.startsWith("--mpx-import-task-")) {
    return "用于导入任务面板子块（error / hint / review notice / hash log）";
  }
  if (cssVar.startsWith("--mpx-metadata-fetch-")) {
    return "用于元数据抓取面板内部件（search row / result columns / preview cards）";
  }
  if (cssVar.startsWith("--mpx-metadata-preference-record-")) {
    return "用于 metadata 偏好指标卡片（preference record）";
  }
  if (cssVar.startsWith("--mpx-metadata-booklet-binding-")) {
    return "用于音乐 metadata 的封面 / Booklet 绑定卡片";
  }
  if (cssVar.startsWith("--mpx-metadata-feature-tag-picker-")) {
    return "用于标签检索面板内部件（tag popover / hint / active tag）";
  }
  if (cssVar.startsWith("--mpx-subtitle-cleanup-")) {
    return "用于字幕清理面板预览区（raw / clean preview panels）";
  }
  if (cssVar.startsWith("--mpx-metadata-playlist-name-dialog-")) {
    return "用于视频 metadata 的播放列表命名小面板";
  }
  if (cssVar.startsWith("--mpx-transcode-dialog-")) {
    return "用于音频 / 视频转码面板内部控件与底部操作按钮";
  }
  if (cssVar.startsWith("--mpx-sidebar-rename-dialog-")) {
    return "用于侧栏重命名对话框的输入控件与操作按钮";
  }
  if (cssVar.startsWith("--mpx-sidebar-rename-preview-")) {
    return "用于侧栏批量重命名预览表（head / row / source button）";
  }
  if (cssVar.startsWith("--mpx-dialog-panel-")) {
    return "用于小面板骨架（dialog panel）";
  }
  if (cssVar.startsWith("--mpx-btn-variant-theme-parameter-side-")) {
    return "用于 Theme Parameter 侧栏按钮状态";
  }
  if (cssVar.startsWith("--mpx-sidebar-tree-scrollbar-")) {
    return "用于侧栏滚动条样式";
  }
  if (cssVar.startsWith("--mpx-range-")) {
    return "用于 Slider 基础层样式";
  }
  if (cssVar.startsWith("--mpx-runway-")) {
    return "用于播放器/滑条 runway 样式";
  }
  if (cssVar.startsWith("--mpx-slider-settings-")) {
    return "用于设置页与 ThemeParameter 页的横向 slider 轨道样式";
  }
  if (cssVar.startsWith("--mpx-btn-variant-overlay-cell-")) {
    return "用于 overlay-cell 按钮状态样式";
  }
  return "用于对应 CSS 消费点的主题调试变量";
}

const LARGE_PANEL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
    groupId: "root",
  },
  {
    id: "large-panel-bg",
    cssVar: "--mpx-large-panel-bg",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
    groupId: "head",
  },
  {
    id: "large-panel-head-bg",
    cssVar: "--mpx-large-panel-head-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
    groupId: "side",
  },
  {
    id: "large-panel-side-bg",
    cssVar: "--mpx-large-panel-side-bg",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-main-bg",
    cssVar: "--mpx-large-panel-main-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-border",
    cssVar: "--mpx-import-task-error-border",
    fallback: "#d7a596",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-bg",
    cssVar: "--mpx-import-task-error-bg",
    fallback: "#fdeee8",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-text",
    cssVar: "--mpx-import-task-error-text",
    fallback: "#5f2a1e",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-border",
    cssVar: "--mpx-import-task-hint-border",
    fallback: "#c5d6de",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-bg",
    cssVar: "--mpx-import-task-hint-bg",
    fallback: "#edf6f9",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-text",
    cssVar: "--mpx-import-task-hint-text",
    fallback: "#173b47",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-border",
    cssVar: "--mpx-import-task-review-notice-border",
    fallback: "#d8c69b",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-bg",
    cssVar: "--mpx-import-task-review-notice-bg",
    fallback: "#fff7e7",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-text",
    cssVar: "--mpx-import-task-review-notice-text",
    fallback: "#5a3b12",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-border",
    cssVar: "--mpx-import-task-hash-log-border",
    fallback: "#c5d6de",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-bg",
    cssVar: "--mpx-import-task-hash-log-bg",
    fallback: "#edf6f9",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-text",
    cssVar: "--mpx-import-task-hash-log-text",
    fallback: "#173b47",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-border",
    cssVar: "--mpx-metadata-fetch-control-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-bg",
    cssVar: "--mpx-metadata-fetch-control-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-hover-bg",
    cssVar: "--mpx-metadata-fetch-control-hover-bg",
    fallback: "#f7f3ee",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-focus-bg",
    cssVar: "--mpx-metadata-fetch-control-focus-bg",
    fallback: "#efe9df",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-text",
    cssVar: "--mpx-metadata-fetch-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-placeholder",
    cssVar: "--mpx-metadata-fetch-control-placeholder",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-border",
    cssVar: "--mpx-metadata-fetch-results-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-bg",
    cssVar: "--mpx-metadata-fetch-results-bg",
    fallback: "#fffcf8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-active-ring",
    cssVar: "--mpx-metadata-fetch-results-active-ring",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-border",
    cssVar: "--mpx-metadata-fetch-head-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-bg",
    cssVar: "--mpx-metadata-fetch-head-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-text",
    cssVar: "--mpx-metadata-fetch-head-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-body-bg",
    cssVar: "--mpx-metadata-fetch-body-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-result-meta-text",
    cssVar: "--mpx-metadata-fetch-result-meta-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-result-hover-text",
    cssVar: "--mpx-metadata-fetch-result-hover-text",
    fallback: "#2f5f6d",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-divider",
    cssVar: "--mpx-metadata-fetch-preview-divider",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-bg",
    cssVar: "--mpx-metadata-fetch-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-border",
    cssVar: "--mpx-metadata-fetch-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-text",
    cssVar: "--mpx-metadata-fetch-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-hover-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-active-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-focus-outline",
    cssVar: "--mpx-metadata-fetch-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-border",
    cssVar: "--mpx-metadata-preference-record-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-bg",
    cssVar: "--mpx-metadata-preference-record-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-text",
    cssVar: "--mpx-metadata-preference-record-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-summary-text",
    cssVar: "--mpx-metadata-preference-record-summary-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-hint-text",
    cssVar: "--mpx-metadata-preference-record-hint-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-field-border",
    cssVar: "--mpx-metadata-preference-record-field-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-field-bg",
    cssVar: "--mpx-metadata-preference-record-field-bg",
    fallback: "#f8f5ef",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-preference-record-field-text",
    cssVar: "--mpx-metadata-preference-record-field-text",
    fallback: "#6b6356",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-border",
    cssVar: "--mpx-metadata-booklet-binding-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-bg",
    cssVar: "--mpx-metadata-booklet-binding-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-text",
    cssVar: "--mpx-metadata-booklet-binding-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-meta-text",
    cssVar: "--mpx-metadata-booklet-binding-meta-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-border",
    cssVar: "--mpx-metadata-booklet-binding-control-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-bg",
    cssVar: "--mpx-metadata-booklet-binding-control-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-text",
    cssVar: "--mpx-metadata-booklet-binding-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-hint-text",
    cssVar: "--mpx-metadata-feature-tag-picker-hint-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-group-key-text",
    cssVar: "--mpx-metadata-feature-tag-picker-group-key-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-border",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-border",
    fallback: "#2e6f7f",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-bg",
    fallback: "#dcecf0",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-text",
    fallback: "#2e6f7f",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-border",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-border",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-border",
    cssVar: "--mpx-transcode-dialog-control-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-bg",
    cssVar: "--mpx-transcode-dialog-control-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-hover-bg",
    cssVar: "--mpx-transcode-dialog-control-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-focus-bg",
    cssVar: "--mpx-transcode-dialog-control-focus-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-text",
    cssVar: "--mpx-transcode-dialog-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-placeholder",
    cssVar: "--mpx-transcode-dialog-control-placeholder",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-border",
    cssVar: "--mpx-transcode-dialog-action-btn-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-bg",
    cssVar: "--mpx-transcode-dialog-action-btn-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-text",
    cssVar: "--mpx-transcode-dialog-action-btn-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-hover-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-focus-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-focus-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-border",
    cssVar: "--mpx-sidebar-rename-preview-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-bg",
    cssVar: "--mpx-sidebar-rename-preview-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-border",
    cssVar: "--mpx-sidebar-rename-preview-head-border",
    fallback: "#bcc7d1",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-bg",
    cssVar: "--mpx-sidebar-rename-preview-head-bg",
    fallback: "#d1d5db",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-text",
    cssVar: "--mpx-sidebar-rename-preview-head-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-list-bg",
    cssVar: "--mpx-sidebar-rename-preview-list-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-border",
    cssVar: "--mpx-sidebar-rename-preview-row-border",
    fallback: "#cfd7df",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-text",
    cssVar: "--mpx-sidebar-rename-preview-row-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-arrow-text",
    cssVar: "--mpx-sidebar-rename-preview-arrow-text",
    fallback: "rgba(106, 99, 88, 0.7)",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-hover-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-active-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-active-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-pressed-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-pressed-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-changed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-changed-accent",
    fallback: "#9fb1c3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-accent",
    fallback: "#c7928a",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-text",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-text",
    fallback: "#5f2a1e",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-unchanged-text",
    cssVar: "--mpx-sidebar-rename-preview-row-unchanged-text",
    fallback: "#6a6358",
    groupId: "main",
  },
];

const LARGE_PANEL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "large-panel-metadata-fetch-control-font-size",
    cssVar: "--mpx-metadata-fetch-control-font-size",
    fallback: "15px",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-font-size",
    cssVar: "--mpx-metadata-fetch-head-font-size",
    fallback: "15px",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-font-family",
    cssVar: "--mpx-metadata-fetch-head-font-family",
    fallback: '"Microsoft YaHei", "微软雅黑", sans-serif',
    groupId: "main",
  },
];

const SMALL_PANEL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "small-panel-border-color",
    cssVar: "--mpx-dialog-panel-border-color",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-bg",
    cssVar: "--mpx-dialog-panel-bg",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-border",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-bg",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-bg",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-placeholder",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-placeholder",
    fallback: "#6a6358",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
    groupId: "border",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
    groupId: "border",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
];

const SMALL_PANEL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "small-panel-shadow",
    cssVar: "--mpx-dialog-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
];

const BUTTON_STATE_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "button-side-idle-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-idle-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg",
    fallback: "#ecf0f3",
    groupId: "side",
  },
  {
    id: "button-side-idle-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-text",
    fallback: "#4a4a4a",
    groupId: "side",
  },
  {
    id: "button-side-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
    fallback: "#f8fafc",
    groupId: "side",
  },
  {
    id: "button-side-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-text",
    fallback: "#4a4a4a",
    groupId: "side",
  },
  {
    id: "button-side-active-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-active-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-bg",
    fallback: "#dce2e8",
    groupId: "side",
  },
  {
    id: "button-side-active-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-text",
    fallback: "#334155",
    groupId: "side",
  },
  {
    id: "button-side-selected-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-border",
    fallback: "#d6cfc1",
    groupId: "side",
  },
  {
    id: "button-side-selected-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-bg",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "button-side-selected-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-text",
    fallback: "#2e2a22",
    groupId: "side",
  },
  {
    id: "button-side-pressed-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-pressed-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-bg",
    fallback: "#d6dee5",
    groupId: "side",
  },
  {
    id: "button-side-pressed-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-text",
    fallback: "#555555",
    groupId: "side",
  },
  {
    id: "button-side-disabled-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-disabled-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-bg",
    fallback: "#ecf0f3",
    groupId: "side",
  },
  {
    id: "button-side-disabled-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-text",
    fallback: "#9b8465",
    groupId: "side",
  },
  {
    id: "button-side-pending-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-border",
    fallback: "#d7ba8a",
    groupId: "side",
  },
  {
    id: "button-side-pending-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-bg",
    fallback: "#fbf1e0",
    groupId: "side",
  },
  {
    id: "button-side-pending-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-text",
    fallback: "#6a4b1e",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-border",
    fallback: "#fca5a5",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-bg",
    fallback: "#fee2e2",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-text",
    fallback: "#dc2626",
    groupId: "side",
  },
];

const BUTTON_STATE_FIELD_PREFIX: Readonly<Record<ButtonStateKey, string>> = {
  idle: "idle",
  hover: "hover",
  active: "active",
  selected: "selected",
  pressed: "pressed",
  disabled: "disabled",
  pending: "pending",
  "close-hover": "danger-hover",
};

const CONTROL_SECTION_DEFINITIONS: ReadonlyArray<{
  id: ThemeControlSectionId;
  titleKey: string;
  noteKey: string;
}> = [
  {
    id: "control-scrollbar",
    titleKey: "ui.themeParameter.controls.section.scrollbar",
    noteKey: "ui.themeParameter.controls.note.scrollbar",
  },
  {
    id: "control-slider-base",
    titleKey: "ui.themeParameter.controls.section.sliderBase",
    noteKey: "ui.themeParameter.controls.note.sliderBase",
  },
  {
    id: "control-slider-player",
    titleKey: "ui.themeParameter.controls.section.sliderPlayer",
    noteKey: "ui.themeParameter.controls.note.sliderPlayer",
  },
  {
    id: "control-slider-vertical",
    titleKey: "ui.themeParameter.controls.section.sliderVertical",
    noteKey: "ui.themeParameter.controls.note.sliderVertical",
  },
  {
    id: "control-slider-settings",
    titleKey: "ui.themeParameter.controls.section.sliderSettings",
    noteKey: "ui.themeParameter.controls.note.sliderSettings",
  },
];

const COMMON_CONTROL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "control-scrollbar-track-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-bg",
    fallback: "#ece5d9",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-bg",
    fallback: "#b7ab95",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-hover-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-hover-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-active-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-color-thumb",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-thumb",
    fallback: "#b7ab95",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-color-track",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-track",
    fallback: "#ece5d9",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-border-color",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-color",
    fallback: "rgba(0, 0, 0, 0)",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-slider-base-track-bg",
    cssVar: "--mpx-range-track-bg",
    fallback: "#d6cfc1",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-bg",
    cssVar: "--mpx-range-thumb-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-border",
    cssVar: "--mpx-range-thumb-border",
    fallback: "#ffffff",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-player-fill-gold",
    cssVar: "--mpx-runway-fill-gold",
    fallback: "linear-gradient(90deg, #cba468 0%, #b5853b 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-fill-graphite",
    cssVar: "--mpx-runway-fill-graphite",
    fallback: "linear-gradient(90deg, #9ca3af 0%, #4b5563 55%, #374151 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-pearl",
    cssVar: "--mpx-runway-thumb-shell-pearl",
    fallback: "linear-gradient(90deg, #d6bc86 0%, #c79d4a 50%, #d6bc86 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-graphite",
    cssVar: "--mpx-runway-thumb-shell-graphite",
    fallback: "linear-gradient(145deg, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-vertical-accent-fill",
    cssVar: "--mpx-skeuo-accent-fill",
    fallback: "#8a6a3b",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-vertical-inset-bg",
    cssVar: "--mpx-skeuo-inset-bg",
    fallback: "#f3e9d8",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-settings-groove-bg",
    cssVar: "--mpx-slider-settings-groove-bg",
    fallback: "#e9ecf0",
    groupId: "box",
    sectionId: "control-slider-settings",
  },
];

const COMMON_CONTROL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "control-scrollbar-size",
    cssVar: "--mpx-sidebar-tree-scrollbar-size",
    fallback: "10px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-radius",
    fallback: "10px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-radius",
    fallback: "999px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-border",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-border",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-end-gap",
    cssVar: "--mpx-sidebar-tree-scrollbar-end-gap",
    fallback: "0px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-min-height",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-min-height",
    fallback: "24px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-border-width",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-width",
    fallback: "0px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-active-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-slider-base-track-height",
    cssVar: "--mpx-range-track-height",
    fallback: "6px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-size",
    cssVar: "--mpx-range-thumb-size",
    fallback: "16px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-border-width",
    cssVar: "--mpx-range-thumb-border-width",
    fallback: "1.5px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-shadow",
    cssVar: "--mpx-range-thumb-shadow",
    fallback: "0 1px 2px rgba(0, 0, 0, 0.24)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-hover-shadow",
    cssVar: "--mpx-range-thumb-hover-shadow",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-range-thumb-bg) 28%, transparent), 0 2px 4px rgba(0, 0, 0, 0.28)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-active-shadow",
    cssVar: "--mpx-range-thumb-active-shadow",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-range-thumb-bg) 36%, transparent), 0 1px 2px rgba(0, 0, 0, 0.24)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-focus-ring",
    cssVar: "--mpx-range-thumb-focus-ring",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-border-focus) 45%, transparent)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-hover-scale",
    cssVar: "--mpx-range-thumb-hover-scale",
    fallback: "1.06",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-active-scale",
    cssVar: "--mpx-range-thumb-active-scale",
    fallback: "1.12",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-player-fill-shadow-gold",
    cssVar: "--mpx-runway-fill-shadow-gold",
    fallback:
      "inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.1)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-fill-shadow-graphite",
    cssVar: "--mpx-runway-fill-shadow-graphite",
    fallback:
      "inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.25)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-pearl",
    cssVar: "--mpx-runway-thumb-shell-shadow-pearl",
    fallback: "0 1px 1px rgba(0, 0, 0, 0.05)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-graphite",
    cssVar: "--mpx-runway-thumb-shell-shadow-graphite",
    fallback:
      "0 2px 4px rgba(0, 0, 0, 0.2), inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 2px rgba(156, 163, 175, 0.5)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-pearl",
    cssVar: "--mpx-runway-thumb-core-pearl",
    fallback:
      "radial-gradient(circle at 35% 25%, #ffffff 0%, #f8f9fa 40%, #d1d5db 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-graphite",
    cssVar: "--mpx-runway-thumb-core-graphite",
    fallback:
      "radial-gradient(circle at 35% 25%, #9ca3af 0%, #4b5563 50%, #374151 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-shadow-pearl",
    cssVar: "--mpx-runway-thumb-core-shadow-pearl",
    fallback:
      "inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.05)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-shadow-graphite",
    cssVar: "--mpx-runway-thumb-core-shadow-graphite",
    fallback:
      "inset 1px 1px 2px rgba(255, 255, 255, 0.5), inset -1px -1px 3px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(255, 255, 255, 0.5)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-vertical-shadow-dark",
    cssVar: "--mpx-skeuo-shadow-dark",
    fallback: "#cdb799",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-vertical-shadow-light",
    cssVar: "--mpx-skeuo-shadow-light",
    fallback: "#fffdf7",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-settings-groove-shadow",
    cssVar: "--mpx-slider-settings-groove-shadow",
    fallback:
      "inset 0 2px 4px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), inset 0 1px 1px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), 0 1px 0 rgba(255, 255, 255, 1)",
    groupId: "box",
    sectionId: "control-slider-settings",
  },
];

function resolveNumberGroupTitle(groupId: ThemeDebugNumberGroupId): string {
  switch (groupId) {
    case "box":
      return "F12: 盒模型 / 布局";
    case "border":
      return "F12: 边框 / 圆角";
    case "shadow":
      return "F12: 阴影 / 浮起";
    case "root":
      return "F12: Root";
    case "head":
      return "F12: Head";
    case "shell":
      return "F12: Shell";
    case "side":
      return "F12: Side";
    case "main":
      return "F12: Main";
    default:
      return "F12: 其它";
  }
}

function resolveContainerNumberGroup(
  parameter: ThemeParameterDefinition,
): ThemeDebugNumberGroupId {
  const id = parameter.id;
  if (
    id.includes("layout") ||
    id.includes("splitter") ||
    id.includes("padding") ||
    id.includes("gap")
  ) {
    return "box";
  }
  if (id.includes("border") || id.includes("radius")) {
    return "border";
  }
  return "shadow";
}

function resolveLargePanelNumberGroup(
  parameter: ThemeParameterDefinition,
): ThemeDebugNumberGroupId {
  const id = parameter.id;
  if (id.includes("head-")) {
    return "head";
  }
  if (id.includes("shell-")) {
    return "shell";
  }
  if (id.includes("side-")) {
    return "side";
  }
  if (id.includes("main-")) {
    return "main";
  }
  return "root";
}

function resolveSmallPanelNumberGroup(
  parameter: ThemeParameterDefinition,
): ThemeDebugNumberGroupId {
  const id = parameter.id;
  if (id.includes("border") || id.includes("radius")) {
    return "border";
  }
  return "box";
}

export function ThemeParameterPanelMain({
  t,
  styleId,
  activePage,
  setActivePage,
  activePreviewMode,
  togglePreviewMode,
  searchText,
  setSearchText,
  snapshotJson,
  setSnapshotJson,
  snapshotIncludeComputedValues,
  setSnapshotIncludeComputedValues,
  snapshotMessage,
  setSnapshotMessage,
  snapshotFileInputRef,
  loadSnapshotFile,
  exportSnapshotJson,
  downloadSnapshotJson,
  openSnapshotFilePicker,
  copySnapshotJson,
  importSnapshotJson,
  commonExpanded,
  setCommonExpanded,
  styleExpanded,
  setStyleExpanded,
  containerLegacyExpanded,
  setContainerLegacyExpanded,
  containerSidebarMainExpanded,
  setContainerSidebarMainExpanded,
  containerMainImageNameListExpanded,
  setContainerMainImageNameListExpanded,
  filteredCommonParameters,
  filteredStyleParameters,
  styleParameters,
  containerLayerParameters,
  largePanelLayerParameters,
  smallPanelLayerParameters,
  values,
  applyParameter,
  isParameterChanged,
  resetSingleParameter,
  resolveLabel,
  onContainerDebugChanged,
  setMainScrollElement,
  onMainScroll,
}: ThemeParameterPanelMainProps) {
  const pages: ReadonlyArray<{
    id: ThemeParameterPageId;
    labelKey: string;
  }> = [
    { id: "parameters", labelKey: "ui.themeParameter.page.parameters" },
    { id: "snapshot", labelKey: "ui.themeParameter.page.snapshot" },
    {
      id: "containerLayer",
      labelKey: "ui.themeParameter.page.containerLayer",
    },
    {
      id: "largePanelLayer",
      labelKey: "ui.themeParameter.page.largePanelLayer",
    },
    {
      id: "smallPanelLayer",
      labelKey: "ui.themeParameter.page.smallPanelLayer",
    },
    {
      id: "commonControls",
      labelKey: "ui.themeParameter.page.commonControls",
    },
    {
      id: "buttonStates",
      labelKey: "ui.themeParameter.page.buttonStates",
    },
  ];

  const [debugColorValues, setDebugColorValues] = useState<
    Record<string, ColorState>
  >({});
  const [debugTextValues, setDebugTextValues] = useState<
    Record<string, string>
  >({});
  const [controlPreviewValues, setControlPreviewValues] =
    useState<ControlPreviewValues>({
      sliderBaseHorizontal: 36,
      sliderPlayerProgress: 42,
      sliderVerticalReference: 58,
      sliderVerticalUp: 72,
      sliderVerticalDown: 28,
      sliderSettingsHorizontal: 52,
    });

  const containerDebugColorVarSet = useMemo(
    () => new Set(CONTAINER_LAYER_COLOR_FIELDS.map((field) => field.cssVar)),
    [],
  );
  const containerDebugTextVarSet = useMemo(
    () => new Set(CONTAINER_LAYER_TEXT_FIELDS.map((field) => field.cssVar)),
    [],
  );

  const notifyContainerDebugChanged = (cssVar: string) => {
    if (
      containerDebugColorVarSet.has(cssVar) ||
      containerDebugTextVarSet.has(cssVar)
    ) {
      onContainerDebugChanged();
    }
  };

  const containerNumberGroups = useMemo(() => {
    const groupMap: Record<
      ThemeDebugNumberGroupId,
      ThemeParameterDefinition[]
    > = {
      box: [],
      border: [],
      shadow: [],
      root: [],
      head: [],
      shell: [],
      side: [],
      main: [],
    };
    for (const parameter of containerLayerParameters) {
      groupMap[resolveContainerNumberGroup(parameter)].push(parameter);
    }
    return ["box", "border", "shadow"]
      .map((groupId) => {
        const id = groupId as ThemeDebugNumberGroupId;
        return {
          id,
          title: resolveNumberGroupTitle(id),
          parameters: groupMap[id],
        };
      })
      .filter((group) => group.parameters.length > 0);
  }, [containerLayerParameters]);

  const largePanelNumberGroups = useMemo(() => {
    const groupMap: Record<
      ThemeDebugNumberGroupId,
      ThemeParameterDefinition[]
    > = {
      box: [],
      border: [],
      shadow: [],
      root: [],
      head: [],
      shell: [],
      side: [],
      main: [],
    };
    for (const parameter of largePanelLayerParameters) {
      groupMap[resolveLargePanelNumberGroup(parameter)].push(parameter);
    }
    return ["root", "head", "shell", "side", "main"]
      .map((groupId) => {
        const id = groupId as ThemeDebugNumberGroupId;
        return {
          id,
          title: resolveNumberGroupTitle(id),
          parameters: groupMap[id],
        };
      })
      .filter((group) => group.parameters.length > 0);
  }, [largePanelLayerParameters]);

  const smallPanelNumberGroups = useMemo(() => {
    const groupMap: Record<
      ThemeDebugNumberGroupId,
      ThemeParameterDefinition[]
    > = {
      box: [],
      border: [],
      shadow: [],
      root: [],
      head: [],
      shell: [],
      side: [],
      main: [],
    };
    for (const parameter of smallPanelLayerParameters) {
      groupMap[resolveSmallPanelNumberGroup(parameter)].push(parameter);
    }
    return ["box", "border"]
      .map((groupId) => {
        const id = groupId as ThemeDebugNumberGroupId;
        return {
          id,
          title: resolveNumberGroupTitle(id),
          parameters: groupMap[id],
        };
      })
      .filter((group) => group.parameters.length > 0);
  }, [smallPanelLayerParameters]);

  useEffect(() => {
    if (
      activePage !== "containerLayer" &&
      activePage !== "largePanelLayer" &&
      activePage !== "smallPanelLayer" &&
      activePage !== "commonControls" &&
      activePage !== "buttonStates"
    ) {
      return;
    }
    const computed = getComputedStyle(document.documentElement);
    const sourceFields =
      activePage === "containerLayer"
        ? CONTAINER_LAYER_COLOR_FIELDS
        : activePage === "largePanelLayer"
          ? LARGE_PANEL_COLOR_FIELDS
        : activePage === "smallPanelLayer"
          ? SMALL_PANEL_COLOR_FIELDS
          : activePage === "commonControls"
            ? COMMON_CONTROL_COLOR_FIELDS
          : BUTTON_STATE_COLOR_FIELDS;
    const nextValues: Record<string, ColorState> = {};
    for (const field of sourceFields) {
      const parsed = readCssColorState(computed, field.cssVar, field.fallback);
      nextValues[field.id] = {
        hex: parsed.hex,
        alpha: field.fallbackAlpha ?? parsed.alpha,
      };
    }
    setDebugColorValues(nextValues);

    if (
      activePage === "containerLayer" ||
      activePage === "smallPanelLayer" ||
      activePage === "commonControls"
    ) {
      const nextTextValues: Record<string, string> = {};
      const sourceTextFields =
        activePage === "containerLayer"
          ? CONTAINER_LAYER_TEXT_FIELDS
          : activePage === "commonControls"
            ? COMMON_CONTROL_TEXT_FIELDS
          : SMALL_PANEL_TEXT_FIELDS;
      for (const field of sourceTextFields) {
        nextTextValues[field.id] =
          computed.getPropertyValue(field.cssVar).trim() || field.fallback;
      }
      setDebugTextValues(nextTextValues);
      return;
    }
    setDebugTextValues({});
  }, [activePage, styleId]);

  const setDebugColorFieldHex = (
    field: ThemeDebugColorField,
    rawHex: string,
  ) => {
    const parsed = parseColorState(rawHex, field.fallback);
    if (!parsed) {
      return;
    }
    const previousState =
      debugColorValues[field.id] ??
      ({
        hex: field.fallback,
        alpha: field.fallbackAlpha ?? 1,
      } satisfies ColorState);
    const nextState: ColorState = {
      hex: parsed.hex,
      alpha: previousState.alpha,
    };
    document.documentElement.style.setProperty(
      field.cssVar,
      formatColorStateAsCss(nextState),
    );
    clearLegacySlotOverrideForSemanticVar(document.documentElement, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    setDebugColorValues((previous) => ({
      ...previous,
      [field.id]: nextState,
    }));
  };

  const setDebugColorFieldAlpha = (
    field: ThemeDebugColorField,
    rawAlphaPercent: number,
  ) => {
    if (!Number.isFinite(rawAlphaPercent)) {
      return;
    }
    const bounded = Math.max(0, Math.min(100, rawAlphaPercent));
    const previousState =
      debugColorValues[field.id] ??
      ({
        hex: field.fallback,
        alpha: field.fallbackAlpha ?? 1,
      } satisfies ColorState);
    const nextState: ColorState = {
      ...previousState,
      alpha: bounded / 100,
    };
    document.documentElement.style.setProperty(
      field.cssVar,
      formatColorStateAsCss(nextState),
    );
    clearLegacySlotOverrideForSemanticVar(document.documentElement, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    setDebugColorValues((previous) => ({
      ...previous,
      [field.id]: nextState,
    }));
  };

  const isColorFieldChanged = (field: ThemeDebugColorField): boolean => {
    return (
      document.documentElement.style.getPropertyValue(field.cssVar).trim()
        .length > 0
    );
  };

  const resetColorField = (field: ThemeDebugColorField) => {
    const root = document.documentElement;
    root.style.removeProperty(field.cssVar);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    const computed = getComputedStyle(root);
    const nextValue = readCssColorState(computed, field.cssVar, field.fallback);
    setDebugColorValues((previous) => ({
      ...previous,
      [field.id]: {
        hex: nextValue.hex,
        alpha: field.fallbackAlpha ?? nextValue.alpha,
      },
    }));
  };

  const isTextFieldChanged = (field: ThemeDebugTextField): boolean => {
    return (
      document.documentElement.style.getPropertyValue(field.cssVar).trim()
        .length > 0
    );
  };

  const setDebugTextFieldValue = (field: ThemeDebugTextField, raw: string) => {
    setDebugTextValues((previous) => ({ ...previous, [field.id]: raw }));
    if (!raw.trim()) {
      return;
    }
    document.documentElement.style.setProperty(field.cssVar, raw);
    clearLegacySlotOverrideForSemanticVar(document.documentElement, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
  };

  const resetTextField = (field: ThemeDebugTextField) => {
    const root = document.documentElement;
    root.style.removeProperty(field.cssVar);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    const computed = getComputedStyle(root);
    setDebugTextValues((previous) => ({
      ...previous,
      [field.id]:
        computed.getPropertyValue(field.cssVar).trim() || field.fallback,
    }));
  };

  const renderColorFieldRow = (field: ThemeDebugColorField) => {
    const colorState = debugColorValues[field.id] ?? {
      hex: field.fallback,
      alpha: field.fallbackAlpha ?? 1,
    };
    const alphaPercent = Math.round(colorState.alpha * 100);
    return (
      <label key={field.id} className="theme-parameter-color-row">
        <span className="theme-parameter-var-label">
          {field.cssVar}
          <span className="theme-parameter-var-usage">
            {`（${resolveDebugVarUsage(field.cssVar)}）`}
          </span>
        </span>
        <div className="theme-parameter-color-control">
          <input
            type="color"
            aria-label={`${field.cssVar}-picker`}
            value={colorState.hex}
            onChange={(event) =>
              setDebugColorFieldHex(field, event.target.value)
            }
          />
          <input
            type="text"
            aria-label={field.cssVar}
            value={colorState.hex}
            onChange={(event) =>
              setDebugColorFieldHex(field, event.target.value)
            }
            placeholder={field.fallback}
          />
          <input
            type="number"
            className="theme-parameter-alpha-input"
            aria-label={`${field.cssVar}-alpha`}
            min={0}
            max={100}
            step={1}
            value={alphaPercent}
            onChange={(event) =>
              setDebugColorFieldAlpha(field, Number(event.target.value))
            }
          />
          {isColorFieldChanged(field) ? (
            <button
              type="button"
              className="theme-parameter-reset-btn"
              onClick={() => resetColorField(field)}
            >
              {t("ui.themeParameter.resetField")}
            </button>
          ) : null}
        </div>
      </label>
    );
  };

  const renderColorGroups = (
    fields: readonly ThemeDebugColorField[],
    groupIds: readonly ThemeDebugNumberGroupId[],
  ) => {
    return groupIds.map((groupId) => {
      const groupFields = fields.filter((field) => field.groupId === groupId);
      if (groupFields.length === 0) {
        return null;
      }
      return (
        <section
          key={groupId}
          className="settings-group theme-parameter-debug-group"
        >
          <header className="settings-group-head">
            <span>{resolveNumberGroupTitle(groupId)}</span>
          </header>
          <div className="theme-parameter-color-list">
            {groupFields.map(renderColorFieldRow)}
          </div>
        </section>
      );
    });
  };

  const renderTextFieldRow = (field: ThemeDebugTextField) => {
    const raw = debugTextValues[field.id] ?? field.fallback;
    const parsedGradient = parseSimpleLinearGradient(raw);
    const parsedFilter = parseSimpleFilterFunction(raw);
    const parsedShadow = parseBoxShadowValue(raw);

    const updateTextValue = (nextRaw: string) => {
      setDebugTextFieldValue(field, nextRaw);
    };

    const renderResetButton = () => {
      return isTextFieldChanged(field) ? (
        <button
          type="button"
          className="theme-parameter-reset-btn"
          onClick={() => resetTextField(field)}
        >
          {t("ui.themeParameter.resetField")}
        </button>
      ) : null;
    };

    const renderColorExpressionInput = (
      ariaLabel: string,
      value: string,
      onChange: (nextValue: string) => void,
    ) => {
      const parsedColor = parseColorState(value, "#ffffff");
      const normalizedColorValue = parsedColor?.hex ?? "#ffffff";
      const isPlainColor = parseColorState(value, "#ffffff") !== null;

      return (
        <div className="theme-parameter-inline-field color-expression">
          {isPlainColor ? (
            <input
              type="color"
              aria-label={`${ariaLabel}-picker`}
              value={normalizedColorValue}
              onChange={(event) => onChange(event.target.value)}
            />
          ) : null}
          <input
            type="text"
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
    };

    if (parsedGradient) {
      const updateGradient = (nextValue: SimpleLinearGradientValue) => {
        updateTextValue(formatSimpleLinearGradient(nextValue));
      };

      return (
        <div key={field.id} className="theme-parameter-text-row is-structured">
          <span className="theme-parameter-var-label">
            {field.cssVar}
            <span className="theme-parameter-var-usage">
              {`（${resolveDebugVarUsage(field.cssVar)}）`}
            </span>
          </span>
          <div className="theme-parameter-structured-card">
            <div className="theme-parameter-structured-grid is-gradient">
              <label className="theme-parameter-inline-field">
                <span>角度</span>
                <input
                  type="number"
                  aria-label={`${field.cssVar}-angle`}
                  value={parsedGradient.angle}
                  onChange={(event) => {
                    const nextAngle = Number(event.target.value);
                    if (!Number.isFinite(nextAngle)) {
                      return;
                    }
                    updateGradient({
                      ...parsedGradient,
                      angle: nextAngle,
                    });
                  }}
                />
              </label>
              <label className="theme-parameter-inline-field">
                <span>颜色 1</span>
                {renderColorExpressionInput(
                  `${field.cssVar}-color-1`,
                  parsedGradient.colorStops[0],
                  (nextColor) => {
                    updateGradient({
                      ...parsedGradient,
                      colorStops: [nextColor, parsedGradient.colorStops[1]],
                    });
                  },
                )}
              </label>
              <label className="theme-parameter-inline-field">
                <span>颜色 2</span>
                {renderColorExpressionInput(
                  `${field.cssVar}-color-2`,
                  parsedGradient.colorStops[1],
                  (nextColor) => {
                    updateGradient({
                      ...parsedGradient,
                      colorStops: [parsedGradient.colorStops[0], nextColor],
                    });
                  },
                )}
              </label>
            </div>
          </div>
          {renderResetButton()}
        </div>
      );
    }

    if (parsedFilter) {
      const updateFilter = (nextValue: SimpleFilterFunctionValue) => {
        updateTextValue(formatSimpleFilterFunction(nextValue));
      };

      return (
        <div key={field.id} className="theme-parameter-text-row is-structured">
          <span className="theme-parameter-var-label">
            {field.cssVar}
            <span className="theme-parameter-var-usage">
              {`（${resolveDebugVarUsage(field.cssVar)}）`}
            </span>
          </span>
          <div className="theme-parameter-structured-card">
            <div className="theme-parameter-structured-grid is-filter">
              <label className="theme-parameter-inline-field">
                <span>函数</span>
                <input
                  type="text"
                  aria-label={`${field.cssVar}-fn`}
                  value={parsedFilter.name}
                  onChange={(event) => {
                    updateFilter({
                      ...parsedFilter,
                      name: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="theme-parameter-inline-field">
                <span>数值</span>
                <input
                  type="number"
                  step="0.01"
                  aria-label={`${field.cssVar}-value`}
                  value={parsedFilter.numericValue}
                  onChange={(event) => {
                    const nextNumericValue = Number(event.target.value);
                    if (!Number.isFinite(nextNumericValue)) {
                      return;
                    }
                    updateFilter({
                      ...parsedFilter,
                      numericValue: nextNumericValue,
                    });
                  }}
                />
              </label>
              <label className="theme-parameter-inline-field">
                <span>单位</span>
                <input
                  type="text"
                  aria-label={`${field.cssVar}-unit`}
                  value={parsedFilter.unit}
                  onChange={(event) => {
                    updateFilter({
                      ...parsedFilter,
                      unit: event.target.value,
                    });
                  }}
                />
              </label>
            </div>
          </div>
          {renderResetButton()}
        </div>
      );
    }

    if (parsedShadow) {
      const updateShadowLayers = (nextLayers: BoxShadowLayerValue[]) => {
        updateTextValue(formatBoxShadowValue(nextLayers));
      };

      return (
        <div key={field.id} className="theme-parameter-text-row is-structured">
          <span className="theme-parameter-var-label">
            {field.cssVar}
            <span className="theme-parameter-var-usage">
              {`（${resolveDebugVarUsage(field.cssVar)}）`}
            </span>
          </span>
          <div className="theme-parameter-shadow-layer-list">
            {parsedShadow.map((layer, layerIndex) => (
              <section
                key={`${field.id}-layer-${layerIndex}`}
                className="theme-parameter-structured-card theme-parameter-shadow-layer"
              >
                <div className="theme-parameter-shadow-layer-head">
                  <strong>{`阴影层 ${layerIndex + 1}`}</strong>
                  <div className="theme-parameter-shadow-layer-actions">
                    <label className="theme-parameter-inline-toggle">
                      <input
                        type="checkbox"
                        aria-label={`${field.cssVar}-layer-${layerIndex}-inset`}
                        checked={layer.inset}
                        onChange={(event) => {
                          const nextLayers = parsedShadow.map(
                            (currentLayer, currentIndex) =>
                              currentIndex === layerIndex
                                ? {
                                    ...currentLayer,
                                    inset: event.target.checked,
                                  }
                                : currentLayer,
                          );
                          updateShadowLayers(nextLayers);
                        }}
                      />
                      <span>Inset</span>
                    </label>
                    {parsedShadow.length > 1 ? (
                      <button
                        type="button"
                        className="theme-parameter-reset-btn"
                        onClick={() => {
                          updateShadowLayers(
                            parsedShadow.filter(
                              (_, currentIndex) => currentIndex !== layerIndex,
                            ),
                          );
                        }}
                      >
                        删除层
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="theme-parameter-structured-grid is-shadow">
                  {(
                    [
                      ["offsetX", "X 偏移"],
                      ["offsetY", "Y 偏移"],
                      ["blur", "模糊"],
                      ["spread", "扩散"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={`${field.id}-layer-${layerIndex}-${key}`}
                      className="theme-parameter-inline-field"
                    >
                      <span>{label}</span>
                      <input
                        type="text"
                        aria-label={`${field.cssVar}-layer-${layerIndex}-${key}`}
                        value={layer[key]}
                        onChange={(event) => {
                          const nextLayers = parsedShadow.map(
                            (currentLayer, currentIndex) =>
                              currentIndex === layerIndex
                                ? {
                                    ...currentLayer,
                                    [key]: event.target.value,
                                  }
                                : currentLayer,
                          );
                          updateShadowLayers(nextLayers);
                        }}
                      />
                    </label>
                  ))}
                  <label className="theme-parameter-inline-field is-span-all">
                    <span>颜色 / 表达式</span>
                    {renderColorExpressionInput(
                      `${field.cssVar}-layer-${layerIndex}-color`,
                      layer.color,
                      (nextColor) => {
                        const nextLayers = parsedShadow.map(
                          (currentLayer, currentIndex) =>
                            currentIndex === layerIndex
                              ? {
                                  ...currentLayer,
                                  color: nextColor,
                                }
                              : currentLayer,
                        );
                        updateShadowLayers(nextLayers);
                      },
                    )}
                  </label>
                </div>
              </section>
            ))}
            <button
              type="button"
              className="theme-parameter-debug-preview-btn"
              onClick={() => {
                updateShadowLayers([
                  ...parsedShadow,
                  {
                    inset: false,
                    offsetX: "0px",
                    offsetY: "2px",
                    blur: "4px",
                    spread: "0px",
                    color: "rgba(0, 0, 0, 0.2)",
                  },
                ]);
              }}
            >
              添加阴影层
            </button>
          </div>
          {renderResetButton()}
        </div>
      );
    }

    return (
      <label key={field.id} className="theme-parameter-text-row">
        <span className="theme-parameter-var-label">
          {field.cssVar}
          <span className="theme-parameter-var-usage">
            {`（${resolveDebugVarUsage(field.cssVar)}）`}
          </span>
        </span>
        <textarea
          aria-label={field.cssVar}
          className="theme-parameter-textarea"
          value={raw}
          onChange={(event) => setDebugTextFieldValue(field, event.target.value)}
        />
        {renderResetButton()}
      </label>
    );
  };

  const sidebarMainColorFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS.map((field) => [field.cssVar, field]),
      ),
    [],
  );

  const sidebarMainTextFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS.map((field) => [field.cssVar, field]),
      ),
    [],
  );

  const renderSidebarMainDebugSections = () => {
    return SIDEBAR_MAIN_DEBUG_SECTIONS.map((section) => {
      const sectionRows = section.cssVars
        .map((cssVar) => {
          const colorField = sidebarMainColorFieldMap.get(cssVar);
          if (colorField) {
            return renderColorFieldRow(colorField);
          }
          const textField = sidebarMainTextFieldMap.get(cssVar);
          if (textField) {
            return renderTextFieldRow(textField);
          }
          return null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (sectionRows.length === 0) {
        return null;
      }

      return (
        <section
          key={section.id}
          className="settings-group theme-parameter-debug-group"
        >
          <header className="settings-group-head theme-parameter-subgroup-head">
            <span>{section.title}</span>
            <span className="theme-parameter-subgroup-tag">{section.tag}</span>
          </header>
          <div className="theme-parameter-color-list">{sectionRows}</div>
        </section>
      );
    });
  };

  const mainImageNameListColorFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS.map((field) => [
          field.cssVar,
          field,
        ]),
      ),
    [],
  );

  const mainImageNameListTextFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS.map((field) => [
          field.cssVar,
          field,
        ]),
      ),
    [],
  );

  const renderMainImageNameListDebugSections = () => {
    return MAIN_IMAGE_NAME_LIST_DEBUG_SECTIONS.map((section) => {
      const sectionRows = section.cssVars
        .map((cssVar) => {
          const colorField = mainImageNameListColorFieldMap.get(cssVar);
          if (colorField) {
            return renderColorFieldRow(colorField);
          }
          const textField = mainImageNameListTextFieldMap.get(cssVar);
          if (textField) {
            return renderTextFieldRow(textField);
          }
          return null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (sectionRows.length === 0) {
        return null;
      }

      return (
        <section
          key={section.id}
          className="settings-group theme-parameter-debug-group"
        >
          <header className="settings-group-head theme-parameter-subgroup-head">
            <span>{section.title}</span>
            <span className="theme-parameter-subgroup-tag">{section.tag}</span>
          </header>
          <div className="theme-parameter-color-list">{sectionRows}</div>
        </section>
      );
    });
  };

  const resolveButtonStateFields = (stateKey: ButtonStateKey) => {
    const prefix = BUTTON_STATE_FIELD_PREFIX[stateKey];
    return BUTTON_STATE_COLOR_FIELDS.filter((field) =>
      field.id.startsWith(`button-side-${prefix}-`),
    );
  };

  const renderTextGroups = (
    fields: readonly ThemeDebugTextField[],
    groupIds: readonly ThemeDebugNumberGroupId[],
  ) => {
    return groupIds.map((groupId) => {
      const groupFields = fields.filter((field) => field.groupId === groupId);
      if (groupFields.length === 0) {
        return null;
      }
      return (
        <section
          key={`text-${groupId}`}
          className="settings-group theme-parameter-debug-group"
        >
          <header className="settings-group-head">
            <span>{resolveNumberGroupTitle(groupId)}</span>
          </header>
          <div className="theme-parameter-text-list">
            {groupFields.map(renderTextFieldRow)}
          </div>
        </section>
      );
    });
  };

  const toRangePercent = (value: number, min: number, max: number) => {
    if (max <= min) {
      return 0;
    }
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  };

  const buildSkeuoRangeStyle = (value: number) => {
    return {
      "--mpx-skeuo-range-pct": `${toRangePercent(value, 0, 100)}%`,
    } as CSSProperties;
  };

  const renderCommonControlTextFieldRow = (field: ThemeDebugTextField) => {
    const raw = debugTextValues[field.id] ?? field.fallback;
    return (
      <label key={field.id} className="theme-parameter-text-row">
        <span className="theme-parameter-var-label">
          {field.cssVar}
          <span className="theme-parameter-var-usage">
            {`（${resolveDebugVarUsage(field.cssVar)}）`}
          </span>
        </span>
        <textarea
          aria-label={field.cssVar}
          className="theme-parameter-textarea"
          value={raw}
          onChange={(event) => setDebugTextFieldValue(field, event.target.value)}
        />
        {isTextFieldChanged(field) ? (
          <button
            type="button"
            className="theme-parameter-reset-btn"
            onClick={() => resetTextField(field)}
          >
            {t("ui.themeParameter.resetField")}
          </button>
        ) : null}
      </label>
    );
  };

  const renderCommonControlHorizontalPreview = (
    sectionId: ThemeControlSectionId,
  ) => {
    switch (sectionId) {
      case "control-scrollbar": {
        return (
          <div
            className="theme-parameter-control-preview-row is-horizontal"
            data-testid="theme-control-preview-scrollbar-horizontal"
          >
            <div
              className="theme-parameter-scroll-preview mpx-scroll-area"
              aria-label="滚动条横向预览"
              tabIndex={0}
            >
              <div className="theme-parameter-scroll-preview-content">
                {Array.from({ length: 18 }).map((_, index) => (
                  <span
                    key={`scroll-preview-chip-${index}`}
                    className="theme-parameter-scroll-preview-chip"
                  >
                    {`Scroll-${index + 1}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }
      case "control-slider-base": {
        return (
          <div
            className="theme-parameter-control-preview-row is-horizontal"
            data-testid="theme-control-preview-slider-base-horizontal"
          >
            <label className="theme-parameter-control-range-row">
              <span>基础 slider（横向）</span>
              <input
                aria-label="slider-base-horizontal-preview"
                className="theme-parameter-control-range"
                max={100}
                min={0}
                step={1}
                type="range"
                value={controlPreviewValues.sliderBaseHorizontal}
                onChange={(event) => {
                  setControlPreviewValues((current) => ({
                    ...current,
                    sliderBaseHorizontal: Number(event.target.value),
                  }));
                }}
              />
            </label>
          </div>
        );
      }
      case "control-slider-player": {
        return (
          <div
            className="theme-parameter-control-preview-row is-horizontal"
            data-testid="theme-control-preview-slider-player-horizontal"
          >
            <div className="video-controls-progress theme-parameter-player-progress-preview">
              <span className="video-progress-time">01:24 / 03:40</span>
              <SkeuoRunway
                ariaLabel="slider-player-progress-preview"
                fillTone="gold"
                max={100}
                min={0}
                preset="progress"
                rangePercent={controlPreviewValues.sliderPlayerProgress}
                step={1}
                value={controlPreviewValues.sliderPlayerProgress}
                onChange={(event) => {
                  setControlPreviewValues((current) => ({
                    ...current,
                    sliderPlayerProgress: Number(event.target.value),
                  }));
                }}
              />
            </div>
          </div>
        );
      }
      case "control-slider-vertical": {
        return (
          <div
            className="theme-parameter-control-preview-row is-horizontal"
            data-testid="theme-control-preview-slider-vertical-horizontal"
          >
            <label className="theme-parameter-control-range-row">
              <span>竖向链路横向参考</span>
              <input
                aria-label="slider-vertical-reference-preview"
                className="music-ctrl-shader-range theme-parameter-control-range"
                max={100}
                min={0}
                step={1}
                style={buildSkeuoRangeStyle(
                  controlPreviewValues.sliderVerticalReference,
                )}
                type="range"
                value={controlPreviewValues.sliderVerticalReference}
                onChange={(event) => {
                  setControlPreviewValues((current) => ({
                    ...current,
                    sliderVerticalReference: Number(event.target.value),
                  }));
                }}
              />
            </label>
          </div>
        );
      }
      case "control-slider-settings": {
        return (
          <div
            className="theme-parameter-control-preview-row is-horizontal"
            data-testid="theme-control-preview-slider-settings-horizontal"
          >
            <label className="theme-parameter-control-range-row">
              <span>设置面板 slider（横向）</span>
              <input
                aria-label="slider-settings-horizontal-preview"
                className="theme-parameter-control-range"
                max={100}
                min={0}
                step={1}
                type="range"
                value={controlPreviewValues.sliderSettingsHorizontal}
                onChange={(event) => {
                  setControlPreviewValues((current) => ({
                    ...current,
                    sliderSettingsHorizontal: Number(event.target.value),
                  }));
                }}
              />
            </label>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderCommonControlVerticalPreview = (
    sectionId: ThemeControlSectionId,
  ) => {
    switch (sectionId) {
      case "control-slider-player": {
        return null;
      }
      case "control-slider-vertical": {
        return (
          <div
            className="theme-parameter-control-vertical-stack is-volume-variants"
            data-testid="theme-control-preview-slider-vertical-stack"
          >
            <label className="theme-parameter-control-vertical-item">
              <span className="theme-parameter-control-preview-caption">朝上</span>
              <div className="theme-parameter-control-vertical-track-box">
                <div className="mpx-runway-axis is-vertical theme-parameter-control-vertical-runway theme-parameter-control-vertical-axis">
                  <SkeuoRunway
                    ariaLabel="slider-vertical-up-preview"
                    inputClassName="video-ctrl-volume-range"
                    max={100}
                    min={0}
                    orientation="vertical"
                    preset="control"
                    rangePercent={controlPreviewValues.sliderVerticalUp}
                    step={1}
                    value={controlPreviewValues.sliderVerticalUp}
                    onChange={(event) => {
                      setControlPreviewValues((current) => ({
                        ...current,
                        sliderVerticalUp: Number(event.target.value),
                      }));
                    }}
                  />
                </div>
              </div>
            </label>
            <label className="theme-parameter-control-vertical-item">
              <span className="theme-parameter-control-preview-caption">朝下</span>
              <div className="theme-parameter-control-vertical-track-box">
                <div
                  className="mpx-runway-axis is-vertical theme-parameter-control-vertical-runway theme-parameter-control-vertical-axis is-down"
                >
                  <SkeuoRunway
                    ariaLabel="slider-vertical-down-preview"
                    inputClassName="video-ctrl-volume-range"
                    max={100}
                    min={0}
                    orientation="vertical"
                    preset="control"
                    rangePercent={controlPreviewValues.sliderVerticalDown}
                    step={1}
                    value={controlPreviewValues.sliderVerticalDown}
                    onChange={(event) => {
                      setControlPreviewValues((current) => ({
                        ...current,
                        sliderVerticalDown: Number(event.target.value),
                      }));
                    }}
                  />
                </div>
              </div>
            </label>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderCommonControlSections = () => {
    return CONTROL_SECTION_DEFINITIONS.map((section) => {
      const colorFields = COMMON_CONTROL_COLOR_FIELDS.filter(
        (field) => field.sectionId === section.id,
      );
      const textFields = COMMON_CONTROL_TEXT_FIELDS.filter(
        (field) => field.sectionId === section.id,
      );
      if (colorFields.length === 0 && textFields.length === 0) {
        return null;
      }
      const horizontalPreview = renderCommonControlHorizontalPreview(section.id);
      const verticalPreview = renderCommonControlVerticalPreview(section.id);
      return (
        <section
          key={section.id}
          className="settings-group theme-parameter-debug-group"
          data-testid={`theme-control-section-${section.id}`}
        >
          <header className="settings-group-head">
            <span>{t(section.titleKey)}</span>
          </header>
          <p className="theme-parameter-note-intro">{t(section.noteKey)}</p>
          {horizontalPreview}
          <div
            className={
              verticalPreview
                ? "theme-parameter-control-content has-right-vertical"
                : "theme-parameter-control-content"
            }
          >
            <div className="theme-parameter-control-fields">
              {colorFields.length > 0 ? (
                <div className="theme-parameter-color-list">
                  {colorFields.map(renderColorFieldRow)}
                </div>
              ) : null}
              {textFields.length > 0 ? (
                <div className="theme-parameter-text-list">
                  {textFields.map(renderCommonControlTextFieldRow)}
                </div>
              ) : null}
            </div>
            {verticalPreview ? (
              <aside className="theme-parameter-control-vertical-side">
                {verticalPreview}
              </aside>
            ) : null}
          </div>
        </section>
      );
    });
  };

  const renderNumberGroups = (
    groups: ReadonlyArray<{
      id: ThemeDebugNumberGroupId;
      title: string;
      parameters: ThemeParameterDefinition[];
    }>,
  ) => {
    return groups.map((group) => (
      <section
        key={group.id}
        className="settings-group theme-parameter-debug-group"
      >
        <header className="settings-group-head">
          <span>{group.title}</span>
        </header>
        {renderParameterRows(group.parameters)}
      </section>
    ));
  };

  const renderParameterRows = (parameters: ThemeParameterDefinition[]) => {
    return (
      <div className="theme-parameter-list">
        {parameters.map((parameter) => {
          const value = values[parameter.id] ?? parameter.fallback;
          return (
            <label
              key={parameter.id}
              className="theme-parameter-row"
              htmlFor={`theme-parameter-${parameter.id}`}
            >
              <span>{resolveLabel(parameter)}</span>
              <span className="theme-parameter-var-label">{parameter.id}</span>
              <div className="theme-parameter-control">
                <input
                  id={`theme-parameter-${parameter.id}`}
                  type="range"
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  value={value}
                  onChange={(event) =>
                    applyParameter(parameter, Number(event.target.value))
                  }
                />
                <input
                  className="theme-parameter-number-input"
                  type="number"
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  value={value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) {
                      return;
                    }
                    applyParameter(parameter, next);
                  }}
                />
                <code className="theme-parameter-value-text">
                  {`${formatValue(value, parameter.step)}${parameter.unit}`}
                </code>
                {isParameterChanged(parameter) ? (
                  <button
                    type="button"
                    className="theme-parameter-reset-btn"
                    onClick={() => resetSingleParameter(parameter)}
                  >
                    {t("ui.themeParameter.resetField")}
                  </button>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const buttonTemplateStates: ReadonlyArray<{
    key: ButtonStateKey;
    state: string;
    styleSource: string;
    interaction: string;
    usage: string;
    demoLabel: string;
  }> = [
    {
      key: "idle",
      state: "默认态 (idle)",
      styleSource: ".theme-parameter-side-btn（default variant）",
      interaction: "初始渲染，未悬停/未按下/未选中",
      usage: "ThemeParameterPanelMain.tsx -> side 分页按钮",
      demoLabel: "默认",
    },
    {
      key: "hover",
      state: "悬停态 (hover)",
      styleSource:
        ".theme-parameter-side-btn:hover / .force-hover（side-btn-hover-*）",
      interaction: "pointerenter / mouseenter",
      usage: "ThemeParameterPanelMain.tsx -> side 分页按钮",
      demoLabel: "悬停测试",
    },
    {
      key: "active",
      state: "按下态 (active)",
      styleSource:
        ".theme-parameter-side-btn:active / .force-active（side-btn-active-*）",
      interaction: "pointerdown / mousedown",
      usage: "ThemeParameterPanelMain.tsx -> side 分页按钮",
      demoLabel: "按下测试",
    },
    {
      key: "selected",
      state: "选中态 (is-active)",
      styleSource: ".theme-parameter-side-btn.is-active（side-btn-selected-*）",
      interaction: "click 后由业务状态切换 class",
      usage: "ThemeParameterPanelMain.tsx -> activePage 对应按钮",
      demoLabel: "已选中",
    },
    {
      key: "pressed",
      state: "开关按压态 (aria-pressed='true')",
      styleSource:
        ".theme-parameter-side-btn[aria-pressed='true']（side-btn-pressed-*）",
      interaction: "click 切换布尔开关状态",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮样式调试",
      demoLabel: "开关已按下",
    },
    {
      key: "disabled",
      state: "禁用态 (disabled)",
      styleSource: ".theme-parameter-side-btn:disabled（side-btn-disabled-*）",
      interaction: "组件设置 disabled，阻断点击",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮样式调试",
      demoLabel: "禁用",
    },
    {
      key: "pending",
      state: "待处理态 (is-pending)",
      styleSource: ".theme-parameter-side-btn.is-pending（side-btn-pending-*）",
      interaction: "异步任务期间由业务状态添加 class",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮样式调试",
      demoLabel: "处理中",
    },
    {
      key: "close-hover",
      state: "危险悬停态 (close:hover)",
      styleSource:
        ".theme-parameter-side-btn.danger:hover / .danger.force-hover",
      interaction: "关闭按钮 hover",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮样式调试",
      demoLabel: "关闭悬停测试",
    },
  ] as const;

  return (
    <div className="mpx-large-panel-shell settings-shell theme-parameter-shell">
      <aside className="mpx-large-panel-side settings-side theme-parameter-side">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={
              activePage === page.id
                ? "theme-parameter-side-btn is-active"
                : "theme-parameter-side-btn"
            }
            onClick={() => setActivePage(page.id)}
          >
            {t(page.labelKey)}
          </button>
        ))}
      </aside>

      <main
        ref={setMainScrollElement}
        className="mpx-large-panel-main settings-main mpx-scroll-area theme-parameter-main"
        onScroll={onMainScroll}
      >
        {activePage === "parameters" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.parameters")}</span>
              </header>
              <label
                className="theme-parameter-search"
                htmlFor="theme-parameter-search-input"
              >
                <span>{t("ui.themeParameter.searchLabel")}</span>
                <input
                  id="theme-parameter-search-input"
                  type="text"
                  value={searchText}
                  placeholder={t("ui.themeParameter.searchPlaceholder")}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
            </section>

            <details
              className="settings-collapsible"
              open={commonExpanded}
              onToggle={(event) =>
                setCommonExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>{t("ui.themeParameter.sectionCommon")}</summary>
              <div className="settings-collapsible-content">
                {renderParameterRows(filteredCommonParameters)}
                {filteredCommonParameters.length === 0 ? (
                  <p className="settings-placeholder">
                    {t("ui.common.noResults")}
                  </p>
                ) : null}
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={styleExpanded}
              onToggle={(event) =>
                setStyleExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.sectionStyle", { styleId })}
              </summary>
              <div className="settings-collapsible-content">
                {styleParameters.length === 0 ? (
                  <p className="settings-placeholder">
                    {t("ui.themeParameter.noStyleSpecific")}
                  </p>
                ) : (
                  renderParameterRows(filteredStyleParameters)
                )}
                {styleParameters.length > 0 &&
                filteredStyleParameters.length === 0 ? (
                  <p className="settings-placeholder">
                    {t("ui.common.noResults")}
                  </p>
                ) : null}
              </div>
            </details>
          </section>
        ) : null}

        {activePage === "snapshot" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.snapshot")}</span>
              </header>
              <label>
                <input
                  type="checkbox"
                  checked={snapshotIncludeComputedValues}
                  onChange={(event) => {
                    setSnapshotIncludeComputedValues(event.target.checked);
                  }}
                />
                <span>
                  {t("ui.themeParameter.snapshotIncludeComputedValues")}
                </span>
              </label>
              <div className="theme-parameter-actions">
                <button type="button" onClick={exportSnapshotJson}>
                  {t("ui.themeParameter.exportJson")}
                </button>
                <button type="button" onClick={downloadSnapshotJson}>
                  {t("ui.themeParameter.downloadJsonFile")}
                </button>
                <button type="button" onClick={openSnapshotFilePicker}>
                  {t("ui.themeParameter.loadJsonFile")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copySnapshotJson();
                  }}
                >
                  {t("ui.themeParameter.copyJson")}
                </button>
                <button type="button" onClick={importSnapshotJson}>
                  {t("ui.themeParameter.importJson")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSnapshotJson("");
                    setSnapshotMessage("");
                  }}
                >
                  {t("ui.themeParameter.clearJson")}
                </button>
              </div>
              <input
                ref={snapshotFileInputRef}
                className="theme-parameter-file-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void loadSnapshotFile(event);
                }}
              />
              <label
                className="theme-parameter-json-field"
                htmlFor="theme-parameter-json-input"
              >
                <span>{t("ui.themeParameter.snapshotLabel")}</span>
                <textarea
                  id="theme-parameter-json-input"
                  value={snapshotJson}
                  placeholder={t("ui.themeParameter.snapshotPlaceholder")}
                  onChange={(event) => setSnapshotJson(event.target.value)}
                />
              </label>
              {snapshotMessage ? (
                <p className="settings-placeholder">{snapshotMessage}</p>
              ) : null}
            </section>
          </section>
        ) : null}

        {activePage === "containerLayer" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.containerLayer")}</span>
              </header>
              <div className="theme-parameter-debug-preview-actions">
                <button
                  type="button"
                  className={
                    activePreviewMode === "bg-only"
                      ? "theme-parameter-debug-preview-btn is-active"
                      : "theme-parameter-debug-preview-btn"
                  }
                  onClick={() => togglePreviewMode("bg-only")}
                >
                  {t("ui.themeParameter.preview.bgOnly")}
                </button>
                <button
                  type="button"
                  className={
                    activePreviewMode === "bg-plus-container"
                      ? "theme-parameter-debug-preview-btn is-active"
                      : "theme-parameter-debug-preview-btn"
                  }
                  onClick={() => togglePreviewMode("bg-plus-container")}
                >
                  {t("ui.themeParameter.preview.bgPlusContainer")}
                </button>
              </div>
            </section>

            <details
              className="settings-collapsible"
              open={containerLegacyExpanded}
              onToggle={(event) =>
                setContainerLegacyExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>{t("ui.themeParameter.containerLayer.sectionLegacy")}</summary>
              <div className="settings-collapsible-content">
                {renderColorGroups(CONTAINER_COLOR_FIELDS, [
                  "box",
                  "border",
                  "shadow",
                ])}
                {renderTextGroups(CONTAINER_TEXT_FIELDS, ["shadow"])}
                {renderNumberGroups(containerNumberGroups)}
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerSidebarMainExpanded}
              onToggle={(event) =>
                setContainerSidebarMainExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionSidebarMain")}
              </summary>
              <div className="settings-collapsible-content">
                {renderSidebarMainDebugSections()}
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerMainImageNameListExpanded}
              onToggle={(event) =>
                setContainerMainImageNameListExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionMainImageNameList")}
              </summary>
              <div className="settings-collapsible-content">
                {renderMainImageNameListDebugSections()}
              </div>
            </details>
          </section>
        ) : null}

        {activePage === "largePanelLayer" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.largePanelLayer")}</span>
              </header>
              <div className="theme-parameter-debug-preview-actions">
                <button
                  type="button"
                  className={
                    activePreviewMode === "bg-plus-large-panel"
                      ? "theme-parameter-debug-preview-btn is-active"
                      : "theme-parameter-debug-preview-btn"
                  }
                  onClick={() => togglePreviewMode("bg-plus-large-panel")}
                >
                  {t("ui.themeParameter.preview.bgPlusLargePanel")}
                </button>
              </div>
            </section>
            {renderColorGroups(LARGE_PANEL_COLOR_FIELDS, [
              "root",
              "head",
              "side",
              "main",
            ])}
            {renderTextGroups(LARGE_PANEL_TEXT_FIELDS, ["main"])}
            {renderNumberGroups(largePanelNumberGroups)}
          </section>
        ) : null}

        {activePage === "smallPanelLayer" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.smallPanelLayer")}</span>
              </header>
              <div className="theme-parameter-debug-preview-actions">
                <button
                  type="button"
                  className={
                    activePreviewMode === "bg-plus-small-panel"
                      ? "theme-parameter-debug-preview-btn is-active"
                      : "theme-parameter-debug-preview-btn"
                  }
                  onClick={() => togglePreviewMode("bg-plus-small-panel")}
                >
                  {t("ui.themeParameter.preview.bgPlusSmallPanel")}
                </button>
              </div>
            </section>
            {renderColorGroups(SMALL_PANEL_COLOR_FIELDS, ["box", "border"])}
            {renderTextGroups(SMALL_PANEL_TEXT_FIELDS, ["shadow"])}
            {renderNumberGroups(smallPanelNumberGroups)}
          </section>
        ) : null}

        {activePage === "commonControls" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.commonControls")}</span>
              </header>
            </section>
            {renderCommonControlSections()}
          </section>
        ) : null}

        {activePage === "buttonStates" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.buttonStates")}</span>
              </header>
              <p className="theme-parameter-note-intro">
                当前页基于 4.0 按钮层（core/variant/slot）展示 side 分页按钮。
                每个状态都对应独立的调节项和展示项（border/bg/text）。
                颜色字段直接映射
                <code>
                  --mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-*
                </code>
                ，修改后立即作用到分页按钮样式。
              </p>
              <ul className="theme-parameter-note-list">
                {buttonTemplateStates.map((item) => (
                  <li key={item.state}>
                    <div className="theme-parameter-note-title-row">
                      <strong>{item.state}</strong>
                      <div className="theme-parameter-state-demo">
                        <button
                          aria-pressed={item.key === "pressed"}
                          className={[
                            "theme-parameter-side-btn",
                            item.key === "selected" ? "is-active" : "",
                            item.key === "hover" ? "force-hover" : "",
                            item.key === "active" ? "force-active" : "",
                            item.key === "pending" ? "is-pending" : "",
                            item.key === "close-hover"
                              ? "danger force-hover"
                              : "",
                          ]
                            .join(" ")
                            .trim()}
                          type="button"
                          disabled={item.key === "disabled"}
                        >
                          {item.demoLabel}
                        </button>
                      </div>
                    </div>
                    <div className="theme-parameter-state-field-list">
                      {resolveButtonStateFields(item.key).map(
                        renderColorFieldRow,
                      )}
                    </div>
                    <span>样式来源：{item.styleSource}</span>
                    <span>交互事件：{item.interaction}</span>
                    <span>示例位置：{item.usage}</span>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        ) : null}
      </main>
    </div>
  );
}
