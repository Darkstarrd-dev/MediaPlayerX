export type AdReviewDecisionStatus =
  | "suspected"
  | "clean"
  | "failed"
  | "skipped";

export type AdReviewDecisionSource =
  | "known-hash"
  | "llm"
  | "llm-error"
  | "strategy-skip";

export interface ManageAdReviewImageInput {
  imageId: string;
  ordinal: number;
  fileName?: string;
  getImageBytes: () => Promise<Uint8Array>;
}

export interface ManageAdReviewContainerInput {
  containerId: string;
  images: ManageAdReviewImageInput[];
}

export interface ManageAdReviewInput {
  containers: ManageAdReviewContainerInput[];
}

export interface AdReviewDetectionResult {
  isAd: boolean;
  reason: string;
  rawText: string;
}

export interface AdReviewBatchItemResult {
  imageId: string;
  isAd: boolean;
  isBlank: boolean;
  isBody: boolean;
  isNonBody: boolean;
  isAdOverlayCover: boolean;
  reason: string;
}

export interface AdReviewDuplicateGroupResult {
  ids: string[];
  adOverlayIds: string[];
  adOverlayTexts: Array<{
    imageId: string;
    texts: string[];
  }>;
}

export interface AdReviewBatchResult {
  inputImageIds: string[];
  duplicateGroups: AdReviewDuplicateGroupResult[];
  adImageIds: string[];
  nonBodyImageIds: string[];
  items: AdReviewBatchItemResult[];
  rawText: string;
}

export interface AdReviewBatchImageInput {
  imageId: string;
  imageBytes: Uint8Array;
}

export interface AdVisionClient {
  detectAd(params: {
    imageBytes: Uint8Array;
    signal?: AbortSignal;
  }): Promise<AdReviewDetectionResult>;
  reviewBatch?(params: {
    reviewType: "head" | "tail";
    images: AdReviewBatchImageInput[];
    signal?: AbortSignal;
  }): Promise<AdReviewBatchResult>;
}

export interface KnownHashStore {
  has(hash: string): Promise<boolean>;
  addMany(hashes: string[]): Promise<void>;
}

export interface AdReviewHeadTailStrategy {
  mode: "head-tail";
  headN: number;
  tailN: number;
  tailStopCleanStreak: number;
}

export interface AdReviewAllStrategy {
  mode: "all";
}

export type AdReviewStrategy = AdReviewAllStrategy | AdReviewHeadTailStrategy;

export interface ManageAdReviewEngineOptions {
  client: AdVisionClient;
  hashStore?: KnownHashStore;
  concurrency?: number;
  strategy?: AdReviewStrategy;
  executionMode?: "normal" | "performance";
  signal?: AbortSignal;
  onEvent?: (event: ManageAdReviewEvent) => void;
}

export interface ManageAdReviewPerformanceResult {
  adDeleteIds: string[];
  nonBodyHideIds: string[];
  headAdOverlayIds: string[];
  tailAdIds: string[];
  hashHitAdIds: string[];
  tailHashHitCount: number;
  tailLlmQuota: number;
  tailLlmImageIds: string[];
}

export interface ManageAdReviewDecision {
  containerId: string;
  imageId: string;
  ordinal: number;
  fileName: string | null;
  hash: string;
  status: AdReviewDecisionStatus;
  source: AdReviewDecisionSource;
  reason: string;
  reviewedAtMs: number;
}

export interface ManageAdReviewSummary {
  total: number;
  suspected: number;
  clean: number;
  failed: number;
  skipped: number;
  knownHashHits: number;
  llmCalls: number;
}

export interface ManageAdReviewResult {
  items: ManageAdReviewDecision[];
  summary: ManageAdReviewSummary;
  performance?: ManageAdReviewPerformanceResult;
}

export type ManageAdReviewEvent =
  | {
      type: "container-start";
      containerId: string;
      total: number;
    }
  | {
      type: "image-reviewed";
      containerId: string;
      imageId: string;
      status: AdReviewDecisionStatus;
      source: AdReviewDecisionSource;
      hash: string;
      reason: string;
    }
  | {
      type: "container-complete";
      containerId: string;
      summary: ManageAdReviewSummary;
    }
  | {
      type: "run-complete";
      summary: ManageAdReviewSummary;
    };
