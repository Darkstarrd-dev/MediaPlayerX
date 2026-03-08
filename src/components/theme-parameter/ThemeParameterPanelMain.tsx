import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SkeuoRunway } from "../primitives/SkeuoRunway";
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
  formatColorStateAsCss,
  parseColorState,
  readCssColorState,
  type ColorState,
} from "./themeParameterUtils";
import {
  ThemeParameterColorFieldRow,
  ThemeParameterCommonControlTextFieldRow,
  ThemeParameterDebugSectionList,
  ThemeParameterParameterRows,
  ThemeParameterParameterRowsWithVarLabel,
  ThemeParameterTextFieldRow,
  buildSkeuoRangeStyle,
} from "./ThemeParameterFieldRows";
import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";
import {
  BUTTON_STATE_COLOR_FIELDS,
  BUTTON_STATE_FIELD_PREFIX,
  COMMON_CONTROL_COLOR_FIELDS,
  COMMON_CONTROL_TEXT_FIELDS,
  CONTAINER_BACKGROUND_TEXT_FIELDS,
  CONTAINER_FILL_SYNC_COLOR_FIELD_IDS,
  CONTAINER_FRAME_SECTION_DEFINITIONS,
  CONTAINER_LAYER_COLOR_FIELDS,
  CONTAINER_LAYER_TEXT_FIELDS,
  CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS,
  CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS,
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
  CONTROL_SECTION_DEFINITIONS,
  HEADER_DEBUG_SUBSECTIONS,
  LARGE_PANEL_COLOR_FIELDS,
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
  MAIN_IMAGE_NAME_LIST_DEBUG_SECTIONS,
  METADATA_HEADER_DEBUG_SUBSECTIONS,
  SIDEBAR_HEADER_DEBUG_SUBSECTIONS,
  SIDEBAR_MAIN_DEBUG_SECTIONS,
  SMALL_PANEL_COLOR_FIELDS,
  SMALL_PANEL_ROOT_COLOR_FIELDS,
  SMALL_PANEL_ROOT_TEXT_FIELDS,
  SMALL_PANEL_SECTION_DEFINITIONS,
  SMALL_PANEL_TEXT_FIELDS,
  clearLegacySlotOverrideForSemanticVar,
} from "./themeParameterPanelCatalog";
import type {
  ButtonStateKey,
  ContainerDebugSubsection,
  ControlPreviewValues,
  LargePanelInternalSectionId,
  SmallPanelSectionId,
  SmallPanelSectionGroupDefinition,
  ThemeDebugColorField,
  ThemeDebugTextField,
  ThemeControlSectionId,
  ThemeParameterPageId,
  ThemeParameterPreviewMode,
} from "./themeParameterPanelTypes";

export type {
  LargePanelInternalSectionId,
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
  smallPanelRootExpanded: boolean;
  setSmallPanelRootExpanded: Dispatch<SetStateAction<boolean>>;
  smallPanelSectionsExpanded: Record<SmallPanelSectionId, boolean>;
  setSmallPanelSectionExpanded: (
    sectionId: SmallPanelSectionId,
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
  smallPanelRootExpanded,
  setSmallPanelRootExpanded,
  smallPanelSectionsExpanded,
  setSmallPanelSectionExpanded,
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

  const smallPanelRootParameters = useMemo(() => {
    return smallPanelLayerParameters;
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
      <ThemeParameterDebugSectionList
        sections={SIDEBAR_MAIN_DEBUG_SECTIONS}
        colorFields={CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS}
        textFields={CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS}
        renderColorFieldRow={renderColorFieldRow}
        renderTextFieldRow={renderTextFieldRow}
      />
    );
  };

  const renderMainImageNameListDebugSections = () => {
    return (
      <ThemeParameterDebugSectionList
        sections={MAIN_IMAGE_NAME_LIST_DEBUG_SECTIONS}
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

  const renderSmallPanelSectionGroups = (
    groups: readonly SmallPanelSectionGroupDefinition[],
  ) => {
    return groups.map((group, index) => {
      if (group.colorFields.length === 0 && group.textFields.length === 0) {
        return null;
      }
      return (
        <section
          key={`${group.title ?? "root"}-${index}`}
          className="settings-group theme-parameter-debug-group"
        >
          {group.title ? (
            <header className="settings-group-head">
              <span>{group.title}</span>
            </header>
          ) : null}
          {group.colorFields.length > 0 ? (
            <div className="theme-parameter-color-list">
              {group.colorFields.map(renderColorFieldRow)}
            </div>
          ) : null}
          {group.textFields.length > 0 ? (
            <div className="theme-parameter-text-list">
              {group.textFields.map(renderTextFieldRow)}
            </div>
          ) : null}
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

  const renderCommonControlTextFieldRow = (field: ThemeDebugTextField) => {
    return (
      <ThemeParameterCommonControlTextFieldRow
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
              {containerSharedShellColorFields.slice(0, 2).map(renderColorFieldRow)}
            </div>
            {renderParameterRowsWithVarLabel(containerSharedShellAngleParameters)}
            <div className="theme-parameter-color-list">
              {containerSharedShellColorFields.slice(2).map(renderColorFieldRow)}
            </div>
            <div className="theme-parameter-text-list">
              {containerSharedShellTextFields.map(renderTextFieldRow)}
            </div>
          </section>
          <section className="settings-group theme-parameter-debug-group">
            <header className="settings-group-head">
              <span>形态/布局</span>
            </header>
            {renderParameterRowsWithVarLabel(containerSharedShellLayoutParameters)}
          </section>
        </>
      }
      containerHeaderExpanded={containerHeaderExpanded}
      setContainerHeaderExpanded={setContainerHeaderExpanded}
      containerHeaderContent={
        <>
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
        </>
      }
      containerSidebarExpanded={containerSidebarExpanded}
      setContainerSidebarExpanded={setContainerSidebarExpanded}
      containerSidebarContent={
        <>
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
            <summary>{t("ui.themeParameter.containerLayer.sectionSidebarMain")}</summary>
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
            <summary>{t("ui.themeParameter.containerLayer.sectionMainWorkspace")}</summary>
            <div className="settings-collapsible-content">
              <section className="settings-group theme-parameter-debug-group">
                <header className="settings-group-head theme-parameter-subgroup-head">
                  <span>工作区 / 图片网格</span>
                  <span className="theme-parameter-subgroup-tag">
                    fg-main-content-image-grid
                  </span>
                </header>
                <div className="theme-parameter-color-list">
                  {CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS.map(renderColorFieldRow)}
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
      rootSection={renderLargePanelSectionRows({
        colorFields: LARGE_PANEL_ROOT_COLOR_FIELDS,
        inlineParameters: largePanelRootInlineParameters,
        textFields: LARGE_PANEL_ROOT_TEXT_FIELDS,
        parameters: largePanelRootParameters,
      })}
      sharedExpanded={largePanelSharedSectionExpanded}
      setSharedExpanded={setLargePanelSharedSectionExpanded}
      sharedSection={renderLargePanelSectionRows({
        colorFields: LARGE_PANEL_SHARED_COLOR_FIELDS,
        inlineParameters: largePanelSharedInlineParameters,
        parameters: largePanelSharedParameters,
      })}
      bodySections={LARGE_PANEL_SECTION_DEFINITIONS.map((section) => {
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
              {renderLargePanelSectionRows({
                colorFields: section.colorFields,
                inlineParameters: pickLargePanelParameters(section.inlineParameterIds),
                parameters: pickLargePanelParameters(section.parameterIds),
              })}
            </div>
          </details>
        );
      })}
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
          <summary>{t("ui.themeParameter.largePanelLayer.sectionInternal")}</summary>
          <div className="settings-collapsible-content">
            {renderLargePanelInternalSections()}
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
      rootSection={renderLargePanelSectionRows({
        colorFields: SMALL_PANEL_ROOT_COLOR_FIELDS,
        textFields: SMALL_PANEL_ROOT_TEXT_FIELDS,
        parameters: smallPanelRootParameters,
      })}
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
            {renderSmallPanelSectionGroups(section.groups)}
          </div>
        </details>
      ))}
    />
  );

  const commonControlsPage = (
    <ThemeParameterCommonControlsPage
      t={t}
      content={renderCommonControlSections()}
    />
  );

  const buttonStatesPage = (
    <ThemeParameterButtonStatesPage
      t={t}
      content={
        <section className="settings-group">
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
                        item.key === "close-hover" ? "danger force-hover" : "",
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
                  {resolveButtonStateFields(item.key).map(renderColorFieldRow)}
                </div>
                <span>样式来源：{item.styleSource}</span>
                <span>交互事件：{item.interaction}</span>
                <span>示例位置：{item.usage}</span>
              </li>
            ))}
          </ul>
        </section>
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
