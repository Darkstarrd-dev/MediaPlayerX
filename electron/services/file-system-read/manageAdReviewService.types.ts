import type {
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotDto,
  ManageAdReviewTaskDto,
  PauseManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskResponseDto,
  StartManageAdReviewRequestDto,
  StartManageAdReviewResponseDto,
} from "../../../src/contracts/backend";
import type { MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";

export interface ManageAdReviewServiceOptions {
  database: MediaLibraryDatabase;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  getZipEntryIndexByPath: () => Map<
    string,
    Map<string, import("../../zipArchiveHelpers").ZipCentralEntry>
  >;
  deleteImageItems: (
    request: DeleteImageItemsRequestDto,
  ) => Promise<DeleteImageItemsResponseDto>;
}

export interface RuntimeTaskState {
  task: ManageAdReviewTaskDto;
  request: StartManageAdReviewRequestDto;
  effectiveNodeIds: string[];
  nodeHashById: Record<string, string>;
  candidateHashByImageId: Map<string, string>;
  abortController: AbortController | null;
  pauseRequested: boolean;
  resumeFromPaused?: boolean;
}

export interface ImageEntryRef {
  source: ImagePackageDto;
  image: ImageItemDto;
}

export interface PersistedQueueItem {
  task: ManageAdReviewTaskDto;
  request: StartManageAdReviewRequestDto;
  effective_node_ids: string[];
  skipped_node_ids: string[];
  node_hash_by_id: Record<string, string>;
}

export interface PersistedQueueState {
  version: number;
  items: PersistedQueueItem[];
}

export interface ReviewedNodeHashState {
  version: number;
  node_hash_by_id: Record<string, { node_hash: string; updated_at_ms: number }>;
}

export interface ResolvedStartSelection {
  selectedImageIds: string[];
  effectiveNodeIds: string[];
  skippedNodeIds: string[];
  nodeHashById: Record<string, string>;
}

export type {
  PauseManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskResponseDto,
  StartManageAdReviewRequestDto,
  StartManageAdReviewResponseDto,
};
