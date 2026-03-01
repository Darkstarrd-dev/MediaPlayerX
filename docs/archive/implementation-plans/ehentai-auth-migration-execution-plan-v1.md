# E-Hentai 登录会话迁移执行计划 v1

## 目标

- 将元数据抓取鉴权从手动输入 `ehentai_cookies` 迁移到 Electron 会话登录。
- 采用双阶段发布：
  - P1：上线会话登录能力，保留旧 `ehentai_cookies` 兜底。
  - P2：移除旧手动 Cookie 流程，并补齐安全收口。

## P1 进展

- P1-1（完成）：新增外部鉴权 Provider 与会话管理器。
- P1-2（完成）：新增 IPC 通道、Schema、Preload 与前端类型桥接。
- P1-3（完成）：接入 metadata 抓取链路，优先使用会话 Cookie，保留 request fallback。
- P1-4（完成）：补齐测试与验证，并确认主流程可用。

## 已落地实现（P1）

- 主进程新增：
  - `electron/services/auth/externalAuthProviders.ts`
  - `electron/services/auth/externalAuthSessionManager.ts`
- IPC 扩展：
  - `externalAuthConnect`
  - `externalAuthDisconnect`
  - `externalAuthStatus`
- 抓取链路改造：
  - `MetadataScraperService` 支持 `session -> request -> default` Cookie 组合。
- 设置页改造：
  - 新增 E-Hentai 账号连接状态与连接/断开/刷新操作。
  - 保留手动 `E-Hentai Cookies` 输入，作为 P1 兼容通道。

## P2 进展

- P2-1（完成）：移除手动 `ehentai_cookies` request 字段与透传。
- P2-2（完成）：删除设置页手动 Cookie 输入及前端状态持久化字段。
- P2-3（完成）：收敛主图区 metadata 取数参数，去除 `metadataEhentaiCookies` 历史透传。
- P2-4（完成）：对外部鉴权 IPC 通道增加 renderer sender 信任校验。
- P2-5（完成）：补充 Electron fuses 安全配置（含 Cookie 加密等）。

## 验证记录

- 已通过（与本次变更直接相关）：
  - `npx vitest run electron/registerBackendIpcHandlers.test.ts src/features/app/buildSettingsPanelProps.test.ts`
  - `npx vitest run src/contracts/backend.schemas.management.test.ts`
- 额外新增测试：
  - `registerBackendIpcHandlers.externalAuthStatus`（connected/disconnected 两种状态）
  - `registerBackendIpcHandlers.externalAuthStatus`（新增 untrusted sender 拒绝用例）
- 当前工作区存在与本任务无关的并行改动，导致全量质量门禁暂未可用：
  - `npm run lint` 在 `scripts/export-app-states.tsx`、`scripts/out.cjs` 等文件报错（非本任务引入）。
  - `npx vitest run src/__tests__/App.metadata.test.tsx` 存在与本迁移无关的既有断言失败（跳转/检索结果相关）。

## P2 已落地实现

- 协议与抓取链路：
  - `src/contracts/backend.schemas.ts` 删除 `searchExternalMetadataRequestSchema.ehentai_cookies`。
  - `electron/services/metadata/metadataScraperService.ts` 删除 request cookie fallback，仅保留 `default + session` 合并。
- 设置与持久化：
  - `src/contracts/settings.ts`、`src/store/useUiStore.ts`、`src/features/app/usePersistedAppSettings.ts` 等移除 `ehentaiCookies`。
  - `src/components/settings/renderSettingsDatabaseSection.tsx` 删除手动 Cookie 输入 UI。
- 主图区与 metadata 面板：
  - `src/features/app/buildImageMainSectionProps.ts`、`src/components/ImageMainSection.types.ts` 等移除 `metadataEhentaiCookies`。
  - `src/components/metadata/MetadataFetchPanel.tsx` 请求体不再注入 `ehentai_cookies`。
- IPC 安全收口：
  - `electron/registerBackendIpcHandlers.ts` 增加 trusted sender 校验并应用到 `externalAuthConnect/Disconnect/Status`。
- 打包安全收口：
  - `electron-builder.config.cjs` 增加 `electronFuses`：
    - `runAsNode: false`
    - `enableCookieEncryption: true`
    - `enableNodeOptionsEnvironmentVariable: false`
    - `enableNodeCliInspectArguments: false`
    - `enableEmbeddedAsarIntegrityValidation: true`
    - `onlyLoadAppFromAsar: true`

## 当前状态

- 迁移目标已完成：metadata 鉴权入口统一为 Electron 会话登录，不再支持手动 Cookies。
- 安全收口已完成：敏感 auth IPC 限制 trusted renderer sender，且 Electron fuses 已配置。
- 回滚策略：若线上需紧急回退，仅建议回退到 P1 提交（保留 session 功能并恢复 cookie 兜底），避免部分回滚导致协议不一致。

## P2 预定动作

- 已全部完成，无未决动作。
