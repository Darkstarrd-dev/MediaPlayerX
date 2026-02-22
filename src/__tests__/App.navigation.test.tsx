import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { resetUiStoreState } from "../store/useUiStore";

async function flushUiUpdates() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function click(target: Element | Window, init?: MouseEventInit) {
  fireEvent.click(target as Element, init);
  await flushUiUpdates();
}

describe("App.navigation", () => {
  const uiLongTestTimeoutMs = 25_000;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it(
    "支持图片/视频模式切换",
    async () => {
      render(<App />);

      expect(screen.getByRole("button", { name: "检索" })).toBeInTheDocument();
      await click(screen.getByRole("button", { name: "视频模式" }));

      expect(
        await screen.findByRole("button", { name: "播放" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );
});
