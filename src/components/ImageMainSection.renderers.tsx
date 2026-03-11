import type {
  MouseEvent as ReactMouseEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
  JSX,
} from "react";

import { mediaLocatorFileName } from "../features/backend";
import type { FocusedImageRef, ImagePackage, VectorCandidate } from "../types";
import type { ImageMainSectionProps } from "./ImageMainSection.types";

type NodeBrowseItem = NonNullable<
  ImageMainSectionProps["nodeBrowseItems"]
>[number];

interface RenderImageMainContentParams {
  nodeBrowseMode: boolean;
  showNamesOnly: boolean;
  manageMode: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  handleThumbnailContainerWheel: (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => void;
  thumbnailColumns: number;
  actualCellWidth: number;
  thumbnailGap: number;
  thumbnailRowGap: number;
  nodeBrowseItems: NodeBrowseItem[];
  nodeBrowsePageStart: number;
  nodeBrowsePageSize: number;
  markThumbInputMouse: () => void;
  scrollFocusedThumbIntoView: (target: EventTarget | null) => void;
  scheduleFocusedThumbOriginSync: () => void;
  onSelectNodeBrowseItem?: (nodeId: string, imageSourceId?: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  setNameListBodyEl: (value: HTMLDivElement | null) => void;
  startMarqueeSelection: (event: ReactMouseEvent<HTMLDivElement>) => void;
  startThumbnailDragToggle: (event: ReactMouseEvent<HTMLDivElement>) => void;
  visibleImageRefs: FocusedImageRef[];
  packageById: Map<string, ImagePackage>;
  nameListDimsById: Record<string, { width: number; height: number }>;
  focusedRef: FocusedImageRef | null;
  checkedImageIds: ReadonlySet<string>;
  adReviewCandidateImageIds: ReadonlySet<string>;
  adReviewNonBodyImageIds: ReadonlySet<string>;
  onSelectImage: (
    packageId: string,
    imageIndex: number,
    absoluteIndex: number,
  ) => void;
  onEnterFullscreen: () => void;
  refsInPageForRender: FocusedImageRef[];
  isThumbnailInteractionLocked: boolean;
  imageUrlByIdForRender: Record<string, string>;
  pageStart: number;
  adReviewGroupByPackageRows: boolean;
  adReviewPerformanceMode: boolean;
  showSkeleton: boolean;
  skeletonCount: number;
  vectorMode: boolean;
  vectorCandidates: VectorCandidate[];
}

export function renderImageMainContent({
  nodeBrowseMode,
  showNamesOnly,
  manageMode,
  gridRef,
  handleThumbnailContainerWheel,
  thumbnailColumns,
  actualCellWidth,
  thumbnailGap,
  thumbnailRowGap,
  nodeBrowseItems,
  nodeBrowsePageStart,
  nodeBrowsePageSize,
  markThumbInputMouse,
  scrollFocusedThumbIntoView,
  scheduleFocusedThumbOriginSync,
  onSelectNodeBrowseItem,
  t,
  setNameListBodyEl,
  startMarqueeSelection,
  startThumbnailDragToggle,
  visibleImageRefs,
  packageById,
  nameListDimsById,
  focusedRef,
  checkedImageIds,
  adReviewCandidateImageIds,
  adReviewNonBodyImageIds,
  onSelectImage,
  onEnterFullscreen,
  refsInPageForRender,
  isThumbnailInteractionLocked,
  imageUrlByIdForRender,
  pageStart,
  adReviewGroupByPackageRows,
  adReviewPerformanceMode,
  showSkeleton,
  skeletonCount,
  vectorMode,
  vectorCandidates,
}: RenderImageMainContentParams): JSX.Element {
  const nodeBrowsePagedItems =
    nodeBrowsePageSize > 0
      ? nodeBrowseItems.slice(
          Math.max(0, nodeBrowsePageStart),
          Math.max(0, nodeBrowsePageStart) + Math.max(1, nodeBrowsePageSize),
        )
      : nodeBrowseItems;

  if (nodeBrowseMode) {
    return (
      <div
        className="image-grid node-browse-grid mpx-scrollbar-hidden"
        data-slot="fg-main-content-image-node-grid"
        ref={gridRef}
        onWheel={handleThumbnailContainerWheel}
        style={{
          gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
          rowGap: `${thumbnailRowGap}px`,
          columnGap: `${thumbnailGap}px`,
        }}
      >
        {nodeBrowsePagedItems.map((item) => (
          <div
            key={item.nodeId}
            className="thumb-card"
            data-slot="fg-main-content-image-node-grid-card"
            style={{ width: `${actualCellWidth}px` }}
          >
            <button
              className="thumb-card-main"
              type="button"
              onPointerDown={(event) => {
                markThumbInputMouse();
                scrollFocusedThumbIntoView(event.currentTarget);
                scheduleFocusedThumbOriginSync();
              }}
              onClick={() =>
                onSelectNodeBrowseItem?.(item.nodeId, item.imageSourceId)
              }
            >
              <div
                className="thumb-placeholder"
                style={{ aspectRatio: "1 / 1" }}
              >
                <div
                  className="thumb-media"
                  style={{ width: "100%", height: "100%" }}
                >
                  {item.coverImageUrl ? (
                    <img
                      className="thumb-media-image"
                      src={item.coverImageUrl}
                      alt={item.label}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="thumb-media-empty" />
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (showNamesOnly) {
    return (
      <div
        className={`name-list ${manageMode ? "is-manage" : ""}`}
        data-slot="fg-main-content-image-name-list"
        ref={gridRef}
      >
        <div className="name-list-header">
          <span>{t("ui.metadata.fileName")}</span>
          <span>{t("ui.image.fileSize")}</span>
          <span>{t("ui.image.resolution")}</span>
        </div>
        <div
          className="name-list-body mpx-scroll-area"
          ref={setNameListBodyEl}
          onMouseDown={(event) => {
            startMarqueeSelection(event);
            startThumbnailDragToggle(event);
          }}
        >
          {visibleImageRefs.map((ref, absoluteIndex) => {
            const pkg = packageById.get(ref.packageId);
            const image = pkg?.images[ref.imageIndex];
            if (!pkg || !image) {
              return null;
            }

            const fileName = mediaLocatorFileName(image.mediaLocator);
            const resolvedDims = nameListDimsById[image.id];
            const resolvedWidth = resolvedDims?.width ?? image.width;
            const resolvedHeight = resolvedDims?.height ?? image.height;
            const isFocused =
              focusedRef?.packageId === ref.packageId &&
              focusedRef?.imageIndex === ref.imageIndex;
            const isChecked = checkedImageIds.has(image.id);
            const isAdReviewCandidate = adReviewCandidateImageIds.has(image.id);
            const isAdReviewExcluded =
              manageMode && isAdReviewCandidate && !isChecked;
            return (
              <div
                key={`${ref.packageId}-${ref.imageIndex}`}
                data-manage-image-id={image.id}
                data-manage-package-id={ref.packageId}
                data-manage-image-index={String(ref.imageIndex)}
                data-manage-absolute-index={String(absoluteIndex)}
                className={`name-list-row ${manageMode ? "is-manage" : ""} ${manageMode && isChecked ? "is-selected" : ""} ${manageMode && image.hidden ? "is-hidden" : ""} ${isFocused ? "is-focused" : ""} ${isAdReviewExcluded ? "is-ad-review-excluded" : ""}`}
                data-slot="fg-main-content-image-name-list-row"
              >
                <button
                  className="name-list-row-main mpx-overlay-cell-btn"
                  data-mpx-button-variant="overlay-cell"
                  type="button"
                  aria-pressed={manageMode ? isChecked : undefined}
                  onClick={
                    !manageMode
                      ? () =>
                          onSelectImage(
                            ref.packageId,
                            ref.imageIndex,
                            absoluteIndex,
                          )
                      : undefined
                  }
                  onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                >
                  <span
                    className="name-list-row-label"
                    data-slot="fg-main-content-image-name-list-label"
                  >{`${manageMode && image.hidden ? `${t("ui.image.hiddenPrefix")} ` : ""}${fileName}`}</span>
                  <span>{`${image.sizeKb}KB`}</span>
                  <span>
                    {resolvedWidth > 0 && resolvedHeight > 0
                      ? `${resolvedWidth} x ${resolvedHeight}`
                      : "-"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`image-grid mpx-scrollbar-hidden ${manageMode ? "is-manage" : ""} ${isThumbnailInteractionLocked ? "is-pending-swap" : ""}`}
      data-slot="fg-main-content-image-grid"
      ref={gridRef}
      aria-busy={isThumbnailInteractionLocked || undefined}
      onWheel={handleThumbnailContainerWheel}
      onMouseDown={
        manageMode && !isThumbnailInteractionLocked
          ? startThumbnailDragToggle
          : undefined
      }
      style={{
        gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
        rowGap: `${thumbnailRowGap}px`,
        columnGap: `${thumbnailGap}px`,
      }}
    >
      {showSkeleton
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="thumb-card is-skeleton"
              data-slot="fg-main-content-image-grid-card"
              style={{ width: `${actualCellWidth}px` }}
            >
              <div
                className="thumb-placeholder"
                style={{ aspectRatio: "1 / 1" }}
              >
                <div
                  className="thumb-media thumb-media-empty"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          ))
        : refsInPageForRender.map((ref, pageIndex) => {
            const pkg = packageById.get(ref.packageId);
            const image = pkg?.images[ref.imageIndex];
            if (!pkg || !image) {
              return null;
            }

            const absoluteIndex = pageStart + pageIndex;
            const isFocused =
              focusedRef?.packageId === ref.packageId &&
              focusedRef?.imageIndex === ref.imageIndex;
            const imageSrc = imageUrlByIdForRender[image.id] ?? "";
            const isChecked = checkedImageIds.has(image.id);
            const isAdReviewCandidate = adReviewCandidateImageIds.has(image.id);
            const isAdReviewNonBody = adReviewNonBodyImageIds.has(image.id);
            const isAdReviewExcluded =
              manageMode && isAdReviewCandidate && !isChecked;
            const previousRef =
              pageIndex > 0 ? refsInPageForRender[pageIndex - 1] : null;
            const previousImage = previousRef
              ? packageById.get(previousRef.packageId)?.images[
                  previousRef.imageIndex
                ]
              : null;
            const currentGroup = isAdReviewCandidate
              ? "ad"
              : isAdReviewNonBody
                ? "nonbody"
                : "other";
            const previousGroup = previousImage
              ? adReviewCandidateImageIds.has(previousImage.id)
                ? "ad"
                : adReviewNonBodyImageIds.has(previousImage.id)
                  ? "nonbody"
                  : "other"
              : "other";
            const startsNewPackageRow =
              adReviewGroupByPackageRows &&
              (pageIndex === 0 || previousRef?.packageId !== ref.packageId);
            const startsNewIntraPackageGroupRow =
              adReviewPerformanceMode &&
              adReviewGroupByPackageRows &&
              previousRef?.packageId === ref.packageId &&
              ((previousGroup === "nonbody" && currentGroup === "ad") ||
                (previousGroup === "ad" && currentGroup === "nonbody"));
            return (
              <div
                key={`${ref.packageId}-${ref.imageIndex}`}
                data-manage-image-id={image.id}
                data-manage-package-id={ref.packageId}
                data-manage-image-index={String(ref.imageIndex)}
                data-manage-absolute-index={String(absoluteIndex)}
                className={`thumb-card ${manageMode ? "is-manage" : ""} ${manageMode && isChecked ? "is-selected" : ""} ${manageMode && image.hidden ? "is-hidden" : ""} ${isFocused ? "is-focused" : ""} ${isAdReviewExcluded ? "is-ad-review-excluded" : ""} ${startsNewIntraPackageGroupRow ? "is-ad-review-group-break" : ""}`}
                data-slot="fg-main-content-image-grid-card"
                style={{
                  width: `${actualCellWidth}px`,
                  gridColumnStart:
                    startsNewPackageRow || startsNewIntraPackageGroupRow
                      ? 1
                      : undefined,
                }}
              >
                <button
                  className="thumb-card-main"
                  type="button"
                  disabled={isThumbnailInteractionLocked}
                  onPointerDown={(event) => {
                    markThumbInputMouse();
                    scrollFocusedThumbIntoView(event.currentTarget);
                    scheduleFocusedThumbOriginSync();
                  }}
                  onClick={
                    !manageMode
                      ? () =>
                          onSelectImage(
                            ref.packageId,
                            ref.imageIndex,
                            absoluteIndex,
                          )
                      : undefined
                  }
                  onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                >
                  {manageMode && image.hidden ? (
                    <span className="manage-hidden-badge">
                      {t("ui.image.hiddenBadge")}
                    </span>
                  ) : null}
                  <span className="visually-hidden">{`${pkg.displayName} #${image.ordinal}`}</span>
                  {vectorMode ? (
                    <span className="visually-hidden">
                      {t("ui.image.similarityScore", {
                        score: (
                          vectorCandidates[absoluteIndex]?.score ?? 0
                        ).toFixed(2),
                      })}
                    </span>
                  ) : null}
                  <div
                    className="thumb-placeholder"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <div
                      className="thumb-media"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {imageSrc ? (
                        <img
                          className="thumb-media-image"
                          src={imageSrc}
                          alt={`${pkg.displayName} #${image.ordinal}`}
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <div className="thumb-media-empty" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
    </div>
  );
}
