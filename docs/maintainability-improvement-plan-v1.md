# 可维护性与稳定性改进计划 V1

> 文档状态：进行中（当前阶段：Phase 2）
> 执行清单：`docs/maintainability-improvement-execution-v1.md`（临时）

## 0. 文档定位

- 本文档用于固化当前阶段最值得执行的工程改进项，目标是优先降低数据损坏与安全回归风险。
- 计划依据：`docs/architecture-v1.md` 与 `docs/backend-integration-guardrails.md` 的既有约束。
- 本文档为长期保留文档；阶段执行细节记录在临时文档 `docs/maintainability-improvement-execution-v1.md`。

## 1. 目标与范围

### 1.1 目标

- 补齐 SQLite 存储层与媒体访问安全守卫的测试安全网。
- 为核心编排链路建立稳定的集成测试回归入口。
- 以低成本补充纯函数映射测试，降低重构回归概率。

### 1.2 优先级

- P0：数据库存储层与迁移测试。
- P0：媒体访问安全守卫测试（路径白名单、token 生命周期、审计统计）。
- P1：核心编排链路集成测试（读取/导航/写入回滚/错误可见性）。
- P1：`build*Props` 纯函数单测。
- P2（可选）：跨模块边界类型接口收敛，减少 `ReturnType<typeof ...>` 级联传播。

### 1.3 非目标（本计划不做）

- 不调整产品需求范围，不新增业务功能。
- 不在本轮引入新的测试框架或大规模目录重构。
- 不以“覆盖率数字”替代关键链路可回归性。

## 2. 基线与问题定义

### 2.1 当前基线

- 已有后端集成测试：`electron/fileSystemReadService.test.ts`（覆盖读写主链路与部分安全边界）。
- 已有前端关键行为测试：`src/App.test.tsx`。
- 已有 Repository 行为测试：`src/features/backend/repository/realRepository.test.ts`。

### 2.2 主要风险

- 数据库存储与迁移缺少独立、细粒度测试，存在变更回归风险。
- 媒体访问守卫缺少独立测试文件，安全策略容易在重构时被弱化。
- 核心编排 hooks 的回归成本高，且当前测试主要聚焦 UI 整体验证。

## 3. 阶段计划

### Phase 0：测试矩阵固化（准备）

- 产出：关键链路测试矩阵（场景、断言、对应文件、失败提示标准）。
- 产出：执行顺序与最小回归命令。
- 完成标志：临时实施文档 Phase 0 清单完成。

### Phase 1：SQLite 存储层测试（P0）

- 范围：`electron/mediaLibraryDatabase.ts` 与各 store（schema/snapshot/metadata/playlist/task/app state）。
- 关键用例：
  - migration 版本升级与重复执行幂等。
  - 事务 upsert + stale 清理后的查询一致性。
  - 写链路关键字段持久化与重启恢复。
- 完成标志：新增测试通过，且不降低现有 `fileSystemReadService` 集成测试稳定性。

### Phase 2：媒体访问安全守卫测试（P0）

- 范围：`electron/fileSystemMediaAccessGuard.ts` 与 `resolveMediaResource` 审计相关逻辑。
- 关键用例：
  - 根目录白名单、路径穿越、非法 archive entry 拒绝。
  - token 命中/未命中/过期/清理计数。
  - 变体请求策略（`original/thumbnail`）的边界校验。
- 完成标志：守卫策略具备独立测试回归，拒绝分类可验证。

### Phase 3：核心编排链路集成测试（P1）

- 范围：`src/features/app/useAppDataPipeline.ts` 及其上层行为入口。
- 关键用例：
  - 读取链路并发请求取消与 request id 防覆盖。
  - 写链路 optimistic update + 失败 rollback。
  - 管理模式与检索容器切换时的关键状态一致性。
- 完成标志：核心链路最小回归集（3-5 条）稳定可重复。

### Phase 4：纯函数与接口收口（P1/P2）

- 范围：`src/features/app/build*Props.ts` 系列；必要时补跨模块显式接口类型。
- 关键用例：
  - props 映射边界值与空态/异常输入兜底。
  - 跨模块公开接口形状固定，减少签名级联。
- 完成标志：低成本回归覆盖补齐；如启动 P2，需附带迁移说明。

## 4. 执行门禁与验收

- 每阶段至少满足：
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- 若阶段引入新测试 fixture，必须保证跨机器可重复运行。
- 阶段完成后同步更新：
  - `docs/README.md` 当前状态
  - `docs/architecture-v1.md` 测试策略对齐
  - `docs/maintainability-improvement-execution-v1.md` 勾选状态

## 5. 文档协作约定

- 实施过程中的任务分解、文件级清单与进度，只维护在临时实施文档。
- 当全部阶段完成并稳定通过回归后：
  - 将本计划文档状态更新为“已完成”。
  - 删除临时实施文档 `docs/maintainability-improvement-execution-v1.md`。
  - 在同一提交中移除 README 对该临时文档的索引条目。
