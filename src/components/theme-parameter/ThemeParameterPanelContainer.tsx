import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { MainUiIcon } from "../MainUiIcon";
import { useDraggablePanel } from "../useDraggablePanel";
import { buildA11yProps } from "../../i18n/a11y";
import { useI18n } from "../../i18n/useI18n";
import { ThemeParameterPanelMain } from "./ThemeParameterPanelMain";
import type { ThemeParameterPreviewMode } from "./ThemeParameterPanelMain";
import {
  applyImportedThemeParameterSyncTargets,
  applyThemeParameterSyncTargets,
  collectThemeParameterSyncIds,
  consumeThemeParameterSyncTargetsForReset,
  createThemeParameterSyncState,
  pruneThemeParameterSyncTarget,
  resetThemeParameterSyncState,
} from "./themeParameterSync";
import { includesSearch, readFileAsText } from "./themeParameterUtils";
import { useThemeParameterUiSession } from "./useThemeParameterUiSession";
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
  writeContainerDebugSessionState,
} from "./themeParameterPanelSessionState";
import {
  CONTAINER_DEBUG_COLOR_FIELDS,
  CONTAINER_DEBUG_TEXT_FIELDS,
  SNAPSHOT_COLOR_FIELDS,
  SNAPSHOT_TEXT_FIELDS,
  type ThemeParameterSnapshot,
} from "./themeParameterSnapshotCatalog";

const PREVIEW_MODE_ATTR = "data-mpx-theme-debug-preview";
const THEME_PARAMETER_RESET_EVENT = "mpx-theme-parameter-reset";

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
  const {
    uiState,
    restoreUiState,
    persistUiState,
    setActivePage,
    setPageScrollTop,
    setCommonExpanded,
    setStyleExpanded,
    setContainerBackgroundExpanded,
    setContainerSharedShellExpanded,
    setContainerHeaderExpanded,
    setContainerHeaderAppearanceExpanded,
    setContainerHeaderButtonsExpanded,
    setContainerHeaderLogoExpanded,
    setContainerHeaderG1Expanded,
    setContainerHeaderG2Expanded,
    setContainerHeaderGDebugExpanded,
    setContainerHeaderG3Expanded,
    setContainerSidebarExpanded,
    setContainerSidebarAppearanceExpanded,
    setContainerSidebarHeaderExpanded,
    setContainerSidebarHeaderTitleExpanded,
    setContainerSidebarHeaderActionsExpanded,
    setContainerMainExpanded,
    setContainerMainAppearanceExpanded,
    setContainerMainHeaderExpanded,
    setContainerMainHeaderButtonsExpanded,
    setContainerMainWorkspaceExpanded,
    setContainerMetadataExpanded,
    setContainerMetadataAppearanceExpanded,
    setContainerMetadataHeaderExpanded,
    setContainerMetadataHeaderButtonsExpanded,
    setContainerSidebarMainExpanded,
    setContainerMainImageNameListExpanded,
    setLargePanelRootExpanded,
    setLargePanelSharedSectionExpanded,
    setLargePanelHeadExpanded,
    setLargePanelSideExpanded,
    setLargePanelMainExpanded,
    setLargePanelInternalExpanded,
    setLargePanelInternalSectionExpanded,
    setSmallPanelRootExpanded,
    setSmallPanelSectionExpanded,
  } = useThemeParameterUiSession();
  const [values, setValues] = useState<ThemeParameterValues>({});
  const parameterSyncStateRef = useRef(
    createThemeParameterSyncState(),
  );
  const [activePreviewMode, setActivePreviewMode] =
    useState<ThemeParameterPreviewMode>("none");
  const [searchText, setSearchText] = useState("");
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

  const {
    activePage,
    commonExpanded,
    styleExpanded,
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
    largePanelInternalSectionsExpanded,
    smallPanelRootExpanded,
    smallPanelSectionsExpanded,
  } = uiState;

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
    resetThemeParameterSyncState(parameterSyncStateRef.current);
    const root = document.documentElement;
    migrateLegacySidebarMainSlots(root);
    applyContainerDebugSessionState(root);
    const initialValues = readParameterValues(parameters);
    const computed = getComputedStyle(root);
    restoreUiState();
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
    const scrollTop = uiState.pageScrollTops[activePage] ?? 0;
    if (mainScrollElementRef.current) {
      mainScrollElementRef.current.scrollTop = scrollTop;
    }
  }, [activePage, open, uiState.pageScrollTops]);

  useEffect(() => {
    if (open) {
      return;
    }
    if (!wasOpenRef.current) {
      return;
    }
    const scrollTop =
      mainScrollElementRef.current?.scrollTop ??
      uiState.pageScrollTops[activePage] ??
      0;
    captureContainerDebugSessionState(document.documentElement);
    persistUiState(scrollTop);
    wasOpenRef.current = false;
  }, [
    open,
    persistUiState,
    uiState.pageScrollTops,
    activePage,
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
    setSnapshotExplicitParameterIds((previous) => {
      const next = new Set(previous);
      for (const parameterId of collectThemeParameterSyncIds(parameter.id)) {
        next.add(parameterId);
      }
      return next;
    });
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      };
      parameter.apply(root, nextValue, nextValues);
      if (
        !applyThemeParameterSyncTargets({
          state: parameterSyncStateRef.current,
          parameterId: parameter.id,
          parameterMap,
          root,
          nextValue,
          nextValues,
        })
      ) {
        pruneThemeParameterSyncTarget(parameterSyncStateRef.current, parameter.id);
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
    resetThemeParameterSyncState(parameterSyncStateRef.current);
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
      if (
        !applyImportedThemeParameterSyncTargets({
          state: parameterSyncStateRef.current,
          parameterId: parameter.id,
          importedValues,
          importedParameterIds,
          parameterMap,
          root,
          nextValue: normalized,
          nextValues,
        })
      ) {
        pruneThemeParameterSyncTarget(parameterSyncStateRef.current, parameter.id);
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
    const syncedIds = consumeThemeParameterSyncTargetsForReset(
      parameterSyncStateRef.current,
      parameter.id,
    );
    if (syncedIds !== null) {
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
    pruneThemeParameterSyncTarget(parameterSyncStateRef.current, parameter.id);
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
    resetThemeParameterSyncState(parameterSyncStateRef.current);
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
          setActivePage={(action) => {
            setActivePage(action, mainScrollElementRef.current?.scrollTop ?? 0);
          }}
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
            setPageScrollTop(activePage, mainScrollElementRef.current?.scrollTop ?? 0);
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
          largePanelInternalSectionsExpanded={largePanelInternalSectionsExpanded}
          setLargePanelInternalSectionExpanded={
            setLargePanelInternalSectionExpanded
          }
          smallPanelRootExpanded={smallPanelRootExpanded}
          setSmallPanelRootExpanded={setSmallPanelRootExpanded}
          smallPanelSectionsExpanded={smallPanelSectionsExpanded}
          setSmallPanelSectionExpanded={setSmallPanelSectionExpanded}
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
