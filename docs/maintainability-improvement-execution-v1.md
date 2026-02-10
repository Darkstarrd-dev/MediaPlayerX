# 可维护性与稳定性改进实施清单 V1（临时）

> 文档状态：执行中（临时）
> 删除规则：当 `docs/maintainability-improvement-plan-v1.md` 全部阶段完成并验收通过后，本文件必须删除。

## 0. 使用方式

- 本文档只记录执行清单、文件级任务与阶段进度，不承载长期架构决策。
- 每完成一个阶段，必须同步更新勾选状态与“执行记录”。
- 若阶段范围调整，先更新本文件，再进行代码改动。

## 1. 总体里程碑

- [ ] Phase 0：测试矩阵与夹具准备
- [ ] Phase 1：SQLite 存储层测试（P0）
- [ ] Phase 2：媒体访问安全守卫测试（P0）
- [ ] Phase 3：核心编排链路集成测试（P1）
- [ ] Phase 4：纯函数测试与接口收口（P1/P2）

## 2. 分阶段实施清单

### Phase 0：测试矩阵与夹具准备

目标：固化“先测什么、怎么测、在哪里测”。

- [ ] 输出测试矩阵（场景 -> 断言 -> 测试文件）。
- [ ] 明确共享 fixture 位置与命名规范（临时目录、样本文件、数据库路径）。
- [ ] 固化最小回归命令与执行顺序：`npm run lint` -> `npm run test` -> `npm run build`。
- [ ] 为后续 Phase 1/2 预留可复用测试工具（如 `electron/test-utils/*`，按实际需要落地）。

交付物：

- 可执行的矩阵清单（本文件 2~4 节）。
- 需要新增的测试文件路径草案。

### Phase 1：SQLite 存储层测试（P0）

目标：为迁移、事务 upsert、持久化恢复建立独立回归网。

建议落地文件（按实际结构微调）：

- [ ] `electron/mediaLibraryDatabase.test.ts`
- [ ] `electron/mediaLibrarySchema.test.ts`
- [ ] `electron/mediaLibrarySnapshotStore.test.ts`
- [ ] `electron/mediaLibraryMetadataStore.test.ts`
- [ ] `electron/mediaLibraryPlaylistStore.test.ts`
- [ ] `electron/mediaLibraryTaskStore.test.ts`
- [ ] `electron/mediaLibraryAppStateStore.test.ts`

必测场景：

- [ ] 数据库初始化与 `user_version` 迁移幂等。
- [ ] snapshot upsert 后查询一致性（含 stale 清理）。
- [ ] 评分/封面/播放列表/任务日志写入后重启恢复。
- [ ] 异常输入与回滚分支（保持数据完整性）。

阶段验收：

- [ ] 以上新增测试在本机可重复通过。
- [ ] 不破坏现有 `electron/fileSystemReadService.test.ts` 通过率。

### Phase 2：媒体访问安全守卫测试（P0）

目标：独立验证路径边界、entry 白名单、token 生命周期与审计统计。

建议落地文件（按实际结构微调）：

- [ ] `electron/fileSystemMediaAccessGuard.test.ts`
- [ ] `electron/services/file-system-read/mediaTokenService.test.ts`
- [ ] （可选）在 `electron/fileSystemReadService.test.ts` 增补守卫回归场景

必测场景：

- [ ] 根目录白名单命中与越界拒绝。
- [ ] archive entry 非法路径拒绝（如 `../`）。
- [ ] token 命中/未命中/过期/清理计数正确。
- [ ] `original/thumbnail` 变体边界和错误提示可见。

阶段验收：

- [ ] 拒绝原因分类可在测试中稳定断言。
- [ ] 资源访问协议边界不回退。

### Phase 3：核心编排链路集成测试（P1）

目标：为核心数据管线建立最小高价值回归集。

建议落地文件（按实际结构微调）：

- [ ] `src/features/app/useAppDataPipeline.integration.test.tsx`
- [ ] `src/features/app/useAppDisplayAndEffects.integration.test.tsx`
- [ ] `src/App.test.tsx`（仅补关键链路断言，避免继续膨胀）

必测场景：

- [ ] 读取链路请求取消与 request id 防覆盖。
- [ ] optimistic update 成功与失败 rollback。
- [ ] 管理模式 / 检索容器切换时状态一致性。
- [ ] 关键错误分支 UI 可见且可恢复（重试或回退）。

阶段验收：

- [ ] 最小回归集 3~5 条稳定通过。
- [ ] 不引入新的 `act(...)` 非阻断噪声告警。

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
- [ ] Phase 0 实施中。

## 5. 结束与移除规则

以下条件全部满足后，必须删除本文件：

- [ ] Phase 0 ~ Phase 4 全部完成并勾选。
- [ ] `docs/maintainability-improvement-plan-v1.md` 更新为“已完成”。
- [ ] `docs/README.md` 与 `docs/architecture-v1.md` 已同步最终状态。
- [ ] 最近一次全量门禁 `lint/test/build` 通过。

删除动作要求：

- [ ] 在同一提交中删除本文件。
- [ ] 同一提交中移除 `docs/README.md` 对本文件的索引。
