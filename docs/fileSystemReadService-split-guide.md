# `fileSystemReadService` 低风险拆分说明（临时）

> 临时文档：用于执行 `electron/fileSystemReadService.ts` 的阶段性拆分。
> 
> 拆分全部完成并稳定后，必须移除本文件与对本文件的引用。

## 目标

- 将 `electron/fileSystemReadService.ts` 从“上帝类 (God Class)”收敛为“门面 (Facade) + 领域服务”。
- 保持对外 IPC 行为与返回结构不变（不改调用方契约）。
- 在不改变用户可见行为的前提下，先完成低风险拆分。

## 进度快照（基于 git，2026-02-10）

- 总体模块拆分已完成约 50%：Renderer/App 链路拆分已完成并合入主线。
- 当前文档覆盖的 Main 低风险拆分 L1~L4 已完成并接线：`mediaTokenService`、`runtimeDependencyService`、`serviceEventBus`、`importPathRegistry`。
- 结论：下一步进入中高风险拆分（管理删除事务、扫描器、归一化执行器、解析器），继续收敛 Facade 纯度。

## 非目标

- 不改 Mock 体系与 Renderer 侧调用方式。
- 不在本阶段重写归一化策略、删除事务、扫描算法。
- 不新增第二套状态来源，继续遵守单一事实源 (Single Source of Truth, SSOT)。

## 强制约束（拆分时必须保持）

1. `invalidateCache` 语义保持不变：不得错误清空 allowlist/archive index/token，避免刷新期临时 deny/404。
2. 索引更新保持“就绪后原子交换 (atomic swap)”，未就绪前旧快照仍可读。
3. 归一化调度信号保持一致：交互时间戳、导入任务运行态、缩略图 in-flight、扫描 loading 不得丢失。
4. `fileSystemReadService` 继续作为 Facade，对外方法签名与返回结构不变。
5. 每个阶段完成后必须执行测试：`npm run test`。

## 低风险拆分范围（先做）

建议先新建目录：`electron/services/file-system-read/`

### L1: Token 相关能力

- 抽离 token 生成、校验、过期清理、命中统计。
- 建议文件：`mediaTokenService.ts`

### L2: 运行时依赖能力

- 抽离依赖探测与降级矩阵拼装（sharp/ffmpeg/ffprobe/archive-wasm/powershell）。
- 建议文件：`runtimeDependencyService.ts`

### L3: 事件发布能力

- 抽离 `libraryChanged` / `archiveLoadStatus` 发布与订阅管理。
- 建议文件：`serviceEventBus.ts`

### L4: 导入路径注册能力

- 抽离导入路径登记、规范化、查询与清理。
- 建议文件：`importPathRegistry.ts`

> 以上四项完成前，不进入中高风险拆分（管理删除事务、扫描器、归一化执行器、解析器）。

## 每阶段执行流程（固定）

1. 只抽一个能力块，Facade 委托到新服务。
2. 保持方法签名与返回结构不变。
3. 运行 `npm run test`，必须全绿。
4. 记录影响文件与剩余待办，再进入下一块。

## 待办清单

- [x] L1 抽离 `mediaTokenService`
- [x] L2 抽离 `runtimeDependencyService`
- [x] L3 抽离 `serviceEventBus`
- [x] L4 抽离 `importPathRegistry`
- [x] 低风险阶段完成后复核 `fileSystemReadService.ts` 行数与 Facade 纯度（当前约 `2250+` 行，仍需继续拆分）

## 并行拆分提醒

- `src/features/management/useManageImageSelectionInteractions.ts` 已生成为管理模式交互抽离候选模块，当前尚未接线。
- 若先完成 Main L1~L4，可在不改 UI 行为前提下并行补齐该 Hook 接线与对应测试。

## 完成标准与文档移除条件

满足以下条件后，删除本文件：

1. `electron/fileSystemReadService.ts` 仅保留 Facade 组装与委托（目标约 260~380 行）。
2. 低风险阶段所有拆分项完成，且 `npm run test` 稳定通过。
3. `docs/README.md` 与 `docs/architecture-v1.md` 中“待处理事项”已更新为完成状态。
4. 删除本文件 `docs/fileSystemReadService-split-guide.md` 及文档索引引用。
