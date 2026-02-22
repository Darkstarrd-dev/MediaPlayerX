# MediaPlayerX 文档目录

## 文档策略

- `docs/` 根目录仅保留 SSOT 与当前迭代必用文档。
- 历史文档统一迁移到 `docs/archive/`。

## 快速入口

- 总索引：`DOCS_INDEX.md`
- 需求：`requirements-v1.md`
- 架构：`architecture-v1.md`
- 交互：`interaction-v1.md`
- 后端约束：`backend-integration-guardrails.md`
- i18n/a11y 约束：`i18n-aria-guardrails.md`
- Shader 开发入口：`music-visualizer-shader-entry.md`
- Shader 实施手册：`music-visualizer-shader-migration-playbook.md`
- Theme 规范（SSOT）：`theme-system-v2.md`
- Theme 迭代入口：`theme-brainstorm-entry.md`
- UI 稳定路径表：`ui_definition.md`
- UI 槽位 Token 前缀表：`token_design.md`
- 当前评估：`project-evaluation-report-v12.md`
- 风险台账：`dependency-risk-register.md`

## UI 表维护约束

- 新增 UI 槽位：同时新增 `ui_definition.md` 与 `token_design.md` 条目。
- 修改 UI 槽位：两张表同步修改。
- 删除 UI 槽位：两张表同步删除（如需兼容先标记 deprecated 再移除）。

## 子目录

- `ui/`：UI mock、主题调试页与样式实验资源。
- `perf/`：性能方案与基准结果。
- `ref/`：参考资料与实验样例。
- `archive/`：历史文档归档。

---

## 待解决问题（Backlog）

### [未修复] Fullscreen + Dual 模式回归（两个 Bug）

**引入版本**：commit `7963d76`（mode-gating）+ `usePersistedSessionCursor.ts` 未提交改动。

#### Bug 1：image 模式 → fullscreen → 切换 dual → video 部分显示"无可用数据源"

**根因**：`useAppSidebarScopeState.ts` 对 `videosForSidebar` 加了 mode 门控（`videos: isVideoMode ? ... : []`），image 模式下为空数组。`useAppEffects.ts:406-417` 的 effect 看到 `videosForSidebar.length === 0` 后调用 `selectVideoFromBrowser('')` 清空 `selectedVideoId`，导致 dual 模式下 video pane 无视频可显示。

**修复方案**：在 `useAppEffects.ts:406` effect 顶部加 `if (mode !== 'video') return`，并将 `mode` 加入 deps 数组。

#### Bug 2：video 模式 → fullscreen → 切换 dual → 白屏，无法操作

**根因**：`usePersistedSessionCursor.ts` 将 cursor 恢复的 early return 加了 `|| importBusy` 门控；导入结束后 effect 触发，若 `persisted.mode === "image"` 则调用 `updateMode("image")` 强制切换当前模式，叠加 fullscreen+dual 状态导致视图不一致（白屏）。

**修复方案**：在同一 early return 条件加 `|| fullscreenActive`，并将 `fullscreenActive` 加入 deps 数组，防止 fullscreen 期间触发模式强切。

**关键文件**：`src/features/app/useAppEffects.ts`（L406-417）、`src/features/app/usePersistedSessionCursor.ts`（L191-308）
