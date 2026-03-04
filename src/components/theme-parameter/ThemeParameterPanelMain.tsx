import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useState } from "react";

import { formatValue } from "./themeParameterUtils";
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
  snapshotMessage: string;
  setSnapshotMessage: Dispatch<SetStateAction<string>>;
  snapshotFileInputRef: MutableRefObject<HTMLInputElement | null>;
  loadSnapshotFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportSnapshotJson: () => void;
  downloadSnapshotJson: () => void;
  openSnapshotFilePicker: () => void;
  copySnapshotJson: () => Promise<void>;
  importSnapshotJson: () => void;
  commonExpanded: boolean;
  setCommonExpanded: Dispatch<SetStateAction<boolean>>;
  styleExpanded: boolean;
  setStyleExpanded: Dispatch<SetStateAction<boolean>>;
  filteredCommonParameters: ThemeParameterDefinition[];
  filteredStyleParameters: ThemeParameterDefinition[];
  styleParameters: ThemeParameterDefinition[];
  containerLayerParameters: ThemeParameterDefinition[];
  largePanelLayerParameters: ThemeParameterDefinition[];
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
  | "buttonStates"
  | "actions";

export type ThemeParameterPreviewMode =
  | "none"
  | "bg-only"
  | "bg-plus-container"
  | "bg-plus-large-panel";

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
  groupId: ThemeDebugNumberGroupId;
}

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

function normalizeHexColor(value: string): string | null {
  const normalized = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (!rgbMatch) {
    return null;
  }
  const [r, g, b] = rgbMatch.slice(1, 4).map((item) =>
    Math.max(0, Math.min(255, Number(item))),
  );
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function readCssColorAsHex(
  computed: CSSStyleDeclaration,
  cssVar: string,
  fallback: string,
): string {
  const raw = computed.getPropertyValue(cssVar).trim();
  return normalizeHexColor(raw) ?? fallback;
}

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
  filteredCommonParameters,
  filteredStyleParameters,
  styleParameters,
  containerLayerParameters,
  largePanelLayerParameters,
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
      id: "buttonStates",
      labelKey: "ui.themeParameter.page.buttonStates",
    },
    { id: "actions", labelKey: "ui.themeParameter.page.actions" },
  ];

  const [debugColorValues, setDebugColorValues] = useState<
    Record<string, string>
  >({});

  const containerNumberGroups = useMemo(() => {
    const groupMap: Record<ThemeDebugNumberGroupId, ThemeParameterDefinition[]> = {
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
    const groupMap: Record<ThemeDebugNumberGroupId, ThemeParameterDefinition[]> = {
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

  useEffect(() => {
    if (activePage !== "containerLayer" && activePage !== "largePanelLayer") {
      return;
    }
    const computed = getComputedStyle(document.documentElement);
    const sourceFields =
      activePage === "containerLayer"
        ? CONTAINER_COLOR_FIELDS
        : LARGE_PANEL_COLOR_FIELDS;
    const nextValues: Record<string, string> = {};
    for (const field of sourceFields) {
      nextValues[field.id] = readCssColorAsHex(
        computed,
        field.cssVar,
        field.fallback,
      );
    }
    setDebugColorValues(nextValues);
  }, [activePage, styleId]);

  const setDebugColorFieldValue = (field: ThemeDebugColorField, raw: string) => {
    setDebugColorValues((previous) => ({ ...previous, [field.id]: raw }));
    const normalized = normalizeHexColor(raw);
    if (!normalized) {
      return;
    }
    document.documentElement.style.setProperty(field.cssVar, normalized);
    setDebugColorValues((previous) => ({
      ...previous,
      [field.id]: normalized,
    }));
  };

  const isColorFieldChanged = (field: ThemeDebugColorField): boolean => {
    return (
      document.documentElement.style.getPropertyValue(field.cssVar).trim().length >
      0
    );
  };

  const resetColorField = (field: ThemeDebugColorField) => {
    const root = document.documentElement;
    root.style.removeProperty(field.cssVar);
    const computed = getComputedStyle(root);
    const nextValue = readCssColorAsHex(computed, field.cssVar, field.fallback);
    setDebugColorValues((previous) => ({
      ...previous,
      [field.id]: nextValue,
    }));
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
        <section key={groupId} className="settings-group theme-parameter-debug-group">
          <header className="settings-group-head">
            <span>{resolveNumberGroupTitle(groupId)}</span>
          </header>
          <div className="theme-parameter-color-list">
            {groupFields.map((field) => {
              const raw = debugColorValues[field.id] ?? field.fallback;
              const pickerValue = normalizeHexColor(raw) ?? field.fallback;
              return (
                <label key={field.id} className="theme-parameter-color-row">
                  <span className="theme-parameter-var-label">{field.cssVar}</span>
                  <div className="theme-parameter-color-control">
                    <input
                      type="color"
                      aria-label={`${field.cssVar}-picker`}
                      value={pickerValue}
                      onChange={(event) =>
                        setDebugColorFieldValue(field, event.target.value)
                      }
                    />
                    <input
                      type="text"
                      aria-label={field.cssVar}
                      value={raw}
                      onChange={(event) =>
                        setDebugColorFieldValue(field, event.target.value)
                      }
                      placeholder={field.fallback}
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
            })}
          </div>
        </section>
      );
    });
  };

  const renderNumberGroups = (groups: ReadonlyArray<{
    id: ThemeDebugNumberGroupId;
    title: string;
    parameters: ThemeParameterDefinition[];
  }>) => {
    return groups.map((group) => (
      <section key={group.id} className="settings-group theme-parameter-debug-group">
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

  const buttonTemplateStates = [
    {
      key: "idle",
      state: "默认态 (idle)",
      styleSource: ".mpx-btn-template (idle)",
      interaction: "初始渲染，未悬停/未按下/未选中",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-image'",
      demoLabel: "默认",
    },
    {
      key: "hover",
      state: "悬停态 (hover)",
      styleSource: ".mpx-btn-template:hover / .force-hover",
      interaction: "pointerenter / mouseenter",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-video'",
      demoLabel: "悬停测试",
    },
    {
      key: "active",
      state: "按下态 (active)",
      styleSource: ".mpx-btn-template:active / .force-active",
      interaction: "pointerdown / mousedown",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-music'",
      demoLabel: "按下测试",
    },
    {
      key: "selected",
      state: "选中态 (is-active)",
      styleSource: ".mpx-btn-template.is-active",
      interaction: "click 后由业务状态切换 class",
      usage: "AppHeader.tsx -> className={mode === 'image' ? 'is-active' : ''}",
      demoLabel: "已选中",
    },
    {
      key: "pressed",
      state: "开关按压态 (aria-pressed='true')",
      styleSource: ".mpx-btn-template[aria-pressed='true']",
      interaction: "click 切换布尔开关状态",
      usage: "AppHeader.tsx -> fg-header-g-debug-tooltips",
      demoLabel: "开关已按下",
    },
    {
      key: "disabled",
      state: "禁用态 (disabled)",
      styleSource: "button:disabled",
      interaction: "组件设置 disabled，阻断点击",
      usage: "MetadataPanel.tsx -> fg-meta-header-g3-search",
      demoLabel: "禁用",
    },
    {
      key: "pending",
      state: "待处理态 (is-pending)",
      styleSource: ".main-icon-square-btn.is-pending",
      interaction: "异步任务期间由业务状态添加 class",
      usage: "ImageMainSection.tsx -> vector-search-btn.is-pending",
      demoLabel: "处理中",
    },
    {
      key: "close-hover",
      state: "危险悬停态 (close:hover)",
      styleSource: ".mpx-btn-template.danger:hover",
      interaction: "关闭按钮 hover",
      usage: "AppHeader.tsx -> window-control-btn--close",
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
            className={activePage === page.id ? "theme-parameter-side-btn is-active" : "theme-parameter-side-btn"}
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
              <summary>{t("ui.themeParameter.sectionStyle", { styleId })}</summary>
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
            {renderColorGroups(CONTAINER_COLOR_FIELDS, ["box", "border"])}
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

        {activePage === "buttonStates" ? (
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t("ui.themeParameter.page.buttonStates")}</span>
              </header>
              <p className="theme-parameter-note-intro">
                以下用于对齐按钮模板抽象时的状态与交互基线，当前仅记录一处代表性使用位置。
              </p>
              <ul className="theme-parameter-note-list">
                {buttonTemplateStates.map((item) => (
                  <li key={item.state}>
                    <div className="theme-parameter-note-title-row">
                      <strong>{item.state}</strong>
                      <div className="theme-parameter-state-demo">
                        {item.key === "pressed" ? (
                          <button
                            aria-pressed="true"
                            className="window-control-btn window-control-btn--theme-parameter"
                            data-slot="fg-header-g-debug-tooltips"
                            type="button"
                          >
                            <span className="window-control-btn-text">
                              {item.demoLabel}
                            </span>
                          </button>
                        ) : item.key === "pending" ? (
                          <button
                            className="feature-action-btn main-icon-square-btn is-pending"
                            type="button"
                          >
                            {item.demoLabel}
                          </button>
                        ) : item.key === "close-hover" ? (
                          <button
                            className="window-control-btn window-control-btn--close danger force-hover"
                            type="button"
                          >
                            <span className="window-control-btn-text">
                              {item.demoLabel}
                            </span>
                          </button>
                        ) : (
                          <div className="mode-switch-wrap theme-parameter-g2-wrap-demo">
                            <div className="mode-switch mpx-btn-group is-groove theme-parameter-g2-mode-demo">
                              <button
                                className={`${item.key === "selected" ? "is-active" : ""} ${item.key === "hover" ? "force-hover" : ""} ${item.key === "active" ? "force-active" : ""}`.trim()}
                                data-slot="fg-header-g2-mode-image"
                                type="button"
                                disabled={item.key === "disabled"}
                              >
                                {item.demoLabel}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
