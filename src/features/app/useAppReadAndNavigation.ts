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
  // 按 image / video 模式独立计算群组成员 id 集：两个模式可能选不同群组，
  // 因此需要分别获取成员列表，传入 sidebar scope state 用于过滤各自的 tree
  const imageGroupMemberIds = useMemo(
    () => groupState.getGroupMemberIds(appSettings.selectedGroupIdByMode.image),
    [groupState, appSettings.selectedGroupIdByMode.image],
  );
  const videoGroupMemberIds = useMemo(
    () => groupState.getGroupMemberIds(appSettings.selectedGroupIdByMode.video),
    [groupState, appSettings.selectedGroupIdByMode.video],
  );
  // 兼容旧调用点：image 模式使用 image 成员集，video 模式使用 video 成员集
  const groupMemberIds = useMemo(() => {
    return appSettings.mode === "image"
      ? imageGroupMemberIds
      : appSettings.mode === "video"
        ? videoGroupMemberIds
        : imageGroupMemberIds;
  }, [appSettings.mode, imageGroupMemberIds, videoGroupMemberIds]);

  const navigationState = useAppNavigationState({
    appSettings,
    sessionState,
    repositoryBootstrap,
    archiveLoadStatus,
    mediaState,
    readState,
    groupFilterEnabledByMode: appSettings.groupFilterEnabledByMode,
    selectedGroupIdByMode: appSettings.selectedGroupIdByMode,
    imageGroupMemberIds,
    videoGroupMemberIds,
    groupIsLoading: groupState.isLoading,
  });

  return {
    ...readState,
    ...navigationState,
    groupState,
    groupMemberIds,
    imageGroupMemberIds,
    videoGroupMemberIds,
  };
}

export type AppReadAndNavigationResult = ReturnType<
  typeof useAppReadAndNavigation
>;
