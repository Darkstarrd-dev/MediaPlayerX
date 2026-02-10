# 管理模式 LLM 广告图片审核模块实施计划 V1（接线已完成，持续优化）

## 0. 文档定位

- 本文档用于固化“管理模式广告图片审核 (LLM Ad Review)”的实施方案与拆解顺序。
- 当前状态：core + contracts/preload/ipc/repository/UI 接线已完成，进入优化与稳态维护阶段。
- 目标产出：可执行的任务清单 + 合约草案 + 验收标准，作为后续开发基线。

## 当前进度（基于 git）

### 已完成

- Core 模块目录已落地：`electron/manageAdReview/`。
- 已实现：
  - `adReviewEngine.ts`：审核主流程、`all/head-tail` 策略、known-hash 短路、取消控制。
  - `openAiVisionClient.ts`：OpenAI 兼容视觉调用、`/embeddings -> /chat/completions` 归一化、超时与错误处理。
  - `jsonExtract.ts`：JSON 结果鲁棒解析（code fence/夹杂文本/兜底）。
  - `hashStore.ts`：`sha256` 与内存哈希仓库实现。
  - `concurrency.ts`：并发控制与取消断言。
- 已补齐单测：`adReviewEngine/jsonExtract/openAiVisionClient/concurrency`。
- 已完成纵向接线：
  - contracts：审核任务 DTO/schema（start/read/confirm）
  - preload/ipc：新增三条审核通道并统一 Zod 校验
  - repository：mock/real 双实现对齐
  - UI：管理容器新增“广告审核”入口、任务状态、候选复核与危险确认删除
  - Main：新增 `manageAdReviewService`，打通选区映射、LLM 调用、任务轮询、确认删除闭环
- 已落地哈希持久化：确认删除候选写入 `app_state`（known-hash）并参与后续短路命中。

### 待办

- 性能与策略优化：按需暴露 `head-tail` 策略参数与并发参数，补充大批量样本下的压测基准。
- 观测增强：补充审核任务审计字段（来源分布、命中率）与 UI 可视化。
- 文档维护：后续功能迭代持续同步本计划与 `README/architecture/interaction/guardrails`。

## 1. 目标与范围

### 1.1 目标

- 以管理模式当前选中对象（Sidebar 节点或图片勾选）作为输入。
- 通过大语言模型审核 (Large Language Model, LLM) 输出“疑似广告图片”候选列表。
- 由用户人工复核后确认删除，删除动作复用现有管理模式删除链路。

### 1.2 非目标（本期不做）

- 不做自动删除（无人工确认即删除）。
- 不做视频广告审核（仅图片链路）。
- 不新增独立文件操作通道（禁止绕开 `deleteImageItems`）。
- 不引入云端数据库依赖（保持本地优先）。

## 2. 参考项目逻辑提取（`03 ScamBlocker_Done`）

### 2.1 可直接复用的核心思路

- 人工复核闭环：LLM 只给候选，最终删除由用户确认。
- 哈希记忆机制：已确认删除的图片 `sha256` 持久化，下次同图可直接命中。
- 头尾窗口检测：优先检测头部/尾部样本，降低全量 LLM 成本。
- 并发限流：通过信号量限制并发，避免本地模型或接口过载。

### 2.2 需按 MediaPlayerX 改造的点

- 输入不再是“zip 全包扫描”，改为“管理模式选区驱动”。
- 删除不直接写压缩包工具链，统一走现有后端删除 API。
- 结果展示嵌入现有管理容器，不新增独立页面。

## 3. 与现有系统的对接锚点

### 3.1 已有能力（直接复用）

- 选区状态：`useManageSelection`（`sidebarCheckedNodeIds` / `imageCheckedIds`）。
- 管理操作面板：`src/components/ManagementPanel.tsx`。
- 删除写链路：`useWriteDataAccess.deleteImageItems`。
- 读取链路：`Repository -> preload -> ipc -> Main`。
- 设置持久化：`readAppState/writeAppState`（可承载审核参数与哈希缓存）。

### 3.2 需要新增的能力

- 管理审核任务 API（启动、查询进度、读取结果、提交删除）。
- LLM 审核服务（Main/Worker 内执行，Renderer 不直连）。
- 审核结果数据模型（候选项、原因、可选分数、来源信息）。

## 4. 模块设计（建议）

### 4.1 Renderer 层

- 在管理容器新增 `广告审核` 入口按钮（仅图片模式可用）。
- 增加审核任务状态区：`idle/running/review/failed`。
- 增加审核结果列表：缩略图、原因、勾选状态、批量确认删除按钮。
- 复用现有危险确认弹窗，确认后调用既有删除接口。

### 4.2 Repository/Contracts 层

- 新增 DTO（建议命名，可在实现时微调）：
  - `startManageAdReviewRequest/Response`
  - `readManageAdReviewTaskRequest/Response`
  - `confirmManageAdReviewDeleteRequest/Response`
- 新增 channel（建议）：
  - `backend:startManageAdReview`
  - `backend:readManageAdReviewTask`
  - `backend:confirmManageAdReviewDelete`
- 所有新增合约必须走 Zod 校验。

### 4.3 Main/Worker 层

- 输入归一化：
  - 若为 Sidebar 选区，先解出对应图片集合。
  - 若为图片选区，直接用图片 id 集合。
- 候选抽样策略：
  - 默认“全量选中图片”执行；可在后续增加头尾窗口策略开关。
- LLM 调用策略：
  - OpenAI 兼容 `chat/completions` 多模态接口。
  - 并发可配置（默认低并发），失败支持重试与超时。
- 输出：疑似广告列表（不删除），等待用户确认。

### 4.4 持久化与缓存

- 新增“已确认删除图片哈希”存储：
  - 方案 A：SQLite 新表（推荐，便于审计扩展）。
  - 方案 B：`app_state` JSON（实现快，结构演进受限）。
- 最小字段：`sha256`, `source`, `created_at_ms`, `updated_at_ms`。

## 5. 执行流程（目标态）

1. 用户进入管理模式并完成勾选。
2. 点击 `广告审核`，提交审核任务。
3. Main/Worker 拉取候选图片并执行 LLM 审核。
4. Renderer 显示审核进度，完成后进入 `review`。
5. 用户在结果列表勾选/取消。
6. 用户点击确认删除，进入危险确认弹窗。
7. 确认后调用 `deleteImageItems` 删除，并刷新快照。
8. 对确认删除项写入哈希缓存。

## 6. 开发阶段拆解

### 阶段进度

- [x] Phase 0（Core）：核心引擎、客户端、并发/哈希、单测。
- [x] Phase 1（Contracts/IPC Skeleton）：合约与骨架接线。
- [x] Phase 2（Execution Wiring）：Main/Worker 审核任务接入。
- [x] Phase 3（Human Review + Delete）：人工复核与删除闭环。
- [x] Phase 4（Persistence + Optimization）：已完成持久化（known-hash），策略优化持续迭代。

### Phase 1：合约与骨架

- 定义 contracts + preload + IPC handler 空实现。
- Repository mock/real 双实现加齐接口。
- 管理容器加入审核按钮与任务状态占位 UI。

### Phase 2：审核执行链路

- Main/Worker 接入 LLM 审核。
- 支持任务进度查询与失败回传。
- 初版仅输出 `is_ad + reason`。

### Phase 3：人工复核与删除闭环

- 审核结果列表交互（勾选、全选、取消全选）。
- 确认删除复用 `deleteImageItems`。
- 删除后刷新与失败提示对齐现有管理模式。

### Phase 4：哈希缓存与策略优化

- 接入 `sha256` 命中跳过 LLM。
- 可选加入头尾窗口策略与并发参数化。
- 补齐审计字段与设置项持久化。

## 7. 验证与测试计划

- 单元测试：
  - 选区 -> 审核输入映射。
  - LLM 结果解析与异常分支。
  - 哈希命中短路逻辑。
- 集成测试：
  - IPC 审核任务生命周期。
  - 人工确认后删除闭环（含部分失败）。
- 回归命令：
  - `npm run lint`
  - `npm run test`
  - `npm run build`

## 8. 风险与约束

- 误判风险：LLM 可能误检，必须坚持人工确认门禁。
- 性能风险：大批量选区触发高并发调用，需限流 + 可取消。
- 一致性风险：删除后必须立即与 Sidebar/Main 快照同步，避免 UI 残留脏状态。
- 合规风险：若接入第三方云端模型，需额外评估图片数据外发策略（当前建议本地模型优先）。

## 9. 完成定义（DoD）

- 管理模式可完成“选中 -> 审核 -> 人工确认 -> 删除”全流程。
- 审核结果未确认前不会执行任何物理删除。
- 删除动作 100% 通过现有后端写链路执行。
- 哈希缓存命中后可跳过 LLM 并在 UI 侧可见说明。
- 文档同步更新 `README / requirements / architecture / interaction / guardrails`。
