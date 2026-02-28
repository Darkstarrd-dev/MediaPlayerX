import type { RefObject } from "react";

import type {
  ImageConvertAdjustProfile,
  ManageAdReviewTaskDto,
  ManageReviewModeDto,
  StartImageConvertTaskRequestDto,
} from "../contracts/backend";
import type { MetadataFetchTarget } from "../features/metadata/metadataFetchTargets";
import type { ParsedExternalMetadata } from "../features/metadata/parseExternalMetadata";
import type { FocusedImageRef, ImagePackage, VectorCandidate } from "../types";

export interface ImageMainSectionProps {
  popoverDebugPinned?: boolean;
  fullscreenActive?: boolean;
  vectorMode: boolean;
  showNamesOnly: boolean;
  metadataManageMode: boolean;
  metadataManageSelectionMode?: "single" | "multiple";
  thumbnailScaleLevel?: number;
  thumbnailScaleLevelCount?: number;
  canThumbnailScaleDown?: boolean;
  canThumbnailScaleUp?: boolean;
  imageConvertScale?: number;
  imageConvertLongestEdgePx?: number | null;
  imageConvertAdjustProfile?: ImageConvertAdjustProfile;
  imageConvertFormat?: "webp" | "jpeg" | "png" | "avif";
  imageConvertQuality?: number;
  imageConvertPreviewMode?: boolean;
  imageConvertPreviewScale?: number;
  imageConvertPreviewLongestEdgePx?: number | null;
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile;
  imageConvertPreviewFormat?: "webp" | "jpeg" | "png" | "avif";
  imageConvertPreviewQuality?: number;
  loading: boolean;
  placeholderCount: number;
  enableLoadingSkeleton: boolean;
  activePackage: ImagePackage | null;
  focusedRef: FocusedImageRef | null;
  focusedImageExists: boolean;
  visibleImageRefs: FocusedImageRef[];
  refsInPage: FocusedImageRef[];
  pageStart: number;
  actualCellWidth: number;
  actualMediaHeight: number;
  thumbnailColumns: number;
  thumbnailGap: number;
  vectorCandidates: VectorCandidate[];
  packageById: Map<string, ImagePackage>;
  imageUrlById: Record<string, string>;
  gridRef: RefObject<HTMLDivElement | null>;
  onGridElementChange: (element: HTMLDivElement | null) => void;
  onToggleShowNamesOnly: () => void;
  onEnterFullscreen: () => void;
  canJumpToAnimation: boolean;
  canJumpToMusic?: boolean;
  canJumpToMusicFromBooklet?: boolean;
  onJumpToAnimation: () => void;
  onJumpToMusic?: () => void;
  onJumpToMusicFromBooklet?: () => void;
  onSelectImage: (
    packageId: string,
    imageIndex: number,
    absoluteIndex: number,
  ) => void;
  metadataPending: boolean;
  metadataTargetPackageLabel?: string;
  metadataFetchDefaultText?: string;
  metadataFetchTargets?: MetadataFetchTarget[];
  metadataProxyServer: string;
  metadataEhentaiCookies: string;
  onMetadataSyncName: () => void;
  onToggleMetadataManageSelectionMode?: () => void;
  onMetadataSaveParsed: (parsed: ParsedExternalMetadata) => Promise<void>;
  onMetadataSaveParsedByPackageId?: (
    packageId: string,
    parsed: ParsedExternalMetadata,
  ) => Promise<void>;
  manageMode: boolean;
  sidebarSelectedCount: number;
  imageSelectedCount: number;
  activeSelectionScope: "sidebar" | "image" | null;
  pendingManageAction: boolean;
  manageOperationHint: string | null;
  canManageDelete: boolean;
  canManageMoveNodes?: boolean;
  canManageImageConvert?: boolean;
  canManageHide: boolean;
  canManageUnhide: boolean;
  adReviewFeatureEnabled: boolean;
  adReviewPending?: boolean;
  adReviewDeletePending?: boolean;
  adReviewPanelOpen: boolean;
  manageReviewMode?: ManageReviewModeDto;
  canSwitchManageReviewMode?: boolean;
  adReviewTask?: ManageAdReviewTaskDto | null;
  adReviewFocusTaskId?: string | null;
  adReviewStrategyMode?: "all" | "head-tail";
  adReviewMaxConcurrency?: number;
  adReviewHeadN?: number;
  adReviewTailN?: number;
  adReviewTailStopCleanStreak?: number;
  canExecuteAdReview?: boolean;
  hasCheckedAdReviewCandidates?: boolean;
  selectedAdReviewCandidateCount?: number;
  checkedImageIds: ReadonlySet<string>;
  adReviewScopeImageIds: ReadonlySet<string>;
  adReviewLlmReviewedImageIds: ReadonlySet<string>;
  adReviewNonLlmReviewedImageIds: ReadonlySet<string>;
  adReviewCandidateImageIds?: ReadonlySet<string>;
  adReviewResultsMode?: boolean;
  adReviewGroupByPackageRows?: boolean;
  onToggleImageChecked: (
    imageId: string,
    checked?: boolean,
    options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
  ) => void;
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void;
  onManageDelete: () => void;
  onManageRename?: () => void;
  onManageGroup?: () => void;
  onManageMove?: () => void;
  onStartImageConvertTask?: (
    request: StartImageConvertTaskRequestDto,
  ) => Promise<unknown>;
  onManageHide: () => void;
  onManageUnhide: () => void;
  onToggleAdReviewPanel: () => void;
  onManageReviewModeChange?: (nextMode: ManageReviewModeDto) => void;
  onToggleAdReviewFocus?: () => void;
  onAdReviewStrategyModeChange?: (value: "all" | "head-tail") => void;
  onAdReviewMaxConcurrencyChange?: (value: number) => void;
  onAdReviewHeadNChange?: (value: number) => void;
  onAdReviewTailNChange?: (value: number) => void;
  onAdReviewTailStopCleanStreakChange?: (value: number) => void;
  onStartAdReview?: (options?: { skipReviewedNodes?: boolean }) => void;
  onPauseAdReview?: () => void;
  onRemoveAdReviewTask?: (taskId: string) => void;
  onDeleteSelectedAdReviewCandidates?: () => void;
  onDismissAdReviewTask?: () => void;
  onClearManageSelection: () => void;
  onThumbnailScaleLevelChange?: (level: number) => void;
  onImageConvertScaleChange?: (value: number) => void;
  onImageConvertLongestEdgePxChange?: (value: number | null) => void;
  onImageConvertFormatChange?: (value: "webp" | "jpeg" | "png" | "avif") => void;
  onImageConvertQualityChange?: (value: number) => void;
  onOpenImageConvertPreview?: () => void;
  onConfirmImageConvertPreview?: () => void;
  onCancelImageConvertPreview?: () => void;
  nodeBrowseMode?: boolean;
  nodeBrowseLabel?: string;
  nodeBrowseItems?: Array<{
    nodeId: string;
    imageSourceId?: string;
    imageNodeType: "folder" | "package" | "directory";
    label: string;
    packageCount: number;
    imageCount: number;
    descendantNodeCount: number;
    coverImageUrl: string | null;
  }>;
  nodeBrowsePageStart?: number;
  nodeBrowsePageSize?: number;
  onSelectNodeBrowseItem?: (nodeId: string, imageSourceId?: string) => void;
  onThumbnailWheelTurnPage?: (delta: number) => void;
  onThumbnailWheelDeltaPreview?: (accumulatedDelta: number) => void;
  onThumbnailWheelSwitchSidebarNode?: (direction: "next" | "prev") => void;
}
