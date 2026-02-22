import type {
  SubtitleCueDto,
  SubtitleSessionProviderPreferenceDto,
} from "../../contracts/backend";
import type { MediaRepository } from "../backend/repository";
import type { GeneratedRangeDto } from "./liveSubtitlesCueOps";

export interface UseLiveSubtitlesParams {
  enabled: boolean;
  videoElement: HTMLVideoElement | null;
  videoPath: string | null;
  currentTimeSec: number;
  modelDir: string;
  modelId: string | null;
  providerPreference: SubtitleSessionProviderPreferenceDto;
  language: string;
  validPlaybackRateThreshold: number;
  renderMode: "simple" | "advanced";
  advancedOptions: {
    vad: {
      preset: "balanced" | "conservative" | "aggressive";
      threshold: number;
      minSilenceSec: number;
      minSpeechSec: number;
      maxSpeechSec: number;
    };
    speaker: {
      similarityThreshold: number;
    };
  };
  repository: MediaRepository;
}

export interface PersistenceBatchPayload {
  cues: SubtitleCueDto[];
  sessionEpoch: number;
  chunkSeq: number;
  batchStartSec: number | null;
  batchEndSec: number | null;
  playbackRate: number;
  enforceValidRangeGuard: boolean;
  allowFirstOverlapReplaceOnce: boolean;
  seekAnchorSec: number | null;
  currentValidRange: GeneratedRangeDto | null;
}

export interface PersistenceSyncState {
  timelineHasCue: boolean;
  timelineHasCueNear: boolean;
  timelineInGeneratedRange: boolean;
  activeRange: GeneratedRangeDto | null;
}
