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
} from "../ThemeParameterPanel";

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
  return (
    <main className="settings-main theme-parameter-main">
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
