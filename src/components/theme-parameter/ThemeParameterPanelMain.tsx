import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ThemeParameterButtonStatesPage,
  ThemeParameterCommonControlsPage,
  ThemeParameterContainerLayerPage,
  ThemeParameterLargePanelLayerPage,
  ThemeParameterPageSidebar,
  ThemeParameterParametersPage,
  ThemeParameterSnapshotPage,
  ThemeParameterSmallPanelLayerPage,
} from "./ThemeParameterPanelPages";
import {
  ThemeParameterContainerFrameSection,
  ThemeParameterDebugSubsection,
  ThemeParameterLargePanelInternalSections,
  ThemeParameterLargePanelSectionRows,
  ThemeParameterSmallPanelSectionGroups,
} from "./ThemeParameterLayerSections";
import {
  ThemeParameterButtonStateDebug,
  ThemeParameterCommonControlSections,
} from "./ThemeParameterPreviewSections";

import {
  formatColorStateAsCss,
  parseColorState,
  readCssColorState,
  type ColorState,
} from "./themeParameterUtils";
import {
  ThemeParameterColorFieldRow,
  ThemeParameterDebugLayerList,
  ThemeParameterParameterRows,
  ThemeParameterParameterRowsWithVarLabel,
  ThemeParameterTextFieldRow,
} from "./ThemeParameterFieldRows";
import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";
import {
  BUTTON_STATE_COLOR_FIELDS,
  BUTTON_STATE_TEXT_FIELDS,
  COMMON_CONTROL_COLOR_FIELDS,
  COMMON_CONTROL_TEXT_FIELDS,
  CONTAINER_BACKGROUND_TEXT_FIELDS,
  CONTAINER_FILL_SYNC_COLOR_FIELD_IDS,
  CONTAINER_FRAME_SECTION_DEFINITIONS,
  CONTAINER_LAYER_COLOR_FIELDS,
  CONTAINER_LAYER_TEXT_FIELDS,
  CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS,
  CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS,
  CONTAINER_MAIN_MEDIA_COLOR_FIELDS,
  CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS,
  CONTAINER_SHARED_COLOR_FIELDS,
  CONTAINER_SHARED_SHELL_COLOR_FIELD_IDS,
  CONTAINER_SHARED_SHELL_INLINE_PARAMETER_IDS,
  CONTAINER_SHARED_SHELL_PARAMETER_IDS,
  CONTAINER_SHARED_SHELL_TEXT_FIELD_IDS,
  CONTAINER_SHARED_TEXT_FIELDS,
  CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS,
  CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS,
  CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS,
  HEADER_DEBUG_SUBSECTIONS,
  LARGE_PANEL_COLOR_FIELDS,
  LARGE_PANEL_BUTTON_COLOR_FIELDS,
  LARGE_PANEL_INTERNAL_SECTION_DEFINITIONS,
  LARGE_PANEL_ROOT_COLOR_FIELDS,
  LARGE_PANEL_ROOT_INLINE_PARAMETER_IDS,
  LARGE_PANEL_ROOT_PARAMETER_IDS,
  LARGE_PANEL_ROOT_TEXT_FIELDS,
  LARGE_PANEL_SECTION_DEFINITIONS,
  LARGE_PANEL_SHARED_COLOR_FIELDS,
  LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS,
  LARGE_PANEL_SHARED_INLINE_PARAMETER_IDS,
  LARGE_PANEL_SHARED_PARAMETER_IDS,
  LARGE_PANEL_TEXT_FIELDS,
  MAIN_HEADER_DEBUG_SUBSECTIONS,
  MAIN_IMAGE_NAME_LIST_DEBUG_LAYERS,
  METADATA_INTERNAL_DEBUG_SUBSECTIONS,
  METADATA_HEADER_DEBUG_SUBSECTIONS,
  SIDEBAR_HEADER_DEBUG_SUBSECTIONS,
  SIDEBAR_MAIN_DEBUG_LAYERS,
  SMALL_PANEL_COLOR_FIELDS,
  SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS,
  SMALL_PANEL_ROOT_COLOR_FIELDS,
  SMALL_PANEL_ROOT_INLINE_PARAMETER_IDS,
  SMALL_PANEL_ROOT_PARAMETER_IDS,
  SMALL_PANEL_ROOT_TEXT_FIELDS,
  SMALL_PANEL_SECTION_DEFINITIONS,
  SMALL_PANEL_TEXT_FIELDS,
  clearLegacySlotOverrideForSemanticVar,
} from "./themeParameterPanelCatalog";
import type {
  ContainerDebugSubsection,
  ControlPreviewValues,
  LargePanelInternalSectionId,
  LargePanelInternalSettingsGroupId,
  SmallPanelSectionId,
  ThemeDebugColorField,
  ThemeDebugTextField,
  ThemeParameterPageId,
  ThemeParameterPreviewMode,
} from "./themeParameterPanelTypes";

export type {
  LargePanelInternalSectionId,
  LargePanelInternalSettingsGroupId,
  SmallPanelSectionId,
  ThemeParameterPageId,
  ThemeParameterPreviewMode,
} from "./themeParameterPanelTypes";

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
  containerMetadataInternalsExpanded: boolean;
  setContainerMetadataInternalsExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataFileListExpanded: boolean;
  setContainerMetadataFileListExpanded: Dispatch<SetStateAction<boolean>>;
  containerMetadataPreferenceRecordExpanded: boolean;
  setContainerMetadataPreferenceRecordExpanded: Dispatch<
    SetStateAction<boolean>
  >;
  containerMetadataBookletBindingExpanded: boolean;
  setContainerMetadataBookletBindingExpanded: Dispatch<SetStateAction<boolean>>;
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
  largePanelButtonExpanded: boolean;
  setLargePanelButtonExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelInternalExpanded: boolean;
  setLargePanelInternalExpanded: Dispatch<SetStateAction<boolean>>;
  largePanelInternalSectionsExpanded: Record<
    LargePanelInternalSectionId,
    boolean
  >;
  largePanelInternalSettingsGroupsExpanded: Record<
    LargePanelInternalSettingsGroupId,
    boolean
  >;
  setLargePanelInternalSectionExpanded: (
    sectionId: LargePanelInternalSectionId,
    action: SetStateAction<boolean>,
  ) => void;
  setLargePanelInternalSettingsGroupExpanded: (
    groupId: LargePanelInternalSettingsGroupId,
    action: SetStateAction<boolean>,
  ) => void;
  smallPanelRootExpanded: boolean;
  setSmallPanelRootExpanded: Dispatch<SetStateAction<boolean>>;
  smallPanelSectionsExpanded: Record<SmallPanelSectionId, boolean>;
  setSmallPanelSectionExpanded: (
    sectionId: SmallPanelSectionId,
    action: SetStateAction<boolean>,
  ) => void;
  buttonVariantDefaultExpanded: boolean;
  setButtonVariantDefaultExpanded: Dispatch<SetStateAction<boolean>>;
  buttonVariantPlayerExpanded: boolean;
  setButtonVariantPlayerExpanded: Dispatch<SetStateAction<boolean>>;
  buttonVariantOverlayCellExpanded: boolean;
  setButtonVariantOverlayCellExpanded: Dispatch<SetStateAction<boolean>>;
  buttonSlotExpanded: boolean;
  setButtonSlotExpanded: Dispatch<SetStateAction<boolean>>;
  buttonSlotHeaderExpanded: boolean;
  setButtonSlotHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  buttonSlotSidebarHeaderExpanded: boolean;
  setButtonSlotSidebarHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  buttonSlotMainHeaderExpanded: boolean;
  setButtonSlotMainHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  buttonSlotMetadataHeaderExpanded: boolean;
  setButtonSlotMetadataHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  controlScrollbarExpanded: boolean;
  setControlScrollbarExpanded: Dispatch<SetStateAction<boolean>>;
  controlSliderBaseExpanded: boolean;
  setControlSliderBaseExpanded: Dispatch<SetStateAction<boolean>>;
  controlSliderPlayerExpanded: boolean;
  setControlSliderPlayerExpanded: Dispatch<SetStateAction<boolean>>;
  controlSliderVerticalExpanded: boolean;
  setControlSliderVerticalExpanded: Dispatch<SetStateAction<boolean>>;
  controlSliderSettingsExpanded: boolean;
  setControlSliderSettingsExpanded: Dispatch<SetStateAction<boolean>>;
  controlFileListExpanded: boolean;
  setControlFileListExpanded: Dispatch<SetStateAction<boolean>>;
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
  containerMetadataInternalsExpanded,
  setContainerMetadataInternalsExpanded,
  containerMetadataFileListExpanded,
  setContainerMetadataFileListExpanded,
  containerMetadataPreferenceRecordExpanded,
  setContainerMetadataPreferenceRecordExpanded,
  containerMetadataBookletBindingExpanded,
  setContainerMetadataBookletBindingExpanded,
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
  largePanelButtonExpanded,
  setLargePanelButtonExpanded,
  largePanelInternalExpanded,
  setLargePanelInternalExpanded,
  largePanelInternalSectionsExpanded,
  largePanelInternalSettingsGroupsExpanded,
  setLargePanelInternalSectionExpanded,
  setLargePanelInternalSettingsGroupExpanded,
  smallPanelRootExpanded,
  setSmallPanelRootExpanded,
  smallPanelSectionsExpanded,
  setSmallPanelSectionExpanded,
  buttonVariantDefaultExpanded,
  setButtonVariantDefaultExpanded,
  buttonVariantPlayerExpanded,
  setButtonVariantPlayerExpanded,
  buttonVariantOverlayCellExpanded,
  setButtonVariantOverlayCellExpanded,
  buttonSlotExpanded,
  setButtonSlotExpanded,
  buttonSlotHeaderExpanded,
  setButtonSlotHeaderExpanded,
  buttonSlotSidebarHeaderExpanded,
  setButtonSlotSidebarHeaderExpanded,
  buttonSlotMainHeaderExpanded,
  setButtonSlotMainHeaderExpanded,
  buttonSlotMetadataHeaderExpanded,
  setButtonSlotMetadataHeaderExpanded,
  controlScrollbarExpanded,
  setControlScrollbarExpanded,
  controlSliderBaseExpanded,
  setControlSliderBaseExpanded,
  controlSliderPlayerExpanded,
  setControlSliderPlayerExpanded,
  controlSliderVerticalExpanded,
  setControlSliderVerticalExpanded,
  controlSliderSettingsExpanded,
  setControlSliderSettingsExpanded,
  controlFileListExpanded,
  setControlFileListExpanded,
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
  const syncedSmallPanelColorOverridesRef = useRef<Record<string, Set<string>>>(
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

  const pickContainerParameters = useCallback(
    (parameterIds: readonly string[]) => {
      return parameterIds
        .map((id) => containerLayerParameterMap.get(id))
        .filter(
          (parameter): parameter is ThemeParameterDefinition =>
            parameter !== undefined,
        );
    },
    [containerLayerParameterMap],
  );

  const containerSharedShellAngleParameters = useMemo(() => {
    return pickContainerParameters(CONTAINER_SHARED_SHELL_INLINE_PARAMETER_IDS);
  }, [pickContainerParameters]);

  const containerSharedShellLayoutParameters = useMemo(() => {
    return pickContainerParameters(CONTAINER_SHARED_SHELL_PARAMETER_IDS);
  }, [pickContainerParameters]);

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

  const smallPanelParameterMap = useMemo(
    () =>
      new Map(
        smallPanelLayerParameters.map((parameter) => [parameter.id, parameter]),
      ),
    [smallPanelLayerParameters],
  );

  const pickLargePanelParameters = useCallback(
    (parameterIds: readonly string[]) => {
      return parameterIds
        .map((id) => largePanelParameterMap.get(id))
        .filter(
          (parameter): parameter is ThemeParameterDefinition =>
            parameter !== undefined,
        );
    },
    [largePanelParameterMap],
  );

  const largePanelRootParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_ROOT_PARAMETER_IDS);
  }, [pickLargePanelParameters]);

  const largePanelRootInlineParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_ROOT_INLINE_PARAMETER_IDS);
  }, [pickLargePanelParameters]);

  const largePanelSharedParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_SHARED_PARAMETER_IDS);
  }, [pickLargePanelParameters]);

  const largePanelSharedInlineParameters = useMemo(() => {
    return pickLargePanelParameters(LARGE_PANEL_SHARED_INLINE_PARAMETER_IDS);
  }, [pickLargePanelParameters]);

  const largePanelRootOrderedEntries = useMemo(
    () => [
      { kind: "color", id: "large-panel-border-color" },
      { kind: "parameter", id: "large-panel-border-width" },
      { kind: "color", id: "large-panel-fill-start" },
      { kind: "color", id: "large-panel-fill-end" },
      { kind: "inlineParameter", id: "large-panel-fill-angle" },
      {
        kind: "textSection",
        summary: t("ui.themeParameter.largePanelLayer.rootShadowSettings"),
        fieldIds: ["large-panel-shadow"],
      },
      { kind: "parameter", id: "large-panel-width" },
      { kind: "parameter", id: "large-panel-height" },
      { kind: "parameter", id: "large-panel-radius" },
      { kind: "parameter", id: "large-panel-shell-padding" },
      { kind: "parameter", id: "large-panel-shell-gap" },
    ] as const,
    [t],
  );

  const largePanelSharedOrderedEntries = useMemo(
    () => [
      { kind: "color", id: "large-panel-section-border-color" },
      { kind: "parameter", id: "large-panel-section-border-width" },
      { kind: "color", id: "large-panel-section-fill-start" },
      { kind: "color", id: "large-panel-section-fill-end" },
      { kind: "inlineParameter", id: "large-panel-section-fill-angle" },
    ] as const,
    [],
  );

  const largePanelSectionOrderedEntries = useMemo(
    () => ({
      head: [
        { kind: "color", id: "large-panel-head-border-color" },
        { kind: "parameter", id: "large-panel-head-border-width" },
        { kind: "color", id: "large-panel-head-fill-start" },
        { kind: "color", id: "large-panel-head-fill-end" },
        { kind: "inlineParameter", id: "large-panel-head-fill-angle" },
        { kind: "color", id: "large-panel-head-text" },
        { kind: "parameter", id: "large-panel-head-padding-y" },
        { kind: "parameter", id: "large-panel-head-padding-x" },
      ] as const,
      side: [
        { kind: "color", id: "large-panel-side-border-color" },
        { kind: "parameter", id: "large-panel-side-border-width" },
        { kind: "color", id: "large-panel-side-fill-start" },
        { kind: "color", id: "large-panel-side-fill-end" },
        { kind: "inlineParameter", id: "large-panel-side-fill-angle" },
        { kind: "parameter", id: "large-panel-side-radius" },
        { kind: "parameter", id: "large-panel-side-padding" },
        { kind: "parameter", id: "large-panel-side-gap" },
      ] as const,
      main: [
        { kind: "color", id: "large-panel-main-border-color" },
        { kind: "parameter", id: "large-panel-main-border-width" },
        { kind: "color", id: "large-panel-main-fill-start" },
        { kind: "color", id: "large-panel-main-fill-end" },
        { kind: "inlineParameter", id: "large-panel-main-fill-angle" },
        { kind: "parameter", id: "large-panel-main-radius" },
        { kind: "parameter", id: "large-panel-main-padding-y" },
        { kind: "parameter", id: "large-panel-main-padding-x" },
      ] as const,
    }),
    [],
  );

  const pickSmallPanelParameters = useCallback(
    (parameterIds: readonly string[]) => {
      return parameterIds
        .map((id) => smallPanelParameterMap.get(id))
        .filter(
          (parameter): parameter is ThemeParameterDefinition =>
            parameter !== undefined,
        );
    },
    [smallPanelParameterMap],
  );

  const smallPanelRootInlineParameters = useMemo(() => {
    return pickSmallPanelParameters(SMALL_PANEL_ROOT_INLINE_PARAMETER_IDS);
  }, [pickSmallPanelParameters]);

  const smallPanelRootParameters = useMemo(() => {
    return pickSmallPanelParameters(SMALL_PANEL_ROOT_PARAMETER_IDS);
  }, [pickSmallPanelParameters]);

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
      activePage === "commonControls" ||
      activePage === "buttonStates"
    ) {
      const nextTextValues: Record<string, string> = {};
      const sourceTextFields =
        activePage === "containerLayer"
          ? CONTAINER_LAYER_TEXT_FIELDS
          : activePage === "largePanelLayer"
            ? LARGE_PANEL_TEXT_FIELDS
            : activePage === "commonControls"
              ? COMMON_CONTROL_TEXT_FIELDS
              : activePage === "buttonStates"
                ? BUTTON_STATE_TEXT_FIELDS
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
      } else if (activePage === "smallPanelLayer") {
        syncedSmallPanelColorOverridesRef.current = {};
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
      const smallPanelSyncTargetIds = resolveSmallPanelSyncTargets(field.id);
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
      } else if (smallPanelSyncTargetIds.length > 0) {
        if (!syncedSmallPanelColorOverridesRef.current[field.id]) {
          syncedSmallPanelColorOverridesRef.current[field.id] = new Set(
            smallPanelSyncTargetIds,
          );
        }
        for (const targetId of syncedSmallPanelColorOverridesRef.current[
          field.id
        ]) {
          const targetField = SMALL_PANEL_COLOR_FIELDS.find(
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
      } else if (
        Object.values(SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS,
        )) {
          syncedSmallPanelColorOverridesRef.current[sourceId]?.delete(field.id);
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
      const smallPanelSyncTargetIds = resolveSmallPanelSyncTargets(field.id);
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
      } else if (smallPanelSyncTargetIds.length > 0) {
        if (!syncedSmallPanelColorOverridesRef.current[field.id]) {
          syncedSmallPanelColorOverridesRef.current[field.id] = new Set(
            smallPanelSyncTargetIds,
          );
        }
        for (const targetId of syncedSmallPanelColorOverridesRef.current[
          field.id
        ]) {
          const targetField = SMALL_PANEL_COLOR_FIELDS.find(
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
      } else if (
        Object.values(SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS).some((ids) =>
          ids.includes(field.id as never),
        )
      ) {
        for (const sourceId of Object.keys(
          SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS,
        )) {
          syncedSmallPanelColorOverridesRef.current[sourceId]?.delete(field.id);
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
    const smallPanelSyncTargetIds = resolveSmallPanelSyncTargets(field.id);
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
    if (smallPanelSyncTargetIds.length > 0) {
      root.style.removeProperty(field.cssVar);
      clearLegacySlotOverrideForSemanticVar(root, field.cssVar);
      for (const targetId of syncedSmallPanelColorOverridesRef.current[
        field.id
      ] ?? []) {
        const targetField = SMALL_PANEL_COLOR_FIELDS.find(
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
        for (const targetId of syncedSmallPanelColorOverridesRef.current[
          field.id
        ] ?? []) {
          const targetField = SMALL_PANEL_COLOR_FIELDS.find(
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
      syncedSmallPanelColorOverridesRef.current[field.id] = new Set();
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
    for (const sourceId of Object.keys(SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS)) {
      syncedSmallPanelColorOverridesRef.current[sourceId]?.delete(field.id);
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

  const resetFieldLabel = t("ui.themeParameter.resetField");

  const renderColorFieldRow = (field: ThemeDebugColorField) => {
    return (
      <ThemeParameterColorFieldRow
        key={field.id}
        field={field}
        colorState={
          debugColorValues[field.id] ?? {
            hex: field.fallback,
            alpha: field.fallbackAlpha ?? 1,
          }
        }
        isChanged={isColorFieldChanged(field)}
        onHexChange={setDebugColorFieldHex}
        onAlphaChange={setDebugColorFieldAlpha}
        onReset={resetColorField}
        resetLabel={resetFieldLabel}
      />
    );
  };

  const renderTextFieldRow = (field: ThemeDebugTextField) => {
    return (
      <ThemeParameterTextFieldRow
        key={field.id}
        field={field}
        raw={debugTextValues[field.id] ?? field.fallback}
        isChanged={isTextFieldChanged(field)}
        onChange={setDebugTextFieldValue}
        onReset={resetTextField}
        resetLabel={resetFieldLabel}
      />
    );
  };

  const renderSidebarMainDebugSections = () => {
    return (
      <ThemeParameterDebugLayerList
        layers={SIDEBAR_MAIN_DEBUG_LAYERS}
        colorFields={CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS}
        textFields={CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS}
        renderColorFieldRow={renderColorFieldRow}
        renderTextFieldRow={renderTextFieldRow}
      />
    );
  };

  const renderMainImageNameListDebugSections = () => {
    return (
      <ThemeParameterDebugLayerList
        layers={MAIN_IMAGE_NAME_LIST_DEBUG_LAYERS}
        colorFields={CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS}
        textFields={CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS}
        renderColorFieldRow={renderColorFieldRow}
        renderTextFieldRow={renderTextFieldRow}
      />
    );
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

  const resolveSmallPanelSyncTargets = (fieldId: string) => {
    return (
      SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS[
        fieldId as keyof typeof SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS
      ] ?? []
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

  const renderParameterRows = (parameters: ThemeParameterDefinition[]) => {
    return (
      <ThemeParameterParameterRows
        parameters={parameters}
        values={values}
        resolveLabel={resolveLabel}
        applyParameter={applyParameter}
        isParameterChanged={isParameterChanged}
        resetSingleParameter={resetSingleParameter}
        resetLabel={resetFieldLabel}
      />
    );
  };

  const renderParameterRowsWithVarLabel = (
    parameters: ThemeParameterDefinition[],
  ) => {
    return (
      <ThemeParameterParameterRowsWithVarLabel
        parameters={parameters}
        values={values}
        applyParameter={applyParameter}
        isParameterChanged={isParameterChanged}
        resetSingleParameter={resetSingleParameter}
        resetLabel={resetFieldLabel}
      />
    );
  };

  const parametersPage = (
    <ThemeParameterParametersPage
      t={t}
      styleId={styleId}
      searchText={searchText}
      setSearchText={setSearchText}
      commonExpanded={commonExpanded}
      setCommonExpanded={setCommonExpanded}
      commonContent={renderParameterRows(filteredCommonParameters)}
      showCommonNoResults={filteredCommonParameters.length === 0}
      styleExpanded={styleExpanded}
      setStyleExpanded={setStyleExpanded}
      styleContent={renderParameterRows(filteredStyleParameters)}
      showNoStyleSpecific={styleParameters.length === 0}
      showStyleNoResults={
        styleParameters.length > 0 && filteredStyleParameters.length === 0
      }
    />
  );

  const snapshotPage = (
    <ThemeParameterSnapshotPage
      t={t}
      snapshotIncludeComputedValues={snapshotIncludeComputedValues}
      setSnapshotIncludeComputedValues={setSnapshotIncludeComputedValues}
      exportSnapshotJson={exportSnapshotJson}
      downloadSnapshotJson={downloadSnapshotJson}
      openSnapshotFilePicker={openSnapshotFilePicker}
      copySnapshotJson={copySnapshotJson}
      importSnapshotJson={importSnapshotJson}
      setSnapshotJson={setSnapshotJson}
      setSnapshotMessage={setSnapshotMessage}
      snapshotFileInputRef={snapshotFileInputRef}
      loadSnapshotFile={loadSnapshotFile}
      snapshotJson={snapshotJson}
      snapshotMessage={snapshotMessage}
    />
  );

  const containerLayerPage = (
    <ThemeParameterContainerLayerPage
      t={t}
      activePreviewMode={activePreviewMode}
      togglePreviewMode={togglePreviewMode}
      containerBackgroundExpanded={containerBackgroundExpanded}
      setContainerBackgroundExpanded={setContainerBackgroundExpanded}
      backgroundContent={
        <div className="theme-parameter-text-list">
          {CONTAINER_BACKGROUND_TEXT_FIELDS.map(renderTextFieldRow)}
        </div>
      }
      containerSharedShellExpanded={containerSharedShellExpanded}
      setContainerSharedShellExpanded={setContainerSharedShellExpanded}
      containerSharedShellContent={
        <>
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
        </>
      }
      containerHeaderExpanded={containerHeaderExpanded}
      setContainerHeaderExpanded={setContainerHeaderExpanded}
      containerHeaderContent={
        <>
          <ThemeParameterContainerFrameSection
            section={CONTAINER_FRAME_SECTION_DEFINITIONS[0]}
            appearanceOpen={containerHeaderAppearanceExpanded}
            setAppearanceOpen={setContainerHeaderAppearanceExpanded}
            appearanceParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[0].appearanceParameterIds,
            )}
            transformParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[0].transformParameterIds,
            )}
            renderColorFieldRow={renderColorFieldRow}
            renderTextFieldRow={renderTextFieldRow}
            renderParameterRows={renderParameterRows}
            renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[0]}
            open={containerHeaderButtonsExpanded}
            setOpen={setContainerHeaderButtonsExpanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[0],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[1]}
            open={containerHeaderLogoExpanded}
            setOpen={setContainerHeaderLogoExpanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[1],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[2]}
            open={containerHeaderG1Expanded}
            setOpen={setContainerHeaderG1Expanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[2],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[3]}
            open={containerHeaderG2Expanded}
            setOpen={setContainerHeaderG2Expanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[3],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[4]}
            open={containerHeaderGDebugExpanded}
            setOpen={setContainerHeaderGDebugExpanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[4],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={HEADER_DEBUG_SUBSECTIONS[5]}
            open={containerHeaderG3Expanded}
            setOpen={setContainerHeaderG3Expanded}
            content={renderContainerDebugSubsectionRows(
              HEADER_DEBUG_SUBSECTIONS[5],
            )}
          />
        </>
      }
      containerSidebarExpanded={containerSidebarExpanded}
      setContainerSidebarExpanded={setContainerSidebarExpanded}
      containerSidebarContent={
        <>
          <ThemeParameterContainerFrameSection
            section={CONTAINER_FRAME_SECTION_DEFINITIONS[1]}
            appearanceOpen={containerSidebarAppearanceExpanded}
            setAppearanceOpen={setContainerSidebarAppearanceExpanded}
            appearanceParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[1].appearanceParameterIds,
            )}
            transformParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[1].transformParameterIds,
            )}
            renderColorFieldRow={renderColorFieldRow}
            renderTextFieldRow={renderTextFieldRow}
            renderParameterRows={renderParameterRows}
            renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={SIDEBAR_HEADER_DEBUG_SUBSECTIONS[0]}
            open={containerSidebarHeaderExpanded}
            setOpen={setContainerSidebarHeaderExpanded}
            content={renderContainerDebugSubsectionRows(
              SIDEBAR_HEADER_DEBUG_SUBSECTIONS[0],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={SIDEBAR_HEADER_DEBUG_SUBSECTIONS[1]}
            open={containerSidebarHeaderTitleExpanded}
            setOpen={setContainerSidebarHeaderTitleExpanded}
            content={renderContainerDebugSubsectionRows(
              SIDEBAR_HEADER_DEBUG_SUBSECTIONS[1],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={SIDEBAR_HEADER_DEBUG_SUBSECTIONS[2]}
            open={containerSidebarHeaderActionsExpanded}
            setOpen={setContainerSidebarHeaderActionsExpanded}
            content={renderContainerDebugSubsectionRows(
              SIDEBAR_HEADER_DEBUG_SUBSECTIONS[2],
            )}
          />
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
        </>
      }
      containerMainExpanded={containerMainExpanded}
      setContainerMainExpanded={setContainerMainExpanded}
      containerMainContent={
        <>
          <ThemeParameterContainerFrameSection
            section={CONTAINER_FRAME_SECTION_DEFINITIONS[2]}
            appearanceOpen={containerMainAppearanceExpanded}
            setAppearanceOpen={setContainerMainAppearanceExpanded}
            appearanceParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[2].appearanceParameterIds,
            )}
            transformParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[2].transformParameterIds,
            )}
            renderColorFieldRow={renderColorFieldRow}
            renderTextFieldRow={renderTextFieldRow}
            renderParameterRows={renderParameterRows}
            renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={MAIN_HEADER_DEBUG_SUBSECTIONS[0]}
            open={containerMainHeaderExpanded}
            setOpen={setContainerMainHeaderExpanded}
            content={renderContainerDebugSubsectionRows(
              MAIN_HEADER_DEBUG_SUBSECTIONS[0],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={MAIN_HEADER_DEBUG_SUBSECTIONS[1]}
            open={containerMainHeaderButtonsExpanded}
            setOpen={setContainerMainHeaderButtonsExpanded}
            content={renderContainerDebugSubsectionRows(
              MAIN_HEADER_DEBUG_SUBSECTIONS[1],
            )}
          />
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
                  <span>工作区 缩略图模式</span>
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
              <section className="settings-group theme-parameter-debug-group">
                <header className="settings-group-head theme-parameter-subgroup-head">
                  <span>工作区 视频 / 音乐 / 覆盖层</span>
                  <span className="theme-parameter-subgroup-tag">
                    fg-main-content-media
                  </span>
                </header>
                <div className="theme-parameter-color-list">
                  {CONTAINER_MAIN_MEDIA_COLOR_FIELDS.map(renderColorFieldRow)}
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
              {t("ui.themeParameter.containerLayer.sectionMainImageNameList")}
            </summary>
            <div className="settings-collapsible-content">
              {renderMainImageNameListDebugSections()}
            </div>
          </details>
        </>
      }
      containerMetadataExpanded={containerMetadataExpanded}
      setContainerMetadataExpanded={setContainerMetadataExpanded}
      containerMetadataContent={
        <>
          <ThemeParameterContainerFrameSection
            section={CONTAINER_FRAME_SECTION_DEFINITIONS[3]}
            appearanceOpen={containerMetadataAppearanceExpanded}
            setAppearanceOpen={setContainerMetadataAppearanceExpanded}
            appearanceParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[3].appearanceParameterIds,
            )}
            transformParameters={pickContainerParameters(
              CONTAINER_FRAME_SECTION_DEFINITIONS[3].transformParameterIds,
            )}
            renderColorFieldRow={renderColorFieldRow}
            renderTextFieldRow={renderTextFieldRow}
            renderParameterRows={renderParameterRows}
            renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_HEADER_DEBUG_SUBSECTIONS[0]}
            open={containerMetadataHeaderExpanded}
            setOpen={setContainerMetadataHeaderExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_HEADER_DEBUG_SUBSECTIONS[0],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_HEADER_DEBUG_SUBSECTIONS[1]}
            open={containerMetadataHeaderButtonsExpanded}
            setOpen={setContainerMetadataHeaderButtonsExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_HEADER_DEBUG_SUBSECTIONS[1],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_INTERNAL_DEBUG_SUBSECTIONS[0]}
            open={containerMetadataInternalsExpanded}
            setOpen={setContainerMetadataInternalsExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_INTERNAL_DEBUG_SUBSECTIONS[0],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_INTERNAL_DEBUG_SUBSECTIONS[1]}
            open={containerMetadataFileListExpanded}
            setOpen={setContainerMetadataFileListExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_INTERNAL_DEBUG_SUBSECTIONS[1],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_INTERNAL_DEBUG_SUBSECTIONS[2]}
            open={containerMetadataPreferenceRecordExpanded}
            setOpen={setContainerMetadataPreferenceRecordExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_INTERNAL_DEBUG_SUBSECTIONS[2],
            )}
          />
          <ThemeParameterDebugSubsection
            t={t}
            section={METADATA_INTERNAL_DEBUG_SUBSECTIONS[3]}
            open={containerMetadataBookletBindingExpanded}
            setOpen={setContainerMetadataBookletBindingExpanded}
            content={renderContainerDebugSubsectionRows(
              METADATA_INTERNAL_DEBUG_SUBSECTIONS[3],
            )}
          />
        </>
      }
    />
  );

  const largePanelLayerPage = (
    <ThemeParameterLargePanelLayerPage
      t={t}
      activePreviewMode={activePreviewMode}
      togglePreviewMode={togglePreviewMode}
      rootExpanded={largePanelRootExpanded}
      setRootExpanded={setLargePanelRootExpanded}
      rootSection={
        <ThemeParameterLargePanelSectionRows
          colorFields={LARGE_PANEL_ROOT_COLOR_FIELDS}
          orderedEntries={largePanelRootOrderedEntries}
          inlineParameters={largePanelRootInlineParameters}
          textFields={LARGE_PANEL_ROOT_TEXT_FIELDS}
          parameters={largePanelRootParameters}
          renderColorFieldRow={renderColorFieldRow}
          renderTextFieldRow={renderTextFieldRow}
          renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
        />
      }
      sharedExpanded={largePanelSharedSectionExpanded}
      setSharedExpanded={setLargePanelSharedSectionExpanded}
      sharedSection={
        <ThemeParameterLargePanelSectionRows
          colorFields={LARGE_PANEL_SHARED_COLOR_FIELDS}
          orderedEntries={largePanelSharedOrderedEntries}
          inlineParameters={largePanelSharedInlineParameters}
          parameters={largePanelSharedParameters}
          renderColorFieldRow={renderColorFieldRow}
          renderTextFieldRow={renderTextFieldRow}
          renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
        />
      }
      bodySections={
        <>
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
                  setExpanded((event.currentTarget as HTMLDetailsElement).open)
                }
              >
                <summary>{t(section.summaryKey)}</summary>
                <div className="settings-collapsible-content">
                  <ThemeParameterLargePanelSectionRows
                    colorFields={section.colorFields}
                    orderedEntries={largePanelSectionOrderedEntries[section.id]}
                    inlineParameters={pickLargePanelParameters(
                      section.inlineParameterIds,
                    )}
                    parameters={pickLargePanelParameters(section.parameterIds)}
                    renderColorFieldRow={renderColorFieldRow}
                    renderTextFieldRow={renderTextFieldRow}
                    renderParameterRowsWithVarLabel={
                      renderParameterRowsWithVarLabel
                    }
                  />
                </div>
              </details>
            );
          })}
          <details
            className="settings-collapsible"
            open={largePanelButtonExpanded}
            onToggle={(event) =>
              setLargePanelButtonExpanded(
                (event.currentTarget as HTMLDetailsElement).open,
              )
            }
          >
            <summary>{t("ui.themeParameter.largePanelLayer.sectionButton")}</summary>
            <div className="settings-collapsible-content">
              <ThemeParameterLargePanelSectionRows
                colorFields={LARGE_PANEL_BUTTON_COLOR_FIELDS}
                renderColorFieldRow={renderColorFieldRow}
                renderTextFieldRow={renderTextFieldRow}
                renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
              />
            </div>
          </details>
        </>
      }
      internalSection={
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
            <ThemeParameterLargePanelInternalSections
              t={t}
              sections={LARGE_PANEL_INTERNAL_SECTION_DEFINITIONS}
              expanded={largePanelInternalSectionsExpanded}
              settingsGroupsExpanded={largePanelInternalSettingsGroupsExpanded}
              setExpanded={setLargePanelInternalSectionExpanded}
              setSettingsGroupExpanded={
                setLargePanelInternalSettingsGroupExpanded
              }
              renderSectionRows={(options) => (
                <ThemeParameterLargePanelSectionRows
                  colorFields={options.colorFields}
                  orderedEntries={options.orderedEntries}
                  inlineParameters={options.inlineParameters}
                  textFields={options.textFields}
                  parameters={options.parameters}
                  renderColorFieldRow={renderColorFieldRow}
                  renderTextFieldRow={renderTextFieldRow}
                  renderParameterRowsWithVarLabel={
                    renderParameterRowsWithVarLabel
                  }
                />
              )}
            />
          </div>
        </details>
      }
    />
  );

  const smallPanelLayerPage = (
    <ThemeParameterSmallPanelLayerPage
      t={t}
      activePreviewMode={activePreviewMode}
      togglePreviewMode={togglePreviewMode}
      rootExpanded={smallPanelRootExpanded}
      setRootExpanded={setSmallPanelRootExpanded}
      rootSection={
        <ThemeParameterLargePanelSectionRows
          colorFields={SMALL_PANEL_ROOT_COLOR_FIELDS}
          inlineParameters={smallPanelRootInlineParameters}
          textFields={SMALL_PANEL_ROOT_TEXT_FIELDS}
          parameters={smallPanelRootParameters}
          renderColorFieldRow={renderColorFieldRow}
          renderTextFieldRow={renderTextFieldRow}
          renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
        />
      }
      bodySections={SMALL_PANEL_SECTION_DEFINITIONS.map((section) => (
        <details
          key={section.id}
          className="settings-collapsible"
          open={smallPanelSectionsExpanded[section.id]}
          onToggle={(event) =>
            setSmallPanelSectionExpanded(
              section.id,
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
        >
          <summary>{t(section.summaryKey)}</summary>
          <div className="settings-collapsible-content">
            <ThemeParameterSmallPanelSectionGroups
              groups={section.groups}
              resolveInlineParameters={pickSmallPanelParameters}
              renderColorFieldRow={renderColorFieldRow}
              renderTextFieldRow={renderTextFieldRow}
              renderParameterRowsWithVarLabel={renderParameterRowsWithVarLabel}
            />
          </div>
        </details>
      ))}
    />
  );

  const commonControlsPage = (
    <ThemeParameterCommonControlsPage
      t={t}
      content={
        <ThemeParameterCommonControlSections
          t={t}
          controlPreviewValues={controlPreviewValues}
          setControlPreviewValues={setControlPreviewValues}
          scrollbarExpanded={controlScrollbarExpanded}
          setScrollbarExpanded={setControlScrollbarExpanded}
          sliderBaseExpanded={controlSliderBaseExpanded}
          setSliderBaseExpanded={setControlSliderBaseExpanded}
          sliderPlayerExpanded={controlSliderPlayerExpanded}
          setSliderPlayerExpanded={setControlSliderPlayerExpanded}
          sliderVerticalExpanded={controlSliderVerticalExpanded}
          setSliderVerticalExpanded={setControlSliderVerticalExpanded}
          sliderSettingsExpanded={controlSliderSettingsExpanded}
          setSliderSettingsExpanded={setControlSliderSettingsExpanded}
          fileListExpanded={controlFileListExpanded}
          setFileListExpanded={setControlFileListExpanded}
          debugTextValues={debugTextValues}
          isTextFieldChanged={isTextFieldChanged}
          setDebugTextFieldValue={setDebugTextFieldValue}
          resetTextField={resetTextField}
          resetLabel={resetFieldLabel}
          renderColorFieldRow={renderColorFieldRow}
        />
      }
    />
  );

  const buttonStatesPage = (
    <ThemeParameterButtonStatesPage
      t={t}
      content={
        <ThemeParameterButtonStateDebug
          t={t}
          defaultExpanded={buttonVariantDefaultExpanded}
          setDefaultExpanded={setButtonVariantDefaultExpanded}
          playerExpanded={buttonVariantPlayerExpanded}
          setPlayerExpanded={setButtonVariantPlayerExpanded}
          overlayCellExpanded={buttonVariantOverlayCellExpanded}
          setOverlayCellExpanded={setButtonVariantOverlayCellExpanded}
          slotExpanded={buttonSlotExpanded}
          setSlotExpanded={setButtonSlotExpanded}
          slotHeaderExpanded={buttonSlotHeaderExpanded}
          setSlotHeaderExpanded={setButtonSlotHeaderExpanded}
          slotSidebarHeaderExpanded={buttonSlotSidebarHeaderExpanded}
          setSlotSidebarHeaderExpanded={setButtonSlotSidebarHeaderExpanded}
          slotMainHeaderExpanded={buttonSlotMainHeaderExpanded}
          setSlotMainHeaderExpanded={setButtonSlotMainHeaderExpanded}
          slotMetadataHeaderExpanded={buttonSlotMetadataHeaderExpanded}
          setSlotMetadataHeaderExpanded={setButtonSlotMetadataHeaderExpanded}
          renderColorFieldRow={renderColorFieldRow}
          renderTextFieldRow={renderTextFieldRow}
        />
      }
    />
  );

  return (
    <div className="mpx-large-panel-shell settings-shell theme-parameter-shell">
      <ThemeParameterPageSidebar
        t={t}
        pages={pages}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main
        ref={setMainScrollElement}
        className="mpx-large-panel-main settings-main mpx-scroll-area theme-parameter-main"
        onScroll={onMainScroll}
      >
        {activePage === "parameters" ? parametersPage : null}
        {activePage === "snapshot" ? snapshotPage : null}
        {activePage === "containerLayer" ? containerLayerPage : null}
        {activePage === "largePanelLayer" ? largePanelLayerPage : null}
        {activePage === "smallPanelLayer" ? smallPanelLayerPage : null}
        {activePage === "commonControls" ? commonControlsPage : null}
        {activePage === "buttonStates" ? buttonStatesPage : null}
      </main>
    </div>
  );
}
