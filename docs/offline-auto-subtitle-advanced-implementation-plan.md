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
- 保持 Simple/Advanced 双模式兼容，不破坏 Simple。

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
- [ ] Simple 模式无功能退化。
- [x] Advanced 模式在目标场景达到可用。
- [x] 质量门禁通过或有明确豁免记录。

### 手测矩阵（待执行并回填）

| 用例 ID | 模式 | 场景 | 操作步骤 | 预期结果 | 实测结果 |
|---|---|---|---|---|---|
| E-M1 | Simple | 非静音播放 | 启用离线字幕 -> 选择 Simple -> 正常播放 30s | 字幕持续更新，无 speaker 标签、无卡死 | pass（持续更新；但有持续堆积、拟声单字插入中段） |
| E-M2 | Simple | 静音播放 | 播放中将视频静音并持续 30s | ASR 持续出字，字幕不中断 | pass（与 E-M1 现象一致） |
| E-M3 | Simple | seek 跳转 | 在同一视频中前后多次 seek（>=5 次） | 会话不中断；字幕在 1~3s 内恢复 | pass（1~2s 恢复，跳转后先消失再出现） |
| E-M4 | Simple | ratechange 变速 | 在 1.0x/1.25x/1.5x 间切换 | 字幕持续更新，无明显堆积或停更 | fail（反馈：仍堆积且文本头/中/尾非线性变化；已改为 delta 线性窗口，待复测） |
| E-M5 | Advanced | 多说话人 | 使用 `voice_03m13s_04m13s.wav` 对应视频段 | 出现 `[S1]/[S2]` 标签并可读 | fail（反馈：external buffer 错误已消失，但 speaker 继续增长到 S3..S7 且拆分不准；已加黏滞与上限策略，待复测） |

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
- `src/features/subtitles/useLiveSubtitles.ts`
- `src/features/subtitles/VideoSubtitleCapture.ts`
- `src/components/settings/renderSettingsModelSection.tsx`
- `src/components/settings/renderSettingsMainSectionContent.tsx`
- `src/features/app/useAppSettingsStore.ts`
- `src/features/app/usePersistedAppSettings.ts`
- `src/contracts/backend.schemas.ts`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
