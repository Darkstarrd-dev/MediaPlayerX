# 离线自动字幕 Phase 2 执行记录

Last updated: 2026-02-17

关联方案：`docs/offline-auto-subtitle-implementation-plan.md`

## 本阶段目标

- 设置面板支持离线自动字幕开关、加速模式、模型目录、模型 ID。
- 新增设置项可持久化并在应用启动后恢复。
- 补齐中英文本地化 key，保证 i18n 校验通过。

## 本次已完成改动

1. 设置 schema 与默认值
   - `src/contracts/settings.ts`
   - `src/store/useUiStore.ts`
   - `src/features/app/useAppSettingsStore.ts`
   - `src/features/app/usePersistedAppSettings.ts`
   - 新增字段：
     - `subtitleFeatureEnabled`
     - `subtitleAcceleration` (`auto|cpu|directml`)
     - `subtitleModelDir`
     - `subtitleSelectedModelId`
2. 设置持久化与输入清洗
   - `src/features/app/useSettingsPersistence.ts`
   - 新增字段 hydration sanitize，避免非法值污染全量 settings 写回。
3. 设置面板 UI 与交互接线
   - `src/components/settings/renderSettingsMainSection.tsx`
   - `src/components/SettingsPanel.tsx`
   - `src/features/app/buildSettingsPanelProps.ts`
   - `src/features/app/useTopLayerSettingsActions.ts`
   - `src/features/app/useAppTopLayerState.ts`
   - 新增能力：
     - 离线自动字幕开关
     - 加速模式选择
     - 模型目录选择（调用 `pickDirectoryPath`）
     - 默认模型 ID 输入
4. i18n 与测试补齐
   - `src/i18n/locales/zh-CN.ts`
   - `src/i18n/locales/en-US.ts`
   - `src/features/app/buildSettingsPanelProps.test.ts`

## 已执行验证

1. `npx eslint ...`（本阶段改动文件）通过。
2. `npm run test -- src/features/app/buildSettingsPanelProps.test.ts src/features/app/useSettingsPersistence.test.tsx` 通过。
3. `npm run i18n:check` 通过（845 keys）。
4. `npm run build` 通过（`tsc -b` + `vite build`）。

## Phase 2 Checklist（完成态）

- [x] 设置项可编辑、可回显、可持久化。
- [x] schema 与 hydration 对非法值有拦截/清洗。
- [x] 设置面板已提供模型目录选择入口。
- [x] i18n 双语 key 补齐并通过校验。

## 阶段边界说明

- 本阶段仅落地“设置与基础 UI”。
- 模型清单拉取、下载任务、进度百分比/速度/ETA、proxy 下载前确认，归属 Phase 3。
