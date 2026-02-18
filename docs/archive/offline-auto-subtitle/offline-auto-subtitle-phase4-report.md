# 离线自动字幕 Phase 4 执行记录（会话 IPC + Worker + provider 回退）

## 结论

- 已完成 Phase 4 主体骨架：Main/Worker 会话通道、provider 自动回退、结构化事件回传。
- 目前已打通会话控制链路（start/stop/reset/flush/pushAudio），并具备窗口级会话隔离。
- 本阶段聚焦会话编排与回退策略；实际音频抓取与字幕渲染接线将在 Phase 5 落地。

## 本阶段完成项

1. 后端契约扩展
   - 新增会话相关 schema/DTO：
     - `startSubtitleSession`
     - `stopSubtitleSession`
     - `resetSubtitleSession`
     - `flushSubtitleSession`
     - `pushSubtitleAudio`
   - 新增统一 `cue` 与 `event` 结构。
   - 文件：`src/contracts/backend.ts`

2. IPC 与 bridge 接入
   - 新增 channels：`electron/channels.ts`
   - 主进程 handler：`electron/registerBackendIpcHandlers.ts`
   - preload bridge：`electron/preload.ts`
   - renderer API 类型：`src/backend-api.d.ts`

3. 会话管理（Main）
   - 新增 `SubtitleSessionManager`：`electron/subtitles/subtitleSession.ts`
   - 能力：
     - 按 `webContents.id` 隔离会话
     - `start/stop/reset/flush/pushAudio` 调用路由
     - 窗口销毁时自动释放会话

4. ASR Worker（Worker）
   - 新增 `electron/subtitles/asrWorker.ts`
   - 能力：
     - 解析初始化参数（模型目录、模型 ID、语言、provider 偏好）
     - `auto/directml -> cpu` 回退决策
     - 统一结构化事件输出（warning/error）
     - 处理 `reset/flush/pushAudio` 控制命令

5. 构建链路更新
   - 将 `asrWorker.ts` 纳入 electron 构建输出。
   - 文件：`scripts/build-electron.mjs`

6. Repository 层接线
   - `MediaRepository`、`realRepository`、`mockRepository` 增加会话接口。
   - 文件：
     - `src/features/backend/repository/types.ts`
     - `src/features/backend/repository/realRepository.ts`
     - `src/features/backend/repository/mockRepository.ts`

## 验证记录

- `npm run build`：通过。
- `npm run build:electron`：通过（含 `dist-electron/asrWorker.cjs` 产物）。
- `npx eslint ...`（Phase 4 变更文件）：通过。

## 当前边界

- 当前 worker 已返回结构化 `cues/events`，但 `cues` 仍为会话层占位输出；真实识别结果接线待 Phase 5 的音频抓取与字幕渲染链路联调。
