import { describe, expect, it } from "vitest";

import { parseColorState, readCssColorState } from "./themeParameterUtils";

describe("themeParameterUtils", () => {
  it("支持解析 transparent 为透明颜色状态", () => {
    expect(parseColorState("transparent")).toEqual({
      hex: "#000000",
      alpha: 0,
    });
  });

  it("读取 CSS 变量时保留 transparent 默认值", () => {
    document.documentElement.style.setProperty("--mpx-test-transparent", "transparent");

    const computed = getComputedStyle(document.documentElement);
    expect(
      readCssColorState(computed, "--mpx-test-transparent", "#ffffff"),
    ).toEqual({
      hex: "#000000",
      alpha: 0,
    });

    document.documentElement.style.removeProperty("--mpx-test-transparent");
  });
});
