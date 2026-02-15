import { describe, expect, it } from "vitest";

import type { ImageItem, ImagePackage, SidebarNode } from "../../types";
import { buildNodeBrowseItems } from "./workspaceImageDerivations";

function createImage(id: string, hidden = false): ImageItem {
  return {
    id,
    ordinal: 1,
    width: 1200,
    height: 1800,
    sizeKb: 512,
    cluster: 0,
    color: "#000000",
    hidden,
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `C:/mock/${id}.jpg`,
      extension: ".jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
    },
  };
}

function createPackage(id: string, images: ImageItem[]): ImagePackage {
  return {
    id,
    packageName: id,
    displayName: id,
    absolutePath: `C:/mock/${id}`,
    treePath: [id],
    workTitle: id,
    circle: "",
    author: "",
    tags: [],
    images,
    sourceCover: null,
    externalMetadata: null,
  };
}

describe("buildNodeBrowseItems", () => {
  it("falls back to first visible image in subset when parent source has no visible image", () => {
    const selectedSidebarNode: SidebarNode = {
      id: "folder:root",
      label: "root",
      kind: "folder",
      pathKey: "root",
      imageNodeType: "folder",
      children: [
        {
          id: "folder:root/child",
          label: "child",
          kind: "folder",
          pathKey: "root/child",
          imageNodeType: "folder",
          descendantImageCount: 2,
          children: [
            {
              id: "package:p1",
              label: "p1",
              kind: "package",
              pathKey: "root/child/p1",
              imageNodeType: "package",
              imageSourceId: "p1",
              packageId: "p1",
              children: [],
            },
            {
              id: "package:p2",
              label: "p2",
              kind: "package",
              pathKey: "root/child/p2",
              imageNodeType: "package",
              imageSourceId: "p2",
              packageId: "p2",
              children: [],
            },
          ],
        },
      ],
    };

    const packageById = new Map<string, ImagePackage>([
      ["p1", createPackage("p1", [createImage("p1-hidden", true)])],
      ["p2", createPackage("p2", [createImage("p2-visible")])],
    ]);

    const items = buildNodeBrowseItems({
      nodeBrowseMode: true,
      selectedSidebarNode,
      packageByIdEffective: packageById,
      sourceCoverImageUrlBySourceId: {},
      thumbnailImageUrlById: {
        "p2-visible": "thumb://p2-visible",
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].coverImageUrl).toBe("thumb://p2-visible");
  });

  it("uses official source cover when available for resolved subset source", () => {
    const selectedSidebarNode: SidebarNode = {
      id: "folder:root",
      label: "root",
      kind: "folder",
      pathKey: "root",
      imageNodeType: "folder",
      children: [
        {
          id: "folder:root/child",
          label: "child",
          kind: "folder",
          pathKey: "root/child",
          imageNodeType: "folder",
          descendantImageCount: 1,
          children: [
            {
              id: "package:p2",
              label: "p2",
              kind: "package",
              pathKey: "root/child/p2",
              imageNodeType: "package",
              imageSourceId: "p2",
              packageId: "p2",
              children: [],
            },
          ],
        },
      ],
    };

    const packageById = new Map<string, ImagePackage>([
      ["p2", createPackage("p2", [createImage("p2-visible")])],
    ]);

    const items = buildNodeBrowseItems({
      nodeBrowseMode: true,
      selectedSidebarNode,
      packageByIdEffective: packageById,
      sourceCoverImageUrlBySourceId: {
        p2: "cover://official-p2",
      },
      thumbnailImageUrlById: {
        "p2-visible": "thumb://p2-visible",
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].coverImageUrl).toBe("cover://official-p2");
  });

  it("prefers own source images for directory-like child nodes", () => {
    const selectedSidebarNode: SidebarNode = {
      id: "folder:root",
      label: "root",
      kind: "folder",
      pathKey: "root",
      imageNodeType: "folder",
      children: [
        {
          id: "folder:root/dir",
          label: "dir",
          kind: "folder",
          pathKey: "root/dir",
          imageNodeType: "directory",
          imageSourceId: "dir-source",
          directImageCount: 2,
          children: [
            {
              id: "package:nested",
              label: "nested",
              kind: "package",
              pathKey: "root/dir/nested",
              imageNodeType: "package",
              imageSourceId: "nested-source",
              packageId: "nested-source",
              children: [],
            },
          ],
        },
      ],
    };

    const packageById = new Map<string, ImagePackage>([
      [
        "dir-source",
        createPackage("dir-source", [
          createImage("dir-first"),
          createImage("dir-second"),
        ]),
      ],
      [
        "nested-source",
        createPackage("nested-source", [createImage("nested-first")]),
      ],
    ]);

    const items = buildNodeBrowseItems({
      nodeBrowseMode: true,
      selectedSidebarNode,
      packageByIdEffective: packageById,
      sourceCoverImageUrlBySourceId: {},
      thumbnailImageUrlById: {
        "dir-first": "thumb://dir-first",
        "nested-first": "thumb://nested-first",
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].imageCount).toBe(2);
    expect(items[0].coverImageUrl).toBe("thumb://dir-first");
  });
});
