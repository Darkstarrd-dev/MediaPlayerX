import { describe, expect, it, vi } from "vitest";

import {
  normalizeOptionalPath,
  normalizePathForCompare,
} from "./pathNormalizationUtils";

describe("pathNormalizationUtils", () => {
  it("normalizeOptionalPath 会 trim 并在空字符串时返回 undefined", () => {
    expect(normalizeOptionalPath("  D:/media  ")).toBe("D:/media");
    expect(normalizeOptionalPath("   ")).toBeUndefined();
  });

  it("normalizePathForCompare 在非 Windows 平台保持大小写", () => {
    const platformSpy = vi
      .spyOn(window.navigator, "platform", "get")
      .mockReturnValue("MacIntel");

    expect(normalizePathForCompare("  D:\\Media\\Demo  ")).toBe(
      "D:/Media/Demo",
    );
    platformSpy.mockRestore();
  });

  it("normalizePathForCompare 在 Windows 平台转小写", () => {
    const platformSpy = vi
      .spyOn(window.navigator, "platform", "get")
      .mockReturnValue("Win32");

    expect(normalizePathForCompare("  D:\\Media\\Demo  ")).toBe(
      "d:/media/demo",
    );
    platformSpy.mockRestore();
  });
});
