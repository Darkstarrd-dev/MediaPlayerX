import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type StartSubtitleSessionRequestDto,
  type SubtitleSessionEventDto,
  type SubtitleSessionProviderDto,
} from "../../src/contracts/backend";

type DirEntry = {
  isFile: () => boolean;
  isDirectory: () => boolean;
  name: string;
};

export interface InitRequestPayload extends StartSubtitleSessionRequestDto {
  engine_module_root: string;
  available_providers: Array<"cpu" | "directml">;
}

export type SubtitleModelFamily = "sensevoice" | "funasr-nano";

export type ResolvedSubtitleModelAssets =
  | {
      family: "sensevoice";
      modelRootDir: string;
      modelPath: string;
      tokensPath: string;
    }
  | {
      family: "funasr-nano";
      modelRootDir: string;
      encoderAdaptorPath: string;
      llmPath: string;
      embeddingPath: string;
      tokenizerDir: string;
    };

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
  const resolved = await resolveSubtitleModelAssets(modelDir, modelId);
  return resolved.modelRootDir;
}

export async function resolveModelOnnxPath(
  modelRootDir: string,
): Promise<string> {
  const entries = await readDirEntries(modelRootDir);
  if (entries.length === 0) {
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

function resolveModelFamily(modelId: string): SubtitleModelFamily {
  const normalized = modelId.trim().toLowerCase();
  if (normalized.includes("funasr") || normalized.includes("nano")) {
    return "funasr-nano";
  }
  return "sensevoice";
}

async function readDirEntries(
  candidate: string,
): Promise<DirEntry[]> {
  try {
    const entries = await fs.readdir(candidate, {
      withFileTypes: true,
      encoding: "utf8",
    });
    return entries as unknown as DirEntry[];
  } catch {
    return [];
  }
}

function findPreferredOnnxFile(
  entries: DirEntry[],
  preferredLowerNames: string[],
): string | null {
  const onnxNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".onnx"))
    .map((entry) => entry.name);
  if (onnxNames.length === 0) {
    return null;
  }

  for (const preferredName of preferredLowerNames) {
    const match = onnxNames.find(
      (item) => item.toLowerCase() === preferredName.toLowerCase(),
    );
    if (match) {
      return match;
    }
  }

  return onnxNames[0] ?? null;
}

async function resolveSenseVoiceAssetsFromCandidate(
  candidate: string,
): Promise<ResolvedSubtitleModelAssets | null> {
  if (!(await pathExists(candidate))) {
    return null;
  }

  const tokensPath = path.join(candidate, "tokens.txt");
  if (!(await pathExists(tokensPath))) {
    return null;
  }

  const entries = await readDirEntries(candidate);
  const modelFileName = findPreferredOnnxFile(entries, [
    "model.int8.onnx",
    "model.onnx",
  ]);
  if (!modelFileName) {
    return null;
  }

  return {
    family: "sensevoice",
    modelRootDir: candidate,
    modelPath: path.join(candidate, modelFileName),
    tokensPath,
  };
}

function findFunasrTokenizerSubdir(
  candidate: string,
  entries: DirEntry[],
): string | null {
  const tokenizerCandidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(candidate, entry.name));
  const preferred = tokenizerCandidates.find((item) => {
    const lower = path.basename(item).toLowerCase();
    return lower.includes("qwen") || lower.includes("tokenizer");
  });
  return preferred ?? tokenizerCandidates[0] ?? null;
}

async function resolveFunasrNanoAssetsFromCandidate(
  candidate: string,
): Promise<ResolvedSubtitleModelAssets | null> {
  if (!(await pathExists(candidate))) {
    return null;
  }

  const entries = await readDirEntries(candidate);
  if (entries.length === 0) {
    return null;
  }

  const pickByPrefix = (prefix: string): string | null => {
    return (
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.toLowerCase().endsWith(".onnx") &&
            entry.name.toLowerCase().startsWith(prefix),
        )
        .map((entry) => entry.name)[0] ?? null
    );
  };

  const encoderAdaptorName = pickByPrefix("encoder_adaptor");
  const llmName = pickByPrefix("llm");
  const embeddingName = pickByPrefix("embedding");
  if (!encoderAdaptorName || !llmName || !embeddingName) {
    return null;
  }

  const tokenizerDir = findFunasrTokenizerSubdir(candidate, entries);
  if (!tokenizerDir) {
    return null;
  }

  const tokenizerJsonPath = path.join(tokenizerDir, "tokenizer.json");
  if (!(await pathExists(tokenizerJsonPath))) {
    return null;
  }

  return {
    family: "funasr-nano",
    modelRootDir: candidate,
    encoderAdaptorPath: path.join(candidate, encoderAdaptorName),
    llmPath: path.join(candidate, llmName),
    embeddingPath: path.join(candidate, embeddingName),
    tokenizerDir,
  };
}

async function resolveCandidateAssets(
  candidate: string,
  family: SubtitleModelFamily,
): Promise<ResolvedSubtitleModelAssets | null> {
  if (family === "funasr-nano") {
    return await resolveFunasrNanoAssetsFromCandidate(candidate);
  }
  return await resolveSenseVoiceAssetsFromCandidate(candidate);
}

export async function resolveSubtitleModelAssets(
  modelDir: string,
  modelId: string,
): Promise<ResolvedSubtitleModelAssets> {
  const normalizedDir = path.resolve(modelDir);
  const family = resolveModelFamily(modelId);
  const candidates = [path.join(normalizedDir, modelId), normalizedDir];

  if (!(await pathExists(normalizedDir))) {
    throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`);
  }
  const dirEntries = await readDirEntries(normalizedDir);

  const fallbackSubdirs = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizedDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const seen = new Set<string>();
  for (const candidate of [...candidates, ...fallbackSubdirs]) {
    const absoluteCandidate = path.resolve(candidate);
    if (seen.has(absoluteCandidate)) {
      continue;
    }
    seen.add(absoluteCandidate);
    const resolved = await resolveCandidateAssets(absoluteCandidate, family);
    if (resolved) {
      return resolved;
    }
  }

  throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`);
}

export async function resolveAuxiliaryModelPath(
  modelRootDir: string,
  matcher: (lowerName: string) => boolean,
): Promise<string | null> {
  const entries = await readDirEntries(modelRootDir);
  if (entries.length === 0) {
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
