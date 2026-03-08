import { useRef, useState, type ChangeEvent, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";
import type {
  ThemeParameterSyncState,
} from "./themeParameterSync";
import {
  applyImportedThemeParameterSyncTargets,
  pruneThemeParameterSyncTarget,
  resetThemeParameterSyncState,
} from "./themeParameterSync";
import { readFileAsText } from "./themeParameterUtils";
import {
  SNAPSHOT_COLOR_FIELDS,
  SNAPSHOT_TEXT_FIELDS,
  type ThemeParameterSnapshot,
} from "./themeParameterSnapshotCatalog";

interface UseThemeParameterSnapshotControlsOptions {
  t: (key: string, values?: Record<string, string | number>) => string;
  styleId: string;
  parameters: ThemeParameterDefinition[];
  values: ThemeParameterValues;
  setValues: Dispatch<SetStateAction<ThemeParameterValues>>;
  parameterMap: Map<string, ThemeParameterDefinition>;
  parameterSyncStateRef: MutableRefObject<ThemeParameterSyncState>;
}

interface SnapshotPayloadOptions {
  includeComputedValues?: boolean;
  sourceValues?: ThemeParameterValues;
}

function buildSnapshotPayload(options: {
  parameters: ThemeParameterDefinition[];
  styleId: string;
  values: ThemeParameterValues;
  explicitParameterIds: Set<string>;
  snapshotIncludeComputedValues: boolean;
  snapshotOptions?: SnapshotPayloadOptions;
}): ThemeParameterSnapshot {
  const computed = getComputedStyle(document.documentElement);
  const includeComputedValues =
    options.snapshotOptions?.includeComputedValues ??
    options.snapshotIncludeComputedValues;
  const sourceValues = options.snapshotOptions?.sourceValues ?? options.values;
  const valueEntries = options.parameters
    .filter(
      (parameter) =>
        includeComputedValues || options.explicitParameterIds.has(parameter.id),
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
    styleId: options.styleId,
    ...(Object.keys(snapshotValues).length > 0 ? { values: snapshotValues } : {}),
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
}

export function useThemeParameterSnapshotControls({
  t,
  styleId,
  parameters,
  values,
  setValues,
  parameterMap,
  parameterSyncStateRef,
}: UseThemeParameterSnapshotControlsOptions) {
  const [snapshotJson, setSnapshotJson] = useState("");
  const [snapshotIncludeComputedValues, setSnapshotIncludeComputedValues] =
    useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotExplicitParameterIds, setSnapshotExplicitParameterIds] =
    useState<Set<string>>(new Set());
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotBaselineRef = useRef<ThemeParameterSnapshot | null>(null);

  const buildCurrentSnapshotPayload = (
    snapshotOptions?: SnapshotPayloadOptions,
  ): ThemeParameterSnapshot => {
    return buildSnapshotPayload({
      parameters,
      styleId,
      values,
      explicitParameterIds: snapshotExplicitParameterIds,
      snapshotIncludeComputedValues,
      snapshotOptions,
    });
  };

  const buildSnapshotJson = (): string => {
    return JSON.stringify(buildCurrentSnapshotPayload(), null, 2);
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

  const initializeSnapshotSession = (initialValues: ThemeParameterValues) => {
    const computed = getComputedStyle(document.documentElement);
    setSnapshotMessage("");
    setSnapshotExplicitParameterIds(new Set());
    snapshotBaselineRef.current = buildSnapshotPayload({
      parameters,
      styleId,
      values,
      explicitParameterIds: new Set(parameters.map((parameter) => parameter.id)),
      snapshotIncludeComputedValues: true,
      snapshotOptions: {
        includeComputedValues: true,
        sourceValues: initialValues,
      },
    });
    snapshotBaselineRef.current = {
      ...snapshotBaselineRef.current,
      values: Object.fromEntries(
        parameters.map((parameter) => [
          parameter.id,
          initialValues[parameter.id] ?? parameter.read(computed),
        ]),
      ),
    };
  };

  const addSnapshotExplicitParameterIds = (parameterIds: Iterable<string>) => {
    setSnapshotExplicitParameterIds((previous) => {
      const next = new Set(previous);
      for (const parameterId of parameterIds) {
        next.add(parameterId);
      }
      return next;
    });
  };

  const removeSnapshotExplicitParameterIds = (
    parameterIds: Iterable<string>,
  ) => {
    setSnapshotExplicitParameterIds((previous) => {
      const next = new Set(previous);
      for (const parameterId of parameterIds) {
        next.delete(parameterId);
      }
      return next;
    });
  };

  return {
    snapshotJson,
    setSnapshotJson,
    snapshotIncludeComputedValues,
    setSnapshotIncludeComputedValues,
    snapshotMessage,
    setSnapshotMessage,
    snapshotFileInputRef,
    exportSnapshotJson,
    downloadSnapshotJson,
    openSnapshotFilePicker,
    loadSnapshotFile,
    copySnapshotJson,
    importSnapshotJson,
    resetSnapshotToBaseline,
    initializeSnapshotSession,
    addSnapshotExplicitParameterIds,
    removeSnapshotExplicitParameterIds,
  };
}
