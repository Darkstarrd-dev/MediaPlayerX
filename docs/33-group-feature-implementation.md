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
selectedGroupId: z.string().nullable(),
```

**文件**：`src/store/useUiStore.ts`
- 在 `DEFAULT_SETTINGS` 中新增默认值（约在第 60 行 `musicRootNodeId: null` 之后）：

```typescript
selectedGroupId: null,
```

**文件**：`src/features/app/useAppSettingsStore.ts`
- 在 `useShallow` 回调中添加 `state.selectedGroupId` 映射

---

### 步骤 5：侧边栏树过滤逻辑

**文件**：`src/features/app/useAppSidebarScopeState.ts`（修改）

新增函数 `filterTreeForGroup`：

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

**集成位置**：在构建 `imageTreeNodes` / `videoTreeNodes` 的 `useMemo` 之后，追加一个 useMemo 做条件过滤：

```typescript
// 伪代码：在 useAppSidebarScopeState 返回值之前
const filteredImageTreeNodes = useMemo(
  () =>
    selectedGroupId != null
      ? filterTreeForGroup(imageTreeNodes, groupMemberIds)
      : imageTreeNodes,
  [imageTreeNodes, groupMemberIds, selectedGroupId],
);
```

注意：`groupMemberIds` 需从 `useGroupState` 传入，通过函数参数层层传递。

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
- `canJoin` = `selectedGroupId != null && (selectedPackageId != "" \|\| selectedVideoId != "")`
- `canRemove` = `selectedGroupId != null && 当前媒体在群组成员中`
- `onJoinCurrentToGroup` → 根据当前 mode 取 `selectedPackageId` 或 `selectedVideoId`
- `onRemoveCurrentFromGroup` → 同理

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

在现有 `[data-slot="fg-sidebar-footer"]` 样式之后追加群组组件样式：

```css
/* 群组 footer 布局 */
.sidebar-group-footer {
  display: flex;
  align-items: center;
  gap: var(--mpx-group-footer-gap, 4px);
  padding: var(--mpx-group-footer-padding, 2px 4px);
  height: 100%;
  box-sizing: border-box;
}

.sidebar-group-select {
  flex: 1;
  min-width: 0;
  height: var(--mpx-icon-button-size, 28px);
  border: 1px solid var(--mpx-border-1);
  border-radius: var(--mpx-radius-sm, 4px);
  background: var(--mpx-bg-input, transparent);
  color: var(--mpx-slot-fg-sidebar-footer-text, inherit);
  font-size: var(--mpx-sidebar-font-size, 13px);
  padding: 0 4px;
  cursor: pointer;
  appearance: none; /* 或保留原生样式 */;
}

.sidebar-group-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.sidebar-group-actions .mpx-btn {
  width: var(--mpx-icon-button-size, 28px);
  height: var(--mpx-icon-button-size, 28px);
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

---

### 步骤 10：国际化文本（可选，初版可硬编码）

如需要完整的 i18n 支持，在 `src/i18n/` 翻译文件中添加：

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

### 步骤 12：集成测试（可选，建议后续补充）

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

---

## 七、实施顺序建议

```
步骤 1-3 → 步骤 4 → 步骤 5 → 步骤 6 → 步骤 7 → 步骤 8-9 → 步骤 10-11 → 步骤 12
(类型+Hook)  (Settings)  (过滤)    (组件)    (集成)    (样式+管线)  (i18n+文档)  (测试)
```

优先完成 **步骤 1-9** 即可让功能可用，步骤 10-12 为质量增强。
