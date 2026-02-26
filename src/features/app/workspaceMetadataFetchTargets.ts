import type { MetadataFetchTarget } from "../metadata/metadataFetchTargets";

function stripArchiveSuffix(value: string): string {
  return value.replace(/\.(zip|rar|7z|cbz|cbr)$/i, "").trim();
}

interface BuildWorkspaceMetadataFetchTargetsParams {
  mode: "image" | "video" | "music";
  metadataManageMode: boolean;
  sidebarCheckedNodeIds: string[];
  sidebarNodeById: Map<
    string,
    { packageId?: string | null; imageSourceId?: string | null }
  >;
  metadataImagePackageId: string | null;
  packageById: Map<string, { displayName: string; packageName: string }>;
}

export function buildWorkspaceMetadataFetchTargets({
  mode,
  metadataManageMode,
  sidebarCheckedNodeIds,
  sidebarNodeById,
  metadataImagePackageId,
  packageById,
}: BuildWorkspaceMetadataFetchTargetsParams): MetadataFetchTarget[] {
  if (mode !== "image") {
    return [];
  }

  const orderedPackageIds: string[] = [];
  const seenPackageId = new Set<string>();
  const appendTarget = (packageId: string | null | undefined) => {
    const normalized = packageId?.trim() ?? "";
    if (!normalized || seenPackageId.has(normalized)) {
      return;
    }
    seenPackageId.add(normalized);
    orderedPackageIds.push(normalized);
  };

  if (metadataManageMode && sidebarCheckedNodeIds.length > 0) {
    for (const nodeId of sidebarCheckedNodeIds) {
      const node = sidebarNodeById.get(nodeId);
      if (!node) {
        continue;
      }
      appendTarget(node.packageId);
      appendTarget(node.imageSourceId);
    }
  }

  if (orderedPackageIds.length === 0) {
    appendTarget(metadataImagePackageId);
  }

  return orderedPackageIds
    .map((packageId) => {
      const source = packageById.get(packageId);
      if (!source) {
        return null;
      }
      return {
        packageId,
        label: source.displayName,
        defaultText: stripArchiveSuffix(source.packageName),
      } satisfies MetadataFetchTarget;
    })
    .filter((item): item is MetadataFetchTarget => item !== null);
}
