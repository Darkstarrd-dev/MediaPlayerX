import type { ThemeParameterDefinition } from "./themeParameterDefinitions";

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
  | "settings"
  | "importTask"
  | "metadataFetch"
  | "metadataFeatureTagPicker"
  | "subtitleCleanup"
  | "transcodeDialog"
  | "sidebarRenamePreview";

export type LargePanelInternalSettingsGroupId = "side" | "main";

export type SmallPanelSectionId =
  | "shortcutEdit"
  | "shortcutCapture"
  | "groupName"
  | "deleteConfirm"
  | "adReviewStart"
  | "convert"
  | "playlistNameDialog"
  | "renameSingle";

export type ThemeDebugNumberGroupId =
  | "box"
  | "border"
  | "shadow"
  | "root"
  | "head"
  | "shell"
  | "side"
  | "main";

export type ThemeControlSectionId =
  | "control-scrollbar"
  | "control-slider-base"
  | "control-slider-player"
  | "control-slider-vertical"
  | "control-slider-settings"
  | "control-file-list"
  | "control-thumbnail-card"
  | "control-popover-panel"
  | "control-text-input"
  | "control-select";

export interface ThemeDebugColorField {
  id: string;
  cssVar: string;
  fallback: string;
  fallbackAlpha?: number;
  groupId: ThemeDebugNumberGroupId;
  sectionId?: ThemeControlSectionId;
}

export interface ThemeDebugTextField {
  id: string;
  cssVar: string;
  fallback: string;
  groupId: ThemeDebugNumberGroupId;
  sectionId?: ThemeControlSectionId;
}

export interface ControlPreviewValues {
  sliderBaseHorizontal: number;
  sliderPlayerProgress: number;
  sliderVerticalReference: number;
  sliderVerticalUp: number;
  sliderVerticalDown: number;
  sliderSettingsHorizontal: number;
}

export interface SidebarMainDebugSection {
  id: string;
  title: string;
  tag: string;
  cssVars: readonly string[];
}

export interface MainImageNameListDebugSection {
  id: string;
  title: string;
  tag: string;
  cssVars: readonly string[];
}

export interface MainImageNameListDebugLayer {
  id: string;
  title: string;
  sections: readonly MainImageNameListDebugSection[];
}

export interface ContainerDebugSubsection {
  id: string;
  summaryKey: string;
  colorFields?: readonly ThemeDebugColorField[];
  textFields?: readonly ThemeDebugTextField[];
  parameterIds?: readonly string[];
}

export type ButtonStateKey =
  | "idle"
  | "hover"
  | "active"
  | "selected"
  | "pressed"
  | "disabled"
  | "pending"
  | "close-hover";

export interface ContainerFrameSectionDefinition {
  id: string;
  summaryKey: string;
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
  appearanceParameterIds: readonly string[];
  transformParameterIds: readonly string[];
}

export interface LargePanelInternalSectionDefinition {
  id: LargePanelInternalSectionId;
  summaryKey: string;
  prefixes: readonly string[];
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
  groups?: readonly {
    id: LargePanelInternalSettingsGroupId;
    summaryKey: string;
    fieldIds: readonly string[];
  }[];
}

export interface SmallPanelSectionGroupDefinition {
  title: string | null;
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
  inlineParameterIds?: readonly string[];
}

export interface SmallPanelSectionDefinition {
  id: SmallPanelSectionId;
  summaryKey: string;
  groups: readonly SmallPanelSectionGroupDefinition[];
}

export function isThemeParameterDefinition(
  value: ThemeParameterDefinition | undefined,
): value is ThemeParameterDefinition {
  return value !== undefined;
}
