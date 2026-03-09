import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../App";
import { flushUiUpdates, resetAppTestEnvironment } from "../test/appTestUtils";

describe("App.rendering", () => {
  const uiLongTestTimeoutMs = 25_000;

  beforeEach(() => {
    resetAppTestEnvironment();
  });

  it(
    "默认渲染检索按钮与主区域",
    async () => {
      render(<App />);
      await flushUiUpdates();
      expect(screen.getByRole("button", { name: "检索" })).toBeInTheDocument();
      expect((document.body.textContent ?? "").length).toBeGreaterThan(0);
    },
    uiLongTestTimeoutMs,
  );
});
