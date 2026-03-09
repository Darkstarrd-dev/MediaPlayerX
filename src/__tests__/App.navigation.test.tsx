import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../App";
import { click, resetAppTestEnvironment } from "../test/appTestUtils";

describe("App.navigation", () => {
  const uiLongTestTimeoutMs = 25_000;

  beforeEach(() => {
    resetAppTestEnvironment();
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
