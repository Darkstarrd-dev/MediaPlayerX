import { describe, expect, it } from "vitest";

import type { FeatureFilterDto, ImagePackageDto } from "./backend";
import {
  deriveWorkTitleFromFileName,
  matchesFeatureFilter,
  normalizeFeatureFilter,
  normalizeMetadataTags,
  normalizeMetadataText,
  pickSourceGrade,
  syncPackageNameFromWorkTitle,
} from "./backend.shared";

function createSource(overrides?: Partial<ImagePackageDto>): ImagePackageDto {
  return {
    id: "pkg-1",
    package_name: "[Circle] Demo.zip",
    display_name: "Demo",
    absolute_path: "D:/library/[Circle] Demo.zip",
    tree_path: ["D:", "library", "[Circle] Demo.zip"],
    work_title: "Demo Work",
    series_id: "S-01",
    circle: "Circle",
    author: "Author",
    tags: ["TagA", "TagB"],
    mock_grade: 2,
    external_metadata: {
      source_site: "ehentai",
      source_url: "https://example.com/demo",
      source_remote_id: "demo-1",
      source_token: "token-1",
      title: "Demo Work",
      title_jpn: "デモ",
      group_name: "Circle",
      group_name_jpn: "サークル",
      artist: "Author",
      artist_jpn: "作者",
      posted: "2026-03-03",
      rating: null,
      favorited: null,
      tags: {
        language: "chinese,japanese",
      },
      raw_json: "{}",
    },
    source_cover: null,
    preference_metrics: null,
    images: [],
    ...overrides,
  };
}

describe("backend.shared feature filter", () => {
  it("normalizeFeatureFilter 应统一 trim 与小写", () => {
    const filter: FeatureFilterDto = {
      name_query: "  DEMO  ",
      work_title_query: "  WORK  ",
      series_id_query: "  S-01  ",
      circle_query: "  Circle  ",
      author_query: "  AUTHOR  ",
      tags: ["  TagA  ", "", "  language:Japanese  "],
      grade: 2,
    };

    expect(normalizeFeatureFilter(filter)).toEqual({
      name_query: "demo",
      work_title_query: "work",
      series_id_query: "s-01",
      circle_query: "circle",
      author_query: "author",
      tags: ["taga", "language:japanese"],
      grade: 2,
    });
  });

  it("matchesFeatureFilter 与 pickSourceGrade 应按覆盖值匹配评分", () => {
    const source = createSource({ mock_grade: 1 });
    const filter: FeatureFilterDto = {
      name_query: "demo",
      work_title_query: "demo",
      series_id_query: "s-01",
      circle_query: "circle",
      author_query: "author",
      tags: ["language:japanese"],
      grade: 3,
    };

    expect(pickSourceGrade(source.id, source.mock_grade, { "pkg-1": 3 })).toBe(
      3,
    );
    expect(
      matchesFeatureFilter(source, normalizeFeatureFilter(filter), {
        "pkg-1": 3,
      }),
    ).toBe(true);
    expect(
      matchesFeatureFilter(source, normalizeFeatureFilter(filter), {
        "pkg-1": 2,
      }),
    ).toBe(false);
  });
});

describe("backend.shared metadata 与命名工具", () => {
  it("normalizeMetadataText 与 normalizeMetadataTags 应保持旧行为", () => {
    expect(normalizeMetadataText("  ", "fallback")).toBe("fallback");
    expect(normalizeMetadataText("  value  ", "fallback")).toBe("value");
    expect(normalizeMetadataTags([" tagA ", "", "tagA", "tagB "])).toEqual([
      "tagA",
      "tagB",
    ]);
  });

  it("deriveWorkTitleFromFileName 与 syncPackageNameFromWorkTitle 应生成稳定名称", () => {
    expect(deriveWorkTitleFromFileName("demo.video.mp4")).toBe("demo.video");
    expect(deriveWorkTitleFromFileName("README")).toBe("README");

    const syncedWithExt = syncPackageNameFromWorkTitle(
      createSource({ absolute_path: "D:/library/demo.zip" }),
      "新标题",
    );
    expect(syncedWithExt).toEqual({
      packageName: "新标题.zip",
      displayName: "新标题",
    });

    const syncedWithoutExt = syncPackageNameFromWorkTitle(
      createSource({ absolute_path: "D:/library/demo", package_name: "demo" }),
      "新标题",
    );
    expect(syncedWithoutExt).toEqual({
      packageName: "新标题",
      displayName: "新标题",
    });
  });
});
