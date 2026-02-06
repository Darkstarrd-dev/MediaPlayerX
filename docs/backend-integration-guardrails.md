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

## 提交门禁 (Definition of Done, DoD)

- 代码：通过 `lint` / `test` / `build`。
- 文档：同步更新本文件 + 对应需求/交互文档。
- 回归：关键路径手测通过（模式切换、分页、快捷键、播放控制、拖拽/导入）。

## 当前模块化基线（接入前提）

- `src/features/layout/thumbnailLayout.ts`：缩略图离散 9 级排布算法（`scalesolution2` 同源）。
- `src/features/app/helpers.ts`：导入/检索/树遍历基础函数。
- `src/features/shortcuts/useShortcutEngine.ts`：快捷键解析与路由。
- `src/features/sidebar/useSidebarNavigation.ts`：Sidebar 键盘导航与选中策略。
- `src/features/import/useImportPipeline.ts`：导入文件/文件夹、拖拽、粘贴输入管线。
- `src/features/media/useMediaState.ts`：视频/全屏/播放列表核心状态。

后续接入真实后端时，必须在以上边界内扩展，不得破坏模块职责。
