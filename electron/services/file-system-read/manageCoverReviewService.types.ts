import type {
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotDto,
  ManageCoverReviewTaskDto,
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
  StartManageCoverReviewRequestDto,
} from "../../../src/contracts/backend";
import type { MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import type { ZipCentralEntry } from "../../zipArchiveHelpers";

export interface ManageCoverReviewServiceOptions {
  database: MediaLibraryDatabase;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  getZipEntryIndexByPath: () => Map<string, Map<string, ZipCentralEntry>>;
  setImageHidden: (
    request: SetImageHiddenRequestDto,
  ) => Promise<SetImageHiddenResponseDto>;
}

export interface RuntimeTaskState {
  task: ManageCoverReviewTaskDto;
  request: StartManageCoverReviewRequestDto;
  effectiveNodeIds: string[];
  nodeHashById: Record<string, string>;
  candidateHashByImageId: Map<string, string>;
  abortController: AbortController | null;
  pauseRequested: boolean;
}

export interface ImageEntryRef {
  source: ImagePackageDto;
  image: ImageItemDto;
}

export interface PersistedQueueItem {
  task: ManageCoverReviewTaskDto;
  request: StartManageCoverReviewRequestDto;
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
