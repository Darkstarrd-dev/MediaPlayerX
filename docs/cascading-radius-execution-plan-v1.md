# Cascading Radius 执行计划 v1

## 目标

- 将当前圆角体系改造为“级联圆角 (cascading radius)”：内层圆角由外层圆角与间距参数自动推导。
- 采用已确认方案 **选项 1（推荐）**：
  - `inner = outer - (padding * factor)`
  - 默认 `factor = 0.35`
  - 默认 `cap = 8px`
  - 使用 `max(0px, calc(...))` 防止负值。

## 进度总览

- 当前状态：`已完成`
- 当前里程碑：`M5 完成`
- 完成度：`5/5 (100%)`
- 最近更新：`2026-03-01`

## 里程碑检查清单

- [x] M1：建立级联半径 Token（SSOT 层）
- [x] M2：App 样式第一批迁移（Sidebar/Main 关键链路）
- [x] M3：Header / Metadata 对齐（去硬编码）
- [x] M4：soft-skeuomorphic 覆盖收敛（避免回退硬编码）
- [x] M5：测试与文档同步

## 里程碑详情

### M1：建立级联半径 Token（SSOT 层）

**状态**：`done`

**文件**

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_style-template.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`

**任务**

- 新增级联圆角核心变量（`--mpx-radius-cascade-factor`、`--mpx-radius-cascade-cap` 等）。
- 新增 pane/card/thumb/sidebar/header 语义半径变量。
- 保留 `0 / 50% / 999px` 的非级联语义用例。

**完成标准**

- `panel/card/control/header` 调整后能驱动派生半径。
- 变量计算在极端值下不出现负半径。

### M2：App 样式第一批迁移（Sidebar/Main 关键链路）

**状态**：`done`

**文件**

- `src/styles/app/sidebar.css`
- `src/styles/app/manage.css`
- `src/styles/app/main/main.part1.css`

**任务**

- Sidebar 链路：`sidebar -> toolbar/button -> list label` 改为消费级联 token。
- Main 链路：`main panel -> card container -> thumbnail media` 改为消费级联 token。
- 同步管理态样式，避免同元素多套圆角逻辑。

**完成标准**

- 两条关键链路在 UI 中均可随参数联动。
- 不再依赖关键节点硬编码圆角。

### M3：Header / Metadata 对齐（去硬编码）

**状态**：`done`

**文件**

- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/app/metadata.css`

**任务**

- Header popover/group/button 内层半径改为语义 token。
- Metadata 常见 `8px/10px` 场景改为 metadata 级联 token。
- 保留显式 `0` 和胶囊语义不改。

**完成标准**

- Header/Metadata 关键控件半径联动一致。
- 无明显视觉回归（尖角突变、层级错位）。

### M4：soft-skeuomorphic 覆盖收敛（避免回退硬编码）

**状态**：`done`

**文件**

- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part3.css`
- `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`

**任务**

- 替换会覆盖主链路的固定圆角值。
- 对必须保留的造型圆角（如单侧圆角）改为“基于 token 组合”。
- 确保 soft-skeuo 不把主链路改造结果回滚。

**完成标准**

- soft-skeuo 下关键链路仍保持级联联动。
- 不出现风格断裂。

### M5：测试与文档同步

**状态**：`done`

**文件**

- `src/components/ThemeParameterPanel.test.tsx`
- `src/__tests__/App.settings.test.tsx`
- `docs/theme-system-v2.md`
- `docs/theme-brainstorm-entry.md`

**任务**

- 补充 Theme Parameter 与 App 设置联动测试。
- 文档新增“级联圆角 token 与计算规则”说明。
- 执行验证命令：`npm run lint`、`npm run test`、`npm run build`。

**完成标准**

- 测试通过，构建通过。
- 文档与实现一致。

## 执行顺序（固定）

1. M1
2. M2
3. M3
4. M4
5. M5

## 进度更新规范

- 每完成一个里程碑，必须同步更新以下内容：
  - `进度总览`（状态、当前里程碑、完成度、最近更新）
  - `里程碑检查清单`（将对应项从 `[ ]` 改为 `[x]`）
  - 对应里程碑 `状态`（`pending -> in_progress -> done`）
  - `变更记录` 追加一条
- 禁止跨里程碑合并更新，避免上下文压缩导致状态丢失。

## 变更记录

- `2026-03-01`：创建执行计划文档，确认采用方案 1（比例扣减 + 上限）。
- `2026-03-01`：完成 M1，在 contract/style-template/soft-skeuomorphic 中落地级联圆角核心 token。
- `2026-03-01`：完成 M2，打通 Sidebar/Main 两条关键链路的级联半径消费。
- `2026-03-01`：完成 M3，Header/Metadata 关键圆角改为语义级联 token。
- `2026-03-01`：完成 M4，soft-skeuomorphic 关键覆盖改为消费级联语义 token。
- `2026-03-01`：完成 M5，已通过 `npm run lint`、`npm run test`、`npm run build` 验证。
