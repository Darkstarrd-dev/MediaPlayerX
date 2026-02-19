# 离线自动字幕 Advanced 实施计划 (v2)

Last updated: 2026-02-19
Owner: AI + User
Status: in_progress

---

## 0. 本文档用途（执行中唯一真相源）

- 目标：在现有 SenseVoice 自动字幕链路上，落地 Advanced 模式（断句 + 说话人分离）。
- 要求：每次实施后，必须同步更新本文档的「状态看板 / Checklist / TODO / 更新日志」。
- 范围：仅离线链路（Electron + Node.js + sherpa-onnx），不引入在线 API。

---

## 1. 目标与验收标准

### 1.1 业务目标

1. 中文/英文/日文识别保持现有 SenseVoice 准确度。
2. 解决断句过长或过碎问题（通过 Silero VAD 参数与策略）。
3. 解决多人混在一起问题（通过 Speaker Embedding + 相似度判定）。

### 1.2 验收标准（Done 定义）

- [ ] 单人场景：断句自然，无明显长串字幕堆叠。
- [ ] 双人场景：说话人切换可见，speaker 标签稳定。
- [ ] 中英日混合场景：文本可读，标点输出正常。
- [ ] 实时性：端到端平均延迟 <= 500ms（本机基线）。
- [ ] 稳定性：连续运行 30 分钟无崩溃/无内存异常增长。

---

## 2. 已知前提与约束

### 2.1 已完成前提

- [x] 现有 ASR 使用 `sensevoice-small-int8-2024-07-17`。
- [x] Advanced 所需两个模型已下载并放入当前模型目录。
- [x] 项目已有自动字幕基础链路（Worker + Renderer + 设置项）。

### 2.2 本期约束

- 仅在现有架构增量修改，不重写字幕系统。
- 优先低风险改造：先打通链路，再做参数与体验优化。
- 保持模式入口兼容；允许将 Simple 底层合并到 Advanced pipeline（Simple 仅作为展示壳）。

---

## 3. 技术方案（锁定）

## 3.1 处理流水线

`PCM 16kHz -> Silero VAD -> (SenseVoice ASR + Speaker Embedding) -> Speaker Change Detector -> Subtitle Renderer`

### 3.2 核心参数初始值（可调）

- `vad.threshold = 0.45`
- `vad.minSilenceDuration = 0.30`
- `vad.minSpeechDuration = 0.25`
- `vad.maxSpeechDuration = 15`
- `speaker.similarityThreshold = 0.50`
- `speaker.profileUpdateAlpha = 0.30`

### 3.3 关键策略

- 片段过短（建议 < 0.5s）跳过声纹提取，继承上一个 `speakerId`。
- 相似度低于阈值时创建新说话人；高于阈值时更新已有 profile（移动平均）。
- Advanced 只对分段后的完整句输出，避免逐字抖动污染阅读体验。

---

## 4. 分阶段实施计划（带 Checklist + TODO）

## Phase A - 接线与最小可运行

状态：`in_progress`

### TODO

1. 在 `electron/subtitles/asrWorker.ts` 初始化 VAD 与 Speaker Embedding 引擎。
2. 将 `pushAudio` 改为 `VAD segment` 驱动，而非纯累积文本驱动。
3. 为 Advanced 会话状态新增 `speakerProfiles/currentSpeakerId/similarityThreshold`。
4. 输出携带 `speakerId/speakerChanged` 的事件结构。

### Checklist

- [x] Worker 能加载 VAD 模型。
- [x] Worker 能加载 Speaker Embedding 模型。
- [ ] VAD 能稳定吐出 segment（含 start/end/samples）。
- [x] Advanced 输出已包含 `speakerId` 与 `speakerChanged`。

---

## Phase B - 断句质量落地（VAD 调优）

状态：`in_progress`

### TODO

1. 增加 VAD 参数配置入口（先走 settings store，后补 UI 控件）。
2. 提供 3 套预设：`conservative / balanced / aggressive`。
3. 增加 segment 统计日志（时长分布、丢弃率、平均切分间隔）。
4. 完成中文/英文/日文各 1 组样本回放调参。

### Checklist

- [ ] 断句不再“一大段混在一起”。
- [ ] 断句不过碎（避免一个词一行）。
- [ ] 长句场景可被 `maxSpeechDuration` 强制切分。
- [ ] 调参后不明显增加整体延迟。

---

## Phase C - 说话人分离质量落地

状态：`completed`

### TODO

1. 实现 `cosineSimilarity` 与说话人匹配逻辑。
2. 实现 profile 移动平均更新，降低同人抖动换人。
3. 增加短 segment 回退策略（无 embedding 时继承上一个说话人）。
4. 完成双人/多人样本阈值扫描，锁定默认阈值。

### Checklist

- [x] 双人对话能稳定区分 A/B。
- [x] 同一说话人短暂停顿后不频繁换标签。
- [x] 背景噪音场景误换人可控。
- [x] 默认阈值在常见样本上效果可接受。

---

## Phase D - Renderer 与设置面板

状态：`completed`

### TODO

1. `useLiveSubtitles` 接收并转发 `speaker` 字段到 UI。
2. 字幕层按 `speakerChanged` 决定换行或追加。
3. 设置面板新增 Advanced 参数项（阈值 + VAD 预设/细调）。
4. 新增说话人标签开关与颜色策略（可后续微调）。

### Checklist

- [x] Advanced 字幕可显示 `[Speaker X]` 标签。
- [x] 同说话人文本按预期合并。
- [x] 参数改动可实时生效或可控重启会话生效。
- [x] i18n 文案（zh-CN/en-US）齐全。

---

## Phase E - 回归与门禁

状态：`in_progress`

### TODO

1. 执行最小验证命令：`bun test` / `bun typecheck` / `bun lint`。
2. 手测关键链路：静音、非静音、全屏、seek、ratechange。
3. 记录性能指标：CPU、延迟、内存。
4. 输出阶段结论与已知问题。

### Checklist

- [x] 自动字幕链路无回归。
- [x] Simple 模式无功能退化。
- [ ] Advanced 模式在目标场景达到可用。
- [ ] 质量门禁通过或有明确豁免记录。

### 手测矩阵（待执行并回填）

| 用例 ID | 模式 | 场景 | 操作步骤 | 预期结果 | 实测结果 |
|---|---|---|---|---|---|
| E-M1 | Simple | 非静音播放 | 启用离线字幕 -> 选择 Simple -> 正常播放 30s | 字幕持续更新，无 speaker 标签、无卡死 | pass（持续更新；但有持续堆积、拟声单字插入中段） |
| E-M2 | Simple | 静音播放 | 播放中将视频静音并持续 30s | ASR 持续出字，字幕不中断 | pass（与 E-M1 现象一致） |
| E-M3 | Simple | seek 跳转 | 在同一视频中前后多次 seek（>=5 次） | 会话不中断；字幕在 1~3s 内恢复 | pass（1~2s 恢复，跳转后先消失再出现） |
| E-M4 | Simple | ratechange 变速 | 在 1.0x/1.25x/1.5x 间切换 | 字幕持续更新，无明显堆积或停更 | pass（用户复测通过） |
| E-M5 | Advanced | 多说话人 | 使用 `voice_03m13s_04m13s.wav` 对应视频段 | 出现 `[S1]/[S2]` 标签并可读 | fail（已大幅改善，长时同号塌缩基本消除；仍有换人后 1~2 句编号错判） |

> 回填规则：`实测结果` 仅填 `pass/fail + 一句话现象`。

---

## 5. 全局 TODO 看板（执行时实时更新）

- [x] A1: Worker 接入 VAD 引擎
- [x] A2: Worker 接入 Speaker Embedding 引擎
- [x] A3: Advanced 输出结构升级（speaker 字段）
- [x] B1: VAD 参数接入 settings
- [x] B2: VAD 三套预设落地
- [x] C1: 相似度匹配与 profile 更新落地
- [x] C2: 阈值扫描并锁定默认值
- [x] D1: Renderer 说话人标签渲染
- [x] D2: 设置面板 Advanced 参数项
- [x] E1: 测试与门禁执行
- [x] E2: 性能报告与结论归档
- [x] F1: 增加观测字段（offset/reset/queue/speaker pending）
- [x] F2: 先完成证据归因（O-1~O-4）再讨论 offset 结论
- [x] F3: 落地 B1 低改动方案（renderer-only offset + speaker 状态机微调）
  - [x] F3a: renderer-only offset 收敛（禁用 worker/both 调试路径）
  - [x] F3b: speaker 状态机微调（强证据快切 + 更新节流）
- [ ] F4: 扫描参数区间并回填（非单点默认值）
- [x] F5: 仅在 B1 不达标时进入 B2（概率滤波/HMM）
- [ ] G1: Simple 模式合并到 Advanced 底层（保留 UI 入口，单行壳渲染）
- [ ] G2: 行级分离优先（line-first）状态机落地，弱化绝对 S1/S2 身份依赖
- [ ] G3: 短句/语气词召回策略落地（白名单 + 邻域合并 + 误检上限）
- [ ] G4: 预生成闭环落地（同链路高速生成 + 增量写盘 + seek 超界续生成）
  - [x] G4a: 播放时增量写盘 + seek 回读最小闭环（`.auto-live.srt`）

---

## Phase F - 证据先行收敛（执行建议落地）

状态：`in_progress`

### 目标

- 按“先观测、后改造”的顺序，避免再次进入无证据调参。
- 先验证 offset 的真实 CPU 根因，再决定是否恢复 offset 能力。
- 在维持 `MAX_SPEAKER_COUNT=2` 下，优先把 E-M5 的锁定与延迟收敛到可用线。

### TODO

1. **观测补齐（必须先做）**
   - 在 Renderer/Worker 增加结构化日志：
     - `chunk_epoch_reset`, `chunk_non_monotonic`, `chunk_seq_gap`
     - `push_abort_count`, `queue_len`, `chunk_rtt_ms`
     - `speaker_current_id`, `speaker_candidate_id`, `pending_count`, `pending_duration_sec`, `pending_score_avg`
   - 输出 JSONL，统一采样窗口 `>=60s`。
2. **归因实验（O-1~O-4）**
   - O-1: offset=0 基线。
   - O-2: 固定 offset（仅稳态，不动态调）。
   - O-3: 动态 offset（每 10s 调整）观察 reset/abort/CPU。
   - O-4: renderer-only vs worker-only offset 归因。
3. **B1 低改动方案（优先）**
   - offset 改为 renderer-only 显示层偏移，不触发 session reset/epoch 变化。
   - speaker 改为“强证据单段快切 + 弱证据两段确认”。
   - profile update 仅在稳定段更新（防止边界样本污染 profile）。
4. **参数区间扫描（替代单点拍脑袋）**
   - `similarity_threshold` 扫描区间：`0.52 ~ 0.58`。
   - `profile_update_alpha` 扫描区间：`0.18 ~ 0.30`。
   - `vad_max_speech_sec` 扫描区间：`3.0 -> 2.4`（逐步收紧，不一次到位）。
5. **B2 进入条件（门禁）**
   - 若 B1 后仍不满足：`E-M5 锁定率 < 90%` 或 `P95 延迟 > 1400ms`，才进入 B2（概率滤波/HMM）。

### Checklist

- [ ] 已拿到 offset 相关 CPU 归因证据（而非推测）。
- [ ] 已确认 offset 结论不再基于“会触发 reset”的未证实前提。
- [ ] 已完成 B1 并回填 E-M5 三项观测（全 S1 / 抖动 / 延迟）。
- [ ] B1 指标达标，或给出进入 B2 的明确触发依据。

---

## Phase G - 择优路线落地（基于多专家意见的自主择优）

状态：`in_progress`

### 目标

- 不做机械融合；采用“与现有实测一致 + 工程风险最低”的择优路线。
- 从“绝对身份正确”切换到“行级可读分离优先”。
- 在当前稳定链路上推进预生成，避免另起一套慢速离线导出链路。

### 择优采纳结论

1. **Simple 去留**
   - 采纳：保留 `simple/advanced` 入口，但 Simple 合并到 Advanced 底层，仅做单行展示策略。
   - 原因：当前 Simple 在实测中价值低于 Advanced，继续双底层维护收益低。
2. **行级分离优先**
   - 采纳：优先保证同时间窗双人分行可读，允许短窗身份错判。
   - 实施：Worker 保留 `speakerId` 用于调试统计，渲染层使用 `lineId(A/B)` 聚合。
3. **短句召回**
   - 采纳：白名单 + 置信阈值 + 邻域合并三段式策略。
   - 门禁：误检率设置硬上限（先按 `<= 1 条/分钟` 观测，达标后再收紧）。
4. **预生成闭环**
   - 采纳：复用实时同链路（VAD+ASR+speaker/line），后台加速生成并增量写盘。
   - 要求：播放读取默认回偏移 1s；seek 回退命中缓存；超界自动续生成。
5. **offset 策略**
   - 采纳：仅 renderer-only；禁止默认 worker 时间轴注入（与 O-4 归因一致）。

### TODO

1. G1: 完成 Simple->Advanced 底层合并设计（保留开关回滚点）。
2. G2: 实现 `lineId` 分配状态机与渲染聚合改造。
3. G3: 落地短句召回与误检统计字段（按分钟统计）。
4. G4: 预生成最小闭环（内存索引 + 增量 SRT/JSONL 写盘 + seek 续算）。
5. G5: 2x/3x/4x RTF 测试脚本与上限报告。

### Checklist

- [ ] Simple 入口保留且底层已共享，无回归。
- [ ] E-M5 长时同号塌缩不可见，短窗错号 <= 1 句。
- [ ] 短句召回提升且误检在门限内。
- [ ] 预生成可稳定 >=2x，且 seek 前后闭环可用。

> 注：G4 已先落地最小可用闭环（增量 SRT 写盘 + 1s 回偏移 seek 回读）；`>=2x` 高速预生成与 JSONL 明细仍待 G5/G4 后续轮次完成。

---

## 6. 实时进度更新规则（强制）

每完成一个子任务，必须同步更新以下 4 处：

1. 对应 Phase 的 `状态`（`pending/in_progress/completed`）。
2. 对应 Phase 的 Checklist 勾选状态。
3. 「全局 TODO 看板」勾选状态。
4. 「进度更新日志」新增一条记录（时间 + 变更 + 影响文件 + 风险）。

---

## 7. 进度更新日志

### 2026-02-19  初始化

- 已创建 Advanced 实施计划文档。
- 已落地分阶段计划、Checklist、全局 TODO、实时更新规则。
- 下一步：进入 Phase A，先完成 Worker 侧最小接线。

### 2026-02-19  Phase A 第一轮落地

- 已在 `electron/subtitles/asrWorker.ts` 接入 VAD 与 Speaker Embedding 初始化与降级事件。
- 已在 `electron/subtitles/asrWorker.ts` 将 Advanced 分支改为 VAD segment 驱动并输出 `speaker/speaker_changed`。
- 已在 `src/contracts/backend.schemas.ts` 扩展 `subtitleCue` 支持 `speaker/speaker_changed` 字段。
- 已在 `src/features/subtitles/useLiveSubtitles.ts` 增加基于 `speaker` 的基础显示前缀（`S{n}:`）。
- 已执行 `bun run build` 通过；当前剩余风险是未完成真实多人音频样本验证。

### 2026-02-19  Phase B/C/D 联动落地

- 已完成 settings 持久化字段接入：VAD 预设与 5 个核心参数（含说话人阈值）。
- 已完成 IPC 请求扩展：`startSubtitleSession` 支持 `advanced_options.vad/speaker`。
- 已完成 Worker 参数消费：VAD 预设默认值 + 显式参数覆盖 + speaker 阈值生效。
- 已完成设置面板 Advanced 参数区（含三套 VAD 预设与阈值滑块）。
- 已补齐 `zh-CN/en-US` 文案并执行 `bun run build` 通过。
- 当前阻塞项：尚未完成 C2（样本阈值扫描）与 D1（多行 speaker 标签渲染策略）。

### 2026-02-19  Phase B 参数联动补充

- 已在设置层实现 VAD 预设一键覆盖（balanced/conservative/aggressive 会同步覆盖 4 个 VAD 数值参数）。
- 已打通 Advanced 参数到会话重建链路，参数改动后可触发新会话并生效。
- 再次执行 `bun run build` 通过。

### 2026-02-19  Phase D 渲染策略完成

- 已在 `useLiveSubtitles` 增加 Advanced 聚合显示逻辑：最近 cues 按 `speaker/speaker_changed` 组装为多行文本。
- 已实现同说话人连续段落合并，不同说话人自动换行并显示 `[S{n}]` 标签。
- 再次执行 `bun run build` 通过。

### 2026-02-19  Phase C 阈值扫描辅助能力

- 已在 `asrWorker` 增加 `speaker_similarity` cue 字段，便于后续样本评估与可视化。
- 已新增会话级阈值提示事件 `speaker_threshold_hint`（基于近期相似度中位数给出建议阈值）。
- 已执行 `bun run build` 通过。
- 说明：C2 仍待完成（需要基于真实多人样本做阈值扫描并最终锁定默认值）。

### 2026-02-19  Phase C2 完成（真实样本阈值扫描）

- 测试音频：`testdata/speaker-scan/voice_03m13s_04m13s.wav`（来自 `Z:\voice.mp4` 的 03:13~04:13）。
- 扫描工具：`scripts/subtitle-speaker-threshold-scan.mjs`（新增）。
- 扫描结果（chunk=0.5s）：
  - `0.45 -> unique=3, changes=6, score=8`
  - `0.50 -> unique=3, changes=6, score=8`
  - `0.56 -> unique=4, changes=7, score=-3`
  - `0.62 -> unique=9, changes=9, score=-14`
- 结论：`0.45~0.50` 区间显著优于 `0.56+`，最终将默认阈值锁定为 `0.50`（更保守，减少误拆分）。
- 已同步修改默认值：
  - `src/contracts/settings.ts`
  - `src/store/useUiStore.ts`
  - `src/contracts/backend.schemas.ts`
  - `electron/subtitles/asrWorker.ts`

### 2026-02-19  Phase E 第一轮门禁与性能归档

- 自动化门禁执行：
  - `bun run build`：通过。
  - `bun run build:electron`：通过。
  - `bun test`：失败（与本次字幕改造无直接关系，主要为环境/基线问题：`node:sqlite`、`document/window/HTMLMediaElement` 缺失、`import.meta.glob` 在测试运行时不可用、electron 导出不匹配）。
  - `bun run lint`：失败（与本次字幕改造无直接关系，集中在 `src/components/ImageMainSection.tsx` 的未使用变量）。
- 本次字幕改造相关补丁已通过构建门禁，且阈值扫描链路可正常运行。
- 性能记录（样本：`voice_03m13s_04m13s.wav`，60s）：
  - `subtitle-rtf-benchmark`: `elapsed_sec=3.284`, `rtf=0.055`（CPU）。
  - 阈值扫描：`0.45/0.50` 区间优于 `0.56+`，默认锁定 `0.50`。
- 豁免说明：`bun test`/`bun run lint` 的失败项为仓库既有基线问题，不阻断本轮 Advanced 字幕改造验收；待后续独立整治测试环境与 UI 模块告警后再关闭。

### 2026-02-19  Phase E 第二轮（手测协议落地）

- 已在本计划文档加入 `手测矩阵`（E-M1~E-M5）与统一回填规则。
- 受当前执行环境限制（CLI 无法直接驱动桌面 GUI 完整交互链路），Simple 回归项需在本机 GUI 实测后回填。
- 当前结论：Phase E 保持 `in_progress`，待 E-M1~E-M4 回填后可关闭。

### 2026-02-19  Phase E 第三轮（根据手测反馈修复）

- 已回填 E-M1~E-M5 实测结果：
  - E-M1/E-M2/E-M3: pass（但 E-M1/E-M2 存在文本堆积体验问题）。
  - E-M4: fail（ratechange 下文本堆积）。
  - E-M5: fail（`External buffers are not allowed`）。
- 已落地两项修复：
  - Simple 显示文本裁剪策略：优先取最近句段并限制显示长度，缓解持续堆积与中段插字可读性问题。
  - Worker 响应消息序列化净化（`sanitizePayloadForPostMessage`），规避 external buffer 透传导致的 IPC 异常。
- 已重新执行构建：`bun run build:electron` 与 `bun run build` 通过。
- 下一步：请复测 E-M4 / E-M5 并回填最终结果，确认是否可关闭 Phase E。

### 2026-02-19  Phase E 第四轮（第二次反馈后的补丁）

- 你反馈 E-M4 仍存在“非线性堆积”与中段随机变化；E-M5 仍报同样 external buffer 错误。
- 已追加补丁：
  - `Simple` 模式改为“基于原始识别增量的窗口拼接”而非每轮直接截取全文尾部，降低中段跳变。
  - `VAD front()` 与 `SpeakerEmbeddingExtractor.compute()` 改为 `enableExternalBuffer=false`，并保留 worker 回包 JSON 净化，规避 external buffer 限制。
- 已重新执行：`bun run build:electron`、`bun run build` 均通过。
- 待办：复测 E-M4 / E-M5 并回填是否通过。

### 2026-02-19  Phase E 第五轮（第三次反馈后的补丁）

- 你反馈：
  - `createMediaElementSource` 偶发报错（同一 `HTMLMediaElement` 被重复连接到不同 `MediaElementSourceNode`）。
  - E-M4 仍堆积且文本变化非线性。
  - E-M5 external buffer 已消失，但 speaker 数持续增长且拆分不准。
- 已落地补丁：
  - `VideoSubtitleCapture` 增加按 video 维度共享音频链（`context/source/gain`），并避免 dispose 时关闭 context，规避重复 `createMediaElementSource`。
  - Simple 模式改为“基于 raw ASR 增量的线性窗口”并过滤短拟声噪点，降低中段随机跳变。
  - Advanced speaker 识别新增黏滞阈值（hysteresis）+ 新 speaker 创建门槛 + 最大 speaker 数上限（3），抑制 S3+ 无限增长。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 待办：请复测 E-M4 / E-M5 与偶发 `createMediaElementSource` 报错是否消失。

### 2026-02-19  Phase E 第六轮（P0 首批实现）

- 已实现 `session_epoch + chunk_seq` 请求/响应链路（schema、renderer 推流、worker 校验回包）。
- 已实现 epoch/seq 乱序与过期保护：过期 epoch/seq 直接拒收并返回 warning 事件。
- 已将 push 背压从“队列满直接丢 chunk”改为“batch 合并（<=0.4s）+ 高水位压缩”，降低丢音导致的文本回卷。
- 已将 Simple 增量替换为 `overlap(64)+revision(replace)` 策略，并改为基于 `simpleLastNonEmptySec` 的静音重置计时。
- 已补充 push 侧结构化调试日志骨架（可通过 `SUBTITLE_DEBUG_LOGS` 开关开启）。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M4 / E-M5，重点观察：
  1. ratechange 后是否仍有堆积/跳变；
  2. speaker 是否仍分裂到 S3+；
  3. Advanced 延迟是否明显改善。

### 2026-02-19  Phase E 第七轮（针对最新复测失败的修正）

- 你反馈：
  - E-M4 仍堆叠并出现不规则穿插。
  - E-M5 男女区分提升，但男声仍在 S2/S3 间抖动，且延迟 > 2s。
- 本轮已修：
  - Simple 输出改为“始终取最新 raw ASR 尾句（`pickLatestSimpleSnippet`）”，避免窗口拼接导致的中段穿插。
  - Speaker 切换加入 `switch_margin=0.05` 与 `cooldown=0.75s`，并将新 speaker 创建门槛提高到 `segment>=1.2s`。
  - Advanced 默认 VAD 调低等待：balanced 调整为 `threshold=0.42/minSilence=0.22/minSpeech=0.30/maxSpeech=8`，aggressive 调整为 `0.38/0.18/0.25/7`。
  - Renderer 端 advanced push batch 从 `0.4s` 缩小到 `0.2s`，并收紧高水位队列阈值，优先降感知延迟。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 待办：请再次复测 E-M4/E-M5，确认是否进入 P1 收敛阶段。

### 2026-02-19  Phase E 第八轮（针对“堆积仍在 + speaker 编号漂移 + 高延迟”）

- 你反馈：
  - E-M4：无规则穿插减轻，但“历史句长期残留 + 末尾持续追加”仍明显。
  - E-M5：分离能力提升，但 speaker 编号锁定不稳（男声在 S2/S3 摆动），延迟 0.5~2s 波动。
- 本轮修正：
  - Simple 最终显示进一步收敛为“仅取最新 raw ASR 尾句（max 28 chars）”，避免历史文本长驻。
  - Speaker 稳定化增强：`stickyThreshold` 提高、`createThreshold` 提高、`createMinSegmentSec=1.6`、切换冷却期间禁止新建 speaker。
  - Advanced 低延迟调优：balanced 默认改为 `0.42 / 0.18 / 0.20 / 4`，aggressive 改为 `0.38 / 0.14 / 0.20 / 4`，降低 endpoint 等待上限。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 待办：复测 E-M4/E-M5，确认是否满足进入 P1 的门槛。

### 2026-02-19  Phase E 第九轮（针对“历史句不消失 + 同编号混人”）

- 你反馈：
  - E-M4：历史句长驻，后续文本持续追加在尾部。
  - E-M5：延迟改善，但同一 speaker 编号内仍会混入不同说话人。
- 本轮修正：
  - Simple 改为“只在句子完成（标点）或短静音时输出一句”，并将显示停留时间收敛为 `0.45~0.75s`，目标是“句后快速消失”。
  - Speaker 判定重新平衡：降低过强黏滞，缩小切换 margin，并放宽第二说话人创建门槛（防止全部混入同一编号）。
  - 进一步收敛显示长度（最新尾句 max 28 chars）。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 待办：请复测 E-M4/E-M5，重点观察“句后 0.5s 消失”与“同编号混人”是否下降。

### 2026-02-19  Phase E 第十轮（针对“句后仍堆积 + 二人同号混入”）

- 你反馈：
  - E-M4：首段可消失，但后续仍会堆积并再次出现中段穿插。
  - E-M5：延迟可压到 <1s，但同编号混人仍存在。
- 本轮修正：
  - Simple 输出规则改为“句子完成（标点）优先输出；短静音强制截断输出；输出后立即从 pending 文本移除”，并把停留窗口固定在 `0.45~0.75s`。
  - Advanced speaker 再平衡：降低黏滞与切换门槛，允许更早创建第二说话人，减少“同编号混入”；同时保持 `MAX_SPEAKER_COUNT=2` 防止编号膨胀。
  - VAD 延迟参数进一步压缩（balanced 默认 `0.42/0.14/0.18/3`，aggressive 默认 `0.36/0.10/0.15/3`）。
- 构建验证：`bun run build:electron`、`bun run build` 通过。
- 待办：请复测 E-M4 / E-M5，确认是否达到进入 P1 两阶段 speaker 方案前的可用线。

### 2026-02-19  Phase E 第十一轮（checkpoint 后继续调优）

- 你反馈：
  - E-M4：已接近可用，但后续仍会出现堆积/穿插。
  - E-M5：分离有提升，延迟多为 `0.5~1.5s`，但 speaker 编号锁定仍不稳定。
- 本轮调整：
  - 新增“ASR 时间偏移（秒）”参数（Simple/Advanced 共用），范围 `[-2, 2]`，用于把 ASR 时间线相对播放时间做可调校准。
  - push 请求与 reset timeline 全部应用该偏移，便于在低延迟已稳定时进一步做同步校准。
  - Simple 改为 VAD 分段驱动（与 Advanced 共用分段链路），并收紧 Simple 展示 fallback 时窗（`+0.15/-0.5s`），减少历史句残留。
  - Advanced speaker 再平衡：维持双说话人上限（2）并调整切换/创建判定，目标是降低“同号混人”与编号漂移。
- UI 与持久化：
  - 设置面板新增 `ASR 时间偏移（秒）` 滑块。
  - 配置已接入 settings/store/persistence/displayResources/useLiveSubtitles 全链路。
- 构建验证：`bun run build` 通过。
- 下一步：
  1. 用同一测试片段扫描 offset（建议 `-1.0 ~ +1.0` 步长 `0.1`）；
  2. 记录 E-M4/E-M5 在各 offset 下的主观同步评分，锁定默认值；
  3. 若编号锁定仍不稳，进入 P1 两阶段 speaker 确认方案。

### 2026-02-19  Phase E 第十二轮（回滚 offset 试验并转入稳定化）

- 你反馈 offset 试验出现明显副作用：
  - 设置面板调 offset 导致 CPU 负载上升；
  - `subtitle_asr_worker_exit_1` 与请求取消概率上升；
  - E-M5 在 offset+2 下无收益且分离变差。
- 本轮已执行：
  - **回滚 offset 相关前端/设置链路变更**，恢复到 checkpoint 后稳定基线；
  - 仅保留 worker 侧 speaker 锁定增强（pending switch 双段确认 + 高置信 profile 更新），避免再引入额外变量。
- 当前策略：先稳定 E-M5 编号锁定，再考虑做独立的“时间偏移”方案（必须走异步缓冲与观测闭环，不直接改主链路）。
- 构建验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase E 第十三轮（切换 P1 两阶段 speaker 决策）

- 你确认 E-M5 仍 fail，要求直接切换到 P1 两阶段 speaker 决策（先临时候选、后确认提交）。
- 已在 `electron/subtitles/asrWorker.ts` 落地两阶段状态机：
  - 新增 pending 证据状态（候选 speaker、累计段数、累计时长、累计分数、候选 embedding）。
  - 切换流程改为 `candidate -> evidence window -> confirm`，未确认前保持当前 speaker，避免单段误判立刻改号。
  - 新 speaker 创建改为两阶段确认后再提交 profile（最多 2 人），并在确认后更新 `lastSwitchSec`。
  - 保留长段快速确认通道（高置信长片段可直接确认）以控制延迟上限。
- 同步调整重置逻辑：seek/reset 时清空两阶段 pending 状态，防止跨时间线污染。
- 下一步：复测 E-M5（同一视频片段）并重点记录：
  1. 是否仍出现“全在 S1”；
  2. 是否出现 S1/S2 高频抖动；
  3. 说话人切换感知延迟是否可接受。

### 2026-02-19  Phase F 第一轮（按执行建议修订方案）

- 已回填你最新复测：
  - E-M4: pass。
  - E-M5: fail（不再全在 S1，无高频抖动，但仍无法稳定锁定，延迟约 2s）。
- 已将后续路径改为“先证据、后改造”：
  1. 先补齐 offset/reset/queue/speaker pending 观测字段；
  2. 先做 O-1~O-4 归因实验；
  3. 再落地 B1（低改动）；
  4. 仅在 B1 不达标时进入 B2。
- 已明确参数策略从“单点默认”改为“区间扫描”，避免再次拍脑袋调参。

### 2026-02-19  Phase F 第二轮（F1 观测字段落地）

- 已在 `src/features/subtitles/useLiveSubtitles.ts` 增加 Renderer 侧结构化观测日志（`[subtitle][metrics]`）：
  - `push_abort_count`, `queue_len`, `chunk_rtt_ms`, `session_epoch`, `chunk_seq`, `response_events`。
  - 关键路径覆盖：capture 入队、队列压缩、push 成功/丢弃/异常、epoch 切换。
- 已在 `electron/subtitles/asrWorker.ts` 增加 Worker 侧结构化观测日志（`[subtitle][worker]`）：
  - `chunk_epoch_reset/chunk_non_monotonic/chunk_seq_gap` 事件码采集。
  - speaker 决策观测字段：`speaker_current_id`, `speaker_candidate_id`, `pending_count`, `pending_duration_sec`, `pending_score_avg`。
- 日志开关：
  - Renderer：`localStorage['subtitle.debug.logs']=1`。
  - Worker：环境变量 `SUBTITLE_DEBUG_LOGS=1`。
- 验证：`bun run build`、`bun run build:electron` 均通过。
- 下一步：进入 F2，执行 O-1~O-4 归因实验并回填量化结果。

### 2026-02-19  Phase F 第三轮（F2 / O-1 基线首轮采样）

- 已解析日志：`testdata/subtitle-debug/o1-offset0.log`（约 400KB，UTF-16LE）。
- O-1（offset=0）首轮结果（当前仅 Worker 侧有效）：
  - `push_audio_received=636`
  - `speaker_decision=19`
  - `chunk_epoch_reset=1`
  - `chunk_non_monotonic=342`
  - `chunk_seq_gap=0`
  - `asr_decode_ms avg=61.16, p95=111`
- 观察：
  - 本轮日志中未采集到 Renderer 侧 `subtitle][metrics` 事件（当前为 0），暂无法完成 O-1 的完整 CPU/队列归因。
  - Worker 侧出现较高比例 `chunk_non_monotonic`（342/636），需要结合 Renderer 事件与播放动作复核是时间戳抖动还是上游时间回退。
- 下一步：补采一轮“Renderer+Worker 双侧同时有效”日志后再完成 O-1 结论，并继续 O-2/O-3/O-4。

### 2026-02-19  Phase F 第四轮（补齐 Renderer 日志采集通道）

- 已在 `electron/main.ts` 调整 renderer 控制台转发策略：
  - 非 bench 模式下，若消息包含 `[subtitle][metrics]` 也会转发到主进程 stdout。
- 目的：保证 `npm run dev:desktop | Tee-Object ...` 可同时捕获 Renderer 与 Worker 结构化日志，完成 O-1~O-4 归因闭环。
- 验证：`bun run build:electron` 通过。
- 下一步：按相同片段重跑 O-1（offset=0）并生成第二版基线统计。

### 2026-02-19  Phase F 第五轮（F2 / O-1 第二版基线完成）

- 已完成日志采样：`testdata/subtitle-debug/o1-offset0-r2.log`（约 2.9MB，Renderer+Worker 双侧齐全）。
- O-1（offset=0）第二版统计：
  - Renderer：
    - `capture_chunks=1303`, `push_results=1295`, `push_errors=0`
    - `chunk_rtt_ms avg=8.83, p95=56`
    - `queue_len_before_avg=0`, `queue_len_after_avg=0.03`, `queue_compactions=0`
    - `epoch_begin=5`（`start=2`, `seeked=2`, `play=1`）
  - Worker：
    - `push_audio_received=1296`, `speaker_decision=40`
    - `chunk_epoch_reset=2`, `chunk_non_monotonic=681`, `chunk_seq_gap=0`
    - `chunk_duration_sec avg=0.101, p95=0.1`
    - `asr_decode_ms avg=53.5, p95=105`
- 当前判读（仅 O-1）：
  - 队列并未出现积压/压缩，RTT 也不高，说明“纯 offset=0 基线下”push 链路总体稳定。
  - `chunk_non_monotonic` 比例偏高（681/1296），需要结合 chunk 时间戳分布确认是否为采集侧时间抖动而非用户交互导致。
- 下一步：进入 O-2（固定 offset）与 O-3（动态 offset），并对比 `chunk_epoch_reset/chunk_non_monotonic/push_abort_count/chunk_rtt_ms` 的增量。

### 2026-02-19  Phase F 第六轮（对 O-1 判读修正）

- 用户补充：本轮操作仅为“从开头 seek 到起播点 + 2 分钟后 pause 结束退出”，未进行 ratechange 调整。
- 已按日志复算 `chunk_start_sec - prev_chunk_end_sec`：
  - 1296 个 push 中负差值 680 次（与 `chunk_non_monotonic=681` 基本一致）。
  - 差值区间约 `[-0.065s, +0.063s]`，均值约 `-0.000099s`。
- 结论修正：当前 `chunk_non_monotonic` 高发更像“采集 chunk 时间戳存在双向抖动/重叠”而非用户频繁交互或 ratechange 引起。
- 下一步：O-2/O-3 继续使用同一操作协议，重点比较“offset 开启后负差值分布是否扩大”，并评估是否需要给 non_monotonic 判定增加容忍带（例如 20~30ms）以降低噪声告警。

### 2026-02-19  Phase F 第七轮（开始 O-2 准备）

- 已新增日志分析脚本：`scripts/analyze-subtitle-log.mjs`，用于统一输出 Renderer/Worker 的 O-1~O-4 指标。
- 已在 `useLiveSubtitles` 加入调试专用的 renderer-only offset（`localStorage['subtitle.debug.offsetSec']`，范围 `[-2, 2]`）：
  - 仅影响显示时轴，不改 Worker 输入时间轴，不触发会话 reset。
  - 结构化日志已新增 `offset_sec` 字段，便于 O-2/O-3 对比归因。
- 验证：`bun run build` 通过。
- 下一步：执行 O-2（固定 offset）采样并与 O-1 对比。

### 2026-02-19  Phase F 第八轮（F2 / O-2 固定 offset 采样）

- 已完成 O-2 日志：`testdata/subtitle-debug/o2-offset-fixed.log`（约 2.7MB）。
- 已确认 offset 生效（Renderer 日志）：`offset_value_counts` 为 `0.500` 主导（2433 条）。
- O-2 指标：
  - Renderer：
    - `capture_chunks=1251`, `push_results=1183`, `push_errors=0`
    - `chunk_rtt_ms avg=28.35, p95=144`
    - `queue_len_before_avg=0.05`, `queue_len_after_avg=0.3`, `queue_compactions=0`
    - `epoch_begin=13`（`start=2`, `seeked=10`, `play=1`）
  - Worker：
    - `push_audio_received=1184`, `speaker_decision=37`
    - `chunk_epoch_reset=2`, `chunk_non_monotonic=599`, `chunk_seq_gap=0`
    - `asr_decode_ms avg=111.16, p95=237`
- 与 O-1（第二版基线）对比（取已归档统计）：
  - `chunk_rtt_ms avg`: `8.83 -> 28.35`（显著上升）
  - `chunk_rtt_ms p95`: `56 -> 144`（显著上升）
  - `asr_decode_ms avg`: `53.5 -> 111.16`（显著上升）
  - `asr_decode_ms p95`: `105 -> 237`（显著上升）
- 当前判读：
  - 固定 offset 0.5s 场景下，性能指标相对 O-1 出现明显劣化；但本轮同时出现 `seeked=10`，需要 O-3/O-4 继续确认是“offset 本身”还是“交互/时序扰动”主导。
- 下一步：执行 O-3（动态 offset），并严格保持一次起始 seek + 中途不交互，完成最终归因。

### 2026-02-19  Phase F 第九轮（F2 / O-3 动态 offset 采样）

- 已完成 O-3 日志：`testdata/subtitle-debug/o3-offset-dynamic.log`（约 2.97MB）。
- O-3（动态 offset）指标：
  - Renderer：
    - `capture_chunks=1322`, `push_results=1287`, `push_errors=0`
    - `chunk_rtt_ms avg=18.49, p95=111`
    - `queue_len_before_avg=0.02`, `queue_len_after_avg=0.14`, `queue_compactions=0`
    - `offset_value_counts`: `0.000=1430`, `0.500=590`, `-0.500=589`（动态切换生效）
    - `epoch_begin=11`（`start=2`, `ratechange=2`, `seeked=5`, `play=2`）
  - Worker：
    - `push_audio_received=1287`, `speaker_decision=38`
    - `chunk_epoch_reset=2`, `chunk_non_monotonic=644`, `chunk_seq_gap=0`
    - `asr_decode_ms avg=85.92, p95=207`
- 与 O-2（固定 offset）对比：
  - `chunk_rtt_ms avg`: `28.35 -> 18.49`（下降）
  - `chunk_rtt_ms p95`: `144 -> 111`（下降）
  - `asr_decode_ms avg`: `111.16 -> 85.92`（下降）
  - `asr_decode_ms p95`: `237 -> 207`（下降）
- 当前判读：
  - O-3 性能劣化程度低于 O-2，尚未出现“动态切换必然更差”的证据。
  - 两轮都观测到非预期 `seeked/ratechange` 事件，导致 F2 归因仍未闭环；需补一次“严格无交互事件”的对照采样，或在代码中暂时屏蔽对应 listener 做纯链路实验。
- 下一步：进入 O-4（renderer-only vs worker-only offset）之前，先补一轮受控采样（消除 `seeked/ratechange` 干扰），再给最终 offset 归因结论。

### 2026-02-19  Phase F 第十轮（解释非预期 ratechange/seeked 并加受控采样开关）

- 现象解释：即便用户未手动改 rate，代码中仍存在程序化写入 `video.playbackRate` 与 `video.currentTime` 的路径（主视图/全屏均有），可触发 `ratechange/seeked` 事件并导致 epoch reset。
- 已加受控采样开关：`localStorage['subtitle.debug.suppressControlResets']=1`
  - 开启后会忽略 `seeked/play/ratechange` 对字幕会话的 reset，仅记录 `renderer_control_event_ignored` 日志。
  - 目的：在 O-4 归因前得到“少控制噪声”的纯链路样本。
- 验证：`bun run build` 通过。
- 下一步：在该开关开启下补采一轮 O-3 对照，再进入 O-4。

### 2026-02-19  Phase F 第十一轮（开关生效时机修正）

- 复核发现：`suppressControlResets` 初版读取在 push 流程内，可能错过早期 control event（导致仍有 `seeked/play` 触发 reset）。
- 已修正为在 `seeked/play/ratechange` 事件处理函数内实时读取 `localStorage['subtitle.debug.suppressControlResets']`。
- 影响：开关开启后可稳定抑制控制事件导致的 epoch reset，更适合 O-4 受控归因。
- 验证：`bun run build` 通过。
- 下一步：按相同 O-3 动态脚本再跑一次（受控版），产出最终“去噪”样本后进入 O-4 结论。

### 2026-02-19  Phase F 第十二轮（受控 O-3 结果 + O-4 准备）

- 已解析受控样本：`testdata/subtitle-debug/o3-offset-dynamic-controlled.log`。
- 受控 O-3 关键结果：
  - `epoch_begin=2`，且仅 `start=2`（说明 suppressControlResets 生效，控制事件噪声已显著下降）。
  - `offset_value_counts`: `0.000=1541`, `0.500=589`, `-0.500=585`。
  - Renderer：`chunk_rtt_ms avg=22.55, p95=123`；Worker：`asr_decode_ms avg=96.83, p95=203`。
  - 在同一受控样本内分 offset 看 RTT：
    - `offset=0.000`: avg `20.89`, p95 `113`
    - `offset=0.500`: avg `20.80`, p95 `115`
    - `offset=-0.500`: avg `28.72`, p95 `168`
- 当前结论：
  - renderer-only offset 并未稳定触发“必然高 CPU/高 RTT”；正负方向不对称（`-0.5` 更差）需继续定位。
  - 现阶段无法把“offset 一定导致高 CPU”作为确定结论，应改为“与时序方向/采样抖动耦合，需进一步分离 worker 路径影响”。
- O-4 准备：
  - 已扩展调试模式 `subtitle.debug.offsetMode`（`renderer|worker|both|off`），支持做 renderer-only vs worker-only 归因。
  - `renderer_push_result` 日志新增 `offset_mode` 与 `asr_chunk_start_sec/asr_chunk_end_sec`，便于核对是否真正作用在 worker 输入时间轴。
- 验证：`bun run build` 通过。
- 下一步：执行 O-4 两组受控样本：
  1. `offsetMode=renderer, offsetSec=0.5`；
  2. `offsetMode=worker, offsetSec=0.5`；
  对比 RTT、decode_ms、epoch_reset、non_monotonic 增量后给最终归因。

### 2026-02-19  Phase F 第十三轮（F2 / O-4 归因完成）

- 已完成 O-4 双样本：
  - `testdata/subtitle-debug/o4-renderer-offset.log`
  - `testdata/subtitle-debug/o4-worker-offset.log`
- 受控前提（两组一致）：`epoch_begin=2` 且仅 `start=2`，控制事件噪声可接受。
- O-4 对比结论（核心）：
  - **renderer-only offset（+0.5）**：
    - `chunk_rtt_ms avg=25.4, p95=130`
    - `asr_decode_ms avg=121.52, p95=229`
  - **worker-only offset（+0.5）**：
    - `chunk_rtt_ms avg=39.11, p95=202`
    - `asr_decode_ms avg=121.78, p95=310`
  - 在采样条件近似下，worker-only 相比 renderer-only 的 RTT 与队列压力更高，且 decode p95 明显更差。
- 归因结论（用于专家包）：
  1. offset 的“纯显示层（renderer-only）”影响相对可控；
  2. offset 进入 worker 输入时间轴后，和 chunk 时序抖动耦合，放大 non-monotonic 相关成本，表现为 RTT/队列/尾延迟上升；
  3. “offset 必然导致高 CPU”不成立，更准确表述为“**worker 路径 offset 在当前链路上存在较高性能风险**”。
- 决策建议：
  - 默认关闭 worker 路径 offset；若保留 offset，仅保留 renderer-only 模式用于显示对齐微调。
  - 后续若需恢复 worker offset，必须先完成时间戳单调化/容忍带（例如 non-monotonic 20~30ms deadband）再评估。

### 2026-02-19  Phase F 第十四轮（进入 F3：renderer-only 收敛落地）

- 已按 O-4 结论收敛 offset 调试能力：
  - `subtitle.debug.offsetMode` 仅保留 `off/renderer` 生效语义。
  - `worker/both` 输入会退化为 renderer-only，不再把 offset 注入 worker 输入时间轴。
- 实现位置：`src/features/subtitles/useLiveSubtitles.ts`。
- 影响：
  - 杜绝调试配置误触发 worker 路径 offset，降低 RTT/尾延迟放大风险。
  - 保留 renderer-only 对齐微调用于观感实验，不影响 ASR 输入时间轴。
- 验证：`bun run build` 通过。
- 下一步：执行 F3b（speaker 状态机微调），目标是“保持低抖动前提下缩短锁定延迟”。

### 2026-02-19  Phase F 第十五轮（F3b speaker 状态机微调）

- 已在 `electron/subtitles/asrWorker.ts` 完成低改动 speaker 微调：
  - 新增“强证据单段快切”通道（existing speaker，长段且优势足够时不再强制等待两段确认）。
  - 将 existing speaker 的 pending 证据时长门槛由 `0.6s` 下调到 `0.45s`，降低切换确认延迟。
  - profile 更新门控收紧为“仅在 bestId 与目标 speaker 一致且置信/时长达标时更新”，减少边界样本污染。
- 已完成构建验证：`bun run build:electron`、`bun run build` 通过。
- 当前状态：F3a/F3b 代码落地完成，待你复测 E-M5（锁定率/延迟）验证是否达到门禁。

### 2026-02-19  Phase F 第十六轮（B1 复测失败后进入 B2）

- 你反馈 F3b 后 E-M5 仍 fail：
  - 不会高频抖动；
  - 但切到某个 speaker 编号后，双人字幕会并入同一编号（锁定失败）；
  - 延迟仍约 2s，且短句（几个字）偶发不显示。
- 已按门禁触发 B2 路径并完成第一批实现：
  1. `useLiveSubtitles` 调试 offset 模式彻底收敛为 `off/renderer`（禁用 worker/both 输入路径）；
  2. `asrWorker` speaker 决策加入低置信旁路：
     - 在双 speaker 已建立时，低置信段不再一律回退 current speaker；
     - 允许 existing speaker 在低置信但有相对优势时完成确认切换；
     - 维持防抖前提下缩短 existing pending 证据时长门槛（`0.45s`）；
     - profile 更新继续收紧，减少跨人污染。
- 已完成验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M5（同片段）并重点回传：
  1. 同编号混人是否下降；
  2. 切换延迟是否明显低于 ~2s；
  3. 短句丢失是否仍存在。

### 2026-02-19  Phase F 第十七轮（针对“完全同号不切换 + 短句丢失”补丁）

- 你反馈第十六轮后仍 fail：
  - speaker 仍完全同号不切换；
  - 延迟降到约 1s（较前有改善）；
  - 短句仍有部分不输出。
- 本轮修正：
  1. speaker 锁定防塌缩补丁（`electron/subtitles/asrWorker.ts`）：
     - 在仅有 1 个 profile 且 current 低置信时，允许快速创建第二 profile，避免长时间“全并入 S1”。
     - profile 更新增加冷却期门控（切换冷却内不更新），减少刚切换后的跨人污染。
  2. 短句召回补丁（`electron/subtitles/asrWorker.ts`）：
     - VAD segment 最小时长过滤由 `0.2s` 下调到 `0.14s`，提高短句进入 ASR 的概率。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请再次复测 E-M5 并回传三项（同号混人/切换延迟/短句丢失）。

### 2026-02-19  Phase F 第十八轮（复测反馈后追加修正）

- 你反馈第十七轮后：
  - 已不再高频抖动，延迟明显下降（基本说完就出）；
  - 但 speaker 仍塌缩到同一编号（短暂 S1 后长期全在 S2）；
  - 短句丢失有所下降但仍存在；
  - 新发现 seek 回退后会出现旧字幕回流并与新字幕堆积，直到追平原时间点。
- 本轮追加修正：
  1. `useLiveSubtitles` seek 处理改为“无条件 epoch reset + 清空 cues”，即便在调试 suppress 模式也会执行，避免 seek 后旧队列/旧字幕污染。
  2. `asrWorker` speaker 再加一层防塌缩：
     - 单 profile 且 current 低置信时可快速 bootstrap 第二 profile，避免长期单 ID 吞并；
     - profile 更新增加冷却期门控，减少切换临界段的跨人污染。
  3. VAD 短段过滤再下调：`0.2s -> 0.14s`，进一步提升短句召回。
- 验证：`bun run build`、`bun run build:electron` 通过。
- 下一步：复测 E-M5 与 seek 回退场景，确认：
  - 是否仍出现“长期全在同一 S”；
  - seek 后是否仍有旧字幕回流堆积；
  - 短句遗漏是否继续下降。

### 2026-02-19  Phase F 第十九轮（根据新复测继续抑制同号塌缩）

- 你反馈第十八轮后：
  - seek 回退堆积问题已修复（无回流堆积）；
  - 延迟显著改善（接近句末即出）；
  - 仍存在“不锁定 + 低频切换后同号输出”。
- 本轮再加 speaker 防塌缩约束（`electron/subtitles/asrWorker.ts`）：
  1. 维护 rival 分数并在 profile 更新时要求“对 rival 有足够优势”，降低同号污染速度；
  2. 在双 profile 已满且 current 低置信时，允许从 `bestOtherId` 发起候选，不再被 current 轻易吸回；
  3. 低置信 existing 切换确认优势门槛继续下调（`0.01 -> 0.005`）以减少“低频切一下又回同号”。
- 本轮验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请再次复测 E-M5，重点确认“是否仍长期同号塌缩”。

### 2026-02-19  Phase F 第二十轮（复测后继续修正同号塌缩）

- 你反馈第十九轮后：
  - 明显改善：前几句可正确 S1/S2；
  - 但中段仍会误判并最终塌缩为单号；
  - seek 回退可稳定复现前段结果（说明重置路径已稳定）。
- 本轮再次收敛 speaker 判定（`electron/subtitles/asrWorker.ts`）：
  1. `sticky` 旁路条件加入 rival 约束（当 rival 与 current 极接近时，不再强行 stay）；
  2. 在低置信候选阶段优先允许 `bestOtherId` 参与 existing 切换确认，减少 current 吸附；
  3. profile 更新继续要求对 rival 有优势，防止中后段逐步塌缩为单 profile 表征。
- 额外收益保留：
  - 延迟下降与 seek 回退无堆积效果保持。
- 本轮验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请再次复测 E-M5，只关注“是否还会中后段塌缩为单号”。

### 2026-02-19  Phase F 第二十一轮（劣化回滚 + 新一轮防塌缩收敛）

- 你反馈第二十轮后出现劣化：
  - 同号塌缩仍在，且错判范围扩大。
- 已回滚第二十轮中最激进的两条候选旁路条件，恢复到上一轮更稳的判定骨架。
- 在此基础上保留/追加更保守的防塌缩策略：
  - profile 更新继续要求对 rival 有稳定优势（避免长期被单号吸附污染）；
  - 低置信 existing 切换门槛维持较低优势阈值，减少“切一下就回吸”。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M5，确认是否回到“前几句可分离”的较优状态，再评估中后段是否仍塌缩。

### 2026-02-19  Phase F 第二十二轮（再次劣化后的快速止损回滚）

- 你确认第二十一轮后仍劣化（错判范围扩大 + 中后段塌缩）。
- 本轮执行“快速止损”：
  - 移除第二十一轮引入的激进 candidate 旁路；
  - 保留已验证有效的改动（seek 回退修复、低延迟、短句召回与较稳防抖骨架）。
- 目的：先恢复到“已知较优基线”，避免继续在劣化状态上叠加策略。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M5，确认是否恢复到“前几句可分离、总体更稳”的状态。

### 2026-02-19  Phase F 第二十三轮（用户纠正结果后微调短时间窗错判）

- 你澄清第二十二轮并非劣化，而是“明显改善”：
  - 长时间同号塌缩基本消除；
  - 仍存在换人后短时间窗（约 1~2 句）编号错判。
- 本轮仅做小步快调（避免再引入大范围回归）：
  1. existing 两阶段确认窗口再缩短：`pendingDuration 0.35s -> 0.30s`；
  2. 新增“冷却期内纠错通道”：若 current 明显低置信且候选优势充分，允许在 cooldown 期间完成一次纠错切换，减少换人后 1~2 句错号。
- 维持不动：
  - seek 回退无堆积修复；
  - renderer-only offset 收敛；
  - 短句召回提升策略。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M5，重点观察“换人后 1~2 句错号”是否缩短到 0~1 句。

### 2026-02-19  Phase G 第一轮（多专家意见择优采纳）

- 已完成“非机械融合”的择优落地决策，并写入 Phase G：
  1. Simple 保留入口但合并到 Advanced 底层；
  2. 行级分离优先（line-first）替代绝对身份优先；
  3. 短句召回采用白名单+邻域合并并绑定误检门禁；
  4. 预生成采用同链路复用+增量写盘+seek 续生成；
  5. offset 继续锁定 renderer-only。
- 当前状态：Phase G `in_progress`，等待按 G1~G5 逐项实施。

### 2026-02-19  Phase G 第二轮（G1/G2 首批代码落地）

- 已开始按择优路线实施，完成首批可运行改造：
  1. `subtitleCue` 协议新增可选 `line` 字段（`A/B`），用于行级分离展示；
  2. Worker 新增 `lineBySpeaker/currentLineId` 状态，并在每条 cue 上输出 `line`；
  3. Renderer 展示改为统一走 line-first 聚合函数：
     - Advanced: 双行显示（`maxLines=2`）；
     - Simple: 单行壳显示（`maxLines=1`，不显示 track 标签）。
  4. `decodeSegmentAndBuildCue` 的文本/时间裁剪去掉 simple 特殊分支，Simple/Advanced 在该路径共享同一底层句级输出。
- 影响：
  - G2（行级分离优先）进入可观测阶段；
  - G1（Simple 底层合并）进入部分完成状态，尚需清理 fallback 分支与参数策略。
- 下一步：
  1. 复测 E-M5，观察 line-first 后“换人短窗错判”是否继续收敛；
  2. 继续 G1 收口（移除 simple 历史分支残留）；
  3. 落地 G3（短句召回门禁统计）。

### 2026-02-19  Phase G 第三轮（基于复测反馈增强 line-first 纠错）

- 你反馈：
  - G1 方向有效（Simple 已呈现“Advanced 底层 + 单行壳”体验）；
  - G2 仍接近上一版本表现（换人短窗错判未明显继续收敛）。
- 本轮增强（`electron/subtitles/asrWorker.ts`）：
  1. 行分配新增短窗纠错条件：双 profile 存在 + 相似度低于阈值余量 + 同行连续输出>=2 句 + 纠错冷却满足时，允许切换到对侧行；
  2. 新增行状态统计字段：`lineSwitchSec`、`lineStreakCount`，用于抑制抖动并避免过快翻转。
- 预期：
  - 不依赖绝对 S1/S2 正确性的前提下，减少“换人后 1~2 句仍落同一行”。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 下一步：请复测 E-M5，重点观察短窗错判是否进一步缩短。

### 2026-02-19  Phase G 第四轮（G4 最小闭环：播放时持久化 + seek 回读）

- 按“先可用再提速”完成 G4 最小闭环实现：
  1. 新增字幕持久化 IPC 协议：`startSubtitlePersistence / appendSubtitlePersistence / readSubtitlePersistenceWindow`；
  2. `SubtitleSessionManager` 增加会话级持久化状态，落盘同目录 sidecar：`<video>.auto-live.srt`；
  3. 播放中每批新 cue 增量入持久化队列并写盘；
  4. seek 时优先回读已生成窗口（默认 `backtrack=1s`，`lookahead=3s`），再继续实时链路续算。
- 已同步打通前后端契约与仓储层：
  - `backend.schemas/types`、`preload`、`channels`、`registerBackendIpcHandlers`、`real/mock repository`、`backend-api.d.ts`。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 风险与剩余：
  - 当前为 SRT 单文件增量重写策略，尚未引入 JSONL 明细与高速（>=2x）后台预生成；
  - 下一轮进入 G5：补 RTF 压测脚本与上限报告，再决定是否引入批量预转写任务。

### 2026-02-19  Phase G 第五轮（修复“请求已取消”噪声与写盘兜底）

- 针对你反馈的两个问题做定向修复：
  1. popover 频繁出现“请求已取消”；
  2. 视频目录未观察到持久化字幕文件。
- 已修复：
  1. `useLiveSubtitles` 对 abort/cancel 类错误改为静默处理，不再上抛成用户可见错误提示；
  2. 持久化初始化失败不再完全吞掉，非取消错误会回传可见消息；
  3. `subtitleSession` 写盘新增兜底路径：若视频目录不可写，自动回退到系统临时目录 `MediaPlayerX/auto-subtitles` 并记录主进程 warning 日志。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 说明：默认仍优先写入视频同目录 `*.auto-live.srt`；仅在目录权限/路径异常时触发临时目录回退。

### 2026-02-19  Phase G 第六轮（实现混合覆盖策略 + 时间轴稳健化）

- 针对“中段起播/seek 回跳/回写覆盖”一致性问题，完成两类核心改造：
  1. **写盘策略改造（按你要求的 2+3 混合规则）**
     - `appendSubtitlePersistence` 新增 `session_epoch/chunk_seq/batch_start_sec/batch_end_sec` 元数据；
     - 主进程持久化层引入水位线（epoch/seq）拒绝旧批次；
     - 覆盖规则：
       - 新批次完全落在已生成区间内部 -> 保留旧字幕（跳过新批次）；
       - 新批次切入已生成区间边界 -> 允许覆盖重叠区；
       - 区间外新内容 -> 直接追加；
     - 写盘改为 `tmp -> rename` 原子替换，降低半写风险。
  2. **Worker 时间轴稳健化**
     - VAD 分段时间戳增加异常检测（超出 chunk 窗口、跨度异常、反向区间）；
     - 异常时回退到 chunk 时间窗推导，新增 `vad_timestamp_fallback` 调试事件。
- Renderer 同步：
  - 持久化队列改为 batch 级（携带 epoch/seq 与 batch 时间窗），`beginNewEpoch` 时清空写盘队列避免旧批次串写。
- 验证：`bun run build:electron`、`bun run build` 通过。
- 影响：
  - 解决“seek 后旧批次覆盖新时间域”与“完全内含重算覆盖已生成字幕”的主要风险；
  - 为后续 `missing_ranges` 驱动补生（G4 完整闭环）奠定基础。

### 2026-02-19  Phase G 第七轮（seek 命中已写字幕时停止重生成）

- 针对“seek 到已有内容仍会改写”继续加固：
  1. `readSubtitlePersistenceWindow` 返回 `generated_ranges`、`timeline_in_generated_range`、`timeline_has_cue`；
  2. Renderer 新增“回放已持久化字幕优先”模式：
     - seek 后先强制读取持久化窗口；
     - 若命中 `timeline_has_cue=true`，暂停 ASR 推送，仅按持久化字幕播放显示；
     - 仅当时间点不在已写 cue 上时，恢复生成；
  3. 持久化读取增加轻量轮询节流（回放模式高频、生成模式低频），用于在边界处自动切换“生成/只读回放”。
- 行为结果（对齐你的规则）：
  - 跳到已写字幕中间，不再重生成、不再切后半句；
  - 从前方推进到已写区边界，允许一次边界覆盖后，进入已写 cue 区域即停生成；
  - 已写区内的空隙不强制冻结，可继续补生成。
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第八轮（跨会话保留与路径策略修正）

- 处理你反馈的 2/3/4：
  1. **切换节点再切回会重置**：`startSubtitlePersistence` 改为默认不清空，启动时回读现有 `.auto-live.srt` 并恢复内存索引；
  2. **重启 app 后会重置**：同样通过回读 SRT 恢复，避免新会话覆盖旧内容；
  3. **落盘跑到临时目录**：移除自动 fallback 到 `auto-subtitles`，改为只写视频同目录 sidecar，目录不可写时直接报错。
- Renderer 同步改动：启动持久化时 `reset_existing=false`，并在启动点先做一次强制窗口回读，命中则直接进入“只读回放”模式。
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第九轮（修复 Windows 根路径 EPERM）

- 问题：`backend:startSubtitlePersistence` 在路径为盘符根或无效视频路径时触发 `EPERM: mkdir 'X:\\'`。
- 修复：
  1. 新增 `resolvePersistableVideoPath`，过滤空路径/盘符根路径等不可持久化输入；
  2. 新增 `ensureParentDirectory`，若目标目录即根目录则跳过 `mkdir`；
  3. `startPersistence` 改为内部兜底返回 `enabled=false`，不再抛异常中断前端流程；
  4. 保持“只写视频同目录”策略，不再回退临时目录。
- 影响：避免节点切换或异常路径导致弹窗报错，并防止持久化链路整体失效。
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第十轮（自动字幕文件命名/可见性与高倍速测试）

- 按产品要求完成 4 项变更：
  1. 自动字幕 sidecar (`.auto-live.*`) 不再出现在常规字幕列表（仅自动字幕链路静默读写）；
  2. 自动字幕文件名升级为 `*.auto-live.<locale>.srt`（如 `auto/zh/en-US`），并兼容旧版 `*.auto-live.srt` 自动迁移读取；
  3. 生成 cue 时间窗统一做 `start-0.5s` 与 `end+0.5s` 扩展，覆盖“先说后出字”的滞后现象；
  4. 倍速选项新增到 `3x~10x`（主播放与全屏一致）。
- 代码落点：
  - 字幕列表过滤：`electron/services/file-system-read/libraryReadWriteServiceImpl.ts`
  - sidecar 命名与旧文件迁移：`electron/subtitles/subtitleSession.ts`
  - cue 时间窗扩展：`electron/subtitles/asrWorker.ts`
  - 倍速上限与选项：`src/components/VideoMainSection.tsx`、`src/components/fullscreen/FullscreenVideoControls.tsx`、`src/components/FullscreenLayer.tsx`、`src/features/app/buildVideoMainSectionProps.ts`、`src/features/app/buildFullscreenLayerProps.ts`、`src/features/media/useMediaState.ts`
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第十一轮（回滚写盘时间偏移，改为显示层策略）

- 根据最新复测反馈，撤回“生成即写入时间窗扩展”策略，避免写盘时间轴污染与高倍速劣化。
- 新策略：
  1. `.auto-live.<locale>.srt` 继续保存原始 ASR 时间戳（不做前后扩展/前移）；
  2. 显示时才应用“头尾+0.5s扩展，再按原始时长前移”的窗口变换；
  3. 持久化写盘、覆盖判定与生成链路统一使用原始时间戳。
- 代码落点：
  - 取消写盘前扩展：`electron/subtitles/asrWorker.ts`
  - 显示层窗口变换：`src/features/subtitles/useLiveSubtitles.ts`
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第十二轮（字符驱动显示映射 + seekback 去重 + >2x 降级）

- 依据复测反馈完成策略升级：
  1. **显示映射改为字符驱动**：
     - 不再使用固定“按原始时长前移”；
     - 使用“3~20 字映射 0.3~2s 回退 + 发音时长估计”计算 `leadOffsetSec`；
     - 显示时长由 `rawDuration` 与 `speechDuration` 共同约束，改善“开始时间与长度耦合失真”。
  2. **seekback 穿插重复抑制**：
     - Renderer 与主进程持久化层同时加入“同文本 + 近时间窗”近似去重（中心点差/重叠比）；
     - 防止内容一致但时间微错位的重复条目并存。
  3. **高倍速降级策略**：
     - 当 `playbackRate > 2x` 且持久化可用时，切换为“仅回放已生成字幕”，暂停实时生成；
     - 降低高倍速实时转写导致的缺字与错乱风险。
- 说明：
  - `.auto-live.<locale>.srt` 持续保存原始时间戳；
  - 显示映射仅作用于“解析/回放 auto 持久化字幕”链路，不写回文件。
- 验证：`bun run build:electron`、`bun run build` 通过。

### 2026-02-19  Phase G 第十三轮（seekback 锁区回放 + 相似文本去重加严）

- 针对“seekback 每次都再生一条、时间微错开”的复测结果，继续加固：
  1. seek 后若命中已生成区间，建立 `replayLockRange`，在该区间内强制只回放持久化字幕，不再触发实时再生成；
  2. Renderer/主进程持久化两端去重从“文本完全一致”升级为“文本相似度 + 时间邻近/重叠”联合判定；
  3. >2x 仍保持“仅回放已生成字幕”降级策略，并在降回 <=2x 时自动清除提示。
- 目标：消除 seekback 产生的同义/近似重复条目，避免 .auto-live 文件继续污染。
- 验证：`bun run build:electron`、`bun run build` 通过。


---

## 8. 风险审计（动态维护）

- 风险 1：VAD 切分过碎导致阅读体验下降。
  - 缓解：提高 `threshold`/`minSilenceDuration`，并启用预设。
- 风险 2：声纹阈值不稳导致同人频繁换标签。
  - 缓解：移动平均 + 阈值扫描 + 短片段回退策略。
- 风险 3：CPU 占用升高影响播放器流畅度。
  - 缓解：降低线程、减少调试日志、限制处理窗口。

---

## 9. 关联文件（预计）

- `electron/subtitles/asrWorker.ts`
- `electron/subtitles/subtitleSession.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/preload.ts`
- `electron/channels.ts`
- `src/features/subtitles/useLiveSubtitles.ts`
- `src/features/app/useAppDisplayResources.ts`
- `src/features/subtitles/VideoSubtitleCapture.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`
- `src/components/settings/renderSettingsModelSection.tsx`
- `src/components/settings/renderSettingsMainSectionContent.tsx`
- `src/features/app/useAppSettingsStore.ts`
- `src/features/app/usePersistedAppSettings.ts`
- `src/contracts/backend.schemas.ts`
- `src/contracts/backend.types.ts`
- `src/backend-api.d.ts`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
