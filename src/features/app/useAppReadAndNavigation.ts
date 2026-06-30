import { useMemo } from "react";

import { useAppNavigationState } from "./useAppNavigationState";
import { useAppReadState } from "./useAppReadState";
import { useGroupState } from "../group";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { ArchiveLoadStatusResult } from "./useArchiveLoadStatus";
import type { MediaStateResult } from "../media/useMediaState";

interface UseAppReadAndNavigationParams {
  appSettings: AppSettingsStoreSnapshot;
  sessionState: AppSessionStateResult;
  repositoryBootstrap: RepositoryBootstrapDataResult;
  importBusy: boolean;
  archiveLoadStatus: ArchiveLoadStatusResult;
  mediaState: Pick<
    MediaStateResult,
    | "selectVideoFromBrowser"
    | "fullscreenActive"
    | "fullscreenDisplay"
    | "fullscreenVideoFocus"
  >;
}

export function useAppReadAndNavigation({
  appSettings,
  sessionState,
  repositoryBootstrap,
  importBusy,
  archiveLoadStatus,
  mediaState,
}: UseAppReadAndNavigationParams) {
  const readState = useAppReadState({
    appSettings,
    sessionState,
    repositoryBootstrap,
    mediaState,
    importBusy,
  });

  // 群组状态：在导航层注入，下游 useAppSidebarScopeState 用来过滤 sidebar 树，
  // useAppWorkspaceProps 用来拼装 groupFooterProps 与回调
  const groupState = useGroupState({
    mediaRepository: repositoryBootstrap.mediaRepository,
  });
  const groupMemberIds = useMemo(
    () => groupState.getGroupMemberIds(appSettings.selectedGroupId),
    [groupState, appSettings.selectedGroupId],
  );

  const navigationState = useAppNavigationState({
    appSettings,
    sessionState,
    repositoryBootstrap,
    archiveLoadStatus,
    mediaState,
    readState,
    groupMemberIds,
    groupIsLoading: groupState.isLoading,
  });

  return {
    ...readState,
    ...navigationState,
    groupState,
    groupMemberIds,
  };
}

export type AppReadAndNavigationResult = ReturnType<
  typeof useAppReadAndNavigation
>;
