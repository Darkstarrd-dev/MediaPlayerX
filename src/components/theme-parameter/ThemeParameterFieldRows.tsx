import { useMemo, type ReactNode } from "react";

import { resolveDebugVarUsage } from "./themeParameterPanelCatalog";
import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";
import {
  formatBoxShadowValue,
  formatSimpleFilterFunction,
  formatSimpleLinearGradient,
  formatValue,
  parseBoxShadowValue,
  parseColorState,
  parseSimpleFilterFunction,
  parseSimpleLinearGradient,
  type BoxShadowLayerValue,
  type ColorState,
  type SimpleFilterFunctionValue,
  type SimpleLinearGradientValue,
} from "./themeParameterUtils";
import type {
  ThemeDebugColorField,
  ThemeDebugTextField,
} from "./themeParameterPanelTypes";

export function ThemeParameterVarLabel({ cssVar }: { cssVar: string }) {
  const usage = resolveDebugVarUsage(cssVar);
  return (
    <span className="theme-parameter-var-label">
      {cssVar}
      {usage ? (
        <span className="theme-parameter-var-usage"> {usage}</span>
      ) : null}
    </span>
  );
}

export function ThemeParameterColorFieldRow(props: {
  field: ThemeDebugColorField;
  colorState: ColorState;
  isChanged: boolean;
  onHexChange: (field: ThemeDebugColorField, rawHex: string) => void;
  onAlphaChange: (field: ThemeDebugColorField, rawAlphaPercent: number) => void;
  onReset: (field: ThemeDebugColorField) => void;
  resetLabel: string;
}) {
  const {
    field,
    colorState,
    isChanged,
    onHexChange,
    onAlphaChange,
    onReset,
    resetLabel,
  } = props;
  const alphaPercent = Math.round(colorState.alpha * 100);
  return (
    <label key={field.id} className="theme-parameter-color-row">
      <ThemeParameterVarLabel cssVar={field.cssVar} />
      <div className="theme-parameter-color-control">
        <input
          type="color"
          aria-label={`${field.cssVar}-picker`}
          value={colorState.hex}
          onChange={(event) => onHexChange(field, event.target.value)}
        />
        <input
          type="text"
          aria-label={field.cssVar}
          value={colorState.hex}
          onChange={(event) => onHexChange(field, event.target.value)}
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
          onChange={(event) => onAlphaChange(field, Number(event.target.value))}
        />
        {isChanged ? (
          <button
            type="button"
            className="theme-parameter-reset-btn"
            onClick={() => onReset(field)}
          >
            {resetLabel}
          </button>
        ) : null}
      </div>
    </label>
  );
}

function ColorExpressionInput(props: {
  ariaLabel: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const { ariaLabel, value, onChange } = props;
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
}

function BasicColorShortcut(props: {
  field: ThemeDebugTextField;
  raw: string;
  onChange: (nextRaw: string) => void;
}) {
  const { field, raw, onChange } = props;
  if (field.cssVar !== "--mpx-bg-app-fill") {
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
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          aria-label={`${field.cssVar}-solid`}
          value={parsedSolidColor.hex}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function ResetFieldButton(props: {
  visible: boolean;
  onReset: () => void;
  resetLabel: string;
}) {
  const { visible, onReset, resetLabel } = props;
  return visible ? (
    <button
      type="button"
      className="theme-parameter-reset-btn"
      onClick={onReset}
    >
      {resetLabel}
    </button>
  ) : null;
}

type NumericCssUnit = "" | "px" | "deg" | "%";

interface NumericCssValue {
  value: number;
  unit: NumericCssUnit;
}

interface NumericCssFieldModel {
  value: number;
  unit: NumericCssUnit;
  min: number;
  max: number;
  step: number;
}

function parseNumericCssValue(raw: string): NumericCssValue | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(-?(?:\d+|\d*\.\d+))(px|deg|%)?$/i);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }
  const unit = (match[2]?.toLowerCase() ?? "") as NumericCssUnit;
  return {
    value,
    unit,
  };
}

function resolveNumericCssRange(
  unit: NumericCssUnit,
  baseValue: number,
): { min: number; max: number; step: number } {
  const absBase = Math.abs(baseValue);
  if (unit === "deg") {
    return { min: -360, max: 360, step: 1 };
  }
  if (unit === "%") {
    return { min: 0, max: Math.max(100, Math.ceil(absBase * 2)), step: 1 };
  }
  if (unit === "px") {
    const max =
      absBase <= 8
        ? 32
        : absBase <= 24
          ? 64
          : absBase <= 64
            ? 160
            : absBase <= 160
              ? 320
              : Math.ceil(absBase * 2);
    const hasDecimal = !Number.isInteger(baseValue);
    return {
      min: 0,
      max,
      step: hasDecimal ? 0.1 : 1,
    };
  }
  const max =
    absBase <= 2
      ? 3
      : absBase <= 10
        ? 20
        : absBase <= 100
          ? 200
          : Math.ceil(Math.max(absBase * 2, 2000));
  const step = max <= 3 ? 0.01 : max <= 20 ? 0.1 : 1;
  return {
    min: 0,
    max,
    step,
  };
}

function precisionFromStep(step: number): number {
  if (step >= 1) {
    return 0;
  }
  const stepText = step.toString();
  const dotIndex = stepText.indexOf(".");
  if (dotIndex === -1) {
    return 0;
  }
  return stepText.length - dotIndex - 1;
}

function formatNumericCssValue(
  value: number,
  step: number,
  unit: NumericCssUnit,
): string {
  const precision = precisionFromStep(step);
  const normalized = Number(value.toFixed(precision));
  return `${normalized}${unit}`;
}

function resolveNumericCssFieldModel(
  field: ThemeDebugTextField,
  raw: string,
): NumericCssFieldModel | null {
  const fallbackNumeric = parseNumericCssValue(field.fallback);
  if (!fallbackNumeric) {
    return null;
  }
  const rawNumeric = parseNumericCssValue(raw);
  const unit = fallbackNumeric.unit;
  const currentValue =
    rawNumeric && (rawNumeric.unit === unit || rawNumeric.unit === "")
      ? rawNumeric.value
      : fallbackNumeric.value;
  const range = resolveNumericCssRange(unit, currentValue);
  const value = Math.max(range.min, Math.min(range.max, currentValue));
  return {
    value,
    unit,
    min: range.min,
    max: range.max,
    step: range.step,
  };
}

function renderNumericCssFieldRow(props: {
  field: ThemeDebugTextField;
  raw: string;
  isChanged: boolean;
  onChange: (field: ThemeDebugTextField, raw: string) => void;
  onReset: (field: ThemeDebugTextField) => void;
  resetLabel: string;
}) {
  const { field, raw, isChanged, onChange, onReset, resetLabel } = props;
  const model = resolveNumericCssFieldModel(field, raw);
  if (!model) {
    return null;
  }

  const applyNumericValue = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) {
      return;
    }
    const bounded = Math.max(model.min, Math.min(model.max, nextValue));
    onChange(field, formatNumericCssValue(bounded, model.step, model.unit));
  };

  return (
    <div key={field.id} className="theme-parameter-row theme-parameter-text-row">
      <ThemeParameterVarLabel cssVar={field.cssVar} />
      <div className="theme-parameter-control">
        <input
          type="range"
          min={model.min}
          max={model.max}
          step={model.step}
          value={model.value}
          onChange={(event) => applyNumericValue(Number(event.target.value))}
        />
        <input
          className="theme-parameter-number-input"
          type="number"
          aria-label={field.cssVar}
          min={model.min}
          max={model.max}
          step={model.step}
          value={model.value}
          onChange={(event) => applyNumericValue(Number(event.target.value))}
        />
        <code className="theme-parameter-value-text">
          {`${formatValue(model.value, model.step)}${model.unit}`}
        </code>
        <ResetFieldButton
          visible={isChanged}
          onReset={() => onReset(field)}
          resetLabel={resetLabel}
        />
      </div>
    </div>
  );
}

export function ThemeParameterTextFieldRow(props: {
  field: ThemeDebugTextField;
  raw: string;
  isChanged: boolean;
  onChange: (field: ThemeDebugTextField, raw: string) => void;
  onReset: (field: ThemeDebugTextField) => void;
  resetLabel: string;
}) {
  const { field, raw, isChanged, onChange, onReset, resetLabel } = props;
  const parsedGradient = parseSimpleLinearGradient(raw);
  const parsedFilter = parseSimpleFilterFunction(raw);
  const parsedShadow = parseBoxShadowValue(raw);
  const updateTextValue = (nextRaw: string) => {
    onChange(field, nextRaw);
  };

  if (parsedGradient) {
    const updateGradient = (nextValue: SimpleLinearGradientValue) => {
      updateTextValue(formatSimpleLinearGradient(nextValue));
    };

    return (
      <div key={field.id} className="theme-parameter-text-row is-structured">
        <ThemeParameterVarLabel cssVar={field.cssVar} />
        <div className="theme-parameter-structured-card">
          <BasicColorShortcut
            field={field}
            raw={raw}
            onChange={updateTextValue}
          />
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
                  updateGradient({ ...parsedGradient, angle: nextAngle });
                }}
              />
            </label>
            <label className="theme-parameter-inline-field">
              <span>颜色 1</span>
              <ColorExpressionInput
                ariaLabel={`${field.cssVar}-color-1`}
                value={parsedGradient.colorStops[0]}
                onChange={(nextColor) => {
                  updateGradient({
                    ...parsedGradient,
                    colorStops: [nextColor, parsedGradient.colorStops[1]],
                  });
                }}
              />
            </label>
            <label className="theme-parameter-inline-field">
              <span>颜色 2</span>
              <ColorExpressionInput
                ariaLabel={`${field.cssVar}-color-2`}
                value={parsedGradient.colorStops[1]}
                onChange={(nextColor) => {
                  updateGradient({
                    ...parsedGradient,
                    colorStops: [parsedGradient.colorStops[0], nextColor],
                  });
                }}
              />
            </label>
          </div>
        </div>
        <ResetFieldButton
          visible={isChanged}
          onReset={() => onReset(field)}
          resetLabel={resetLabel}
        />
      </div>
    );
  }

  if (parsedFilter) {
    const updateFilter = (nextValue: SimpleFilterFunctionValue) => {
      updateTextValue(formatSimpleFilterFunction(nextValue));
    };

    return (
      <div key={field.id} className="theme-parameter-text-row is-structured">
        <ThemeParameterVarLabel cssVar={field.cssVar} />
        <div className="theme-parameter-structured-card">
          <div className="theme-parameter-structured-grid is-filter">
            <label className="theme-parameter-inline-field">
              <span>函数</span>
              <input
                type="text"
                aria-label={`${field.cssVar}-fn`}
                value={parsedFilter.name}
                onChange={(event) => {
                  updateFilter({ ...parsedFilter, name: event.target.value });
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
                  updateFilter({ ...parsedFilter, unit: event.target.value });
                }}
              />
            </label>
          </div>
        </div>
        <ResetFieldButton
          visible={isChanged}
          onReset={() => onReset(field)}
          resetLabel={resetLabel}
        />
      </div>
    );
  }

  if (parsedShadow) {
    const updateShadowLayers = (nextLayers: BoxShadowLayerValue[]) => {
      updateTextValue(formatBoxShadowValue(nextLayers));
    };

    return (
      <div key={field.id} className="theme-parameter-text-row is-structured">
        <ThemeParameterVarLabel cssVar={field.cssVar} />
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
                              ? { ...currentLayer, inset: event.target.checked }
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
                  <ColorExpressionInput
                    ariaLabel={`${field.cssVar}-layer-${layerIndex}-color`}
                    value={layer.color}
                    onChange={(nextColor) => {
                      const nextLayers = parsedShadow.map(
                        (currentLayer, currentIndex) =>
                          currentIndex === layerIndex
                            ? { ...currentLayer, color: nextColor }
                            : currentLayer,
                      );
                      updateShadowLayers(nextLayers);
                    }}
                  />
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
        <ResetFieldButton
          visible={isChanged}
          onReset={() => onReset(field)}
          resetLabel={resetLabel}
        />
      </div>
    );
  }

  const numericRow = renderNumericCssFieldRow({
    field,
    raw,
    isChanged,
    onChange,
    onReset,
    resetLabel,
  });
  if (numericRow) {
    return numericRow;
  }

  return (
    <label key={field.id} className="theme-parameter-text-row">
      <ThemeParameterVarLabel cssVar={field.cssVar} />
      <BasicColorShortcut field={field} raw={raw} onChange={updateTextValue} />
      <textarea
        aria-label={field.cssVar}
        className="theme-parameter-textarea"
        value={raw}
        onChange={(event) => onChange(field, event.target.value)}
      />
      <ResetFieldButton
        visible={isChanged}
        onReset={() => onReset(field)}
        resetLabel={resetLabel}
      />
    </label>
  );
}

export function ThemeParameterCommonControlTextFieldRow(props: {
  field: ThemeDebugTextField;
  raw: string;
  isChanged: boolean;
  onChange: (field: ThemeDebugTextField, raw: string) => void;
  onReset: (field: ThemeDebugTextField) => void;
  resetLabel: string;
}) {
  const { field, raw, isChanged, onChange, onReset, resetLabel } = props;
  const numericRow = renderNumericCssFieldRow({
    field,
    raw,
    isChanged,
    onChange,
    onReset,
    resetLabel,
  });
  if (numericRow) {
    return numericRow;
  }
  return (
    <label key={field.id} className="theme-parameter-text-row">
      <ThemeParameterVarLabel cssVar={field.cssVar} />
      <textarea
        aria-label={field.cssVar}
        className="theme-parameter-textarea"
        value={raw}
        onChange={(event) => onChange(field, event.target.value)}
      />
      <ResetFieldButton
        visible={isChanged}
        onReset={() => onReset(field)}
        resetLabel={resetLabel}
      />
    </label>
  );
}

interface DebugSectionDefinition {
  id: string;
  title: string;
  tag: string;
  cssVars: readonly string[];
}

interface DebugLayerDefinition {
  id: string;
  title: string;
  sections: readonly DebugSectionDefinition[];
}

export function ThemeParameterDebugSectionList(props: {
  sections: readonly DebugSectionDefinition[];
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
}) {
  const {
    sections,
    colorFields,
    textFields,
    renderColorFieldRow,
    renderTextFieldRow,
  } = props;
  const colorFieldMap = useMemo(
    () => new Map(colorFields.map((field) => [field.cssVar, field])),
    [colorFields],
  );
  const textFieldMap = useMemo(
    () => new Map(textFields.map((field) => [field.cssVar, field])),
    [textFields],
  );

  return sections.map((section) => {
    const sectionRows = section.cssVars
      .map((cssVar) => {
        const colorField = colorFieldMap.get(cssVar);
        if (colorField) {
          return renderColorFieldRow(colorField);
        }
        const textField = textFieldMap.get(cssVar);
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
}

export function ThemeParameterDebugLayerList(props: {
  layers: readonly DebugLayerDefinition[];
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
}) {
  const {
    layers,
    colorFields,
    textFields,
    renderColorFieldRow,
    renderTextFieldRow,
  } = props;

  return layers.map((layer) => (
    <details key={layer.id} className="settings-collapsible" open>
      <summary>{layer.title}</summary>
      <div className="settings-collapsible-content">
        <ThemeParameterDebugSectionList
          sections={layer.sections}
          colorFields={colorFields}
          textFields={textFields}
          renderColorFieldRow={renderColorFieldRow}
          renderTextFieldRow={renderTextFieldRow}
        />
      </div>
    </details>
  ));
}

function ParameterRow(props: {
  parameter: ThemeParameterDefinition;
  value: number;
  label: ReactNode;
  onApply: (parameter: ThemeParameterDefinition, rawValue: number) => void;
  isChanged: boolean;
  onReset: (parameter: ThemeParameterDefinition) => void;
  resetLabel: string;
}) {
  const { parameter, value, label, onApply, isChanged, onReset, resetLabel } =
    props;
  return (
    <label
      key={parameter.id}
      className="theme-parameter-row"
      htmlFor={`theme-parameter-${parameter.id}`}
    >
      {label}
      <div className="theme-parameter-control">
        <input
          id={`theme-parameter-${parameter.id}`}
          type="range"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          value={value}
          onChange={(event) => onApply(parameter, Number(event.target.value))}
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
            onApply(parameter, next);
          }}
        />
        <code className="theme-parameter-value-text">
          {`${formatValue(value, parameter.step)}${parameter.unit}`}
        </code>
        {isChanged ? (
          <button
            type="button"
            className="theme-parameter-reset-btn"
            onClick={() => onReset(parameter)}
          >
            {resetLabel}
          </button>
        ) : null}
      </div>
    </label>
  );
}

export function ThemeParameterParameterRows(props: {
  parameters: ThemeParameterDefinition[];
  values: ThemeParameterValues;
  resolveLabel: (parameter: ThemeParameterDefinition) => string;
  applyParameter: (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => void;
  isParameterChanged: (parameter: ThemeParameterDefinition) => boolean;
  resetSingleParameter: (parameter: ThemeParameterDefinition) => void;
  resetLabel: string;
}) {
  const {
    parameters,
    values,
    resolveLabel,
    applyParameter,
    isParameterChanged,
    resetSingleParameter,
    resetLabel,
  } = props;
  return (
    <div className="theme-parameter-list">
      {parameters.map((parameter) => {
        const value = values[parameter.id] ?? parameter.fallback;
        return (
          <ParameterRow
            key={parameter.id}
            parameter={parameter}
            value={value}
            label={
              <>
                <span>{resolveLabel(parameter)}</span>
                <span className="theme-parameter-var-label">
                  {parameter.id}
                </span>
              </>
            }
            onApply={applyParameter}
            isChanged={isParameterChanged(parameter)}
            onReset={resetSingleParameter}
            resetLabel={resetLabel}
          />
        );
      })}
    </div>
  );
}

export function ThemeParameterParameterRowsWithVarLabel(props: {
  parameters: ThemeParameterDefinition[];
  values: ThemeParameterValues;
  applyParameter: (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => void;
  isParameterChanged: (parameter: ThemeParameterDefinition) => boolean;
  resetSingleParameter: (parameter: ThemeParameterDefinition) => void;
  resetLabel: string;
}) {
  const {
    parameters,
    values,
    applyParameter,
    isParameterChanged,
    resetSingleParameter,
    resetLabel,
  } = props;
  return (
    <div className="theme-parameter-list">
      {parameters.map((parameter) => {
        const value = values[parameter.id] ?? parameter.fallback;
        const cssVar = parameter.cssVarName ?? parameter.id;
        return (
          <ParameterRow
            key={parameter.id}
            parameter={parameter}
            value={value}
            label={<ThemeParameterVarLabel cssVar={cssVar} />}
            onApply={applyParameter}
            isChanged={isParameterChanged(parameter)}
            onReset={resetSingleParameter}
            resetLabel={resetLabel}
          />
        );
      })}
    </div>
  );
}
