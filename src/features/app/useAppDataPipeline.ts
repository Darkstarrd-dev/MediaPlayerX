import { useAppDisplayAndEffects } from "./useAppDisplayAndEffects";
import { useAppReadAndNavigation } from "./useAppReadAndNavigation";
import { useAppRuntimeSources } from "./useAppRuntimeSources";
import { useAppViewComposition } from "./useAppViewComposition";
import { useResponsiveZoomEffect } from "./useResponsiveZoomEffect";

export function useAppDataPipeline() {
  const runtimeSources = useAppRuntimeSources();
  const importState = runtimeSources.importState;
  const importBusy =
    Boolean(importState?.enqueuePending) ||
    (importState?.importTasks ?? []).some(
      (task) => task.status === "pending" || task.status === "running",
    );

  useResponsiveZoomEffect();

  const readNavigationState = useAppReadAndNavigation({
    appSettings: runtimeSources.appSettings,
    sessionState: runtimeSources.sessionState,
    repositoryBootstrap: runtimeSources.repositoryBootstrap,
    importBusy,
    archiveLoadStatus: runtimeSources.archiveLoadStatus,
    mediaState: runtimeSources.mediaState,
  });

  const displayState = useAppDisplayAndEffects({
    appSettings: runtimeSources.appSettings,
    benchSettings: runtimeSources.benchSettings,
    mediaRepository: runtimeSources.repositoryBootstrap.mediaRepository,
    importBusy,
    sessionState: runtimeSources.sessionState,
    mediaState: runtimeSources.mediaState,
    readNavigationState,
  });

  return useAppViewComposition({
    runtimeSources,
    readNavigationState,
    displayState,
  });
}
