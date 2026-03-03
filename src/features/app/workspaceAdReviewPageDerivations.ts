import type { ManageAdReviewTaskDto } from "../../contracts/backend";
import type { FocusedImageRef, ImagePackage, SidebarNode } from "../../types";

interface ResolveAdReviewPageDerivationsParams {
  adReviewResultsMode: boolean;
  orderedRootScopedImageRefs: FocusedImageRef[];
  packageByIdEffective: Map<string, ImagePackage>;
  adReviewFocusTask: ManageAdReviewTaskDto | null;
  selectedSidebarNode: SidebarNode | null;
  pagedPageSize: number;
  thumbnailColumns: number;
  adReviewGroupByPackageRows: boolean;
  adReviewPageIndex: number;
  normalizedPageIndexEffective: number;
  visibleImageRefs: FocusedImageRef[];
  refsInPageEffective: FocusedImageRef[];
  pageStartEffective: number;
  imageTotalPagesEffective: number;
}

export function shouldGroupAdReviewByPackageRows(
  adReviewResultsMode: boolean,
  selectedSidebarNode: SidebarNode | null,
): boolean {
  if (!adReviewResultsMode) {
    return false;
  }

  if (!selectedSidebarNode) {
    return true;
  }

  return (
    selectedSidebarNode.kind === "folder" ||
    selectedSidebarNode.imageNodeType === "folder"
  );
}

interface ResolveAdReviewPageDerivationsResult {
  visibleImageRefsForMain: FocusedImageRef[];
  refsInPageBase: FocusedImageRef[];
  pageStartForMain: number;
  normalizedPageIndexForMain: number;
  imageTotalPagesForMain: number;
}

function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  return pathKey === prefix || pathKey.startsWith(`${prefix}/`);
}

function resolveImageIdByRef(
  ref: FocusedImageRef,
  packageByIdEffective: Map<string, ImagePackage>,
): string | null {
  return (
    packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]?.id ?? null
  );
}

function reorderRefsByAdReviewGroups(
  refs: FocusedImageRef[],
  packageByIdEffective: Map<string, ImagePackage>,
  options: {
    candidateImageIdSet: Set<string>;
    nonBodyImageIdSet: Set<string>;
  },
): FocusedImageRef[] {
  if (refs.length <= 1) {
    return refs;
  }

  const packageOrder: string[] = [];
  const refsByPackageId = new Map<string, FocusedImageRef[]>();
  for (const ref of refs) {
    if (!refsByPackageId.has(ref.packageId)) {
      refsByPackageId.set(ref.packageId, []);
      packageOrder.push(ref.packageId);
    }
    refsByPackageId.get(ref.packageId)?.push(ref);
  }

  const ordered: FocusedImageRef[] = [];
  for (const packageId of packageOrder) {
    const packageRefs = refsByPackageId.get(packageId) ?? [];
    if (packageRefs.length <= 1) {
      ordered.push(...packageRefs);
      continue;
    }

    const nonBodyRefs: FocusedImageRef[] = [];
    const adRefs: FocusedImageRef[] = [];
    const otherRefs: FocusedImageRef[] = [];
    for (const ref of packageRefs) {
      const imageId = resolveImageIdByRef(ref, packageByIdEffective);
      if (imageId && options.nonBodyImageIdSet.has(imageId)) {
        nonBodyRefs.push(ref);
        continue;
      }
      if (imageId && options.candidateImageIdSet.has(imageId)) {
        adRefs.push(ref);
        continue;
      }
      otherRefs.push(ref);
    }

    ordered.push(...nonBodyRefs, ...adRefs, ...otherRefs);
  }

  return ordered;
}

function paginateAdReviewRefsBySlots(
  refs: FocusedImageRef[],
  options: {
    pageSize: number;
    thumbnailColumns: number;
    groupByPackageRows: boolean;
  },
): { pages: FocusedImageRef[][]; pageStartByIndex: number[] } {
  const pageSize = Math.max(1, options.pageSize);
  const columns = Math.max(1, options.thumbnailColumns);
  const pages: FocusedImageRef[][] = [[]];
  const pageStartByIndex: number[] = [0];

  let pageIndex = 0;
  let usedCellsInPage = 0;
  let usedCellsInRow = 0;
  let refsConsumed = 0;
  let previousPackageId: string | null = null;

  const ensureCurrentPage = () => {
    if (!pages[pageIndex]) {
      pages[pageIndex] = [];
      pageStartByIndex[pageIndex] = refsConsumed;
    }
  };

  for (const ref of refs) {
    const startsNewPackage =
      options.groupByPackageRows &&
      previousPackageId !== null &&
      previousPackageId !== ref.packageId;
    if (startsNewPackage && usedCellsInRow > 0) {
      const remainingRowCells = columns - usedCellsInRow;
      if (usedCellsInPage + remainingRowCells >= pageSize) {
        pageIndex += 1;
        usedCellsInPage = 0;
        usedCellsInRow = 0;
        ensureCurrentPage();
      } else {
        usedCellsInPage += remainingRowCells;
        usedCellsInRow = 0;
      }
    }

    if (usedCellsInPage >= pageSize) {
      pageIndex += 1;
      usedCellsInPage = 0;
      usedCellsInRow = 0;
      ensureCurrentPage();
    }

    ensureCurrentPage();
    pages[pageIndex].push(ref);
    usedCellsInPage += 1;
    usedCellsInRow = (usedCellsInRow + 1) % columns;
    refsConsumed += 1;
    previousPackageId = ref.packageId;
  }

  return { pages, pageStartByIndex };
}

export function resolveAdReviewPageDerivations({
  adReviewResultsMode,
  orderedRootScopedImageRefs,
  packageByIdEffective,
  adReviewFocusTask,
  selectedSidebarNode,
  pagedPageSize,
  thumbnailColumns,
  adReviewGroupByPackageRows,
  adReviewPageIndex,
  normalizedPageIndexEffective,
  visibleImageRefs,
  refsInPageEffective,
  pageStartEffective,
  imageTotalPagesEffective,
}: ResolveAdReviewPageDerivationsParams): ResolveAdReviewPageDerivationsResult {
  const adReviewFocusImageIdSet = new Set([
    ...(adReviewFocusTask?.candidates.map((candidate) => candidate.image_id) ??
      []),
    ...(adReviewFocusTask?.performance_result?.nonbody_hide_ids ?? []),
  ]);
  const adReviewCandidateImageIdSet = new Set(
    adReviewFocusTask?.candidates.map((candidate) => candidate.image_id) ?? [],
  );
  const adReviewNonBodyImageIdSet = new Set(
    adReviewFocusTask?.performance_result?.nonbody_hide_ids ?? [],
  );
  const adReviewFocusRefsAll = adReviewResultsMode
    ? orderedRootScopedImageRefs.filter((ref) => {
        const imageId = resolveImageIdByRef(ref, packageByIdEffective);
        return Boolean(imageId && adReviewFocusImageIdSet.has(imageId));
      })
    : [];

  const adReviewFocusRefsBySidebar = adReviewResultsMode
    ? adReviewFocusRefsAll.filter((ref) => {
        if (!selectedSidebarNode) {
          return true;
        }

        const selectedNodeIsFolder =
          selectedSidebarNode.kind === "folder" ||
          selectedSidebarNode.imageNodeType === "folder";
        if (selectedNodeIsFolder) {
          const packagePathKey = packageByIdEffective
            .get(ref.packageId)
            ?.treePath.join("/");
          return Boolean(
            packagePathKey &&
            pathKeyHasPrefix(packagePathKey, selectedSidebarNode.pathKey),
          );
        }

        const nodePackageId =
          selectedSidebarNode.imageSourceId ?? selectedSidebarNode.packageId;
        if (!nodePackageId) {
          return true;
        }

        return ref.packageId === nodePackageId;
      })
    : [];

  const adReviewFocusRefsOrdered = adReviewResultsMode
    ? reorderRefsByAdReviewGroups(
        adReviewFocusRefsBySidebar,
        packageByIdEffective,
        {
          candidateImageIdSet: adReviewCandidateImageIdSet,
          nonBodyImageIdSet: adReviewNonBodyImageIdSet,
        },
      )
    : [];

  const { pages: adReviewPages, pageStartByIndex } =
    paginateAdReviewRefsBySlots(adReviewFocusRefsOrdered, {
      pageSize: pagedPageSize,
      thumbnailColumns,
      groupByPackageRows: adReviewGroupByPackageRows,
    });
  const adReviewImageTotalPages = Math.max(1, adReviewPages.length);
  const adReviewNormalizedPageIndex = Math.min(
    Math.max(adReviewPageIndex, 0),
    adReviewImageTotalPages - 1,
  );
  const adReviewPageStart = pageStartByIndex[adReviewNormalizedPageIndex] ?? 0;

  const visibleImageRefsForMain = adReviewResultsMode
    ? adReviewFocusRefsOrdered
    : visibleImageRefs;
  const refsInPageBase = adReviewResultsMode
    ? (adReviewPages[adReviewNormalizedPageIndex] ?? [])
    : refsInPageEffective;
  const pageStartForMain = adReviewResultsMode
    ? adReviewPageStart
    : pageStartEffective;
  const normalizedPageIndexForMain = adReviewResultsMode
    ? adReviewNormalizedPageIndex
    : normalizedPageIndexEffective;
  const imageTotalPagesForMain = adReviewResultsMode
    ? adReviewImageTotalPages
    : imageTotalPagesEffective;

  return {
    visibleImageRefsForMain,
    refsInPageBase,
    pageStartForMain,
    normalizedPageIndexForMain,
    imageTotalPagesForMain,
  };
}
