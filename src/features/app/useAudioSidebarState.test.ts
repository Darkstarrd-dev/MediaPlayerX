import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AudioItem, SidebarNode } from "../../types";
import { useAudioSidebarState } from "./useAudioSidebarState";

function makeAudio(params: {
  id: string;
  fileName: string;
  treePath: string[];
}): AudioItem {
  return {
    id: params.id,
    fileName: params.fileName,
    absolutePath: `Z:/audios/${params.fileName}`,
    treePath: params.treePath,
    durationSec: 120,
    sizeMb: 9,
    album: "mock-album",
    author: "mock-author",
    trackTitle: params.fileName,
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `Z:/audios/${params.fileName}`,
      extension: ".mp3",
      mediaType: "audio",
      mimeType: "audio/mpeg",
    },
  };
}

function findNodeById(
  nodes: SidebarNode[],
  nodeId: string,
): SidebarNode | null {
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }
    if (node.id === nodeId) {
      return node;
    }
    stack.push(...node.children);
  }
  return null;
}

describe("useAudioSidebarState", () => {
  it("音乐侧栏只构建目录节点并标注目录内音频数量", () => {
    const audios = [
      makeAudio({
        id: "audio-a",
        fileName: "track_a.mp3",
        treePath: ["X盘", "音乐", "专辑A", "track_a.mp3"],
      }),
      makeAudio({
        id: "audio-b",
        fileName: "track_b.mp3",
        treePath: ["X盘", "音乐", "专辑A", "track_b.mp3"],
      }),
      makeAudio({
        id: "audio-c",
        fileName: "track_c.mp3",
        treePath: ["X盘", "音乐", "专辑A", "子目录", "track_c.mp3"],
      }),
    ];

    const { result } = renderHook(() =>
      useAudioSidebarState({ audios, musicRootNodeId: null }),
    );

    const albumNode = findNodeById(
      result.current.audioTreeForSidebar,
      "folder:X盘/音乐/专辑A",
    );
    const childNode = findNodeById(
      result.current.audioTreeForSidebar,
      "folder:X盘/音乐/专辑A/子目录",
    );
    const driveNode = findNodeById(
      result.current.audioTreeForSidebar,
      "folder:X盘/音乐",
    );

    expect(result.current.audioTreeForSidebar[0]?.label).toBe("X盘/音乐/专辑A");
    expect(albumNode?.kind).toBe("folder");
    expect(albumNode?.descendantNodeCount).toBe(3);
    expect(albumNode?.directAudioCount).toBe(2);
    expect(albumNode?.descendantAudioFolderCount).toBe(2);
    expect(childNode?.descendantNodeCount).toBe(1);
    expect(childNode?.directAudioCount).toBe(1);
    expect(childNode?.descendantAudioFolderCount).toBe(1);
    expect(driveNode).toBeNull();
    const audioLeaf = findNodeById(
      result.current.audioTreeForSidebar,
      "audio:X盘/音乐/专辑A/track_a.mp3",
    );
    expect(audioLeaf).toBeNull();
    expect(albumNode?.audioId).toBe("audio-a");
    expect(childNode?.audioId).toBe("audio-c");
  });

  it("设置 music root 后只返回根目录子树内的音频", () => {
    const audios = [
      makeAudio({
        id: "audio-a",
        fileName: "track_a.mp3",
        treePath: ["X盘", "音乐", "专辑A", "track_a.mp3"],
      }),
      makeAudio({
        id: "audio-b",
        fileName: "track_b.mp3",
        treePath: ["X盘", "音乐", "专辑B", "track_b.mp3"],
      }),
    ];

    const { result } = renderHook(() =>
      useAudioSidebarState({
        audios,
        musicRootNodeId: "folder:X盘/音乐/专辑A",
      }),
    );

    expect(result.current.audiosForSidebar.map((audio) => audio.id)).toEqual([
      "audio-a",
    ]);
    expect(Array.from(result.current.rootScopedAudioIds)).toEqual(["audio-a"]);
  });
});
