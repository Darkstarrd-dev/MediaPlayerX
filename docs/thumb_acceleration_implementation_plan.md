# 缩略图与全屏翻页性能优化实施计划（可执行版）

Last updated: 2026-02-22

## 0. 结论与纠偏

原计划方向正确，但存在 4 个不可直接落地的问题，已在本版修正：

1. **相邻页预热独立 hook 无法稳定复用缓存**：`useResolvedMediaUrls` 当前为 hook 实例内缓存，独立预热与主渲染链路会缓存割裂。
2. **设置项穿透链路不完整**：仅改设置面板不够，必须同步持久化、恢复、顶层 props、测试。
3. **后端优先级队列缺协议入口**：现有 `resolveMediaResource` 请求没有优先级字段，无法实现“前端高优先级透传”。
4. **渲染预解码与现有机制重叠**：主图区已有分页预加载/预解码流程，直接叠加会造成重复解码与内存抖动。

本计划按“最小可行版本 (MVP, Minimum Viable Product)”推进，先做确定性收益，再做可选增强。

---

## 1. 目标与非目标

### 1.1 目标

- 缩略图模式连续翻页时，减少“新页首屏等待缩略图 URL + 解码”的空窗。
- 全屏快速切图时，命中已解码缓存 (Decode Cache) 可直接显示，不再等待 `Image.decode()`。
- 全链路可配置、可回滚、可验证，且不破坏现有 IPC 合约。

### 1.2 非目标

- 本阶段**不实现**后端“高/低优先级队列透传”（缺协议字段）。
- 本阶段**不新增**独立主图区预解码 hook（避免与现有 `imageMainSectionPreload` 重叠）。
- 本阶段**不强制**修改 `UV_THREADPOOL_SIZE`（收益不稳定，先保守）。

---

## 2. 配置项设计（修正版）

> 修正：移除 `backendThumbnailConcurrency`，复用现有 `thumbnailGenerationConcurrency`，避免重复语义。

| key | 标签 | 类型 | 选项 | 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `thumbnailWarmupRadius` | 相邻页预热范围 | 下拉 | `0/1/2/3` | `1` | `0` 表示关闭 |
| `thumbnailWarmupConcurrency` | 预热批量级别 | 下拉 | `1/2/3/4` | `2` | 历史命名保留，实际用于“每轮预热目标上限系数” |
| `fullscreenPrefetchRadius` | 全屏预取深度 | 下拉 | `2/4/6/8/12` | `6` | 替代硬编码 `4` |
| `fullscreenDecodeCacheSize` | 全屏解码缓存数 | 下拉 | `4/6/8/10/16` | `10` | LRU (Least Recently Used) 上限 |

说明：后端生成并发继续使用现有 `thumbnailGenerationConcurrency`（默认建议从 `4` 调整到 `6`，可回滚）。

---

## 3. 分阶段实施

## Phase 0：设置链路打通（必须先做）

### 3.0 改动文件

- `src/contracts/settings.ts`
- `src/store/useUiStore.ts`
- `src/features/app/useAppSettingsStore.ts`
- `src/features/app/usePersistedAppSettings.ts`
- `src/features/app/useSettingsPersistence.ts`
- `src/features/app/useAppTopLayerState.ts`
- `src/features/app/buildSettingsPanelProps.ts`
- `src/components/SettingsPanel.tsx`
- `src/components/settings/renderSettingsMainSection.types.ts`
- `src/components/settings/renderSettingsMainSectionContent.tsx`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
- `src/features/app/buildSettingsPanelProps.test.ts`

### 3.1 要点

- 新增 `performance` 分栏。
- 4 个新配置项完成：Schema、默认值、store、持久化、恢复、UI、i18n、测试。
- `thumbnailWarmupConcurrency` 文案标注“预热批量级别”，避免误导为真实并发线程数。

### 3.2 验收

- 设置面板可修改并持久化 4 项参数。
- 重启后参数恢复正确。
- 相关单测通过。

---

## Phase 1：缩略图相邻页预热（前端主收益）

### 4.0 设计修正

不新建独立 `useResolvedMediaUrls` 预热实例；改为在 `useResolvedMediaState` 同一解析链路内合并预热目标，避免缓存割裂。

### 4.1 改动文件

- `src/features/app/useResolvedMediaState.ts`
- `src/features/app/useAppDisplayResources.ts`
- `src/features/app/useResolvedMediaState.test.tsx`

### 4.2 实施要点

- 抽取 `buildThumbnailResolveTargets`（当前页）与 `buildAdjacentWarmupTargets`（相邻页）。
- 合并目标顺序：当前页目标优先，相邻页预热目标后置。
- 预热目标上限：
  - `maxWarmupTargets = thumbnailWarmupConcurrency * pagedPageSize`
  - 在 `warmupRadius` 范围内按“近页优先”截断。
- 导入忙碌 (`importBusy`) 或 `showNamesOnly` 时禁用预热。

### 4.3 验收

- 连续翻页时，下一页命中率明显提升（手动验证无白屏突刺）。
- 导入中自动禁用预热。
- 不新增 IPC 协议字段。

---

## Phase 2：全屏切图优化（预取深度 + 解码缓存）

### 5.0 改动文件

- `src/features/app/useResolvedMediaState.ts`
- `src/features/app/useAppDisplayResources.ts`
- `src/features/app/useAppTopLayerState.ts`（如需新增透传字段）
- `src/components/FullscreenLayer.tsx`
- `src/components/fullscreen/useFullscreenImageSource.ts`

### 5.1 实施要点

1. `fullscreenPrefetchRadius` 替换硬编码 `prefetchRadius=4`。
2. `useFullscreenImageSource` 引入模块级 LRU 解码缓存：
   - key: `src`
   - value: `{ naturalWidth, naturalHeight, decodedAtMs }`
   - 上限由 `fullscreenDecodeCacheSize` 控制。
3. 全屏显示逻辑：
   - 命中缓存：立即切图。
   - 未命中：维持现有 decode 流程，成功后写入 LRU。
4. 空闲预解码 (`requestIdleCallback`) 只针对已预取到 URL 的相邻项，失败静默。

### 5.2 验收

- 快速前后切图时，已访问或已预解码图片可即时显示。
- 内存增长受 `fullscreenDecodeCacheSize` 控制，不出现无界增长。

---

## Phase 3：后端并发调优（低风险版本）

### 6.0 改动文件

- `src/store/useUiStore.ts`（可选：`thumbnailGenerationConcurrency` 默认值从 `4` 到 `6`）
- `src/features/app/buildSettingsPanelProps.ts`（可选：重置默认同步）
- `electron/fileSystemThumbnailResolver.ts`（仅必要时调默认常量）

### 6.1 实施要点

- 复用现有 `thumbnailGenerationConcurrency -> request.thumbnail.generation_concurrency` 链路。
- 保持后端 FIFO 队列，不引入“伪优先级”实现。
- 若默认并发上调，保留 UI 可调和一键重置。

### 6.2 验收

- 后端缩略图吞吐提升且无明显卡死/饥饿。
- 导入任务与缩略图生成并行时仍稳定。

---

## 4. 实施顺序

`Phase 0 -> Phase 1 -> Phase 2 -> Phase 3`

原因：先打通配置和可回滚能力，再做主收益路径，最后做低风险调优。

---

## 5. 风险审计与回滚策略

| 风险 | 触发条件 | 应对 | 回滚开关 |
| --- | --- | --- | --- |
| 预热导致内存升高 | 大页尺寸 + 高半径 | 限制 `maxWarmupTargets`，默认 `radius=1` | `thumbnailWarmupRadius=0` |
| 全屏缓存过大 | 高分辨率连续切图 | LRU + 上限 16 + 默认 10 | `fullscreenDecodeCacheSize=4` |
| 导入期资源竞争 | importBusy 时抢占 | importBusy 下禁用预热 | 自动禁用 |
| 并发上调导致抖动 | CPU 紧张 | 恢复默认 4，或用户下调 | 设置面板即时生效 |

---

## 6. 验证方案

### 6.1 自动化

1. `npm run lint`
2. `npx madge --circular src electron`
3. `npm run test`
4. `npm run build && npm run build:electron`

### 6.2 手动验证

1. 设置面板 `高级分页 -> 加载性能`：4 个下拉项可编辑、持久化、重启恢复。
2. 200+ 张图包连续翻页：预热后白屏明显减少。
3. 全屏快速切图：缓存命中路径可即时切换。
4. 导入进行中翻页：预热关闭，主流程稳定。

---

## 7. 文档同步要求（SSOT）

实施完成后需同步：

- `docs/interaction-v1.md`（设置面板新增分栏与项）
- `docs/README.md`（新增计划文档入口，标注状态）
- 如涉及架构边界变化，再更新 `docs/architecture-v1.md`

---

## 8. 交付里程碑

- M1：Phase 0 完成并通过质量门禁。
- M2：Phase 1 完成，缩略图翻页主路径可用。
- M3：Phase 2 完成，全屏切图缓存可用。
- M4：Phase 3 完成，默认参数调优并回归通过。
