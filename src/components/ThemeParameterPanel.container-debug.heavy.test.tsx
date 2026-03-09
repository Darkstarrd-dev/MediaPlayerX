import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetUiStoreState, useUiStore } from "../store/useUiStore";
import { resetThemeParameterPanelSessionStateForTest } from "./theme-parameter/themeParameterPanelSessionState";
import {
  getDetailsBySummaryText,
  renderThemeParameterPanel,
} from "./ThemeParameterPanel.container-debug.test-utils";

describe("ThemeParameterPanel.container-debug.heavy", () => {
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

  it("大容器层调试拆分为三段可折叠，并支持新增槽位调试与快照导出", () => {
    renderThemeParameterPanel();

    fireEvent.click(screen.getByRole("button", { name: "大容器层调试" }));

    expect(screen.getByText("2.0 共享壳层")).toBeInTheDocument();
    expect(screen.getByText("2.1 Header")).toBeInTheDocument();
    expect(screen.getByText("2.2 Sidebar")).toBeInTheDocument();
    expect(screen.getByText("2.3 Main")).toBeInTheDocument();
    expect(screen.getByText("2.4 Metadata")).toBeInTheDocument();
    const sidebarSummary = screen.getByText("2.2.2.1 fg-sidebar-main");
    const nameListSummary = screen.getByText(
      "2.3.2.2 fg-main-content-image-name-list",
    );
    const metadataFileListSummary = screen.getByText("2.4.2.4 文件列表");
    expect(sidebarSummary).toBeInTheDocument();
    expect(nameListSummary).toBeInTheDocument();
    expect(metadataFileListSummary).toBeInTheDocument();

    fireEvent.click(sidebarSummary);
    expect(
      screen.getByText("1、sidebar-main 本体与容器链路"),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-bg" }),
      {
        target: { value: "#112233" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "--mpx-sidebar-main-label-border" }),
      {
        target: { value: "#223344" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue("--mpx-sidebar-main-bg"),
    ).toBe("#112233");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-sidebar-main-label-border",
      ),
    ).toBe("#223344");

    fireEvent.click(nameListSummary);
    const nameListDetails = getDetailsBySummaryText(
      "2.3.2.2 fg-main-content-image-name-list",
    );
    expect(
      within(nameListDetails).getByText("1、bg 背景与外层链路"),
    ).toBeInTheDocument();
    expect(
      within(nameListDetails).getByText("2、header 表头链路"),
    ).toBeInTheDocument();
    expect(
      within(nameListDetails).getByText("3、table 表格主体链路"),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-main-image-name-list-row-bg",
      }),
      {
        target: { value: "#334455" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "--mpx-main-image-name-list-head-bg",
      }),
      {
        target: { value: "#445566" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-image-name-list-row-bg",
      ),
    ).toBe("#334455");
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-main-image-name-list-head-bg",
      ),
    ).toBe("#445566");

    fireEvent.click(screen.getByText("2.4 Metadata"));
    fireEvent.click(metadataFileListSummary);
    const metadataFileListDetails = getDetailsBySummaryText("2.4.2.4 文件列表");
    expect(
      within(metadataFileListDetails).getByText("1、bg 背景与外层链路"),
    ).toBeInTheDocument();
    expect(
      within(metadataFileListDetails).getByText("2、table 表格主体链路"),
    ).toBeInTheDocument();
    fireEvent.change(
      within(metadataFileListDetails).getByRole("textbox", {
        name: "--mpx-metadata-file-list-row-main-hover-bg",
      }),
      {
        target: { value: "#556677" },
      },
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--mpx-metadata-file-list-row-main-hover-bg",
      ),
    ).toBe("#556677");

    fireEvent.click(screen.getByRole("button", { name: "参数导入导出" }));
    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));
    const snapshotTextarea = screen.getByLabelText(
      "参数快照 JSON",
    ) as HTMLTextAreaElement;
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-bg": "#112233"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-sidebar-main-label-border": "#223344"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-main-image-name-list-row-bg": "#334455"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-main-image-name-list-head-bg": "#445566"',
    );
    expect(snapshotTextarea.value).toContain(
      '"container-metadata-file-list-row-main-hover-bg": "#556677"',
    );
  }, 30000);
});
