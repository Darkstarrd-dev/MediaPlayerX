import { describe, expect, it } from "vitest";

import {
  areLikelyDuplicateCue,
  computeCueTextSimilarity,
  computeDiceSimilarity,
  cueOverlapRatio,
  mergeDuplicateCues,
  normalizeCueTextForDedup,
} from "./subtitleCue.shared";

describe("subtitleCue.shared 文本规范化与相似度", () => {
  it("normalizeCueTextForDedup 应去除空白与标点并小写", () => {
    expect(normalizeCueTextForDedup("  Hello,   World!  ")).toBe("helloworld");
    expect(normalizeCueTextForDedup("你好， 世界！")).toBe("你好世界");
  });

  it("computeDiceSimilarity 与 computeCueTextSimilarity 应保持去重阈值语义", () => {
    expect(computeDiceSimilarity("abc", "abc")).toBe(1);
    expect(computeDiceSimilarity("a", "b")).toBe(0);
    expect(computeCueTextSimilarity("Hello world", "hello-world")).toBe(1);
    expect(computeCueTextSimilarity("alpha beta", "gamma delta")).toBeLessThan(
      0.82,
    );
  });
});

describe("subtitleCue.shared 重叠判定与合并", () => {
  it("cueOverlapRatio 应按更短区间计算重叠比", () => {
    expect(
      cueOverlapRatio(
        { start_sec: 1.0, end_sec: 3.0 },
        { start_sec: 2.0, end_sec: 2.5 },
      ),
    ).toBe(1);
  });

  it("areLikelyDuplicateCue 应综合文本与时间中心点判断", () => {
    expect(
      areLikelyDuplicateCue(
        {
          start_sec: 10.0,
          end_sec: 11.0,
          text: "Open the door",
          lang: "en",
        },
        {
          start_sec: 10.3,
          end_sec: 11.2,
          text: "open the door!",
          lang: "en",
        },
      ),
    ).toBe(true);

    expect(
      areLikelyDuplicateCue(
        {
          start_sec: 10.0,
          end_sec: 11.0,
          text: "Open the door",
          lang: "en",
        },
        {
          start_sec: 13.0,
          end_sec: 14.0,
          text: "Close the window",
          lang: "en",
        },
      ),
    ).toBe(false);
  });

  it("mergeDuplicateCues 应保留更长文本并扩展时间范围", () => {
    const merged = mergeDuplicateCues(
      {
        start_sec: 5.2,
        end_sec: 6.0,
        text: "short",
        lang: null,
        speaker: 1,
      },
      {
        start_sec: 5.0,
        end_sec: 6.4,
        text: "a little bit longer",
        lang: "en",
        line: "A" as const,
      },
    );

    expect(merged).toMatchObject({
      start_sec: 5,
      end_sec: 6.4,
      text: "a little bit longer",
      lang: "en",
      speaker: 1,
      line: "A",
    });
  });
});
