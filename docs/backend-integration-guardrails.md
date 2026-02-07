# 后端接入规避方案（强制执行）

## 适用范围

- 适用于从“虚拟 UI 阶段”切换到真实后端输入（本地扫描 / Electron IPC / API / 数据库）后的全部开发。
- 本文为后续执行的强制约束，优先级高于临时口头约定。

## 强制原则

1. 单一事实源 (Single Source of Truth, SSOT)
   - 同一业务状态只能有一个来源。
   - 禁止在组件内复制一份可变镜像状态（例如再维护一个不同步的列表副本）。

2. 数据访问层 (Data Access Layer, Repository)
   - UI/Hook 禁止直接请求后端。
   - 必须通过 `Repository` 接口访问数据（Mock 与真实后端实现同一接口）。

3. 传输对象映射 (Data Transfer Object, DTO -> ViewModel)
   - 组件禁止直接使用后端原始 DTO。
   - 必须在适配层完成 DTO 到 ViewModel 的显式映射。

4. 异步一致性控制
   - 列表查询、筛选、分页切换必须具备取消旧请求能力（`AbortController` 或等价方案）。
   - 状态更新必须带请求代号（request id）或版本比较，防止旧响应覆盖新状态。

5. 错误与降级
   - 后端异常必须有 UI 可见反馈（非静默失败）。
   - 必须提供可恢复路径（重试 / 回退到上次成功快照）。

6. 模块边界不可回退
   - 已拆分模块（`features/*`）禁止反向合并回 `App.tsx`。
   - 新增复杂逻辑优先放入对应 feature hook/service，不直接堆入页面组件。

7. 媒体访问协议与定位模型
   - 媒体来源统一通过 `MediaLocator`（文件系统 / 压缩包 entry）表达。
   - Renderer 仅可消费 Main 颁发的受控 `resource_url`，禁止拼接本地路径直读。
   - Main 必须执行根目录白名单与路径穿越校验，压缩包 entry 必须做合法性校验。

## 实施顺序（必须按序）

1. 固化接口
   - 定义 `Repository` 接口与 DTO/ViewModel 类型。

2. 双实现并存
   - 保留 `MockRepository`，新增 `RealRepository`。
   - 通过配置或环境变量切换，不改 UI 调用层。

3. 先接入读链路
   - 先完成只读路径（目录/媒体项加载、分页、筛选），再接写操作（评分、封面保存等）。

4. 再接入写链路
   - 写操作必须实现 optimistic update 回滚或服务端确认后更新。

5. 收敛回归
   - 每次替换一个能力点后执行完整回归：`npm run lint && npm run test && npm run build`。

## 禁止项

- 禁止在组件中直接 `fetch` 或直接访问 IPC 全局对象。
- 禁止把 DTO 字段直接透传到 UI。
- 禁止绕过测试直接替换核心状态流。
- 禁止在未更新文档时提交后端接入改动。
- 禁止在 Renderer 直接构造 `file://` 或自定义协议路径绕过 Repository。

## 提交门禁 (Definition of Done, DoD)

- 代码：通过 `lint` / `test` / `build`。
- 文档：同步更新本文件 + 对应需求/交互文档。
- 回归：关键路径手测通过（模式切换、分页、快捷键、播放控制、拖拽/导入）。

## 真实文件性能门禁（扫描/重处理强制）

### 触发条件（任一命中即触发）

- 大量文件扫描（全量扫描 / 增量扫描）。
- 大量压缩包扫描或重处理（zip/rar/7z 转换、重建、重索引）。

### 强制执行规则

1. 先正确性（Correctness），后性能（Performance）
   - 禁止只比较最快方案。
   - 正确性不达标直接淘汰，不进入性能对比。

2. 双规并行数据集（必须两套都跑）
   - 实际负载目录（回放）：固定 `Z:\bench`。
   - 脚本生成目录（全覆盖）：`perf-data/<日期>-scan-dataset/input`。
   - 实际负载目录用于真实性能回放，不替代覆盖门禁。
   - 脚本生成目录必须覆盖：大量小文件、大压缩包与深层目录、中文/日文/特殊符号目录、中文/日文/特殊符号压缩包命名、长路径、损坏压缩包样本。

3. 必须同时执行冷缓存（Cold Cache）与热缓存（Warm Cache）
   - 每组至少 3 次。
   - 使用中位数（median）作为对比指标。

4. 必须记录并对比以下指标
   - 正确性：漏扫 / 误扫 / 重复 / 元数据一致性。
   - 吞吐：files/s、archives/s、总耗时。
   - 资源：CPU、峰值内存、磁盘 I/O。
   - 稳定性：异常率、长跑稳定性、重试成功率。

5. 决策准则
   - 正确性未达标：直接淘汰。
   - 性能优势 <5%：优先选择实现更简单、可维护性更高的方案。

6. 结果落盘（强制）
   - 报告路径：`docs/perf/<日期>-scan-benchmark.md`。
   - 报告必须同时包含“实际负载回放”与“全覆盖门禁”两节结果。
   - 未产生报告或报告未通过，不得将相关模块标记为“完成”。

## 当前模块化基线（接入前提）

- `src/features/layout/thumbnailLayout.ts`：缩略图离散 9 级排布算法（`scalesolution2` 同源）。
- `src/features/app/helpers.ts`：导入/检索/树遍历基础函数。
- `src/features/shortcuts/useShortcutEngine.ts`：快捷键解析与路由。
- `src/features/sidebar/useSidebarNavigation.ts`：Sidebar 键盘导航与选中策略。
- `src/features/import/useImportPipeline.ts`：导入文件/文件夹、拖拽、粘贴输入管线。
- `src/features/media/useMediaState.ts`：视频/全屏/播放列表核心状态。

后续接入真实后端时，必须在以上边界内扩展，不得破坏模块职责。
