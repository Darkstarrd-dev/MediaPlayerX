# 音乐可视化 Shader 极简入口

用途：在新对话中快速启动 Shader 开发/修改任务，减少无关目录扫描。

## 使用顺序

1. 先阅读：`docs/music-visualizer-shader-entry.md`（本文件）
2. 再阅读：`docs/music-visualizer-shader-migration-playbook.md`（完整契约与排障）

## 建议读取范围（最小集）

- `src/features/music-visualizer/`
- `src/components/MusicMainSection.tsx`
- `src/features/app/buildMusicMainSectionProps.ts`
- `src/features/app/useSettingsPersistence.ts`
- `src/store/useUiStore.ts`
- `src/contracts/settings.ts`

## 新对话提示词模板

```text
请先阅读并严格遵循：
1) docs/music-visualizer-shader-entry.md
2) docs/music-visualizer-shader-migration-playbook.md

本次任务只允许优先查看以下路径：
- src/features/music-visualizer/
- src/components/MusicMainSection.tsx
- src/features/app/buildMusicMainSectionProps.ts
- src/features/app/useSettingsPersistence.ts
- src/store/useUiStore.ts
- src/contracts/settings.ts

目标：<填写本次 shader 开发/修改目标>
约束：
- 非必要不要遍历其他目录。
- 保持现有运行时契约（multi-pass、tone mapping、GPU/CPU fallback）。
- 变更后运行最小回归：
  npm run test -- src/features/music-visualizer/shaderRegistry.test.ts src/features/music-visualizer/useMusicVisualizerRuntime.test.tsx src/components/MusicMainSection.test.tsx
```

## 任务完成检查

- Shader 注册与选择可用。
- 参数面板行为与运行时一致。
- 分层合成与单层/透明边界行为不回退。
- 上述最小回归测试通过。
