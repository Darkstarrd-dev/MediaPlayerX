import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { resetUiStoreState } from "../store/useUiStore";

async function flushUiUpdates() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("App.mount", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("应用启动阶段不会触发 Maximum update depth exceeded", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<App />);

    for (let i = 0; i < 3; i += 1) {
      fireEvent(window, new Event("resize"));
    }

    await waitFor(() => {
      const hasMaxDepthError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(" ");
        return message.includes("Maximum update depth exceeded");
      });
      expect(hasMaxDepthError).toBe(false);
    });
  });

  it("挂载后基础更新循环可稳定完成", async () => {
    render(<App />);
    await flushUiUpdates();
    expect((document.body.textContent ?? "").length).toBeGreaterThan(0);
  });
});
