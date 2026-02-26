import { AdReviewStartDialog } from "./AdReviewStartDialog";
import { renderImageMainContent } from "./ImageMainSection.renderers";
import type { ImageMainSectionProps } from "./ImageMainSection.types";
import MetadataFetchPanel from "./metadata/MetadataFetchPanel";
import type { TranslateFn } from "../i18n/context";

interface ImageMainSectionContentAreaProps {
  nodeBrowseMode: boolean;
  showNamesOnly: boolean;
  manageMode: boolean;
  gridRef: ImageMainSectionProps["gridRef"];
  handleThumbnailContainerWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  thumbnailColumns: number;
  actualCellWidth: number;
  thumbnailGap: number;
  nodeBrowseItems: NonNullable<ImageMainSectionProps["nodeBrowseItems"]>;
  nodeBrowsePageStart: number;
  nodeBrowsePageSize: number;
  markThumbInputMouse: (target: EventTarget | null) => void;
  scrollFocusedThumbIntoView: (target: EventTarget | null) => void;
  scheduleFocusedThumbOriginSync: (target: EventTarget | null) => void;
  onSelectNodeBrowseItem: ImageMainSectionProps["onSelectNodeBrowseItem"];
  t: TranslateFn;
  setNameListBodyEl: (element: HTMLDivElement | null) => void;
  startMarqueeSelection: (event: React.MouseEvent<HTMLDivElement>) => void;
  startThumbnailDragToggle: (event: React.MouseEvent<HTMLDivElement>) => void;
  visibleImageRefs: NonNullable<ImageMainSectionProps["visibleImageRefs"]>;
  packageById: NonNullable<ImageMainSectionProps["packageById"]>;
  nameListDimsById: Record<string, { width: number; height: number }>;
  focusedRef: ImageMainSectionProps["focusedRef"];
  checkedImageIds: NonNullable<ImageMainSectionProps["checkedImageIds"]>;
  adReviewCandidateImageIds: ReadonlySet<string>;
  onSelectImage: ImageMainSectionProps["onSelectImage"];
  onEnterFullscreen: ImageMainSectionProps["onEnterFullscreen"];
  refsInPageForRender: NonNullable<ImageMainSectionProps["refsInPage"]>;
  isThumbnailInteractionLocked: boolean;
  imageUrlByIdForRender: NonNullable<ImageMainSectionProps["imageUrlById"]>;
  pageStart: number;
  adReviewGroupByPackageRows: boolean;
  showSkeleton: boolean;
  skeletonCount: number;
  vectorMode: ImageMainSectionProps["vectorMode"];
  vectorCandidates: NonNullable<ImageMainSectionProps["vectorCandidates"]>;
  marqueeStyle: { left: number; top: number; width: number; height: number } | null;
  adReviewStartDialogOpen: boolean;
  manageReviewMode: NonNullable<ImageMainSectionProps["manageReviewMode"]>;
  setAdReviewStartDialogOpen: (open: boolean) => void;
  startToolbarAdReviewWithOption: (skipReviewedNodes: boolean) => void;
  metadataFetchOpen: boolean;
  effectiveMetadataFetchTargets: NonNullable<ImageMainSectionProps["metadataFetchTargets"]>;
  metadataProxyServer: ImageMainSectionProps["metadataProxyServer"];
  metadataEhentaiCookies: ImageMainSectionProps["metadataEhentaiCookies"];
  metadataPending: boolean;
  setMetadataFetchOpen: (open: boolean) => void;
  handleSaveParsedMetadataByPackageId: (
    packageId: string,
    payload: Parameters<
      NonNullable<ImageMainSectionProps["onMetadataSaveParsedByPackageId"]>
    >[1],
  ) => Promise<void>;
}

export function ImageMainSectionContentArea({
  t,
  marqueeStyle,
  adReviewStartDialogOpen,
  manageReviewMode,
  setAdReviewStartDialogOpen,
  startToolbarAdReviewWithOption,
  metadataFetchOpen,
  effectiveMetadataFetchTargets,
  metadataProxyServer,
  metadataEhentaiCookies,
  metadataPending,
  setMetadataFetchOpen,
  handleSaveParsedMetadataByPackageId,
  ...contentProps
}: ImageMainSectionContentAreaProps) {
  const {
    markThumbInputMouse,
    scrollFocusedThumbIntoView,
    scheduleFocusedThumbOriginSync,
    ...restContentProps
  } = contentProps;

  return (
    <>
      {renderImageMainContent({
        ...restContentProps,
        t,
        markThumbInputMouse: () => markThumbInputMouse(null),
        scrollFocusedThumbIntoView: () => scrollFocusedThumbIntoView(null),
        scheduleFocusedThumbOriginSync: () => scheduleFocusedThumbOriginSync(null),
      })}

      {marqueeStyle && marqueeStyle.width > 2 && marqueeStyle.height > 2 ? (
        <div
          className="manage-selection-marquee"
          data-slot="fg-main-content-image-marquee-ovl"
          style={{
            left: `${marqueeStyle.left}px`,
            top: `${marqueeStyle.top}px`,
            width: `${marqueeStyle.width}px`,
            height: `${marqueeStyle.height}px`,
          }}
        />
      ) : null}

      <AdReviewStartDialog
        t={t}
        open={adReviewStartDialogOpen}
        manageReviewMode={manageReviewMode}
        onClose={() => setAdReviewStartDialogOpen(false)}
        onStartWithOption={startToolbarAdReviewWithOption}
      />

      <MetadataFetchPanel
        open={metadataFetchOpen}
        targets={effectiveMetadataFetchTargets}
        proxyServer={metadataProxyServer}
        ehentaiCookies={metadataEhentaiCookies}
        metadataPending={metadataPending}
        onClose={() => setMetadataFetchOpen(false)}
        onSaveParsedMetadataToTarget={handleSaveParsedMetadataByPackageId}
      />
    </>
  );
}
