# Theme System 优化实施方案

## 背景与动机

当前 Theme 系统已完成从背景层（1.0）到大容器壳层（2.0-2.4）、大面板层（3.0）、按钮层（4.0）、小面板层（5.0）、控件层（6.x）的 token 化。但存在三个结构性问题：

1. **CSS 级联依赖加载顺序和 !important**：全项目约 217 处 `!important`，集中在 `button-template.css`（65）、`settings.part1.css`（62）、`manage.css`（44）、`base.css`（20）、`metadata.css`（17）等文件中。根因是缺乏显式的级联分层机制。
2. **面板内部件缺乏系统化的三级派生 token**：Settings 面板的 side 导航/main 内容区、Metadata 面板的 edit-grid/preference-record/tag 编辑区、Main 区的 image-grid/video/music-visualizer 仍使用直接语义色或硬编码值，无法独立调参。
3. **残留硬编码色值**：`manage.css` 的 ad-review overlay、`sidebar.css` 的渐变混合、`main.part2.css` 的 music-visualizer HUD 等约 40+ 处硬编码 `#xxx` / `rgba()` 色值。

本方案分 6 个 Phase 逐步解决，先迁移 `@layer` 架构，再补齐三级派生 token 并接入 ThemeParameter 面板。

---

## 当前 CSS 加载顺序

```
main.tsx → src/index.css
  └─ @import themes/index.css
       ├─ contract.css                              （SSOT，~1400 行）
       ├─ palettes/skeuomorphic-luxury-white.css    （色板）
       ├─ styles/soft-skeuomorphic.css              （风格主文件）
       ├─ styles/soft-skeuomorphic.components.css   （3 个 part）
       ├─ styles/soft-skeuomorphic.main-transport.css
       ├─ styles/soft-skeuomorphic.fullscreen-transport.css
       ├─ styles/soft-skeuomorphic.fullscreen-shell.css
       ├─ styles/soft-skeuomorphic.runway.css
       └─ styles/soft-skeuomorphic.image-grid.css

App.tsx → src/App.css
  ├─ base.css                   （全局基础 + scrollbar）
  ├─ layout.css                 （4 parts）
  ├─ sidebar.css
  ├─ main.css                   （4 parts）
  ├─ metadata.css
  ├─ settings.css               （3 parts）
  ├─ vector.css
  ├─ manage.css
  ├─ responsive.css
  ├─ components/subtitles.css
  └─ button-template.css        （按钮状态机最终裁决）
```

## @layer 目标分层

```css
@layer contract, palette, theme-style, app-base, app-layout, app-component, app-state;
```

| Layer | 内容 | 优先级 |
|-------|------|--------|
| `contract` | contract.css（SSOT token 默认值） | 最低 |
| `palette` | palettes/*.css（色板覆盖） | ↑ |
| `theme-style` | styles/soft-skeuomorphic*.css（风格覆盖） | ↑ |
| `app-base` | base.css（全局基础 + scrollbar + 控件标准化） | ↑ |
| `app-layout` | layout.css + sidebar.css + main.css + metadata.css | ↑ |
| `app-component` | settings.css + manage.css + vector.css + subtitles.css | ↑ |
| `app-state` | responsive.css + button-template.css（状态机最终裁决） | 最高 |

## 三级派生模型

```
Level 0 — 壳层 token（已有）
  例: --mpx-large-panel-bg

Level 1 — 面板 token（contract.css 中定义，var() 继承 L0）
  例: --mpx-settings-panel-bg: var(--mpx-large-panel-bg);

Level 2 — 内部件 token（contract.css 中定义，var() 继承 L1）
  例: --mpx-settings-group-bg: var(--mpx-settings-panel-bg);
```

**断开继承**：任意层级可在 Style/Palette 中直接赋值，覆盖 `var()` fallback。

---

## Phase 1: @layer 基础架构 — 声明层序 + 主题层包装

### 目标

在入口文件声明 `@layer` 顺序，将主题系统的 3 层（contract / palette / theme-style）包装进对应 layer。验证 Vite + Electron 构建链正常工作。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/index.css` | 添加 `@layer` 顺序声明，修改 import 语法 |
| `src/styles/themes/index.css` | 拆解 import 到带 layer 的形式 |
| `src/styles/themes/contract.css` | 在文件内包裹 `@layer contract { ... }` |
| `src/styles/themes/palettes/skeuomorphic-luxury-white.css` | 包裹 `@layer palette { ... }` |
| `src/styles/themes/styles/soft-skeuomorphic.css` | 包裹 `@layer theme-style { ... }` |
| `src/styles/themes/styles/soft-skeuomorphic.components.css` | 包裹 `@layer theme-style { ... }` |
| `src/styles/themes/styles/soft-skeuomorphic.main-transport.css` | 同上 |
| `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css` | 同上 |
| `src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css` | 同上 |
| `src/styles/themes/styles/soft-skeuomorphic.runway.css` | 同上 |
| `src/styles/themes/styles/soft-skeuomorphic.image-grid.css` | 同上 |

### TODO

- [ ] 在 `src/index.css` 顶部添加全局 layer 顺序声明
- [ ] 验证 Vite 对 `@import url(...) layer(xxx)` 的支持：
  - 首选方案 A：`@import './themes/contract.css' layer(contract);`
  - 回退方案 B：在各文件内部用 `@layer xxx { ... }` 包裹全部内容
- [ ] 将 `themes/index.css` 中的 import 链改为带 layer 标注的形式
- [ ] 将 contract.css 内容包裹进 `@layer contract { :root { ... } }`
- [ ] 将 palette 文件内容包裹进 `@layer palette { :root[...] { ... } }`
- [ ] 将所有 soft-skeuomorphic*.css 文件内容包裹进 `@layer theme-style { ... }`
- [ ] 验证 `:root[data-mpx-style="..."]` 选择器在 `@layer` 内正常工作

### CHECK

- [ ] `npm run build` 通过
- [ ] `npm run dev:desktop` 启动后视觉与包装前完全一致（逐面板比对）
- [ ] DevTools → Styles 面板中规则显示 layer 标注
- [ ] `npm run lint` 0 warning
- [ ] `npm run test` 全部通过

### 测试命令

```bash
npm run build && npm run lint && npm run test
npm run dev:desktop  # 手动视觉比对：header / sidebar / main / metadata / settings / fullscreen
```

---

## Phase 2: @layer 应用层迁移 + !important 消除

### 目标

将应用层 CSS（`src/styles/app/`）包装进对应 layer，利用 layer 优先级关系消除全部 ~217 处 `!important`。

### 涉及文件

| 文件 | Layer | !important 数量 |
|------|-------|----------------|
| `src/App.css` | 入口修改 | — |
| `src/styles/app/base.css` | `app-base` | 20 |
| `src/styles/app/button-template.css` | `app-state` | 65 |
| `src/styles/app/layout/layout.part1-4.css` | `app-layout` | 3 |
| `src/styles/app/sidebar.css` | `app-layout` | 0 |
| `src/styles/app/main/main.part1-4.css` | `app-layout` | 0 |
| `src/styles/app/metadata.css` | `app-layout` | 17 |
| `src/styles/app/settings/settings.part1-3.css` | `app-component` | 68 |
| `src/styles/app/vector.css` | `app-component` | 0 |
| `src/styles/app/manage.css` | `app-component` | 44 |
| `src/styles/app/responsive.css` | `app-state` | 0 |
| `src/components/subtitles.css` | `app-component` | 0 |

### TODO

- [ ] 在 `src/App.css` 中为每个 `@import` 标注所属 layer（方案 A）或在各文件内包裹（方案 B）
- [ ] **button-template.css**（65 处）：放入 `app-state` 层后，其规则自然覆盖 `app-layout`/`app-component` 中的同源规则，逐个删除 `!important`，验证以下按钮状态：
  - idle / hover / active / pressed / disabled / danger-hover / is-active
  - player variant（video-action-btn, fullscreen-action-btn）
  - overlay-cell variant
- [ ] **settings.part1.css**（62 处）：预览模式节点隐藏（`[data-mpx-theme-debug-preview]` 选择器的 opacity/pointer-events）在 `app-component` 层中，目标元素样式源在 `app-layout` 层，`!important` 可移除
  - overlay-cell-btn 中和规则：确认在同层内特殊性足够
- [ ] **manage.css**（44 处）：按钮状态覆盖，在 `app-component` 层中，特殊性低于 `app-state` 层的 button-template，`!important` 可移除
  - ad-review overlay 的按钮覆盖需单独验证
- [ ] **base.css**（20 处）：scrollbar 按钮隐藏（`::-webkit-scrollbar-button`）在 `app-base` 层，同层内无竞争源，`!important` 可移除
- [ ] **metadata.css**（17 处）：面板按钮覆写，同 manage.css 逻辑
- [ ] **layout.part2/3.css**（3 处）：零星特殊情况，逐个分析
- [ ] **settings.part2/3.css**（6 处）：转码/重命名对话框阴影覆盖
- [ ] 如果同层内仍有特殊性竞争，使用 `:where()` 降低低优先级侧的特殊性，而非恢复 `!important`

### CHECK

- [ ] 全项目 `!important` 数量为 **0**（`grep -r '!important' src/styles/ src/components/subtitles.css | wc -l` 返回 0）
- [ ] 所有面板中按钮状态正确（header/sidebar/main/metadata/settings/video/fullscreen）
- [ ] scrollbar 在所有面板中正常显示/隐藏
- [ ] Theme 预览模式（bg-only / bg-plus-container / bg-plus-fg）正常切换
- [ ] `npm run build` 通过
- [ ] `npm run lint` 0 warning
- [ ] `npm run test` 全部通过

### 测试命令

```bash
npm run build && npm run lint && npm run test
grep -r '!important' src/styles/ src/components/subtitles.css | wc -l  # 应为 0
npm run dev:desktop  # 全面视觉回归：逐面板、逐按钮状态检查
```

---

## Phase 3: 三级派生 — Settings 面板内部件 token 化 + ThemeParameter

### 目标

为 Settings 面板的 side 导航和 main 内容区建立 Level 1 / Level 2 token，注册到 ThemeParameter 调参面板，实现可调试。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/styles/themes/contract.css` | 新增 Settings 面板 L1/L2 token（~20 个） |
| `src/styles/app/settings/settings.part1.css` | 消费新 token（替换硬编码/直接语义引用） |
| `src/styles/app/settings/settings.part2.css` | 消费新 token |
| `src/components/theme-parameter/themeParameterSnapshotCatalog.ts` | 注册色字段 |
| `src/components/theme-parameter/ThemeParameterLayerSections.tsx` | 添加 Settings 内部件 UI 分组 |
| `docs/11-token_design.md` | 补充 Settings 面板 token 条目 |

### TODO

**3a: 定义 Level 1 token（Settings 面板级）**

- [ ] 在 `contract.css` 中新增 Settings side 导航 token：
  ```
  --mpx-settings-side-bg           ← var(--mpx-large-panel-side-bg)
  --mpx-settings-side-text         ← var(--mpx-text-1)
  --mpx-settings-side-item-bg      ← transparent
  --mpx-settings-side-item-hover-bg ← var(--mpx-bg-hover)
  --mpx-settings-side-item-active-bg ← var(--mpx-bg-selected)
  --mpx-settings-side-item-active-text ← var(--mpx-accent)
  --mpx-settings-side-border       ← var(--mpx-large-panel-side-border-color)
  ```
- [ ] 在 `contract.css` 中新增 Settings main 内容区 token：
  ```
  --mpx-settings-main-bg           ← var(--mpx-large-panel-main-bg)
  --mpx-settings-main-text         ← var(--mpx-text-1)
  --mpx-settings-main-border       ← var(--mpx-large-panel-main-border-color)
  ```

**3b: 定义 Level 2 token（控件组/item 级）**

- [ ] 在 `contract.css` 中新增：
  ```
  --mpx-settings-group-border      ← var(--mpx-settings-main-border)
  --mpx-settings-group-head-text   ← var(--mpx-text-heading)
  --mpx-settings-group-head-bg     ← transparent
  --mpx-settings-item-label-text   ← var(--mpx-text-2)
  --mpx-settings-item-value-text   ← var(--mpx-settings-main-text)
  --mpx-settings-item-input-bg     ← var(--mpx-input-bg)
  --mpx-settings-item-input-border ← var(--mpx-input-border)
  --mpx-settings-danger-btn-bg     ← var(--mpx-status-danger-bg)
  --mpx-settings-danger-btn-border ← var(--mpx-status-danger-border)
  --mpx-settings-danger-btn-text   ← var(--mpx-status-danger-text)
  ```

**3c: CSS 消费侧改造**

- [ ] 在 `settings.part1.css` 中将 `.settings-side` 导航相关选择器切换到新 token
- [ ] 在 `settings.part1.css` / `settings.part2.css` 中将 `.settings-block` 控件组相关选择器切换到新 token
- [ ] 在 `settings.part2.css` 中将 `.settings-danger-btn` 切换到新 token

**3d: ThemeParameter 注册**

- [ ] 在 `themeParameterSnapshotCatalog.ts` 的 `SNAPSHOT_COLOR_FIELDS` 中注册约 20 个色字段
- [ ] 在 `ThemeParameterLayerSections.tsx` 中为 largePanelLayer 页添加 "Settings 内部件" 可折叠章节
- [ ] 验证调参面板中可实时修改新增 token，视觉即时反馈

**3e: 文档同步**

- [ ] 更新 `docs/11-token_design.md`，添加 Settings 面板 token 映射表

### CHECK

- [ ] Settings 面板 side 导航 hover/active 状态使用新 token
- [ ] Settings 面板 main 区域的控件组、group header、item 行使用新 token
- [ ] ThemeParameter 面板 → largePanelLayer 页可调节 Settings 内部件 token
- [ ] 快照导出包含新增色字段，导入后正确还原
- [ ] `npm run build` + `npm run lint` + `npm run test` 通过

### 测试命令

```bash
npm run build && npm run lint && npm run test
npm run dev:desktop  # 打开 ThemeParameter → largePanelLayer → Settings 内部件章节，逐项调参验证
```

---

## Phase 4: 三级派生 — Metadata 面板内部件 token 化 + ThemeParameter

### 目标

为 Metadata 面板的 edit-grid、preference-record 卡片、tag 编辑区定义 Level 1 / Level 2 token。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/styles/themes/contract.css` | 新增 Metadata 内部件 L1/L2 token（~15 个） |
| `src/styles/app/metadata.css` | 消费新 token |
| `src/components/theme-parameter/themeParameterSnapshotCatalog.ts` | 注册色字段 |
| `src/components/theme-parameter/ThemeParameterLayerSections.tsx` | 添加 Metadata 内部件 UI 分组 |
| `docs/11-token_design.md` | 补充 Metadata 面板 token 条目 |

### TODO

**4a: 定义 Level 1 token（Metadata body 级）**

- [ ] 在 `contract.css` 中新增：
  ```
  --mpx-metadata-body-bg           ← transparent
  --mpx-metadata-body-text         ← var(--mpx-text-1)
  --mpx-metadata-section-border    ← var(--mpx-border-1)
  --mpx-metadata-section-label-text ← var(--mpx-text-2)
  ```

**4b: 定义 Level 2 token（edit-grid / preference-record / tag）**

- [ ] 在 `contract.css` 中新增 edit-grid token：
  ```
  --mpx-metadata-edit-label-text   ← var(--mpx-metadata-section-label-text)
  --mpx-metadata-edit-value-text   ← var(--mpx-metadata-body-text)
  --mpx-metadata-edit-value-bg     ← var(--mpx-input-bg)
  --mpx-metadata-edit-value-border ← var(--mpx-input-border)
  ```
- [ ] 在 `contract.css` 中新增 preference-record token：
  ```
  --mpx-metadata-pref-card-bg      ← var(--mpx-bg-muted)
  --mpx-metadata-pref-card-border  ← var(--mpx-border-1)
  --mpx-metadata-pref-card-text    ← var(--mpx-metadata-body-text)
  ```
- [ ] 在 `contract.css` 中新增 tag 编辑区 token：
  ```
  --mpx-metadata-tag-editor-bg     ← var(--mpx-bg-elevated)
  --mpx-metadata-tag-editor-border ← var(--mpx-border-2)
  --mpx-metadata-tag-item-bg       ← var(--mpx-accent-soft)
  --mpx-metadata-tag-item-text     ← var(--mpx-accent)
  ```

**4c: CSS 消费侧改造**

- [ ] 在 `metadata.css` 中将 edit-grid / preference-record / tag 区域的选择器切换到新 token

**4d: ThemeParameter 注册**

- [ ] 注册色字段到快照目录
- [ ] 在 largePanelLayer 或新建 metadataLayer 章节中添加 UI 分组

**4e: 文档同步**

- [ ] 更新 `docs/11-token_design.md`

### CHECK

- [ ] Metadata 面板各区域使用新 token，无硬编码色值
- [ ] ThemeParameter 面板可调节 Metadata 内部件 token
- [ ] 快照导入/导出完整覆盖
- [ ] `npm run build` + `npm run lint` + `npm run test` 通过

### 测试命令

```bash
npm run build && npm run lint && npm run test
npm run dev:desktop  # 切换到 metadata 编辑模式，逐区域验证 token 消费
```

---

## Phase 5: 三级派生 — Main 区域 token 化 + 硬编码色值清理 + ThemeParameter

### 目标

1. token 化 Main 区域中的 music-visualizer HUD、video 控件
2. 清理全项目残留硬编码色值（manage.css ad-review、sidebar.css 渐变混合、vector.css、subtitles.css）
3. 新增 token 注册到 ThemeParameter

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/styles/themes/contract.css` | 新增 Main 区域 + 硬编码替换 token |
| `src/styles/app/main/main.part2.css` | music-visualizer HUD token 消费 |
| `src/styles/app/main/main.part3.css` | shader 控件 token 消费 |
| `src/styles/app/layout/layout.part2.css` | fullscreen video bg token 消费 |
| `src/styles/app/layout/layout.part3.css` | color picker 功能性硬编码评估 |
| `src/styles/app/manage.css` | ad-review overlay token 提升到 contract |
| `src/styles/app/sidebar.css` | 渐变混合中 `#fff` 替换 |
| `src/styles/app/vector.css` | rating heart 色 token 化 |
| `src/components/subtitles.css` | `#fff` 替换为 `var(--mpx-text-inverse)` |
| `src/styles/app/main/main.part1.css` | name-list fallback 硬编码确认 |
| `src/components/theme-parameter/themeParameterSnapshotCatalog.ts` | 注册色字段 |
| `src/components/theme-parameter/ThemeParameterLayerSections.tsx` | 添加 UI 分组 |
| `docs/11-token_design.md` | 补充 token 条目 |

### TODO

**5a: music-visualizer HUD token**

- [ ] 在 `contract.css` 中新增：
  ```
  --mpx-music-vis-hud-bg           ← color-mix(in srgb, var(--mpx-fullscreen-bg) 74%, transparent)
  --mpx-music-vis-hud-text         ← var(--mpx-player-hud-text)
  --mpx-music-vis-hud-border       ← var(--mpx-player-hud-border)
  --mpx-music-vis-error-bg         ← （从 #250b14 派生为 color-mix）
  --mpx-music-vis-error-border     ← （从 #8f2f45 派生为 color-mix）
  ```
- [ ] 在 `main.part2.css` 中消费

**5b: video 播放器**

- [ ] `layout.part2.css` 的 `background: #000` → `var(--mpx-fullscreen-bg)` 或 `var(--mpx-video-screen-bg)`
- [ ] `main.part3.css` 的 `#56b6ff` → `var(--mpx-accent)` 或新建 `--mpx-music-ctrl-focus-color`

**5c: ad-review overlay token 提升**

- [ ] 将 `manage.css` 中 `.ad-review-delete-overlay` 的局部变量默认值提升到 `contract.css`：
  ```
  --mpx-ad-review-overlay-card-bg
  --mpx-ad-review-overlay-card-border
  --mpx-ad-review-overlay-card-shadow
  --mpx-ad-review-overlay-text-main
  --mpx-ad-review-overlay-text-sub
  --mpx-ad-review-overlay-text-hint
  --mpx-ad-review-overlay-track-start
  --mpx-ad-review-overlay-track-mid
  --mpx-ad-review-overlay-track-end
  ```
- [ ] `manage.css` 中改为引用 contract token

**5d: sidebar 渐变混合**

- [ ] `sidebar.css` 中 `#fff` 混合值替换为 `var(--mpx-bg-elevated)` 或 `var(--mpx-palette-surface)`

**5e: vector.css rating heart**

- [ ] 新增 `--mpx-rating-heart-color` / `--mpx-rating-heart-active-color` 到 contract.css

**5f: subtitles.css**

- [ ] `color: #fff` → `var(--mpx-text-inverse)`

**5g: color picker 功能性硬编码评估**

- [ ] `layout.part3.css` 中的 `#000`/`#fff`（色轮黑白端）属于功能性标定色，保留不变
- [ ] `#58a6ff` accent 引用改为 `var(--mpx-accent)`
- [ ] `#111`/`#777`/`#f6f8fa` 评估：如果是 UI 装饰色则 token 化，如果是功能性色标则保留

**5h: contract.css 中 L0 硬编码色清理**

- [ ] `--mpx-sidebar-rename-preview-row-changed-accent: #9fb1c3` → `color-mix()` 派生
- [ ] `--mpx-sidebar-rename-preview-row-failed-accent: #c7928a` → `color-mix()` 派生
- [ ] `--mpx-slider-settings-groove-bg: #e9ecf0` → `color-mix()` 派生

**5i: ThemeParameter 注册 + 文档**

- [ ] 注册所有新增色字段
- [ ] 更新 `docs/11-token_design.md`

### CHECK

- [ ] 全项目 CSS 中硬编码 `#xxx` 色值仅保留 color picker 功能性标定色
- [ ] music-visualizer、video、ad-review overlay 视觉正确
- [ ] ThemeParameter 面板可调节新增 token
- [ ] `npm run build` + `npm run lint` + `npm run test` 通过

### 测试命令

```bash
npm run build && npm run lint && npm run test
# 扫描残留硬编码（排除注释和 var() 内 fallback）
grep -rn '#[0-9a-fA-F]\{3,8\}' src/styles/ src/components/subtitles.css | grep -v '\/\*' | grep -v 'transparent' | wc -l
npm run dev:desktop  # 全面视觉回归
```

---

## Phase 6: 文档同步 + 完整质量门禁

### 目标

完成所有文档同步，运行完整质量门禁。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `docs/08-theme-system-v2.md` | 添加 @layer 架构说明、三级派生模型文档 |
| `docs/09-theme-brainstorm-entry.md` | 更新执行约束（新增 @layer 相关） |
| `docs/10-ui_definition.md` | 如有新增 data-slot，同步登记 |
| `docs/11-token_design.md` | 最终确认所有新增 token 已登记 |
| `docs/32-ui-design-tracking-v1.md` | 记录 Phase 1-5 完成状态 |

### TODO

- [ ] 在 `docs/08-theme-system-v2.md` 中：
  - 添加 "@layer 级联架构" 章节（声明顺序、各 layer 职责、迁移原因）
  - 添加 "三级派生模型" 章节（L0/L1/L2 定义 + 断开继承示例）
  - 更新 "CSS 文件组织" 章节中的加载顺序描述
  - 记录 !important 消除的方法论
- [ ] 在 `docs/09-theme-brainstorm-entry.md` 中：
  - 更新执行约束：新 token 必须在 `@layer` 对应层中定义
  - 禁止使用 `!important`（记录替代方案）
- [ ] 在 `docs/11-token_design.md` 中：
  - 最终校对所有新增 token 条目
  - 确认三级派生链路的 fallback 一致性
- [ ] 在 `docs/32-ui-design-tracking-v1.md` 中：
  - 记录 @layer 迁移完成
  - 记录 Settings / Metadata / Main 内部件 token 化完成
  - 记录硬编码色值清理完成
  - 更新验收状态表
- [ ] 运行完整质量门禁

### CHECK

- [ ] 所有文档与代码一致
- [ ] `npm run quality:ci` 通过
- [ ] `npm run build:electron` 通过
- [ ] `npx madge --circular src electron` 0 循环依赖
- [ ] 全项目 `!important` 为 0
- [ ] 全项目硬编码色值仅保留功能性标定色
- [ ] ThemeParameter 面板所有分页可正常调参 + 快照导入/导出正常

### 测试命令

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run build:electron
npx madge --circular src electron
grep -r '!important' src/styles/ src/components/subtitles.css | wc -l  # 应为 0
```

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Vite 的 `@import ... layer()` 不支持 | Phase 1 阻塞 | 回退到方案 B（文件内 `@layer xxx { ... }` 包裹） |
| @layer 导致未预见的级联变化 | 视觉回归 | 每个 Phase 后 `npm run dev:desktop` 全面检查 |
| 同层内特殊性竞争（删除 !important 后） | 局部样式错误 | 用 `:where()` 降低低优先级侧特殊性 |
| 新增 token 过多导致 contract.css 膨胀 | 维护负担 | L2 token 尽量复用 L1，避免为单一用途创建 token |
| 旧快照导入兼容性 | 旧快照失效 | 新 token 的 fallback 值与现有默认一致 |
| 三级派生链过深导致调试困难 | 开发体验 | 每个 token 命名清晰标注层级归属 |

## 执行顺序图

```
Phase 1: @layer 基础架构        ← 最小风险，验证构建链
  ↓
Phase 2: 应用层 @layer + 消除 !important  ← 最大收益，217→0
  ↓
Phase 3: Settings 面板三级派生   ← 内容扩展开始
  ↓
Phase 4: Metadata 面板三级派生
  ↓
Phase 5: Main 区域 + 硬编码清理 ← 内容扩展收尾
  ↓
Phase 6: 文档同步 + 质量门禁    ← 最终确认
```

每个 Phase 独立可测试、可提交。Phase 1-2 聚焦架构迁移（@layer + !important），Phase 3-5 聚焦内容 token 化（三级派生 + 硬编码清理），Phase 6 完成文档收尾。
