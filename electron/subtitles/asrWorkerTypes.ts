import type { SubtitleSessionProviderDto } from "../../src/contracts/backend";

export interface TranscribeAllRequestPayload {
  chunk_base64: string;
  sample_rate_hz: number;
  channel_count: number;
  duration_sec?: number;
}

export interface VadSegmentLike {
  samples?: Float32Array | number[];
  start?: number;
  end?: number;
  startSec?: number;
  endSec?: number;
}

export interface VadLike {
  acceptWaveform: (samples: Float32Array) => void;
  isEmpty: () => boolean;
  front: (enableExternalBuffer?: boolean) => VadSegmentLike;
  pop: () => void;
}

export interface VadRuntime {
  detector: VadLike;
}

export interface SpeakerExtractorStreamLike {
  acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void;
  inputFinished?: () => void;
}

export interface SpeakerExtractorLike {
  createStream: () => SpeakerExtractorStreamLike;
  isReady?: (stream: SpeakerExtractorStreamLike) => boolean;
  compute: (
    stream: SpeakerExtractorStreamLike,
    enableExternalBuffer?: boolean,
  ) => Float32Array | number[];
}

export interface SpeakerProfile {
  id: number;
  embedding: Float32Array;
}

export interface SpeakerRuntime {
  extractor: SpeakerExtractorLike;
  profiles: SpeakerProfile[];
  currentSpeakerId: number | null;
  lastSwitchSec: number;
  pendingSwitchSpeakerId: number | null;
  pendingSwitchCount: number;
  pendingSwitchDurationSec: number;
  pendingSwitchScoreSum: number;
  pendingSwitchIsNew: boolean;
  pendingSwitchEmbedding: Float32Array | null;
  recentBestScores: number[];
  segmentCount: number;
  lastHintSegmentCount: number;
}

export interface RuntimeSessionState {
  sessionId: string;
  sessionEpoch: number;
  lastChunkSeq: number;
  provider: SubtitleSessionProviderDto;
  startedAtMs: number;
  modelRootDir: string;
  language: string;
  fallbackApplied: boolean;
  lastChunkEndSec: number;
  recognizer: {
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
    createStream: () => {
      acceptWaveform: (obj: {
        samples: Float32Array;
        sampleRate: number;
      }) => void;
    };
  };
  stream: {
    acceptWaveform: (obj: {
      samples: Float32Array;
      sampleRate: number;
    }) => void;
  };
  sampleRateHz: number;
  pendingSamplesSinceDecode: number;
  committedText: string;
  simpleLastRawText: string;
  simpleWindowText: string;
  simpleLastNonEmptySec: number;
  cueSeed: number;
  requestedLanguage: string;
  renderMode: "simple" | "advanced";
  lastSpeechEndSec: number;
  vad: VadRuntime | null;
  speaker: SpeakerRuntime | null;
  lineBySpeaker: Map<number, "A" | "B">;
  currentLineId: "A" | "B" | null;
  lineSwitchSec: number;
  lineStreakCount: number;
  similarityThreshold: number;
  profileUpdateAlpha: number;
}
