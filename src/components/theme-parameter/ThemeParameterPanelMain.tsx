import type {
  ChangeEvent,
  CSSProperties,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  containerBackgroundExpanded: boolean;
  setContainerBackgroundExpanded: Dispatch<SetStateAction<boolean>>;
  containerSharedShellExpanded: boolean;
  setContainerSharedShellExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderExpanded: boolean;
  setContainerHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderAppearanceExpanded: boolean;
  setContainerHeaderAppearanceExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderButtonsExpanded: boolean;
  setContainerHeaderButtonsExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderLogoExpanded: boolean;
  setContainerHeaderLogoExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderG1Expanded: boolean;
  setContainerHeaderG1Expanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderG2Expanded: boolean;
  setContainerHeaderG2Expanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderGDebugExpanded: boolean;
  setContainerHeaderGDebugExpanded: Dispatch<SetStateAction<boolean>>;
  containerHeaderG3Expanded: boolean;
  setContainerHeaderG3Expanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarExpanded: boolean;
  setContainerSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarAppearanceExpanded: boolean;
  setContainerSidebarAppearanceExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarHeaderExpanded: boolean;
  setContainerSidebarHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarHeaderTitleExpanded: boolean;
  setContainerSidebarHeaderTitleExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarHeaderActionsExpanded: boolean;
  setContainerSidebarHeaderActionsExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainExpanded: boolean;
  setContainerMainExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainAppearanceExpanded: boolean;
  setContainerMainAppearanceExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainHeaderExpanded: boolean;
  setContainerMainHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainHeaderButtonsExpanded: boolean;
  setContainerMainHeaderButtonsExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainWorkspaceExpanded: boolean;
  setContainerMainWorkspaceExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataExpanded: boolean;
  setContainerMetadataExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataAppearanceExpanded: boolean;
  setContainerMetadataAppearanceExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataHeaderExpanded: boolean;
  setContainerMetadataHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataHeaderButtonsExpanded: boolean;
  setContainerMetadataHeaderButtonsExpanded: Dispatch<SetStateAction<boolean>>;
  containerSidebarMainExpanded: boolean;
  setContainerSidebarMainExpanded: Dispatch<SetStateAction<boolean>>;
  containerMainImageNameListExpanded: boolean;
  setContainerMainImageNameListExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelRootExpanded: boolean;
  setLargePanelRootExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelSharedSectionExpanded: boolean;
  setLargePanelSharedSectionExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelHeadExpanded: boolean;
  setLargePanelHeadExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelSideExpanded: boolean;
  setLargePanelSideExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelMainExpanded: boolean;
  setLargePanelMainExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelInternalExpanded: boolean;
  setLargePanelInternalExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelInternalSectionsExpanded: Record<LargePanelInternalSectionId, boolean>;
  setLargePanelInternalSectionExpanded: (
    sectionId: LargePanelInternalSectionId,
    action: SetStateAction<boolean>,
  ) => void;
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

export type LargePanelInternalSectionId =
  | "importTask"
  | "metadataFetch"
  | "metadataPreferenceRecord"
  | "metadataBookletBinding"
  | "metadataFeatureTagPicker"
  | "subtitleCleanup"
  | "transcodeDialog"
  | "sidebarRenamePreview";

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

interface ContainerDebugSubsection {
  id: string;
  summaryKey: string;
  colorFields?: readonly ThemeDebugColorField[];
  textFields?: readonly ThemeDebugTextField[];
  parameterIds?: readonly string[];
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

const CONTAINER_BACKGROUND_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-bg-app-fill",
    cssVar: "--mpx-bg-app-fill",
    fallback: "#f2eee7",
    groupId: "box",
  },
];

const CONTAINER_SHARED_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-frame-fill-start",
    cssVar: "--mpx-container-frame-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-frame-fill-end",
    cssVar: "--mpx-container-frame-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-frame-edge-color",
    cssVar: "--mpx-container-frame-edge-color",
    fallback: "#cdc7bb",
    groupId: "shadow",
  },
  {
    id: "container-frame-border-color",
    cssVar: "--mpx-container-frame-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

const CONTAINER_SHARED_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-frame-shadow",
    cssVar: "--mpx-container-frame-shadow",
    fallback:
      "0 0 0 1px color-mix(in srgb, var(--mpx-container-frame-border-color) 92%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-container-frame-edge-color) 72%, transparent), 2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15)",
    groupId: "shadow",
  },
];

const CONTAINER_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-fill-start",
    cssVar: "--mpx-header-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-header-fill-end",
    cssVar: "--mpx-header-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-header-border-color",
    cssVar: "--mpx-header-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

const CONTAINER_HEADER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-header-shadow",
    cssVar: "--mpx-header-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

const CONTAINER_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-buttons-border",
    cssVar: "--mpx-slot-fg-header-button-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-buttons-bg",
    cssVar: "--mpx-slot-fg-header-button-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-buttons-text",
    cssVar: "--mpx-slot-fg-header-button-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_HEADER_LOGO_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-logo-border",
    cssVar: "--mpx-slot-fg-header-logo-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-logo-bg",
    cssVar: "--mpx-slot-fg-header-logo-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-logo-text",
    cssVar: "--mpx-slot-fg-header-logo-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_HEADER_G1_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-g1-border",
    cssVar: "--mpx-slot-fg-header-g1-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-g1-bg",
    cssVar: "--mpx-slot-fg-header-g1-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-g1-text",
    cssVar: "--mpx-slot-fg-header-g1-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_HEADER_G2_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-g2-mode-border",
    cssVar: "--mpx-slot-fg-header-g2-mode-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-g2-mode-bg",
    cssVar: "--mpx-slot-fg-header-g2-mode-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-g2-mode-text",
    cssVar: "--mpx-slot-fg-header-g2-mode-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_HEADER_GDEBUG_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-g-debug-border",
    cssVar: "--mpx-slot-fg-header-g-debug-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-g-debug-bg",
    cssVar: "--mpx-slot-fg-header-g-debug-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-g-debug-text",
    cssVar: "--mpx-slot-fg-header-g-debug-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_HEADER_G3_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-g3-border",
    cssVar: "--mpx-slot-fg-header-g3-border",
    fallback: "#b7ab95",
    groupId: "head",
  },
  {
    id: "container-header-g3-bg",
    cssVar: "--mpx-slot-fg-header-g3-bg",
    fallback: "#ffffff",
    groupId: "head",
  },
  {
    id: "container-header-g3-text",
    cssVar: "--mpx-slot-fg-header-g3-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const CONTAINER_SIDEBAR_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-sidebar-fill-start",
    cssVar: "--mpx-sidebar-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-sidebar-fill-end",
    cssVar: "--mpx-sidebar-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-sidebar-border-color",
    cssVar: "--mpx-sidebar-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

const CONTAINER_SIDEBAR_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-sidebar-shadow",
    cssVar: "--mpx-sidebar-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

const CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-sidebar-header-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-bg",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-header-border",
    cssVar: "--mpx-slot-fg-sidebar-header-border",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "container-sidebar-header-text",
    cssVar: "--mpx-slot-fg-sidebar-header-text",
    fallback: "#2e2a22",
    groupId: "side",
  },
  {
    id: "container-sidebar-header-button-border",
    cssVar: "--mpx-slot-fg-sidebar-header-button-border",
    fallback: "#b7ab95",
    groupId: "side",
  },
  {
    id: "container-sidebar-header-button-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-button-bg",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "container-sidebar-header-button-text",
    cssVar: "--mpx-slot-fg-sidebar-header-button-text",
    fallback: "#2e2a22",
    groupId: "side",
  },
];

const CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-header-title-border",
      cssVar: "--mpx-slot-fg-sidebar-header-title-border",
      fallback: "#b7ab95",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-title-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-title-bg",
      fallback: "#ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-title-text",
      cssVar: "--mpx-slot-fg-sidebar-header-title-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
  ];

const CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-header-action-border",
      cssVar: "--mpx-slot-fg-sidebar-header-action-border",
      fallback: "#b7ab95",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-action-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-action-bg",
      fallback: "#ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-action-text",
      cssVar: "--mpx-slot-fg-sidebar-header-action-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
  ];

const CONTAINER_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-main-fill-start",
    cssVar: "--mpx-main-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-main-fill-end",
    cssVar: "--mpx-main-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-main-border-color",
    cssVar: "--mpx-main-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

const CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-bg-workspace",
    cssVar: "--mpx-bg-workspace",
    fallback: "#f3f0ea",
    groupId: "box",
  },
];

const CONTAINER_MAIN_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-main-shadow",
    cssVar: "--mpx-main-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

const CONTAINER_MAIN_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-main-header-fill-start",
    cssVar: "--mpx-main-header-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "main",
  },
  {
    id: "container-main-header-fill-end",
    cssVar: "--mpx-main-header-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "main",
  },
  {
    id: "container-main-header-border-color",
    cssVar: "--mpx-main-header-border-color",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "main",
  },
];

const CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-header-button-border",
      cssVar: "--mpx-slot-fg-main-header-button-border",
      fallback: "#b7ab95",
      groupId: "main",
    },
    {
      id: "container-main-header-button-bg",
      cssVar: "--mpx-slot-fg-main-header-button-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-main-header-button-text",
      cssVar: "--mpx-slot-fg-main-header-button-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
  ];

const CONTAINER_METADATA_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-metadata-fill-start",
    cssVar: "--mpx-metadata-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-metadata-fill-end",
    cssVar: "--mpx-metadata-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-metadata-border-color",
    cssVar: "--mpx-metadata-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

const CONTAINER_METADATA_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-metadata-shadow",
    cssVar: "--mpx-metadata-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

const CONTAINER_METADATA_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-header-fill-start",
      cssVar: "--mpx-metadata-header-fill-start",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-metadata-header-fill-end",
      cssVar: "--mpx-metadata-header-fill-end",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-metadata-header-border-color",
      cssVar: "--mpx-metadata-header-border-color",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
  ];

const CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-header-button-border",
      cssVar: "--mpx-slot-fg-meta-header-button-border",
      fallback: "#b7ab95",
      groupId: "main",
    },
    {
      id: "container-metadata-header-button-bg",
      cssVar: "--mpx-slot-fg-meta-header-button-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-metadata-header-button-text",
      cssVar: "--mpx-slot-fg-meta-header-button-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
  ];

const CONTAINER_FRAME_SECTION_DEFINITIONS = [
  {
    id: "header",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeader",
    colorFields: CONTAINER_HEADER_COLOR_FIELDS,
    textFields: CONTAINER_HEADER_TEXT_FIELDS,
    appearanceParameterIds: [
      "header-fill-angle",
      "header-radius",
      "header-z-index",
    ],
    transformParameterIds: [
      "header-frame-translate-x",
      "header-frame-translate-y",
      "header-frame-rotate-z",
      "header-frame-scale-x",
      "header-frame-scale-y",
      "header-frame-origin-x",
      "header-frame-origin-y",
    ],
  },
  {
    id: "sidebar",
    summaryKey: "ui.themeParameter.containerLayer.sectionSidebar",
    colorFields: CONTAINER_SIDEBAR_COLOR_FIELDS,
    textFields: CONTAINER_SIDEBAR_TEXT_FIELDS,
    appearanceParameterIds: [
      "sidebar-fill-angle",
      "sidebar-radius",
      "sidebar-z-index",
    ],
    transformParameterIds: [
      "sidebar-frame-translate-x",
      "sidebar-frame-translate-y",
      "sidebar-frame-rotate-z",
      "sidebar-frame-scale-x",
      "sidebar-frame-scale-y",
      "sidebar-frame-origin-x",
      "sidebar-frame-origin-y",
    ],
  },
  {
    id: "main",
    summaryKey: "ui.themeParameter.containerLayer.sectionMain",
    colorFields: CONTAINER_MAIN_COLOR_FIELDS,
    textFields: CONTAINER_MAIN_TEXT_FIELDS,
    appearanceParameterIds: ["main-fill-angle", "main-radius", "main-z-index"],
    transformParameterIds: [
      "main-frame-translate-x",
      "main-frame-translate-y",
      "main-frame-rotate-z",
      "main-frame-scale-x",
      "main-frame-scale-y",
      "main-frame-origin-x",
      "main-frame-origin-y",
    ],
  },
  {
    id: "metadata",
    summaryKey: "ui.themeParameter.containerLayer.sectionMetadata",
    colorFields: CONTAINER_METADATA_COLOR_FIELDS,
    textFields: CONTAINER_METADATA_TEXT_FIELDS,
    appearanceParameterIds: [
      "metadata-fill-angle",
      "metadata-radius",
      "metadata-z-index",
    ],
    transformParameterIds: [
      "metadata-frame-translate-x",
      "metadata-frame-translate-y",
      "metadata-frame-rotate-z",
      "metadata-frame-scale-x",
      "metadata-frame-scale-y",
      "metadata-frame-origin-x",
      "metadata-frame-origin-y",
    ],
  },
] as const;

const CONTAINER_SHARED_SHELL_PARAMETER_IDS = [
  "layout-padding",
  "splitter-width",
  "container-frame-radius",
] as const;

const CONTAINER_SHARED_SHELL_INLINE_PARAMETER_IDS = [
  "container-frame-fill-angle",
] as const;

const CONTAINER_SHARED_SHELL_COLOR_FIELD_IDS = [
  "container-frame-fill-start",
  "container-frame-fill-end",
  "container-frame-border-color",
  "container-frame-edge-color",
] as const;

const CONTAINER_SHARED_SHELL_TEXT_FIELD_IDS = [
  "container-frame-shadow",
] as const;

const CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS = [
  "container-header-shadow",
  "container-sidebar-shadow",
  "container-main-shadow",
  "container-metadata-shadow",
] as const;

const CONTAINER_FILL_SYNC_COLOR_FIELD_IDS = {
  "container-frame-fill-start": [
    "container-header-fill-start",
    "container-sidebar-fill-start",
    "container-main-fill-start",
    "container-metadata-fill-start",
  ],
  "container-frame-fill-end": [
    "container-header-fill-end",
    "container-sidebar-fill-end",
    "container-main-fill-end",
    "container-metadata-fill-end",
  ],
} as const;

const LARGE_PANEL_ROOT_INLINE_PARAMETER_IDS = [
  "large-panel-fill-angle",
] as const;

const LARGE_PANEL_ROOT_PARAMETER_IDS = [
  "large-panel-border-width",
  "large-panel-width",
  "large-panel-height",
  "large-panel-radius",
  "large-panel-shell-padding",
  "large-panel-shell-gap",
] as const;

const LARGE_PANEL_SHARED_INLINE_PARAMETER_IDS = [
  "large-panel-section-fill-angle",
] as const;

const LARGE_PANEL_SHARED_PARAMETER_IDS = [
  "large-panel-section-border-width",
] as const;

const LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS = {
  "large-panel-section-fill-start": [
    "large-panel-head-fill-start",
    "large-panel-side-fill-start",
    "large-panel-main-fill-start",
  ],
  "large-panel-section-fill-end": [
    "large-panel-head-fill-end",
    "large-panel-side-fill-end",
    "large-panel-main-fill-end",
  ],
  "large-panel-section-border-color": [
    "large-panel-head-border-color",
    "large-panel-side-border-color",
    "large-panel-main-border-color",
  ],
} as const;

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
    fallback:
      "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-active-hover-shadow",
    cssVar: "--mpx-sidebar-main-label-active-hover-shadow",
    fallback:
      "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
    groupId: "side",
  },
  {
    id: "container-sidebar-main-label-manage-selected-shadow",
    cssVar: "--mpx-sidebar-main-label-manage-selected-shadow",
    fallback:
      "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
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

const HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] = [
  {
    id: "header-buttons",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderButtons",
    colorFields: CONTAINER_HEADER_BUTTONS_COLOR_FIELDS,
  },
  {
    id: "header-logo",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderLogo",
    colorFields: CONTAINER_HEADER_LOGO_COLOR_FIELDS,
  },
  {
    id: "header-g1",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG1",
    colorFields: CONTAINER_HEADER_G1_COLOR_FIELDS,
  },
  {
    id: "header-g2",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG2",
    colorFields: CONTAINER_HEADER_G2_COLOR_FIELDS,
  },
  {
    id: "header-g-debug",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderGDebug",
    colorFields: CONTAINER_HEADER_GDEBUG_COLOR_FIELDS,
  },
  {
    id: "header-g3",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG3",
    colorFields: CONTAINER_HEADER_G3_COLOR_FIELDS,
  },
];

const SIDEBAR_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] = [
  {
    id: "sidebar-header-root",
    summaryKey: "ui.themeParameter.containerLayer.sectionSidebarHeader",
    colorFields: CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS,
  },
  {
    id: "sidebar-header-title",
    summaryKey: "ui.themeParameter.containerLayer.sectionSidebarHeaderTitle",
    colorFields: CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS,
  },
  {
    id: "sidebar-header-actions",
    summaryKey: "ui.themeParameter.containerLayer.sectionSidebarHeaderActions",
    colorFields: CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS,
  },
];

const MAIN_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] = [
  {
    id: "main-header-root",
    summaryKey: "ui.themeParameter.containerLayer.sectionMainHeader",
    colorFields: CONTAINER_MAIN_HEADER_COLOR_FIELDS,
    parameterIds: ["main-header-fill-angle"],
  },
  {
    id: "main-header-buttons",
    summaryKey: "ui.themeParameter.containerLayer.sectionMainHeaderButtons",
    colorFields: CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS,
  },
];

const METADATA_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] = [
  {
    id: "metadata-header-root",
    summaryKey: "ui.themeParameter.containerLayer.sectionMetadataHeader",
    colorFields: CONTAINER_METADATA_HEADER_COLOR_FIELDS,
    parameterIds: ["metadata-header-fill-angle"],
  },
  {
    id: "metadata-header-buttons",
    summaryKey: "ui.themeParameter.containerLayer.sectionMetadataHeaderButtons",
    colorFields: CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS,
  },
];

const CONTAINER_LAYER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  ...CONTAINER_SHARED_COLOR_FIELDS,
  ...CONTAINER_HEADER_COLOR_FIELDS,
  ...CONTAINER_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_HEADER_LOGO_COLOR_FIELDS,
  ...CONTAINER_HEADER_G1_COLOR_FIELDS,
  ...CONTAINER_HEADER_G2_COLOR_FIELDS,
  ...CONTAINER_HEADER_GDEBUG_COLOR_FIELDS,
  ...CONTAINER_HEADER_G3_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS,
  ...CONTAINER_MAIN_COLOR_FIELDS,
  ...CONTAINER_MAIN_HEADER_COLOR_FIELDS,
  ...CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS,
  ...CONTAINER_METADATA_COLOR_FIELDS,
  ...CONTAINER_METADATA_HEADER_COLOR_FIELDS,
  ...CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS,
  ...CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS,
];

const CONTAINER_LAYER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  ...CONTAINER_BACKGROUND_TEXT_FIELDS,
  ...CONTAINER_SHARED_TEXT_FIELDS,
  ...CONTAINER_HEADER_TEXT_FIELDS,
  ...CONTAINER_SIDEBAR_TEXT_FIELDS,
  ...CONTAINER_MAIN_TEXT_FIELDS,
  ...CONTAINER_METADATA_TEXT_FIELDS,
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
  if (cssVar === "--mpx-bg-app-fill") {
    return "用于应用背景 fill（App background fill，支持渐变等高级效果）";
  }
  if (cssVar === "--mpx-bg-workspace") {
    return "用于主区图片网格背景（image grid background）";
  }
  if (cssVar === "--mpx-container-frame-fill-start") {
    return "用于共享壳层 fill 起始色";
  }
  if (cssVar === "--mpx-container-frame-fill-end") {
    return "用于共享壳层 fill 结束色";
  }
  if (cssVar === "--mpx-container-frame-fill-angle") {
    return "用于共享壳层渐变角度";
  }
  if (cssVar === "--mpx-container-frame-edge-color") {
    return "用于共享壳层阴影边缘混色";
  }
  if (cssVar === "--mpx-container-frame-border-color") {
    return "用于四大容器共享边框色";
  }
  if (cssVar === "--mpx-container-frame-shadow") {
    return "用于四大容器共享壳层阴影";
  }
  if (cssVar === "--mpx-container-frame-radius") {
    return "用于共享壳层圆角";
  }
  if (cssVar === "--mpx-layout-padding") {
    return "用于布局内边距";
  }
  if (cssVar === "--mpx-splitter-width") {
    return "用于分割条宽度";
  }
  if (cssVar === "--mpx-header-bg") {
    return "用于 Header frame 填充";
  }
  if (cssVar === "--mpx-header-border-color") {
    return "用于 Header frame 边框色";
  }
  if (cssVar === "--mpx-header-shadow") {
    return "用于 Header frame 阴影";
  }
  if (cssVar === "--mpx-header-fill-start") {
    return "用于 Header frame fill 起始色";
  }
  if (cssVar === "--mpx-header-fill-end") {
    return "用于 Header frame fill 结束色";
  }
  if (cssVar === "--mpx-header-fill-angle") {
    return "用于 Header frame 渐变角度";
  }
  if (cssVar === "--mpx-header-z-index") {
    return "用于 Header 层级";
  }
  if (cssVar === "--mpx-slot-fg-header-button-border") {
    return "用于 Header 按钮总控边框（fg-header 全局按钮 fallback）";
  }
  if (cssVar === "--mpx-slot-fg-header-button-bg") {
    return "用于 Header 按钮总控背景（fg-header 全局按钮 fallback）";
  }
  if (cssVar === "--mpx-slot-fg-header-button-text") {
    return "用于 Header 按钮总控文字（fg-header 全局按钮 fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-logo-")) {
    return "用于 Header logo 按钮链路（fg-header-logo）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g1-")) {
    return "用于 Header g1 分组链路（fg-header-g1）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g2-mode-")) {
    return "用于 Header g2 模式切换链路（fg-header-g2）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g-debug-")) {
    return "用于 Header gDebug 分组链路（fg-header-g-debug）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g3-")) {
    return "用于 Header g3 分组链路（fg-header-g3）";
  }
  if (cssVar === "--mpx-sidebar-bg") {
    return "用于 Sidebar frame 填充";
  }
  if (cssVar === "--mpx-sidebar-border-color") {
    return "用于 Sidebar frame 边框色";
  }
  if (cssVar === "--mpx-sidebar-shadow") {
    return "用于 Sidebar frame 阴影";
  }
  if (cssVar === "--mpx-sidebar-fill-start") {
    return "用于 Sidebar frame fill 起始色";
  }
  if (cssVar === "--mpx-sidebar-fill-end") {
    return "用于 Sidebar frame fill 结束色";
  }
  if (cssVar === "--mpx-sidebar-fill-angle") {
    return "用于 Sidebar frame 渐变角度";
  }
  if (cssVar === "--mpx-sidebar-z-index") {
    return "用于 Sidebar 层级";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-bg") {
    return "用于 Sidebar header 根背景（.sidebar-header）";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-border") {
    return "用于 Sidebar header 根分隔线（.sidebar-header border-bottom）";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-text") {
    return "用于 Sidebar header 根文字 fallback（title / action text fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-button-")) {
    return "用于 Sidebar header 按钮总控（fg-sidebar-header 按钮 fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-title-")) {
    return "用于 Sidebar header title 按钮（fg-sidebar-header-title）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-action-")) {
    return "用于 Sidebar header 其余按钮总控（fg-sidebar-header action）";
  }
  if (cssVar === "--mpx-main-bg") {
    return "用于 Main frame 填充";
  }
  if (cssVar === "--mpx-main-border-color") {
    return "用于 Main frame 边框色";
  }
  if (cssVar === "--mpx-main-shadow") {
    return "用于 Main frame 阴影";
  }
  if (cssVar === "--mpx-main-fill-start") {
    return "用于 Main frame fill 起始色";
  }
  if (cssVar === "--mpx-main-fill-end") {
    return "用于 Main frame fill 结束色";
  }
  if (cssVar === "--mpx-main-fill-angle") {
    return "用于 Main frame 渐变角度";
  }
  if (cssVar === "--mpx-main-z-index") {
    return "用于 Main 层级";
  }
  if (cssVar === "--mpx-main-header-fill-start") {
    return "用于 Main header 根背景起始色";
  }
  if (cssVar === "--mpx-main-header-fill-end") {
    return "用于 Main header 根背景结束色";
  }
  if (cssVar === "--mpx-main-header-border-color") {
    return "用于 Main header 根分隔线颜色";
  }
  if (cssVar.startsWith("--mpx-slot-fg-main-header-button-")) {
    return "用于 Main header 按钮总控（fg-main-header button fallback）";
  }
  if (cssVar === "--mpx-metadata-bg") {
    return "用于 Metadata frame 填充";
  }
  if (cssVar === "--mpx-metadata-border-color") {
    return "用于 Metadata frame 边框色";
  }
  if (cssVar === "--mpx-metadata-shadow") {
    return "用于 Metadata frame 阴影";
  }
  if (cssVar === "--mpx-metadata-fill-start") {
    return "用于 Metadata frame fill 起始色";
  }
  if (cssVar === "--mpx-metadata-fill-end") {
    return "用于 Metadata frame fill 结束色";
  }
  if (cssVar === "--mpx-metadata-fill-angle") {
    return "用于 Metadata frame 渐变角度";
  }
  if (cssVar === "--mpx-metadata-z-index") {
    return "用于 Metadata 层级";
  }
  if (cssVar === "--mpx-metadata-header-fill-start") {
    return "用于 Metadata header 根背景起始色";
  }
  if (cssVar === "--mpx-metadata-header-fill-end") {
    return "用于 Metadata header 根背景结束色";
  }
  if (cssVar === "--mpx-metadata-header-border-color") {
    return "用于 Metadata header 根分隔线颜色";
  }
  if (cssVar.startsWith("--mpx-slot-fg-meta-header-button-")) {
    return "用于 Metadata header 按钮总控（fg-meta-header button fallback）";
  }
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
  if (cssVar.startsWith("--mpx-large-panel-section-")) {
    return "用于大面板 Head / Side / Main 共享默认值";
  }
  if (cssVar.startsWith("--mpx-large-panel-head-")) {
    return "仅用于大面板 Head 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-shell-")) {
    return "仅用于大面板 shell 分栏容器";
  }
  if (cssVar.startsWith("--mpx-large-panel-side-")) {
    return "仅用于大面板 Side 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-main-")) {
    return "仅用于大面板 Main 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-")) {
    return "仅用于大面板 root 本体";
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

const LARGE_PANEL_ROOT_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-fill-start",
    cssVar: "--mpx-large-panel-fill-start",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "large-panel-fill-end",
    cssVar: "--mpx-large-panel-fill-end",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
    groupId: "root",
  },
];

const LARGE_PANEL_SHARED_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-section-fill-start",
    cssVar: "--mpx-large-panel-section-fill-start",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "root",
  },
  {
    id: "large-panel-section-fill-end",
    cssVar: "--mpx-large-panel-section-fill-end",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "root",
  },
  {
    id: "large-panel-head-fill-start",
    cssVar: "--mpx-large-panel-head-fill-start",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "head",
  },
  {
    id: "large-panel-section-border-color",
    cssVar: "--mpx-large-panel-section-border-color",
    fallback: "#d6cfc1",
    groupId: "root",
  },
];

const LARGE_PANEL_HEAD_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-head-fill-start",
    cssVar: "--mpx-large-panel-head-fill-start",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "head",
  },
  {
    id: "large-panel-head-fill-end",
    cssVar: "--mpx-large-panel-head-fill-end",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "head",
  },
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
    groupId: "head",
  },
  {
    id: "large-panel-head-text",
    cssVar: "--mpx-large-panel-head-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const LARGE_PANEL_SIDE_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-side-fill-start",
    cssVar: "--mpx-large-panel-side-fill-start",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "large-panel-side-fill-end",
    cssVar: "--mpx-large-panel-side-fill-end",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
    groupId: "side",
  },
];

const LARGE_PANEL_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-main-fill-start",
    cssVar: "--mpx-large-panel-main-fill-start",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-main-fill-end",
    cssVar: "--mpx-large-panel-main-fill-end",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
    groupId: "main",
  },
];

const LARGE_PANEL_INTERNAL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
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

const LARGE_PANEL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  ...LARGE_PANEL_ROOT_COLOR_FIELDS,
  ...LARGE_PANEL_SHARED_COLOR_FIELDS,
  ...LARGE_PANEL_HEAD_COLOR_FIELDS,
  ...LARGE_PANEL_SIDE_COLOR_FIELDS,
  ...LARGE_PANEL_MAIN_COLOR_FIELDS,
  ...LARGE_PANEL_INTERNAL_COLOR_FIELDS,
];

const LARGE_PANEL_ROOT_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "large-panel-shadow",
    cssVar: "--mpx-large-panel-shadow",
    fallback:
      "0 14px 38px rgba(30, 27, 21, 0.18), 0 2px 8px rgba(30, 27, 21, 0.08)",
    groupId: "root",
  },
];

const LARGE_PANEL_INTERNAL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
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

const LARGE_PANEL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  ...LARGE_PANEL_ROOT_TEXT_FIELDS,
  ...LARGE_PANEL_INTERNAL_TEXT_FIELDS,
];

const filterDebugFieldsByPrefixes = <
  T extends ThemeDebugColorField | ThemeDebugTextField,
>(
  fields: readonly T[],
  prefixes: readonly string[],
) => {
  return fields.filter((field) =>
    prefixes.some((prefix) => field.cssVar.startsWith(prefix)),
  );
};

interface LargePanelInternalSectionDefinition {
  id: LargePanelInternalSectionId;
  summaryKey: string;
  prefixes: readonly string[];
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
}

const LARGE_PANEL_INTERNAL_SECTION_PREFIX_DEFINITIONS = [
  {
    id: "importTask",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionInternalImportTask",
    prefixes: ["--mpx-import-task-"],
  },
  {
    id: "metadataFetch",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataFetch",
    prefixes: ["--mpx-metadata-fetch-"],
  },
  {
    id: "metadataPreferenceRecord",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataPreferenceRecord",
    prefixes: ["--mpx-metadata-preference-record-"],
  },
  {
    id: "metadataBookletBinding",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataBookletBinding",
    prefixes: ["--mpx-metadata-booklet-binding-"],
  },
  {
    id: "metadataFeatureTagPicker",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataFeatureTagPicker",
    prefixes: ["--mpx-metadata-feature-tag-picker-"],
  },
  {
    id: "subtitleCleanup",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalSubtitleCleanup",
    prefixes: [
      "--mpx-subtitle-cleanup-raw-preview-",
      "--mpx-subtitle-cleanup-clean-preview-",
    ],
  },
  {
    id: "transcodeDialog",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalTranscodeDialog",
    prefixes: ["--mpx-transcode-dialog-"],
  },
  {
    id: "sidebarRenamePreview",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalSidebarRenamePreview",
    prefixes: ["--mpx-sidebar-rename-preview-"],
  },
 ] as const satisfies readonly {
  id: LargePanelInternalSectionId;
  summaryKey: string;
  prefixes: readonly string[];
}[];

const LARGE_PANEL_INTERNAL_SECTION_DEFINITIONS: readonly LargePanelInternalSectionDefinition[] =
  LARGE_PANEL_INTERNAL_SECTION_PREFIX_DEFINITIONS.map((section) => ({
  ...section,
  colorFields: filterDebugFieldsByPrefixes(
    LARGE_PANEL_INTERNAL_COLOR_FIELDS,
    section.prefixes,
  ),
  textFields: filterDebugFieldsByPrefixes(
    LARGE_PANEL_INTERNAL_TEXT_FIELDS,
    section.prefixes,
  ),
}));

const LARGE_PANEL_SECTION_DEFINITIONS = [
  {
    id: "head",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionHead",
    colorFields: LARGE_PANEL_HEAD_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-head-fill-angle"],
    parameterIds: [
      "large-panel-head-border-width",
      "large-panel-head-padding-y",
      "large-panel-head-padding-x",
    ],
  },
  {
    id: "side",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionSide",
    colorFields: LARGE_PANEL_SIDE_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-side-fill-angle"],
    parameterIds: [
      "large-panel-side-border-width",
      "large-panel-side-radius",
      "large-panel-side-padding",
      "large-panel-side-gap",
    ],
  },
  {
    id: "main",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionMain",
    colorFields: LARGE_PANEL_MAIN_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-main-fill-angle"],
    parameterIds: [
      "large-panel-main-border-width",
      "large-panel-main-radius",
      "large-panel-main-padding-y",
      "large-panel-main-padding-x",
    ],
  },
] as const;

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
  containerBackgroundExpanded,
  setContainerBackgroundExpanded,
  containerSharedShellExpanded,
  setContainerSharedShellExpanded,
  containerHeaderExpanded,
  setContainerHeaderExpanded,
  containerHeaderAppearanceExpanded,
  setContainerHeaderAppearanceExpanded,
  containerHeaderButtonsExpanded,
  setContainerHeaderButtonsExpanded,
  containerHeaderLogoExpanded,
  setContainerHeaderLogoExpanded,
  containerHeaderG1Expanded,
  setContainerHeaderG1Expanded,
  containerHeaderG2Expanded,
  setContainerHeaderG2Expanded,
  containerHeaderGDebugExpanded,
  setContainerHeaderGDebugExpanded,
  containerHeaderG3Expanded,
  setContainerHeaderG3Expanded,
  containerSidebarExpanded,
  setContainerSidebarExpanded,
  containerSidebarAppearanceExpanded,
  setContainerSidebarAppearanceExpanded,
  containerSidebarHeaderExpanded,
  setContainerSidebarHeaderExpanded,
  containerSidebarHeaderTitleExpanded,
  setContainerSidebarHeaderTitleExpanded,
  containerSidebarHeaderActionsExpanded,
  setContainerSidebarHeaderActionsExpanded,
  containerMainExpanded,
  setContainerMainExpanded,
  containerMainAppearanceExpanded,
  setContainerMainAppearanceExpanded,
  containerMainHeaderExpanded,
  setContainerMainHeaderExpanded,
  containerMainHeaderButtonsExpanded,
  setContainerMainHeaderButtonsExpanded,
  containerMainWorkspaceExpanded,
  setContainerMainWorkspaceExpanded,
  containerMetadataExpanded,
  setContainerMetadataExpanded,
  containerMetadataAppearanceExpanded,
  setContainerMetadataAppearanceExpanded,
  containerMetadataHeaderExpanded,
  setContainerMetadataHeaderExpanded,
  containerMetadataHeaderButtonsExpanded,
  setContainerMetadataHeaderButtonsExpanded,
  containerSidebarMainExpanded,
  setContainerSidebarMainExpanded,
  containerMainImageNameListExpanded,
  setContainerMainImageNameListExpanded,
  largePanelRootExpanded,
  setLargePanelRootExpanded,
  largePanelSharedSectionExpanded,
  setLargePanelSharedSectionExpanded,
  largePanelHeadExpanded,
  setLargePanelHeadExpanded,
  largePanelSideExpanded,
  setLargePanelSideExpanded,
  largePanelMainExpanded,
  setLargePanelMainExpanded,
  largePanelInternalExpanded,
  setLargePanelInternalExpanded,
  largePanelInternalSectionsExpanded,
  setLargePanelInternalSectionExpanded,
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
  const syncedContainerShadowOverridesRef = useRef<Set<string>>(new Set());
  const syncedContainerFillColorOverridesRef = useRef<
    Record<string, Set<string>>
  >({});
  const syncedLargePanelColorOverridesRef = useRef<Record<string, Set<string>>>(
    {},
  );
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
  const containerLayerParameterMap = useMemo(
    () =>
      new Map(
        containerLayerParameters.map((parameter) => [parameter.id, parameter]),
      ),
    [containerLayerParameters],
  );
  const containerTextFieldMap = useMemo(
    () =>
      new Map(CONTAINER_LAYER_TEXT_FIELDS.map((field) => [field.id, field])),
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

  const pickContainerParameters = (parameterIds: readonly string[]) => {
    return parameterIds
      .map((id) => containerLayerParameterMap.get(id))
      .filter(
        (parameter): parameter is ThemeParameterDefinition =>
          parameter !== undefined,
      );
  };

  const containerSharedShellAngleParameters = useMemo(() => {
    return pickContainerParameters(CONTAINER_SHARED_SHELL_INLINE_PARAMETER_IDS);
  }, [containerLayerParameterMap]);

  const containerSharedShellLayoutParameters = useMemo(() => {
    return pickContainerParameters(CONTAINER_SHARED_SHELL_PARAMETER_IDS);
  }, [containerLayerParameterMap]);

  const containerSharedShellColorFields = useMemo(() => {
    return CONTAINER_SHARED_SHELL_COLOR_FIELD_IDS.map((id) =>
      CONTAINER_SHARED_COLOR_FIELDS.find((field) => field.id === id),
    ).filter((field): field is ThemeDebugColorField => field !== undefined);
  }, []);

  const containerSharedShellTextFields = useMemo(() => {
    return CONTAINER_SHARED_SHELL_TEXT_FIELD_IDS.map((id) =>
      CONTAINER_SHARED_TEXT_FIELDS.find((field) => field.id === id),
    ).filter((field): field is ThemeDebugTextField => field !== undefined);
  }, []);

  const largePanelParameterMap = useMemo(
    () =>
      new Map(
        largePanelLayerParameters.map((parameter) => [parameter.id, parameter]),
      ),
    [largePanelLayerParameters],
  );

  const pickLargePanelParameters = (parameterIds: readonly string[]) => {
    return parameterIds
      .map((id) => largePanelParameterMap.get(id))
      .filter(
        (parameter): parameter is ThemeParameterDefinition =>
          parameter !== undefined,
      );
  };

  const largePanelRootParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_ROOT_PARAMETER_IDS);
  }, [largePanelParameterMap]);

  const largePanelRootInlineParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_ROOT_INLINE_PARAMETER_IDS);
  }, [largePanelParameterMap]);

  const largePanelSharedParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_SHARED_PARAMETER_IDS);
  }, [largePanelParameterMap]);

  const largePanelSharedInlineParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_SHARED_INLINE_PARAMETER_IDS);
  }, [largePanelParameterMap]);

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
      activePage === "largePanelLayer" ||
      activePage === "smallPanelLayer" ||
      activePage === "commonControls"
    ) {
      const nextTextValues: Record<string, string> = {};
      const sourceTextFields =
        activePage === "containerLayer"
          ? CONTAINER_LAYER_TEXT_FIELDS
          : activePage === "largePanelLayer"
            ? LARGE_PANEL_TEXT_FIELDS
            : activePage === "commonControls"
              ? COMMON_CONTROL_TEXT_FIELDS
              : SMALL_PANEL_TEXT_FIELDS;
      for (const field of sourceTextFields) {
        nextTextValues[field.id] =
          computed.getPropertyValue(field.cssVar).trim() || field.fallback;
      }
      setDebugTextValues(nextTextValues);
      if (activePage === "containerLayer") {
        syncedContainerShadowOverridesRef.current = new Set();
        syncedContainerFillColorOverridesRef.current = {};
      } else if (activePage === "largePanelLayer") {
        syncedLargePanelColorOverridesRef.current = {};
      }
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
    const nextState: ColorState = {
      hex: parsed.hex,
      alpha: parsed.alpha,
    };
    const root = document.documentElement;
    const nextCssValue = formatColorStateAsCss(nextState);
    root.style.setProperty(field.cssVar, nextCssValue);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    setDebugColorValues((previous) => {
      const nextValues = {
        ...previous,
        [field.id]: nextState,
      };
      const syncTargetIds = resolveContainerFillSyncTargets(field.id);
      const largePanelSyncTargetIds = resolveLargePanelSyncTargets(field.id);
      if (syncTargetIds.length > 0) {
        if (!syncedContainerFillColorOverridesRef.current[field.id]) {
          syncedContainerFillColorOverridesRef.current[field.id] = new Set(
            syncTargetIds,
          );
        }
        for (const targetId of syncedContainerFillColorOverridesRef.current[
          field.id
        ]) {
          const targetField = CONTAINER_LAYER_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          root.style.setProperty(targetField.cssVar, nextCssValue);
          clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
          notifyContainerDebugChanged(targetField.cssVar);
          nextValues[targetId] = { ...nextState };
        }
      } else if (largePanelSyncTargetIds.length > 0) {
        if (!syncedLargePanelColorOverridesRef.current[field.id]) {
          syncedLargePanelColorOverridesRef.current[field.id] = new Set(
            largePanelSyncTargetIds,
          );
        }
        for (const targetId of syncedLargePanelColorOverridesRef.current[
          field.id
        ]) {
          const targetField = LARGE_PANEL_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          root.style.setProperty(targetField.cssVar, nextCssValue);
          clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
          nextValues[targetId] = { ...nextState };
        }
      } else if (
        Object.values(CONTAINER_FILL_SYNC_COLOR_FIELD_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          CONTAINER_FILL_SYNC_COLOR_FIELD_IDS,
        )) {
          syncedContainerFillColorOverridesRef.current[sourceId]?.delete(
            field.id,
          );
        }
      } else if (
        Object.values(LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS,
        )) {
          syncedLargePanelColorOverridesRef.current[sourceId]?.delete(field.id);
        }
      }
      return nextValues;
    });
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
    const root = document.documentElement;
    const nextCssValue = formatColorStateAsCss(nextState);
    root.style.setProperty(field.cssVar, nextCssValue);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    setDebugColorValues((previous) => {
      const nextValues = {
        ...previous,
        [field.id]: nextState,
      };
      const syncTargetIds = resolveContainerFillSyncTargets(field.id);
      const largePanelSyncTargetIds = resolveLargePanelSyncTargets(field.id);
      if (syncTargetIds.length > 0) {
        if (!syncedContainerFillColorOverridesRef.current[field.id]) {
          syncedContainerFillColorOverridesRef.current[field.id] = new Set(
            syncTargetIds,
          );
        }
        for (const targetId of syncedContainerFillColorOverridesRef.current[
          field.id
        ]) {
          const targetField = CONTAINER_LAYER_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          root.style.setProperty(targetField.cssVar, nextCssValue);
          clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
          notifyContainerDebugChanged(targetField.cssVar);
          nextValues[targetId] = { ...nextState };
        }
      } else if (largePanelSyncTargetIds.length > 0) {
        if (!syncedLargePanelColorOverridesRef.current[field.id]) {
          syncedLargePanelColorOverridesRef.current[field.id] = new Set(
            largePanelSyncTargetIds,
          );
        }
        for (const targetId of syncedLargePanelColorOverridesRef.current[
          field.id
        ]) {
          const targetField = LARGE_PANEL_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          root.style.setProperty(targetField.cssVar, nextCssValue);
          clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
          nextValues[targetId] = { ...nextState };
        }
      } else if (
        Object.values(CONTAINER_FILL_SYNC_COLOR_FIELD_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          CONTAINER_FILL_SYNC_COLOR_FIELD_IDS,
        )) {
          syncedContainerFillColorOverridesRef.current[sourceId]?.delete(
            field.id,
          );
        }
      } else if (
        Object.values(LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS,
        )) {
          syncedLargePanelColorOverridesRef.current[sourceId]?.delete(field.id);
        }
      }
      return nextValues;
    });
  };

  const isColorFieldChanged = (field: ThemeDebugColorField): boolean => {
    return (
      document.documentElement.style.getPropertyValue(field.cssVar).trim()
        .length > 0
    );
  };

  const resetColorField = (field: ThemeDebugColorField) => {
    const root = document.documentElement;
    const syncTargetIds = resolveContainerFillSyncTargets(field.id);
    const largePanelSyncTargetIds = resolveLargePanelSyncTargets(field.id);
    if (syncTargetIds.length > 0) {
      root.style.removeProperty(field.cssVar);
      clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
      notifyContainerDebugChanged(field.cssVar);
      for (const targetId of syncedContainerFillColorOverridesRef.current[
        field.id
      ] ?? []) {
        const targetField = CONTAINER_LAYER_COLOR_FIELDS.find(
          (candidate) => candidate.id === targetId,
        );
        if (!targetField) {
          continue;
        }
        root.style.removeProperty(targetField.cssVar);
        clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
        notifyContainerDebugChanged(targetField.cssVar);
      }
      const computed = getComputedStyle(root);
      setDebugColorValues((previous) => {
        const nextValues = { ...previous };
        const nextValue = readCssColorState(
          computed,
          field.cssVar,
          field.fallback,
        );
        nextValues[field.id] = {
          hex: nextValue.hex,
          alpha: field.fallbackAlpha ?? nextValue.alpha,
        };
        for (const targetId of syncedContainerFillColorOverridesRef.current[
          field.id
        ] ?? []) {
          const targetField = CONTAINER_LAYER_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          const targetValue = readCssColorState(
            computed,
            targetField.cssVar,
            targetField.fallback,
          );
          nextValues[targetId] = {
            hex: targetValue.hex,
            alpha: targetField.fallbackAlpha ?? targetValue.alpha,
          };
        }
        return nextValues;
      });
      syncedContainerFillColorOverridesRef.current[field.id] = new Set();
      return;
    }
    if (largePanelSyncTargetIds.length > 0) {
      root.style.removeProperty(field.cssVar);
      clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
      for (const targetId of syncedLargePanelColorOverridesRef.current[
        field.id
      ] ?? []) {
        const targetField = LARGE_PANEL_COLOR_FIELDS.find(
          (candidate) => candidate.id === targetId,
        );
        if (!targetField) {
          continue;
        }
        root.style.removeProperty(targetField.cssVar);
        clearLegacySlotOverrideForSemanticVar(root, targetField.cssVar);
      }
      const computed = getComputedStyle(root);
      setDebugColorValues((previous) => {
        const nextValues = { ...previous };
        const nextValue = readCssColorState(
          computed,
          field.cssVar,
          field.fallback,
        );
        nextValues[field.id] = {
          hex: nextValue.hex,
          alpha: field.fallbackAlpha ?? nextValue.alpha,
        };
        for (const targetId of syncedLargePanelColorOverridesRef.current[
          field.id
        ] ?? []) {
          const targetField = LARGE_PANEL_COLOR_FIELDS.find(
            (candidate) => candidate.id === targetId,
          );
          if (!targetField) {
            continue;
          }
          const targetValue = readCssColorState(
            computed,
            targetField.cssVar,
            targetField.fallback,
          );
          nextValues[targetId] = {
            hex: targetValue.hex,
            alpha: targetField.fallbackAlpha ?? targetValue.alpha,
          };
        }
        return nextValues;
      });
      syncedLargePanelColorOverridesRef.current[field.id] = new Set();
      return;
    }
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
    for (const sourceId of Object.keys(CONTAINER_FILL_SYNC_COLOR_FIELD_IDS)) {
      syncedContainerFillColorOverridesRef.current[sourceId]?.delete(field.id);
    }
    for (const sourceId of Object.keys(
      LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS,
    )) {
      syncedLargePanelColorOverridesRef.current[sourceId]?.delete(field.id);
    }
  };

  const isTextFieldChanged = (field: ThemeDebugTextField): boolean => {
    return (
      document.documentElement.style.getPropertyValue(field.cssVar).trim()
        .length > 0
    );
  };

  const isContainerSharedShadowField = (
    field: ThemeDebugTextField,
  ): boolean => {
    return field.id === "container-frame-shadow";
  };

  const isContainerShadowOverrideField = (
    field: ThemeDebugTextField,
  ): boolean => {
    return CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS.includes(
      field.id as (typeof CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS)[number],
    );
  };

  const setDebugTextFieldValue = (field: ThemeDebugTextField, raw: string) => {
    setDebugTextValues((previous) => {
      const nextValues = { ...previous, [field.id]: raw };
      if (isContainerSharedShadowField(field)) {
        if (syncedContainerShadowOverridesRef.current.size === 0) {
          syncedContainerShadowOverridesRef.current = new Set(
            CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS,
          );
        }
        for (const fieldId of syncedContainerShadowOverridesRef.current) {
          nextValues[fieldId] = raw;
        }
      } else if (isContainerShadowOverrideField(field)) {
        syncedContainerShadowOverridesRef.current.delete(field.id);
      }
      return nextValues;
    });
    if (!raw.trim()) {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty(field.cssVar, raw);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    if (isContainerSharedShadowField(field)) {
      for (const fieldId of syncedContainerShadowOverridesRef.current.size > 0
        ? syncedContainerShadowOverridesRef.current
        : new Set(CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS)) {
        const syncedField = containerTextFieldMap.get(fieldId);
        if (!syncedField) {
          continue;
        }
        root.style.setProperty(syncedField.cssVar, raw);
        clearLegacySlotOverrideForSemanticVar(root, syncedField.cssVar);
        notifyContainerDebugChanged(syncedField.cssVar);
      }
    }
  };

  const resetTextField = (field: ThemeDebugTextField) => {
    const root = document.documentElement;
    if (isContainerSharedShadowField(field)) {
      const syncedIds = Array.from(syncedContainerShadowOverridesRef.current);
      root.style.removeProperty(field.cssVar);
      clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
      notifyContainerDebugChanged(field.cssVar);
      for (const fieldId of syncedIds) {
        const syncedField = containerTextFieldMap.get(fieldId);
        if (!syncedField) {
          continue;
        }
        root.style.removeProperty(syncedField.cssVar);
        clearLegacySlotOverrideForSemanticVar(root, syncedField.cssVar);
        notifyContainerDebugChanged(syncedField.cssVar);
      }
      const computed = getComputedStyle(root);
      setDebugTextValues((previous) => {
        const nextValues = {
          ...previous,
          [field.id]:
            computed.getPropertyValue(field.cssVar).trim() || field.fallback,
        };
        for (const fieldId of syncedIds) {
          const syncedField = containerTextFieldMap.get(fieldId);
          if (!syncedField) {
            continue;
          }
          nextValues[fieldId] =
            computed.getPropertyValue(syncedField.cssVar).trim() ||
            syncedField.fallback;
        }
        return nextValues;
      });
      syncedContainerShadowOverridesRef.current = new Set();
      return;
    }
    root.style.removeProperty(field.cssVar);
    clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
    notifyContainerDebugChanged(field.cssVar);
    const computed = getComputedStyle(root);
    setDebugTextValues((previous) => ({
      ...previous,
      [field.id]:
        computed.getPropertyValue(field.cssVar).trim() || field.fallback,
    }));
    if (isContainerShadowOverrideField(field)) {
      syncedContainerShadowOverridesRef.current.delete(field.id);
    }
  };

  const renderVarLabel = (cssVar: string) => {
    const usage = resolveDebugVarUsage(cssVar);
    return (
      <span className="theme-parameter-var-label">
        {cssVar}
        {usage ? (
          <span className="theme-parameter-var-usage"> {usage}</span>
        ) : null}
      </span>
    );
  };

  const renderColorFieldRow = (field: ThemeDebugColorField) => {
    const colorState = debugColorValues[field.id] ?? {
      hex: field.fallback,
      alpha: field.fallbackAlpha ?? 1,
    };
    const alphaPercent = Math.round(colorState.alpha * 100);
    return (
      <label key={field.id} className="theme-parameter-color-row">
        {renderVarLabel(field.cssVar)}
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
    const supportsBasicColorShortcut = field.cssVar === "--mpx-bg-app-fill";

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

    const renderBasicColorShortcut = () => {
      if (!supportsBasicColorShortcut) {
        return null;
      }
      const parsedSolidColor =
        parseColorState(raw, "#ffffff") ??
        parseColorState(field.fallback, "#ffffff");
      if (!parsedSolidColor) {
        return null;
      }
      return (
        <label className="theme-parameter-inline-field color-expression">
          <span>纯色快捷设置</span>
          <div className="theme-parameter-color-control">
            <input
              type="color"
              aria-label={`${field.cssVar}-solid-picker`}
              value={parsedSolidColor.hex}
              onChange={(event) => updateTextValue(event.target.value)}
            />
            <input
              type="text"
              aria-label={`${field.cssVar}-solid`}
              value={parsedSolidColor.hex}
              onChange={(event) => updateTextValue(event.target.value)}
            />
          </div>
        </label>
      );
    };

    if (parsedGradient) {
      const updateGradient = (nextValue: SimpleLinearGradientValue) => {
        updateTextValue(formatSimpleLinearGradient(nextValue));
      };

      return (
        <div key={field.id} className="theme-parameter-text-row is-structured">
          {renderVarLabel(field.cssVar)}
          <div className="theme-parameter-structured-card">
            {renderBasicColorShortcut()}
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
          {renderVarLabel(field.cssVar)}
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
          {renderVarLabel(field.cssVar)}
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
        {renderVarLabel(field.cssVar)}
        {renderBasicColorShortcut()}
        <textarea
          aria-label={field.cssVar}
          className="theme-parameter-textarea"
          value={raw}
          onChange={(event) =>
            setDebugTextFieldValue(field, event.target.value)
          }
        />
        {renderResetButton()}
      </label>
    );
  };

  const sidebarMainColorFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS.map((field) => [
          field.cssVar,
          field,
        ]),
      ),
    [],
  );

  const sidebarMainTextFieldMap = useMemo(
    () =>
      new Map(
        CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS.map((field) => [
          field.cssVar,
          field,
        ]),
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

  const resolveContainerFillSyncTargets = (fieldId: string) => {
    return (
      CONTAINER_FILL_SYNC_COLOR_FIELD_IDS[
        fieldId as keyof typeof CONTAINER_FILL_SYNC_COLOR_FIELD_IDS
      ] ?? []
    );
  };

  const resolveLargePanelSyncTargets = (fieldId: string) => {
    return (
      LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS[
        fieldId as keyof typeof LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS
      ] ?? []
    );
  };

  const renderContainerFrameSection = (
    section: (typeof CONTAINER_FRAME_SECTION_DEFINITIONS)[number],
    appearanceOpen: boolean,
    setAppearanceOpen: Dispatch<SetStateAction<boolean>>,
  ) => {
    const appearanceParameters = pickContainerParameters(
      section.appearanceParameterIds,
    );
    const fillAngleParameters = appearanceParameters.filter((parameter) =>
      parameter.id.endsWith("fill-angle"),
    );
    const shapeParameters = appearanceParameters.filter(
      (parameter) => !parameter.id.endsWith("fill-angle"),
    );
    const transformParameters = pickContainerParameters(
      section.transformParameterIds,
    );
    const fillColorFields = section.colorFields.filter(
      (field) =>
        field.id.includes("fill-start") || field.id.includes("fill-end"),
    );
    const otherColorFields = section.colorFields.filter(
      (field) => !fillColorFields.includes(field),
    );
    return (
      <>
        <details
          className="settings-collapsible"
          open={appearanceOpen}
          onToggle={(event) =>
            setAppearanceOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary>基础外观</summary>
          <div className="settings-collapsible-content">
            <section className="settings-group theme-parameter-debug-group">
              {fillColorFields.length > 0 ? (
                <div className="theme-parameter-color-list">
                  {fillColorFields.map(renderColorFieldRow)}
                </div>
              ) : null}
              {fillAngleParameters.length > 0
                ? renderParameterRowsWithVarLabel(fillAngleParameters)
                : null}
              {otherColorFields.length > 0 ? (
                <div className="theme-parameter-color-list">
                  {otherColorFields.map(renderColorFieldRow)}
                </div>
              ) : null}
              {section.textFields.length > 0 ? (
                <div className="theme-parameter-text-list">
                  {section.textFields.map(renderTextFieldRow)}
                </div>
              ) : null}
              {shapeParameters.length > 0
                ? renderParameterRowsWithVarLabel(shapeParameters)
                : null}
            </section>
            <section className="settings-group theme-parameter-debug-group">
              <header className="settings-group-head">
                <span>视觉变换</span>
              </header>
              {transformParameters.length > 0
                ? renderParameterRows(transformParameters)
                : null}
            </section>
          </div>
        </details>
        <section className="settings-group theme-parameter-debug-group">
          <header className="settings-group-head">
            <span>高级 3D（预留）</span>
          </header>
          <p className="settings-placeholder">
            当前已在 contract 预留 3D transform 变量，后续再补可视化调节控件。
          </p>
        </section>
      </>
    );
  };

  const renderContainerDebugSubsectionRows = (
    section: ContainerDebugSubsection,
  ) => {
    const parameters = section.parameterIds
      ? pickContainerParameters(section.parameterIds)
      : [];
    return (
      <>
        {section.colorFields && section.colorFields.length > 0 ? (
          <div className="theme-parameter-color-list">
            {section.colorFields.map(renderColorFieldRow)}
          </div>
        ) : null}
        {section.textFields && section.textFields.length > 0 ? (
          <div className="theme-parameter-text-list">
            {section.textFields.map(renderTextFieldRow)}
          </div>
        ) : null}
        {parameters.length > 0
          ? renderParameterRowsWithVarLabel(parameters)
          : null}
      </>
    );
  };

  const renderContainerDebugSubsection = (
    section: ContainerDebugSubsection,
    open: boolean,
    setOpen: Dispatch<SetStateAction<boolean>>,
  ) => {
    return (
      <details
        key={section.id}
        className="settings-collapsible"
        open={open}
        onToggle={(event) =>
          setOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>{t(section.summaryKey)}</summary>
        <div className="settings-collapsible-content">
          <section className="settings-group theme-parameter-debug-group">
            <header className="settings-group-head">
              <span>变量</span>
            </header>
            {renderContainerDebugSubsectionRows(section)}
          </section>
        </div>
      </details>
    );
  };

  const renderLargePanelSectionRows = (options: {
    colorFields: readonly ThemeDebugColorField[];
    inlineParameters?: ThemeParameterDefinition[];
    textFields?: readonly ThemeDebugTextField[];
    parameters?: ThemeParameterDefinition[];
  }) => {
    const {
      colorFields,
      inlineParameters = [],
      textFields = [],
      parameters = [],
    } = options;
    return (
      <>
        {colorFields.length > 0 ? (
          <section className="settings-group theme-parameter-debug-group">
            <header className="settings-group-head">
              <span>基础外观</span>
            </header>
            <div className="theme-parameter-color-list">
              {colorFields.map(renderColorFieldRow)}
            </div>
            {inlineParameters.length > 0
              ? renderParameterRowsWithVarLabel(inlineParameters)
              : null}
            {textFields.length > 0 ? (
              <div className="theme-parameter-text-list">
                {textFields.map(renderTextFieldRow)}
              </div>
            ) : null}
            {parameters.length > 0
              ? renderParameterRowsWithVarLabel(parameters)
              : null}
          </section>
        ) : null}
      </>
    );
  };

  const renderLargePanelInternalSections = () => {
    return (
      <>
        {LARGE_PANEL_INTERNAL_SECTION_DEFINITIONS.map((section) => (
          <details
            key={section.id}
            className="settings-collapsible"
            open={largePanelInternalSectionsExpanded[section.id]}
            onToggle={(event) =>
              setLargePanelInternalSectionExpanded(
                section.id,
                (event.currentTarget as HTMLDetailsElement).open,
              )
            }
          >
            <summary>{t(section.summaryKey)}</summary>
            <div className="settings-collapsible-content">
              {renderLargePanelSectionRows({
                colorFields: section.colorFields,
                textFields: section.textFields,
              })}
            </div>
          </details>
        ))}
      </>
    );
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
        {renderVarLabel(field.cssVar)}
        <textarea
          aria-label={field.cssVar}
          className="theme-parameter-textarea"
          value={raw}
          onChange={(event) =>
            setDebugTextFieldValue(field, event.target.value)
          }
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
              <span className="theme-parameter-control-preview-caption">
                朝上
              </span>
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
              <span className="theme-parameter-control-preview-caption">
                朝下
              </span>
              <div className="theme-parameter-control-vertical-track-box">
                <div className="mpx-runway-axis is-vertical theme-parameter-control-vertical-runway theme-parameter-control-vertical-axis is-down">
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
      const horizontalPreview = renderCommonControlHorizontalPreview(
        section.id,
      );
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

  const renderParameterRowsWithVarLabel = (
    parameters: ThemeParameterDefinition[],
  ) => {
    return (
      <div className="theme-parameter-list">
        {parameters.map((parameter) => {
          const value = values[parameter.id] ?? parameter.fallback;
          const cssVar = parameter.cssVarName ?? parameter.id;
          return (
            <label
              key={parameter.id}
              className="theme-parameter-row"
              htmlFor={`theme-parameter-${parameter.id}`}
            >
              {renderVarLabel(cssVar)}
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
              open={containerBackgroundExpanded}
              onToggle={(event) =>
                setContainerBackgroundExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionBackground")}
              </summary>
              <div className="settings-collapsible-content">
                <div className="theme-parameter-text-list">
                  {CONTAINER_BACKGROUND_TEXT_FIELDS.map(renderTextFieldRow)}
                </div>
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerSharedShellExpanded}
              onToggle={(event) =>
                setContainerSharedShellExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionSharedShell")}
              </summary>
              <div className="settings-collapsible-content">
                <section className="settings-group theme-parameter-debug-group">
                  <header className="settings-group-head">
                    <span>颜色</span>
                  </header>
                  <div className="theme-parameter-color-list">
                    {containerSharedShellColorFields
                      .slice(0, 2)
                      .map(renderColorFieldRow)}
                  </div>
                  {renderParameterRowsWithVarLabel(
                    containerSharedShellAngleParameters,
                  )}
                  <div className="theme-parameter-color-list">
                    {containerSharedShellColorFields
                      .slice(2)
                      .map(renderColorFieldRow)}
                  </div>
                  <div className="theme-parameter-text-list">
                    {containerSharedShellTextFields.map(renderTextFieldRow)}
                  </div>
                </section>
                <section className="settings-group theme-parameter-debug-group">
                  <header className="settings-group-head">
                    <span>形态/布局</span>
                  </header>
                  {renderParameterRowsWithVarLabel(
                    containerSharedShellLayoutParameters,
                  )}
                </section>
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerHeaderExpanded}
              onToggle={(event) =>
                setContainerHeaderExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionHeader")}
              </summary>
              <div className="settings-collapsible-content">
                {renderContainerFrameSection(
                  CONTAINER_FRAME_SECTION_DEFINITIONS[0],
                  containerHeaderAppearanceExpanded,
                  setContainerHeaderAppearanceExpanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[0],
                  containerHeaderButtonsExpanded,
                  setContainerHeaderButtonsExpanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[1],
                  containerHeaderLogoExpanded,
                  setContainerHeaderLogoExpanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[2],
                  containerHeaderG1Expanded,
                  setContainerHeaderG1Expanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[3],
                  containerHeaderG2Expanded,
                  setContainerHeaderG2Expanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[4],
                  containerHeaderGDebugExpanded,
                  setContainerHeaderGDebugExpanded,
                )}
                {renderContainerDebugSubsection(
                  HEADER_DEBUG_SUBSECTIONS[5],
                  containerHeaderG3Expanded,
                  setContainerHeaderG3Expanded,
                )}
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerSidebarExpanded}
              onToggle={(event) =>
                setContainerSidebarExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionSidebar")}
              </summary>
              <div className="settings-collapsible-content">
                {renderContainerFrameSection(
                  CONTAINER_FRAME_SECTION_DEFINITIONS[1],
                  containerSidebarAppearanceExpanded,
                  setContainerSidebarAppearanceExpanded,
                )}
                {renderContainerDebugSubsection(
                  SIDEBAR_HEADER_DEBUG_SUBSECTIONS[0],
                  containerSidebarHeaderExpanded,
                  setContainerSidebarHeaderExpanded,
                )}
                {renderContainerDebugSubsection(
                  SIDEBAR_HEADER_DEBUG_SUBSECTIONS[1],
                  containerSidebarHeaderTitleExpanded,
                  setContainerSidebarHeaderTitleExpanded,
                )}
                {renderContainerDebugSubsection(
                  SIDEBAR_HEADER_DEBUG_SUBSECTIONS[2],
                  containerSidebarHeaderActionsExpanded,
                  setContainerSidebarHeaderActionsExpanded,
                )}
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
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerMainExpanded}
              onToggle={(event) =>
                setContainerMainExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionMain")}
              </summary>
              <div className="settings-collapsible-content">
                {renderContainerFrameSection(
                  CONTAINER_FRAME_SECTION_DEFINITIONS[2],
                  containerMainAppearanceExpanded,
                  setContainerMainAppearanceExpanded,
                )}
                {renderContainerDebugSubsection(
                  MAIN_HEADER_DEBUG_SUBSECTIONS[0],
                  containerMainHeaderExpanded,
                  setContainerMainHeaderExpanded,
                )}
                {renderContainerDebugSubsection(
                  MAIN_HEADER_DEBUG_SUBSECTIONS[1],
                  containerMainHeaderButtonsExpanded,
                  setContainerMainHeaderButtonsExpanded,
                )}
                <details
                  className="settings-collapsible"
                  open={containerMainWorkspaceExpanded}
                  onToggle={(event) =>
                    setContainerMainWorkspaceExpanded(
                      (event.currentTarget as HTMLDetailsElement).open,
                    )
                  }
                >
                  <summary>
                    {t("ui.themeParameter.containerLayer.sectionMainWorkspace")}
                  </summary>
                  <div className="settings-collapsible-content">
                    <section className="settings-group theme-parameter-debug-group">
                      <header className="settings-group-head theme-parameter-subgroup-head">
                        <span>工作区 / 图片网格</span>
                        <span className="theme-parameter-subgroup-tag">
                          fg-main-content-image-grid
                        </span>
                      </header>
                      <div className="theme-parameter-color-list">
                        {CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS.map(
                          renderColorFieldRow,
                        )}
                      </div>
                    </section>
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
                    {t(
                      "ui.themeParameter.containerLayer.sectionMainImageNameList",
                    )}
                  </summary>
                  <div className="settings-collapsible-content">
                    {renderMainImageNameListDebugSections()}
                  </div>
                </details>
              </div>
            </details>

            <details
              className="settings-collapsible"
              open={containerMetadataExpanded}
              onToggle={(event) =>
                setContainerMetadataExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.containerLayer.sectionMetadata")}
              </summary>
              <div className="settings-collapsible-content">
                {renderContainerFrameSection(
                  CONTAINER_FRAME_SECTION_DEFINITIONS[3],
                  containerMetadataAppearanceExpanded,
                  setContainerMetadataAppearanceExpanded,
                )}
                {renderContainerDebugSubsection(
                  METADATA_HEADER_DEBUG_SUBSECTIONS[0],
                  containerMetadataHeaderExpanded,
                  setContainerMetadataHeaderExpanded,
                )}
                {renderContainerDebugSubsection(
                  METADATA_HEADER_DEBUG_SUBSECTIONS[1],
                  containerMetadataHeaderButtonsExpanded,
                  setContainerMetadataHeaderButtonsExpanded,
                )}
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
            <details
              className="settings-collapsible"
              open={largePanelRootExpanded}
              onToggle={(event) =>
                setLargePanelRootExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.largePanelLayer.sectionRoot")}
              </summary>
              <div className="settings-collapsible-content">
                {renderLargePanelSectionRows({
                  colorFields: LARGE_PANEL_ROOT_COLOR_FIELDS,
                  inlineParameters: largePanelRootInlineParameters,
                  textFields: LARGE_PANEL_ROOT_TEXT_FIELDS,
                  parameters: largePanelRootParameters,
                })}
              </div>
            </details>
            <details
              className="settings-collapsible"
              open={largePanelSharedSectionExpanded}
              onToggle={(event) =>
                setLargePanelSharedSectionExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.largePanelLayer.sectionShared")}
              </summary>
              <div className="settings-collapsible-content">
                {renderLargePanelSectionRows({
                  colorFields: LARGE_PANEL_SHARED_COLOR_FIELDS,
                  inlineParameters: largePanelSharedInlineParameters,
                  parameters: largePanelSharedParameters,
                })}
              </div>
            </details>
            {LARGE_PANEL_SECTION_DEFINITIONS.map((section) => {
              const expanded =
                section.id === "head"
                  ? largePanelHeadExpanded
                  : section.id === "side"
                    ? largePanelSideExpanded
                    : largePanelMainExpanded;
              const setExpanded =
                section.id === "head"
                  ? setLargePanelHeadExpanded
                  : section.id === "side"
                    ? setLargePanelSideExpanded
                    : setLargePanelMainExpanded;
              return (
                <details
                  key={section.id}
                  className="settings-collapsible"
                  open={expanded}
                  onToggle={(event) =>
                    setExpanded(
                      (event.currentTarget as HTMLDetailsElement).open,
                    )
                  }
                >
                  <summary>{t(section.summaryKey)}</summary>
                  <div className="settings-collapsible-content">
                    {renderLargePanelSectionRows({
                      colorFields: section.colorFields,
                      inlineParameters: pickLargePanelParameters(
                        section.inlineParameterIds,
                      ),
                      parameters: pickLargePanelParameters(
                        section.parameterIds,
                      ),
                    })}
                  </div>
                </details>
              );
            })}
            <details
              className="settings-collapsible"
              open={largePanelInternalExpanded}
              onToggle={(event) =>
                setLargePanelInternalExpanded(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>
                {t("ui.themeParameter.largePanelLayer.sectionInternal")}
              </summary>
              <div className="settings-collapsible-content">
                {renderLargePanelInternalSections()}
              </div>
            </details>
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
