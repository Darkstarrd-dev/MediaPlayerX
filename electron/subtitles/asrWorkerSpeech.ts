import type {
  SubtitleCueDto,
  SubtitleSessionEventDto,
} from "../../src/contracts/backend";
import {
  charLength,
  clampNumber,
  clampTime,
  computeMedian,
  computeOverlapDelta,
  computeTextDelta,
  cosineSimilarity,
  makeCueId,
  normalizeEmbedding,
  normalizeLangTag,
  normalizeRecognizedText,
  normalizeTokenText,
  pickLatestSimpleSnippet,
  splitCompletedSentence,
  toFiniteNumbers,
} from "./asrWorkerUtils";
import type {
  RuntimeSessionState,
  SpeakerRuntime,
  VadLike,
  VadSegmentLike,
} from "./asrWorkerTypes";

const MAX_SPEAKER_COUNT = 2;

function clearPendingSwitch(speakerRuntime: SpeakerRuntime): void {
  speakerRuntime.pendingSwitchSpeakerId = null;
  speakerRuntime.pendingSwitchCount = 0;
  speakerRuntime.pendingSwitchDurationSec = 0;
  speakerRuntime.pendingSwitchScoreSum = 0;
  speakerRuntime.pendingSwitchIsNew = false;
  speakerRuntime.pendingSwitchEmbedding = null;
}

function pickOppositeLine(line: "A" | "B"): "A" | "B" {
  return line === "A" ? "B" : "A";
}

function assignLineIdForCue(
  currentSession: RuntimeSessionState,
  speakerId: number | null,
  speakerChanged: boolean,
  speakerSimilarity: number | undefined,
  cueEndSec: number,
): "A" | "B" {
  const canApplyCorrection =
    currentSession.speaker !== null &&
    currentSession.speaker.profiles.length >= 2 &&
    typeof speakerSimilarity === "number" &&
    Number.isFinite(speakerSimilarity) &&
    speakerSimilarity < currentSession.similarityThreshold - 0.02 &&
    currentSession.currentLineId !== null &&
    currentSession.lineStreakCount >= 2 &&
    cueEndSec - currentSession.lineSwitchSec >= 0.3;

  if (speakerChanged && currentSession.currentLineId) {
    const toggledLine = pickOppositeLine(currentSession.currentLineId);
    currentSession.currentLineId = toggledLine;
    currentSession.lineSwitchSec = cueEndSec;
    currentSession.lineStreakCount = 1;
    if (typeof speakerId === "number" && speakerId >= 0) {
      currentSession.lineBySpeaker.set(speakerId, toggledLine);
    }
    return toggledLine;
  }

  if (typeof speakerId === "number" && speakerId >= 0) {
    const mappedLine = currentSession.lineBySpeaker.get(speakerId);
    if (mappedLine) {
      if (canApplyCorrection && mappedLine === currentSession.currentLineId) {
        const correctedLine = pickOppositeLine(mappedLine);
        currentSession.currentLineId = correctedLine;
        currentSession.lineSwitchSec = cueEndSec;
        currentSession.lineStreakCount = 1;
        currentSession.lineBySpeaker.set(speakerId, correctedLine);
        return correctedLine;
      }

      if (mappedLine === currentSession.currentLineId) {
        currentSession.lineStreakCount += 1;
      } else {
        currentSession.lineStreakCount = 1;
        currentSession.lineSwitchSec = cueEndSec;
      }
      currentSession.currentLineId = mappedLine;
      return mappedLine;
    }

    let assignedLine: "A" | "B";
    if (currentSession.lineBySpeaker.size === 0) {
      assignedLine = "A";
    } else if (currentSession.lineBySpeaker.size === 1) {
      const firstLine = currentSession.lineBySpeaker.values().next().value as
        | "A"
        | "B";
      assignedLine = pickOppositeLine(firstLine);
    } else if (currentSession.currentLineId) {
      assignedLine = pickOppositeLine(currentSession.currentLineId);
    } else {
      assignedLine = "A";
    }

    currentSession.lineBySpeaker.set(speakerId, assignedLine);
    if (currentSession.currentLineId === assignedLine) {
      currentSession.lineStreakCount += 1;
    } else {
      currentSession.lineStreakCount = 1;
      currentSession.lineSwitchSec = cueEndSec;
    }
    currentSession.currentLineId = assignedLine;
    return assignedLine;
  }

  if (currentSession.currentLineId) {
    currentSession.lineStreakCount += 1;
    return currentSession.currentLineId;
  }

  currentSession.currentLineId = "A";
  currentSession.lineStreakCount = 1;
  currentSession.lineSwitchSec = cueEndSec;
  return "A";
}

function identifySpeaker(
  speakerRuntime: SpeakerRuntime,
  embedding: Float32Array,
  similarityThreshold: number,
  profileUpdateAlpha: number,
  segmentDurationSec: number,
  segmentEndSec: number,
): { speakerId: number; bestScore: number } {
  if (speakerRuntime.profiles.length === 0) {
    speakerRuntime.profiles.push({
      id: 0,
      embedding: new Float32Array(embedding),
    });
    clearPendingSwitch(speakerRuntime);
    speakerRuntime.lastSwitchSec = segmentEndSec;
    return { speakerId: 0, bestScore: 1 };
  }

  let bestId = -1;
  let bestScore = -1;
  let currentSpeakerScore = -1;
  let bestOtherId = -1;
  let bestOtherScore = -1;

  for (let i = 0; i < speakerRuntime.profiles.length; i += 1) {
    const profile = speakerRuntime.profiles[i];
    const score = cosineSimilarity(embedding, profile.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestId = profile.id;
    }
    if (profile.id === speakerRuntime.currentSpeakerId) {
      currentSpeakerScore = score;
    } else if (score > bestOtherScore) {
      bestOtherScore = score;
      bestOtherId = profile.id;
    }
  }

  const assignThreshold = Math.max(0.34, similarityThreshold - 0.06);
  const stickyThreshold = Math.max(0.36, similarityThreshold - 0.1);
  const createThreshold = Math.max(0.3, similarityThreshold - 0.08);
  const switchMargin = 0.02;
  const switchCooldownSec = 0.45;
  const strongSwitchMargin = 0.05;
  const strongSwitchMinSegmentSec = 0.68;
  const inSwitchCooldown =
    speakerRuntime.lastSwitchSec > 0 &&
    segmentEndSec - speakerRuntime.lastSwitchSec < switchCooldownSec;

  const updateSpeakerProfile = (speakerId: number, score: number): void => {
    const targetProfile = speakerRuntime.profiles.find(
      (profile) => profile.id === speakerId,
    );
    if (!targetProfile || !Number.isFinite(score) || score < -0.2) {
      return;
    }

    const alpha = Math.min(Math.max(profileUpdateAlpha, 0.02), 0.4);
    const size = Math.min(targetProfile.embedding.length, embedding.length);
    for (let i = 0; i < size; i += 1) {
      targetProfile.embedding[i] =
        targetProfile.embedding[i] * (1 - alpha) + embedding[i] * alpha;
    }
  };

  if (speakerRuntime.currentSpeakerId == null) {
    const initialId = bestScore >= assignThreshold ? bestId : 0;
    speakerRuntime.currentSpeakerId = initialId;
    clearPendingSwitch(speakerRuntime);
    if (initialId >= 0) {
      updateSpeakerProfile(initialId, bestScore);
      speakerRuntime.lastSwitchSec = segmentEndSec;
      return { speakerId: initialId, bestScore };
    }
  }

  if (
    bestId === speakerRuntime.currentSpeakerId &&
    bestScore >= stickyThreshold
  ) {
    updateSpeakerProfile(bestId, bestScore);
    clearPendingSwitch(speakerRuntime);
    return { speakerId: bestId, bestScore };
  }

  const currentId = speakerRuntime.currentSpeakerId ?? bestId;
  const hasStrongOther =
    bestOtherId >= 0 &&
    bestOtherScore >= similarityThreshold + strongSwitchMargin &&
    bestOtherScore > currentSpeakerScore + switchMargin;

  if (hasStrongOther && !inSwitchCooldown) {
    speakerRuntime.currentSpeakerId = bestOtherId;
    speakerRuntime.lastSwitchSec = segmentEndSec;
    updateSpeakerProfile(bestOtherId, bestOtherScore);
    clearPendingSwitch(speakerRuntime);
    return { speakerId: bestOtherId, bestScore: bestOtherScore };
  }

  if (
    bestId >= 0 &&
    bestId !== currentId &&
    bestScore >= similarityThreshold + switchMargin &&
    segmentDurationSec >= strongSwitchMinSegmentSec &&
    !inSwitchCooldown
  ) {
    const isNew =
      bestScore < createThreshold &&
      speakerRuntime.profiles.length < MAX_SPEAKER_COUNT;
    if (
      speakerRuntime.pendingSwitchSpeakerId !== bestId ||
      speakerRuntime.pendingSwitchIsNew !== isNew
    ) {
      speakerRuntime.pendingSwitchSpeakerId = bestId;
      speakerRuntime.pendingSwitchCount = 0;
      speakerRuntime.pendingSwitchDurationSec = 0;
      speakerRuntime.pendingSwitchScoreSum = 0;
      speakerRuntime.pendingSwitchEmbedding = null;
      speakerRuntime.pendingSwitchIsNew = isNew;
    }
    speakerRuntime.pendingSwitchCount += 1;
    speakerRuntime.pendingSwitchDurationSec += segmentDurationSec;
    speakerRuntime.pendingSwitchScoreSum += bestScore;
    speakerRuntime.pendingSwitchEmbedding = new Float32Array(embedding);

    const pendingAverageScore =
      speakerRuntime.pendingSwitchCount > 0
        ? speakerRuntime.pendingSwitchScoreSum /
          speakerRuntime.pendingSwitchCount
        : bestScore;
    const enoughEvidence =
      speakerRuntime.pendingSwitchCount >= 2 &&
      speakerRuntime.pendingSwitchDurationSec >= 0.9 &&
      pendingAverageScore >= similarityThreshold;

    if (!enoughEvidence) {
      return {
        speakerId: currentId,
        bestScore: currentSpeakerScore >= 0 ? currentSpeakerScore : bestScore,
      };
    }

    if (!speakerRuntime.pendingSwitchIsNew) {
      const switchedId = speakerRuntime.pendingSwitchSpeakerId ?? bestId;
      speakerRuntime.currentSpeakerId = switchedId;
      updateSpeakerProfile(switchedId, pendingAverageScore);
      clearPendingSwitch(speakerRuntime);
      speakerRuntime.lastSwitchSec = segmentEndSec;
      return { speakerId: switchedId, bestScore: pendingAverageScore };
    }

    const newSpeakerId = speakerRuntime.profiles.length;
    speakerRuntime.profiles.push({
      id: newSpeakerId,
      embedding: new Float32Array(
        speakerRuntime.pendingSwitchEmbedding ?? embedding,
      ),
    });
    clearPendingSwitch(speakerRuntime);
    speakerRuntime.lastSwitchSec = segmentEndSec;
    return {
      speakerId: newSpeakerId,
      bestScore: pendingAverageScore,
    };
  }

  return {
    speakerId: speakerRuntime.currentSpeakerId,
    bestScore: currentSpeakerScore >= 0 ? currentSpeakerScore : bestScore,
  };
}

export function maybeBuildSpeakerThresholdHint(
  currentSession: RuntimeSessionState,
  createEvent: (
    code: string,
    level: SubtitleSessionEventDto["level"],
    message: string,
  ) => SubtitleSessionEventDto,
): SubtitleSessionEventDto | null {
  const speakerRuntime = currentSession.speaker;
  if (!speakerRuntime) {
    return null;
  }
  if (speakerRuntime.recentBestScores.length < 20) {
    return null;
  }
  if (speakerRuntime.segmentCount - speakerRuntime.lastHintSegmentCount < 20) {
    return null;
  }

  const medianScore = computeMedian(speakerRuntime.recentBestScores);
  const suggestedThreshold = clampNumber(medianScore - 0.03, 0.55, 0.72);
  speakerRuntime.lastHintSegmentCount = speakerRuntime.segmentCount;

  return createEvent(
    "speaker_threshold_hint",
    "info",
    `speaker score median=${medianScore.toFixed(3)}, suggest threshold=${suggestedThreshold.toFixed(2)}, current=${currentSession.similarityThreshold.toFixed(2)}`,
  );
}

function extractSpeakerEmbedding(
  speakerRuntime: SpeakerRuntime,
  samples: Float32Array,
  sampleRate: number,
): Float32Array | null {
  if (samples.length < Math.floor(sampleRate * 0.45)) {
    return null;
  }
  const stream = speakerRuntime.extractor.createStream();
  stream.acceptWaveform({
    samples,
    sampleRate,
  });
  stream.inputFinished?.();

  if (
    typeof speakerRuntime.extractor.isReady === "function" &&
    !speakerRuntime.extractor.isReady(stream)
  ) {
    return null;
  }
  return normalizeEmbedding(speakerRuntime.extractor.compute(stream, false));
}

function parseVadSegment(
  rawSegment: VadSegmentLike,
  sampleRateHz: number,
): {
  samples: Float32Array;
  startSec: number | null;
  endSec: number | null;
} | null {
  const inputSamples = rawSegment.samples;
  if (!inputSamples) {
    return null;
  }
  const samples =
    inputSamples instanceof Float32Array
      ? inputSamples
      : new Float32Array(inputSamples);
  if (samples.length === 0) {
    return null;
  }

  const startRaw = Number(rawSegment.startSec ?? rawSegment.start);
  const endRaw = Number(rawSegment.endSec ?? rawSegment.end);

  const startCandidate = Number.isFinite(startRaw)
    ? rawSegment.startSec != null
      ? startRaw
      : startRaw / Math.max(1, sampleRateHz)
    : Number.NaN;
  const endCandidate = Number.isFinite(endRaw)
    ? rawSegment.endSec != null
      ? endRaw
      : endRaw / Math.max(1, sampleRateHz)
    : Number.NaN;

  return {
    samples,
    startSec: Number.isFinite(startCandidate) ? startCandidate : null,
    endSec: Number.isFinite(endCandidate) ? endCandidate : null,
  };
}

function decodeSegmentAndBuildCue(
  currentSession: RuntimeSessionState,
  samples: Float32Array,
  sampleRateHz: number,
  startSec: number,
  endSec: number,
  nowMs: () => number,
  emitWorkerDebug: (event: string, payload: Record<string, unknown>) => void,
): SubtitleCueDto[] {
  const stream = currentSession.recognizer.createStream();
  stream.acceptWaveform({ samples, sampleRate: sampleRateHz });

  const decodeStartedAt = nowMs();
  currentSession.recognizer.decode(stream);
  const decodeMs = Math.max(1, nowMs() - decodeStartedAt);
  const result = currentSession.recognizer.getResult(stream);
  const text = normalizeRecognizedText(result.text);
  if (!text) {
    return [];
  }

  const cueLanguage =
    currentSession.requestedLanguage === "auto"
      ? normalizeLangTag(result.lang)
      : currentSession.requestedLanguage;

  let speakerId: number | null =
    currentSession.speaker?.currentSpeakerId ?? null;
  let speakerChanged = false;
  let speakerSimilarity: number | undefined;
  if (currentSession.speaker) {
    const previousSpeakerId = currentSession.speaker.currentSpeakerId;
    const embedding = extractSpeakerEmbedding(
      currentSession.speaker,
      samples,
      sampleRateHz,
    );
    if (embedding) {
      const detected = identifySpeaker(
        currentSession.speaker,
        embedding,
        currentSession.similarityThreshold,
        currentSession.profileUpdateAlpha,
        samples.length / Math.max(1, sampleRateHz),
        endSec,
      );
      speakerSimilarity = detected.bestScore;
      currentSession.speaker.segmentCount += 1;
      currentSession.speaker.recentBestScores.push(detected.bestScore);
      if (currentSession.speaker.recentBestScores.length > 60) {
        currentSession.speaker.recentBestScores.shift();
      }

      const detectedSpeakerId = detected.speakerId;
      speakerChanged =
        currentSession.speaker.currentSpeakerId !== detectedSpeakerId;
      currentSession.speaker.currentSpeakerId = detectedSpeakerId;
      speakerId = detectedSpeakerId;

      const pendingScoreAvg =
        currentSession.speaker.pendingSwitchCount > 0
          ? currentSession.speaker.pendingSwitchScoreSum /
            currentSession.speaker.pendingSwitchCount
          : 0;
      emitWorkerDebug("speaker_decision", {
        session_id: currentSession.sessionId,
        session_epoch: currentSession.sessionEpoch,
        segment_start_sec: Number(startSec.toFixed(3)),
        segment_end_sec: Number(endSec.toFixed(3)),
        segment_duration_sec: Number(
          (samples.length / Math.max(1, sampleRateHz)).toFixed(3),
        ),
        asr_decode_ms: decodeMs,
        speaker_previous_id: previousSpeakerId,
        speaker_current_id: detectedSpeakerId,
        speaker_changed: speakerChanged,
        speaker_similarity_best: Number(detected.bestScore.toFixed(4)),
        speaker_candidate_id: currentSession.speaker.pendingSwitchSpeakerId,
        speaker_candidate_is_new: currentSession.speaker.pendingSwitchIsNew,
        pending_count: currentSession.speaker.pendingSwitchCount,
        pending_duration_sec: Number(
          currentSession.speaker.pendingSwitchDurationSec.toFixed(3),
        ),
        pending_score_avg: Number(pendingScoreAvg.toFixed(4)),
      });
    }
  }

  const normalizedStart = Math.max(0, startSec);
  const normalizedEnd = Math.max(normalizedStart + 0.35, endSec);
  const cueText = text;
  if (!cueText) {
    return [];
  }

  const cueStart = normalizedStart;
  const cueEnd = normalizedEnd;
  const lineId = assignLineIdForCue(
    currentSession,
    speakerId,
    speakerChanged,
    speakerSimilarity,
    cueEnd,
  );

  currentSession.cueSeed += 1;
  return [
    {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: cueStart,
      end_sec: cueEnd,
      text: cueText,
      lang: cueLanguage,
      speaker: speakerId,
      line: lineId,
      speaker_changed: speakerChanged,
      speaker_similarity: speakerSimilarity,
    },
  ];
}

export function consumeVadSegments(
  currentSession: RuntimeSessionState,
  vadDetector: VadLike,
  sampleRateHz: number,
  fallbackChunkStartSec: number,
  fallbackChunkEndSec: number,
  emitWorkerDebug: (event: string, payload: Record<string, unknown>) => void,
  nowMs: () => number,
): SubtitleCueDto[] {
  const cues: SubtitleCueDto[] = [];
  const timelineMin = Math.max(0, fallbackChunkStartSec - 0.45);
  const timelineMax = Math.max(timelineMin + 0.2, fallbackChunkEndSec + 0.45);

  while (!vadDetector.isEmpty()) {
    const parsedSegment = parseVadSegment(
      vadDetector.front(false),
      sampleRateHz,
    );
    vadDetector.pop();
    if (!parsedSegment || parsedSegment.samples.length === 0) {
      continue;
    }

    const segmentDurationSec = parsedSegment.samples.length / sampleRateHz;
    if (segmentDurationSec < 0.14) {
      continue;
    }

    const preferredEndSec = Number.isFinite(parsedSegment.endSec)
      ? Number(parsedSegment.endSec)
      : fallbackChunkEndSec;
    const preferredStartSec = Number.isFinite(parsedSegment.startSec)
      ? Number(parsedSegment.startSec)
      : Math.max(fallbackChunkStartSec, preferredEndSec - segmentDurationSec);

    const vadWindowSpan = preferredEndSec - preferredStartSec;
    const hasOutlierTimestamp =
      preferredStartSec < timelineMin ||
      preferredStartSec > timelineMax ||
      preferredEndSec < timelineMin ||
      preferredEndSec > timelineMax ||
      vadWindowSpan <= 0 ||
      vadWindowSpan > 12;

    const segmentEndSec = hasOutlierTimestamp
      ? fallbackChunkEndSec
      : Math.max(timelineMin, Math.min(timelineMax, preferredEndSec));
    const segmentStartSecRaw = hasOutlierTimestamp
      ? Math.max(fallbackChunkStartSec, segmentEndSec - segmentDurationSec)
      : Math.max(
          timelineMin,
          Math.min(
            segmentEndSec - 0.05,
            Math.max(
              preferredStartSec,
              segmentEndSec - Math.max(segmentDurationSec, 0.1),
            ),
          ),
        );
    const segmentStartSec = Math.min(
      segmentStartSecRaw,
      Math.max(0, segmentEndSec - 0.05),
    );

    if (hasOutlierTimestamp) {
      emitWorkerDebug("vad_timestamp_fallback", {
        session_id: currentSession.sessionId,
        session_epoch: currentSession.sessionEpoch,
        raw_start_sec: Number(preferredStartSec.toFixed(3)),
        raw_end_sec: Number(preferredEndSec.toFixed(3)),
        fallback_start_sec: Number(segmentStartSec.toFixed(3)),
        fallback_end_sec: Number(segmentEndSec.toFixed(3)),
        chunk_start_sec: Number(fallbackChunkStartSec.toFixed(3)),
        chunk_end_sec: Number(fallbackChunkEndSec.toFixed(3)),
      });
    }

    cues.push(
      ...decodeSegmentAndBuildCue(
        currentSession,
        parsedSegment.samples,
        sampleRateHz,
        Math.max(0, segmentStartSec),
        Math.max(segmentStartSec + 0.35, segmentEndSec),
        nowMs,
        emitWorkerDebug,
      ),
    );
  }

  return cues;
}

export function buildOfflineResultCues(
  currentSession: RuntimeSessionState,
  result: {
    text?: string;
    lang?: string;
    tokens?: string[];
    timestamps?: number[];
    durations?: number[];
  },
  durationSec: number,
): SubtitleCueDto[] {
  const fallbackText = normalizeRecognizedText(result.text);
  const rawTokens = Array.isArray(result.tokens)
    ? result.tokens.filter((item): item is string => typeof item === "string")
    : [];
  const timestamps = toFiniteNumbers(result.timestamps);
  const durations = toFiniteNumbers(result.durations);
  if (rawTokens.length === 0 || timestamps.length === 0) {
    if (!fallbackText) {
      return [];
    }
    currentSession.cueSeed += 1;
    return [
      {
        id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
        start_sec: 0,
        end_sec: Math.max(0.8, durationSec),
        text: fallbackText,
        lang:
          currentSession.requestedLanguage === "auto"
            ? normalizeLangTag(result.lang)
            : currentSession.requestedLanguage,
      },
    ];
  }

  const maxTimestamp = Math.max(...timestamps, 0);
  const maxDuration = Math.max(...durations, 0);
  const likelyMs =
    (durationSec > 0 && maxTimestamp > durationSec * 20) ||
    (durationSec > 0 && maxDuration > durationSec * 20);
  const timeScale = likelyMs ? 0.001 : 1;

  const cues: SubtitleCueDto[] = [];
  const cueLanguage =
    currentSession.requestedLanguage === "auto"
      ? normalizeLangTag(result.lang)
      : currentSession.requestedLanguage;

  let cueStart = -1;
  let cueEnd = 0;
  let textBuffer = "";
  const pushCue = () => {
    const text = textBuffer.replace(/\s+/g, " ").trim();
    if (!text) {
      cueStart = -1;
      cueEnd = 0;
      textBuffer = "";
      return;
    }
    currentSession.cueSeed += 1;
    cues.push({
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: clampTime(cueStart >= 0 ? cueStart : 0, durationSec),
      end_sec: clampTime(
        Math.max((cueStart >= 0 ? cueStart : 0) + 0.4, cueEnd),
        durationSec,
      ),
      text,
      lang: cueLanguage,
    });
    cueStart = -1;
    cueEnd = 0;
    textBuffer = "";
  };

  for (let i = 0; i < rawTokens.length; i += 1) {
    const tokenText = normalizeTokenText(rawTokens[i]);
    if (!tokenText) {
      continue;
    }

    const tokenStart = clampTime(
      (timestamps[i] ?? timestamps[timestamps.length - 1] ?? 0) * timeScale,
      durationSec,
    );
    const durationCandidate = Math.max(0, (durations[i] ?? 0) * timeScale);
    const nextStart = clampTime(
      (timestamps[i + 1] ?? tokenStart) * timeScale,
      durationSec,
    );
    const tokenEnd = clampTime(
      durationCandidate > 0
        ? tokenStart + durationCandidate
        : Math.max(tokenStart + 0.25, nextStart),
      durationSec,
    );

    if (cueStart < 0) {
      cueStart = tokenStart;
      cueEnd = tokenEnd;
    } else {
      cueEnd = Math.max(cueEnd, tokenEnd);
    }

    if (
      textBuffer &&
      /^[A-Za-z0-9]/.test(tokenText) &&
      !textBuffer.endsWith(" ")
    ) {
      textBuffer += " ";
    }
    textBuffer += tokenText;

    const cueDuration = cueStart >= 0 ? cueEnd - cueStart : 0;
    const hitPunctuation = /[。！？!?；;，,.]$/.test(tokenText);
    if (hitPunctuation || cueDuration >= 3.8 || textBuffer.length >= 42) {
      pushCue();
    }
  }

  pushCue();
  if (cues.length > 0) {
    return cues;
  }

  if (!fallbackText) {
    return [];
  }
  currentSession.cueSeed += 1;
  return [
    {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: 0,
      end_sec: Math.max(0.8, durationSec),
      text: fallbackText,
      lang: cueLanguage,
    },
  ];
}

export function tryDecodeAndBuildCues(
  currentSession: RuntimeSessionState,
  timelineStartSec: number,
  timelineEndSec: number,
): SubtitleCueDto[] {
  currentSession.recognizer.decode(currentSession.stream);
  const result = currentSession.recognizer.getResult(currentSession.stream);
  const currentText = normalizeRecognizedText(result.text);

  if (!currentText) {
    return [];
  }

  if (currentSession.renderMode === "simple") {
    const silenceDuration =
      timelineEndSec - currentSession.simpleLastNonEmptySec;
    if (
      silenceDuration > 1.5 &&
      (currentSession.committedText || currentSession.simpleWindowText)
    ) {
      currentSession.committedText = "";
      currentSession.simpleLastRawText = "";
      currentSession.simpleWindowText = "";
    }
    currentSession.simpleLastNonEmptySec = timelineEndSec;

    const deltaResult = computeOverlapDelta(
      currentSession.simpleLastRawText,
      currentText,
      64,
    );
    currentSession.simpleLastRawText = currentText;
    if (deltaResult.kind === "none" || !deltaResult.delta) {
      return [];
    }

    const normalizedDelta = deltaResult.delta.trim();
    if (
      charLength(normalizedDelta) <= 1 &&
      !/[0-9A-Za-z]/.test(normalizedDelta)
    ) {
      return [];
    }

    if (deltaResult.kind === "replace") {
      currentSession.simpleWindowText = currentText;
    } else {
      currentSession.simpleWindowText =
        `${currentSession.simpleWindowText} ${normalizedDelta}`.trim();
    }

    const sentenceSplit = splitCompletedSentence(
      currentSession.simpleWindowText,
    );
    let displayText = "";
    if (sentenceSplit.completed) {
      displayText = pickLatestSimpleSnippet(sentenceSplit.completed, 28);
      currentSession.simpleWindowText = sentenceSplit.rest;
    } else if (silenceDuration > 0.45 && currentSession.simpleWindowText) {
      displayText = pickLatestSimpleSnippet(
        currentSession.simpleWindowText,
        28,
      );
      currentSession.simpleWindowText = "";
    }

    if (!displayText || displayText === currentSession.committedText) {
      return [];
    }

    currentSession.committedText = displayText;
    currentSession.lastSpeechEndSec = timelineEndSec;

    const durationSec = Math.max(
      0.45,
      Math.min(0.75, charLength(displayText) * 0.025),
    );
    const cueStart = Math.max(0, timelineEndSec - 0.05);
    const cueEnd = Math.max(cueStart + 0.25, timelineEndSec + durationSec);

    const cueLanguage =
      currentSession.requestedLanguage === "auto"
        ? normalizeLangTag(result.lang)
        : currentSession.requestedLanguage;

    currentSession.cueSeed += 1;
    return [
      {
        id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
        start_sec: cueStart,
        end_sec: cueEnd,
        text: displayText,
        lang: cueLanguage,
        speaker: null,
        speaker_changed: false,
      },
    ];
  }

  const delta = computeTextDelta(currentSession.committedText, currentText);
  currentSession.committedText = currentText;
  currentSession.lastSpeechEndSec = timelineEndSec;
  if (!delta) {
    return [];
  }

  const durationSec = Math.max(1.2, Math.min(5, delta.length * 0.22));
  const cueStart = Math.max(
    0,
    Math.max(timelineStartSec, timelineEndSec - durationSec * 0.8),
  );
  const cueEnd = Math.max(cueStart + 0.4, cueStart + durationSec);
  const cueLanguage =
    currentSession.requestedLanguage === "auto"
      ? normalizeLangTag(result.lang)
      : currentSession.requestedLanguage;

  currentSession.cueSeed += 1;
  return [
    {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: cueStart,
      end_sec: cueEnd,
      text: delta,
      lang: cueLanguage,
      speaker: null,
      speaker_changed: false,
    },
  ];
}
