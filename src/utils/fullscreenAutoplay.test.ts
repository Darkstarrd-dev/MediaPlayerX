import { describe, expect, it } from "vitest";

import {
  resolveFullscreenAutoplayControlEnabled,
  resolveFullscreenImageAutoplayEnabled,
  resolveFullscreenImageNavigationEnabled,
} from "./fullscreenAutoplay";

describe("autoplay-regression/fullscreen-autoplay-utils", () => {
  it("双显示模式下不依赖焦点也允许图片自动播放", () => {
    expect(
      resolveFullscreenImageAutoplayEnabled({
        fullscreenActive: true,
        fullscreenDisplay: "dual",
      }),
    ).toBe(true);
  });

  it("仅视频模式下禁用图片自动播放", () => {
    expect(
      resolveFullscreenImageAutoplayEnabled({
        fullscreenActive: true,
        fullscreenDisplay: "video-only",
      }),
    ).toBe(false);
  });

  it("图片转换预览开启时禁用自动播放控件", () => {
    expect(
      resolveFullscreenAutoplayControlEnabled({
        imageConvertPreviewActive: true,
        fullscreenDisplay: "dual",
      }),
    ).toBe(false);
  });

  it("双显示模式下允许自动播放控件", () => {
    expect(
      resolveFullscreenAutoplayControlEnabled({
        imageConvertPreviewActive: false,
        fullscreenDisplay: "dual",
      }),
    ).toBe(true);
  });

  it("双显示且视频焦点时，autoplay 导航仍允许推进图片", () => {
    expect(
      resolveFullscreenImageNavigationEnabled({
        fullscreenActive: true,
        fullscreenDisplay: "dual",
        fullscreenVideoFocus: true,
        source: "autoplay",
      }),
    ).toBe(true);
  });

  it("双显示且视频焦点时，manual 导航仍遵循焦点限制", () => {
    expect(
      resolveFullscreenImageNavigationEnabled({
        fullscreenActive: true,
        fullscreenDisplay: "dual",
        fullscreenVideoFocus: true,
        source: "manual",
      }),
    ).toBe(false);
  });
});
