import { describe, expect, it } from "vitest";

import { buildFullscreenWindowOffsets } from "./useResolvedMediaState";

describe("buildFullscreenWindowOffsets", () => {
  it("includes the focused index at position 0 when includeFocused is true", () => {
    expect(buildFullscreenWindowOffsets(5, 2, true)).toEqual([5, 6, 4, 7, 3]);
  });

  it("omits the focused index when includeFocused is false (adjacent semantics)", () => {
    expect(buildFullscreenWindowOffsets(5, 2, false)).toEqual([6, 4, 7, 3]);
  });

  it("interleaves forward then backward at each step radius", () => {
    // [fi, fi+1, fi-1, fi+2, fi-2, fi+3, fi-3]
    expect(buildFullscreenWindowOffsets(10, 3, true)).toEqual([
      10, 11, 9, 12, 8, 13, 7,
    ]);
  });

  it("clamps radius below 1 to 1", () => {
    // radius 0 → treated as 1
    expect(buildFullscreenWindowOffsets(5, 0, true)).toEqual([5, 6, 4]);
  });

  it("handles radius 1 minimal window", () => {
    expect(buildFullscreenWindowOffsets(2, 1, true)).toEqual([2, 3, 1]);
    expect(buildFullscreenWindowOffsets(2, 1, false)).toEqual([3, 1]);
  });

  it("supports focusedIndex 0 (start of list) without wrapping", () => {
    expect(buildFullscreenWindowOffsets(0, 2, true)).toEqual([0, 1, -1, 2, -2]);
  });

  it("produces deterministic, length-bound output for large radius", () => {
    // includeFocused → 1 + 2*N entries
    expect(buildFullscreenWindowOffsets(8, 6, true)).toHaveLength(13);
    // adjacent only → 2*N entries
    expect(buildFullscreenWindowOffsets(8, 6, false)).toHaveLength(12);
  });
});
