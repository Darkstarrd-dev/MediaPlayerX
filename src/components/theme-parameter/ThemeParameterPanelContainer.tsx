import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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

const PREVIEW_MODE_ATTR = "data-mpx-theme-debug-preview";

const CONTAINER_LAYER_PARAMETER_IDS = new Set([
  "layout-padding",
  "splitter-width",
  "panel-radius",
  "header-radius",
  "card-radius",
  "panel-border-width",
  "skeuo-pane-elevation",
  "skeuo-container-elevation",
  "skeuo-header-gap",
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
  return parameter.id.includes("-pane-");
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
  { id: "container-bg-app", cssVar: "--mpx-bg-app", fallback: "#f2eee7" },
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
    id: "container-metal-light",
    cssVar: "--mpx-metal-light",
    fallback: "#f5f2ec",
  },
  {
    id: "container-metal-base",
    cssVar: "--mpx-metal-base",
    fallback: "#e6e2da",
  },
  {
    id: "container-metal-dark",
    cssVar: "--mpx-metal-dark",
    fallback: "#cdc7bb",
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
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-bg",
    cssVar: "--mpx-large-panel-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-head-bg",
    cssVar: "--mpx-large-panel-head-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-side-bg",
    cssVar: "--mpx-large-panel-side-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-main-bg",
    cssVar: "--mpx-large-panel-main-bg",
    fallback: "#ffffff",
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
];

const SNAPSHOT_TEXT_FIELDS: readonly SnapshotTextField[] = [
  {
    id: "container-surface-chrome-shell-shadow",
    cssVar: "--mpx-surface-chrome-shell-shadow",
  },
  {
    id: "small-panel-shadow",
    cssVar: "--mpx-dialog-panel-shadow",
  },
];

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
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ]
        : [
            ...COMMON_PARAMETERS,
            ...STYLE_PARAMETERS[styleGroup],
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ],
    [styleGroup],
  );
  const [values, setValues] = useState<ThemeParameterValues>({});
  const [activePage, setActivePage] =
    useState<ThemeParameterPageId>("parameters");
  const [activePreviewMode, setActivePreviewMode] =
    useState<ThemeParameterPreviewMode>("none");
  const [searchText, setSearchText] = useState("");
  const [commonExpanded, setCommonExpanded] = useState(true);
  const [styleExpanded, setStyleExpanded] = useState(true);
  const [snapshotJson, setSnapshotJson] = useState("");
  const [snapshotIncludeComputedValues, setSnapshotIncludeComputedValues] =
    useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotExplicitParameterIds, setSnapshotExplicitParameterIds] =
    useState<Set<string>>(new Set());
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotBaselineRef = useRef<ThemeParameterSnapshot | null>(null);
  const { panelOffset, panelDragging, headHandlers } = useDraggablePanel(open);

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
    const initialValues = readParameterValues(parameters);
    const computed = getComputedStyle(document.documentElement);
    setActivePage("parameters");
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
      next.add(parameter.id);
      return next;
    });
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      };
      parameter.apply(root, nextValue, nextValues);
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
  };

  const resolveLabel = (parameter: ThemeParameterDefinition): string => {
    return resolveParameterLabel(parameter, t);
  };

  const togglePreviewMode = (
    mode: Exclude<ThemeParameterPreviewMode, "none">,
  ) => {
    setActivePreviewMode((previous) => (previous === mode ? "none" : mode));
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
            <header className="mpx-large-panel-head theme-debug-large-panel-preview-head" />
            <div className="mpx-large-panel-shell theme-debug-large-panel-preview-shell">
              <aside className="mpx-large-panel-side theme-debug-large-panel-preview-side" />
              <main className="mpx-large-panel-main theme-debug-large-panel-preview-main" />
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
          <h2>{t("ui.themeParameter.panel")}</h2>
          <div className="settings-head-actions">
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
          resetSnapshotToBaseline={resetSnapshotToBaseline}
          commonExpanded={commonExpanded}
          setCommonExpanded={setCommonExpanded}
          styleExpanded={styleExpanded}
          setStyleExpanded={setStyleExpanded}
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
        />
      </section>
    </div>
  );
}

export type { ThemeParameterDefinition, ThemeParameterValues };

export default ThemeParameterPanel;
