import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import type { AppSettings } from "../../contracts/settings";
import { useMusicVisualizerRuntime } from "../../features/music-visualizer/useMusicVisualizerRuntime";

interface ShaderPreviewCanvasProps {
  runtimeMode: "legacy" | "plugin";
  selectedShaderId: string;
  shaderSettings: AppSettings["musicVisualizerShaderSettingsById"][string];
  previewFpsCap: 30 | 60 | 120;
  previewRenderLongEdgePx: number;
  previewInputSource: PreviewInputSource;
  onPreviewInputSourceChange: (value: PreviewInputSource) => void;
  pluginInputBinding: AppSettings["musicVisualizerPluginInputBindingsByShaderId"][string];
  paletteMode: "day" | "night";
  t: (key: string, values?: Record<string, string | number>) => string;
}

type DemoAudioFrame = {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  audioLevel: number;
  audioBeat: number;
};

type PreviewInputSource = "demo" | "player";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createDemoAudioFrame(timeSec: number): DemoAudioFrame {
  const frequencyData = new Uint8Array(512);
  const waveformData = new Uint8Array(512);
  const pulse = Math.max(0, Math.sin(timeSec * 2.2));
  const audioLevel = clamp01(0.22 + pulse * 0.62);
  const audioBeat = clamp01(Math.pow(pulse, 2.6));

  for (let index = 0; index < 512; index += 1) {
    const x = index / 511;
    const low = Math.exp(-Math.pow((x - 0.12) / 0.14, 2));
    const mid = Math.exp(-Math.pow((x - 0.36) / 0.2, 2));
    const high = Math.exp(-Math.pow((x - 0.72) / 0.22, 2));
    const sweep = clamp01((Math.sin(timeSec * 0.9 + x * 8) + 1) * 0.5);
    const energy = clamp01(
      0.1 +
        low * (0.45 + audioLevel * 0.5) +
        mid * (0.25 + sweep * 0.45) +
        high * (0.15 + audioBeat * 0.55),
    );
    frequencyData[index] = Math.round(clamp01(energy) * 255);

    const baseWave = Math.sin(timeSec * 7.2 + x * 12);
    const harmonic = Math.sin(timeSec * 14.4 + x * 31.4) * 0.35;
    const mixed = (baseWave + harmonic) * (0.22 + audioLevel * 0.48);
    waveformData[index] = Math.round(clamp01(0.5 + mixed * 0.5) * 255);
  }

  return {
    frequencyData,
    waveformData,
    audioLevel,
    audioBeat,
  };
}

function to512Bins(raw: number[] | Uint8Array): Uint8Array {
  const output = new Uint8Array(512);
  const sourceLength = raw.length;
  if (sourceLength <= 0) {
    return output;
  }
  const maxIndex = sourceLength - 1;
  for (let index = 0; index < 512; index += 1) {
    const sourceIndex = Math.round((index / 511) * maxIndex);
    const value = raw[sourceIndex] ?? 0;
    output[index] = Math.max(0, Math.min(255, Math.round(value)));
  }
  return output;
}

export function ShaderPreviewCanvas({
  runtimeMode,
  selectedShaderId,
  shaderSettings,
  previewFpsCap,
  previewRenderLongEdgePx,
  previewInputSource,
  onPreviewInputSourceChange,
  pluginInputBinding,
  paletteMode,
  t,
}: ShaderPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cpuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [demoAudioFrame, setDemoAudioFrame] = useState<DemoAudioFrame | null>(
    () => createDemoAudioFrame(0),
  );
  const [playerAudioFrame, setPlayerAudioFrame] = useState<DemoAudioFrame | null>(
    null,
  );
  const [playerInputMessage, setPlayerInputMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (
      !previewEnabled ||
      previewInputSource !== "demo" ||
      typeof window === "undefined"
    ) {
      return;
    }

    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsedSec = (performance.now() - startedAt) / 1000;
      setDemoAudioFrame(createDemoAudioFrame(elapsedSec));
    }, 33);

    return () => {
      window.clearInterval(timer);
    };
  }, [previewEnabled, previewInputSource]);

  useEffect(() => {
    if (
      !previewEnabled ||
      previewInputSource !== "player" ||
      typeof window === "undefined"
    ) {
      return;
    }

    const readFrame = window.mediaPlayerBackend?.readAudioEngineAnalysisFrame;
    if (typeof readFrame !== "function") {
      setPlayerInputMessage(t("ui.settings.shaderPreviewInputPlayerUnavailable"));
      return;
    }

    let disposed = false;
    let pending = false;
    const timer = window.setInterval(() => {
      if (disposed || pending) {
        return;
      }
      pending = true;
      void readFrame()
        .then((response) => {
          if (disposed) {
            return;
          }
          if (!response.ok || !response.loaded) {
            setPlayerInputMessage(
              response.message ?? t("ui.settings.shaderPreviewInputPlayerIdle"),
            );
            return;
          }

          setPlayerInputMessage(null);
          setPlayerAudioFrame({
            frequencyData: to512Bins(response.frequency_bins),
            waveformData: to512Bins(response.waveform_bins),
            audioLevel: clamp01(response.audio_level),
            audioBeat: clamp01(response.audio_beat),
          });
        })
        .catch((error: unknown) => {
          if (disposed) {
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : t("ui.settings.shaderPreviewInputPlayerUnavailable");
          setPlayerInputMessage(message);
        })
        .finally(() => {
          pending = false;
        });
    }, 66);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [previewEnabled, previewInputSource, t]);

  const externalAudioFrame =
    previewInputSource === "player"
      ? playerAudioFrame ?? demoAudioFrame
      : demoAudioFrame;

  const runtime = useMusicVisualizerRuntime({
    canvasRef: canvasRef as RefObject<HTMLCanvasElement | null>,
    cpuCanvasRef: cpuCanvasRef as RefObject<HTMLCanvasElement | null>,
    audioRef: audioRef as RefObject<HTMLAudioElement | null>,
    active: previewEnabled,
    playbackPaused: false,
    preferredRenderer: shaderSettings.renderer,
    renderLongEdgePx: previewRenderLongEdgePx,
    renderScaleCoeff: shaderSettings.renderScaleCoeff,
    layeredBackgroundShaderId: shaderSettings.layeredBackgroundShaderId,
    layeredForegroundShaderId: shaderSettings.layeredForegroundShaderId,
    layeredBackgroundEnabled: shaderSettings.layeredBackgroundEnabled,
    layeredForegroundEnabled: shaderSettings.layeredForegroundEnabled,
    layeredForegroundOffsetX: shaderSettings.layeredForegroundOffsetX,
    layeredForegroundOffsetY: shaderSettings.layeredForegroundOffsetY,
    layeredForegroundScale: shaderSettings.layeredForegroundScale,
    paletteMode,
    fpsCap: previewFpsCap,
    toneMapMode: shaderSettings.toneMapMode,
    toneMapExposure: shaderSettings.toneMapExposure,
    toneMapStrength: shaderSettings.toneMapStrength,
    selectedShaderId,
    disableAudioAnalyser: true,
    externalAudioFrame,
    pluginInputBinding,
    mode: runtimeMode,
  });

  const statusText = useMemo(() => {
    if (runtime.runtimeError) {
      return t("ui.settings.shaderPreviewRuntimeError", {
        message: runtime.runtimeError,
      });
    }
    if (playerInputMessage && previewInputSource === "player") {
      return t("ui.settings.shaderPreviewInputPlayerMessage", {
        message: playerInputMessage,
      });
    }
    const backend = runtime.activeBackend ?? "-";
    const fps = runtime.stats?.fps ?? 0;
    return t("ui.settings.shaderPreviewRuntime", {
      backend,
      fps: fps.toFixed(1),
    });
  }, [
    previewInputSource,
    playerInputMessage,
    runtime.activeBackend,
    runtime.runtimeError,
    runtime.stats?.fps,
    t,
  ]);

  return (
    <div className="settings-shader-preview-shell">
      <div className="settings-shader-preview-toolbar">
        <button
          type="button"
          onClick={() => setPreviewEnabled((value) => !value)}
        >
          {previewEnabled
            ? t("ui.settings.shaderPreviewStop")
            : t("ui.settings.shaderPreviewStart")}
        </button>
        <label className="settings-shader-preview-source-label">
          <span>{t("ui.settings.shaderPreviewInputSource")}</span>
          <select
            value={previewInputSource}
            onChange={(event) =>
              onPreviewInputSourceChange(
                event.target.value as PreviewInputSource,
              )
            }
          >
            <option value="demo">{t("ui.settings.shaderPreviewInputDemo")}</option>
            <option value="player">
              {t("ui.settings.shaderPreviewInputPlayer")}
            </option>
          </select>
        </label>
        <span className="settings-shader-preview-status">{statusText}</span>
      </div>

      <div className="settings-shader-preview-stage">
        <canvas ref={canvasRef} className="settings-shader-preview-canvas" />
        <canvas
          ref={cpuCanvasRef}
          className="settings-shader-preview-canvas settings-shader-preview-canvas-cpu"
          aria-hidden="true"
        />
        <audio ref={audioRef} className="settings-shader-preview-audio" />
      </div>
    </div>
  );
}
