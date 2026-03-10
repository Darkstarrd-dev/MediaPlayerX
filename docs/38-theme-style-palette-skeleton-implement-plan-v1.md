# Theme Style × Palette Skeleton 分阶段实施计划 v1

## 1. 目标

- 将当前“`soft-skeuomorphic` 既是默认 style、又事实承担基础架构”的状态，重构为“隐藏 skeleton 基础层 + 公开 style 皮肤层”。
- 将当前“palette 近似全局共享”的状态，重构为“palette 属于 style family，一个 style 可拥有多个 palette，但 palette 不跨 style 共享”。
- 保持当前元素结构、UI 布局、交互行为不变；优先冻结相对位置、尺寸、gap、padding、splitter、header 组宽等几何骨架。
- 让 `Soft Skeuomorphic` 仍作为默认 style，切回后视觉与当前实现保持一致。
- 让 `TestStyle` 成为空壳实验 style，仅用于验证最小 skeleton style 是否完整；同时为其提供唯一公开测试 palette。

## 2. 最终目标架构

### 2.1 层级

```css
@layer contract, palette-base, palette, theme-skeleton, theme-style, app-base, app-layout, app-component, app-state;
```

职责：

1. `contract`：协议默认值与全量 fallback。
2. `palette-base`：隐藏最小骨架 palette，仅提供中性基础颜色，不对外暴露。
3. `palette`：公开 palette，且必须绑定到某个 style family。
4. `theme-skeleton`：隐藏最小骨架 style，仅负责几何骨架与零装饰外观。
5. `theme-style`：公开 style 的视觉皮肤层。
6. `app-*`：业务样式层，只消费中性 token，不再直连 `soft-skeuomorphic` 或 `--mpx-skeuo-*`。

### 2.2 公开/隐藏对象

- 隐藏 style：`_skeleton.css`
- 隐藏 palette：`_palette-base.css`
- 默认公开 style：`soft-skeuomorphic`
- 默认公开 palette：`skeuomorphic-luxury-white`
- 实验公开 style：`TestStyle`
- `TestStyle` 唯一公开测试 palette：`test-skeleton`

### 2.3 公开行为

- `Soft Skeuomorphic` + `skeuomorphic-luxury-white`：视觉与当前版本一致。
- `TestStyle` + `test-skeleton`：只显示“隐藏 skeleton style + 隐藏 skeleton palette + app 中性 token”的结果；`TestStyle` 自身不定义任何额外视觉规则。
- 切换 style 时，palette 列表只显示该 style family 自己的 palette。

## 3. 关键原则

1. **先抽骨架，再抽皮肤**：优先迁移几何 token，不先追求视觉纯度。
2. **palette 不跨 style 共享**：运行时与 CSS 选择器两侧都要落地，不只做 JS allowlist。
3. **app 层只吃中性 token**：不得继续出现 `:root[data-mpx-style^="soft-skeuomorphic"]` 这类直连。
4. **每个 Phase 独立闭环**：只读取本 Phase 指定文件；完成后必须最小验证、回填、提交。
5. **不一次性读取大上下文**：新对话默认只做“最早未完成 Phase”。

## 4. 新对话启动提示词

将以下提示词直接粘贴到新对话：

```text
请读取 `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`，只执行“最早未完成的一个 Phase”。

执行要求：
1. 先阅读该 Phase 的“先读文件”，不要额外扩散读取无关上下文。
2. 仅修改该 Phase “涉及文件”内必要内容；不要跨 Phase 提前改后续文件，除非该 Phase 明确允许。
3. 完成后必须执行该 Phase 的“最小验证”。
4. 验证通过后，必须按该 Phase 的“回填要求”更新文档状态与记录。
5. 最后创建一个 git commit，commit message 使用中文 Conventional Commits。
6. 回复时给出：变更文件、验证结果、回填位置、commit hash、下一 Phase 建议。

如果当前 Phase 被阻塞：先完成所有非阻塞部分，再在该 Phase 的“阻塞记录”中写明原因，不要擅自跨到下一 Phase。
```

## 5. 目录与命名约定

### 5.1 style

- 公开 style：`src/styles/themes/styles/<style-id>.css`
- 隐藏 skeleton style：`src/styles/themes/styles/_skeleton.css`

### 5.2 palette

- 公开 palette 建议按 family 放目录：
  - `src/styles/themes/palettes/soft-skeuomorphic/skeuomorphic-luxury-white.css`
  - `src/styles/themes/palettes/test-style/test-skeleton.css`
- 隐藏 skeleton palette：`src/styles/themes/palettes/_palette-base.css`

### 5.3 registry 元数据目标

建议最终形成：

```ts
interface PaletteInfo {
  id: string
  label: string
  styleId: string
}
```

说明：

- `styleId` 由 palette 所在 family 目录或显式映射解析，不再是假定“全局 palette 池”。
- 允许隐藏 palette/style 文件存在，但不对 settings 列表暴露。

## 6. 骨架/皮肤边界

### 6.1 必须进入 skeleton 的几何骨架

- `--mpx-layout-padding`
- `--mpx-splitter-width`
- `--mpx-panel-padding`
- `--mpx-pane-frame-padding`
- `--mpx-pane-stack-gap`
- `--mpx-pane-section-gap`
- `--mpx-sidebar-padding`
- `--mpx-main-padding`
- `--mpx-metadata-padding`
- `--mpx-header-floating-gap`
- `--mpx-header-btn-size`
- `--mpx-header-btn-padding-x`
- `--mpx-header-icon-size`
- `--mpx-header-group-gap`
- `--mpx-header-item-gap`
- `--mpx-header-modes-base-width`
- `--mpx-header-group-modes-width`
- `--mpx-header-group-search-width`
- `--mpx-header-music-actions-width`
- `--mpx-header-music-actions-reserve`
- transport / runway 的按钮尺寸、图标尺寸、中心 gap、面板宽高、thumb 尺寸

### 6.2 skeleton 必须清零的复杂视觉

- 圆角：`0`
- 阴影：`none`
- 渐变：纯色回退
- `backdrop-filter`：`none`
- `transition` / `animation`：`none`
- hover / active transform：`none`
- 装饰性 halo / sheen / glow：全部移出

### 6.3 soft-skeuomorphic 最终只保留

- 圆角
- 阴影
- 渐变
- 质感边框
- hover / active 皮肤
- transport / runway 的视觉皮肤
- image-grid / fullscreen / shell 等专项视觉实现

## 7. Phase 总览

| Phase | 名称 | 目标 | 预计提交类型 |
|---|---|---|---|
| Phase 1 | Registry 与层级脚手架 | 建立 style family / palette family / skeleton 层入口 | `refactor(theme)` |
| Phase 2 | Skeleton Palette 与 Test Family | 建立隐藏最小 palette、公开 `TestStyle + test-skeleton` family | `feat(theme)` |
| Phase 3 | 主布局/Header 几何骨架迁移 | 抽离 layout/header/pane 几何，保持主界面位置不变 | `refactor(theme)` |
| Phase 4 | Transport/Runway 几何骨架迁移 | 抽离进度条/音量/transport 尺寸骨架 | `refactor(theme)` |
| Phase 5 | App 层去 soft 直连 | 解除 app 对 `soft-skeuomorphic` selector 与 `--mpx-skeuo-*` 的依赖 | `refactor(theme)` |
| Phase 6 | 收口、验收与文档同步 | 保证 soft 视觉等价、TestStyle 空壳有效、文档/测试/索引收口 | `test(theme)` 或 `docs(theme)` |

---

## Phase 1 - Registry 与层级脚手架

### 目标

- 为 style family / palette family 建立运行时模型。
- 在 CSS 入口中引入 `palette-base`、`theme-skeleton` 两个隐藏层。
- 搭建隐藏 `_palette-base.css`、`_skeleton.css` 文件占位，但暂不大规模迁移 token。

### 先读文件

1. `src/features/theme/themeRegistry.ts`
2. `src/features/theme/themeRegistry.test.ts`
3. `src/styles/themes/index.css`
4. `src/index.css`
5. `docs/08-theme-system-v2.md`
6. `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`

### 涉及文件

- `src/features/theme/themeRegistry.ts`
- `src/features/theme/themeRegistry.test.ts`
- `src/styles/themes/index.css`
- `src/index.css`
- `src/styles/themes/palettes/_palette-base.css`（新增）
- `src/styles/themes/styles/_skeleton.css`（新增）

### 完成定义

- `themeRegistry` 可识别“palette 属于哪个 style”。
- 隐藏 `_palette-base.css` 与 `_skeleton.css` 不出现在 style/palette 列表中。
- 层级顺序已扩展，但不改变当前默认视觉结果。

### 最小验证

```bash
npx vitest run src/features/theme/themeRegistry.test.ts
npm run build
```

### 通过后回填

- 更新 `docs/08-theme-system-v2.md` 的层级图与 style/palette 绑定口径。
- 在本文“Phase 记录”中填写验证结果与 commit hash。

### 提交要求

- 推荐提交信息：`refactor(theme): 引入 style family registry 与 skeleton 层脚手架`

### Phase 记录

- [x] 已完成
- 验证命令：`npx vitest run src/features/theme/themeRegistry.test.ts`；`npm run build`
- 验证结果：通过
- 回填文件：`docs/08-theme-system-v2.md`
- 提交 hash：待提交
- 阻塞记录：

---

## Phase 2 - Skeleton Palette 与 Test Family

### 目标

- 建立隐藏最小 palette。
- 将 `TestStyle` 改为空壳 style。
- 为 `TestStyle` 提供唯一公开 palette：`test-skeleton`。
- settings 切换到 `TestStyle` 时，palette 列表只显示 `test-skeleton`。

### 先读文件

1. `src/styles/themes/contract.css`
2. `src/styles/themes/palettes/_palette-template.css`
3. `src/styles/themes/palettes/skeuomorphic-luxury-white.css`
4. `src/styles/themes/styles/TestStyle.css`
5. `src/features/theme/themeRegistry.ts`
6. `src/features/app/buildSettingsPanelProps.ts`
7. `src/features/app/buildSettingsPanelProps.test.ts`
8. `src/__tests__/App.settings.test.tsx`

### 涉及文件

- `src/styles/themes/palettes/_palette-base.css`
- `src/styles/themes/palettes/test-style/test-skeleton.css`（新增）
- `src/styles/themes/palettes/soft-skeuomorphic/skeuomorphic-luxury-white.css`（若本 Phase 选择同步搬目录）
- `src/styles/themes/styles/TestStyle.css`
- `src/styles/themes/index.css`
- `src/features/theme/themeRegistry.ts`
- `src/features/theme/themeRegistry.test.ts`
- `src/features/app/buildSettingsPanelProps.test.ts`
- `src/__tests__/App.settings.test.tsx`

### 完成定义

- `TestStyle.css` 不再定义额外视觉 token，仅保留空壳 selector。
- `test-skeleton` 作为 `TestStyle` 的唯一公开 palette 生效。
- 当前默认 `soft-skeuomorphic + skeuomorphic-luxury-white` 不变。

### 最小验证

```bash
npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx
```

### 人工验证

- 打开 settings，切换到 `TestStyle`。
- 确认 palette 下拉仅剩 `test-skeleton`。
- 确认页面未崩溃，`document.documentElement.dataset.mpxStyle === "TestStyle"`。

### 通过后回填

- 在本文记录 `TestStyle` / `test-skeleton` 首轮可切换结果。
- 更新 `docs/08-theme-system-v2.md` 的 palette family 规则。

### 提交要求

- 推荐提交信息：`feat(theme): 引入 TestStyle 空壳链路与 test-skeleton 调试 palette`

### Phase 记录

- [x] 已完成
- 验证命令：`npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx`
- 验证结果：通过
- 人工验证结论：未单独执行 Electron 人工检查；已通过 settings 集成测试验证 `TestStyle` 切换后 palette 列表仅剩 `test-skeleton`，且 `document.documentElement.dataset.mpxStyle === "TestStyle"`
- 回填文件：`docs/08-theme-system-v2.md`
- 提交 hash：待提交
- 阻塞记录：

---

## Phase 3 - 主布局/Header 几何骨架迁移

### 目标

- 将 layout/header/pane 的关键几何从 `soft-skeuomorphic` 抽到隐藏 `_skeleton.css`。
- 让 `TestStyle` 在三栏主界面与 settings 主骨架下保持相对位置、尺寸、padding、splitter 不变。

### 先读文件

1. `src/styles/themes/styles/soft-skeuomorphic.css`
2. `src/styles/app/layout/layout.part1.css`
3. `src/styles/app/layout/layout.part2.css`
4. `src/styles/app/sidebar.css`
5. `src/styles/app/main/main.part1.css`
6. `src/styles/app/metadata.css`
7. `docs/08-theme-system-v2.md`

### 涉及文件

- `src/styles/themes/styles/_skeleton.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/layout/layout.part2.css`
- 仅当需要中性 token 接口时：`src/styles/app/sidebar.css`、`src/styles/app/main/main.part1.css`、`src/styles/app/metadata.css`

### 完成定义

- 这些几何 token 已进入 `_skeleton.css`：
  - `--mpx-layout-padding`
  - `--mpx-splitter-width`
  - `--mpx-panel-padding`
  - `--mpx-pane-frame-padding`
  - `--mpx-pane-stack-gap`
  - `--mpx-sidebar-padding`
  - `--mpx-main-padding`
  - `--mpx-metadata-padding`
  - `--mpx-header-floating-gap`
  - `--mpx-header-btn-size`
  - `--mpx-header-group-gap`
  - `--mpx-header-item-gap`
  - `--mpx-header-modes-base-width`
  - `--mpx-header-group-search-width`
  - `--mpx-header-music-actions-width`
  - `--mpx-header-music-actions-reserve`
- `soft-skeuomorphic.css` 保留视觉皮肤，不再承担以上几何基础职责。

### 最小验证

```bash
npx vitest run src/__tests__/App.settings.test.tsx
npm run build
```

### 人工验证

- `Soft Skeuomorphic` 下主界面与当前版本无可见布局变化。
- `TestStyle` 下三栏主界面、Header、splitter、Settings 主骨架位置稳定。
- Header 中央模式组不偏移。

### 通过后回填

- 在本文记录“主布局/Header 骨架已抽离”的结论。
- 若新增了中性 token 名，回填 `docs/11-token_design.md`。
- 同步更新 `docs/08-theme-system-v2.md` 的 skeleton 示例与边界说明。

### 提交要求

- 推荐提交信息：`refactor(theme): 抽离主布局与 header 几何 skeleton`

### Phase 记录

- [x] 已完成
- 验证命令：`npx vitest run src/__tests__/App.settings.test.tsx`；`npm run build`
- 验证结果：通过
- 人工验证结论：未单独执行 Electron 人工检查；自动验证确认 settings 主链路正常，构建通过，默认 soft 视觉未出现构建级回归
- 回填文件：`docs/08-theme-system-v2.md`
- 提交 hash：待提交
- 阻塞记录：

---

## Phase 4 - Transport/Runway 几何骨架迁移

### 目标

- 将 transport / runway 的尺寸骨架从 `soft-skeuomorphic` 抽到 skeleton。
- 让 `TestStyle` 下播放器控件仅失去皮肤，不改变尺寸与排布。

### 先读文件

1. `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
2. `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
3. `src/styles/themes/styles/soft-skeuomorphic.runway.css`
4. `src/styles/app/base.css`
5. `src/styles/app/main/main.part3.css`
6. `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`

### 涉及文件

- `src/styles/themes/styles/_skeleton.css`
- `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.runway.css`
- 如需中性 token 消费口：`src/styles/app/base.css`、`src/styles/app/main/main.part3.css`

### 完成定义

- center group gap、按钮尺寸、图标尺寸、音量面板宽高、runway 高度/thumb 尺寸已进入 skeleton。
- `soft-skeuomorphic.*transport*.css` 与 `runway.css` 仅保留视觉皮肤。
- `TestStyle` 下 transport 不发生错位、挤压、按钮溢出。

### 最小验证

```bash
npm run build
```

### 人工验证

- 非全屏 video/music transport 中心组尺寸正常。
- 全屏 transport 中按钮组、图标、音量面板尺寸正常。
- `TestStyle` 下 runway 仍可拖拽，thumb 命中区域正常。

### 通过后回填

- 在本文记录 transport / runway 骨架抽离结论。
- 若新增了 runway / transport 中性 token，回填 `docs/11-token_design.md`。

### 提交要求

- 推荐提交信息：`refactor(theme): 抽离 transport 与 runway 几何 skeleton`

### Phase 记录

- [x] 已完成
- 验证命令：`npm run build`
- 验证结果：通过
- 人工验证结论：未单独执行 Electron 人工检查；已完成构建级验证，transport / runway 几何 token 已转入 skeleton 层，默认 soft 皮肤构建正常
- 回填文件：`docs/38-theme-style-palette-skeleton-implement-plan-v1.md`
- 提交 hash：待提交
- 阻塞记录：

---

## Phase 5 - App 层去 soft 直连

### 目标

- 消除 app 层对 `soft-skeuomorphic` selector 与 `--mpx-skeuo-*` 的硬依赖。
- 所有业务样式仅消费中性 token。

### 先读文件

1. `src/styles/app/sidebar.css`
2. `src/styles/app/main/main.part1.css`
3. `src/styles/app/metadata.css`
4. `src/styles/app/base.css`
5. `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
6. `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`
7. `src/styles/themes/styles/soft-skeuomorphic.image-grid.css`

### 涉及文件

- `src/styles/app/sidebar.css`
- `src/styles/app/main/main.part1.css`
- `src/styles/app/metadata.css`
- `src/styles/app/base.css`
- `src/styles/themes/styles/_skeleton.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`
- `src/styles/themes/styles/soft-skeuomorphic.image-grid.css`

### 完成定义

- app 层不再出现 `:root[data-mpx-style^="soft-skeuomorphic"]` 作为主链路样式门。
- app 层不再直接 fallback 到 `--mpx-skeuo-*`。
- 所有必需视觉入口已抽象成中性 token，由 skeleton 或具体 style 提供值。

### 最小验证

```bash
npm run build
```

### 人工验证

- `Soft Skeuomorphic` 下 sidebar label、image-grid、metadata 主链路与当前视觉一致。
- `TestStyle` 下不会因为缺少 `soft-skeuomorphic` selector 而出现大块丢样式、错位或不可读区域。

### 通过后回填

- 在本文记录“app 层已去 soft 直连”的结论。
- 若新增通用 token，补 `docs/10-ui_definition.md` / `docs/11-token_design.md`。

### 提交要求

- 推荐提交信息：`refactor(theme): 移除 app 层对 soft 风格直连`

### Phase 记录

- [ ] 已完成
- 验证命令：
- 验证结果：
- 人工验证结论：
- 回填文件：
- 提交 hash：
- 阻塞记录：

---

## Phase 6 - 收口、验收与文档同步

### 目标

- 保证默认 `Soft Skeuomorphic` 视觉等价。
- 保证 `TestStyle + test-skeleton` 可作为“空壳 style + 最小 palette”诊断链路。
- 完成文档、索引、测试与计划回填收口。

### 先读文件

1. `docs/08-theme-system-v2.md`
2. `docs/01-README.md`
3. `docs/02-DOCS_INDEX.md`
4. `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`
5. `src/features/theme/themeRegistry.test.ts`
6. `src/features/app/buildSettingsPanelProps.test.ts`
7. `src/__tests__/App.settings.test.tsx`

### 涉及文件

- `docs/08-theme-system-v2.md`
- `docs/01-README.md`
- `docs/02-DOCS_INDEX.md`
- `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`
- 仍需补测时涉及：`src/features/theme/themeRegistry.test.ts`、`src/features/app/buildSettingsPanelProps.test.ts`、`src/__tests__/App.settings.test.tsx`

### 完成定义

- 文档口径已明确：palette 属于 style family，存在隐藏 skeleton style / palette。
- 本计划所有 Phase 记录已回填。
- `Soft Skeuomorphic` 与当前视觉保持一致；`TestStyle` 可稳定作为空壳诊断 style 使用。

### 最小验证

```bash
npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx
npm run build
```

### 人工验收清单

- [ ] `Soft Skeuomorphic + skeuomorphic-luxury-white` 主界面视觉与本计划开始前一致。
- [ ] `TestStyle + test-skeleton` 三栏主界面位置、尺寸、splitter、header 组宽稳定。
- [ ] `TestStyle + test-skeleton` settings/overlay/file-list 主链路可读。
- [ ] palette 列表严格随 style 切换，不出现跨 family palette。

### 通过后回填

- 将本文每个 Phase 的完成记录补齐。
- 更新 `docs/01-README.md` 与 `docs/02-DOCS_INDEX.md` 入口描述。
- 如有遗留缺口，另开新文档，不继续污染本计划范围。

### 提交要求

- 推荐提交信息：`docs(theme): 收口 skeleton 重构文档与验收记录`

### Phase 记录

- [ ] 已完成
- 验证命令：
- 验证结果：
- 人工验证结论：
- 回填文件：
- 提交 hash：
- 阻塞记录：

---

## 8. 当前已知高风险点

### 8.1 app 层直接绑 soft selector

- `src/styles/app/sidebar.css`
- 部分 `soft-skeuomorphic.components.part*.css` 与 `soft-skeuomorphic.image-grid.css`

风险：`TestStyle` 下会继续吃到 soft 专用规则或直接失效。

### 8.2 app 层直接绑 `--mpx-skeuo-*`

- `src/styles/app/main/main.part1.css`
- 其他 image-grid / sidebar 相关文件

风险：即使去掉 soft selector，仍会通过旧 token 偷渡 soft 视觉。

### 8.3 palette 里混入非颜色职责

- `src/styles/themes/palettes/skeuomorphic-luxury-white.css`

风险：palette 仍偷偷携带 shadow / transform / motion，导致 family 边界不干净。

### 8.4 transport/runway 同时混有尺寸与皮肤

- `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.runway.css`

风险：若不先抽尺寸，第一时间就会出现按钮错位、音量面板挤压、thumb 命中异常。

## 9. 非目标

- 本计划不追求首轮就完成“所有 style family 的全面扩展”；首轮仅完成 `soft-skeuomorphic` 与 `TestStyle` 两个 family。
- 本计划不要求首轮完成 palette 自动生成或 CSS import 自动收集；可继续使用显式入口导入，但 registry 与目录结构必须先正确。
- 本计划不顺带重构 `ThemeParameter` 全量 UI；仅在必要处补 token、测试与文档。

## 10. 完成判定

满足以下全部条件后，本计划才算完成：

1. 存在隐藏 skeleton style 与隐藏 skeleton palette。
2. `TestStyle` 是空壳 style，且仅绑定 `test-skeleton`。
3. `Soft Skeuomorphic` 默认视觉与当前版本一致。
4. palette 选择严格受 style family 限制。
5. app 层主链路不再直接依赖 `soft-skeuomorphic` selector 或 `--mpx-skeuo-*`。
6. 本文每个 Phase 均已完成、验证、回填、提交。
