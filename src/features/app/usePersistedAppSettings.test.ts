import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../../store/useUiStore";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import { toPersistedAppSettings } from "./usePersistedAppSettings";

describe("toPersistedAppSettings", () => {
  it("持久化时始终关闭自动播放，避免重启后继承运行态", () => {
    const persisted = toPersistedAppSettings({
      ...DEFAULT_SETTINGS,
      autoPlayEnabled: true,
      updateSettings: vi.fn(),
    } as unknown as AppSettingsStoreSnapshot);

    expect(persisted.autoPlayEnabled).toBe(false);
    expect(persisted.autoPlayInterval).toBe(DEFAULT_SETTINGS.autoPlayInterval);
  });
});
