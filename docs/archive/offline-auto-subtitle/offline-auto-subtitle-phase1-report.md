# 离线自动字幕 Phase 1 执行记录

Last updated: 2026-02-17

关联方案：`docs/offline-auto-subtitle-implementation-plan.md`

## 本阶段目标

- 落地可选组件安装的工程基础。
- 提供主进程可查询的“离线自动字幕引擎状态”能力。
- 在运行时能力矩阵补充自动字幕引擎/DirectML 状态。

## 本次已完成改动

1. 新增离线引擎探测模块：`electron/subtitles/subtitleEngineProbe.ts`
   - 探测 optional component 根目录。
   - 探测 `sherpa-onnx-node` 加载状态（优先 optional component，再回退 node_modules）。
   - 探测 DirectML 相关 artifact。
2. 扩展系统能力服务：`electron/services/file-system-read/runtimeDependencyService.ts`
   - 新增 `readSubtitleEngineStatus()`。
   - 在 `readRuntimeCapabilities()` 的 `minimum_matrix` 增加两项：
     - 离线自动字幕引擎（可选组件）
     - 离线自动字幕加速（DirectML）
3. 新增后端合约与 IPC 通道：
   - 合约：`src/contracts/backend.ts`
   - channel：`electron/channels.ts`
   - handler：`electron/registerBackendIpcHandlers.ts`
   - preload：`electron/preload.ts`
   - 类型：`src/backend-api.d.ts`
   - repository：`src/features/backend/repository/types.ts`、`src/features/backend/repository/realRepository.ts`
4. 落地可选组件打包基础：
   - 组件打包预处理脚本：`scripts/prepare-offline-subtitles-component.mjs`
   - pack 脚本接入：`scripts/electron-pack.mjs`
   - electron-builder 配置：`electron-builder.config.cjs`
     - 主包排除 `sherpa-onnx*`
     - 通过 `extraResources` 注入 optional component
    - NSIS 自定义安装提示：`build/installer.nsh`
      - 安装时弹出“Install optional Offline Auto Subtitles module?” Yes/No
      - 选择 No 时清理 `$INSTDIR/resources/optional/offline-subtitles`

## 当前结论

- 开发态：`sherpa-onnx-node` 已可直接加载（source=`node-modules`）。
- 发行态：已具备“主包剥离 + optional component 注入 + 安装时勾选”基础能力。
- DirectML：当前探测逻辑已落地，但是否 available 依赖实际组件内容与目标环境。

## 已执行验证

1. `npx eslint ...`（本阶段改动文件）通过。
2. `npm run test -- src/features/backend/repository/realRepository.test.ts electron/fileSystemReadService.test.ts` 通过。
3. `npm run build:electron` 通过。
4. `npm run subtitle:prepare-component` 成功生成：`release/offline-subtitles-component`。
5. `npm run desktop:pack:unsigned` 通过，NSIS 安装包构建成功。

## Phase 1 Checklist（执行态）

- [x] 安装器新增可选组件入口（NSIS 安装提示）
- [x] 组件目录约定并接入打包链路
- [x] Main 新增引擎状态探测接口（含 provider 候选）
- [x] 运行时能力矩阵追加自动字幕相关状态项
- [ ] packaged 实机回归（安装勾选/不勾选两条路径）

## 待验证项（进入下一轮）

1. 执行 `desktop:pack` 产物验证：
   - 勾选安装：目录存在，`readSubtitleEngineStatus.installed=true`。
   - 不勾选安装：目录不存在，状态回落 unavailable（或 dev fallback）。
2. 验证升级安装覆盖行为：
   - 从“勾选安装”升级到“不勾选安装”时目录清理是否正确。
3. 验证 runtime capabilities 面板显示是否与新矩阵项一致。
