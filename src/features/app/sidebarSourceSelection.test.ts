import { describe, expect, it } from "vitest";

import type { ImagePackage } from "../../types";
import { resolvePreferredSidebarSources } from "./sidebarSourceSelection";

function createSource(id: string, imageCount: number): ImagePackage {
  return {
    id,
    packageName: `${id}.zip`,
    displayName: id,
    absolutePath: `C:/${id}.zip`,
    treePath: [id],
    workTitle: id,
    seriesId: "",
    circle: "",
    author: "",
    tags: [],
    images: Array.from({ length: imageCount }, (_, index) => ({
      id: `${id}-img-${index + 1}`,
      ordinal: index,
      width: 1,
      height: 1,
      sizeKb: 1,
      cluster: 0,
      color: "#000000",
      mediaLocator: {
        kind: "filesystem",
        absolutePath: `C:/${id}-${index + 1}.jpg`,
        extension: ".jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
      },
    })),
  };
}

describe("resolvePreferredSidebarSources", () => {
  it("优先使用 sidebar 快照来源（包括空数组）", () => {
    const sidebarSources: ImagePackage[] = [];
    const librarySources = [createSource("library", 3)];
    const bootstrapSources = [createSource("bootstrap", 3)];

    const resolved = resolvePreferredSidebarSources(
      sidebarSources,
      librarySources,
      bootstrapSources,
    );

    expect(resolved).toBe(sidebarSources);
  });

  it("sidebar 快照缺失且 library 含 images 时使用 library", () => {
    const librarySources = [createSource("library", 2)];
    const bootstrapSources = [createSource("bootstrap", 1)];

    const resolved = resolvePreferredSidebarSources(
      undefined,
      librarySources,
      bootstrapSources,
    );

    expect(resolved).toBe(librarySources);
  });

  it("sidebar 快照缺失且 library 仅 lite 空 images 时回退 bootstrap", () => {
    const librarySources = [createSource("library-lite", 0)];
    const bootstrapSources = [createSource("bootstrap", 2)];

    const resolved = resolvePreferredSidebarSources(
      undefined,
      librarySources,
      bootstrapSources,
    );

    expect(resolved).toBe(bootstrapSources);
  });

  it("当 library 与 bootstrap 都无 images 时保留 library", () => {
    const librarySources = [createSource("library-lite", 0)];
    const bootstrapSources = [createSource("bootstrap-lite", 0)];

    const resolved = resolvePreferredSidebarSources(
      undefined,
      librarySources,
      bootstrapSources,
    );

    expect(resolved).toBe(librarySources);
  });
});
