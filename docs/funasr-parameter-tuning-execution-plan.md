# FunASR 参数调优执行计划（高效版）

## 背景与目标

- 现状：自动字幕高级参数（VAD/Speaker）默认值最初按 SenseVoice 调整，切换 FunASR 后准确率与分段体验不稳定。
- 目标：用最短时间（20~40 分钟）得到可复现、可回滚、可解释的 FunASR 参数基线。
- 约束：不依赖主观“听起来更好”，统一用固定样本 + 指标对比。

## 产出物

- 一组 FunASR 推荐参数：
  - `subtitleAdvancedSpeakerThreshold`
  - `subtitleAdvancedVadThreshold`
  - `subtitleAdvancedVadMinSilenceSec`
  - `subtitleAdvancedVadMinSpeechSec`
  - `subtitleAdvancedVadMaxSpeechSec`
- 一份扫描记录：每轮命令、结果表、最终推荐值与回退值。

## 样本准备（一次性）

- 准备 3 段固定音频（每段 45~90 秒）：
  1. 单人安静语音
  2. 双人对话（有打断/插话）
  3. 背景噪声场景（音乐/环境噪）
- 后续所有扫描都仅使用这 3 段，不中途换素材。

## 执行步骤

### Step 0：链路探针与构建

1. 执行：

```bash
npm run build:electron
node scripts/subtitle-phase0-spike.mjs
```

2. 检查：

- `sherpa-onnx-node` 可加载；
- `exports` 中包含 `OfflineRecognizer`、`Vad`；
- Worker 构建产物可用（默认 `dist-electron/asrWorker.cjs`）。

### Step 1：先锁 Speaker 阈值（自动扫描）

1. 对每段样本运行阈值扫描：

```bash
node scripts/subtitle-speaker-threshold-scan.mjs ^
  --input "<sample.wav>" ^
  --model-dir "C:\opencode\model\sherpa-onnx-funasr-nano-int8-2025-12-30" ^
  --model-id "funasr-nano-int8-2025-12-30" ^
  --chunk-sec 0.2 ^
  --thresholds "0.46,0.48,0.50,0.52,0.54,0.56,0.58,0.60"
```

2. 记录每行结果中的核心列：

- `score`（越高越好）
- `rapidFlipCount`（越低越好）
- `uniqueSpeakers`（双人样本期望接近 2）

3. 取三段样本的综合最优阈值（避免只看单段）。

### Step 2：VAD 九宫格快扫（手动 9 组）

在已锁定 Speaker 阈值基础上，仅扫描两轴：

- `vad.threshold`: `0.36 / 0.42 / 0.48`
- `vad.min_silence_sec`: `0.10 / 0.16 / 0.24`

固定：

- `vad.min_speech_sec = 0.16`
- `vad.max_speech_sec = 3`（长句场景可加测 `5`）

对比标准（按优先级）：

1. 断句稳定（不过碎、不过长）
2. 时序延迟可接受
3. 文本连续性（seek/ratechange 后无明显堆积）

### Step 3：性能与日志校验

1. 开启日志：

- 主进程环境变量：`SUBTITLE_DEBUG_LOGS=1`
- Renderer 控制台：`localStorage.setItem('subtitle.debug.logs','1')`

2. 采集日志后执行：

```bash
node scripts/analyze-subtitle-log.mjs <log-path>
```

3. 重点看：

- `renderer.chunk_rtt_ms_p95`
- `renderer.queue_len_after_avg`
- `worker.speaker_changed_count`
- `worker.pending_duration_sec_avg`

## 验收门槛

- 双人样本：`uniqueSpeakers` 稳定在 2 附近，`rapidFlipCount` 明显低于候选次优组。
- 噪声样本：VAD 不出现连续碎片化断句。
- 三段样本均可复现同一组推荐参数，不依赖单样本特例。

## 参数落地与回滚

- 落地点：
  - `src/store/useUiStore.ts`（默认值）
  - `src/contracts/settings.ts`（schema 默认）
  - `electron/subtitles/asrWorkerInitConfig.ts`（Worker 预设）
- 回滚策略：保留“上一个稳定参数组”，若新组导致大面积回退，优先回滚 `speakerThreshold`，再回滚 VAD 网格结果。

## 备注

- `scripts/subtitle-rtf-benchmark.mjs` 当前是 SenseVoice 配置模板，不作为 FunASR 精度结论依据。
- `exports=...` 为模块导出信息，不作为故障判定条件；故障以 `advanced_*_unavailable`、`*_init_failed` 事件与 console 诊断为准。
