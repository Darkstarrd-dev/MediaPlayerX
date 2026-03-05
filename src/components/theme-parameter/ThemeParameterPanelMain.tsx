import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useState } from "react";

import {
  formatColorStateAsCss,
  formatValue,
  parseColorState,
  readCssColorState,
  type ColorState,
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
  resetSnapshotToBaseline: () => void;
  commonExpanded: boolean;
  setCommonExpanded: Dispatch<SetStateAction<boolean>>;
  styleExpanded: boolean;
  setStyleExpanded: Dispatch<SetStateAction<boolean>>;
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
  resetCurrentStyleParameters: () => void;
}

export type ThemeParameterPageId =
  | "parameters"
  | "snapshot"
  | "containerLayer"
  | "largePanelLayer"
  | "smallPanelLayer"
  | "buttonStates"
  | "actions";

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

interface ThemeDebugColorField {
  id: string;
  cssVar: string;
  fallback: string;
  fallbackAlpha?: number;
  groupId: ThemeDebugNumberGroupId;
}

interface ThemeDebugTextField {
  id: string;
  cssVar: string;
  fallback: string;
  groupId: ThemeDebugNumberGroupId;
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
  resetSnapshotToBaseline,
  commonExpanded,
  setCommonExpanded,
  styleExpanded,
  setStyleExpanded,
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
  resetCurrentStyleParameters,
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
      id: "buttonStates",
      labelKey: "ui.themeParameter.page.buttonStates",
    },
    { id: "actions", labelKey: "ui.themeParameter.page.actions" },
  ];

  const [debugColorValues, setDebugColorValues] = useState<
    Record<string, ColorState>
  >({});
  const [debugTextValues, setDebugTextValues] = useState<
    Record<string, string>
  >({});

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
      activePage !== "buttonStates"
    ) {
      return;
    }
    const computed = getComputedStyle(document.documentElement);
    const sourceFields =
      activePage === "containerLayer"
        ? CONTAINER_COLOR_FIELDS
        : activePage === "largePanelLayer"
          ? LARGE_PANEL_COLOR_FIELDS
          : activePage === "smallPanelLayer"
            ? SMALL_PANEL_COLOR_FIELDS
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

    if (activePage === "containerLayer" || activePage === "smallPanelLayer") {
      const nextTextValues: Record<string, string> = {};
      const sourceTextFields =
        activePage === "containerLayer"
          ? CONTAINER_TEXT_FIELDS
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
  };

  const resetTextField = (field: ThemeDebugTextField) => {
    const root = document.documentElement;
    root.style.removeProperty(field.cssVar);
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
        <span className="theme-parameter-var-label">{field.cssVar}</span>
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
            {groupFields.map((field) => {
              const raw = debugTextValues[field.id] ?? field.fallback;
              return (
                <label key={field.id} className="theme-parameter-text-row">
                  <span className="theme-parameter-var-label">
                    {field.cssVar}
                  </span>
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
            })}
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
      usage: "ThemeParameterPanelMain.tsx -> side 按钮状态样例",
      demoLabel: "开关已按下",
    },
    {
      key: "disabled",
      state: "禁用态 (disabled)",
      styleSource: ".theme-parameter-side-btn:disabled（side-btn-disabled-*）",
      interaction: "组件设置 disabled，阻断点击",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮状态样例",
      demoLabel: "禁用",
    },
    {
      key: "pending",
      state: "待处理态 (is-pending)",
      styleSource: ".theme-parameter-side-btn.is-pending（side-btn-pending-*）",
      interaction: "异步任务期间由业务状态添加 class",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮状态样例",
      demoLabel: "处理中",
    },
    {
      key: "close-hover",
      state: "危险悬停态 (close:hover)",
      styleSource:
        ".theme-parameter-side-btn.danger:hover / .danger.force-hover",
      interaction: "关闭按钮 hover",
      usage: "ThemeParameterPanelMain.tsx -> side 按钮状态样例",
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

      <main className="mpx-large-panel-main settings-main mpx-scroll-area theme-parameter-main">
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
                <button type="button" onClick={resetSnapshotToBaseline}>
                  {t("ui.themeParameter.resetSnapshotToOpenState")}
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
            {renderColorGroups(CONTAINER_COLOR_FIELDS, [
              "box",
              "border",
              "shadow",
            ])}
            {renderTextGroups(CONTAINER_TEXT_FIELDS, ["shadow"])}
            {renderNumberGroups(containerNumberGroups)}
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

        {activePage === "actions" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.actionsSection")}</span>
              </header>
              <div className="theme-parameter-actions">
                <button type="button" onClick={resetCurrentStyleParameters}>
                  {t("ui.themeParameter.resetCurrentStyle")}
                </button>
              </div>
            </section>
          </section>
        ) : null}
      </main>
    </div>
  );
}
