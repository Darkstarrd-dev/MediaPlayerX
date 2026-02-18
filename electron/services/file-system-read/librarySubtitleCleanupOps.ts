import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";

import { normalizeChatCompletionsUrl } from "../../manageAdReview/openAiVisionClient";
import { runProcess } from "../../fileSystemRuntimeHelpers";
import { makeStableId } from "../../fileSystemServiceHelpers";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import { probeSubtitleEngineStatus } from "../../subtitles/subtitleEngineProbe";
import type { ManageSubtitleCleanupTaskDto } from "../../../src/contracts/backend";
import type { RuntimeDependencySnapshot } from "./runtimeDependencyService";
import {
  cuesToSrt,
  extractChatMessageText,
  extractStreamDeltaText,
  SubtitleWorkerClient,
  tryParseSseDataLine,
  type SubtitleWorkerCue,
} from "./subtitleCleanupHelpers";

const SETTINGS_STATE_KEY = "ui_settings_v1";
const SUBTITLE_ASR_INIT_TIMEOUT_MS = 90_000;
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_BASE_MS = 60_000;
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_PER_SEC_MS = 6_000;
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_MIN_MS = 180_000;
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_CAP_MS = 30 * 60_000;
const SUBTITLE_CLEANUP_LLM_TIMEOUT_MS = 3 * 60_000;
const DEFAULT_SUBTITLE_CLEANUP_PROMPT =
  "You are a subtitle cleanup assistant. Keep timing lines and numbering valid SRT format. Only return cleaned full SRT content. Remove obvious ASR mistakes, fix punctuation and segmentation, do not invent content.";

interface PersistedUiSettingsLike {
  subtitleModelDir?: unknown;
  subtitleSelectedModelId?: unknown;
  subtitleLanguage?: unknown;
}

function readSubtitleAsrSettings(database: MediaLibraryDatabase): {
  modelDir: string;
  modelId: string;
  language: string;
} {
  const rawState = database.readAppState<unknown>(SETTINGS_STATE_KEY, null);
  const settings = (
    rawState && typeof rawState === "object" ? rawState : null
  ) as PersistedUiSettingsLike | null;
  const modelDir =
    typeof settings?.subtitleModelDir === "string"
      ? settings.subtitleModelDir.trim()
      : "";
  const modelId =
    typeof settings?.subtitleSelectedModelId === "string"
      ? settings.subtitleSelectedModelId.trim()
      : "";
  const language =
    typeof settings?.subtitleLanguage === "string"
      ? settings.subtitleLanguage.trim()
      : "auto";
  if (!modelDir || !modelId) {
    throw new Error("字幕识别失败：请先在设置中配置离线字幕模型目录和模型ID");
  }
  return { modelDir, modelId, language: language || "auto" };
}

function resolveAsrWorkerPath(): string {
  const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  const candidates: string[] = [];
  if (mainEntry) {
    candidates.push(path.join(path.dirname(mainEntry), "asrWorker.cjs"));
  }
  candidates.push(path.join(process.cwd(), "dist-electron", "asrWorker.cjs"));
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("subtitle_asr_worker_not_found");
}

export async function transcribeVideoToSrt(params: {
  videoPath: string;
  rootDir: string;
  ffmpegBin: string;
  database: MediaLibraryDatabase;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
}): Promise<string> {
  const runtimeDependencies = await params.ensureRuntimeDependencies();
  if (!runtimeDependencies.ffmpeg) {
    throw new Error("字幕识别失败：ffmpeg 不可用");
  }

  const engineStatus = probeSubtitleEngineStatus();
  if (
    !engineStatus.installed ||
    !engineStatus.loadable ||
    !engineStatus.moduleRoot
  ) {
    throw new Error(
      `字幕识别失败：引擎不可用 (${engineStatus.message ?? "unknown"})`,
    );
  }

  const { modelDir, modelId, language } = readSubtitleAsrSettings(
    params.database,
  );
  const cacheDir = path.join(
    params.rootDir,
    ".mediaplayerx",
    "subtitle-cleanup-cache",
  );
  await fs.mkdir(cacheDir, { recursive: true });
  const cacheAudioPath = path.join(
    cacheDir,
    `${makeStableId("subtitle-cleanup-audio", params.videoPath)}.f32le`,
  );

  const ffmpegResult = await runProcess(
    params.ffmpegBin,
    [
      "-y",
      "-i",
      params.videoPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "f32le",
      cacheAudioPath,
    ],
    10 * 60_000,
  );
  if (ffmpegResult.code !== 0) {
    throw new Error(ffmpegResult.stderr.trim() || "字幕识别失败：提取音频失败");
  }

  const audioBuffer = await fs.readFile(cacheAudioPath);
  const workerClient = new SubtitleWorkerClient(
    new Worker(resolveAsrWorkerPath()),
  );
  const cues: SubtitleWorkerCue[] = [];

  try {
    await workerClient.request(
      "init",
      {
        model_dir: modelDir,
        model_id: modelId,
        provider_preference: "auto",
        language,
        fallback_to_cpu: true,
        engine_module_root: engineStatus.moduleRoot,
        available_providers: engineStatus.availableProviders,
      },
      SUBTITLE_ASR_INIT_TIMEOUT_MS,
    );

    const bytesPerSample = 4;
    const sampleRate = 16_000;
    const audioDurationSec =
      audioBuffer.byteLength / bytesPerSample / sampleRate;
    const transcribeTimeoutMs = Math.max(
      SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_MIN_MS,
      Math.min(
        SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_CAP_MS,
        Math.ceil(
          audioDurationSec * SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_PER_SEC_MS,
        ) + SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_BASE_MS,
      ),
    );

    const transcribePayload = await workerClient.request(
      "transcribe-all",
      {
        chunk_base64: audioBuffer.toString("base64"),
        sample_rate_hz: sampleRate,
        channel_count: 1,
        duration_sec: audioDurationSec,
      },
      transcribeTimeoutMs,
    );

    const cueItems = ((transcribePayload as { cues?: unknown }).cues ??
      []) as SubtitleWorkerCue[];
    for (const cue of cueItems) {
      if (cue && typeof cue.text === "string") {
        cues.push(cue);
      }
    }

    if (cues.length === 0) {
      const fallbackText =
        typeof (transcribePayload as { text?: unknown }).text === "string"
          ? (transcribePayload as { text: string }).text.trim()
          : "";
      if (fallbackText) {
        cues.push({
          start_sec: 0,
          end_sec: Math.max(0.8, audioDurationSec),
          text: fallbackText,
        });
      }
    }
  } finally {
    await workerClient
      .request("stop", { reason: "subtitle-cleanup-finished" })
      .catch(() => undefined);
    await workerClient.terminate().catch(() => undefined);
    void fs.rm(cacheAudioPath, { force: true }).catch(() => undefined);
  }

  const mergedCues = cues.filter((cue) => cue.text.trim().length > 0);
  const srtText = cuesToSrt(mergedCues);
  if (!srtText.trim()) {
    throw new Error("字幕识别失败：未生成可用字幕内容");
  }
  return srtText;
}

export async function runCleanupLlmStreaming(params: {
  taskId: string;
  llmEndpoint: string;
  llmModel: string;
  rawSubtitleText: string;
  llmPrompt?: string;
  updateTask: (
    taskId: string,
    updater: (
      task: ManageSubtitleCleanupTaskDto,
    ) => ManageSubtitleCleanupTaskDto,
  ) => ManageSubtitleCleanupTaskDto;
}): Promise<void> {
  const endpoint = normalizeChatCompletionsUrl(params.llmEndpoint);
  const model = params.llmModel.trim();
  if (!model) {
    throw new Error("字幕清洗失败：LLM 模型不能为空");
  }
  const systemPrompt =
    params.llmPrompt?.trim() || DEFAULT_SUBTITLE_CLEANUP_PROMPT;

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, SUBTITLE_CLEANUP_LLM_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MEDIA_PLAYERX_LLM_API_KEY?.trim() || "lm-studio"}`,
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: params.rawSubtitleText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `字幕清洗失败：HTTP ${response.status} ${response.statusText} - ${errorText.slice(0, 300)}`,
      );
    }

    const body = response.body;
    if (!body) {
      const payload = await response.json().catch(() => null);
      const oneShotText = extractChatMessageText(payload);
      params.updateTask(params.taskId, (task) => ({
        ...task,
        cleaned_subtitle_text: oneShotText.trim(),
        cleanup_stage: "ready",
        updated_at_ms: Date.now(),
      }));
      return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffered = "";
    let streamedText = "";
    let streamTouched = false;
    let receivedDone = false;

    while (!receivedDone) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? "";

      for (const line of lines) {
        const payloadText = tryParseSseDataLine(line);
        if (!payloadText) {
          continue;
        }
        if (payloadText === "[DONE]") {
          receivedDone = true;
          break;
        }
        let payload: unknown = null;
        try {
          payload = JSON.parse(payloadText);
        } catch {
          continue;
        }
        const delta = extractStreamDeltaText(payload);
        if (!delta) {
          continue;
        }
        streamTouched = true;
        streamedText += delta;
        params.updateTask(params.taskId, (task) => ({
          ...task,
          cleanup_stage: "running",
          cleaned_subtitle_text: streamedText,
          updated_at_ms: Date.now(),
        }));
      }
    }

    if (receivedDone) {
      await reader.cancel().catch(() => undefined);
    }

    if (!streamTouched && buffered.trim()) {
      let payload: unknown = null;
      try {
        payload = JSON.parse(buffered);
      } catch {
        payload = null;
      }
      streamedText = extractChatMessageText(payload);
    }

    params.updateTask(params.taskId, (task) => ({
      ...task,
      cleaned_subtitle_text: streamedText.trim(),
      cleanup_stage: "ready",
      updated_at_ms: Date.now(),
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("字幕清洗失败：LLM 请求超时");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
