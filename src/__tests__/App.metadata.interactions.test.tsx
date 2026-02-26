import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { MockMediaRepository } from "../features/backend/repository/mockRepository";
import { resetUiStoreState } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI - metadata", () => {
  const uiLongTestTimeoutMs = 25_000;

  const getMetadataManageModeButton = () =>
    screen.getByRole("button", {
      name: /进入元数据管理模式|退出元数据管理模式|元数据管理/,
    });

  const flushUiUpdates = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const click = async (target: Element | Window, init?: MouseEventInit) => {
    fireEvent.click(target as Element, init);
    await flushUiUpdates();
  };

  const keyDown = async (target: Element | Window, init: KeyboardEventInit) => {
    fireEvent.keyDown(target as Element, init);
    await flushUiUpdates();
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it(
    "默认只读元数据作者与社团标题点击复制当前值",
    async () => {
      const writeText = vi.fn(async () => undefined);
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      render(<App />);

      const authorFieldName = screen
        .getAllByText("作者")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const authorLabel = authorFieldName.closest("label") as HTMLElement;
      const authorValue = authorLabel.querySelector(
        ".metadata-localized-value",
      ) as HTMLElement;
      await click(authorFieldName);

      const circleFieldName = screen
        .getAllByText("社团")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const circleLabel = circleFieldName.closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value",
      ) as HTMLElement;
      await click(circleFieldName);

      await waitFor(() => {
        expect(writeText).toHaveBeenNthCalledWith(
          1,
          authorValue.textContent?.trim() ?? "",
        );
        expect(writeText).toHaveBeenNthCalledWith(
          2,
          circleValue.textContent?.trim() ?? "",
        );
      });
    },
    uiLongTestTimeoutMs,
  );


  it(
    "默认只读元数据点击作者值可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      const authorFieldName = screen
        .getAllByText("作者")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const authorLabel = authorFieldName.closest("label") as HTMLElement;
      const authorValue = authorLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(authorValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );


  it(
    "默认只读元数据点击社团值可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      const circleFieldName = screen
        .getAllByText("社团")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const circleLabel = circleFieldName.closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(circleValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );


  it(
    "视频模式只读元数据点击社团可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));

      const circleLabel = screen
        .getByText("社团")
        .closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(circleValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );


  it(
    "元数据管理支持按字段回车批量写入，不覆盖未提交字段",
    async () => {
      const writePackageMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writePackageMetadataSync",
      );
      render(<App />);

      await click(getMetadataManageModeButton());

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
      });

      await click(
        document.querySelector(
          ".sidebar-row.is-manage .sidebar-label",
        ) as HTMLButtonElement,
      );
      const circleInput = screen.getByLabelText(
        "英文社团名",
      ) as HTMLInputElement;
      fireEvent.change(circleInput, { target: { value: "批量社团更名" } });
      await keyDown(circleInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(writePackageMetadataSpy).toHaveBeenCalled();
      });

      const payloads = writePackageMetadataSpy.mock.calls.map(
        (call) => call[0],
      );
      expect(
        payloads.every((payload) => payload.circle === "批量社团更名"),
      ).toBe(true);
      expect(
        new Set(payloads.map((payload) => payload.package_id)).size,
      ).toBeGreaterThan(1);
      expect(
        new Set(payloads.map((payload) => payload.author)).size,
      ).toBeGreaterThanOrEqual(1);
      expect(
        payloads.every((payload) => payload.author !== "批量社团更名"),
      ).toBe(true);
    },
    uiLongTestTimeoutMs,
  );


  it(
    "元数据管理支持单选/复选切换，单选仅保留最后焦点节点",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());

      const toSingleModeButton = screen.getByRole("button", {
        name: "切换到单选模式",
      });
      expect(toSingleModeButton.textContent).toBe("M");
      await click(toSingleModeButton);

      const toMultipleModeButton = screen.getByRole("button", {
        name: "切换到复选模式",
      });
      expect(toMultipleModeButton.textContent).toBe("S");

      const labels = document.querySelectorAll(
        ".sidebar-row.is-manage .sidebar-label",
      );
      expect(labels.length).toBeGreaterThan(1);

      await click(labels[0] as HTMLButtonElement);
      await click(labels[1] as HTMLButtonElement);

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage.is-selected").length,
        ).toBe(1);
      });

      await click(toMultipleModeButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "切换到单选模式" }),
        ).toBeInTheDocument();
      });

      await click(labels[0] as HTMLButtonElement);

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage.is-selected").length,
        ).toBeGreaterThan(1);
      });
    },
    uiLongTestTimeoutMs,
  );


  it(
    "元数据管理面板已移除自动标签与嵌入按钮，仅保留同步名称",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "同步名称" }),
        ).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: "自动生成标签" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "视觉模型生成标签" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "生成嵌入向量" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

});
