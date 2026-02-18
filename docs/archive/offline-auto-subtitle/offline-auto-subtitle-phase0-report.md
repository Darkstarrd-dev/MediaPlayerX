# 离线自动字幕 Phase 0 执行记录

Last updated: 2026-02-17

关联方案：`docs/offline-auto-subtitle-implementation-plan.md`

## 执行范围

- 本记录仅覆盖 Phase 0（Spike 与风险清零）的启动实施。
- 目标是先拿到“可否进入引擎联调”的客观基线，不提前进入 Phase 1 功能开发。

## 本次改动

1. 新增 Phase 0 探针脚本：`scripts/subtitle-phase0-spike.mjs`
   - 探测 `sherpa-onnx-node` 是否可加载。
   - 探测可选引擎目录是否存在（默认路径 + 环境变量覆盖）。
   - 探测 DirectML 相关 runtime artifact（如 `onnxruntime_providers_dml.dll`）。
   - 输出人类可读日志，并支持 `--json-out` 导出结构化报告。
2. 新增 npm 脚本：`npm run subtitle:phase0`。
3. 视频元素补齐 CORS 属性（为后续 WebAudio 捕获链路预备）：
   - `src/components/VideoMainSection.tsx`
   - `src/components/fullscreen/FullscreenPanes.tsx`

## 已执行命令与结果

1. `npm ls sherpa-onnx-node`
   - 结果：`(empty)`，当前依赖未安装。
2. `node -e "require('sherpa-onnx-node')"`
   - 结果：`Cannot find module 'sherpa-onnx-node'`。
3. `npm run subtitle:phase0`
   - 结果：脚本可运行，结论为“模块未安装，当前环境阻塞引擎 smoke test”。
4. `npm install sherpa-onnx-node && npm run subtitle:phase0`
   - 结果：安装成功（`sherpa-onnx-node@1.12.25`），探针结果为 `load status: ok`，CPU candidate=YES，DirectML candidate=NOT DETECTED。

## 当前结论

- 结论 1：`sherpa-onnx-node` 已可加载，CPU provider 进入可联调状态。
- 结论 2：已先完成前端视频元素 `crossOrigin="anonymous"` 预置，避免后续音频抓取因 CORS 失败。
- 结论 3：DirectML 在当前依赖形态下未被探针识别，仍需在“可选组件安装形态”复测。
- 结论 4：Phase 0 已启动并产出可复用探针，但未达到“全部 gate 通过”的完成状态。

## Phase 0 Checklist（执行态）

- [x] CPU provider 能稳定初始化
- [ ] DirectML provider 可探测，失败可识别原因（当前结果：not-detected，需可选组件形态复测）
- [ ] seek/pause/ratechange 的时间轴重置策略可行（待会话链路最小接通后验证）
- [x] 输出风险清单与后续实现约束

## 风险清单（更新）

1. 可选组件路径一致性风险
   - 现状：开发环境已安装 `sherpa-onnx-node`，但“安装器可选组件目录”尚未落地。
   - 影响：packaged 环境可能与 dev 结论不一致。
2. Provider 健康状态不可见风险
   - 现状：未有正式 runtime capability 字段暴露自动字幕引擎状态。
   - 影响：用户侧无法判断“可用/降级/不可用”。
3. 音频链路与播放链路耦合风险
   - 现状：尚未验证 muted/volume 对捕获流的影响。
   - 影响：可能出现“有画面无字幕输入”的误判。

## 下一步（仍在 Phase 0）

1. 将探针脚本接入包含可选引擎组件的本地包进行复测（重点验证 DirectML artifact）。
2. 在 `dev:desktop` 环境下做最小音频捕获对照实验：
   - 正常音量 / `volume=0` / `muted=true` 三组 RMS 对比。
3. 产出 Phase 0 完结判定与是否引入 GainNode 的结论。
