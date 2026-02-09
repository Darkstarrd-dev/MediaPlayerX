# 向量检索与 Tag 混合建库实施计划 V1（未实施方案）

## 1. 目标与范围

- 本文档用于固化当前尚未实施的向量建库与检索增强方案。
- 默认能力保持与现有项目目标一致：本地优先、LanceDB + SQLite、LM Studio 可配置接入。
- 本文聚焦以下问题：
  - 原图与缩略图作为 embedding 输入的取舍与评估
  - 向量库与 SQLite 的职责边界与联动
  - 漫画场景下的“粒度错配”与检索意图分层
  - Tag 与向量的混合检索落地路径
  - 可执行文件发布后的依赖边界与降级策略

## 2. 关键决策（当前拟定）

### 2.1 默认方案（必须实现）

- 向量数据库：`LanceDB`（本地嵌入式，不依赖外部数据库服务）
- 结构化数据库：`SQLite`（继续作为 SSOT）
- Embedding 模型：`qwen3-vl-embedding-8b`
- 接入方式：LM Studio OpenAI 兼容 endpoint（`/v1/embeddings`）
- 首期检索粒度：`global`（一图一向量）

### 2.2 增强方案（可选启用，默认关闭）

- 增强 A（无需额外检测模型）：
  - 固定网格切块（tile）向量
  - 手动 ROI 框选检索
- 增强 B（需要额外视觉模型）：
  - 通过 LM Studio `chat/completions` 调用 Qwen3-VL Instruct 类模型输出结构化 `tags + bbox`
  - 结合 Tag 检索与区域检索
- 增强能力由用户自行下载并配置所需模型后启用，不影响默认能力可用性。

## 3. 漫画场景相似性定义

检索意图拆分为三类，避免“整页 vs 单角色”的粒度错配：

1. `Global Similarity`：画风/构图/整体氛围相似
2. `Entity/Region Similarity`：角色/物体局部相似
3. `Tag Similarity`：离散语义组合匹配（角色特征、场景、动作、情绪、题材）

结论：

- 纯整图向量无法稳定覆盖角色级检索需求。
- 漫画场景中 Tag 对精确过滤更有效，向量对模糊排序更有效。
- 推荐最终形态：`Tag 过滤 + 向量重排` 的混合检索。

## 4. 数据分工：SQLite 与 LanceDB

### 4.1 SQLite（结构化 SSOT）

建议新增（或等价演进）表：

- `ai_tag`：标签词表（`name`, `category`）
- `ai_image_tag`：图片-标签关联（`image_id`, `tag_id`, `confidence`, `model_id`, `updated_at_ms`）
- `ai_region`：区域信息（`image_id`, `region_kind`, `bbox_norm_json`, `confidence`, `attrs_json`）
- `ai_pipeline_state`：索引状态（`image_id`, `global_status`, `tag_status`, `region_status`, `model_version`, `error`, `updated_at_ms`）

### 4.2 LanceDB（向量检索）

建议表：

- `image_embeddings_global`
  - `image_id`
  - `embedding`
  - `model_id`
  - `source_variant`
  - `source_hash`
  - `updated_at_ms`
- `image_embeddings_region`（增强启用后）
  - `image_id`
  - `region_id`
  - `region_kind`
  - `bbox_norm_json`
  - `embedding`
  - `model_id`
  - `updated_at_ms`

## 5. Embedding 输入策略与 A/B 评估

### 5.1 待确认问题

- 使用原图或缩略图进行 embedding，对检索质量差异有多大。

### 5.2 小样本评估方案（先行门禁）

- 数据集规模：建议 `200 ~ 500` 张（覆盖单角色、多角色、复杂分镜、不同分辨率）
- 对比组：
  - A：原图 embedding
  - B：UI 缩略图 embedding
  - C：embedding 专用固定缩略图（推荐）
- 指标：
  - 同图一致性：`cosine(original, downsampled)` 的 `p50/p90/p99`
  - 检索质量：`Recall@K`、`MRR`、`TopK overlap`
  - 成本指标：建库耗时、存储体积、推理吞吐

结论规则建议：

- 若 B/C 与 A 的质量差异在阈值内，优先选 C（固定参数，避免受 UI 缩略图设置影响）。
- 若质量差异不可接受，则默认输入改为原图或提高固定缩略图规格。

## 6. 检索路径

### 6.1 默认路径（Global）

- 查询图 -> embedding -> LanceDB ANN -> 候选 `image_id` -> SQLite 补全元数据 -> UI 展示

### 6.2 Tag-only 路径（增强）

- Tag 条件（AND/OR）-> SQLite 结构化检索 -> 返回候选 + 命中标签

### 6.3 Hybrid 路径（增强推荐）

- Step 1：Tag 过滤候选集（SQLite）
- Step 2：候选集内向量重排（LanceDB）
- Step 3：输出综合结果（向量分 + Tag 命中解释）

## 7. 区域生成并入 App 方案

区域来源 provider 可插拔：

- `manual-roi`：用户框选
- `tile`：固定切块
- `lmstudio-grounding`：LM Studio VLM 输出 bbox

对于 `lmstudio-grounding`：

- 调用：LM Studio OpenAI 兼容 `chat/completions`
- 输出：强制 JSON（bbox + label + confidence）
- 入库前必须执行：
  - Zod schema 校验
  - 坐标归一化（统一为 `0..1`）
  - 越界/异常框过滤与去重

模型边界说明：

- `qwen3-vl-embedding-8b` 用于 embedding。
- bbox/grounding 需由可视觉理解的 Instruct 类模型提供。

## 8. 可执行文件发布后的依赖边界

- LanceDB 与 SQLite 均为本地嵌入式，应用可执行文件不依赖外部数据库服务。
- 默认能力所需外部条件：可访问的 LM Studio endpoint + embedding 模型。
- 增强能力所需外部条件：用户额外下载并配置视觉模型（Tag/bbox）。
- 若增强模型缺失：
  - 默认 global 向量检索继续可用
  - UI 显示“增强能力未启用/依赖缺失”，不阻断主流程

## 9. 实施阶段（未实施）

### Phase 0：接口与验证薄切片

- 定义 SQLite/LanceDB 数据契约与状态机
- 跑通 `qwen3-vl-embedding-8b` endpoint 调用
- 跑通 VLM 输出 `tags + bbox` 的 JSON 校验链路

### Phase 1：默认能力落地（Global）

- 生产管线：建库、增量、重试、状态可见
- 以图搜图链路替换当前 mock feature vector
- 通过 `lint/test/build` 与基础回归

### Phase 2：Tag 混合检索（增强）

- Tag 入库与 SQL 组合检索
- Hybrid 排序（Tag filter + vector rerank）
- UI 增加命中解释（匹配标签、置信度、重排分）

### Phase 3：区域检索（增强+）

- bbox/region 入库
- 单角色图检索多人页面局部命中
- 多角色页分组检索与命中区域高亮

## 10. DoD（计划完成定义）

- 默认能力：global 向量检索可用且可回归
- 增强能力：可开关、可降级、模型缺失时有可见提示
- 文档一致：`requirements/architecture/interaction` 与本计划无冲突
- 工程基线：`npm run lint && npm run test && npm run build` 通过
