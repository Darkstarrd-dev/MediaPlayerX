import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import { formatValue } from "./themeParameterUtils";
import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";

interface ThemeParameterPanelMainProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  styleId: string;
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
  values: ThemeParameterValues;
  applyParameter: (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => void;
  resolveLabel: (parameter: ThemeParameterDefinition) => string;
  resetCurrentStyleParameters: () => void;
}

export function ThemeParameterPanelMain({
  t,
  styleId,
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
  values,
  applyParameter,
  resolveLabel,
  resetCurrentStyleParameters,
}: ThemeParameterPanelMainProps) {
  const buttonTemplateStates = [
    {
      key: "idle",
      state: "默认态 (idle)",
      styleSource: ".mode-switch button",
      interaction: "初始渲染，未悬停/未按下/未选中",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-image'",
      demoLabel: "默认",
    },
    {
      key: "hover",
      state: "悬停态 (hover)",
      styleSource: ".mode-switch button:hover",
      interaction: "pointerenter / mouseenter",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-video'",
      demoLabel: "悬停测试",
    },
    {
      key: "active",
      state: "按下态 (active)",
      styleSource: ".mode-switch button:active",
      interaction: "pointerdown / mousedown",
      usage: "AppHeader.tsx -> data-slot='fg-header-g2-mode-music'",
      demoLabel: "按下测试",
    },
    {
      key: "selected",
      state: "选中态 (is-active)",
      styleSource: ".mode-switch button.is-active",
      interaction: "click 后由业务状态切换 class",
      usage: "AppHeader.tsx -> className={mode === 'image' ? 'is-active' : ''}",
      demoLabel: "已选中",
    },
    {
      key: "pressed",
      state: "开关按压态 (aria-pressed='true')",
      styleSource: "[aria-pressed='true']",
      interaction: "click 切换布尔开关状态",
      usage: "AppHeader.tsx -> fg-header-g-debug-tooltips",
      demoLabel: "开关已按下",
    },
    {
      key: "disabled",
      state: "禁用态 (disabled)",
      styleSource: "button:disabled",
      interaction: "组件设置 disabled，阻断点击",
      usage: "MetadataPanel.tsx -> fg-meta-toolbar-g3-search",
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
      styleSource: ".window-control-btn--close:hover",
      interaction: "关闭按钮 hover",
      usage: "AppHeader.tsx -> window-control-btn--close",
      demoLabel: "关闭悬停测试",
    },
  ] as const;

  return (
    <main className="settings-main mpx-scroll-area theme-parameter-main">
      <section className="settings-block theme-parameter-block">
        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.themeParameter.toolsSection")}</span>
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

        <details
          className="settings-collapsible"
          open={commonExpanded}
          onToggle={(event) =>
            setCommonExpanded((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary>{t("ui.themeParameter.sectionCommon")}</summary>
          <div className="settings-collapsible-content">
            <div className="theme-parameter-list">
              {filteredCommonParameters.map((parameter) => {
                const value = values[parameter.id] ?? parameter.fallback;
                return (
                  <label
                    key={parameter.id}
                    className="theme-parameter-row"
                    htmlFor={`theme-parameter-${parameter.id}`}
                  >
                    <span>{resolveLabel(parameter)}</span>
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
                      <code>{`${formatValue(value, parameter.step)}${parameter.unit}`}</code>
                    </div>
                  </label>
                );
              })}
            </div>
            {filteredCommonParameters.length === 0 ? (
              <p className="settings-placeholder">{t("ui.common.noResults")}</p>
            ) : null}
          </div>
        </details>

        <details
          className="settings-collapsible"
          open={styleExpanded}
          onToggle={(event) =>
            setStyleExpanded((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary>{t("ui.themeParameter.sectionStyle", { styleId })}</summary>
          <div className="settings-collapsible-content">
            {styleParameters.length === 0 ? (
              <p className="settings-placeholder">
                {t("ui.themeParameter.noStyleSpecific")}
              </p>
            ) : (
              <div className="theme-parameter-list">
                {filteredStyleParameters.map((parameter) => {
                  const value = values[parameter.id] ?? parameter.fallback;
                  return (
                    <label
                      key={parameter.id}
                      className="theme-parameter-row"
                      htmlFor={`theme-parameter-${parameter.id}`}
                    >
                      <span>{resolveLabel(parameter)}</span>
                      <div className="theme-parameter-control">
                        <input
                          id={`theme-parameter-${parameter.id}`}
                          type="range"
                          min={parameter.min}
                          max={parameter.max}
                          step={parameter.step}
                          value={value}
                          onChange={(event) =>
                            applyParameter(
                              parameter,
                              Number(event.target.value),
                            )
                          }
                        />
                        <code>{`${formatValue(value, parameter.step)}${parameter.unit}`}</code>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {styleParameters.length > 0 &&
            filteredStyleParameters.length === 0 ? (
              <p className="settings-placeholder">{t("ui.common.noResults")}</p>
            ) : null}
          </div>
        </details>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>基础按钮样式（fg-header-g2 模板）</span>
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
                        <span className="window-control-btn-text">{item.demoLabel}</span>
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
                        className="window-control-btn window-control-btn--close"
                        type="button"
                      >
                        <span className="window-control-btn-text">{item.demoLabel}</span>
                      </button>
                    ) : (
                      <div className="mode-switch-wrap theme-parameter-g2-wrap-demo">
                        <div className="mode-switch theme-parameter-g2-mode-demo">
                          <button
                            className={item.key === "selected" ? "is-active" : ""}
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
    </main>
  );
}
