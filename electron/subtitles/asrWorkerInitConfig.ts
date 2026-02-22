import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type StartSubtitleSessionRequestDto,
  type SubtitleSessionEventDto,
  type SubtitleSessionProviderDto,
} from "../../src/contracts/backend";

export interface InitRequestPayload extends StartSubtitleSessionRequestDto {
  engine_module_root: string;
  available_providers: Array<"cpu" | "directml">;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveModelRootDir(
  modelDir: string,
  modelId: string,
): Promise<string> {
  const normalizedDir = path.resolve(modelDir);
  const candidates = [path.join(normalizedDir, modelId), normalizedDir];

  const isValidModelDir = async (candidate: string): Promise<boolean> => {
    if (!(await pathExists(candidate))) {
      return false;
    }

    const tokensPath = path.join(candidate, "tokens.txt");
    if (!(await pathExists(tokensPath))) {
      return false;
    }

    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = [];
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true });
    } catch {
      return false;
    }

    return entries.some(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".onnx"),
    );
  };

  for (const candidate of candidates) {
    if (await isValidModelDir(candidate)) {
      return candidate;
    }
  }

  let dirEntries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = [];
  try {
    dirEntries = await fs.readdir(normalizedDir, { withFileTypes: true });
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`);
  }

  const fallbackSubdirs = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizedDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  for (const candidate of fallbackSubdirs) {
    if (await isValidModelDir(candidate)) {
      return candidate;
    }
  }

  throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`);
}

export async function resolveModelOnnxPath(
  modelRootDir: string,
): Promise<string> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = [];
  try {
    entries = await fs.readdir(modelRootDir, { withFileTypes: true });
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`);
  }

  const modelFileNames = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".onnx"),
    )
    .map((entry) => entry.name);

  if (modelFileNames.length === 0) {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`);
  }

  const preferred =
    modelFileNames.find((name) => name.toLowerCase() === "model.int8.onnx") ??
    modelFileNames.find((name) => name.toLowerCase() === "model.onnx") ??
    modelFileNames[0];

  return path.join(modelRootDir, preferred);
}

export async function resolveAuxiliaryModelPath(
  modelRootDir: string,
  matcher: (lowerName: string) => boolean,
): Promise<string | null> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = [];
  try {
    entries = await fs.readdir(modelRootDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const match = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".onnx"),
    )
    .map((entry) => entry.name)
    .find((name) => matcher(name.toLowerCase()));

  if (!match) {
    return null;
  }
  return path.join(modelRootDir, match);
}

export function chooseProvider(
  payload: InitRequestPayload,
  createEvent: (
    code: string,
    level: SubtitleSessionEventDto["level"],
    message: string,
  ) => SubtitleSessionEventDto,
): {
  provider: SubtitleSessionProviderDto;
  fallbackApplied: boolean;
  events: SubtitleSessionEventDto[];
} {
  const available = new Set(payload.available_providers);
  const events: SubtitleSessionEventDto[] = [];

  if (!available.has("cpu")) {
    throw new Error("subtitle_provider_unavailable:cpu");
  }

  if (payload.provider_preference === "cpu") {
    return {
      provider: "cpu",
      fallbackApplied: false,
      events,
    };
  }

  if (available.has("directml")) {
    return {
      provider: "directml",
      fallbackApplied: false,
      events,
    };
  }

  if (!payload.fallback_to_cpu) {
    throw new Error("subtitle_provider_unavailable:directml");
  }

  events.push(
    createEvent(
      "provider_fallback",
      "warning",
      `directml unavailable, fallback to cpu (${payload.provider_preference})`,
    ),
  );

  return {
    provider: "cpu",
    fallbackApplied: true,
    events,
  };
}

export function resolveVadTuning(payload: InitRequestPayload): {
  threshold: number;
  minSilenceDuration: number;
  minSpeechDuration: number;
  maxSpeechDuration: number;
} {
  const preset = payload.advanced_options?.vad?.preset ?? "balanced";
  const presetDefaults =
    preset === "conservative"
      ? {
          threshold: 0.52,
          minSilenceDuration: 0.45,
          minSpeechDuration: 0.25,
          maxSpeechDuration: 20,
        }
      : preset === "aggressive"
        ? {
            threshold: 0.36,
            minSilenceDuration: 0.1,
            minSpeechDuration: 0.15,
            maxSpeechDuration: 3,
          }
        : {
            threshold: 0.42,
            minSilenceDuration: 0.14,
            minSpeechDuration: 0.18,
            maxSpeechDuration: 3,
          };

  return {
    threshold:
      payload.advanced_options?.vad?.threshold ?? presetDefaults.threshold,
    minSilenceDuration:
      payload.advanced_options?.vad?.min_silence_sec ??
      presetDefaults.minSilenceDuration,
    minSpeechDuration:
      payload.advanced_options?.vad?.min_speech_sec ??
      presetDefaults.minSpeechDuration,
    maxSpeechDuration:
      payload.advanced_options?.vad?.max_speech_sec ??
      presetDefaults.maxSpeechDuration,
  };
}

export function resolveSpeakerThreshold(payload: InitRequestPayload): number {
  return payload.advanced_options?.speaker?.similarity_threshold ?? 0.5;
}
