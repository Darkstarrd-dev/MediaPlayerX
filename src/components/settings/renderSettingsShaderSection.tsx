import type { JSX } from "react";

import {
  MUSIC_VISUALIZER_SHADERS,
  resolveDefaultMusicVisualizerShader,
} from "../../features/music-visualizer/shaderRegistry";
import { ShaderPreviewCanvas } from "./ShaderPreviewCanvas";
import { ShaderProgramIntrospectionPanel } from "./ShaderProgramIntrospectionPanel";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsShaderSectionParams {
  params: RenderSettingsMainSectionParams;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function renderSettingsShaderSection({
  params,
}: RenderSettingsShaderSectionParams): JSX.Element {
  const { t } = params;
  const defaultShaderId =
    resolveDefaultMusicVisualizerShader()?.id ?? "mcs-szb";
  const selectedShaderId =
    params.musicVisualizerSelectedShaderId.trim().slice(0, 64) || defaultShaderId;

  const fallbackSettings = {
    renderLongEdgePx: params.musicVisualizerRenderLongEdgePx,
    renderScaleCoeff: 2,
    compositionMode: "single" as const,
    layeredBackgroundShaderId: "galaxy",
    layeredForegroundShaderId: defaultShaderId,
    layeredBackgroundEnabled: true,
    layeredForegroundEnabled: true,
    layeredForegroundOffsetX: 0,
    layeredForegroundOffsetY: 0,
    layeredForegroundScale: 1,
    fpsCap: params.musicVisualizerFpsCap,
    toneMapMode: params.musicVisualizerToneMapMode,
    toneMapExposure: params.musicVisualizerToneMapExposure,
    toneMapStrength: params.musicVisualizerToneMapStrength,
    showFps: params.musicVisualizerShowFps,
    renderer: params.musicVisualizerRenderer,
  };

  const currentSettings =
    params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallbackSettings;
  const currentInputBinding =
    params.musicVisualizerPluginInputBindingsByShaderId[selectedShaderId] ?? {
      audioLevelUniform: "iAudioLevel",
      audioBeatUniform: "iAudioBeat",
      timeUniform: "iTime",
      audioTextureSampler: "iChannel0",
    };
  const currentCustomBinding =
    params.musicVisualizerPluginCustomBindingsByShaderId[selectedShaderId] ?? {
      scalarBindings: {},
      scalarTransforms: {},
      samplerBindings: {},
    };
  const shaderLab = params.musicVisualizerShaderLab;

  return (
    <div className="settings-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.shaderSection")}</span>
        </header>

        <label>
          {t("ui.settings.shaderRuntimeMode")}
          <select
            value={params.musicVisualizerRuntimeMode}
            onChange={(event) =>
              params.onMusicVisualizerRuntimeModeChange(
                event.target.value as "legacy" | "plugin",
              )
            }
          >
            <option value="legacy">
              {t("ui.settings.shaderRuntimeModeLegacy")}
            </option>
            <option value="plugin">
              {t("ui.settings.shaderRuntimeModePlugin")}
            </option>
          </select>
        </label>

        <label>
          {t("ui.settings.shaderAdapterMode")}
          <select
            value={shaderLab.adapterMode}
            onChange={(event) =>
              params.onMusicVisualizerShaderLabChange({
                adapterMode: event.target.value as "auto" | "shadertoy" | "glsl",
              })
            }
          >
            <option value="auto">{t("ui.settings.shaderAdapterModeAuto")}</option>
            <option value="shadertoy">
              {t("ui.settings.shaderAdapterModeShadertoy")}
            </option>
            <option value="glsl">{t("ui.settings.shaderAdapterModeGlsl")}</option>
          </select>
        </label>

        <label>
          {t("ui.settings.shaderCurrentShader")}
          <select
            value={selectedShaderId}
            onChange={(event) =>
              params.onMusicVisualizerSelectedShaderIdChange(event.target.value)
            }
          >
            {MUSIC_VISUALIZER_SHADERS.map((shader) => (
              <option key={shader.id} value={shader.id}>
                {shader.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("ui.settings.shaderCompositionMode")}
          <select
            value={currentSettings.compositionMode}
            onChange={(event) =>
              params.onMusicVisualizerShaderSettingsChange({
                compositionMode:
                  event.target.value === "layered" ? "layered" : "single",
              })
            }
          >
            <option value="single">
              {t("ui.settings.shaderCompositionSingle")}
            </option>
            <option value="layered">
              {t("ui.settings.shaderCompositionLayered")}
            </option>
          </select>
        </label>
      </section>

      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.music.shaderSettingsTitle")}</span>
        </header>

        <label>
          {t("ui.music.renderLongEdge")}
          <input
            min={240}
            max={4096}
            step={1}
            type="number"
            value={currentSettings.renderLongEdgePx}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) {
                return;
              }
              params.onMusicVisualizerShaderSettingsChange({
                renderLongEdgePx: Math.round(clamp(value, 240, 4096)),
              });
            }}
          />
        </label>

        <label>
          {t("ui.music.fpsCap")}
          <select
            value={currentSettings.fpsCap}
            onChange={(event) =>
              params.onMusicVisualizerShaderSettingsChange({
                fpsCap: Number(event.target.value) as 30 | 60 | 120,
              })
            }
          >
            <option value={30}>{t("ui.music.fpsCapOption30")}</option>
            <option value={60}>{t("ui.music.fpsCapOption60")}</option>
            <option value={120}>{t("ui.music.fpsCapOption120")}</option>
          </select>
        </label>

        <label>
          {t("ui.music.toneMapping")}
          <select
            value={currentSettings.toneMapMode}
            onChange={(event) =>
              params.onMusicVisualizerShaderSettingsChange({
                toneMapMode: event.target.value as
                  | "off"
                  | "reinhard"
                  | "aces"
                  | "filmic"
                  | "agx"
                  | "khronos",
              })
            }
          >
            <option value="off">{t("ui.music.disabled")}</option>
            <option value="aces">{t("ui.music.toneMapModeAces")}</option>
            <option value="reinhard">{t("ui.music.toneMapModeReinhard")}</option>
            <option value="filmic">{t("ui.music.toneMapModeFilmic")}</option>
            <option value="agx">{t("ui.music.toneMapModeAgx")}</option>
            <option value="khronos">{t("ui.music.toneMapModeKhronos")}</option>
          </select>
        </label>

        <label>
          {t("ui.music.toneMapExposure", {
            value: currentSettings.toneMapExposure.toFixed(2),
          })}
          <input
            max={2}
            min={0.5}
            step={0.01}
            type="range"
            value={currentSettings.toneMapExposure}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) {
                return;
              }
              params.onMusicVisualizerShaderSettingsChange({
                toneMapExposure: clamp(value, 0.5, 2),
              });
            }}
          />
        </label>

        <label>
          {t("ui.music.toneMapStrength", {
            value: (currentSettings.toneMapStrength * 100).toFixed(0),
          })}
          <input
            max={1}
            min={0}
            step={0.01}
            type="range"
            value={currentSettings.toneMapStrength}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) {
                return;
              }
              params.onMusicVisualizerShaderSettingsChange({
                toneMapStrength: clamp(value, 0, 1),
              });
            }}
          />
        </label>

        <label className="settings-toggle-row">
          <span>{t("ui.music.showFpsDebug")}</span>
          <input
            type="checkbox"
            checked={currentSettings.showFps}
            onChange={(event) =>
              params.onMusicVisualizerShaderSettingsChange({
                showFps: event.target.checked,
              })
            }
          />
        </label>

        <label>
          {t("ui.music.renderBackend")}
          <select
            value={currentSettings.renderer}
            onChange={(event) =>
              params.onMusicVisualizerShaderSettingsChange({
                renderer: event.target.value as "gpu" | "cpu",
              })
            }
          >
            <option value="gpu">{t("ui.music.rendererGpu")}</option>
            <option value="cpu">{t("ui.music.rendererCpu")}</option>
          </select>
        </label>
      </section>

      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.shaderInputMapping")}</span>
        </header>

        <label>
          {t("ui.settings.shaderInputAudioLevel")}
          <input
            type="text"
            value={currentInputBinding.audioLevelUniform}
            onChange={(event) =>
              params.onMusicVisualizerPluginInputBindingChange({
                audioLevelUniform: event.target.value.trim().slice(0, 64),
              })
            }
          />
        </label>

        <label>
          {t("ui.settings.shaderInputAudioBeat")}
          <input
            type="text"
            value={currentInputBinding.audioBeatUniform}
            onChange={(event) =>
              params.onMusicVisualizerPluginInputBindingChange({
                audioBeatUniform: event.target.value.trim().slice(0, 64),
              })
            }
          />
        </label>

        <label>
          {t("ui.settings.shaderInputTime")}
          <input
            type="text"
            value={currentInputBinding.timeUniform}
            onChange={(event) =>
              params.onMusicVisualizerPluginInputBindingChange({
                timeUniform: event.target.value.trim().slice(0, 64),
              })
            }
          />
        </label>

        <label>
          {t("ui.settings.shaderInputAudioTexture")}
          <input
            type="text"
            value={currentInputBinding.audioTextureSampler}
            onChange={(event) =>
              params.onMusicVisualizerPluginInputBindingChange({
                audioTextureSampler: event.target.value.trim().slice(0, 64),
              })
            }
          />
        </label>

        <ShaderProgramIntrospectionPanel
          selectedShaderId={selectedShaderId}
          inputBinding={currentInputBinding}
          customBinding={currentCustomBinding}
          onBindingReplace={params.onMusicVisualizerPluginCustomBindingReplace}
          onScalarBindingChange={params.onMusicVisualizerPluginCustomBindingChange}
          onSamplerBindingChange={
            params.onMusicVisualizerPluginCustomSamplerBindingChange
          }
          onScalarTransformChange={
            params.onMusicVisualizerPluginCustomTransformChange
          }
          t={t}
        />
      </section>

      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.shaderPreview")}</span>
        </header>
        <label>
          {t("ui.settings.shaderPreviewRenderLongEdge")}
          <input
            min={240}
            max={2048}
            step={1}
            type="number"
            value={shaderLab.previewRenderLongEdgePx}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) {
                return;
              }
              params.onMusicVisualizerShaderLabChange({
                previewRenderLongEdgePx: Math.round(clamp(value, 240, 2048)),
              });
            }}
          />
        </label>
        <label>
          {t("ui.settings.shaderPreviewFpsCap")}
          <select
            value={shaderLab.previewFpsCap}
            onChange={(event) =>
              params.onMusicVisualizerShaderLabChange({
                previewFpsCap: Number(event.target.value) as 30 | 60 | 120,
              })
            }
          >
            <option value={30}>{t("ui.music.fpsCapOption30")}</option>
            <option value={60}>{t("ui.music.fpsCapOption60")}</option>
            <option value={120}>{t("ui.music.fpsCapOption120")}</option>
          </select>
        </label>
        <ShaderPreviewCanvas
          runtimeMode={params.musicVisualizerRuntimeMode}
          selectedShaderId={selectedShaderId}
          shaderSettings={currentSettings}
          previewFpsCap={shaderLab.previewFpsCap}
          previewRenderLongEdgePx={shaderLab.previewRenderLongEdgePx}
          previewInputSource={shaderLab.previewInputSource}
          onPreviewInputSourceChange={(value: "demo" | "player") =>
            params.onMusicVisualizerShaderLabChange({
              previewInputSource: value,
            })
          }
          pluginInputBinding={currentInputBinding}
          paletteMode={params.paletteMode}
          t={t}
        />
      </section>
    </div>
  );
}
