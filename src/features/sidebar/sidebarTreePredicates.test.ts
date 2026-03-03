import { describe, expect, it } from "vitest";

import type { SidebarNode } from "../../types";
import {
  createAudioSidebarModePredicates,
  createImageSidebarModePredicates,
  createVideoSidebarModePredicates,
  resolvePathLeaf,
} from "./sidebarTreePredicates";

function createFolderNode(overrides?: Partial<SidebarNode>): SidebarNode {
  return {
    id: "node-1",
    label: "node",
    pathKey: "A/B",
    kind: "folder",
    children: [],
    ...overrides,
  };
}

describe("sidebarTreePredicates", () => {
  it("resolvePathLeaf 应返回路径末段或 fallback", () => {
    expect(resolvePathLeaf("A/B/C", "fallback")).toBe("C");
    expect(resolvePathLeaf("A/B/", "fallback")).toBe("fallback");
  });

  it("image 模式谓词应符合 folder/media 判定", () => {
    const predicates = createImageSidebarModePredicates();
    expect(predicates.isCompressibleFolderNode(createFolderNode())).toBe(true);
    expect(
      predicates.isCompressibleFolderNode(
        createFolderNode({ directImageCount: 1, imageNodeType: "folder" }),
      ),
    ).toBe(false);
    expect(
      predicates.isMediaNode(createFolderNode({ kind: "package" as const })),
    ).toBe(true);
    expect(
      predicates.isMediaNode(createFolderNode({ imageNodeType: "directory" })),
    ).toBe(true);
  });

  it("video/audio 模式谓词应保持原语义", () => {
    const videoPredicates = createVideoSidebarModePredicates();
    const audioPredicates = createAudioSidebarModePredicates();

    expect(videoPredicates.isCompressibleFolderNode(createFolderNode())).toBe(
      true,
    );
    expect(
      videoPredicates.isCompressibleFolderNode(
        createFolderNode({ videoId: "video-1" }),
      ),
    ).toBe(false);
    expect(
      videoPredicates.isMediaNode(createFolderNode({ kind: "video" })),
    ).toBe(true);

    expect(audioPredicates.isCompressibleFolderNode(createFolderNode())).toBe(
      true,
    );
    expect(
      audioPredicates.isCompressibleFolderNode(
        createFolderNode({ directAudioCount: 2 }),
      ),
    ).toBe(false);
    expect(
      audioPredicates.isMediaNode(createFolderNode({ directAudioCount: 2 })),
    ).toBe(true);
  });
});
