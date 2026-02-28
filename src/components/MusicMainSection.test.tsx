import type { ComponentProps } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import type { AudioItem } from "../types";
import MusicMainSection from "./MusicMainSection";
import { resolveFullscreenControlsWidth } from "./fullscreen/controlsWidth";

function makeAudio(id: string): AudioItem {
  return {
    id,
    fileName: `${id}.mp3`,
    absolutePath: `Z:/music/${id}.mp3`,
    treePath: ["Z盘", "music", `${id}.mp3`],
    durationSec: 90,
    sizeMb: 6,
    album: "album",
    author: "author",
    trackTitle: id,
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `Z:/music/${id}.mp3`,
      extension: ".mp3",
      mediaType: "audio",
      mimeType: "audio/mpeg",
    },
  };
}

function createMusicMainSectionProps(
  overrides: Partial<ComponentProps<typeof MusicMainSection>> = {},
): ComponentProps<typeof MusicMainSection> {
  const audios = [makeAudio("track-1")];
  return {
    active: true,
    interruptByVideoPlayback: false,
    playRequestNonce: 0,
    manageMode: false,
    metadataManageMode: false,
    sidebarSelectedCount: 0,
    imageSelectedCount: 0,
    activeSelectionScope: null,
    pendingManageAction: false,
    manageOperationHint: null,
    canManageDelete: false,
    canManageMoveNodes: false,
    onManageDelete: vi.fn(),
    onManageGroup: vi.fn(),
    onManageMove: vi.fn(),
    onClearManageSelection: vi.fn(),
    canJumpToManga: false,
    canJumpToAnimation: false,
    canJumpToCover: false,
    canJumpToBooklet: false,
    onJumpToManga: vi.fn(),
    onJumpToAnimation: vi.fn(),
    onJumpToCover: vi.fn(),
    onJumpToBooklet: vi.fn(),
    audios,
    focusedAudio: audios[0],
    focusedAudioSrc: "mock://audio-1",
    mediaPreloadMemoryBudgetMb: 512,
    fullscreenVideoControlsMaxWidth: 980,
    audioPreloadItems: [{ id: audios[0].id, src: "mock://audio-1", sizeMb: 6 }],
    musicLoopMode: "library",
    musicLoopModeLabel: "全曲库循环",
    canPrevAudio: false,
    canNextAudio: true,
    fullscreenActive: false,
    popoverDebugPinned: false,
    onToggleFullscreen: vi.fn(),
    musicVisualizerShaderSettings: {
      renderLongEdgePx: 1280,
      renderScaleCoeff: 2,
      compositionMode: "single",
      layeredBackgroundShaderId: "galaxy",
      layeredForegroundShaderId: "mcs-szb",
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 60,
      toneMapMode: "aces",
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: "gpu",
    },
    musicVisualizerLayeredBackgroundShaderSettings: {
      renderLongEdgePx: 1280,
      renderScaleCoeff: 2,
      compositionMode: "single",
      layeredBackgroundShaderId: "galaxy",
      layeredForegroundShaderId: "mcs-szb",
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 60,
      toneMapMode: "aces",
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: "gpu",
    },
    musicVisualizerLayeredForegroundShaderSettings: {
      renderLongEdgePx: 1280,
      renderScaleCoeff: 2,
      compositionMode: "single",
      layeredBackgroundShaderId: "galaxy",
      layeredForegroundShaderId: "mcs-szb",
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 60,
      toneMapMode: "aces",
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: "gpu",
    },
    onMusicVisualizerShaderSettingsChange: vi.fn(),
    onMusicVisualizerLayerShaderIdChange: vi.fn(),
    onMusicVisualizerLayerShaderSettingsChange: vi.fn(),
    onPrevAudio: vi.fn(),
    onNextAudio: vi.fn(),
    onCycleMusicLoopMode: vi.fn(),
    ...overrides,
    musicVisualizerSelectedShaderId:
      overrides.musicVisualizerSelectedShaderId ?? "default",
  };
}

function renderMusicMainSection(
  overrides: Partial<ComponentProps<typeof MusicMainSection>> = {},
) {
  return render(
    <I18nProvider>
      <MusicMainSection {...createMusicMainSectionProps(overrides)} />
    </I18nProvider>,
  );
}

function setWindowViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

describe("MusicMainSection", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
      async () => undefined,
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    delete (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend;
    vi.restoreAllMocks();
  });

  it("音乐工具栏显示专辑与作者，并渲染可视化区域", () => {
    renderMusicMainSection();

    expect(screen.getByText("album / author (1 首)")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/music visualizer|音乐可视化/),
    ).toBeInTheDocument();
  });

  it("支持播放控制、进度条与音量弹层调节", () => {
    const { container } = renderMusicMainSection({
      canPrevAudio: true,
      onPrevAudio: vi.fn(),
      onNextAudio: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("音乐进度滑条"), {
      target: { value: "25" },
    });
    fireEvent.mouseUp(screen.getByLabelText("音乐进度滑条"));

    const muteButton = screen.getByRole("button", { name: "静音" });
    fireEvent.mouseEnter(muteButton.parentElement as HTMLElement);
    const volumeRange = screen.getByLabelText("音量滑条");
    fireEvent.change(volumeRange, { target: { value: "30" } });

    const audioElement = container.querySelector("audio") as HTMLAudioElement;
    expect(audioElement.currentTime).toBe(25);
    expect(audioElement.volume).toBeCloseTo(0.3, 3);
  });

  it("循环模式按钮可触发状态切换", () => {
    const onCycleMusicLoopMode = vi.fn();
    renderMusicMainSection({ onCycleMusicLoopMode });

    fireEvent.click(
      screen.getByRole("button", { name: "循环模式：全曲库循环" }),
    );
    expect(onCycleMusicLoopMode).toHaveBeenCalledTimes(1);
  });

  it("管理模式下应可打开 TC 面板并发起转码任务", async () => {
    const startAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-1",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "started",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const readAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-1",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "running",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      startAudioTranscodeTask,
      readAudioTranscodeTask,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    renderMusicMainSection({
      manageMode: true,
      canManageMoveNodes: true,
      activeSelectionScope: "sidebar",
      sidebarSelectedCount: 1,
      manageSelectedAudioIds: ["track-1"],
    });

    fireEvent.click(screen.getByRole("button", { name: "TC" }));
    expect(screen.getByText("音频转码")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "开始" }));
    });

    expect(startAudioTranscodeTask).toHaveBeenCalledWith({
      audio_ids: ["track-1"],
      preset: "flac",
      overwrite: false,
      copy_metadata: true,
      add_output_to_music_sources: true,
    });
  });

  it("应支持选择输出目录并带入转码请求", async () => {
    const pickDirectoryPath = vi.fn().mockResolvedValue({
      canceled: false,
      path: "Z:/music/transcoded",
    });
    const startAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-with-output-dir",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "started",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const readAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-with-output-dir",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "running",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      pickDirectoryPath,
      startAudioTranscodeTask,
      readAudioTranscodeTask,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    renderMusicMainSection({
      manageMode: true,
      canManageMoveNodes: true,
      activeSelectionScope: "sidebar",
      sidebarSelectedCount: 1,
      manageSelectedAudioIds: ["track-1"],
    });

    fireEvent.click(screen.getByRole("button", { name: "TC" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "选择目录" }));
    });

    expect(pickDirectoryPath).toHaveBeenCalledWith({
      title: "选择转码输出目录",
      default_path: undefined,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Z:/music/transcoded")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "开始" }));
    });

    expect(startAudioTranscodeTask).toHaveBeenCalledWith({
      audio_ids: ["track-1"],
      preset: "flac",
      output_dir: "Z:/music/transcoded",
      overwrite: false,
      copy_metadata: true,
      add_output_to_music_sources: true,
    });
  });

  it("无侧栏选中时应回退当前焦点曲目发起转码", async () => {
    const startAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-fallback",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "started",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const readAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-fallback",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "running",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      startAudioTranscodeTask,
      readAudioTranscodeTask,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    renderMusicMainSection({
      manageMode: true,
      canManageMoveNodes: true,
      activeSelectionScope: "sidebar",
      sidebarSelectedCount: 0,
      manageSelectedAudioIds: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "TC" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "开始" }));
    });

    expect(startAudioTranscodeTask).toHaveBeenCalledWith({
      audio_ids: ["track-1"],
      preset: "flac",
      overwrite: false,
      copy_metadata: true,
      add_output_to_music_sources: true,
    });
  });

  it("转码执行中点击取消任务应调用后端取消接口", async () => {
    const startAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-2",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "started",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const readAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-2",
        status: "running",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "running",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const cancelAudioTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "audio-transcode-2",
        status: "cancelled",
        progress: 0,
        total_count: 1,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: "cancelled",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });

    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      startAudioTranscodeTask,
      readAudioTranscodeTask,
      cancelAudioTranscodeTask,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    renderMusicMainSection({
      manageMode: true,
      canManageMoveNodes: true,
      activeSelectionScope: "sidebar",
      sidebarSelectedCount: 1,
      manageSelectedAudioIds: ["track-1"],
    });

    fireEvent.click(screen.getByRole("button", { name: "TC" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "开始" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "取消任务" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "取消任务" }));
    });

    expect(cancelAudioTranscodeTask).toHaveBeenCalledWith({
      task_id: "audio-transcode-2",
    });
  });

  it("单曲循环在播放结束后会从头继续播放", () => {
    const { container } = renderMusicMainSection({
      musicLoopMode: "single",
      musicLoopModeLabel: "单曲循环",
      canNextAudio: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    const playCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls
      .length;

    const audioElement = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.ended(audioElement);

    expect(
      vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length,
    ).toBeGreaterThan(playCallCount);
  });

  it("playRequestNonce 递增时会触发播放", () => {
    const baseAudio = makeAudio("track-1");
    const baseProps = createMusicMainSectionProps({
      audios: [baseAudio],
      focusedAudio: baseAudio,
      focusedAudioSrc: "mock://audio-1",
    });

    const { rerender } = render(
      <I18nProvider>
        <MusicMainSection {...baseProps} playRequestNonce={0} />
      </I18nProvider>,
    );

    const initialPlayCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock
      .calls.length;

    rerender(
      <I18nProvider>
        <MusicMainSection {...baseProps} playRequestNonce={1} />
      </I18nProvider>,
    );

    expect(
      vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length,
    ).toBeGreaterThan(initialPlayCallCount);
  });

  it("视频开始播放时会中断音乐播放", () => {
    const { rerender } = renderMusicMainSection();

    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    const pauseCallCount = vi.mocked(HTMLMediaElement.prototype.pause).mock
      .calls.length;

    rerender(
      <I18nProvider>
        <MusicMainSection
          {...createMusicMainSectionProps({
            active: false,
            interruptByVideoPlayback: true,
            audios: [makeAudio("track-1")],
            focusedAudio: makeAudio("track-1"),
            focusedAudioSrc: "mock://audio-1",
          })}
        />
      </I18nProvider>,
    );

    expect(
      vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length,
    ).toBeGreaterThan(pauseCallCount);
  });

  it("播放中切歌时资源短暂置空后恢复会自动续播", () => {
    const track1 = makeAudio("track-1");
    const track2 = makeAudio("track-2");

    const baseProps = createMusicMainSectionProps({
      audios: [track1, track2],
      canPrevAudio: true,
      canNextAudio: true,
      focusedAudio: track1,
      focusedAudioSrc: "mock://audio-track-1",
    });

    const { rerender } = render(
      <I18nProvider>
        <MusicMainSection {...baseProps} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    const playCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls
      .length;

    rerender(
      <I18nProvider>
        <MusicMainSection
          {...baseProps}
          focusedAudio={track2}
          focusedAudioSrc={null}
        />
      </I18nProvider>,
    );
    rerender(
      <I18nProvider>
        <MusicMainSection
          {...baseProps}
          focusedAudio={track2}
          focusedAudioSrc="mock://audio-track-2"
        />
      </I18nProvider>,
    );

    expect(
      vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length,
    ).toBeGreaterThan(playCallCount);
  });

  it("无音乐源时也可控制 shader 播放与停止", () => {
    renderMusicMainSection({ focusedAudioSrc: null });

    const playButton = screen.getByRole("button", { name: "播放" });
    expect(playButton).not.toBeDisabled();

    fireEvent.click(playButton);
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(screen.getByRole("button", { name: "播放" })).toBeInTheDocument();
  });

  it("全屏按钮可切换音乐可视化全屏", () => {
    const onToggleFullscreen = vi.fn();
    renderMusicMainSection({ onToggleFullscreen });

    fireEvent.click(screen.getByRole("button", { name: "全屏" }));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it("工具栏封面按钮可触发跳转", () => {
    const onJumpToCover = vi.fn();
    renderMusicMainSection({ canJumpToCover: true, onJumpToCover });

    fireEvent.click(screen.getByRole("button", { name: "打开封面" }));
    expect(onJumpToCover).toHaveBeenCalledTimes(1);
  });

  it("全屏时使用底部浮动控制条并隐藏右上角退出按钮", () => {
    renderMusicMainSection({ fullscreenActive: true });

    const visualizer = screen.getByLabelText(/music visualizer|音乐可视化/);
    expect(
      (visualizer as HTMLElement).querySelector(
        ".music-controls-shell.is-fullscreen-floating",
      ),
    ).not.toBeNull();
    expect(
      (visualizer as HTMLElement).querySelector(
        ".music-controls-shell .fullscreen-meta-row",
      ),
    ).not.toBeNull();
    expect(screen.getByText(/Z:\/music\/track-1\.mp3/)).toBeInTheDocument();
    expect(
      (visualizer as HTMLElement).querySelector(
        ".music-visualizer-exit-fullscreen-btn",
      ),
    ).toBeNull();
  });

  it("全屏控制条在移出后淡出隐藏，移入后淡入显示", () => {
    vi.useFakeTimers();
    renderMusicMainSection({ fullscreenActive: true });

    const shell = document.querySelector(
      ".music-controls-shell.is-fullscreen-floating",
    ) as HTMLElement;
    expect(shell).toBeInTheDocument();
    expect(shell.hidden).toBe(true);
    expect(shell.className).not.toContain("is-visible");

    const hotzone = document.querySelector(
      ".music-controls-fullscreen-hotzone",
    ) as HTMLElement;
    fireEvent.mouseEnter(hotzone);

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(shell.hidden).toBe(false);
    expect(shell.className).toContain("is-visible");

    fireEvent.mouseLeave(shell);
    expect(shell.className).not.toContain("is-visible");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(shell.hidden).toBe(true);

    fireEvent.mouseEnter(hotzone);

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(shell.hidden).toBe(false);
    expect(shell.className).toContain("is-visible");

    vi.useRealTimers();
  });

  it("全屏时窗口尺寸变化会同步更新音乐控制条宽度变量", () => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const heightDescriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");

    try {
      setWindowViewport(1280, 720);
      renderMusicMainSection({ fullscreenActive: true });

      const visualizer = document.querySelector(
        ".music-visualizer.is-fullscreen",
      ) as HTMLElement;
      expect(visualizer).toBeInTheDocument();

      const initialWidth = `${resolveFullscreenControlsWidth({
        viewportWidth: 1280,
        viewportHeight: 720,
        widthCap: 980,
      })}px`;
      expect(
        visualizer.style.getPropertyValue("--mpx-fullscreen-controls-width"),
      ).toBe(initialWidth);

      const resizedWidth = `${resolveFullscreenControlsWidth({
        viewportWidth: 1920,
        viewportHeight: 1080,
        widthCap: 980,
      })}px`;

      act(() => {
        setWindowViewport(1920, 1080);
        fireEvent(window, new Event("resize"));
      });

      expect(
        visualizer.style.getPropertyValue("--mpx-fullscreen-controls-width"),
      ).toBe(resizedWidth);
      expect(resizedWidth).not.toBe(initialWidth);
    } finally {
      if (widthDescriptor) {
        Object.defineProperty(window, "innerWidth", widthDescriptor);
      }
      if (heightDescriptor) {
        Object.defineProperty(window, "innerHeight", heightDescriptor);
      }
    }
  });

  it("支持在控制栏打开 Shader 列表", () => {
    const { container } = renderMusicMainSection();

    const shaderButton = screen.getByRole("button", { name: /^Shader：/ });
    fireEvent.mouseEnter(shaderButton.parentElement as HTMLElement);

    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Starfield" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Galaxy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Escape" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tissue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Orbs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Simple Pan" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fungi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nebula" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rain Drips" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voxel" })).toBeInTheDocument();

    const controlsShell = container.querySelector(
      ".music-controls-shell",
    ) as HTMLElement;
    fireEvent.mouseLeave(controlsShell);

    expect(screen.queryByRole("button", { name: "Default" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Starfield" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Galaxy" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Escape" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Tissue" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Orbs" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Simple Pan" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Fungi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nebula" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rain Drips" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Voxel" })).toBeNull();
  });

  it("支持在控制栏打开 Shader 设置并更新当前 Shader 配置", () => {
    const onMusicVisualizerShaderSettingsChange = vi.fn();
    const onMusicVisualizerLayerShaderSettingsChange = vi.fn();
    renderMusicMainSection({
      onMusicVisualizerShaderSettingsChange,
      onMusicVisualizerLayerShaderSettingsChange,
    });

    const settingsButton = screen.getByRole("button", { name: "Shader 设置" });
    fireEvent.mouseEnter(settingsButton.parentElement as HTMLElement);

    const renderLongEdgeInput = screen.getByLabelText("渲染长边分辨率");
    fireEvent.change(renderLongEdgeInput, { target: { value: "5000" } });
    expect(onMusicVisualizerShaderSettingsChange).not.toHaveBeenCalledWith({
      renderLongEdgePx: 4096,
    });
    fireEvent.keyDown(renderLongEdgeInput, { key: "Enter", code: "Enter" });

    const foregroundScaleCoeffSlider = screen.getByLabelText(/前景分辨率系数/);
    fireEvent.change(foregroundScaleCoeffSlider, { target: { value: "3.6" } });
    expect(onMusicVisualizerLayerShaderSettingsChange).not.toHaveBeenCalledWith(
      "foreground",
      { renderScaleCoeff: 3.6 },
    );
    fireEvent.mouseUp(foregroundScaleCoeffSlider);

    const backgroundScaleCoeffSlider = screen.getByLabelText(/背景分辨率系数/);
    fireEvent.change(backgroundScaleCoeffSlider, { target: { value: "1.8" } });
    expect(onMusicVisualizerLayerShaderSettingsChange).not.toHaveBeenCalledWith(
      "background",
      { renderScaleCoeff: 1.8 },
    );
    fireEvent.mouseUp(backgroundScaleCoeffSlider);

    fireEvent.change(screen.getByLabelText("帧率限制"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText(/Tone Mapping 曝光/), {
      target: { value: "1.4" },
    });
    fireEvent.click(screen.getByLabelText("显示 FPS 调试信息"));

    expect(onMusicVisualizerShaderSettingsChange).toHaveBeenCalledWith({
      renderLongEdgePx: 4096,
    });
    expect(onMusicVisualizerLayerShaderSettingsChange).toHaveBeenCalledWith(
      "foreground",
      { renderScaleCoeff: 3.6 },
    );
    expect(onMusicVisualizerLayerShaderSettingsChange).toHaveBeenCalledWith(
      "background",
      { renderScaleCoeff: 1.8 },
    );
    expect(onMusicVisualizerShaderSettingsChange).toHaveBeenCalledWith({
      fpsCap: 120,
    });
    expect(onMusicVisualizerShaderSettingsChange).toHaveBeenCalledWith({
      toneMapExposure: 1.4,
    });
    expect(onMusicVisualizerShaderSettingsChange).toHaveBeenCalledWith({
      showFps: true,
    });
  });

  it("Shader 列表支持前景/背景目标切换与目标开关", () => {
    const onMusicVisualizerLayerShaderIdChange = vi.fn();
    const onMusicVisualizerShaderSettingsChange = vi.fn();
    renderMusicMainSection({
      onMusicVisualizerLayerShaderIdChange,
      onMusicVisualizerShaderSettingsChange,
    });

    const shaderButton = screen.getByRole("button", { name: /^Shader：/ });
    fireEvent.mouseEnter(shaderButton.parentElement as HTMLElement);

    const switchButtons = screen.getAllByRole("button", {
      name: "切换前景/背景选择",
    });
    const foregroundSwitch = switchButtons.find(
      (button) => button.textContent?.trim() === "F",
    ) as HTMLElement;
    const backgroundSwitch = switchButtons.find(
      (button) => button.textContent?.trim() === "B",
    ) as HTMLElement;
    const toggleButtons = screen.getAllByRole("button", {
      name: "切换当前层开关",
    });
    const backgroundToggle = toggleButtons[1] as HTMLElement;

    expect(foregroundSwitch).toHaveAttribute("aria-pressed", "true");
    expect(backgroundToggle).toHaveTextContent("ON");

    fireEvent.click(backgroundSwitch);
    expect(backgroundSwitch).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(backgroundToggle);
    expect(onMusicVisualizerShaderSettingsChange).toHaveBeenCalledWith({
      layeredBackgroundEnabled: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Voxel" }));
    expect(onMusicVisualizerLayerShaderIdChange).toHaveBeenCalledWith(
      "background",
      "voxel",
    );
  });

  it("Shader 参数面板在切换列表目标层后仍显示统一参数", () => {
    renderMusicMainSection();

    const shaderButton = screen.getByRole("button", { name: /^Shader：/ });
    fireEvent.mouseEnter(shaderButton.parentElement as HTMLElement);

    const switchButtons = screen.getAllByRole("button", {
      name: "切换前景/背景选择",
    });
    const backgroundSwitch = switchButtons.find(
      (button) => button.textContent?.trim() === "B",
    ) as HTMLElement;
    expect(backgroundSwitch).toHaveAttribute("aria-pressed", "false");

    const settingsButton = screen.getByRole("button", { name: "Shader 设置" });
    fireEvent.mouseEnter(settingsButton.parentElement as HTMLElement);
    expect(screen.getByText("Shader 参数")).toBeInTheDocument();
    expect(screen.getByLabelText(/前景分辨率系数/)).toBeInTheDocument();
    expect(screen.getByLabelText(/背景分辨率系数/)).toBeInTheDocument();
    expect(screen.getByLabelText(/前景X偏移/)).toBeInTheDocument();

    fireEvent.mouseEnter(shaderButton.parentElement as HTMLElement);
    fireEvent.click(backgroundSwitch);
    expect(backgroundSwitch).toHaveAttribute("aria-pressed", "true");

    fireEvent.mouseEnter(settingsButton.parentElement as HTMLElement);

    expect(screen.getByText("Shader 参数")).toBeInTheDocument();
    expect(screen.getByLabelText(/前景分辨率系数/)).toBeInTheDocument();
    expect(screen.getByLabelText(/背景分辨率系数/)).toBeInTheDocument();
    expect(screen.getByLabelText(/前景X偏移/)).toBeInTheDocument();
  });

  it("仅开启单层时按钮标签显示该层 shader，双层关闭时显示透明", () => {
    const { rerender } = render(
      <I18nProvider>
        <MusicMainSection
          {...createMusicMainSectionProps({
            musicVisualizerShaderSettings: {
              ...createMusicMainSectionProps().musicVisualizerShaderSettings,
              layeredBackgroundEnabled: false,
              layeredForegroundEnabled: true,
              layeredForegroundShaderId: "voxel",
            },
          })}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("button", { name: /^Shader：Voxel/ }),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <MusicMainSection
          {...createMusicMainSectionProps({
            musicVisualizerShaderSettings: {
              ...createMusicMainSectionProps().musicVisualizerShaderSettings,
              layeredBackgroundEnabled: false,
              layeredForegroundEnabled: false,
            },
          })}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("button", { name: /^Shader：透明/ }),
    ).toBeInTheDocument();
    const canvas = screen
      .getByLabelText(/music visualizer|音乐可视化/)
      .querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.style.opacity).toBe("0");
  });
});
