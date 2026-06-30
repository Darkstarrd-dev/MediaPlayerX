/**
 * 群组功能类型定义
 *
 * 数据持久化在 `app_state` 表的 `media_groups_v1` key 中，
 * 通过 MediaRepository 的 readAppState/writeAppState IPC 读写。
 * 不新增数据库表、不修改后端 schema。
 */

/** 媒体类型：图包（image package）或视频 */
export type GroupMediaType = "package" | "video";

/** 群组定义 */
export interface GroupDefinition {
  /** 唯一 ID，由 crypto.randomUUID() 生成 */
  id: string;
  /** 群组名（不可重复，由 hook 内部校验） */
  name: string;
  /** 创建时间戳（毫秒） */
  createdAtMs: number;
}

/** 群组成员关系 */
export interface GroupMembership {
  /** 所属群组 ID */
  groupId: string;
  /** 媒体 ID：图包为 packageId，视频为 videoId */
  mediaId: string;
  /** 媒体类型 */
  mediaType: GroupMediaType;
  /** 加入时间戳（毫秒） */
  addedAtMs: number;
}

/** 群组数据整体（持久化 payload） */
export interface MediaGroupsData {
  groups: GroupDefinition[];
  memberships: GroupMembership[];
}

/** 持久化到 app_state 的默认 fallback */
export const DEFAULT_MEDIA_GROUPS_DATA: MediaGroupsData = {
  groups: [],
  memberships: [],
};

/** 群组选择器在 store 中持久化的语义：
 *  - null  = "全部"（不过滤）
 *  - string = 选中具体群组 ID
 */
export type SelectedGroupId = string | null;
