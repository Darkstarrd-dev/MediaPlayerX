import { describe, expect, it } from "vitest";

import {
  convertSrtTextToVtt,
  decodeSubtitleText,
} from "./subtitleSrtVttConverter";

describe("subtitleSrtVttConverter", () => {
  it("应兼容 auto-live 元数据头并输出 WEBVTT", () => {
    const srtText = [
      "# ValidRanges: 0.0-2.0",
      "# ValidPlaybackRateThreshold: 1.0",
      "",
      "1",
      "00:00:00,000 --> 00:00:01,200",
      "第一行",
      "",
      "2",
      "00:00:01,300 --> 00:00:02,400",
      "Second line",
      "",
    ].join("\r\n");

    const vttText = convertSrtTextToVtt(srtText);

    expect(vttText.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vttText.includes("00:00:00.000 --> 00:00:01.200")).toBe(true);
    expect(vttText.includes("00:00:01.300 --> 00:00:02.400")).toBe(true);
    expect(vttText.includes("# ValidRanges")).toBe(false);
    expect(vttText.includes("# ValidPlaybackRateThreshold")).toBe(false);
  });

  it("应保留 timing settings", () => {
    const srtText = [
      "1",
      "00:00:05,000 --> 00:00:06,000 line:90% position:20%",
      "Hello",
      "",
    ].join("\n");

    const vttText = convertSrtTextToVtt(srtText);

    expect(
      vttText.includes("00:00:05.000 --> 00:00:06.000 line:90% position:20%"),
    ).toBe(true);
  });

  it("应正确解码 UTF-16LE BOM 的字幕文本", () => {
    const utf16Body = Buffer.from(
      "1\n00:00:00,000 --> 00:00:01,000\n你好\n\n",
      "utf16le",
    );
    const withBom = Buffer.concat([Buffer.from([0xff, 0xfe]), utf16Body]);

    const decoded = decodeSubtitleText(withBom);
    const vttText = convertSrtTextToVtt(decoded);

    expect(decoded.includes("00:00:00,000 --> 00:00:01,000")).toBe(true);
    expect(vttText.includes("00:00:00.000 --> 00:00:01.000")).toBe(true);
    expect(vttText.includes("你好")).toBe(true);
  });
});
