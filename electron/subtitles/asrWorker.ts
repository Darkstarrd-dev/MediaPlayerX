import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parentPort } from "node:worker_threads";

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type PushSubtitleAudioRequestDto,
  type ResetSubtitleSessionRequestDto,
  type StopSubtitleSessionRequestDto,
  type SubtitleCueDto,
  type SubtitleSessionEventDto,
} from "../../src/contracts/backend";
import {
  SUBTITLE_WORKER_HEARTBEAT_INTERVAL_MS,
  type SubtitleWorkerCommand,
  type SubtitleWorkerIncomingEnvelope,
} from "./subtitleWorkerProtocol";
import {
  type RuntimeSessionState,
  type SpeakerExtractorLike,
  type SpeakerRuntime,
  type TranscribeAllRequestPayload,
  type VadLike,
  type VadRuntime,
} from "./asrWorkerTypes";
import {
  chooseProvider,
  type InitRequestPayload,
  resolveAuxiliaryModelPath,
  resolveSubtitleModelAssets,
  resolveSpeakerThreshold,
  resolveVadTuning,
} from "./asrWorkerInitConfig";
import {
  calculateRms,
  decodeFloat32Buffer,
  downmixToMono,
  normalizeRecognizedText,
  normalizeRequestedLanguage,
  sanitizePayloadForPostMessage,
} from "./asrWorkerUtils";
import {
  clearPendingSwitch,
  buildOfflineResultCues,
  consumeVadSegments,
  maybeBuildSpeakerThresholdHint,
  tryDecodeAndBuildCues,
} from "./asrWorkerSpeech";
const SUBTITLE_DEBUG_LOGS =
  process.env.SUBTITLE_DEBUG_LOGS === "1" ||
  process.env.SUBTITLE_DEBUG_LOGS === "true";

let runtimeSession: RuntimeSessionState | null = null;
const cancelledRequestIds = new Set<string>();

function emitWorkerDebug(
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!SUBTITLE_DEBUG_LOGS) {
    return;
  }
  console.info(
    "[subtitle][worker]",
    JSON.stringify({
      event,
      at_ms: nowMs(),
      ...payload,
    }),
  );
}

function nowMs(): number {
  return Date.now();
}

function createEvent(
  code: string,
  level: SubtitleSessionEventDto["level"],
  message: string,
): SubtitleSessionEventDto {
  return {
    code,
    level,
    message,
    at_ms: nowMs(),
  };
}

function bindIncomingMessageChannel(handler: (message: unknown) => void): void {
  if (parentPort) {
    parentPort.on("message", handler);
    return;
  }

  process.on("message", handler);
}

function postOutgoingMessage(payload: unknown): void {
  if (parentPort) {
    parentPort.postMessage(payload);
    return;
  }

  if (typeof process.send === "function") {
    process.send(payload);
  }
}

function startHeartbeat(): void {
  const timer = setInterval(() => {
    postOutgoingMessage({
      kind: "heartbeat",
      worker_pid: process.pid,
      at_ms: Date.now(),
    });
  }, SUBTITLE_WORKER_HEARTBEAT_INTERVAL_MS);

  timer.unref?.();
}

function ensureSession(): RuntimeSessionState {
  if (!runtimeSession) {
    throw new Error("subtitle_session_not_running");
  }
  return runtimeSession;
}

function loadSherpaModule(moduleRoot: string): {
  OfflineRecognizer: new (config: unknown) => {
    createStream: () => {
      acceptWaveform: (obj: {
        samples: Float32Array;
        sampleRate: number;
      }) => void;
    };
    decode: (stream: {
      acceptWaveform: (obj: {
        samples: Float32Array;
        sampleRate: number;
      }) => void;
    }) => void;
    getResult: (stream: {
      acceptWaveform: (obj: {
        samples: Float32Array;
        sampleRate: number;
      }) => void;
    }) => {
      lang?: string;
      text?: string;
      tokens?: string[];
      timestamps?: number[];
      durations?: number[];
    };
  };
  VoiceActivityDetector?: new (config: unknown) => VadLike;
  Vad?: new (config: unknown, bufferSizeInSeconds?: number) => VadLike;
  SpeakerEmbeddingExtractor?: new (config: unknown) => SpeakerExtractorLike;
} {
  const packageJsonPath = path.join(moduleRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`subtitle_engine_package_not_found:${packageJsonPath}`);
  }

  const moduleRequire = createRequire(packageJsonPath);
  return moduleRequire("sherpa-onnx-node") as {
    OfflineRecognizer: new (config: unknown) => {
      createStream: () => {
        acceptWaveform: (obj: {
          samples: Float32Array;
          sampleRate: number;
        }) => void;
      };
      decode: (stream: {
        acceptWaveform: (obj: {
          samples: Float32Array;
          sampleRate: number;
        }) => void;
      }) => void;
      getResult: (stream: {
        acceptWaveform: (obj: {
          samples: Float32Array;
          sampleRate: number;
        }) => void;
      }) => {
        lang?: string;
        text?: string;
        tokens?: string[];
        timestamps?: number[];
        durations?: number[];
      };
    };
    VoiceActivityDetector?: new (config: unknown) => VadLike;
    Vad?: new (config: unknown, bufferSizeInSeconds?: number) => VadLike;
    SpeakerEmbeddingExtractor?: new (config: unknown) => SpeakerExtractorLike;
  };
}

async function handleInit(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as InitRequestPayload;
  const sherpa = loadSherpaModule(path.resolve(payload.engine_module_root));

  const modelAssets = await resolveSubtitleModelAssets(
    payload.model_dir,
    payload.model_id,
  );
  const modelRootDir = modelAssets.modelRootDir;
  const providerDecision = chooseProvider(payload, createEvent);
  const runtimeEvents = [...providerDecision.events];

  const modelDirRootCandidate = path.resolve(payload.model_dir);
  const modelRootParentCandidate = path.dirname(modelRootDir);
  const modelDirParentCandidate = path.dirname(modelDirRootCandidate);
  const auxiliaryCandidates = [
    modelRootDir,
    modelDirRootCandidate,
    modelRootParentCandidate,
    modelDirParentCandidate,
  ];
  const resolveFromCandidates = async (
    matcher: (name: string) => boolean,
    options?: {
      preferredExactFileNames?: string[];
      maxDepth?: number;
    },
  ): Promise<string | null> => {
    const seenAuxiliaryCandidates = new Set<string>();
    for (let index = 0; index < auxiliaryCandidates.length; index += 1) {
      const candidate = path.resolve(auxiliaryCandidates[index]);
      if (seenAuxiliaryCandidates.has(candidate)) {
        continue;
      }
      seenAuxiliaryCandidates.add(candidate);
      const resolved = await resolveAuxiliaryModelPath(
        candidate,
        matcher,
        options,
      );
      if (resolved) {
        return resolved;
      }
    }
    return null;
  };
  const vadModelPath = await resolveFromCandidates(
    (name) => name.includes("silero") && name.includes("vad"),
    {
      preferredExactFileNames: ["silero_vad.onnx"],
      maxDepth: 3,
    },
  );
  const speakerModelPath = await resolveFromCandidates(
    (name) =>
      name.includes("eres2net") ||
      (name.includes("3dspeaker") && name.includes("sv")),
    {
      maxDepth: 3,
    },
  );
  const normalizedLanguage = normalizeRequestedLanguage(payload.language);
  const vadTuning = resolveVadTuning(payload);
  const speakerThreshold = resolveSpeakerThreshold(payload);
  const recognizer =
    modelAssets.family === "funasr-nano"
      ? new sherpa.OfflineRecognizer({
          featConfig: {
            sampleRate: 16_000,
            featureDim: 80,
          },
          modelConfig: {
            funasrNano: {
              encoderAdaptor: modelAssets.encoderAdaptorPath,
              llm: modelAssets.llmPath,
              embedding: modelAssets.embeddingPath,
              tokenizer: modelAssets.tokenizerDir,
              language: normalizedLanguage,
              itn: 1,
              maxNewTokens: 512,
              temperature: 0.000001,
              topP: 0.8,
            },
            provider: providerDecision.provider,
            numThreads: 2,
          },
        })
      : new sherpa.OfflineRecognizer({
          featConfig: {
            sampleRate: 16_000,
            featureDim: 80,
          },
          modelConfig: {
            senseVoice: {
              model: modelAssets.modelPath,
              language: normalizedLanguage,
              useInverseTextNormalization:
                normalizedLanguage === "zh" || normalizedLanguage === "yue"
                  ? 1
                  : 0,
            },
            tokens: modelAssets.tokensPath,
            provider: providerDecision.provider,
            numThreads: 2,
          },
        });

  runtimeEvents.push(
    createEvent(
      "model_family",
      "info",
      modelAssets.family === "funasr-nano" ? "funasr-nano" : "sensevoice",
    ),
  );
  const stream = recognizer.createStream();

  let vad: VadRuntime | null = null;
  const VadConstructor = sherpa.VoiceActivityDetector ?? sherpa.Vad;
  const wantsVad =
    payload.render_mode === "advanced" || payload.render_mode === "simple";
  if (wantsVad && VadConstructor && vadModelPath) {
    try {
      const detector = new VadConstructor(
        {
          sileroVad: {
            model: vadModelPath,
            threshold: vadTuning.threshold,
            minSilenceDuration: vadTuning.minSilenceDuration,
            minSpeechDuration: vadTuning.minSpeechDuration,
            maxSpeechDuration: vadTuning.maxSpeechDuration,
          },
          sampleRate: 16_000,
          numThreads: 2,
        },
        30,
      );
      vad = { detector };
    } catch (error) {
      runtimeEvents.push(
        createEvent(
          "advanced_vad_init_failed",
          "warning",
          error instanceof Error ? error.message : String(error),
        ),
      );
      console.warn("[subtitle-asr] VAD init failed", {
        model_dir: payload.model_dir,
        model_root_dir: modelRootDir,
        vad_model_path: vadModelPath,
        has_vad_constructor: Boolean(VadConstructor),
      });
    }
  } else if (wantsVad) {
    const unavailableReason =
      !VadConstructor && !vadModelPath
        ? "missing_constructor_and_model"
        : !VadConstructor
          ? "missing_constructor"
          : "missing_model";
    const unavailableMessage =
      `silero vad model or constructor is unavailable; ` +
      `reason=${unavailableReason}; ` +
      `model_dir=${payload.model_dir}; ` +
      `model_root_dir=${modelRootDir}; ` +
      `vad_model_path=${vadModelPath ?? "null"}; ` +
      `fallback to legacy decoding`;
    runtimeEvents.push(
      createEvent("advanced_vad_unavailable", "warning", unavailableMessage),
    );
    console.warn("[subtitle-asr] VAD unavailable", {
      reason: unavailableReason,
      model_dir: payload.model_dir,
      model_root_dir: modelRootDir,
      vad_model_path: vadModelPath,
      has_vad_constructor: Boolean(VadConstructor),
    });
  }

  let speaker: SpeakerRuntime | null = null;
  if (
    payload.render_mode === "advanced" &&
    sherpa.SpeakerEmbeddingExtractor &&
    speakerModelPath
  ) {
    try {
      const extractor = new sherpa.SpeakerEmbeddingExtractor({
        model: speakerModelPath,
        numThreads: 1,
      });
      speaker = {
        extractor,
        profiles: [],
        currentSpeakerId: null,
        lastSwitchSec: -1,
        pendingSwitchSpeakerId: null,
        pendingSwitchCount: 0,
        pendingSwitchDurationSec: 0,
        pendingSwitchScoreSum: 0,
        pendingSwitchIsNew: false,
        pendingSwitchEmbedding: null,
        recentBestScores: [],
        segmentCount: 0,
        lastHintSegmentCount: 0,
      };
    } catch (error) {
      runtimeEvents.push(
        createEvent(
          "advanced_speaker_init_failed",
          "warning",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  } else if (payload.render_mode === "advanced") {
    const exportKeys = Object.keys(sherpa).sort().join(",");
    const unavailableReason =
      !sherpa.SpeakerEmbeddingExtractor && !speakerModelPath
        ? "missing_constructor_and_model"
        : !sherpa.SpeakerEmbeddingExtractor
          ? "missing_constructor"
          : "missing_model";
    runtimeEvents.push(
      createEvent(
        "advanced_speaker_unavailable",
        "warning",
        `speaker embedding model or constructor is unavailable; reason=${unavailableReason}; speaker split is disabled`,
      ),
    );
    console.warn("[subtitle-asr] speaker unavailable", {
      reason: unavailableReason,
      model_dir: payload.model_dir,
      model_root_dir: modelRootDir,
      speaker_model_path: speakerModelPath,
      has_speaker_constructor: Boolean(sherpa.SpeakerEmbeddingExtractor),
      exports: exportKeys,
    });
  }

  const sessionId = `subtitle-session-${nowMs()}-${Math.floor(Math.random() * 100_000)}`;
  const startedAtMs = nowMs();

  runtimeSession = {
    sessionId,
    sessionEpoch: 0,
    lastChunkSeq: -1,
    provider: providerDecision.provider,
    startedAtMs,
    modelRootDir,
    language: payload.language,
    fallbackApplied: providerDecision.fallbackApplied,
    lastChunkEndSec: 0,
    recognizer,
    stream,
    sampleRateHz: 16_000,
    pendingSamplesSinceDecode: 0,
    committedText: "",
    simpleLastRawText: "",
    simpleWindowText: "",
    simpleLastNonEmptySec: 0,
    cueSeed: 0,
    requestedLanguage: normalizedLanguage,
    renderMode: payload.render_mode ?? "advanced",
    lastSpeechEndSec: 0,
    vad,
    speaker,
    lineBySpeaker: new Map<number, "A" | "B">(),
    currentLineId: null,
    lineSwitchSec: -1,
    lineStreakCount: 0,
    similarityThreshold: speakerThreshold,
    profileUpdateAlpha: 0.3,
  };

  console.log(
    `[ASR] Session started: ${payload.render_mode ?? "advanced"} mode, language: ${normalizedLanguage}`,
  );

  return startSubtitleSessionResponseSchema.parse({
    session_id: sessionId,
    provider: providerDecision.provider,
    fallback_applied: providerDecision.fallbackApplied,
    events: runtimeEvents,
    started_at_ms: startedAtMs,
  });
}

async function handleStop(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as StopSubtitleSessionRequestDto;
  const currentSession = runtimeSession;
  runtimeSession = null;

  const response = stopSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    stopped: Boolean(currentSession),
    updated_at_ms: nowMs(),
  });

  void request;
  return response;
}

function resetSessionStateForTimeline(
  currentSession: RuntimeSessionState,
  timelineSec: number,
): void {
  currentSession.lastChunkEndSec = Math.max(0, timelineSec);
  currentSession.stream = currentSession.recognizer.createStream();
  currentSession.pendingSamplesSinceDecode = 0;
  currentSession.committedText = "";
  currentSession.simpleLastRawText = "";
  currentSession.simpleWindowText = "";
  currentSession.simpleLastNonEmptySec = Math.max(0, timelineSec);
  currentSession.lastChunkSeq = -1;
  currentSession.lineBySpeaker.clear();
  currentSession.currentLineId = null;
  currentSession.lineSwitchSec = Math.max(0, timelineSec);
  currentSession.lineStreakCount = 0;
  currentSession.speaker?.profiles.splice(
    0,
    currentSession.speaker.profiles.length,
  );
  if (currentSession.speaker) {
    currentSession.speaker.currentSpeakerId = null;
    currentSession.speaker.lastSwitchSec = -1;
    clearPendingSwitch(currentSession.speaker);
    currentSession.speaker.recentBestScores = [];
    currentSession.speaker.segmentCount = 0;
    currentSession.speaker.lastHintSegmentCount = 0;
  }
}

async function handleReset(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as ResetSubtitleSessionRequestDto;
  const currentSession = runtimeSession;
  if (!currentSession) {
    return resetSubtitleSessionResponseSchema.parse({
      session_id: null,
      ok: false,
      events: [
        createEvent(
          "session_not_running",
          "warning",
          "subtitle session is not running",
        ),
      ],
      updated_at_ms: nowMs(),
    });
  }

  resetSessionStateForTimeline(
    currentSession,
    request.timeline_sec ?? currentSession.lastChunkEndSec,
  );
  return resetSubtitleSessionResponseSchema.parse({
    session_id: currentSession.sessionId,
    ok: true,
    events: [],
    updated_at_ms: nowMs(),
  });
}

async function handleFlush(): Promise<unknown> {
  const currentSession = runtimeSession;
  let cues: SubtitleCueDto[] = [];

  if (currentSession) {
    const canFlushVad = currentSession.vad !== null;

    if (canFlushVad) {
      const vadDetector = currentSession.vad!.detector;
      if (typeof (vadDetector as { flush?: () => void }).flush === "function") {
        (vadDetector as unknown as { flush: () => void }).flush();
      }
      cues = consumeVadSegments(
        currentSession,
        vadDetector,
        16_000,
        Math.max(0, currentSession.lastChunkEndSec - 2),
        currentSession.lastChunkEndSec,
        emitWorkerDebug,
        nowMs,
      );
    } else {
      cues = tryDecodeAndBuildCues(
        currentSession,
        Math.max(0, currentSession.lastChunkEndSec - 2),
        currentSession.lastChunkEndSec,
      );
    }
  }

  return flushSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    cues,
    events: [],
    updated_at_ms: nowMs(),
  });
}

async function handlePushAudio(rawPayload: unknown): Promise<unknown> {
  const request = rawPayload as PushSubtitleAudioRequestDto;
  const currentSession = ensureSession();

  const requestEpoch = Number.isFinite(request.session_epoch)
    ? Math.max(0, Math.floor(request.session_epoch))
    : 0;
  const requestChunkSeq = Number.isFinite(request.chunk_seq)
    ? Math.max(0, Math.floor(request.chunk_seq))
    : 0;
  let epochResetApplied = false;

  if (requestEpoch < currentSession.sessionEpoch) {
    return pushSubtitleAudioResponseSchema.parse({
      session_id: currentSession.sessionId,
      accepted: false,
      provider: currentSession.provider,
      cues: [],
      events: [
        createEvent(
          "chunk_stale_epoch",
          "warning",
          "chunk epoch is older than active session epoch",
        ),
      ],
      session_epoch: currentSession.sessionEpoch,
      chunk_seq: requestChunkSeq,
      queue_len: 0,
      updated_at_ms: nowMs(),
    });
  }

  if (requestEpoch > currentSession.sessionEpoch) {
    currentSession.sessionEpoch = requestEpoch;
    resetSessionStateForTimeline(currentSession, request.chunk_start_sec);
    epochResetApplied = true;
  }

  const previousChunkSeq = currentSession.lastChunkSeq;
  if (requestChunkSeq <= previousChunkSeq) {
    return pushSubtitleAudioResponseSchema.parse({
      session_id: currentSession.sessionId,
      accepted: false,
      provider: currentSession.provider,
      cues: [],
      events: [
        createEvent(
          "chunk_stale_seq",
          "warning",
          "chunk seq is not newer than last applied seq",
        ),
      ],
      session_epoch: currentSession.sessionEpoch,
      chunk_seq: requestChunkSeq,
      queue_len: 0,
      updated_at_ms: nowMs(),
    });
  }

  currentSession.lastChunkSeq = requestChunkSeq;

  const chunkBuffer = Buffer.from(request.chunk_base64, "base64");
  const chunkDurationSec =
    chunkBuffer.byteLength /
    4 /
    request.sample_rate_hz /
    Math.max(1, request.channel_count);
  const expectedEndSec =
    request.chunk_start_sec + Math.max(0, chunkDurationSec);

  const events: SubtitleSessionEventDto[] = [];
  if (epochResetApplied) {
    events.push(
      createEvent(
        "chunk_epoch_reset",
        "info",
        "session state reset due to newer chunk epoch",
      ),
    );
  }
  if (previousChunkSeq >= 0 && requestChunkSeq > previousChunkSeq + 1) {
    events.push(
      createEvent(
        "chunk_seq_gap",
        "warning",
        "chunk seq gap detected; possible upstream drop/merge",
      ),
    );
  }
  if (request.chunk_end_sec + 0.0001 < request.chunk_start_sec) {
    events.push(
      createEvent(
        "chunk_invalid_range",
        "warning",
        "chunk_end_sec is less than chunk_start_sec",
      ),
    );
  }
  if (request.chunk_start_sec + 0.0001 < currentSession.lastChunkEndSec) {
    events.push(
      createEvent(
        "chunk_non_monotonic",
        "warning",
        "chunk start is earlier than previous chunk end",
      ),
    );
  }

  emitWorkerDebug("push_audio_received", {
    session_id: currentSession.sessionId,
    session_epoch: currentSession.sessionEpoch,
    chunk_seq: requestChunkSeq,
    chunk_start_sec: Number(request.chunk_start_sec.toFixed(3)),
    chunk_end_sec: Number(request.chunk_end_sec.toFixed(3)),
    chunk_duration_sec: Number(
      (request.chunk_end_sec - request.chunk_start_sec).toFixed(3),
    ),
    event_codes: events.map((item) => item.code),
  });

  currentSession.lastChunkEndSec = Math.max(
    currentSession.lastChunkEndSec,
    request.chunk_end_sec,
    expectedEndSec,
  );

  const rawSamples = decodeFloat32Buffer(chunkBuffer);
  const samples = downmixToMono(rawSamples, Math.max(1, request.channel_count));
  const rms = calculateRms(samples);

  let cues: SubtitleCueDto[] = [];

  const canUseVadSegmentation =
    currentSession.vad !== null && request.sample_rate_hz === 16_000;

  if (canUseVadSegmentation && samples.length > 0) {
    const vadDetector = currentSession.vad!.detector;
    vadDetector.acceptWaveform(samples);
    cues.push(
      ...consumeVadSegments(
        currentSession,
        vadDetector,
        16_000,
        request.chunk_start_sec,
        request.chunk_end_sec,
        emitWorkerDebug,
        nowMs,
      ),
    );

    if (currentSession.speaker) {
      const thresholdHintEvent = maybeBuildSpeakerThresholdHint(
        currentSession,
        createEvent,
      );
      if (thresholdHintEvent) {
        events.push(thresholdHintEvent);
      }
    }
  } else {
    if (samples.length > 0) {
      currentSession.sampleRateHz = request.sample_rate_hz;
      currentSession.stream.acceptWaveform({
        samples,
        sampleRate: request.sample_rate_hz,
      });
      currentSession.pendingSamplesSinceDecode += samples.length;
    }

    const decodeWindowSamples = Math.max(
      1_600,
      Math.floor(currentSession.sampleRateHz * 0.6),
    );
    const shouldDecode =
      currentSession.pendingSamplesSinceDecode >= decodeWindowSamples &&
      rms >= 0.002;

    if (shouldDecode) {
      currentSession.pendingSamplesSinceDecode = 0;
      cues = tryDecodeAndBuildCues(
        currentSession,
        request.chunk_start_sec,
        request.chunk_end_sec,
      );
    }
  }

  return pushSubtitleAudioResponseSchema.parse({
    session_id: currentSession.sessionId,
    accepted: true,
    provider: currentSession.provider,
    cues,
    events,
    session_epoch: currentSession.sessionEpoch,
    chunk_seq: requestChunkSeq,
    queue_len: 0,
    updated_at_ms: nowMs(),
  });
}

async function handleTranscribeAll(rawPayload: unknown): Promise<unknown> {
  const request = rawPayload as TranscribeAllRequestPayload;
  const currentSession = ensureSession();

  const sampleRate =
    Number.isFinite(request.sample_rate_hz) && request.sample_rate_hz > 0
      ? Math.floor(request.sample_rate_hz)
      : 16_000;
  const channelCount =
    Number.isFinite(request.channel_count) && request.channel_count > 0
      ? Math.floor(request.channel_count)
      : 1;

  const sourceBuffer = Buffer.from(request.chunk_base64, "base64");
  const rawSamples = decodeFloat32Buffer(sourceBuffer);
  let monoSamples = rawSamples;
  if (channelCount > 1 && rawSamples.length > 0) {
    const frameCount = Math.floor(rawSamples.length / channelCount);
    const downmixed = new Float32Array(frameCount);
    for (let frame = 0; frame < frameCount; frame += 1) {
      let mixed = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        mixed += rawSamples[frame * channelCount + channel] ?? 0;
      }
      downmixed[frame] = mixed / channelCount;
    }
    monoSamples = downmixed;
  }

  const computedDuration = sampleRate > 0 ? monoSamples.length / sampleRate : 0;
  const durationSec =
    Number.isFinite(request.duration_sec) && (request.duration_sec ?? 0) > 0
      ? Number(request.duration_sec)
      : computedDuration;

  resetSessionStateForTimeline(currentSession, durationSec);
  currentSession.stream.acceptWaveform({ samples: monoSamples, sampleRate });

  const startedAt = nowMs();
  currentSession.recognizer.decode(currentSession.stream);
  const elapsedMs = Math.max(1, nowMs() - startedAt);
  const result = currentSession.recognizer.getResult(currentSession.stream);
  const cues = buildOfflineResultCues(currentSession, result, durationSec);

  return {
    session_id: currentSession.sessionId,
    provider: currentSession.provider,
    cues,
    text: normalizeRecognizedText(result.text),
    duration_sec: durationSec,
    elapsed_ms: elapsedMs,
    rtf: durationSec > 0 ? elapsedMs / 1000 / durationSec : null,
    updated_at_ms: nowMs(),
  };
}

async function handleRequest(
  command: SubtitleWorkerCommand,
  payload: unknown,
): Promise<unknown> {
  switch (command) {
    case "init":
      return await handleInit(payload);
    case "stop":
      return await handleStop(payload);
    case "reset":
      return await handleReset(payload);
    case "flush":
      return await handleFlush();
    case "push-audio":
      return await handlePushAudio(payload);
    case "transcribe-all":
      return await handleTranscribeAll(payload);
    default:
      throw new Error(
        `subtitle_asr_worker_unknown_command:${command satisfies never}`,
      );
  }
}

startHeartbeat();

bindIncomingMessageChannel((message: unknown) => {
  if (!message || typeof message !== "object") {
    return;
  }

  const maybeCancel = message as { kind?: string; request_id?: unknown };
  if (
    maybeCancel.kind === "cancel" &&
    typeof maybeCancel.request_id === "string"
  ) {
    cancelledRequestIds.add(maybeCancel.request_id);
    return;
  }

  const request = message as Partial<SubtitleWorkerIncomingEnvelope>;
  if (
    request.kind !== "request" ||
    typeof request.request_id !== "string" ||
    typeof request.command !== "string"
  ) {
    return;
  }
  const requestId = request.request_id;

  if (cancelledRequestIds.has(requestId)) {
    cancelledRequestIds.delete(requestId);
    return;
  }

  void handleRequest(request.command as SubtitleWorkerCommand, request.payload)
    .then((payload) => {
      if (cancelledRequestIds.has(requestId)) {
        cancelledRequestIds.delete(requestId);
        return;
      }
      postOutgoingMessage({
        kind: "response",
        request_id: requestId,
        ok: true,
        payload: sanitizePayloadForPostMessage(payload),
      });
    })
    .catch((error: unknown) => {
      if (cancelledRequestIds.has(requestId)) {
        cancelledRequestIds.delete(requestId);
        return;
      }
      const messageText =
        error instanceof Error && error.message ? error.message : String(error);
      postOutgoingMessage({
        kind: "response",
        request_id: requestId,
        ok: false,
        error: messageText,
      });
    });
});
