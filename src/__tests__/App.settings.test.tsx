import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { MockMediaRepository } from "../features/backend/repository/mockRepository";
import { useUiStore } from "../store/useUiStore";
import {
  click,
  flushUiUpdates,
  keyDown,
  mouseDown,
  resetAppTestEnvironment,
} from "../test/appTestUtils";

describe("MediaPlayer 虚拟 UI - settings", () => {
  const uiLongTestTimeoutMs = 60_000;

  const getSliderByLabelText = (text: string) => {
    const label = screen
      .getByText(text)
      .closest("label") as HTMLLabelElement | null;
    expect(label).not.toBeNull();
    const slider = label?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement | null;
    expect(slider).not.toBeNull();
    return slider as HTMLInputElement;
  };

  beforeEach(() => {
    resetAppTestEnvironment();
  });

  it(
    "设置面板按 side/main 分栏并包含界面设置聚合与快捷键鼠标录入",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      const settingsPanel = document.querySelector(
        ".settings-panel",
      ) as HTMLElement | null;
      expect(settingsPanel).not.toBeNull();

      expect(
        screen.getByRole("button", { name: "界面设置" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "AI辅助设置" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "快捷键设置" }),
      ).toBeInTheDocument();

      expect(screen.queryByRole("button", { name: "缩略图设置" })).toBeNull();
      expect(screen.queryByRole("button", { name: "theme 设置" })).toBeNull();

      expect(screen.getByText("语言设置")).toBeInTheDocument();
      expect(screen.getByText("主题设置")).toBeInTheDocument();
      expect(screen.getByText("布局参数")).toBeInTheDocument();
      expect(screen.queryByText("缩略图设置")).toBeNull();
      expect(screen.queryByText("频谱可视化设置")).toBeNull();

      const styleSelect = screen.getByRole("combobox", {
        name: "Style",
      }) as HTMLSelectElement;
      const paletteSelect = screen.getByRole("combobox", {
        name: "日间默认 Palette",
      }) as HTMLSelectElement;
      expect(styleSelect.value.length).toBeGreaterThan(0);
      expect(
        Array.from(styleSelect.options).some(
          (option) => option.value === styleSelect.value,
        ),
      ).toBe(true);
      expect(paletteSelect.value.length).toBeGreaterThan(0);
      expect(
        Array.from(paletteSelect.options).some(
          (option) => option.value === paletteSelect.value,
        ),
      ).toBe(true);

      fireEvent.change(styleSelect, { target: { value: "TestStyle" } });
      await waitFor(() => {
        expect(document.documentElement.dataset.mpxStyle).toBe("TestStyle");
      });
      expect(
        Array.from(paletteSelect.options).map((option) => option.value),
      ).toEqual(["test-skeleton"]);
      expect(paletteSelect.value).toBe("test-skeleton");

      expect(screen.getByLabelText(/缩略图间距系数/)).toBeInTheDocument();
      expect(screen.queryByLabelText("缩略图质量")).toBeNull();
      expect(screen.queryByLabelText("缩略图宽度")).toBeNull();
      expect(screen.queryByLabelText("实际渲染长边分辨率")).toBeNull();
      expect(screen.queryByLabelText("渲染帧率上限")).toBeNull();
      expect(screen.queryByLabelText("Tone Mapping")).toBeNull();

      const settingsFontSlider = screen.getByLabelText(/设置面板字体系数/);
      const fontSizeBefore = settingsPanel?.style.fontSize;
      fireEvent.change(settingsFontSlider, { target: { value: "1.2" } });
      expect(settingsPanel?.style.fontSize).not.toBe(fontSizeBefore);

      const layoutGapSlider = screen.getByLabelText(/容器边距系数/);
      fireEvent.change(layoutGapSlider, { target: { value: "1.5" } });
      expect(
        document.documentElement.style.getPropertyValue(
          "--mpx-layout-gap-scale",
        ),
      ).toBe("1.50");
      expect(
        document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
      ).not.toBe("");
      expect(
        document.documentElement.style.getPropertyValue("--mpx-splitter-width"),
      ).not.toBe("");
      expect(
        document.documentElement.style.getPropertyValue(
          "--mpx-header-floating-gap",
        ),
      ).not.toBe("");

      const paneInnerGapSlider = screen.getByLabelText(/容器内边距系数/);
      fireEvent.change(paneInnerGapSlider, { target: { value: "0.6" } });
      expect(
        document.documentElement.style.getPropertyValue(
          "--mpx-pane-inner-gap-scale",
        ),
      ).toBe("0.60");

      const paneStackGapSlider = screen.getByLabelText(/容器内上中下间距系数/);
      fireEvent.change(paneStackGapSlider, { target: { value: "0.5" } });
      expect(
        document.documentElement.style.getPropertyValue(
          "--mpx-pane-stack-gap-scale",
        ),
      ).toBe("0.50");

      await click(screen.getByRole("button", { name: "高级分页" }));
      expect(screen.getByText("加载性能")).toBeInTheDocument();
      expect(screen.getByText("缩略图管线")).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图质量")).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图宽度")).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "调试" }));
      expect(
        screen.getByRole("button", { name: /显示 Electron 外框与菜单/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /显示界面参数按钮/ }),
      ).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "AI辅助设置" }));
      expect(screen.getByLabelText("视觉模型端口")).toBeInTheDocument();
      expect(screen.getByLabelText("视觉模型ID")).toBeInTheDocument();
      expect(screen.queryByLabelText("LM Studio Endpoint")).toBeNull();
      expect(screen.queryByRole("button", { name: "选择ONNX文件" })).toBeNull();
      expect(screen.queryByRole("button", { name: "选择CSV文件" })).toBeNull();

      await click(screen.getByRole("button", { name: "数据库设置" }));
      expect(screen.getByText("数据库目录设置")).toBeInTheDocument();
      expect(screen.getByLabelText("SQL 库路径")).toBeInTheDocument();
      expect(screen.getByLabelText("缩略图目录")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "选择SQL目录" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "选择缩略图目录" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("向量数据管理")).toBeNull();
      expect(screen.queryByRole("button", { name: "选择向量目录" })).toBeNull();

      await click(screen.getByRole("button", { name: "快捷键设置" }));
      expect(screen.getByText("全屏：上对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：下对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：左对齐")).toBeInTheDocument();
      expect(screen.getByText("全屏：右对齐")).toBeInTheDocument();

      const alignUpRow = screen
        .getByText("全屏：上对齐")
        .closest(".shortcut-row") as HTMLElement;
      expect(alignUpRow).not.toBeNull();
      const alignUpBindingButton = alignUpRow.querySelector(
        "button",
      ) as HTMLButtonElement;
      await click(alignUpBindingButton);
      const shortcutEditDialog = screen.getByRole("dialog", {
        name: "快捷键编辑",
      });
      expect(shortcutEditDialog).toBeInTheDocument();
      expect(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      ).toBeInTheDocument();
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "清除" }),
      );
      expect(screen.getByText("当前未设置快捷键。")).toBeInTheDocument();
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      );
      const captureDialog = screen.getByRole("dialog", { name: "录入快捷键" });
      await click(
        within(captureDialog).getByRole("button", { name: "鼠标右键" }),
      );
      await click(screen.getByRole("button", { name: "确认新增" }));
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "新增" }),
      );
      const wheelCaptureDialog = screen.getByRole("dialog", {
        name: "录入快捷键",
      });
      await click(
        within(wheelCaptureDialog).getByRole("button", { name: "滚轮下" }),
      );
      await click(screen.getByRole("button", { name: "确认新增" }));
      await click(
        within(shortcutEditDialog).getByRole("button", { name: "关闭" }),
      );
      expect(alignUpBindingButton.textContent).toContain("MouseRight");
      expect(alignUpBindingButton.textContent).toContain("WheelDown");
    },
    uiLongTestTimeoutMs,
  );

  it(
    "Theme Parameter 面板支持 T 打开、R 重置、H 临时隐藏，并可通过 Esc/右键恢复或关闭",
    async () => {
      render(<App />);

      await keyDown(window, { key: "t", code: "KeyT" });
      expect(
        screen.getByRole("heading", { name: "Theme Parameter" }),
      ).toBeInTheDocument();

      const baselineLayoutPadding = getSliderByLabelText("布局内边距").value;
      fireEvent.change(getSliderByLabelText("布局内边距"), {
        target: { value: "14" },
      });
      await flushUiUpdates();
      expect(
        document.documentElement.style.getPropertyValue("--mpx-layout-padding"),
      ).toBe("14px");

      await keyDown(window, { key: "r", code: "KeyR" });
      expect(getSliderByLabelText("布局内边距").value).toBe(
        baselineLayoutPadding,
      );

      await keyDown(window, { key: "h", code: "KeyH" });
      expect(
        screen.queryByRole("heading", { name: "Theme Parameter" }),
      ).toBeNull();

      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(
        screen.getByRole("heading", { name: "Theme Parameter" }),
      ).toBeInTheDocument();

      await keyDown(window, { key: "Escape", code: "Escape" });
      expect(
        screen.queryByRole("heading", { name: "Theme Parameter" }),
      ).toBeNull();

      await keyDown(window, { key: "t", code: "KeyT" });
      await keyDown(window, { key: "h", code: "KeyH" });
      await mouseDown(window, { button: 2 });
      expect(
        screen.getByRole("heading", { name: "Theme Parameter" }),
      ).toBeInTheDocument();

      const themeParameterOverlay = document.querySelector(
        '[data-overlay-close="theme-parameter"]',
      ) as HTMLElement | null;
      expect(themeParameterOverlay).not.toBeNull();

      await mouseDown(themeParameterOverlay as HTMLElement, { button: 2 });
      expect(
        screen.queryByRole("heading", { name: "Theme Parameter" }),
      ).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "数据库目录选择器可触发 SQL 与缩略图目录选择",
    async () => {
      const pickDirectoryPathSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "pickDirectoryPathSync",
      );

      render(<App />);
      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));
      await click(screen.getByRole("button", { name: "选择SQL目录" }));
      await click(screen.getByRole("button", { name: "选择缩略图目录" }));

      await waitFor(() => {
        expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2);
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "数据库目录设置会调用后端路径持久化并显示反馈",
    async () => {
      const pickDirectoryPathSpy = vi
        .spyOn(MockMediaRepository.prototype, "pickDirectoryPathSync")
        .mockImplementation((request) => ({
          canceled: false,
          path: request.title?.includes("SQL")
            ? "D:/media-db"
            : "D:/media-thumb-cache",
        }));

      const setRuntimeStoragePaths = vi
        .fn()
        .mockResolvedValueOnce({
          database_path: "D:/media-db/library.sqlite",
          thumbnail_cache_path: "C:/legacy-thumb-cache",
          moved_database: true,
          updated_at_ms: Date.now(),
        })
        .mockResolvedValueOnce({
          database_path: "D:/media-db/library.sqlite",
          thumbnail_cache_path: "D:/media-thumb-cache",
          moved_database: false,
          updated_at_ms: Date.now(),
        });

      const readRuntimeInfo = vi.fn().mockResolvedValue({
        app_version: "0.0.0-test",
        is_packaged: false,
        platform: "win32",
        arch: "x64",
        user_data_path: "C:/Users/test/AppData/Roaming/MediaPlayerX",
        library_root: "C:/Users/test/Pictures/MediaPlayerXLibrary",
        database_path: "D:/media-db/library.sqlite",
        thumbnail_cache_path: "D:/media-thumb-cache",
      });

      render(<App />);

      window.mediaPlayerBackend = {
        setRuntimeStoragePaths,
        readRuntimeInfo,
      } as unknown as typeof window.mediaPlayerBackend;

      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));

      await click(screen.getByRole("button", { name: "选择SQL目录" }));
      await waitFor(() => {
        expect(setRuntimeStoragePaths).toHaveBeenCalledWith({
          database_dir: "D:/media-db",
        });
      });

      await click(screen.getByRole("button", { name: "选择缩略图目录" }));
      await waitFor(() => {
        expect(setRuntimeStoragePaths).toHaveBeenCalledWith({
          thumbnail_cache_dir: "D:/media-thumb-cache",
        });
      });

      expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.getByText(/目录已保存/)).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "AI模型保存会持久化测试通过状态",
    async () => {
      const writeAppStateSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writeAppState",
      );

      render(<App />);
      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "AI辅助设置" }));

      act(() => {
        useUiStore.getState().updateSettings({
          adReviewVisionModel: "mock-vision-model",
          adReviewVisionVerified: true,
        });
      });

      await click(screen.getByRole("button", { name: "保存视觉模型配置" }));
      await waitFor(() => {
        expect(screen.getByText("视觉模型配置已保存")).toBeInTheDocument();
      });

      const hasPersistedVerifiedTrue = writeAppStateSpy.mock.calls.some(
        ([request]) => {
          try {
            const parsed = JSON.parse(request.state_json) as Record<
              string,
              unknown
            >;
            return parsed.adReviewVisionVerified === true;
          } catch {
            return false;
          }
        },
      );
      expect(hasPersistedVerifiedTrue).toBe(true);
    },
    uiLongTestTimeoutMs,
  );
});
