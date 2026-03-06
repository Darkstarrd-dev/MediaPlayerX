import {
  clampValue,
  normalizeByStep,
  parseBackdropFilter,
  parseFirstNonZeroPxValue,
  parseFirstPercentValue,
  parseFirstPxValueFromShadow,
  parseNumber,
  readCssPxVariable,
  removeVariables,
} from "./themeParameterCore";
import type { StyleGroup } from "./themeParameterCore";

export { resolveStyleGroup } from "./themeParameterCore";

export type ThemeParameterValues = Record<string, number>;

export interface ThemeParameterDefinition {
  id: string;
  labelKey: string;
  labelTokenKeys?: Record<string, string>;
  cssVarName?: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
  unit: "px" | "%" | "" | "deg";
  read: (computed: CSSStyleDeclaration) => number;
  apply: (
    root: HTMLElement,
    value: number,
    values: ThemeParameterValues,
  ) => void;
  reset: (root: HTMLElement) => void;
}

function createCssPxParameter({
  id,
  labelKey,
  variableName,
  min,
  max,
  step,
  fallback,
}: {
  id: string;
  labelKey: string;
  variableName: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
}): ThemeParameterDefinition {
  return {
    id,
    labelKey,
    cssVarName: variableName,
    min,
    max,
    step,
    fallback,
    unit: "px",
    read: (computed) => readCssPxVariable(computed, variableName, fallback),
    apply: (root, value) => {
      root.style.setProperty(variableName, `${value}px`);
    },
    reset: (root) => {
      root.style.removeProperty(variableName);
    },
  };
}

function createCssPercentParameter({
  id,
  labelKey,
  variableName,
  min,
  max,
  step,
  fallback,
  valueSuffix,
}: {
  id: string;
  labelKey: string;
  variableName: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
  valueSuffix: "%" | "vw" | "vh";
}): ThemeParameterDefinition {
  return {
    id,
    labelKey,
    cssVarName: variableName,
    min,
    max,
    step,
    fallback,
    unit: "%",
    read: (computed) => parseNumber(computed.getPropertyValue(variableName).trim(), fallback),
    apply: (root, value) => {
      root.style.setProperty(variableName, `${value}${valueSuffix}`);
    },
    reset: (root) => {
      root.style.removeProperty(variableName);
    },
  };
}

function createCssDegreeParameter({
  id,
  labelKey,
  variableName,
  min,
  max,
  step,
  fallback,
}: {
  id: string;
  labelKey: string;
  variableName: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
}): ThemeParameterDefinition {
  return {
    id,
    labelKey,
    cssVarName: variableName,
    min,
    max,
    step,
    fallback,
    unit: "deg",
    read: (computed) => parseNumber(computed.getPropertyValue(variableName).trim(), fallback),
    apply: (root, value) => {
      root.style.setProperty(variableName, `${value}deg`);
    },
    reset: (root) => {
      root.style.removeProperty(variableName);
    },
  };
}

function createCssNumberParameter({
  id,
  labelKey,
  variableName,
  min,
  max,
  step,
  fallback,
}: {
  id: string;
  labelKey: string;
  variableName: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
}): ThemeParameterDefinition {
  return {
    id,
    labelKey,
    cssVarName: variableName,
    min,
    max,
    step,
    fallback,
    unit: "",
    read: (computed) => parseNumber(computed.getPropertyValue(variableName).trim(), fallback),
    apply: (root, value) => {
      root.style.setProperty(variableName, `${value}`);
    },
    reset: (root) => {
      root.style.removeProperty(variableName);
    },
  };
}

function readFirstUnitValue(
  raw: string,
  unit: "px" | "vw" | "vh" | "%",
  fallback: number,
): number {
  const escapedUnit = unit === "%" ? "%" : unit;
  const pattern = new RegExp(`([\\d.]+)${escapedUnit}`);
  const match = raw.match(pattern);
  if (!match) {
    return fallback;
  }
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type SectionScope = "header" | "sidebar" | "main" | "metadata";
type SectionTarget = "pane" | "control";
type SectionMetric =
  | "elevation"
  | "shadow-strength"
  | "shadow-hardness"
  | "border-contrast"
  | "border-color";

const SECTION_SCOPES: readonly SectionScope[] = [
  "header",
  "sidebar",
  "main",
  "metadata",
];
const SECTION_METRICS: readonly SectionMetric[] = [
  "elevation",
  "shadow-strength",
  "shadow-hardness",
  "border-contrast",
  "border-color",
];

export function resolveParameterLabel(
  parameter: ThemeParameterDefinition,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!parameter.labelTokenKeys) {
    return t(parameter.labelKey);
  }
  const tokenValues = Object.fromEntries(
    Object.entries(parameter.labelTokenKeys).map(([token, key]) => [
      token,
      t(key),
    ]),
  );
  return t(parameter.labelKey, tokenValues);
}

function createSectionMetricId(
  scope: SectionScope,
  target: SectionTarget,
  metric: SectionMetric,
): string {
  return `skeuo-${scope}-${target}-${metric}`;
}

function createSectionMetricStateVariable(
  scope: SectionScope,
  target: SectionTarget,
  metric: SectionMetric,
): string {
  return `--mpx-tp-${scope}-${target}-${metric}`;
}

function getSectionScopeLabelKey(scope: SectionScope): string {
  if (scope === "header") {
    return "ui.themeParameter.scopeHeader";
  }
  if (scope === "sidebar") {
    return "ui.themeParameter.scopeSidebar";
  }
  if (scope === "main") {
    return "ui.themeParameter.scopeMain";
  }
  return "ui.themeParameter.scopeMetadata";
}

function getSectionTargetLabelKey(target: SectionTarget): string {
  return target === "pane"
    ? "ui.themeParameter.targetPane"
    : "ui.themeParameter.targetControl";
}

function getSectionMetricLabelKey(metric: SectionMetric): string {
  if (metric === "elevation") {
    return "ui.themeParameter.metricElevation";
  }
  if (metric === "shadow-strength") {
    return "ui.themeParameter.metricShadowStrength";
  }
  if (metric === "shadow-hardness") {
    return "ui.themeParameter.metricShadowHardness";
  }
  if (metric === "border-contrast") {
    return "ui.themeParameter.metricBorderContrast";
  }
  return "ui.themeParameter.metricBorderColor";
}

function getSectionMetricConfig(
  target: SectionTarget,
  metric: SectionMetric,
): {
  min: number;
  max: number;
  step: number;
  unit: "px" | "%";
} {
  if (metric === "elevation") {
    return target === "pane"
      ? { min: 6, max: 26, step: 1, unit: "px" }
      : { min: 2, max: 14, step: 1, unit: "px" };
  }
  if (metric === "shadow-strength") {
    return { min: 8, max: 48, step: 1, unit: "%" };
  }
  if (metric === "shadow-hardness") {
    return { min: 20, max: 92, step: 1, unit: "%" };
  }
  if (metric === "border-contrast") {
    return { min: 10, max: 50, step: 1, unit: "%" };
  }
  return { min: 0, max: 100, step: 1, unit: "%" };
}

function getSectionMetricFallback(
  scope: SectionScope,
  target: SectionTarget,
  metric: SectionMetric,
): number {
  if (metric === "elevation") {
    if (target === "pane") {
      return scope === "header" ? 15 : 14;
    }
    return scope === "header" ? 4 : 5;
  }
  if (metric === "shadow-strength") {
    return target === "pane" ? 26 : 28;
  }
  if (metric === "shadow-hardness") {
    return target === "pane" ? 58 : 64;
  }
  if (metric === "border-contrast") {
    return target === "pane" ? 24 : 30;
  }
  return target === "pane" ? 32 : 38;
}

function getPaneShadowVariable(scope: SectionScope): string {
  if (scope === "header") {
    return "--mpx-header-shadow";
  }
  if (scope === "sidebar") {
    return "--mpx-sidebar-shadow";
  }
  if (scope === "main") {
    return "--mpx-main-shadow";
  }
  return "--mpx-metadata-shadow";
}

function getPaneBorderColorVariable(scope: SectionScope): string {
  if (scope === "header") {
    return "--mpx-header-border-color";
  }
  if (scope === "sidebar") {
    return "--mpx-sidebar-border-color";
  }
  if (scope === "main") {
    return "--mpx-main-border-color";
  }
  return "--mpx-metadata-border-color";
}

function getControlShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-shadow`;
}

function getControlHoverShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-hover-shadow`;
}

function getControlActiveShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-active-shadow`;
}

function getControlBorderColorVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-border-color`;
}

function getSectionMetricValue(
  values: ThemeParameterValues,
  scope: SectionScope,
  target: SectionTarget,
  metric: SectionMetric,
): number {
  const id = createSectionMetricId(scope, target, metric);
  const fallback = getSectionMetricFallback(scope, target, metric);
  const value = values[id];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildSkeuoBorderColor(contrast: number, tint: number): string {
  const tintMix = clampValue(tint, 0, 100);
  const contrastMix = clampValue(contrast, 10, 50);
  return `color-mix(in srgb, color-mix(in srgb, var(--mpx-palette-accent-raw) ${tintMix}%, var(--mpx-palette-text-raw)) ${contrastMix}%, var(--mpx-palette-surface))`;
}

function applySectionPaneVisual(
  root: HTMLElement,
  scope: SectionScope,
  values: ThemeParameterValues,
): void {
  const elevation = clampValue(
    getSectionMetricValue(values, scope, "pane", "elevation"),
    6,
    26,
  );
  const strength = clampValue(
    getSectionMetricValue(values, scope, "pane", "shadow-strength"),
    8,
    48,
  );
  const hardness = clampValue(
    getSectionMetricValue(values, scope, "pane", "shadow-hardness"),
    20,
    92,
  );
  const borderContrast = clampValue(
    getSectionMetricValue(values, scope, "pane", "border-contrast"),
    10,
    50,
  );
  const borderTint = clampValue(
    getSectionMetricValue(values, scope, "pane", "border-color"),
    0,
    100,
  );

  const hardnessFactor = (110 - hardness) / 100;
  const blur = Math.max(
    8,
    Math.round(elevation * (2.2 * hardnessFactor + 0.42)),
  );
  const shadowColor = `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`;
  const highlightColor = `color-mix(in srgb, var(--mpx-palette-surface) ${clampValue(100 - Math.round(strength * 0.75), 62, 98)}%, #ffffff)`;
  const borderColor = buildSkeuoBorderColor(borderContrast, borderTint);

  root.style.setProperty(
    getPaneShadowVariable(scope),
    `0 ${elevation}px ${blur}px ${shadowColor}, 0 2px ${Math.max(4, Math.round(blur * 0.35))}px color-mix(in srgb, var(--mpx-palette-text-raw) ${Math.max(8, strength - 10)}%, transparent), inset 0 1px 0 ${highlightColor}`,
  );
  root.style.setProperty(getPaneBorderColorVariable(scope), borderColor);
}

function applySectionControlVisual(
  root: HTMLElement,
  scope: SectionScope,
  values: ThemeParameterValues,
): void {
  const elevation = clampValue(
    getSectionMetricValue(values, scope, "control", "elevation"),
    2,
    14,
  );
  const strength = clampValue(
    getSectionMetricValue(values, scope, "control", "shadow-strength"),
    8,
    48,
  );
  const hardness = clampValue(
    getSectionMetricValue(values, scope, "control", "shadow-hardness"),
    20,
    92,
  );
  const borderContrast = clampValue(
    getSectionMetricValue(values, scope, "control", "border-contrast"),
    10,
    50,
  );
  const borderTint = clampValue(
    getSectionMetricValue(values, scope, "control", "border-color"),
    0,
    100,
  );

  const hardnessFactor = (108 - hardness) / 100;
  const blur = Math.max(6, Math.round(elevation * (2 * hardnessFactor + 0.38)));
  const hoverElevation = Math.min(16, elevation + 1);
  const hoverBlur = blur + 3;
  const pressDepth = Math.max(1, Math.round(elevation * 0.7));
  const activeBlur = Math.max(
    2,
    Math.round(pressDepth * (1.8 - hardness / 120)),
  );

  const darkColor = `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`;
  const lightColor = `color-mix(in srgb, var(--mpx-palette-surface) ${clampValue(100 - Math.round(strength * 0.7), 62, 98)}%, #ffffff)`;
  const borderColor = buildSkeuoBorderColor(borderContrast, borderTint);

  const shadow = `${elevation}px ${elevation}px ${blur}px ${darkColor}, -${elevation}px -${elevation}px ${blur}px ${lightColor}`;
  const hoverShadow = `${hoverElevation}px ${hoverElevation}px ${hoverBlur}px ${darkColor}, -${hoverElevation}px -${hoverElevation}px ${hoverBlur}px ${lightColor}`;
  const activeShadow = `inset ${pressDepth}px ${pressDepth}px ${activeBlur * 2}px ${darkColor}, inset -${pressDepth}px -${pressDepth}px ${activeBlur * 2}px ${lightColor}`;

  root.style.setProperty(getControlShadowVariable(scope), shadow);
  root.style.setProperty(getControlHoverShadowVariable(scope), hoverShadow);
  root.style.setProperty(getControlActiveShadowVariable(scope), activeShadow);
  root.style.setProperty(getControlBorderColorVariable(scope), borderColor);

  if (scope === "header") {
    root.style.setProperty("--mpx-header-btn-shadow", shadow);
    root.style.setProperty("--mpx-header-btn-hover-shadow", hoverShadow);
    root.style.setProperty("--mpx-header-btn-active-shadow", activeShadow);
  }
}

function resetSectionTargetVisual(
  root: HTMLElement,
  scope: SectionScope,
  target: SectionTarget,
): void {
  if (target === "pane") {
    removeVariables(root, [
      getPaneShadowVariable(scope),
      getPaneBorderColorVariable(scope),
    ]);
    return;
  }

  const vars = [
    getControlShadowVariable(scope),
    getControlHoverShadowVariable(scope),
    getControlActiveShadowVariable(scope),
    getControlBorderColorVariable(scope),
  ];

  if (scope === "header") {
    vars.push(
      "--mpx-header-btn-shadow",
      "--mpx-header-btn-hover-shadow",
      "--mpx-header-btn-active-shadow",
    );
  }
  removeVariables(root, vars);
}

function createSectionMetricParameter(
  scope: SectionScope,
  target: SectionTarget,
  metric: SectionMetric,
): ThemeParameterDefinition {
  const config = getSectionMetricConfig(target, metric);
  const fallback = getSectionMetricFallback(scope, target, metric);
  const id = createSectionMetricId(scope, target, metric);
  const stateVar = createSectionMetricStateVariable(scope, target, metric);

  return {
    id,
    labelKey: "ui.themeParameter.sectionMetric",
    labelTokenKeys: {
      scope: getSectionScopeLabelKey(scope),
      target: getSectionTargetLabelKey(target),
      metric: getSectionMetricLabelKey(metric),
    },
    min: config.min,
    max: config.max,
    step: config.step,
    fallback,
    unit: config.unit,
    read: (computed) => {
      if (metric === "elevation") {
        if (target === "pane") {
          return parseFirstNonZeroPxValue(
            computed.getPropertyValue(getPaneShadowVariable(scope)).trim(),
            fallback,
          );
        }
        const ownControlShadow = computed
          .getPropertyValue(getControlShadowVariable(scope))
          .trim();
        if (ownControlShadow) {
          return parseFirstNonZeroPxValue(ownControlShadow, fallback);
        }
        if (scope === "header") {
          return parseFirstNonZeroPxValue(
            computed.getPropertyValue("--mpx-header-btn-shadow").trim(),
            fallback,
          );
        }
        return parseFirstNonZeroPxValue(
          computed.getPropertyValue("--mpx-control-shadow").trim(),
          fallback,
        );
      }
      return parseNumber(computed.getPropertyValue(stateVar).trim(), fallback);
    },
    apply: (root, value, values) => {
      root.style.setProperty(stateVar, `${value}`);
      if (target === "pane") {
        applySectionPaneVisual(root, scope, values);
      } else {
        applySectionControlVisual(root, scope, values);
      }
    },
    reset: (root) => {
      root.style.removeProperty(stateVar);
      resetSectionTargetVisual(root, scope, target);
    },
  };
}

const SKEUO_SECTION_PARAMETERS: ThemeParameterDefinition[] = [
  ...SECTION_SCOPES.flatMap((scope) =>
    SECTION_METRICS.map((metric) =>
      createSectionMetricParameter(scope, "pane", metric),
    ),
  ),
  ...SECTION_SCOPES.flatMap((scope) =>
    SECTION_METRICS.map((metric) =>
      createSectionMetricParameter(scope, "control", metric),
    ),
  ),
];

export const COMMON_PARAMETERS: ThemeParameterDefinition[] = [
  createCssPxParameter({
    id: "layout-padding",
    labelKey: "ui.themeParameter.layoutPadding",
    variableName: "--mpx-layout-padding",
    min: 0,
    max: 24,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: "splitter-width",
    labelKey: "ui.themeParameter.splitterWidth",
    variableName: "--mpx-splitter-width",
    min: 4,
    max: 24,
    step: 1,
    fallback: 8,
  }),
  createCssPxParameter({
    id: "panel-radius",
    labelKey: "ui.themeParameter.panelRadius",
    variableName: "--mpx-panel-radius",
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: "header-radius",
    labelKey: "ui.themeParameter.headerRadius",
    variableName: "--mpx-header-radius",
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: "card-radius",
    labelKey: "ui.themeParameter.cardRadius",
    variableName: "--mpx-card-radius",
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "control-radius",
    labelKey: "ui.themeParameter.controlRadius",
    variableName: "--mpx-control-radius",
    min: 0,
    max: 24,
    step: 1,
    fallback: 8,
  }),
  createCssPxParameter({
    id: "panel-border-width",
    labelKey: "ui.themeParameter.panelBorderWidth",
    variableName: "--mpx-panel-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: "control-border-width",
    labelKey: "ui.themeParameter.controlBorderWidth",
    variableName: "--mpx-control-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssDegreeParameter({
    id: "container-frame-fill-angle",
    labelKey: "ui.themeParameter.containerFrameFillAngle",
    variableName: "--mpx-container-frame-fill-angle",
    min: 0,
    max: 360,
    step: 1,
    fallback: 180,
  }),
];

export const CONTAINER_FRAME_PARAMETERS: ThemeParameterDefinition[] = [
  createCssPxParameter({
    id: "sidebar-radius",
    labelKey: "ui.themeParameter.sidebarRadius",
    variableName: "--mpx-sidebar-radius",
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: "main-radius",
    labelKey: "ui.themeParameter.mainRadius",
    variableName: "--mpx-main-radius",
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: "metadata-radius",
    labelKey: "ui.themeParameter.metadataRadius",
    variableName: "--mpx-metadata-radius",
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  ...(["header", "sidebar", "main", "metadata"] as const).flatMap(
    (scope) => {
      const scopeLabel = scope[0].toUpperCase() + scope.slice(1);
      const originYFallback = scope === "header" ? 0 : 50;
      return [
        createCssPxParameter({
          id: `${scope}-frame-translate-x`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameTranslateX`,
          variableName: `--mpx-${scope}-frame-translate-x`,
          min: -240,
          max: 240,
          step: 1,
          fallback: 0,
        }),
        createCssPxParameter({
          id: `${scope}-frame-translate-y`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameTranslateY`,
          variableName: `--mpx-${scope}-frame-translate-y`,
          min: -240,
          max: 240,
          step: 1,
          fallback: 0,
        }),
        createCssDegreeParameter({
          id: `${scope}-frame-rotate-z`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameRotateZ`,
          variableName: `--mpx-${scope}-frame-rotate-z`,
          min: -180,
          max: 180,
          step: 1,
          fallback: 0,
        }),
        createCssNumberParameter({
          id: `${scope}-frame-scale-x`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameScaleX`,
          variableName: `--mpx-${scope}-frame-scale-x`,
          min: -2,
          max: 2,
          step: 0.01,
          fallback: 1,
        }),
        createCssNumberParameter({
          id: `${scope}-frame-scale-y`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameScaleY`,
          variableName: `--mpx-${scope}-frame-scale-y`,
          min: -2,
          max: 2,
          step: 0.01,
          fallback: 1,
        }),
        createCssPercentParameter({
          id: `${scope}-frame-origin-x`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameOriginX`,
          variableName: `--mpx-${scope}-frame-origin-x`,
          min: 0,
          max: 100,
          step: 1,
          fallback: 50,
          valueSuffix: "%",
        }),
        createCssPercentParameter({
          id: `${scope}-frame-origin-y`,
          labelKey: `ui.themeParameter.${scopeLabel}FrameOriginY`,
          variableName: `--mpx-${scope}-frame-origin-y`,
          min: 0,
          max: 100,
          step: 1,
          fallback: originYFallback,
          valueSuffix: "%",
        }),
      ];
    },
  ),
];

export const LARGE_PANEL_PARAMETERS: ThemeParameterDefinition[] = [
  createCssPercentParameter({
    id: "large-panel-width",
    labelKey: "ui.themeParameter.largePanelWidth",
    variableName: "--mpx-large-panel-width",
    min: 50,
    max: 98,
    step: 1,
    fallback: 80,
    valueSuffix: "vw",
  }),
  createCssPercentParameter({
    id: "large-panel-height",
    labelKey: "ui.themeParameter.largePanelHeight",
    variableName: "--mpx-large-panel-height",
    min: 50,
    max: 98,
    step: 1,
    fallback: 80,
    valueSuffix: "vh",
  }),
  createCssPxParameter({
    id: "large-panel-radius",
    labelKey: "ui.themeParameter.largePanelRadius",
    variableName: "--mpx-large-panel-radius",
    min: 0,
    max: 32,
    step: 1,
    fallback: 14,
  }),
  createCssPxParameter({
    id: "large-panel-border-width",
    labelKey: "ui.themeParameter.largePanelBorderWidth",
    variableName: "--mpx-large-panel-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: "large-panel-head-padding-y",
    labelKey: "ui.themeParameter.largePanelHeadPaddingY",
    variableName: "--mpx-large-panel-head-padding-y",
    min: 0,
    max: 28,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-head-padding-x",
    labelKey: "ui.themeParameter.largePanelHeadPaddingX",
    variableName: "--mpx-large-panel-head-padding-x",
    min: 0,
    max: 32,
    step: 1,
    fallback: 14,
  }),
  createCssPxParameter({
    id: "large-panel-head-border-width",
    labelKey: "ui.themeParameter.largePanelHeadBorderWidth",
    variableName: "--mpx-large-panel-head-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: "large-panel-shell-padding",
    labelKey: "ui.themeParameter.largePanelShellPadding",
    variableName: "--mpx-large-panel-shell-padding",
    min: 0,
    max: 28,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-shell-gap",
    labelKey: "ui.themeParameter.largePanelShellGap",
    variableName: "--mpx-large-panel-shell-gap",
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-side-padding",
    labelKey: "ui.themeParameter.largePanelSidePadding",
    variableName: "--mpx-large-panel-side-padding",
    min: 0,
    max: 36,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-side-gap",
    labelKey: "ui.themeParameter.largePanelSideGap",
    variableName: "--mpx-large-panel-side-gap",
    min: 0,
    max: 24,
    step: 1,
    fallback: 8,
  }),
  createCssPxParameter({
    id: "large-panel-side-radius",
    labelKey: "ui.themeParameter.largePanelSideRadius",
    variableName: "--mpx-large-panel-side-radius",
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-side-border-width",
    labelKey: "ui.themeParameter.largePanelSideBorderWidth",
    variableName: "--mpx-large-panel-side-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: "large-panel-main-padding-y",
    labelKey: "ui.themeParameter.largePanelMainPaddingY",
    variableName: "--mpx-large-panel-main-padding-y",
    min: 0,
    max: 36,
    step: 1,
    fallback: 14,
  }),
  createCssPxParameter({
    id: "large-panel-main-padding-x",
    labelKey: "ui.themeParameter.largePanelMainPaddingX",
    variableName: "--mpx-large-panel-main-padding-x",
    min: 0,
    max: 36,
    step: 1,
    fallback: 16,
  }),
  createCssPxParameter({
    id: "large-panel-main-radius",
    labelKey: "ui.themeParameter.largePanelMainRadius",
    variableName: "--mpx-large-panel-main-radius",
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: "large-panel-main-border-width",
    labelKey: "ui.themeParameter.largePanelMainBorderWidth",
    variableName: "--mpx-large-panel-main-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
];

export const SMALL_PANEL_PARAMETERS: ThemeParameterDefinition[] = [
  {
    id: "small-panel-width",
    labelKey: "ui.themeParameter.smallPanelWidth",
    cssVarName: "--mpx-dialog-panel-width",
    min: 280,
    max: 920,
    step: 1,
    fallback: 520,
    unit: "px",
    read: (computed) =>
      readFirstUnitValue(
        computed.getPropertyValue("--mpx-dialog-panel-width").trim(),
        "px",
        520,
      ),
    apply: (root, value, values) => {
      const width = clampValue(value, 280, 920);
      const maxWidth = clampValue(values["small-panel-max-width"] ?? 92, 40, 100);
      root.style.setProperty(
        "--mpx-dialog-panel-width",
        `min(${width}px, ${maxWidth}vw)`,
      );
    },
    reset: (root) => {
      root.style.removeProperty("--mpx-dialog-panel-width");
    },
  },
  {
    id: "small-panel-max-width",
    labelKey: "ui.themeParameter.smallPanelMaxWidth",
    cssVarName: "--mpx-dialog-panel-max-width",
    min: 40,
    max: 100,
    step: 1,
    fallback: 92,
    unit: "%",
    read: (computed) =>
      readFirstUnitValue(
        computed.getPropertyValue("--mpx-dialog-panel-max-width").trim(),
        "vw",
        92,
      ),
    apply: (root, value, values) => {
      const maxWidth = clampValue(value, 40, 100);
      const width = clampValue(values["small-panel-width"] ?? 520, 280, 920);
      root.style.setProperty("--mpx-dialog-panel-max-width", `${maxWidth}vw`);
      root.style.setProperty(
        "--mpx-dialog-panel-width",
        `min(${width}px, ${maxWidth}vw)`,
      );
    },
    reset: (root) => {
      root.style.removeProperty("--mpx-dialog-panel-max-width");
      root.style.removeProperty("--mpx-dialog-panel-width");
    },
  },
  createCssPercentParameter({
    id: "small-panel-max-height",
    labelKey: "ui.themeParameter.smallPanelMaxHeight",
    variableName: "--mpx-dialog-panel-max-height",
    min: 40,
    max: 100,
    step: 1,
    fallback: 80,
    valueSuffix: "vh",
  }),
  createCssPxParameter({
    id: "small-panel-border-width",
    labelKey: "ui.themeParameter.smallPanelBorderWidth",
    variableName: "--mpx-dialog-panel-border-width",
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: "small-panel-radius",
    labelKey: "ui.themeParameter.smallPanelRadius",
    variableName: "--mpx-dialog-panel-radius",
    min: 0,
    max: 24,
    step: 1,
    fallback: 12,
  }),
  createCssPxParameter({
    id: "small-panel-padding",
    labelKey: "ui.themeParameter.smallPanelPadding",
    variableName: "--mpx-dialog-panel-padding",
    min: 0,
    max: 28,
    step: 1,
    fallback: 14,
  }),
  createCssPxParameter({
    id: "small-panel-gap",
    labelKey: "ui.themeParameter.smallPanelGap",
    variableName: "--mpx-dialog-panel-gap",
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
];

export const EMPTY_PARAMETERS: ThemeParameterDefinition[] = [];

export const STYLE_PARAMETERS: Record<
  Exclude<StyleGroup, "default">,
  ThemeParameterDefinition[]
> = {
  "soft-skeuomorphic": [
    createCssPxParameter({
      id: "skeuo-panel-padding",
      labelKey: "ui.themeParameter.panelPadding",
      variableName: "--mpx-panel-padding",
      min: 6,
      max: 24,
      step: 1,
      fallback: 12,
    }),
    createCssPxParameter({
      id: "skeuo-header-btn-size",
      labelKey: "ui.themeParameter.headerButtonSize",
      variableName: "--mpx-header-btn-size",
      min: 30,
      max: 56,
      step: 1,
      fallback: 40,
    }),
    createCssPxParameter({
      id: "skeuo-header-btn-radius",
      labelKey: "ui.themeParameter.headerButtonRadius",
      variableName: "--mpx-header-btn-radius",
      min: 6,
      max: 22,
      step: 1,
      fallback: 12,
    }),
    createCssPxParameter({
      id: "skeuo-header-group-gap",
      labelKey: "ui.themeParameter.headerGroupGap",
      variableName: "--mpx-header-group-gap",
      min: 8,
      max: 36,
      step: 1,
      fallback: 22,
    }),
    createCssPxParameter({
      id: "skeuo-header-item-gap",
      labelKey: "ui.themeParameter.headerItemGap",
      variableName: "--mpx-header-item-gap",
      min: 4,
      max: 18,
      step: 1,
      fallback: 8,
    }),
    ...SKEUO_SECTION_PARAMETERS,
    {
      id: "skeuo-pane-elevation",
      labelKey: "ui.themeParameter.skeuoPaneElevation",
      min: 8,
      max: 24,
      step: 1,
      fallback: 14,
      unit: "px",
      read: (computed) => {
        return parseFirstNonZeroPxValue(
          computed.getPropertyValue("--mpx-panel-shadow").trim(),
          14,
        );
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 8, 24);
        const panelBlur = Math.max(12, Math.round(elevation * 2.1));
        const headerElevation = elevation + 1;
        const headerBlur = Math.max(14, Math.round(elevation * 2.3));
        root.style.setProperty(
          "--mpx-panel-shadow",
          `0 ${elevation}px ${panelBlur}px var(--mpx-skeuo-shadow-dark), 0 2px 6px color-mix(in srgb, var(--mpx-palette-text-raw) 14%, transparent), inset 0 1px 0 color-mix(in srgb, var(--mpx-palette-surface) 96%, #ffffff)`,
        );
        root.style.setProperty("--mpx-main-shadow", "var(--mpx-panel-shadow)");
        root.style.setProperty(
          "--mpx-sidebar-shadow",
          "var(--mpx-panel-shadow)",
        );
        root.style.setProperty(
          "--mpx-metadata-shadow",
          "var(--mpx-panel-shadow)",
        );
        root.style.setProperty(
          "--mpx-header-shadow",
          `0 ${headerElevation}px ${headerBlur}px var(--mpx-skeuo-shadow-dark), 0 2px 6px color-mix(in srgb, var(--mpx-palette-text-raw) 16%, transparent), inset 0 1px 0 color-mix(in srgb, var(--mpx-palette-surface) 97%, #ffffff)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-shadow",
          "--mpx-main-shadow",
          "--mpx-sidebar-shadow",
          "--mpx-metadata-shadow",
          "--mpx-header-shadow",
        ]);
      },
    },
    {
      id: "header-floating-gap",
      labelKey: "ui.themeParameter.headerFloatingGap",
      min: 8,
      max: 20,
      step: 1,
      fallback: 12,
      unit: "px",
      read: (computed) => {
        const raw = computed
          .getPropertyValue("--mpx-header-floating-gap")
          .trim();
        return parseFirstPxValueFromShadow(raw, 12);
      },
      apply: (root, value) => {
        const gap = clampValue(value, 8, 20);
        root.style.setProperty(
          "--mpx-header-floating-gap",
          `${gap}px ${gap}px 0px`,
        );
      },
      reset: (root) => {
        removeVariables(root, ["--mpx-header-floating-gap"]);
      },
    },
    {
      id: "skeuo-container-elevation",
      labelKey: "ui.themeParameter.skeuoContainerElevation",
      min: 4,
      max: 18,
      step: 1,
      fallback: 9,
      unit: "px",
      read: (computed) => {
        return parseFirstNonZeroPxValue(
          computed.getPropertyValue("--mpx-card-shadow").trim(),
          9,
        );
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 4, 18);
        const blur = Math.max(8, Math.round(elevation * 2.1));
        const lightLift = Math.max(2, Math.round(elevation * 0.35));
        root.style.setProperty(
          "--mpx-card-shadow",
          `0 ${elevation}px ${blur}px var(--mpx-skeuo-shadow-dark), -${lightLift}px -${lightLift}px ${Math.max(6, blur - 4)}px var(--mpx-skeuo-shadow-light)`,
        );
      },
      reset: (root) => {
        removeVariables(root, ["--mpx-card-shadow"]);
      },
    },
    {
      id: "skeuo-control-elevation",
      labelKey: "ui.themeParameter.skeuoControlElevation",
      min: 3,
      max: 12,
      step: 1,
      fallback: 4,
      unit: "px",
      read: (computed) => {
        return parseFirstNonZeroPxValue(
          computed.getPropertyValue("--mpx-control-shadow").trim(),
          4,
        );
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 3, 12);
        const hover = elevation + 1;
        const active = Math.max(2, elevation - 1);
        const blur = Math.max(7, Math.round(elevation * 2.1));
        root.style.setProperty(
          "--mpx-control-shadow",
          `${elevation}px ${elevation}px ${blur}px var(--mpx-skeuo-shadow-dark), -${elevation}px -${elevation}px ${blur}px var(--mpx-skeuo-shadow-light)`,
        );
        root.style.setProperty(
          "--mpx-control-hover-shadow",
          `${hover}px ${hover}px ${blur + 3}px var(--mpx-skeuo-shadow-dark), -${hover}px -${hover}px ${blur + 3}px var(--mpx-skeuo-shadow-light)`,
        );
        root.style.setProperty(
          "--mpx-control-active-shadow",
          `inset ${active}px ${active}px ${active * 2}px var(--mpx-skeuo-shadow-dark), inset -${active}px -${active}px ${active * 2}px var(--mpx-skeuo-shadow-light)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-control-shadow",
          "--mpx-control-hover-shadow",
          "--mpx-control-active-shadow",
        ]);
      },
    },
    {
      id: "skeuo-border-contrast",
      labelKey: "ui.themeParameter.skeuoBorderContrast",
      min: 14,
      max: 44,
      step: 1,
      fallback: 22,
      unit: "%",
      read: (computed) => {
        return parseFirstPercentValue(
          computed.getPropertyValue("--mpx-skeuo-border-contrast").trim(),
          22,
        );
      },
      apply: (root, value) => {
        const contrast = clampValue(value, 14, 44);
        const accentContrast = clampValue(contrast + 8, 20, 56);
        root.style.setProperty("--mpx-skeuo-border-contrast", `${contrast}%`);
        root.style.setProperty(
          "--mpx-border-1",
          `color-mix(in srgb, var(--mpx-palette-text-raw) ${contrast}%, var(--mpx-palette-surface))`,
        );
        root.style.setProperty(
          "--mpx-border-2",
          `color-mix(in srgb, var(--mpx-palette-accent-raw) ${accentContrast}%, var(--mpx-palette-surface))`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-skeuo-border-contrast",
          "--mpx-border-1",
          "--mpx-border-2",
        ]);
      },
    },
    {
      id: "skeuo-shadow-strength",
      labelKey: "ui.themeParameter.skeuoShadowStrength",
      min: 8,
      max: 40,
      step: 1,
      fallback: 18,
      unit: "%",
      read: (computed) => {
        return parseFirstPercentValue(
          computed.getPropertyValue("--mpx-control-shadow").trim(),
          18,
        );
      },
      apply: (root, value) => {
        const strength = clampValue(value, 8, 40);
        const lightStrength = clampValue(
          100 - Math.round(strength * 0.8),
          64,
          95,
        );
        root.style.setProperty(
          "--mpx-skeuo-shadow-dark",
          `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-skeuo-shadow-light",
          `color-mix(in srgb, var(--mpx-palette-surface) ${lightStrength}%, var(--mpx-bg-elevated))`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-skeuo-shadow-dark",
          "--mpx-skeuo-shadow-light",
        ]);
      },
    },
    {
      id: "skeuo-press-depth",
      labelKey: "ui.themeParameter.skeuoPressDepth",
      min: 1,
      max: 10,
      step: 1,
      fallback: 3,
      unit: "px",
      read: (computed) => {
        return parseFirstPxValueFromShadow(
          computed.getPropertyValue("--mpx-header-btn-active-shadow").trim(),
          3,
        );
      },
      apply: (root, value) => {
        const depth = clampValue(value, 1, 10);
        root.style.setProperty(
          "--mpx-header-btn-active-shadow",
          `inset ${depth}px ${depth}px ${depth * 2}px var(--mpx-skeuo-shadow-dark), inset -${depth}px -${depth}px ${depth * 2}px var(--mpx-skeuo-shadow-light)`,
        );
        root.style.setProperty(
          "--mpx-control-active-shadow",
          `inset ${depth}px ${depth}px ${depth * 2}px color-mix(in srgb, var(--mpx-palette-text-raw) 16%, transparent), inset -${depth}px -${depth}px ${depth * 2}px color-mix(in srgb, var(--mpx-palette-surface) 88%, var(--mpx-bg-elevated))`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-header-btn-active-shadow",
          "--mpx-control-active-shadow",
        ]);
      },
    },
  ],
  "liquid-glass": [
    {
      id: "liquid-glass-blur",
      labelKey: "ui.themeParameter.glassBlur",
      min: 6,
      max: 36,
      step: 1,
      fallback: 20,
      unit: "px",
      read: (computed) => {
        const parsed = parseBackdropFilter(
          computed.getPropertyValue("--mpx-panel-backdrop-filter"),
        );
        return parsed?.blur ?? 20;
      },
      apply: (root, value, values) => {
        const blur = clampValue(value, 6, 36);
        const saturation = clampValue(
          values["liquid-glass-saturation"] ?? 170,
          100,
          240,
        );
        const nextFilter = `blur(${blur}px) saturate(${saturation}%)`;
        root.style.setProperty("--mpx-panel-backdrop-filter", nextFilter);
        root.style.setProperty("--mpx-header-backdrop-filter", nextFilter);
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-backdrop-filter",
          "--mpx-header-backdrop-filter",
        ]);
      },
    },
    {
      id: "liquid-glass-saturation",
      labelKey: "ui.themeParameter.glassSaturation",
      min: 100,
      max: 240,
      step: 5,
      fallback: 170,
      unit: "%",
      read: (computed) => {
        const parsed = parseBackdropFilter(
          computed.getPropertyValue("--mpx-panel-backdrop-filter"),
        );
        return parsed?.saturation ?? 170;
      },
      apply: (root, value, values) => {
        const blur = clampValue(values["liquid-glass-blur"] ?? 20, 6, 36);
        const saturation = clampValue(value, 100, 240);
        const nextFilter = `blur(${blur}px) saturate(${saturation}%)`;
        root.style.setProperty("--mpx-panel-backdrop-filter", nextFilter);
        root.style.setProperty("--mpx-header-backdrop-filter", nextFilter);
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-backdrop-filter",
          "--mpx-header-backdrop-filter",
        ]);
      },
    },
    {
      id: "liquid-glass-surface-opacity",
      labelKey: "ui.themeParameter.glassSurfaceOpacity",
      min: 40,
      max: 90,
      step: 1,
      fallback: 56,
      unit: "%",
      read: (computed) => {
        return parseFirstPercentValue(
          computed.getPropertyValue("--mpx-bg-panel").trim(),
          56,
        );
      },
      apply: (root, value) => {
        const panelOpacity = clampValue(value, 40, 90);
        const elevatedOpacity = clampValue(panelOpacity + 14, 54, 96);
        const shellOpacity = clampValue(panelOpacity + 2, 42, 92);
        root.style.setProperty(
          "--mpx-bg-panel",
          `color-mix(in srgb, var(--mpx-palette-surface) ${panelOpacity}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-bg-elevated",
          `color-mix(in srgb, var(--mpx-palette-surface) ${elevatedOpacity}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-sidebar-bg",
          `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-main-bg",
          `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 4}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-metadata-bg",
          `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 2}%, transparent)`,
        );
        root.style.setProperty(
          "--mpx-header-bg",
          `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 1}%, transparent)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-bg-panel",
          "--mpx-bg-elevated",
          "--mpx-sidebar-bg",
          "--mpx-main-bg",
          "--mpx-metadata-bg",
          "--mpx-header-bg",
        ]);
      },
    },
    {
      id: "liquid-glass-control-depth",
      labelKey: "ui.themeParameter.glassControlDepth",
      min: 4,
      max: 28,
      step: 1,
      fallback: 14,
      unit: "px",
      read: (computed) => {
        return parseFirstPxValueFromShadow(
          computed.getPropertyValue("--mpx-control-shadow").trim(),
          14,
        );
      },
      apply: (root, value) => {
        const depth = clampValue(value, 4, 28);
        root.style.setProperty(
          "--mpx-control-shadow",
          `0 ${Math.round(depth * 0.45)}px ${depth}px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-control-hover-shadow",
          `0 ${Math.round(depth * 0.7)}px ${Math.round(depth * 1.7)}px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-control-active-shadow",
          `0 ${Math.max(2, Math.round(depth * 0.3))}px ${Math.max(6, Math.round(depth * 0.75))}px var(--mpx-palette-shadow-color)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-control-shadow",
          "--mpx-control-hover-shadow",
          "--mpx-control-active-shadow",
        ]);
      },
    },
  ],
  neobrutalism: [
    {
      id: "neobrutalism-shadow-offset",
      labelKey: "ui.themeParameter.shadowOffset",
      min: 1,
      max: 12,
      step: 1,
      fallback: 4,
      unit: "px",
      read: (computed) => {
        const raw = computed.getPropertyValue("--mpx-panel-shadow").trim();
        const match = raw.match(/([-\d.]+)px\s+([-\d.]+)px/i);
        if (!match) {
          return 4;
        }
        const offset = Number.parseFloat(match[1]);
        return Number.isFinite(offset) ? Math.abs(offset) : 4;
      },
      apply: (root, value) => {
        const offset = clampValue(value, 1, 12);
        const cardOffset = Math.max(1, offset - 1);
        const controlOffset = Math.max(1, offset - 2);
        const hoverOffset = offset + 1;
        root.style.setProperty(
          "--mpx-panel-shadow",
          `${offset}px ${offset}px 0px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-header-shadow",
          `${offset}px ${offset}px 0px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-card-shadow",
          `${cardOffset}px ${cardOffset}px 0px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-control-shadow",
          `${controlOffset}px ${controlOffset}px 0px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-control-hover-shadow",
          `${hoverOffset}px ${hoverOffset}px 0px var(--mpx-palette-shadow-color)`,
        );
        root.style.setProperty(
          "--mpx-control-active-shadow",
          `${controlOffset}px ${controlOffset}px 0px var(--mpx-palette-shadow-color)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-shadow",
          "--mpx-header-shadow",
          "--mpx-card-shadow",
          "--mpx-control-shadow",
          "--mpx-control-hover-shadow",
          "--mpx-control-active-shadow",
        ]);
      },
    },
    {
      id: "neobrutalism-hover-shift",
      labelKey: "ui.themeParameter.controlHoverOffset",
      min: 0,
      max: 6,
      step: 1,
      fallback: 2,
      unit: "px",
      read: (computed) => {
        const raw = computed
          .getPropertyValue("--mpx-control-hover-transform")
          .trim();
        const match = raw.match(
          /translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/i,
        );
        if (!match) {
          return 2;
        }
        const x = Number.parseFloat(match[1]);
        return Number.isFinite(x) ? Math.abs(x) : 2;
      },
      apply: (root, value) => {
        const offset = clampValue(value, 0, 6);
        const activeOffset = Math.max(0, Math.floor(offset / 2));
        root.style.setProperty(
          "--mpx-control-hover-transform",
          `translate(-${offset}px, -${offset}px)`,
        );
        root.style.setProperty(
          "--mpx-control-active-transform",
          `translate(${activeOffset}px, ${activeOffset}px)`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-control-hover-transform",
          "--mpx-control-active-transform",
        ]);
      },
    },
    {
      id: "neobrutalism-border-width",
      labelKey: "ui.themeParameter.brutalBorderWidth",
      min: 1,
      max: 6,
      step: 1,
      fallback: 3,
      unit: "px",
      read: (computed) => {
        return readCssPxVariable(computed, "--mpx-panel-border-width", 3);
      },
      apply: (root, value) => {
        const width = clampValue(value, 1, 6);
        root.style.setProperty("--mpx-panel-border-width", `${width}px`);
        root.style.setProperty("--mpx-header-border-width", `${width}px`);
        root.style.setProperty(
          "--mpx-card-border-width",
          `${Math.max(1, width - 1)}px`,
        );
        root.style.setProperty(
          "--mpx-control-border-width",
          `${Math.max(1, width - 1)}px`,
        );
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-border-width",
          "--mpx-header-border-width",
          "--mpx-card-border-width",
          "--mpx-control-border-width",
        ]);
      },
    },
    {
      id: "neobrutalism-corner-radius",
      labelKey: "ui.themeParameter.brutalCornerRadius",
      min: 0,
      max: 8,
      step: 1,
      fallback: 2,
      unit: "px",
      read: (computed) => {
        return readCssPxVariable(computed, "--mpx-panel-radius", 2);
      },
      apply: (root, value) => {
        const radius = clampValue(value, 0, 8);
        root.style.setProperty("--mpx-panel-radius", `${radius}px`);
        root.style.setProperty("--mpx-header-radius", `${radius}px`);
        root.style.setProperty("--mpx-card-radius", `${radius}px`);
        root.style.setProperty("--mpx-control-radius", `${radius}px`);
      },
      reset: (root) => {
        removeVariables(root, [
          "--mpx-panel-radius",
          "--mpx-header-radius",
          "--mpx-card-radius",
          "--mpx-control-radius",
        ]);
      },
    },
  ],
};

export function readParameterValues(
  parameters: ThemeParameterDefinition[],
): ThemeParameterValues {
  const computed = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    parameters.map((parameter) => {
      const value = normalizeByStep(
        parameter.read(computed),
        parameter.min,
        parameter.max,
        parameter.step,
      );
      return [parameter.id, value];
    }),
  );
}
