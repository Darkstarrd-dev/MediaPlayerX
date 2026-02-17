# 离线自动字幕 Phase 3 执行记录（模型目录/下载链路）

## 结论

- Phase 3 主体已落地：模型远端清单、模型本地扫描、下载任务、进度读取、取消下载、代理二次确认（UI）已接通。
- 主进程 IPC、preload bridge、renderer repository、设置面板 UI 已贯通。
- 已完成最小验证：`npm run build`、`npx vitest run src/features/app/buildSettingsPanelProps.test.ts`。

## 本阶段完成项

1. 后端契约（contract）扩展
   - 新增远端模型、已安装模型、下载任务等 DTO 与 zod schema。
   - 文件：`src/contracts/backend.ts`

2. 模型目录与下载服务
   - 新增远端模型清单：`electron/subtitles/subtitleModelCatalog.ts`
   - 新增模型服务：`electron/services/file-system-read/subtitleModelService.ts`
     - 远端清单读取
     - 本地模型目录扫描（含 manifest 与目录大小）
     - 下载任务创建/执行
     - 下载进度（百分比、速度、ETA）
     - 取消下载与任务查询

3. 主进程链路接入
   - channel 新增：`electron/channels.ts`
   - ipc handler 新增：`electron/registerBackendIpcHandlers.ts`
   - facade/system handlers 接线：
     - `electron/fileSystemReadFacade.ts`
     - `electron/facade/types.ts`
     - `electron/facade/FileSystemSystemHandlers.ts`

4. preload / renderer repository 接入
   - preload bridge：`electron/preload.ts`
   - renderer API 类型：`src/backend-api.d.ts`
   - repository 类型与 real 实现：
     - `src/features/backend/repository/types.ts`
     - `src/features/backend/repository/realRepository.ts`
   - mock repository 增补 mock 下载链路：
     - `src/features/backend/repository/mockRepository.ts`

5. 设置面板交互
   - 模型目录选择、模型列表刷新、下载、取消下载、下载状态展示。
   - 若检测到代理配置，下载前弹出是否使用代理确认。
   - 文件：
     - `src/features/app/useTopLayerSettingsActions.ts`
     - `src/features/app/useAppTopLayerState.ts`
     - `src/features/app/buildSettingsPanelProps.ts`
     - `src/components/SettingsPanel.tsx`
     - `src/components/settings/renderSettingsMainSection.tsx`
     - `src/i18n/locales/zh-CN.ts`
     - `src/i18n/locales/en-US.ts`

## 验证记录

- `npm run build`：通过。
- `npx vitest run src/features/app/buildSettingsPanelProps.test.ts`：通过。

## 已知限制 / 后续建议

- 当前下载链路已记录 `use_proxy/proxy_url`，但具体代理传输策略仍取决于运行时 fetch/代理注入方式；后续可补充统一下载代理适配层。
- 模型下载完整性目前支持可选 SHA256 校验（取决于清单是否提供 hash）。
- Phase 4 建议开始接入“自动字幕任务执行链路”（将已下载模型与播放器字幕生成会话打通）。
