# 可维护性与稳定性改进实施清单 V1（临时）

> 文档状态：执行中（临时）
> 删除规则：当 `docs/maintainability-improvement-plan-v1.md` 全部阶段完成并验收通过后，本文件必须删除。

## 0. 使用方式

- 本文档只记录执行清单、文件级任务与阶段进度，不承载长期架构决策。
- 每完成一个阶段，必须同步更新勾选状态与“执行记录”。
- 若阶段范围调整，先更新本文件，再进行代码改动。

## 1. 总体里程碑

- [x] Phase 0：测试矩阵与夹具准备
- [x] Phase 1：SQLite 存储层测试（P0）
- [x] Phase 2：媒体访问安全守卫测试（P0）
- [x] Phase 3：核心编排链路集成测试（P1）
- [ ] Phase 4：纯函数测试与接口收口（P1/P2）

## 2. 分阶段实施清单

### Phase 0：测试矩阵与夹具准备

目标：固化“先测什么、怎么测、在哪里测”。

- [x] 输出测试矩阵（场景 -> 断言 -> 测试文件）。
- [x] 明确共享 fixture 位置与命名规范（临时目录、样本文件、数据库路径）。
- [x] 固化最小回归命令与执行顺序：`npm run lint` -> `npm run test` -> `npm run build`。
- [x] 为后续 Phase 1/2 预留可复用测试工具（如 `electron/test-utils/*`，按实际需要落地）。

交付物：

- 可执行的矩阵清单（本文件 2~4 节）。
- 需要新增的测试文件路径草案。

测试矩阵（V1）：

| 目标链路 | 关键场景 | 主要断言 | 测试文件 |
| --- | --- | --- | --- |
| SQLite 存储层 | schema 迁移幂等 | `user_version` 正确且重复迁移不破坏表结构 | `electron/mediaLibrarySchema.test.ts` |
| SQLite 快照读写 | upsert + stale 清理 | 第二次 replace 后旧 source/image/video 被清理 | `electron/mediaLibrarySnapshotStore.test.ts` |
| SQLite 元数据/播放列表/任务 | 写后读一致 | grade/cover/playlist/task 字段可回读且归一化生效 | `electron/mediaLibraryMetadataStore.test.ts` / `electron/mediaLibraryPlaylistStore.test.ts` / `electron/mediaLibraryTaskStore.test.ts` |
| 媒体访问守卫 | 路径与 entry 边界 | 越界拒绝、非法 entry 拒绝、白名单命中通过 | `electron/fileSystemMediaAccessGuard.test.ts` |
| token 生命周期 | 命中/未命中/过期/清理 | 审计计数与异常消息符合预期 | `electron/services/file-system-read/mediaTokenService.test.ts` |
| 核心编排读链路 | 取消旧请求 + 防覆盖 | 后发请求结果保留，旧响应不覆盖 | `src/features/app/useAppDataPipeline.integration.test.tsx` |
| 核心编排写链路 | optimistic + rollback | 失败后状态回滚且错误可见 | `src/features/app/useAppDisplayAndEffects.integration.test.tsx` |
| 面板切换一致性 | 管理/检索互斥 | 切换后关键 props 与可见性正确 | `src/features/app/useAppDataPipeline.integration.test.tsx` |
| 纯函数映射 | 边界值/空态 | builder 输出稳定且回调行为正确 | `src/features/app/build*Props.test.ts` |

夹具与约定：

- 复用夹具入口：`electron/test-utils/mediaLibraryFixtures.ts`。
- 临时目录规则：统一使用 `createTempMediaRoot('mpx-test-*')`，测试结束调用 `cleanupTempMediaRoot`。
- 数据样本规则：优先使用 `createLibrarySnapshotFixture` 生成最小可用快照，避免每个测试重复手写 DTO。
- 回归顺序：阶段内先跑新增测试，再执行 `npm run lint` -> `npm run test` -> `npm run build`。

### Phase 1：SQLite 存储层测试（P0）

目标：为迁移、事务 upsert、持久化恢复建立独立回归网。

建议落地文件（按实际结构微调）：

- [x] `electron/mediaLibraryDatabase.test.ts`
- [x] `electron/mediaLibrarySchema.test.ts`
- [x] `electron/mediaLibrarySnapshotStore.test.ts`
- [x] `electron/mediaLibraryMetadataStore.test.ts`
- [x] `electron/mediaLibraryPlaylistStore.test.ts`
- [x] `electron/mediaLibraryTaskStore.test.ts`
- [x] `electron/mediaLibraryAppStateStore.test.ts`

必测场景：

- [x] 数据库初始化与 `user_version` 迁移幂等。
- [x] snapshot upsert 后查询一致性（含 stale 清理）。
- [x] 评分/封面/播放列表/任务日志写入后重启恢复。
- [x] 异常输入与回滚分支（保持数据完整性）。

阶段验收：

- [x] 以上新增测试在本机可重复通过。
- [x] 不破坏现有 `electron/fileSystemReadService.test.ts` 通过率。

### Phase 2：媒体访问安全守卫测试（P0）

目标：独立验证路径边界、entry 白名单、token 生命周期与审计统计。

建议落地文件（按实际结构微调）：

- [x] `electron/fileSystemMediaAccessGuard.test.ts`
- [x] `electron/services/file-system-read/mediaTokenService.test.ts`
- [x] （可选）在 `electron/fileSystemReadService.test.ts` 增补守卫回归场景（本轮不新增，沿用既有集成用例作为回归补位）

必测场景：

- [x] 根目录白名单命中与越界拒绝。
- [x] archive entry 非法路径拒绝（如 `../`）。
- [x] token 命中/未命中/过期/清理计数正确。
- [x] `original/thumbnail` 变体边界和错误提示可见。

阶段验收：

- [x] 拒绝原因分类可在测试中稳定断言。
- [x] 资源访问协议边界不回退。

### Phase 3：核心编排链路集成测试（P1）

目标：为核心数据管线建立最小高价值回归集。

建议落地文件（按实际结构微调）：

- [x] `src/features/app/useAppDataPipeline.integration.test.tsx`
- [x] `src/features/app/useAppDisplayAndEffects.integration.test.tsx`
- [x] `src/App.test.tsx`（复用既有关键链路断言，避免继续膨胀）

必测场景：

- [x] 读取链路请求取消与 request id 防覆盖。
- [x] optimistic update 成功与失败 rollback。
- [x] 管理模式 / 检索容器切换时状态一致性。
- [x] 关键错误分支 UI 可见且可恢复（重试或回退）。

说明：

- 读取取消/防覆盖与 rollback 场景由 `src/features/backend/useReadOnlyDataAccess.test.tsx`、`src/features/backend/useWriteDataAccess.test.tsx` 与本阶段新增集成测试联合覆盖。

阶段验收：

- [x] 最小回归集 3~5 条稳定通过。
- [x] 不引入新的 `act(...)` 非阻断噪声告警。

### Phase 4：纯函数测试与接口收口（P1/P2）

目标：低成本补覆盖 + 可选降低类型级联风险。

建议落地文件（按实际结构微调）：

- [ ] `src/features/app/buildAppHeaderProps.test.ts`
- [ ] `src/features/app/buildSearchPanelProps.test.ts`
- [ ] `src/features/app/buildSidebarPanelProps.test.ts`
- [ ] `src/features/app/buildMetadataPanelProps.test.ts`
- [ ] 其他 `build*Props` 测试按收益逐步补齐

可选收口任务（仅在 Phase 1-3 稳定后执行）：

- [ ] 抽取跨模块显式接口类型（避免广域 `ReturnType<typeof ...>` 传播）。
- [ ] 更新相关调用点与文档说明，保持行为不变。

阶段验收：

- [ ] 纯函数关键边界值已覆盖。
- [ ] 若执行可选收口，需附迁移说明与回滚策略。

## 3. 阶段门禁

每个阶段结束必须执行：

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

若任一失败：

- [ ] 记录失败用例与原因。
- [ ] 修复后重新跑完整门禁，禁止只跑局部用例即宣告完成。

## 4. 执行记录

### 2026-02-10

- [x] 建立本实施文档。
- [x] 与计划文档建立双向约束（长期计划 + 临时执行清单）。
- [x] Phase 0 完成：补齐测试矩阵、落地夹具入口 `electron/test-utils/mediaLibraryFixtures.ts`。
- [x] Phase 0 门禁执行完成：`npm run lint`（1 条既有 warning，不阻断）/ `npm run test` / `npm run build` 通过。
- [x] Phase 1 完成：新增 SQLite 存储层 7 个测试文件并覆盖 migration/snapshot/metadata/playlist/task/app_state/database facade。
- [x] Phase 1 门禁执行完成：`npm run lint`（1 条既有 warning，不阻断）/ `npm run test` / `npm run build` 通过。
- [x] Phase 2 完成：新增 `fileSystemMediaAccessGuard` 与 `mediaTokenService` 独立测试，并修正 token 过期审计计数。
- [x] Phase 2 门禁执行完成：`npm run lint`（1 条既有 warning，不阻断）/ `npm run test` / `npm run build` 通过。
- [x] Phase 3 完成：新增 `useAppDataPipeline/useAppDisplayAndEffects` 集成测试，编排层接线稳定回归。
- [x] Phase 3 门禁执行完成：`npm run lint`（1 条既有 warning，不阻断）/ `npm run test` / `npm run build` 通过。

## 5. 结束与移除规则

以下条件全部满足后，必须删除本文件：

- [ ] Phase 0 ~ Phase 4 全部完成并勾选。
- [ ] `docs/maintainability-improvement-plan-v1.md` 更新为“已完成”。
- [ ] `docs/README.md` 与 `docs/architecture-v1.md` 已同步最终状态。
- [ ] 最近一次全量门禁 `lint/test/build` 通过。

删除动作要求：

- [ ] 在同一提交中删除本文件。
- [ ] 同一提交中移除 `docs/README.md` 对本文件的索引。
