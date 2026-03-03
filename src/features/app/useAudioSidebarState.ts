import { useMemo } from "react";

import { buildSidebarTree, findNodeById } from "../../mockData";
import type {
  AudioItem,
  SidebarNode,
  SidebarTreeDisplayMode,
} from "../../types";
import { compactSidebarTree } from "../sidebar/compactSidebarTree";
import { normalizePointerSidebarTree } from "../sidebar/normalizePointerSidebarTree";
import { createAudioSidebarModePredicates } from "../sidebar/sidebarTreePredicates";

interface UseAudioSidebarStateParams {
  audios: AudioItem[];
  musicRootNodeId: string | null;
  sidebarTreeDisplayMode?: SidebarTreeDisplayMode;
}

interface UseAudioSidebarStateResult {
  audioTreeRaw: SidebarNode[];
  musicRootNode: SidebarNode | null;
  rootScopedAudioIds: Set<string>;
  audiosForSidebar: AudioItem[];
  audioTreeForSidebar: SidebarNode[];
}

const audioSidebarPredicates = createAudioSidebarModePredicates();
const isCompressibleAudioFolderNode =
  audioSidebarPredicates.isCompressibleFolderNode;
const isAudioPointerFolderNode = audioSidebarPredicates.isPointerFolderNode;
const isAudioMediaNode = audioSidebarPredicates.isMediaNode;

function buildAudioFolderTree(audios: AudioItem[]): SidebarNode[] {
  const directAudioCountByPath = new Map<string, number>();
  const firstAudioIdByPath = new Map<string, string>();
  const uniqueFolderLeaves = new Map<
    string,
    { id: string; treePath: string[] }
  >();

  for (const audio of audios) {
    const folderPath = audio.treePath.slice(
      0,
      Math.max(0, audio.treePath.length - 1),
    );
    if (folderPath.length === 0) {
      continue;
    }

    const pathKey = folderPath.join("/");
    directAudioCountByPath.set(
      pathKey,
      (directAudioCountByPath.get(pathKey) ?? 0) + 1,
    );

    for (let index = 1; index <= folderPath.length; index += 1) {
      const ancestorPathKey = folderPath.slice(0, index).join("/");
      if (!firstAudioIdByPath.has(ancestorPathKey)) {
        firstAudioIdByPath.set(ancestorPathKey, audio.id);
      }
    }

    if (!uniqueFolderLeaves.has(pathKey)) {
      uniqueFolderLeaves.set(pathKey, {
        id: pathKey,
        treePath: folderPath,
      });
    }
  }

  const tree = buildSidebarTree(
    Array.from(uniqueFolderLeaves.values()),
    "folder",
  );

  const hydrateDescendantAudioCounts = (
    nodes: SidebarNode[],
  ): { audioFolderCount: number; trackCount: number } => {
    let totalAudioFolderCount = 0;
    let totalTrackCount = 0;

    for (const node of nodes) {
      const childCounts = hydrateDescendantAudioCounts(node.children);
      const directCount = directAudioCountByPath.get(node.pathKey) ?? 0;
      const selfAudioFolderCount = directCount > 0 ? 1 : 0;
      const nodeAudioFolderCount =
        selfAudioFolderCount + childCounts.audioFolderCount;
      const nodeTrackCount = directCount + childCounts.trackCount;

      node.directAudioCount = directCount;
      node.descendantAudioFolderCount = nodeAudioFolderCount;
      node.descendantNodeCount = nodeTrackCount;
      node.audioId = firstAudioIdByPath.get(node.pathKey);
      totalAudioFolderCount += nodeAudioFolderCount;
      totalTrackCount += nodeTrackCount;
    }

    return {
      audioFolderCount: totalAudioFolderCount,
      trackCount: totalTrackCount,
    };
  };

  hydrateDescendantAudioCounts(tree);
  return tree;
}

export function useAudioSidebarState({
  audios,
  musicRootNodeId,
  sidebarTreeDisplayMode = "direct",
}: UseAudioSidebarStateParams): UseAudioSidebarStateResult {
  const audioTreeRaw = useMemo(() => buildAudioFolderTree(audios), [audios]);

  const musicRootNode = useMemo(
    () => findNodeById(audioTreeRaw, musicRootNodeId),
    [audioTreeRaw, musicRootNodeId],
  );

  const rootScopedAudioIds = useMemo(() => {
    if (!musicRootNode) {
      return new Set(audios.map((audio) => audio.id));
    }

    const rootPath = musicRootNode.pathKey;
    const rootPrefix = `${rootPath}/`;
    return new Set(
      audios
        .filter((audio) => {
          const folderPath = audio.treePath
            .slice(0, Math.max(0, audio.treePath.length - 1))
            .join("/");
          return folderPath === rootPath || folderPath.startsWith(rootPrefix);
        })
        .map((audio) => audio.id),
    );
  }, [audios, musicRootNode]);

  const audiosForSidebar = useMemo(
    () => audios.filter((audio) => rootScopedAudioIds.has(audio.id)),
    [audios, rootScopedAudioIds],
  );

  const audioTreeForSidebar = useMemo(() => {
    const rawTree = buildAudioFolderTree(audiosForSidebar);
    const displayTree =
      sidebarTreeDisplayMode === "hierarchy"
        ? rawTree
        : compactSidebarTree(rawTree, {
            shouldCompressFolderNode: isCompressibleAudioFolderNode,
            includeRoot: true,
          });

    return normalizePointerSidebarTree(displayTree, {
      isPointerFolderNode: isAudioPointerFolderNode,
      isMediaNode: isAudioMediaNode,
      pointerLabelMode:
        sidebarTreeDisplayMode === "hierarchy" ? "segment" : "path",
      siblingOrder: "media-first",
    });
  }, [audiosForSidebar, sidebarTreeDisplayMode]);

  return {
    audioTreeRaw,
    musicRootNode,
    rootScopedAudioIds,
    audiosForSidebar,
    audioTreeForSidebar,
  };
}
