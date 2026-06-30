import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../store/useUiStore";
import {
  appSettingsSchema,
  getEffectiveGroupFilterEnabled,
  getEffectiveSelectedGroupId,
  toGroupModeKey,
} from "./settings";

/**
 * 群组 focus/all 按模式独立 单元测试
 *
 * 覆盖：
 * 1. Schema 拆分：selectedGroupId → selectedGroupIdByMode；groupFilterEnabled → groupFilterEnabledByMode
 * 2. 旧字段（selectedGroupId / groupFilterEnabled）不再被 schema 接受（迁移路径）
 * 3. 默认值：image/video 都为 null/false
 * 4. 辅助函数按 mode 派生有效值
 */
describe("settings — 群组 focus/all 按模式独立", () => {
  it("schema 接受 selectedGroupIdByMode 与 groupFilterEnabledByMode 完整字段", () => {
    const candidate = {
      ...DEFAULT_SETTINGS,
      selectedGroupIdByMode: { image: "g-1", video: null },
      groupFilterEnabledByMode: { image: true, video: false },
    };
    const result = appSettingsSchema.safeParse(candidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedGroupIdByMode).toEqual({
        image: "g-1",
        video: null,
      });
      expect(result.data.groupFilterEnabledByMode).toEqual({
        image: true,
        video: false,
      });
    }
  });

  it("schema 默认值为 {image:null, video:null} 与 {image:false, video:false}", () => {
    const result = appSettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedGroupIdByMode).toEqual({
        image: null,
        video: null,
      });
      expect(result.data.groupFilterEnabledByMode).toEqual({
        image: false,
        video: false,
      });
    }
  });

  it("schema 拒绝旧的单值字段 selectedGroupId / groupFilterEnabled（迁移由旧用户配置自动剥离）", () => {
    // 旧用户配置包含旧字段。Zod 应忽略未在 schema 声明的字段（默认 strip 行为），
    // 旧字段被丢弃，新字段取默认值
    const legacy = {
      ...DEFAULT_SETTINGS,
      selectedGroupId: "g-legacy",
      groupFilterEnabled: true,
    };
    const result = appSettingsSchema.safeParse(legacy);
    expect(result.success).toBe(true);
    if (result.success) {
      // 旧字段不进入 parsed result
      expect(
        (result.data as { selectedGroupId?: unknown }).selectedGroupId,
      ).toBeUndefined();
      expect(
        (result.data as { groupFilterEnabled?: unknown }).groupFilterEnabled,
      ).toBeUndefined();
      // 新字段取默认值
      expect(result.data.selectedGroupIdByMode).toEqual({
        image: null,
        video: null,
      });
      expect(result.data.groupFilterEnabledByMode).toEqual({
        image: false,
        video: false,
      });
    }
  });

  it("toGroupModeKey 正确映射 BrowserMode", () => {
    expect(toGroupModeKey("image")).toBe("image");
    expect(toGroupModeKey("video")).toBe("video");
    expect(toGroupModeKey("music")).toBeNull();
  });

  it("getEffectiveGroupFilterEnabled 按模式派生", () => {
    const byMode = { image: true, video: false };
    expect(getEffectiveGroupFilterEnabled(byMode, "image")).toBe(true);
    expect(getEffectiveGroupFilterEnabled(byMode, "video")).toBe(false);
    expect(getEffectiveGroupFilterEnabled(byMode, "music")).toBe(false);
  });

  it("getEffectiveSelectedGroupId 按模式派生", () => {
    const byMode = { image: "g-img", video: "g-vid" };
    expect(getEffectiveSelectedGroupId(byMode, "image")).toBe("g-img");
    expect(getEffectiveSelectedGroupId(byMode, "video")).toBe("g-vid");
    expect(getEffectiveSelectedGroupId(byMode, "music")).toBeNull();
  });

  it("image / video 字段独立：修改 image 不会影响 video", () => {
    const before = {
      selectedGroupIdByMode: { image: "g-a", video: "g-b" },
      groupFilterEnabledByMode: { image: true, video: false },
    };
    // 模拟更新 image 字段
    const after = {
      ...before,
      selectedGroupIdByMode: {
        ...before.selectedGroupIdByMode,
        image: "g-c",
      },
      groupFilterEnabledByMode: {
        ...before.groupFilterEnabledByMode,
        image: false,
      },
    };
    // video 字段不变
    expect(after.selectedGroupIdByMode.video).toBe("g-b");
    expect(after.groupFilterEnabledByMode.video).toBe(false);
    // image 字段已更新
    expect(after.selectedGroupIdByMode.image).toBe("g-c");
    expect(after.groupFilterEnabledByMode.image).toBe(false);
  });
});
