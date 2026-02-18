import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { resetUiStoreState } from "../store/useUiStore";

async function flushUiUpdates() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("App.rendering", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("默认渲染检索按钮与主区域", async () => {
    render(<App />);
    await flushUiUpdates();
    expect(screen.getByRole("button", { name: "检索" })).toBeInTheDocument();
    expect((document.body.textContent ?? "").length).toBeGreaterThan(0);
  });
});
