import { describe, expect, it } from "vitest";

import { toErrorMessage } from "./errorMessageUtils";

describe("errorMessageUtils", () => {
  it("toErrorMessage 在 Error message 非空时返回 message", () => {
    expect(toErrorMessage(new Error("resolve failed"), "fallback")).toBe(
      "resolve failed",
    );
  });

  it("toErrorMessage 在非 Error 或空 message 时返回 fallback", () => {
    expect(toErrorMessage(new Error("   "), "fallback")).toBe("fallback");
    expect(toErrorMessage("error", "fallback")).toBe("fallback");
  });
});
