import { describe, expect, it } from "vitest";

import {
  resolvePendingReviewNoticeToken,
  resolvePendingReviewNoticeVisible,
} from "./useAppTopLayerState";

describe("useAppTopLayerState notice helpers", () => {
  it("最新任务时间戳为空时重置通知 token", () => {
    expect(resolvePendingReviewNoticeToken(null)).toBeNull();
  });

  it("使用最新有效任务时间戳作为通知 token", () => {
    expect(resolvePendingReviewNoticeToken(100)).toBe(100);
    expect(resolvePendingReviewNoticeToken(180)).toBe(180);
  });

  it("未清除时显示待审核提示", () => {
    expect(resolvePendingReviewNoticeVisible(200, 100)).toBe(true);
  });

  it("手动清除当前 token 后隐藏提示", () => {
    expect(resolvePendingReviewNoticeVisible(200, 200)).toBe(false);
  });

  it("token 为空时隐藏提示", () => {
    expect(resolvePendingReviewNoticeVisible(null, null)).toBe(false);
  });
});
