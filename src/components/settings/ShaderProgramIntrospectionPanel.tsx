import { useEffect, useMemo, useRef, useState } from "react";

import type { AppSettings } from "../../contracts/settings";
import {
  inspectShaderPrograms,
  type ShaderProgramIntrospectionResult,
} from "../../features/music-visualizer/plugin/programIntrospection";
import {
  resolveDefaultMusicVisualizerShader,
  resolveMusicVisualizerShaderById,
} from "../../features/music-visualizer/shaderRegistry";

const DEFAULT_SCALAR_TRANSFORM = {
  scale: 1,
  bias: 0,
  clampEnabled: false,
  clampMin: 0,
  clampMax: 1,
  smoothEnabled: false,
  smoothAttack: 0.35,
  smoothRelease: 0.12,
} as const;

const BEAT_PUNCH_TRANSFORM = {
  scale: 1.8,
  bias: 0,
  clampEnabled: true,
  clampMin: 0,
  clampMax: 1,
  smoothEnabled: false,
  smoothAttack: 0.2,
  smoothRelease: 0.08,
} as const;

const SMOOTH_ENVELOPE_TRANSFORM = {
  scale: 1,
  bias: 0,
  clampEnabled: true,
  clampMin: 0,
  clampMax: 1,
  smoothEnabled: true,
  smoothAttack: 0.2,
  smoothRelease: 0.06,
} as const;

interface ShaderProgramIntrospectionPanelProps {
  selectedShaderId: string;
  inputBinding: AppSettings["musicVisualizerPluginInputBindingsByShaderId"][string];
  customBinding: AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string];
  onBindingReplace: (value: unknown) => void;
  onScalarBindingChange: (
    uniformName: string,
    signal: AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string]["scalarBindings"][string],
  ) => void;
  onSamplerBindingChange: (
    uniformName: string,
    signal: AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string]["samplerBindings"][string],
  ) => void;
  onScalarTransformChange: (
    uniformName: string,
    patch: Partial<
      AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string]["scalarTransforms"][string]
    >,
  ) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function ShaderProgramIntrospectionPanel({
  selectedShaderId,
  inputBinding,
  customBinding,
  onBindingReplace,
  onScalarBindingChange,
  onSamplerBindingChange,
  onScalarTransformChange,
  t,
}: ShaderProgramIntrospectionPanelProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const resolveScalarTransform = (
    uniformName: string,
  ): AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string]["scalarTransforms"][string] =>
    customBinding.scalarTransforms[uniformName] ?? { ...DEFAULT_SCALAR_TRANSFORM };

  const shader = useMemo(() => {
    const fallback = resolveDefaultMusicVisualizerShader();
    return resolveMusicVisualizerShaderById(selectedShaderId) ?? fallback;
  }, [selectedShaderId]);

  const [report, setReport] = useState<ShaderProgramIntrospectionResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined" || !shader) {
      setReport(null);
      setError(null);
      return;
    }

    try {
      const nextReport = inspectShaderPrograms(shader);
      setReport(nextReport);
      setError(null);
    } catch (unknownError) {
      setReport(null);
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : t("ui.settings.shaderProgramReflectionFallbackError");
      setError(message);
    }
  }, [shader, t]);

  const handleExportBindings = () => {
    try {
      const payload = {
        shaderId: selectedShaderId,
        pluginInputBinding: inputBinding,
        pluginCustomBinding: customBinding,
      };
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeShaderId =
        selectedShaderId.trim().replace(/[^a-zA-Z0-9-_]+/g, "-") || "shader";
      anchor.href = objectUrl;
      anchor.download = `shader-bindings-${safeShaderId}.json`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setImportStatus(t("ui.settings.shaderBindingExportSuccess"));
    } catch {
      setImportStatus(t("ui.settings.shaderBindingImportError"));
    }
  };

  const handleImportBindings = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      onBindingReplace(payload);
      setImportStatus(t("ui.settings.shaderBindingImportSuccess"));
    } catch {
      setImportStatus(t("ui.settings.shaderBindingImportError"));
    }
  };

  const handleClearCustomBindings = () => {
    onBindingReplace({
      pluginCustomBinding: {
        scalarBindings: {},
        scalarTransforms: {},
        samplerBindings: {},
      },
    });
    setImportStatus(t("ui.settings.shaderBindingClearSuccess"));
  };

  if (!shader) {
    return (
      <p className="settings-placeholder">
        {t("ui.settings.shaderProgramReflectionUnavailable")}
      </p>
    );
  }

  if (error) {
    return (
      <p className="settings-placeholder">
        {t("ui.settings.shaderProgramReflectionError", { message: error })}
      </p>
    );
  }

  if (!report) {
    return (
      <p className="settings-placeholder">
        {t("ui.settings.shaderProgramReflectionLoading")}
      </p>
    );
  }

  return (
    <div className="settings-shader-reflection-shell">
      <p className="settings-placeholder">
        {t("ui.settings.shaderProgramReflectionSummary", {
          passCount: report.passes.length,
          scalarCount: report.scalarUniforms.length,
          samplerCount: report.samplerUniforms.length,
        })}
      </p>

      <div className="settings-shader-binding-toolbar">
        <button type="button" onClick={handleExportBindings}>
          {t("ui.settings.shaderBindingExportJson")}
        </button>
        <button type="button" onClick={() => importInputRef.current?.click()}>
          {t("ui.settings.shaderBindingImportJson")}
        </button>
        <button type="button" onClick={handleClearCustomBindings}>
          {t("ui.settings.shaderBindingClearCustom")}
        </button>
        <input
          ref={importInputRef}
          className="settings-shader-binding-file"
          type="file"
          accept="application/json,.json"
          onChange={handleImportBindings}
        />
      </div>

      {importStatus ? (
        <p className="settings-shader-binding-status">{importStatus}</p>
      ) : null}

      {report.scalarUniforms.length > 0 ? (
        <div className="settings-shader-reflection-group">
          <strong>{t("ui.settings.shaderProgramReflectionScalar")}</strong>
          {report.scalarUniforms.map((uniformName) => {
            const scalarTransform = resolveScalarTransform(uniformName);
            return (
            <div
              key={`scalar-${uniformName}`}
              className="settings-shader-reflection-row"
            >
              <label>
                <span>{uniformName}</span>
                <select
                  value={customBinding.scalarBindings[uniformName] ?? "none"}
                  onChange={(event) =>
                    onScalarBindingChange(
                      uniformName,
                      event.target.value as
                        | "none"
                        | "audioLevel"
                        | "audioBeat"
                        | "timeSec",
                    )
                  }
                >
                  <option value="none">{t("ui.settings.shaderBindingNone")}</option>
                  <option value="timeSec">{t("ui.settings.shaderBindingTime")}</option>
                  <option value="audioLevel">
                    {t("ui.settings.shaderBindingAudioLevel")}
                  </option>
                  <option value="audioBeat">
                    {t("ui.settings.shaderBindingAudioBeat")}
                  </option>
                </select>
              </label>

              {(customBinding.scalarBindings[uniformName] ?? "none") !== "none" ? (
                <div className="settings-shader-transform-grid">
                  <div className="settings-shader-transform-presets">
                    <button
                      type="button"
                      onClick={() =>
                        onScalarTransformChange(uniformName, {
                          ...DEFAULT_SCALAR_TRANSFORM,
                        })
                      }
                    >
                      {t("ui.settings.shaderTransformPresetDefault")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onScalarTransformChange(uniformName, {
                          ...BEAT_PUNCH_TRANSFORM,
                        })
                      }
                    >
                      {t("ui.settings.shaderTransformPresetBeatPunch")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onScalarTransformChange(uniformName, {
                          ...SMOOTH_ENVELOPE_TRANSFORM,
                        })
                      }
                    >
                      {t("ui.settings.shaderTransformPresetSmoothEnvelope")}
                    </button>
                  </div>

                  <label>
                    <span>{t("ui.settings.shaderTransformScale")}</span>
                    <input
                      type="number"
                      min={-16}
                      max={16}
                      step={0.05}
                      value={scalarTransform.scale}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          scale: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("ui.settings.shaderTransformBias")}</span>
                    <input
                      type="number"
                      min={-4}
                      max={4}
                      step={0.05}
                      value={scalarTransform.bias}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          bias: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="settings-toggle-row">
                    <span>{t("ui.settings.shaderTransformClamp")}</span>
                    <input
                      type="checkbox"
                      checked={scalarTransform.clampEnabled}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          clampEnabled: event.target.checked,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("ui.settings.shaderTransformClampMin")}</span>
                    <input
                      type="number"
                      min={-4}
                      max={4}
                      step={0.05}
                      value={scalarTransform.clampMin}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          clampMin: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("ui.settings.shaderTransformClampMax")}</span>
                    <input
                      type="number"
                      min={-4}
                      max={4}
                      step={0.05}
                      value={scalarTransform.clampMax}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          clampMax: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="settings-toggle-row">
                    <span>{t("ui.settings.shaderTransformSmooth")}</span>
                    <input
                      type="checkbox"
                      checked={scalarTransform.smoothEnabled}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          smoothEnabled: event.target.checked,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("ui.settings.shaderTransformAttack")}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={scalarTransform.smoothAttack}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          smoothAttack: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("ui.settings.shaderTransformRelease")}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={scalarTransform.smoothRelease}
                      onChange={(event) =>
                        onScalarTransformChange(uniformName, {
                          smoothRelease: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>
          )})}
        </div>
      ) : null}

      {report.samplerUniforms.length > 0 ? (
        <div className="settings-shader-reflection-group">
          <strong>{t("ui.settings.shaderProgramReflectionSampler")}</strong>
          {report.samplerUniforms.map((uniformName) => (
            <label key={`sampler-${uniformName}`}>
              <span>{uniformName}</span>
              <select
                value={customBinding.samplerBindings[uniformName] ?? "none"}
                onChange={(event) =>
                  onSamplerBindingChange(
                    uniformName,
                    event.target.value as "none" | "audioTexture",
                  )
                }
              >
                <option value="none">{t("ui.settings.shaderBindingNone")}</option>
                <option value="audioTexture">
                  {t("ui.settings.shaderBindingAudioTexture")}
                </option>
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
