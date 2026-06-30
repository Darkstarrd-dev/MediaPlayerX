/**
 * 群组状态管理 Hook
 *
 * 负责：
 *  1. 启动时异步加载 `media_groups_v1` 持久化数据
 *  2. 提供 addGroup / deleteGroup / addToGroup / removeFromGroup 操作
 *  3. 写入操作 300ms 防抖，合并为单次 writeAppState 调用
 *  4. 暴露 isLoading 标志：true 时下游 filterTreeForGroup 应跳过过滤
 *  5. 提供 getGroupMemberIds(groupId) 供 sidebar scope state 过滤使用
 *
 * 设计约束（见 docs/33-group-feature-implementation.md）：
 *  - 不反向依赖 useAppSidebarScopeState / buildSidebarPanelProps
 *  - 调用方负责在选择群组后用 setSelectedGroupId 同步设置
 *  - readAppState 是异步 IPC，首屏必须等待 isLoading → false
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaRepository } from "../backend/repository";
import type { AppSettings } from "../../contracts/settings";
import {
  DEFAULT_MEDIA_GROUPS_DATA,
  type GroupDefinition,
  type GroupMediaType,
  type GroupMembership,
  type MediaGroupsData,
  type SelectedGroupId,
} from "./types";

/** 持久化 key（写入 app_state 表） */
export const MEDIA_GROUPS_STATE_KEY = "media_groups_v1";

/** 写入防抖时长（毫秒） */
const WRITE_DEBOUNCE_MS = 300;

export interface UseGroupStateParams {
  mediaRepository: MediaRepository;
}

export interface UseGroupStateResult {
  groups: GroupDefinition[];
  memberships: GroupMembership[];
  /** 是否仍在加载首屏数据；true 期间不要进行任何过滤 */
  isLoading: boolean;
  /** 添加群组，返回 null 表示重名 */
  addGroup: (name: string) => GroupDefinition | null;
  /** 删除群组（同步清理 memberships） */
  deleteGroup: (id: string) => void;
  /** 加入媒体；重复加入静默忽略 */
  addToGroup: (
    groupId: string,
    mediaId: string,
    mediaType: GroupMediaType,
  ) => void;
  /** 移除媒体成员 */
  removeFromGroup: (groupId: string, mediaId: string) => void;
  /** 获取某群组所有成员 ID 集合；不存在的 groupId 返回空 Set */
  getGroupMemberIds: (groupId: SelectedGroupId) => ReadonlySet<string>;
}

function parsePersistedGroups(rawJson: string | undefined): MediaGroupsData {
  if (!rawJson) {
    return DEFAULT_MEDIA_GROUPS_DATA;
  }
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as MediaGroupsData).groups) &&
      Array.isArray((parsed as MediaGroupsData).memberships)
    ) {
      return parsed as MediaGroupsData;
    }
  } catch {
    // 解析失败时回退到默认
  }
  return DEFAULT_MEDIA_GROUPS_DATA;
}

export function useGroupState({
  mediaRepository,
}: UseGroupStateParams): UseGroupStateResult {
  const [groups, setGroups] = useState<GroupDefinition[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时异步加载
  useEffect(() => {
    let cancelled = false;
    // 使用 const 局部保留引用，避免 useEffect 内部重复访问 mediaRepository
    const repository = mediaRepository;
    // 通过 bind 保留 `this`，否则 Mock 实现内访问 this.system 会报 undefined
    const readAppState = repository.readAppState?.bind(repository);
    if (!readAppState) {
      // 后端未实现 readAppState 时视为空数据
      if (!cancelled) {
        setGroups([]);
        setMemberships([]);
        setIsLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const response = await readAppState({
          state_key: MEDIA_GROUPS_STATE_KEY,
          fallback_json: JSON.stringify(DEFAULT_MEDIA_GROUPS_DATA),
        });
        if (cancelled) {
          return;
        }
        const data = parsePersistedGroups(response.state_json);
        setGroups(data.groups);
        setMemberships(data.memberships);
      } catch {
        if (!cancelled) {
          setGroups([]);
          setMemberships([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaRepository]);

  // 写操作防抖：所有写操作都合并为一次 writeAppState
  const pendingWriteRef = useRef<{
    groups: GroupDefinition[];
    memberships: GroupMembership[];
  } | null>(null);
  const writeTimerRef = useRef<number | null>(null);

  const scheduleWrite = useCallback(
    (nextGroups: GroupDefinition[], nextMemberships: GroupMembership[]) => {
      pendingWriteRef.current = {
        groups: nextGroups,
        memberships: nextMemberships,
      };
      if (writeTimerRef.current != null) {
        window.clearTimeout(writeTimerRef.current);
      }
      writeTimerRef.current = window.setTimeout(() => {
        const pending = pendingWriteRef.current;
        pendingWriteRef.current = null;
        writeTimerRef.current = null;
        if (!pending) {
          return;
        }
        const repository = mediaRepository;
        if (!repository.writeAppState) {
          return;
        }
        const payload: MediaGroupsData = {
          groups: pending.groups,
          memberships: pending.memberships,
        };
        void repository
          .writeAppState({
            state_key: MEDIA_GROUPS_STATE_KEY,
            state_json: JSON.stringify(payload),
          })
          .catch(() => {
            // 静默失败：避免污染 UI；下次写会覆盖
          });
      }, WRITE_DEBOUNCE_MS);
    },
    [mediaRepository],
  );

  useEffect(() => {
    return () => {
      if (writeTimerRef.current != null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, []);

  const addGroup = useCallback(
    (name: string): GroupDefinition | null => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }
      if (groups.some((group) => group.name === trimmed)) {
        return null;
      }
      const created: GroupDefinition = {
        id: generateGroupId(),
        name: trimmed,
        createdAtMs: Date.now(),
      };
      const nextGroups = [...groups, created];
      setGroups(nextGroups);
      // 群组定义不携带 memberships 变化，但保持写幂等
      scheduleWrite(nextGroups, memberships);
      return created;
    },
    [groups, memberships, scheduleWrite],
  );

  const deleteGroup = useCallback(
    (id: string) => {
      const nextGroups = groups.filter((group) => group.id !== id);
      const nextMemberships = memberships.filter(
        (membership) => membership.groupId !== id,
      );
      setGroups(nextGroups);
      setMemberships(nextMemberships);
      scheduleWrite(nextGroups, nextMemberships);
    },
    [groups, memberships, scheduleWrite],
  );

  const addToGroup = useCallback(
    (groupId: string, mediaId: string, mediaType: GroupMediaType) => {
      if (!groupId || !mediaId) {
        return;
      }
      if (
        memberships.some(
          (membership) =>
            membership.groupId === groupId && membership.mediaId === mediaId,
        )
      ) {
        // 重复加入：按业务规则静默忽略
        return;
      }
      const next: GroupMembership = {
        groupId,
        mediaId,
        mediaType,
        addedAtMs: Date.now(),
      };
      const nextMemberships = [...memberships, next];
      setMemberships(nextMemberships);
      scheduleWrite(groups, nextMemberships);
    },
    [groups, memberships, scheduleWrite],
  );

  const removeFromGroup = useCallback(
    (groupId: string, mediaId: string) => {
      const nextMemberships = memberships.filter(
        (membership) =>
          !(membership.groupId === groupId && membership.mediaId === mediaId),
      );
      if (nextMemberships.length === memberships.length) {
        return;
      }
      setMemberships(nextMemberships);
      scheduleWrite(groups, nextMemberships);
    },
    [groups, memberships, scheduleWrite],
  );

  const getGroupMemberIds = useCallback(
    (groupId: SelectedGroupId): ReadonlySet<string> => {
      if (!groupId) {
        return EMPTY_SET;
      }
      const result = new Set<string>();
      for (const membership of memberships) {
        if (membership.groupId === groupId) {
          result.add(membership.mediaId);
        }
      }
      return result;
    },
    [memberships],
  );

  return {
    groups,
    memberships,
    isLoading,
    addGroup,
    deleteGroup,
    addToGroup,
    removeFromGroup,
    getGroupMemberIds,
  };
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function generateGroupId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // 兜底：极少数环境（老浏览器/部分测试）不支持 randomUUID
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type { AppSettings };
