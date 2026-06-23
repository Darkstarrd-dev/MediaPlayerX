import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAppRuntimeSourcesMock = vi.fn();
const useResponsiveZoomEffectMock = vi.fn();
const useAppReadAndNavigationMock = vi.fn();
const useAppDisplayAndEffectsMock = vi.fn();
const useAppViewCompositionMock = vi.fn();

vi.mock("./useAppRuntimeSources", () => ({
  useAppRuntimeSources: () => useAppRuntimeSourcesMock(),
}));

vi.mock("./useResponsiveZoomEffect", () => ({
  useResponsiveZoomEffect: () => useResponsiveZoomEffectMock(),
}));

vi.mock("./useAppReadAndNavigation", () => ({
  useAppReadAndNavigation: (params: unknown) =>
    useAppReadAndNavigationMock(params),
}));

vi.mock("./useAppDisplayAndEffects", () => ({
  useAppDisplayAndEffects: (params: unknown) =>
    useAppDisplayAndEffectsMock(params),
}));

vi.mock("./useAppViewComposition", () => ({
  useAppViewComposition: (params: unknown) => useAppViewCompositionMock(params),
}));

import { useAppDataPipeline } from "./useAppDataPipeline";

describe("useAppDataPipeline integration", () => {
  beforeEach(() => {
    useAppRuntimeSourcesMock.mockReset();
    useResponsiveZoomEffectMock.mockReset();
    useAppReadAndNavigationMock.mockReset();
    useAppDisplayAndEffectsMock.mockReset();
    useAppViewCompositionMock.mockReset();
  });

  it("按顺序拼装 Runtime -> Read/Navigation -> Display -> View", () => {
    const runtimeSources = {
      appSettings: { mode: "image" },
      benchSettings: { enabled: false },
      repositoryBootstrap: { mediaRepository: { id: "repo-a" } },
      archiveLoadStatus: { byPath: {} },
      importState: { enqueuePending: false, importTasks: [] },
      sessionState: { manageMode: false },
      mediaState: { fullscreenActive: false },
    };
    const readNavigationState = { focusedRef: null };
    const displayState = { backendWrite: { pending: {} } };
    const viewState = { shell: { title: "MediaPlayerX" } };

    useAppRuntimeSourcesMock.mockReturnValue(runtimeSources);
    useAppReadAndNavigationMock.mockReturnValue(readNavigationState);
    useAppDisplayAndEffectsMock.mockReturnValue(displayState);
    useAppViewCompositionMock.mockReturnValue(viewState);

    const { result } = renderHook(() => useAppDataPipeline());

    expect(useResponsiveZoomEffectMock).toHaveBeenCalledTimes(1);
    expect(useAppReadAndNavigationMock).toHaveBeenCalledWith({
      appSettings: runtimeSources.appSettings,
      sessionState: runtimeSources.sessionState,
      repositoryBootstrap: runtimeSources.repositoryBootstrap,
      importBusy: false,
      archiveLoadStatus: runtimeSources.archiveLoadStatus,
      mediaState: runtimeSources.mediaState,
    });
    expect(useAppDisplayAndEffectsMock).toHaveBeenCalledWith({
      appSettings: runtimeSources.appSettings,
      benchSettings: runtimeSources.benchSettings,
      mediaRepository: runtimeSources.repositoryBootstrap.mediaRepository,
      importBusy: false,
      sessionState: runtimeSources.sessionState,
      mediaState: runtimeSources.mediaState,
      readNavigationState,
    });
    expect(useAppViewCompositionMock).toHaveBeenCalledWith({
      runtimeSources,
      readNavigationState,
      displayState,
    });
    expect(result.current).toBe(viewState);
  });

  it("rerender 时使用最新 runtime 结果，不复用旧依赖", () => {
    const runtimeSourcesA = {
      appSettings: { mode: "image" },
      benchSettings: { enabled: false },
      repositoryBootstrap: { mediaRepository: { id: "repo-a" } },
      archiveLoadStatus: { byPath: { a: "pending" } },
      importState: { enqueuePending: false, importTasks: [] },
      sessionState: { manageMode: false },
      mediaState: { fullscreenActive: false },
    };
    const runtimeSourcesB = {
      appSettings: { mode: "video" },
      benchSettings: { enabled: true },
      repositoryBootstrap: { mediaRepository: { id: "repo-b" } },
      archiveLoadStatus: { byPath: { b: "running" } },
      importState: { enqueuePending: false, importTasks: [] },
      sessionState: { manageMode: true },
      mediaState: { fullscreenActive: true },
    };

    useAppRuntimeSourcesMock
      .mockReturnValueOnce(runtimeSourcesA)
      .mockReturnValueOnce(runtimeSourcesB);
    useAppReadAndNavigationMock.mockReturnValue({});
    useAppDisplayAndEffectsMock.mockReturnValue({});
    useAppViewCompositionMock.mockReturnValue({});

    const { rerender } = renderHook(() => useAppDataPipeline());
    rerender();

    const latestReadCall = useAppReadAndNavigationMock.mock.calls.at(
      -1,
    )?.[0] as { appSettings?: { mode?: string } } | undefined;
    const latestDisplayCall = useAppDisplayAndEffectsMock.mock.calls.at(
      -1,
    )?.[0] as { mediaRepository?: { id?: string } } | undefined;

    expect(latestReadCall?.appSettings?.mode).toBe("video");
    expect(latestDisplayCall?.mediaRepository?.id).toBe("repo-b");
  });
});
