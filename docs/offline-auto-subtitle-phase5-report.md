# 离线自动字幕 Phase 5 执行记录（Renderer 音频抓取 + Overlay 渲染）

## 结论

- 已完成 Phase 5 的前端链路接线：`video` 音频抓取、会话推流、字幕 Overlay 显示。
- 已实现自动字幕与外部字幕互斥：自动字幕启用时不再加载/渲染 `<track>` 外部字幕。
- 当前阶段重点是通路打通；识别质量与模型效果仍取决于 Worker 侧真实 ASR 能力。

## 本阶段完成项

1. AudioWorklet 音频抓取
   - 新增 `public/audio-worklets/video-audio-capture.worklet.js`。
   - 能力：输入混音为 mono、重采样到 16k、按 chunk 输出 Float32。

2. Renderer 抓取控制器
   - 新增 `src/features/subtitles/VideoSubtitleCapture.ts`。
   - 能力：
     - 将 `<video>` 接入 WebAudio 图
     - 透传原音频到 `AudioContext.destination`
     - 输出视频时间轴映射后的 chunk（start/end）

3. 自动字幕会话 Hook
   - 新增 `src/features/subtitles/useLiveSubtitles.ts`。
   - 能力：
     - 基于设置启动/停止 subtitle session
     - chunk 推送到 `pushSubtitleAudio`
     - 在 `seek/pause/play/ratechange` 时触发 `reset/flush`
     - 聚合 cue 并输出当前时间命中的字幕文本

4. App 状态接线（Display/Workspace/TopLayer）
   - 在 `useAppDisplayResources` 中接入 live subtitles。
   - 新增视频元素绑定通道：
     - `bindMainVideoElement`
     - `bindFullscreenVideoElement`
   - 将 `autoSubtitleActive/liveSubtitleText` 透传到主视频与全屏视频视图。

5. 视频与全屏 Overlay 渲染
   - 更新：
     - `src/components/VideoMainSection.tsx`
     - `src/components/FullscreenLayer.tsx`
     - `src/components/fullscreen/FullscreenPanes.tsx`
   - 自动字幕模式下：
     - 禁用 `<track>` 外部字幕渲染
     - 渲染 `.subtitle-overlay` 文本层

6. 样式接入
   - 新增 `src/components/subtitles.css`，并在 `src/App.css` 引入。

## 验证记录

- `npm run build`：通过。
- `npx eslint ...`（Phase 5 变更文件）：通过。

## 手测脚本与记录（最小）

### 手测脚本

1. 准备条件
   - 设置中开启离线自动字幕。
   - 已选择并下载模型（`subtitleModelDir`、`subtitleSelectedModelId` 有效）。
2. 主视频窗口
   - 播放视频，确认自动字幕文本在 `video` 画面 Overlay 出现。
   - `pause -> play` 后字幕继续刷新。
3. 时间轴重置
   - 进行 `seek`（拖进度条到新位置），确认旧时间段字幕不会继续残留。
   - 调整 `ratechange`（如 `1.0x -> 1.5x -> 0.75x`），确认字幕仍跟随。
4. 全屏切换
   - 进入全屏后确认 Overlay 仍显示。
   - 退出全屏后确认主窗口 Overlay 继续显示。
5. 互斥验证
   - 自动字幕启用时，外部字幕 `<track>` 不应显示。
   - 关闭自动字幕后，外部字幕链路可恢复。

### 本次记录（2026-02-17）

- 当前执行环境仅完成构建与静态校验，无法在本 CLI 会话内完成可交互 GUI 手测。
- 手测步骤脚本已固化为上述 5 步，可直接在本机 Electron 界面按顺序执行并回填结果。

## 当前边界

- 当前已完成端到端“会话 + 推流 + 显示”链路，但 Worker 仍以占位 cue 为主时，前端仅能验证通路与交互，不代表识别质量。
- 若要完成可感知效果，需要在后续阶段补齐 Worker 真实 ASR 结果产出与质量调参。
