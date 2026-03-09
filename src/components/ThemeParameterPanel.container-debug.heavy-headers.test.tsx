import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import {
  ensureDetailsOpen,
  getSliderByLabelText,
  renderThemeParameterPanel,
} from "./ThemeParameterPanel.container-debug.test-utils";

describe("ThemeParameterPanel.container-debug.heavy-headers", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    act(() => {
      resetThemeParameterPanelSessionStateForTest();
      resetUiStoreState();
      useUiStore.getState().updateSettings({ uiLocale: "zh-CN" });
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    act(() => {
      resetThemeParameterPanelSessionStateForTest();
      resetUiStoreState();
    });
  });

  it("Main/Metadata header root token 与按钮总控可独立写入", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    ensureDetailsOpen("2.3 Main");
    ensureDetailsOpen("2.3.1.0 Main header 总控");
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-main-header-fill-start" }),
      {
        target: { value: "#112233" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-main-header-fill-start-alpha",
      }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-main-header-fill-end" }),
      {
        target: { value: "#223344" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-main-header-fill-end-alpha",
      }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.change(getSliderByLabelText("--mpx-main-header-fill-angle"), {
      target: { value: "135" },
    });
    ensureDetailsOpen("2.3.1.1 Main header 按钮");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-main-header-button-bg",
      }),
      {
        target: { value: "#334455" },
      },
    );

    ensureDetailsOpen("2.4 Metadata");
    ensureDetailsOpen("2.4.1.0 Metadata header 总控");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-header-fill-start",
      }),
      {
        target: { value: "#445566" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-metadata-header-fill-start-alpha",
      }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-metadata-header-fill-end",
      }),
      {
        target: { value: "#556677" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "--mpx-metadata-header-fill-end-alpha",
      }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.change(getSliderByLabelText("--mpx-metadata-header-fill-angle"), {
      target: { value: "90" },
    });
    ensureDetailsOpen("2.4.1.1 Metadata header 按钮");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-slot-fg-meta-header-button-text",
      }),
      {
        target: { value: "#ddeeff" },
      },
    );

    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-header-fill-start",
      ),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-header-fill-end",
      ),
    ).toBe("#223344");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-header-fill-angle",
      ),
    ).toBe("135deg");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-main-header-button-bg",
      ),
    ).toBe("#334455");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-header-fill-start",
      ),
    ).toBe("#445566");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-header-fill-end",
      ),
    ).toBe("#556677");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-header-fill-angle",
      ),
    ).toBe("90deg");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-slot-fg-meta-header-button-text",
      ),
    ).toBe("#ddeeff");
  }, 60000);
});
