import { describe, expect, it } from "vitest";

import { parseSidebarNodeId, pathKeyHasPrefix } from "./sidebarNodeRef.utils";

describe("sidebarNodeRef.utils", () => {
  it("parseSidebarNodeId 可解析默认 kind", () => {
    expect(parseSidebarNodeId("folder:D:/media")).toEqual({
      kind: "folder",
      pathKey: "D:/media",
    });
    expect(parseSidebarNodeId("audio:D:/music")).toEqual({
      kind: "audio",
      pathKey: "D:/music",
    });
  });

  it("parseSidebarNodeId 支持按 allowedKinds 过滤", () => {
    const allowedKinds = new Set(["folder", "package", "video"] as const);
    expect(parseSidebarNodeId("audio:D:/music", allowedKinds)).toBeNull();
    expect(parseSidebarNodeId("video:D:/video", allowedKinds)).toEqual({
      kind: "video",
      pathKey: "D:/video",
    });
  });

  it("pathKeyHasPrefix 保持完全匹配与目录前缀匹配语义", () => {
    expect(pathKeyHasPrefix("D:/media", "D:/media")).toBe(true);
    expect(pathKeyHasPrefix("D:/media/set1", "D:/media")).toBe(true);
    expect(pathKeyHasPrefix("D:/media-set1", "D:/media")).toBe(false);
  });
});
