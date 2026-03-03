import type { SidebarNode } from "../../types";

interface CompressibleFolderRule {
  requireImageFolderType?: boolean;
  forbidImageSourceId?: boolean;
  forbidPackageId?: boolean;
  forbidVideoId?: boolean;
  forbidAudioId?: boolean;
  requireDirectImageCountZero?: boolean;
  requireDirectAudioCountZero?: boolean;
}

interface SidebarModePredicateOptions {
  compressibleFolderRule: CompressibleFolderRule;
  isMediaNode: (node: SidebarNode) => boolean;
}

export interface SidebarModePredicates {
  isCompressibleFolderNode: (node: SidebarNode) => boolean;
  isPointerFolderNode: (node: SidebarNode) => boolean;
  isMediaNode: (node: SidebarNode) => boolean;
}

function createCompressibleFolderPredicate(rule: CompressibleFolderRule) {
  return (node: SidebarNode): boolean => {
    if (node.kind !== "folder") {
      return false;
    }

    if (
      rule.requireImageFolderType &&
      node.imageNodeType &&
      node.imageNodeType !== "folder"
    ) {
      return false;
    }

    if (rule.forbidImageSourceId && node.imageSourceId) {
      return false;
    }
    if (rule.forbidPackageId && node.packageId) {
      return false;
    }
    if (rule.forbidVideoId && node.videoId) {
      return false;
    }
    if (rule.forbidAudioId && node.audioId) {
      return false;
    }

    if (
      rule.requireDirectImageCountZero &&
      (node.directImageCount ?? 0) !== 0
    ) {
      return false;
    }
    if (
      rule.requireDirectAudioCountZero &&
      (node.directAudioCount ?? 0) !== 0
    ) {
      return false;
    }

    return true;
  };
}

export function createSidebarModePredicates(
  options: SidebarModePredicateOptions,
): SidebarModePredicates {
  const isCompressibleFolderNode = createCompressibleFolderPredicate(
    options.compressibleFolderRule,
  );

  return {
    isCompressibleFolderNode,
    isPointerFolderNode: isCompressibleFolderNode,
    isMediaNode: options.isMediaNode,
  };
}

export function createImageSidebarModePredicates(): SidebarModePredicates {
  return createSidebarModePredicates({
    compressibleFolderRule: {
      requireImageFolderType: true,
      forbidImageSourceId: true,
      forbidPackageId: true,
      forbidVideoId: true,
      forbidAudioId: true,
      requireDirectImageCountZero: true,
    },
    isMediaNode: (node) =>
      node.kind === "package" ||
      node.imageNodeType === "package" ||
      node.imageNodeType === "directory",
  });
}

export function createVideoSidebarModePredicates(): SidebarModePredicates {
  return createSidebarModePredicates({
    compressibleFolderRule: {
      forbidImageSourceId: true,
      forbidPackageId: true,
      forbidVideoId: true,
      forbidAudioId: true,
    },
    isMediaNode: (node) => node.kind === "video",
  });
}

export function createAudioSidebarModePredicates(): SidebarModePredicates {
  return createSidebarModePredicates({
    compressibleFolderRule: {
      forbidImageSourceId: true,
      forbidPackageId: true,
      forbidVideoId: true,
      requireDirectAudioCountZero: true,
    },
    isMediaNode: (node) =>
      node.kind === "folder" && (node.directAudioCount ?? 0) > 0,
  });
}

export function resolvePathLeaf(
  pathKey: string,
  fallbackLabel: string,
): string {
  const segments = pathKey.split("/");
  const leaf = segments[segments.length - 1]?.trim();
  return leaf && leaf.length > 0 ? leaf : fallbackLabel;
}
