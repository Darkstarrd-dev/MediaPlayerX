import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { MainUiIcon } from "../MainUiIcon";
import { buildA11yProps } from "../../i18n/a11y";
import { useI18n } from "../../i18n/useI18n";
import { ThemeParameterPanelMain } from "./ThemeParameterPanelMain";
import { includesSearch, readFileAsText } from "./themeParameterUtils";
import {
  COMMON_PARAMETERS,
  EMPTY_PARAMETERS,
  readParameterValues,
  resolveParameterLabel,
  resolveStyleGroup,
  STYLE_PARAMETERS,
  type ThemeParameterDefinition,
  type ThemeParameterValues,
} from "./themeParameterDefinitions";

interface ThemeParameterPanelProps {
  open: boolean;
  styleId: string;
  settingsFontSize: number;
  onClose: () => void;
}

interface ThemeParameterSnapshot {
  version: 1;
  styleId: string;
  values: Record<string, number>;
}

function ThemeParameterPanel({
  open,
  styleId,
  settingsFontSize,
  onClose,
}: ThemeParameterPanelProps) {
  const { t } = useI18n();
  const styleGroup = resolveStyleGroup(styleId);
  const styleParameters =
    styleGroup === "default" ? EMPTY_PARAMETERS : STYLE_PARAMETERS[styleGroup];
  const parameters = useMemo(
    () =>
      styleGroup === "default"
        ? COMMON_PARAMETERS
        : [...COMMON_PARAMETERS, ...STYLE_PARAMETERS[styleGroup]],
    [styleGroup],
  );
  const [values, setValues] = useState<ThemeParameterValues>({});
  const [searchText, setSearchText] = useState("");
  const [commonExpanded, setCommonExpanded] = useState(true);
  const [styleExpanded, setStyleExpanded] = useState(true);
  const [snapshotJson, setSnapshotJson] = useState("");
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(readParameterValues(parameters));
    setSnapshotMessage("");
  }, [open, parameters, styleId]);

  if (!open) {
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
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      };
      parameter.apply(root, nextValue, nextValues);
      return nextValues;
    });
  };

  const buildSnapshotPayload = (): ThemeParameterSnapshot => {
    return {
      version: 1,
      styleId,
      values: Object.fromEntries(
        parameters.map((parameter) => [
          parameter.id,
          values[parameter.id] ?? parameter.fallback,
        ]),
      ),
    };
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
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(snapshotJson);
      setSnapshotMessage(t("ui.themeParameter.snapshotCopied"));
    } catch {
      setSnapshotMessage(t("ui.themeParameter.snapshotCopyFailed"));
    }
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
    const payload = parsed as Partial<ThemeParameterSnapshot>;
    if (!payload.values || typeof payload.values !== "object") {
      setSnapshotMessage(t("ui.themeParameter.snapshotImportFailed"));
      return;
    }
    const importedValues = payload.values as Record<string, unknown>;
    const root = document.documentElement;
    const nextValues: ThemeParameterValues = { ...values };
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
      parameter.apply(root, normalized, nextValues);
    }
    setValues(nextValues);
    if (payload.styleId && payload.styleId !== styleId) {
      setSnapshotMessage(
        t("ui.themeParameter.snapshotImportedStyleMismatch", {
          styleId: payload.styleId,
        }),
      );
      return;
    }
    setSnapshotMessage(t("ui.themeParameter.snapshotImported"));
  };

  const resetCurrentStyleParameters = () => {
    const root = document.documentElement;
    for (const parameter of parameters) {
      parameter.reset(root);
    }
    setValues(readParameterValues(parameters));
  };

  const resolveLabel = (parameter: ThemeParameterDefinition): string => {
    return resolveParameterLabel(parameter, t);
  };

  return (
    <div
      {...panelA11y}
      className="settings-mask"
      data-slot="fg-header-g3-theme-parameter-root-panel"
      role="dialog"
      aria-modal="true"
      data-overlay-close="theme-parameter"
    >
      <section
        className="settings-panel theme-parameter-panel"
        style={{ fontSize: `${settingsFontSize}px` }}
      >
        <div className="settings-head">
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>{t("ui.themeParameter.panel")}</h2>
          <button
            {...closeA11y}
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            onClick={onClose}
          >
            <MainUiIcon name="close" />
          </button>
        </div>

        <ThemeParameterPanelMain
          t={t}
          styleId={styleId}
          searchText={searchText}
          setSearchText={setSearchText}
          snapshotJson={snapshotJson}
          setSnapshotJson={setSnapshotJson}
          snapshotMessage={snapshotMessage}
          setSnapshotMessage={setSnapshotMessage}
          snapshotFileInputRef={snapshotFileInputRef}
          loadSnapshotFile={loadSnapshotFile}
          exportSnapshotJson={exportSnapshotJson}
          downloadSnapshotJson={downloadSnapshotJson}
          openSnapshotFilePicker={openSnapshotFilePicker}
          copySnapshotJson={copySnapshotJson}
          importSnapshotJson={importSnapshotJson}
          commonExpanded={commonExpanded}
          setCommonExpanded={setCommonExpanded}
          styleExpanded={styleExpanded}
          setStyleExpanded={setStyleExpanded}
          filteredCommonParameters={filteredCommonParameters}
          filteredStyleParameters={filteredStyleParameters}
          styleParameters={styleParameters}
          values={values}
          applyParameter={applyParameter}
          resolveLabel={resolveLabel}
          resetCurrentStyleParameters={resetCurrentStyleParameters}
        />
      </section>
    </div>
  );
}

export type { ThemeParameterDefinition, ThemeParameterValues };

export default ThemeParameterPanel;
