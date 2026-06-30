# 待办修复实施计划 v1

> 版本：v1 | 日期：2026-06-30 | 关联：docs/33（群组）、docs/34（主题参数修复）

---

## 总览

| # | 待办 | 优先级 | 预计改动文件数 | 依赖关系 |
|---|------|--------|--------------|---------|
| 1 | 音频树过滤 Bug（群组功能阻断 music 模式） | P0 | 1 | 无 |
| 2 | active/manage-selected label 全覆盖残余 | P1 | 3 | 无 |
| 3 | docs/32 的 2.2.2.1 文档同步 | P2 | 1 | 依赖 #2 完成 |
| 4 | 3 个预存失败测试修复 | P1 | 2 | 无 |

建议执行顺序：**#1 → #4 → #2 → #3**

---

## 计划 1：修复音频树过滤 Bug

### 1.1 问题描述

群组功能（docs/33）的业务规则明确"群组不支持音频，仅 image package + video"。但实现中 `useAppSidebarScopeState.ts` 的 `filterTreeForGroup` 对 `audioTreeForSidebar` 也做了过滤。

由于 audio 媒体永远不会出现在任何群组的 `groupMemberIds` 中，选中群组后音频树会被过滤为空。

### 1.2 根因

```
useAppSidebarScopeState.ts:998
  const shouldFilterByGroup = selectedGroupId != null && !groupIsLoading;
  // ❌ 无 mode 守卫，music 模式下仍触发

useAppSidebarScopeState.ts:1013-1019
  const filteredAudioTreeForSidebar = useMemo(
    () =>
      shouldFilterByGroup               // ← music 模式下也为 true
        ? filterTreeForGroup(audioTreeForSidebar, groupMemberIds)
        : audioTreeForSidebar,
    [audioTreeForSidebar, groupMemberIds, shouldFilterByGroup],
  );
  // ❌ audioTreeForSidebar 被过滤 → 所有 audio 节点因不在 groupMemberIds 中而被移除 → 空树
```

### 1.3 修复方案

**方案：移除 audioTreeForSidebar 的过滤分支**

audio 永不参与群组，过滤分支本身无意义。移除后 `audioTreeForSidebar` 直接返回原树。

### 1.4 分步实施

**步骤 1：移除 audio 过滤分支**

文件：`src/features/app/useAppSidebarScopeState.ts`

删除 1013-1019 行的 `filteredAudioTreeForSidebar` useMemo 块。

**步骤 2：修正返回值**

同文件 1031 行：
```typescript
// 改前
audioTreeForSidebar: filteredAudioTreeForSidebar,
// 改后
audioTreeForSidebar,  // 直接返回原树，群组过滤不影响音频
```

**步骤 3：补充测试**

文件：`src/features/group/useGroupState.test.ts` 或 `src/features/app/useAppSidebarScopeState.test.ts`（如存在）

新增测试用例：
- "music 模式下选中群组时音频树不被过滤"
- 验证 `shouldFilterByGroup` 为 true 时 `audioTreeForSidebar` 仍返回完整树

如果 `useAppSidebarScopeState` 无独立测试文件，在 GroupFooter 或集成测试中验证。

**步骤 4：验证**

```bash
npx vitest run src/features/group/   # 群组测试通过
npm run lint                          # 0 warning
npm run build                         # 构建通过
```

### 1.5 涉及文件

| 文件 | 改动 |
|------|------|
| `src/features/app/useAppSidebarScopeState.ts` | 删除 audio 过滤分支、修正返回值 |
| 测试文件（待定） | 补充 music 模式 + 群组选中验证 |

---

## 计划 2：收敛 active/manage-selected label 全覆盖

### 2.1 问题描述

docs/34 第三轮验收记录：
- `active` 仅在根节点（collapsible-header）表现正常（仅 marker），在直属媒体节点（list-item）表现为整行 label 全覆盖
- `manage-selected` 在所有节点均表现为整行 label 全覆盖

期望行为：active/manage-selected 只显示 `::before` marker（左侧色带），label 背景透明。

### 2.2 根因

CSS Cascade Layers 优先级：`index.css:1` 声明层顺序为
```
contract, palette-base, palette, theme-skeleton, theme-style, app-base, app-layout, app-component, app-state
```
后声明的层优先级更高。`app-layout`（sidebar.css）和 `app-component`（manage.css）始终覆盖 `theme-style`（part1.css）。

**四场景规则竞争结果：**

| 节点类型 | 状态 | 生效规则 | background | 用户观察 |
|---------|------|---------|-----------|---------|
| 根 (collapsible-header) | active | `sidebar.css:874-897`（救星规则 → transparent） | transparent | ✅ 正常 |
| 根 (collapsible-header) | manage-selected | `manage.css:15-53`（SOLID，无救星） | SOLID | ❌ 全覆盖 |
| 媒体 (list-item) | active | `sidebar.css:1004-1021`（SOLID，无救星） | SOLID | ❌ 全覆盖 |
| 媒体 (list-item) | manage-selected | `sidebar.css:1004-1021` + `manage.css:15-53`（SOLID） | SOLID | ❌ 全覆盖 |

**Theme 层残余死代码**：`part1.css:766-915` 新增了 6 条 background 规则，但因 `theme-style` 层优先级低于 `app-layout`/`app-component`，永远不会生效。

### 2.3 修复方案

**目标**：active/manage-selected 只显示 marker，label 背景透明。

**策略**：在 app 层将 SOLID background 改为 transparent（neutralize），保留 `::before` marker 作为唯一视觉指示。

### 2.4 分步实施

**步骤 1：neutralize 媒体节点 label 的 SOLID background**

文件：`src/styles/app/sidebar.css`

定位 1004-1021 行附近的 `[data-sidebar-node-role="list-item"].is-active .sidebar-label` 和 `.is-manage.is-selected .sidebar-label` 规则：

```css
/* 改前 */
background: var(--mpx-file-list-row-selected-bg, var(--mpx-state-selected-color));

/* 改后 */
background: transparent;
```

保留 `color`、`font-weight`、`box-shadow` 等其他属性不变。

**步骤 2：neutralize manage-selected 的 SOLID background**

文件：`src/styles/app/manage.css`

定位 15-53 行附近的 `.sidebar .sidebar-row.is-manage.is-selected .sidebar-label` 规则：

```css
/* 改前 */
background: var(--mpx-slot-fg-sidebar-main-label-manage-selected-bg,
  var(--mpx-sidebar-main-label-manage-selected-bg, var(--mpx-state-selected-color)));

/* 改后 */
background: transparent;
```

保留 `box-shadow`（ring 效果）不变。

**步骤 3：扩展根节点救星规则，覆盖 manage-selected**

文件：`src/styles/app/sidebar.css`

定位 874-897 行的 `[data-sidebar-node-role="collapsible-header"].is-active .sidebar-label` 救星规则，扩展选择器也覆盖 `.is-manage.is-selected`：

```css
/* 改前（仅 .is-active） */
[data-sidebar-node-role="collapsible-header"].is-active .sidebar-label {
  background: transparent;
  ...
}

/* 改后（追加 .is-manage.is-selected 对称规则） */
[data-sidebar-node-role="collapsible-header"].is-active .sidebar-label,
[data-sidebar-node-role="collapsible-header"].is-manage.is-selected .sidebar-label {
  background: transparent;
  ...
}
```

作为双保险，确保根节点 manage-selected 也透明。

**步骤 4：决策 ROW 级 background**

文件：`src/styles/app/sidebar.css`

936-948 行有 `[data-sidebar-node-role="list-item"].is-active` 和 `.is-manage.is-selected` 的 **ROW 级**（`.sidebar-row` 本身，非 `.sidebar-label`）background：

```css
background: var(--mpx-file-list-row-selected-bg, var(--mpx-state-selected-color));
```

**决策点**：
- 若要纯 marker 风格（label 透明 + row 也透明）→ 移除 ROW background
- 若要保留行级高亮（row 有底色 + label 透明 + marker 显示）→ 保留 ROW background

**建议**：保留 ROW background。行级高亮 + 透明 label + marker 色带的组合视觉层次更清晰，且 ROW 背景会透过透明 label 显示，用户可能仍感知为"全覆盖"。

若用户反馈"保留 ROW 背景仍像全覆盖"，再做第二步移除。

**步骤 5：清理 theme 层残余死代码**

文件：`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

删除 766-915 行的 6 条 background 规则（`.is-active .sidebar-label.*` 和 `.is-manage.is-selected .sidebar-label.*` 的 background 声明）。

**保留** 940-1031 行的 `::before` marker 规则（这些是有效的，控制 marker 的 opacity 和 background）。

删除理由：这些规则在 `theme-style` 层，永远被 `app-layout`/`app-component` 层覆盖，是死代码。

**步骤 6：视觉验证**

- 启动 `npm run dev:desktop`
- 切换到 soft-skeuomorphic / skeuomorphic-luxury-white 主题
- 验证以下场景：
  - 根节点 active → 仅 marker（左侧色带），label 透明
  - 根节点 manage-selected → 仅 marker，label 透明
  - 媒体节点 active → 仅 marker，label 透明
  - 媒体节点 manage-selected → 仅 marker，label 透明
  - non-collapsible label active/focus → marker 显示正常
  - collapsible label → 无 marker（基线行为）
  - is-sweeping 高光动画 → 正常（`::after` 未受影响）

**步骤 7：验证**

```bash
npx vitest run src/components/ThemeParameterPanel.test.tsx
npm run lint
npm run build
```

### 2.5 涉及文件

| 文件 | 改动 |
|------|------|
| `src/styles/app/sidebar.css` | list-item label background → transparent；collapsible-header 救星规则扩展 manage-selected |
| `src/styles/app/manage.css` | manage-selected label background → transparent |
| `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css` | 删除 766-915 死代码 background 规则 |

---

## 计划 3：同步 docs/32 的 2.2.2.1

### 3.1 问题描述

docs/34 要求同步更新 `docs/32-ui-design-tracking-v1.md` 的 2.2.2.1 章节，反映修复后的实际状态。当前 docs/32 的 2.2.2.1 已有部分更新（marker 机制、特异性约束、伪元素分工），但需根据计划 2 的修复结果进一步同步。

### 3.2 前置条件

**必须等计划 2 完成后执行**，因为 CSS 规则的行号和层级行为会因删除死代码而变化。

### 3.3 分步实施

**步骤 1：更新 CSS 触发点**

文件：`docs/32-ui-design-tracking-v1.md`，2.2.2.1 章节的"css 的触发点"部分（约 121-127 行）。

计划 2 完成后，用 `rg -n` 重新确认以下规则的实际行号：
- `sidebar.css` 中 list-item label 的 active/manage-selected 规则（改为 transparent 后的行号）
- `sidebar.css` 中 collapsible-header 救星规则（扩展后的行号）
- `manage.css` 中 manage-selected label 规则（改为 transparent 后的行号）
- `part1.css` 中 `::before` marker 规则（删除死代码后的行号）

更新触发点列表，移除已删除的 part1.css:766-915 死代码引用。

**步骤 2：更新特异性约束说明**

同章节 139-150 行的"特异性约束"段落。

当前说明：
> 在 soft-skeuomorphic × skeuomorphic-luxury-white 下，part1.css 中 .sidebar-label 基础规则选择器特异性约为 (0,5,1)，高于 sidebar.css / manage.css 中多数状态规则 (0,3,0)。

计划 2 修复后，active/manage-selected 的实际背景控制权在 app 层（sidebar.css / manage.css），而非 theme 层（part1.css）。需补充说明：

```markdown
注意：CSS Cascade Layers 优先级高于选择器特异性。
app-layout（sidebar.css）和 app-component（manage.css）层的规则
始终覆盖 theme-style（part1.css）层。

因此 active/manage-selected 的 label background 实际由 app 层控制
（设为 transparent），theme 层的对应 background 规则已作为死代码移除。
::before marker 的 opacity/background 仍由 theme 层（part1.css）控制。
```

**步骤 3：更新说明段落**

同章节 224-229 行的"说明"段落。

当前说明提到"active/manage-selected/bg 相关变量的主消费点在 part1.css"——计划 2 后此说法不再完全准确。修正为：

```markdown
active/manage-selected 的 label background 在 app 层（sidebar.css / manage.css）
被 neutralize 为 transparent，实际视觉指示仅通过 ::before marker 呈现。
theme 层（part1.css）的 ::before marker 规则控制 marker 的 opacity 和 background。
```

**步骤 4：验证**

```bash
# 确认文档中引用的行号与实际代码一致
rg -n "is-active.*sidebar-label" src/styles/app/sidebar.css src/styles/app/manage.css
rg -n "::before" src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css | grep -i "active\|manage\|selected"
```

逐行核对 docs/32 中引用的行号与上述命令输出一致。

### 3.4 涉及文件

| 文件 | 改动 |
|------|------|
| `docs/32-ui-design-tracking-v1.md` | 2.2.2.1 章节触发点、特异性约束、说明段落更新 |

---

## 计划 4：修复 3 个预存失败测试

### 4.1 失败测试 A：externalAuthStatus（2 个失败）

#### 4.1.1 根因

commit `b9d5777`（perf(startup): 开发模式改用 file:// 协议）改变了 `resolveRendererEntry` 的行为：当 `dist/index.html` 存在时优先走 file:// 协议，而非回退到 `VITE_DEV_SERVER_URL`。

测试在 `beforeEach` 设置了 `VITE_DEV_SERVER_URL = "http://localhost:5173"` 并构造 `trustedEvent.senderFrame.url = "http://localhost:5173/"`，但由于 `dist/index.html` 实际存在（构建产物），`resolveRendererEntry` 返回 file 模式，`allowedOrigin` 为 null，`allowedFileBase` 为 `file:///.../dist/index.html`。

`assertTrustedRendererSender` 检查 `senderUrl.startsWith(allowedFileBase)` 失败 → 抛出 `Untrusted IPC sender`。

#### 4.1.2 修复方案

**mock `mainPaths` 模块，强制 URL 模式**

测试目标是 `externalAuthStatus` handler 逻辑，不是 renderer entry 解析。mock 掉 `resolveRendererEntry` 让其返回 URL 模式即可。

#### 4.1.3 分步实施

**步骤 1：在测试文件顶部添加 mainPaths mock**

文件：`electron/registerBackendIpcHandlers.test.ts`

在现有 import 之后、`beforeEach` 之前添加：

```typescript
import { vi } from "vitest";

// 强制 renderer entry 走 URL 模式，绕过 dist/index.html 存在导致的 file:// 优先
vi.mock("./mainPaths", () => ({
  resolveRendererEntry: () => ({
    type: "url" as const,
    value: process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173",
  }),
  collectAppRootCandidates: () => [],
  // 如有其他被引用的导出，一并 mock
}));
```

**步骤 2：确认 mock 覆盖所有被引用的 mainPaths 导出**

```bash
rg -n "from .\"./mainPaths\"|from .\"./mainPaths\"|mainPaths\." electron/registerBackendIpcHandlers.ts
```

如有其他导出被引用，在 mock 中补充。

**步骤 3：运行测试验证**

```bash
npx vitest run electron/registerBackendIpcHandlers.test.ts
```

预期：2 个 externalAuthStatus 测试通过，第 3 个"未受信任 sender 应拒绝调用"仍通过。

**步骤 4：确认无回归**

```bash
npx vitest run electron/  # 所有 electron 测试通过
```

### 4.2 失败测试 B：music_import_sources 清理（1 个失败）

#### 4.2.1 根因

commit `d450f02`（fix(watcher): 手动模式全静默语义修复）引入了 `maybePruneAfterSnapshotRead` 守卫：

```typescript
private async maybePruneAfterSnapshotRead(snapshot) {
  if (!this.externalSourceWatcherEnabled) {
    return snapshot;  // watcher 关闭时直接返回，不 prune
  }
  ...
}
```

commit `02c826f`（perf(snapshot): watcher 默认关闭）将 `externalSourceWatcherEnabled` 默认值改为 `false`。

测试用例"磁盘文件缺失触发自动清理时会同步移除 music_import_sources"期望 `readLibrarySnapshot` 触发 auto-prune，但未显式启用 watcher，导致 `maybePruneAfterSnapshotRead` 直接返回，不执行 prune。

对比同目录 `fileSystemReadService.impl.test.ts` 中的 auto-prune 测试，均显式调用 `service.setExternalSourceWatcherEnabled(true)`。该测试从 `impl.test.ts` 拆分（commit `63d03d3`）时漏掉了这一步骤。

#### 4.2.2 修复方案

在测试用例中补加 `service.setExternalSourceWatcherEnabled(true)`。

#### 4.2.3 分步实施

**步骤 1：定位测试用例**

文件：`electron/fileSystemReadService.impl.import-management-runtime.test.ts`

定位"磁盘文件缺失触发自动清理时会同步移除 music_import_sources"测试用例（约 231 行）。

**步骤 2：补加 watcher 启用**

在 `enqueueImportAndWait` 之后、`fs.rm` 之前，添加：

```typescript
// watcher 默认关闭，auto-prune 需显式启用（与 fileSystemReadService.impl.test.ts 一致）
service.setExternalSourceWatcherEnabled(true);
```

**步骤 3：确认 afterEach 已有 dispose 逻辑**

检查测试文件的 `afterEach` / `afterAll` 是否调用 `service.dispose()`，确保 watcher 被清理（避免影响后续测试）。

若无 dispose，需补充：

```typescript
afterEach(() => {
  service?.dispose?.();
});
```

**步骤 4：运行测试验证**

```bash
npx vitest run electron/fileSystemReadService.impl.import-management-runtime.test.ts
```

预期：所有测试通过，包括"磁盘文件缺失触发自动清理时会同步移除 music_import_sources"。

### 4.3 涉及文件

| 文件 | 改动 |
|------|------|
| `electron/registerBackendIpcHandlers.test.ts` | 添加 mainPaths mock，强制 URL 模式 |
| `electron/fileSystemReadService.impl.import-management-runtime.test.ts` | 补加 `setExternalSourceWatcherEnabled(true)` |

### 4.4 验证

```bash
npx vitest run electron/        # electron 测试全通过
npm run test                    # 全部测试通过（1006 → 0 失败）
npm run lint
```

---

## 执行顺序与验收

### 建议顺序

```
#1（音频树 Bug，P0，1 文件）
  ↓
#4（失败测试，P1，2 文件，独立于 #1）
  ↓
#2（CSS 残余，P1，3 文件）
  ↓
#3（文档同步，P2，1 文件，依赖 #2）
```

### 全局验收清单

```bash
# 质量门禁
npm run lint                          # 0 warning
npm run test                          # 1006 全通过，0 失败
npx madge --circular src electron     # 0 循环依赖
npm run build                         # 构建通过
npm run format:check                  # Prettier 通过

# 手工验证
# 1. music 模式 + 选中群组 → 音频树完整显示
# 2. sidebar 媒体节点 active → 仅 marker，label 透明
# 3. sidebar 媒体节点 manage-selected → 仅 marker，label 透明
# 4. sidebar 根节点 manage-selected → 仅 marker，label 透明
# 5. is-sweeping 高光动画正常
```
