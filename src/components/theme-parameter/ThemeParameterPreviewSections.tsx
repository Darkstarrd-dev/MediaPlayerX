import type { Dispatch, ReactNode, SetStateAction } from "react";

import { SkeuoRunway } from "../primitives/SkeuoRunway";
import { ThemeParameterCommonControlTextFieldRow, buildSkeuoRangeStyle } from "./ThemeParameterFieldRows";
import {
  BUTTON_STATE_COLOR_FIELDS,
  BUTTON_STATE_FIELD_PREFIX,
  COMMON_CONTROL_COLOR_FIELDS,
  COMMON_CONTROL_TEXT_FIELDS,
  CONTROL_SECTION_DEFINITIONS,
} from "./themeParameterPanelCatalog";
import type {
  ButtonStateKey,
  ControlPreviewValues,
  ThemeDebugColorField,
  ThemeDebugTextField,
  ThemeControlSectionId,
} from "./themeParameterPanelTypes";

interface ThemeParameterCommonControlSectionsProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  controlPreviewValues: ControlPreviewValues;
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>;
  debugTextValues: Record<string, string>;
  isTextFieldChanged: (field: ThemeDebugTextField) => boolean;
  setDebugTextFieldValue: (field: ThemeDebugTextField, raw: string) => void;
  resetTextField: (field: ThemeDebugTextField) => void;
  resetLabel: string;
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
}

interface ThemeParameterButtonStateDebugProps {
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
}

const BUTTON_TEMPLATE_STATES: ReadonlyArray<{
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

const renderCommonControlHorizontalPreview = (
  sectionId: ThemeControlSectionId,
  controlPreviewValues: ControlPreviewValues,
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>,
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
  controlPreviewValues: ControlPreviewValues,
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>,
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
            <span className="theme-parameter-control-preview-caption">朝上</span>
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
            <span className="theme-parameter-control-preview-caption">朝下</span>
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

const resolveButtonStateFields = (stateKey: ButtonStateKey) => {
  const prefix = BUTTON_STATE_FIELD_PREFIX[stateKey];
  return BUTTON_STATE_COLOR_FIELDS.filter((field) =>
    field.id.startsWith(`button-side-${prefix}-`),
  );
};

export function ThemeParameterCommonControlSections({
  t,
  controlPreviewValues,
  setControlPreviewValues,
  debugTextValues,
  isTextFieldChanged,
  setDebugTextFieldValue,
  resetTextField,
  resetLabel,
  renderColorFieldRow,
}: ThemeParameterCommonControlSectionsProps) {
  const renderTextFieldRow = (field: ThemeDebugTextField) => {
    return (
      <ThemeParameterCommonControlTextFieldRow
        key={field.id}
        field={field}
        raw={debugTextValues[field.id] ?? field.fallback}
        isChanged={isTextFieldChanged(field)}
        onChange={setDebugTextFieldValue}
        onReset={resetTextField}
        resetLabel={resetLabel}
      />
    );
  };

  return (
    <>
      {CONTROL_SECTION_DEFINITIONS.map((section) => {
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
          controlPreviewValues,
          setControlPreviewValues,
        );
        const verticalPreview = renderCommonControlVerticalPreview(
          section.id,
          controlPreviewValues,
          setControlPreviewValues,
        );
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
                    {textFields.map(renderTextFieldRow)}
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
      })}
    </>
  );
}

export function ThemeParameterButtonStateDebug({
  renderColorFieldRow,
}: ThemeParameterButtonStateDebugProps) {
  return (
    <section className="settings-group">
      <p className="theme-parameter-note-intro">
        当前页基于 4.0 按钮层（core/variant/slot）展示 side 分页按钮。
        每个状态都对应独立的调节项和展示项（border/bg/text）。颜色字段直接映射
        <code>
          --mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-*
        </code>
        ，修改后立即作用到分页按钮样式。
      </p>
      <ul className="theme-parameter-note-list">
        {BUTTON_TEMPLATE_STATES.map((item) => (
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
  );
}
