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
- P1-4（进行中）：补齐测试与验证。

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

## 验证记录

- 已通过（与本次变更直接相关）：
  - `npx vitest run electron/registerBackendIpcHandlers.test.ts src/features/app/buildSettingsPanelProps.test.ts`
  - `npx vitest run src/contracts/backend.schemas.management.test.ts`
- 额外新增测试：
  - `registerBackendIpcHandlers.externalAuthStatus`（connected/disconnected 两种状态）
- 当前工作区存在与本任务无关的并行改动，导致全量质量门禁暂未可用：
  - `npm run lint` 在 `scripts/export-app-states.tsx`、`scripts/out.cjs` 等文件报错（非本任务引入）。
  - `npx vitest run src/__tests__/App.settings.test.tsx` 失败，且日志显示与音频转码设置字段及调试按钮行为有关（非本任务直接改动点）。

## P2 预定动作

- 删除设置中的手动 `ehentai_cookies` 输入与后端 request fallback 透传。
- 统一仅允许会话鉴权链路。
- 增加 Electron fuse 安全配置（含 Cookie 加密项）。
- 补齐迁移说明与回滚策略。
