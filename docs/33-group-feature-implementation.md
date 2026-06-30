# 群组功能实施文档

> 版本：v1.0 | 日期：2026-06-30 | 关联需求：sidebar 底部空槽位增加群组管理功能

---

## 一、需求回顾

在左侧 sidebar 的 `fg-sidebar-footer` 空槽位（`SidebarPanel.tsx:1443`）增加：

- **下拉选单**：默认"全部"，列出所有群组
- **添加按钮 (+)**：创建新群组名
- **删除按钮 (-)**：删除当前选中群组（需确认）
- **加入按钮**：将当前 focus 的图包或视频加入选中群组
- **移除按钮**：将当前 focus 的媒体从选中群组中移除
- 选中某个群组后，sidebar 仅显示该群组包含的内容（过滤树）

### 业务规则

| 场景 | 规则 |
|------|------|
| 群组同名 | **不允许**重复群组名 |
| 删除群组 | **需要确认**对话框 |
| 群组支持音频 | **不支持**，仅 image package + video |
| 跨模式成员 | **支持**，同一群组可同时包含图包和视频 |
| 重复加入 | **静默忽略**，不报错 |
| 当"全部"选中 | 加入/移除/删除按钮 disabled |

---

## 二、架构总览

```
┌─ 存储层 ───────────────────────────────────────────────────┐
│  app_state KV（key = "media_groups_v1"）                      │
│  └─ { groups: GroupDefinition[],                             │
│       memberships: GroupMembership[] }                        │
│                                                               │
│  AppSettings.selectedGroupId（持久化到 ui_settings_v1）         │
│  └─ string | null                                             │
└──────────────────────────────────────────────────────────────┘
         ↕ readAppState / writeAppState（已有 IPC，无需新增）
┌─ 状态层 ───────────────────────────────────────────────────┐
│  useGroupState hook                                          │
│  ├─ groups / memberships                                    │
│  ├─ addGroup / deleteGroup / addToGroup / removeFromGroup   │
│  └─ getGroupMemberIds() → Set<string>                       │
│                                                               │
│  selectedGroupId（来自 AppSettings，持久化）                   │
│                                                               │
│  useAppSidebarScopeState（树过滤）                            │
│  └─ filterTreeForGroup(nodes, groupMemberIds) → SidebarNode[]│
└──────────────────────────────────────────────────────────────┘
         ↕ props
┌─ 组件层 ───────────────────────────────────────────────────┐
│  SidebarPanel.tsx:1443                                       │
│  └─ <div data-slot="fg-sidebar-footer">                      │
│       └─ <GroupFooter />                                     │
│          ├─ <select>：全部 + 群组列表                         │
│          ├─ <button> 添加 (+)                               │
│          ├─ <button> 删除 (-)                               │
│          ├─ <button> 加入                                   │
│          └─ <button> 移除                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 三、数据模型

### 3.1 类型定义

文件：`src/features/group/types.ts`

```typescript
export interface GroupDefinition {
  id: string;           // crypto.randomUUID()
  name: string;         // 群组名称，不可重复
  createdAtMs: number;
}

export interface GroupMembership {
  groupId: string;
  mediaId: string;      // packageId (image) 或 videoId
  mediaType: "package" | "video";
  addedAtMs: number;
}

export interface MediaGroupsData {
  groups: GroupDefinition[];
  memberships: GroupMembership[];
}
```

### 3.2 存储方案

| 数据 | 存储位置 | Key | IPC |
|------|---------|-----|-----|
| 群组定义 + 成员关系 | `app_state` 表 | `"media_groups_v1"` | 已有的 `readAppState` / `writeAppState` |
| 当前选中群组 | `AppSettings` | `selectedGroupId` 字段 | 随 `ui_settings_v1` 自动持久化 |
| 添加群组对话框 | React 本地 state（不持久化） | — | — |
| 删除确认对话框 | React 本地 state（不持久化） | — | — |

**选择 `app_state` 而非新增表的理由：**
- 群组数据规模可控（预计 < 100 群组，每个 < 1000 成员）
- 无需新增数据库迁移、IPC channel、Repository 方法
- 与项目现有的多种 KV 存储模式一致（import_sources、music_booklet_bindings 等）

### 3.3 默认值

```typescript
// fallback_json 当 key 不存在时返回
const DEFAULT_GROUPS_DATA: MediaGroupsData = {
  groups: [],
  memberships: [],
};
```

---

## 四、实施步骤

### 步骤 1：类型定义

**文件**：`src/features/group/types.ts`（新建）

定义 `GroupDefinition`、`GroupMembership`、`MediaGroupsData` 三接口。

---

### 步骤 2：群组状态 Hook

**文件**：`src/features/group/useGroupState.ts`（新建）

```typescript
// 接口
interface UseGroupStateParams {
  mediaRepository: MediaRepository;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

interface UseGroupStateResult {
  groups: GroupDefinition[];
  memberships: GroupMembership[];
  groupMemberIdsByGroup: Map<string, Set<string>>;
  addGroup: (name: string) => string | null;     // 返回 null 表示重名
  deleteGroup: (id: string) => void;
  addToGroup: (groupId: string, mediaId: string, mediaType: "package" | "video") => void;
  removeFromGroup: (groupId: string, mediaId: string) => void;
  getGroupMemberIds: (groupId: string) => Set<string>;
}
```

**实现逻辑：**
1. 启动时调用 `readAppState({ state_key: "media_groups_v1", fallback_json })` 加载
2. `addGroup`：检查重名 → 用 `crypto.randomUUID()` 生成 ID → push 到 groups → 保存 → 自动选中新群组
3. `deleteGroup`：从 groups 移除 → 从 memberships 清理 → 保存 → 清空 selectedGroupId
4. `addToGroup`：检查是否已在（静默忽略）→ push membership → 保存
5. `removeFromGroup`：从 memberships 过滤 → 保存
6. `getGroupMemberIds`：从 memberships 聚合导出 `Set<string>`
7. 所有写操作后调用 `writeAppState`，300ms 防抖
8. 批量更新时使用事务模式（先收集所有操作，一次性 write）

**异步加载状态机（必须处理）**：

`readAppState` 是异步 IPC，而 hook 返回值是同步的 `groups: GroupDefinition[]`。必须定义异步期间的状态：

```typescript
interface UseGroupStateResult {
  groups: GroupDefinition[];
  memberships: GroupMembership[];
  groupMemberIdsByGroup: Map<string, Set<string>>;
  // 新增：加载状态
  isLoading: boolean;  // 首次加载期间为 true，加载完成后 false
  // ... 其余方法不变
}
```

**状态流转**：

| 阶段 | `groups` | `memberships` | `isLoading` | `filterTreeForGroup` 行为 |
|------|----------|---------------|-------------|--------------------------|
| 初始挂载（首次渲染） | `[]` | `[]` | `true` | 不执行过滤（`selectedGroupId` 即使非 null，也因 `isLoading` 跳过过滤，显示全树） |
| `readAppState` 返回后 | 真实数据 | 真实数据 | `false` | 正常过滤 |

**实现要点**：

```typescript
const [groups, setGroups] = useState<GroupDefinition[]>([]);
const [memberships, setMemberships] = useState<GroupMembership[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    const data = await mediaRepository.readAppState({
      state_key: "media_groups_v1",
      fallback_json: DEFAULT_GROUPS_DATA,
    });
    if (cancelled) return;
    setGroups(data.state_value?.groups ?? []);
    setMemberships(data.state_value?.memberships ?? []);
    setIsLoading(false);
  })();
  return () => { cancelled = true; };
}, [mediaRepository]);
```

**`filterTreeForGroup` 集成约束**：在 `useAppSidebarScopeState` 中调用过滤时，需额外检查 `isLoading === false`，避免加载期间误判"无成员"导致空树：

```typescript
const filteredImageTreeNodes = useMemo(
  () =>
    selectedGroupId != null && !groupIsLoading
      ? filterTreeForGroup(imageTreeNodes, groupMemberIds)
      : imageTreeNodes,
  [imageTreeNodes, groupMemberIds, selectedGroupId, groupIsLoading],
);
```

**集成点决断（单一位置）**：

`useGroupState` 在 **`useAppWorkspaceProps.impl.ts`** 中调用（唯一位置），与 `useAppSidebarScopeState`、`buildSidebarPanelProps` 同级。理由：
- `useAppWorkspaceProps.impl.ts` 是 props 管线的汇聚点，已有 `sidebarVideoQueueIds`、`buildSidebarPanelProps` 等同类逻辑
- 在 `useAppDataPipeline` 中调用会导致 hook 嵌套层级过深，且 Pipeline 的职责是"组合四个阶段 hook"，不应直接持有业务状态
- `useGroupState` 返回的 `groups`/`memberships`/`groupMemberIds` 既需传入 `useAppSidebarScopeState`（树过滤），又需传入 `buildSidebarPanelProps`（footer UI），`useAppWorkspaceProps.impl.ts` 是两条链路的共同上游

**数据流链路（修正）**：

```
useAppWorkspaceProps.impl.ts
  ├─ useGroupState(mediaRepository, selectedGroupId, ...)
  │   → groups, memberships, groupMemberIds, isLoading, addGroup, ...
  │
  ├─ useAppSidebarScopeState({ ..., groupMemberIds, groupIsLoading })
  │   → filteredImageTreeNodes, filteredVideoTreeNodes（内部做 filterTreeForGroup）
  │
  └─ buildSidebarPanelProps({ ..., groupFooterProps })
      → SidebarPanel → GroupFooter
```

**独立文件**：`src/features/group/useGroupState.ts`

---

### 步骤 3：创建入口文件

**文件**：`src/features/group/index.ts`（新建）

```typescript
export { useGroupState } from "./useGroupState";
export type { GroupDefinition, GroupMembership, MediaGroupsData } from "./types";
export type { UseGroupStateParams, UseGroupStateResult } from "./useGroupState";
```

---

### 步骤 4：Settings 扩展

**文件**：`src/contracts/settings.ts`
- 在 `appSettingsSchema` 对象中新增字段（约在第 299 行 `musicCollapsedFolderNodeIds` 之后）：

```typescript
selectedGroupId: z.string().nullable().default(null),
```

**必须加 `.default(null)`**：现有用户的 `ui_settings_v1` 持久化数据中没有 `selectedGroupId` 字段。若 Zod schema 不提供 default，`appSettingsSchema.parse(旧配置)` 会报 `missing required key`。`.default(null)` 确保：
- 新用户：默认 `null`（"全部"）
- 旧用户升级：Zod 自动填充 `null`，无需显式迁移脚本

**文件**：`src/store/useUiStore.ts`
- 在 `DEFAULT_SETTINGS` 中新增默认值（约在第 60 行 `musicRootNodeId: null` 之后）：

```typescript
selectedGroupId: null,
```

**文件**：`src/features/app/useAppSettingsStore.ts`
- 在 `useShallow` 回调中添加 `state.selectedGroupId` 映射

**文件**：`src/features/app/useSettingsPersistence.ts`
- 参考现有 `musicCollapsedFolderNodeIds` 的 normalize 模式（lines 768-775），**无需新增迁移逻辑**：`.default(null)` 已由 Zod 层处理。但需确认 `useSettingsPersistence.ts` 的 normalize 函数不会因 `selectedGroupId` 为 `null` 而误删该字段（参考 lines 773-774 的 `delete next.xxx` 模式，仅当字段为 falsy 且非 null 时才删）。若 normalize 逻辑对 `null` 也执行 delete，需加守卫：`if (next.selectedGroupId !== null) { ... }` 或跳过 normalize。

**文件**：`src/features/app/usePersistedAppSettings.ts`
- 在映射对象中新增 `selectedGroupId: settings.selectedGroupId`（参考 lines 63, 74 的 `musicRootNodeId` 映射模式）

---

### 步骤 5：侧边栏树过滤逻辑

**文件**：`src/features/app/useAppSidebarScopeState.ts`（修改）

#### 5.1 新增入参字段

在 `UseAppSidebarScopeStateParams` 接口（约 lines 80-99）中新增：

```typescript
interface UseAppSidebarScopeStateParams {
  // ... 已有字段 ...
  // 新增：群组过滤所需数据
  selectedGroupId: string | null;        // 来自 AppSettings
  groupMemberIds: Set<string>;           // 来自 useGroupState.getGroupMemberIds(selectedGroupId)
  groupIsLoading: boolean;               // 来自 useGroupState.isLoading
}
```

#### 5.2 新增过滤函数 `filterTreeForGroup`

```typescript
function filterTreeForGroup(
  nodes: SidebarNode[],
  groupMemberIds: Set<string>,
): SidebarNode[] {
  return nodes
    .map((node) => {
      // 媒体节点
      const mediaId = node.packageId ?? node.videoId ?? undefined;
      if (mediaId) {
        return groupMemberIds.has(mediaId) ? node : null;
      }
      // 文件夹节点：递归
      const filteredChildren = filterTreeForGroup(node.children, groupMemberIds);
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      // 文件夹无存活后代 → 移除
      return null;
    })
    .filter((n): n is SidebarNode => n !== null);
}
```

**类型安全验证**：`SidebarNode`（`src/types.ts:163-164`）已有 `packageId?: string` 和 `videoId?: string` 字段，`node.packageId ?? node.videoId` 类型合法 ✓。

#### 5.3 集成位置与调用链路

在 `useAppSidebarScopeState` 返回值之前，对 `imageTreeForSidebar` 和 `videoTreeForSidebar` 追加条件过滤的 `useMemo`：

```typescript
// 在 useAppSidebarScopeState 内部，构建 imageTreeForSidebar / videoTreeForSidebar 的 useMemo 之后
const filteredImageTreeNodes = useMemo(
  () =>
    selectedGroupId != null && !groupIsLoading
      ? filterTreeForGroup(imageTreeForSidebar, groupMemberIds)
      : imageTreeForSidebar,
  [imageTreeForSidebar, groupMemberIds, selectedGroupId, groupIsLoading],
);

const filteredVideoTreeNodes = useMemo(
  () =>
    selectedGroupId != null && !groupIsLoading
      ? filterTreeForGroup(videoTreeForSidebar, groupMemberIds)
      : videoTreeForSidebar,
  [videoTreeForSidebar, groupMemberIds, selectedGroupId, groupIsLoading],
);
```

**返回值替换**：将 `useAppSidebarScopeStateResult` 中的 `imageTreeForSidebar` / `videoTreeForSidebar` 改为返回 `filteredImageTreeNodes` / `filteredVideoTreeNodes`（或新增 `filtered*` 字段，由调用方选择）。推荐**直接替换**，避免下游需要感知两套树。

#### 5.4 调用方传参（`useAppWorkspaceProps.impl.ts`）

```typescript
// useAppWorkspaceProps.impl.ts 中调用 useAppSidebarScopeState 时
const sidebarScope = useAppSidebarScopeState({
  // ... 已有参数 ...
  selectedGroupId,              // 来自 useAppSettingsStore
  groupMemberIds: groupState.getGroupMemberIds(selectedGroupId ?? ""),
  groupIsLoading: groupState.isLoading,
});
```

**注意**：`groupMemberIds` 是 `Set<string>`，当 `selectedGroupId` 为 null 时传空 Set（`groupState.getGroupMemberIds("")` 应返回空 Set）。`getGroupMemberIds` 实现需对空字符串/不存在 groupId 返回 `new Set()`，而非 undefined。

---

### 步骤 6：GroupFooter 组件

**文件**：`src/components/GroupFooter.tsx`（新建）

#### 6.1 组件接口

```typescript
interface GroupFooterProps {
  groups: { id: string; name: string }[];
  selectedGroupId: string | null;
  canJoin: boolean;    // 有选中群组 + 有当前 focus 媒体
  canRemove: boolean;  // 有选中群组 + 当前 focus 媒体在群组中
  onSelectGroup: (id: string | null) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: () => void;
  onJoinCurrentToGroup: () => void;
  onRemoveCurrentFromGroup: () => void;
}
```

#### 6.2 组件结构

```
<div className="sidebar-group-footer" data-slot="fg-sidebar-footer">
  <select
    className="sidebar-group-select"
    value={selectedGroupId ?? ""}
    onChange={...}
  >
    <option value="">全部</option>
    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
  </select>

  <div className="sidebar-group-actions mpx-btn-group">
    <button onClick={openAddDialog} title="添加群组">+</button>
    <button onClick={openDeleteConfirm} disabled={!selectedGroupId} title="删除群组">−</button>
    <button onClick={onJoinCurrentToGroup} disabled={!canJoin} title="加入当前">加入</button>
    <button onClick={onRemoveCurrentFromGroup} disabled={!canRemove} title="移出当前">移除</button>
  </div>

  {/* 添加群组对话框 */}
  {showAddDialog && <AddGroupDialog onConfirm={...} onCancel={...} />}

  {/* 删除确认对话框 */}
  {showDeleteConfirm && <DeleteConfirmDialog groupName={...} onConfirm={...} onCancel={...} />}
</div>
```

#### 6.3 交互细节

| 元素 | 交互行为 |
|------|---------|
| 下拉选单 | `onChange` → `onSelectGroup(value \|\| null)` |
| 添加 (+) | 弹出内联对话框，输入名称 → 检查非空 → `onAddGroup(name)` → 若返回 null 提示重名 |
| 删除 (-) | `disabled={!selectedGroupId}` → 弹出确认对话框 |
| 加入 | `disabled={!canJoin}` → `onJoinCurrentToGroup()` |
| 移除 | `disabled={!canRemove}` → `onRemoveCurrentFromGroup()` |

---

### 步骤 7：SidebarPanel 修改

**文件**：`src/components/SidebarPanel.tsx`

**第 38-96 行**：在 `SidebarPanelProps` 接口中新增 props：

```typescript
interface SidebarPanelProps {
  // ... 已有 props ...
  groupFooterProps: {
    groups: { id: string; name: string }[];
    selectedGroupId: string | null;
    canJoin: boolean;
    canRemove: boolean;
    onSelectGroup: (id: string | null) => void;
    onAddGroup: (name: string) => void;
    onDeleteGroup: () => void;
    onJoinCurrentToGroup: () => void;
    onRemoveCurrentFromGroup: () => void;
  };
}
```

**第 1443 行**：替换空 div：

```tsx
// 原：<div aria-hidden="true" data-slot="fg-sidebar-footer" />
// 改为：
<div data-slot="fg-sidebar-footer">
  <GroupFooter
    groups={groupFooterProps.groups}
    selectedGroupId={groupFooterProps.selectedGroupId}
    canJoin={groupFooterProps.canJoin}
    canRemove={groupFooterProps.canRemove}
    onSelectGroup={groupFooterProps.onSelectGroup}
    onAddGroup={groupFooterProps.onAddGroup}
    onDeleteGroup={groupFooterProps.onDeleteGroup}
    onJoinCurrentToGroup={groupFooterProps.onJoinCurrentToGroup}
    onRemoveCurrentFromGroup={groupFooterProps.onRemoveCurrentFromGroup}
  />
</div>
```

同时在文件顶部添加 import：

```typescript
import { GroupFooter } from "./GroupFooter";
```

---

### 步骤 8：Props 管线布线

#### 8.1 buildSidebarPanelProps.ts

**文件**：`src/features/app/buildSidebarPanelProps.ts`

在 params 接口中新增 group 相关参数，在返回对象中新增 `groupFooterProps`：

```typescript
interface BuildSidebarPanelPropsParams {
  // ... 已有参数 ...
  groupFooterProps: {
    groups: { id: string; name: string }[];
    selectedGroupId: string | null;
    canJoin: boolean;
    canRemove: boolean;
    onSelectGroup: (id: string | null) => void;
    onAddGroup: (name: string) => void;
    onDeleteGroup: () => void;
    onJoinCurrentToGroup: () => void;
    onRemoveCurrentFromGroup: () => void;
  };
}
```

返回对象中直接透传 `groupFooterProps: params.groupFooterProps`。

#### 8.2 useAppWorkspaceProps.impl.ts

**文件**：`src/features/app/useAppWorkspaceProps.impl.ts`

在构造 `buildSidebarPanelProps` 的参数时，传入 `groupFooterProps` 对象。这个对象的回调需要：
- 持有 `useGroupState` 返回的 `addGroup`、`deleteGroup`、`addToGroup`、`removeFromGroup`
- `canJoin` = `selectedGroupId != null && currentFocusMediaId != null`
- `canRemove` = `selectedGroupId != null && currentFocusMediaId != null && groupMemberIds.has(currentFocusMediaId)`
- `onJoinCurrentToGroup` → 根据当前 mode 取 `selectedPackageId`（image 模式）或 `selectedVideoId`（video 模式）
- `onRemoveCurrentFromGroup` → 同理

**`currentFocusMediaId` 计算逻辑**：

```typescript
const currentFocusMediaId: string | null =
  mode === "image"
    ? (selectedPackageId || null)
    : mode === "video"
      ? (selectedVideoId || null)
      : null;  // audio 模式不支持群组，返回 null

const currentFocusMediaType: "package" | "video" | null =
  mode === "image" ? "package" : mode === "video" ? "video" : null;
```

**`canJoin` / `canRemove` 实现**：

```typescript
const canJoin =
  selectedGroupId != null &&
  currentFocusMediaId != null &&
  currentFocusMediaType != null;

const canRemove =
  selectedGroupId != null &&
  currentFocusMediaId != null &&
  groupState.getGroupMemberIds(selectedGroupId).has(currentFocusMediaId);
```

**`onJoinCurrentToGroup` / `onRemoveCurrentFromGroup` 回调**：

```typescript
onJoinCurrentToGroup: () => {
  if (!selectedGroupId || !currentFocusMediaId || !currentFocusMediaType) return;
  groupState.addToGroup(selectedGroupId, currentFocusMediaId, currentFocusMediaType);
},
onRemoveCurrentFromGroup: () => {
  if (!selectedGroupId || !currentFocusMediaId) return;
  groupState.removeFromGroup(selectedGroupId, currentFocusMediaId);
},
```

**`mode` 字段来源**：`mode` 来自 `useAppNavigationState` 或 `useAppWorkspaceProps` 的 props（类型为 `AppMode`，值为 `"image" | "video" | "audio"`）。`useAppWorkspaceProps.impl.ts` 已持有该字段（参考 `useAppSidebarScopeState` 入参 line 171 的 `mode`）。

**`selectedGroupId` 语义统一**：

- `null` 表示"全部"（默认值，不进行过滤）
- 非 null 字符串表示选中某个具体群组
- `<select>` 的"全部"option 的 `value=""`，在 `onChange` 中转换为 `null`：

```typescript
onSelectGroup: (id: string | null) => {
  // select 的"全部"option value 为 ""，转为 null
  updateSettings({ selectedGroupId: id === "" ? null : id });
},
```

- `deleteGroup` 后清空选中：`updateSettings({ selectedGroupId: null })`（非空字符串）
- `GroupFooter` 组件中 `value={selectedGroupId ?? ""}`，保持 select 受控

#### 8.3 数据流链路

```
useGroupState (在 useAppDataPipeline or useAppWorkspaceProps.impl 中调用)
  → groups, memberships, addGroup, deleteGroup, addToGroup, removeFromGroup
  → buildSidebarPanelProps()
    → groupFooterProps
      → SidebarPanel
        → GroupFooter

useAppSettingsStore
  → selectedGroupId, updateSettings
  → useGroupState (selectedGroupId, setSelectedGroupId)
  → useAppSidebarScopeState (树过滤用 selectedGroupId + groupMemberIds)
```

---

### 步骤 9：样式

**文件**：`src/styles/app/sidebar.css`

在现有 `[data-slot="fg-sidebar-footer"]` 样式之后追加群组组件样式。

#### 9.1 CSS Token 对照表（必须）

下表列出样式用到的 token，**5 个在现有 token 体系中不存在，必须登记到 `docs/11-token_design.md` 或改用现有 token**：

| Token | 是否已存在 | 处理方式 |
|-------|-----------|---------|
| `--mpx-border-1` | ✓ 存在（`themeParameterDefinitions.ts:1616`） | 直接使用 |
| `--mpx-icon-button-size` | △ 部分存在（`useAppEffectsUi.ts:419` 用的是 `--mpx-icon-button-size-px`） | 改用 `--mpx-icon-button-size-px` 或登记 `--mpx-icon-button-size` |
| `--mpx-group-footer-gap` | ✗ 不存在 | **新增**到 `docs/11-token_design.md`，或直接硬编码 `4px` |
| `--mpx-group-footer-padding` | ✗ 不存在 | **新增**，或硬编码 `2px 4px` |
| `--mpx-bg-input` | ✗ 不存在 | **新增**，或改用 `--mpx-bg-2` / `transparent` |
| `--mpx-radius-sm` | ✗ 不存在 | **新增**，或改用 `--mpx-radius-1`（若存在）或硬编码 `4px` |
| `--mpx-slot-fg-sidebar-footer-text` | ✗ 不存在 | **新增**，或改用 `inherit`（继承父级文本色） |
| `--mpx-sidebar-font-size` | ✗ 不存在 | **新增**，或改用 `13px` 硬编码 |

**推荐方案（最小破坏）**：初版硬编码非语义化的 gap/padding/radius，文本色用 `inherit`，border/bg 用已有 token。后续如需主题化再登记到 token 体系。

#### 9.2 样式代码（采用推荐方案）

```css
/* 群组 footer 布局 */
.sidebar-group-footer {
  display: flex;
  align-items: center;
  gap: 4px;                          /* 硬编码，后续可提升为 token */
  padding: 2px 4px;                  /* 硬编码 */
  height: 100%;
  box-sizing: border-box;
}

.sidebar-group-select {
  flex: 1;
  min-width: 0;
  height: var(--mpx-icon-button-size-px, 28px);  /* 复用已有 token，fallback 28px */
  border: 1px solid var(--mpx-border-1, #444);
  border-radius: 4px;                /* 硬编码 */
  background: transparent;           /* 避免引入不存在的 --mpx-bg-input */
  color: inherit;                    /* 继承父级文本色 */
  font-size: 13px;                   /* 硬编码 */
  padding: 0 4px;
  cursor: pointer;
  appearance: none;
}

.sidebar-group-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.sidebar-group-actions .mpx-btn {
  width: var(--mpx-icon-button-size-px, 28px);
  height: var(--mpx-icon-button-size-px, 28px);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-group-actions .mpx-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
```

**文档同步约束**：若后续将硬编码值提升为 token，必须同步更新 `docs/10-ui_definition.md`（`fg.sidebar.footer` 槽位）与 `docs/11-token_design.md`（新增 token 登记）。

---

### 步骤 10：国际化文本（必选，不可硬编码）

**违反 `docs/07-i18n-aria-guardrails.md` 的硬编码方案不可接受**。必须在 `src/i18n/` 翻译文件中添加：

```json
{
  "ui.sidebar.group.all": "全部",
  "ui.sidebar.group.add": "添加群组",
  "ui.sidebar.group.delete": "删除群组",
  "ui.sidebar.group.join": "加入",
  "ui.sidebar.group.remove": "移除",
  "ui.sidebar.group.addDialogTitle": "新建群组",
  "ui.sidebar.group.deleteConfirmTitle": "确认删除",
  "ui.sidebar.group.deleteConfirmMessage": "确定要删除群组「{name}」吗？此操作不可撤销。",
  "ui.sidebar.group.duplicateName": "群组名「{name}」已存在",
  "ui.sidebar.group.emptyName": "群组名不能为空",
  "tip.group.add": "添加新群组",
  "tip.group.delete": "删除当前选中群组",
  "tip.group.join": "将当前聚焦的图包或视频加入选中群组",
  "tip.group.remove": "将当前聚焦的媒体移出选中群组"
}
```

---

### 步骤 11：文档更新

**文件**：`docs/10-ui_definition.md`

更新 `fg.sidebar.footer` 槽位说明：

```
原：fg.sidebar.footer | 空槽位 / 保留用于未来扩展
新：fg.sidebar.footer | 群组管理（下拉选单 + 添加/删除/加入/移除按钮）
```

---

### 步骤 12：单元与集成测试（必选，不可跳过）

**`AGENTS.md` 质量门禁要求 `lint 0 warning` + 全测试通过 + `madge 0` 循环依赖。新增 feature 不带测试会破坏质量基线，步骤 12 为必选。**

**MockRepository 可行性确认**：`MockMediaRepository`（`src/features/backend/repository/mockRepository.ts:907-916`）已实现 `readAppState`/`writeAppState`，委托给 `SystemHandlers`（`src/features/backend/repository/mock/SystemHandlers.ts:28,33`）。测试可直接使用 MockRepository，无需启动 Electron 进程 ✓。

**文件**：`src/features/group/useGroupState.test.ts`（新建）

测试覆盖：
- 初始化加载空数据
- 添加群组
- 重名拒绝
- 删除群组（同时清理成员）
- 加入/移除成员
- 重复加入静默忽略
- 数据持久化验证（mock writeAppState）

**文件**：`src/components/GroupFooter.test.tsx`（新建）

测试覆盖：
- 渲染默认"全部"状态
- 选择群组后按钮启用/禁用状态
- 添加/删除对话框交互
- 下拉选单 onChange 回调

---

## 五、文件变更清单

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `src/features/group/types.ts` | **新建** | Group 类型定义 |
| 2 | `src/features/group/useGroupState.ts` | **新建** | 群组状态管理 hook |
| 3 | `src/features/group/index.ts` | **新建** | 导出入口 |
| 4 | `src/components/GroupFooter.tsx` | **新建** | 群组 footer UI 组件 |
| 5 | `src/contracts/settings.ts` | 修改 | 新增 `selectedGroupId` 到 schema |
| 6 | `src/store/useUiStore.ts` | 修改 | 新增默认值 `selectedGroupId: null` |
| 7 | `src/features/app/useAppSettingsStore.ts` | 修改 | 添加 `selectedGroupId` state 映射 |
| 8 | `src/features/app/useAppSidebarScopeState.ts` | 修改 | 添加树过滤逻辑 |
| 9 | `src/features/app/buildSidebarPanelProps.ts` | 修改 | 传递 groupFooterProps |
| 10 | `src/features/app/useAppWorkspaceProps.impl.ts` | 修改 | 集成 group state → props |
| 11 | `src/components/SidebarPanel.tsx` | 修改 | 替换 footer 空 div |
| 12 | `src/styles/app/sidebar.css` | 修改 | 群组 footer 样式 |
| 13 | `docs/10-ui_definition.md` | 修改 | 更新槽位说明 |

**总计**：4 个新文件 + 9 个修改文件 = **13 个文件变更**

---

## 六、注意事项

1. **不新增 IPC channel**：全部复用已有的 `readAppState` / `writeAppState`
2. **不修改后端**：`app_state` 表已存在，群组数据以 JSON 形式存储
3. **不新增数据库迁移**：无需改 `mediaLibrarySchema.ts`
4. **遵循现有架构**：
   - 状态管理沿用 hook 模式
   - Props 管线沿用 `build*Props` 模式
   - 样式沿用 CSS token 变量体系
   - 组件结构沿用 `<MainUiIcon>` + `data-tooltip-label` 模式
5. **性能**：树过滤用 `useMemo` 缓存，避免每次 render 重复计算
6. **类型安全**：全面使用 TypeScript，禁止 `any`
7. **异步加载状态机**：`useGroupState` 的 `readAppState` 是异步 IPC，必须处理 `isLoading` 状态（见步骤 2），避免首屏误过滤
8. **Zod default**：`selectedGroupId` schema 必须加 `.default(null)`（见步骤 4），否则旧用户配置解析失败
9. **CSS token 合规**：步骤 9 列出的 5 个不存在的 token 必须登记到 `docs/11-token_design.md` 或硬编码，不可引用未定义 token
10. **i18n 必选**：步骤 10 不可跳过，违反 `docs/07-i18n-aria-guardrails.md`
11. **测试必选**：步骤 12 不可跳过，违反 `AGENTS.md` 质量门禁
12. **循环依赖预检**：新增 `src/features/group/` 后，必须运行 `npx madge --circular src electron` 确认 0 循环依赖。`useGroupState` 不应反向导入 `useAppSidebarScopeState` 或 `buildSidebarPanelProps`，数据流单向：`useGroupState → sidebarScope/buildSidebarPanelProps`
13. **MockRepository 已支持**：`mockRepository.ts:907-916` 已实现 readAppState/writeAppState，测试无需启动 Electron

---

## 七、实施顺序建议

```
步骤 1-3 → 步骤 4 → 步骤 5 → 步骤 6 → 步骤 7 → 步骤 8-9 → 步骤 10-11 → 步骤 12
(类型+Hook)  (Settings)  (过滤)    (组件)    (集成)    (样式+管线)  (i18n+文档)  (测试)
```

**步骤 1-12 全部为必选**，不可跳过 10/12。实施完成后必须依次通过：

```bash
npm run lint            # 0 warning
npm run test            # 全测试通过（含新增的 useGroupState.test.ts / GroupFooter.test.tsx）
npx madge --circular src electron  # 0 循环依赖
npm run build           # 构建通过
npm run format:check    # Prettier 通过
```
