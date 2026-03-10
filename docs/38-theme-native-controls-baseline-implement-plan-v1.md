# Theme Native Controls Baseline 分阶段实施计划 v1

## 1. 目标

- 将当前落在 `contract`、`app-base`、`app-state` 的大量默认控件皮肤，迁移到 `soft-skeuomorphic` style family 内部。
- 让隐藏 skeleton / 中性基线只保留布局、尺寸、间距、最小语义色与功能稳定性，不再默认提供 soft 风格圆角、阴影、渐变、模糊、自绘 scrollbar / range / button / checkbox 皮肤。
- 让 `soft-skeuomorphic + skeuomorphic-luxury-white` 在迁移后保持当前视觉结果不变。
- 让 `TestStyle + test-skeleton` 与后续非 soft style 回到近原生（native-like）基础控件链路；允许出现布局抖动，后续再在骨架层继续收敛。
- 本轮范围包含普通表单控件与 `mpx-runway` / transport slider，不将其排除在外。

## 2. 本计划相对前置计划的定位

- 本计划是 `docs/38-theme-style-palette-skeleton-implement-plan-v1.md` 的后续计划。
- 前置计划已完成“style / palette / skeleton”分层；本计划继续完成“基础控件皮肤去全局化”。
- 新对话中不要重新通读前置计划全文；仅当当前 Phase 的“先读文件”明确列出前置计划或相关 SSOT 时才读取。

## 3. 最终目标架构

### 3.1 层级职责（本计划目标口径）

```css
@layer contract, palette-base, palette, theme-skeleton, theme-style, app-base, app-layout, app-component, app-state;
```

职责收口为：

1. `contract`：仅提供协议级 fallback、最小尺寸、最小语义色、布局安全值；不得再默认内置 soft 控件皮肤。
2. `palette-base`：仅提供隐藏中性配色 fallback；不得承载 soft 控件皮肤。
3. `palette`：公开 palette，仅负责颜色覆盖。
4. `theme-skeleton`：隐藏骨架 style，仅负责几何骨架、零装饰外观、功能稳定。
5. `theme-style`：公开 style 视觉层，负责圆角、阴影、渐变、模糊、交互皮肤、自绘控件皮肤。
6. `app-base`：仅负责浏览器标准化与最小基础排版，不再全局接管 scrollbar、button、input、checkbox、range 的视觉皮肤。
7. `app-layout` / `app-component` / `app-state`：业务层只消费中性 token；若需要 soft 视觉，必须通过 `soft-skeuomorphic` 作用域或 soft token 获取。

### 3.2 本计划后的“中性基线”定义

- 保留：`font: inherit`、必要的 `min-height`、必要的布局 `display / gap / align-items`、功能性尺寸 token。
- 保留：能保证交互稳定的几何骨架，如 `--mpx-control-height`、`--mpx-runway-height`、`--mpx-header-btn-size`。
- 移除：全局 `appearance: none`、全局自绘 scrollbar、全局 button 阴影/位移、全局 checkbox 自绘、全局普通 range track/thumb 皮肤。
- 对 `mpx-runway`：基础链路允许退回近原生 / 极简表现；soft style 继续提供当前自绘视觉。

### 3.3 本计划后的 soft 责任边界

`soft-skeuomorphic` 最终负责：

- 默认 button / button-template 皮肤
- 默认 input / select / textarea / checkbox 皮肤
- 默认 scrollbar 皮肤
- 默认普通 range 皮肤
- `mpx-runway` / transport / volume / progress 的皮肤
- 相关 hover / active / pressed / focus ring / shadow / blur / gradient

## 4. 全局执行原则

1. **先剥离全局皮肤，再回灌 soft**：不要继续给 `TestStyle` 打补丁式覆盖。
2. **接受非 soft 抖动**：本轮不追求 `TestStyle` 或其他未来 style 的像素稳定，只追求“功能可用 + 样式边界清晰”。
3. **soft 必须视觉等价**：凡从全局层移走的皮肤，必须在 soft 路径找回，不能让默认 soft 回退。
4. **每个 Phase 独立闭环**：只读取当前 Phase 指定文件；完成后必须最小验证、回填、提交。
5. **镜像同步**：凡修改 `src/styles/themes/**/*`，必须同步检查并更新 `apps/GeneralUIFrame/src/styles/themes/**/*` 对应镜像文件。
6. **不一次性读取大上下文**：新对话默认只做“最早未完成的一个 Phase”。

## 5. 新对话启动提示词

将以下提示词直接粘贴到新对话：

```text
请读取 `docs/38-theme-native-controls-baseline-implement-plan-v1.md`，只执行“最早未完成的一个 Phase”。

执行要求：
1. 先阅读该 Phase 的“先读文件”，不要额外扩散读取无关上下文。
2. 仅修改该 Phase “涉及文件”内必要内容；不要跨 Phase 提前改后续文件，除非该 Phase 明确允许。
3. 若修改 `src/styles/themes/**/*`，必须同步检查并更新 `apps/GeneralUIFrame/src/styles/themes/**/*` 对应镜像文件。
4. 完成后必须执行该 Phase 的“最小验证”。
5. 验证通过后，必须按该 Phase 的“通过后回填”更新文档状态与记录。
6. 最后创建一个 git commit，commit message 使用中文 Conventional Commits。
7. 回复时给出：变更文件、验证结果、回填位置、commit hash、下一 Phase 建议。

额外约束：
- 接受非 soft style 的基础控件布局抖动，不要为了“看起来更像以前”把 soft 皮肤重新塞回 contract / app-base。
- `soft-skeuomorphic + skeuomorphic-luxury-white` 必须保持当前视觉等价。
- 若当前 Phase 被阻塞：先完成所有非阻塞部分，再在该 Phase 的“阻塞记录”中写明原因，不要擅自跨到下一 Phase。
```

## 6. 关键边界与风险提醒

### 6.1 必须从全局层剥离的对象

- `button` 默认阴影、hover / active transform、pressed 视觉
- `input / select / textarea` 默认边框、背景、焦点皮肤
- `checkbox` 自绘外观
- 普通 `input[type="range"]` 的 track / thumb 自绘
- 全局 scrollbar 皮肤
- `mpx-runway` 的默认 fill / thumb / groove 皮肤

### 6.2 允许保留在中性基线的对象

- `font: inherit`
- 最小高度、最小 padding、必要的尺寸 token
- `display`、`gap`、`align-items`、`position` 等结构性布局规则
- 能避免功能失效的透明命中层 / overlay 定位 / pointer-events 规则

### 6.3 本轮不追求的结果

- 非 soft style 的像素稳定
- 非 soft style 的统一品牌化视觉
- 单轮内完成所有业务页的细节微调

### 6.4 高风险点

- Windows / Electron / Chromium 原生控件差异会放大。
- header / settings / toolbar 可能因原生控件 intrinsic size 变化出现抖动。
- `mpx-runway` 不是普通 range 换皮，处理不当会影响进度条 / 音量条的可用性。
- `apps/GeneralUIFrame` 若不同步会立即产生主题镜像漂移。

## 7. Phase 总览

| Phase | 名称 | 目标 | 预计提交类型 |
|---|---|---|---|
| Phase 1 | Soft 控件入口拆分 | 为 soft 控件皮肤建立独立承接文件与导入位 | `refactor(theme)` |
| Phase 2 | app-base 基础控件去皮肤化 | 让全局 button / form / checkbox / range / scrollbar 回到中性基线 | `refactor(theme)` |
| Phase 3 | 按钮模板与面板局部控件去软直连 | 将 button-template 与 pane 层二次皮肤限制到 soft 作用域 | `refactor(theme)` |
| Phase 4 | Runway 基线原生化 | 让 `mpx-runway` 基础链路回到近原生 / 极简，并保留 soft 自绘皮肤 | `refactor(theme)` |
| Phase 5 | Transport 与播放器壳层 soft 等价恢复 | 保证 soft 下 transport / volume / progress 与当前一致 | `refactor(theme)` |
| Phase 6 | 文档、验收与索引收口 | 同步 SSOT、完成验收清单与最终记录 | `docs(theme)` 或 `test(theme)` |

---

## Phase 1 - Soft 控件入口拆分

### 目标

- 为 soft 专属控件皮肤建立独立入口文件，避免后续继续把控件皮肤塞回 `soft-skeuomorphic.css` 大文件。
- 建立“全局去皮肤、soft 回灌”的安全落点。
- 本 Phase 不追求功能变化，只搭脚手架与导入位。

### 先读文件

1. `src/styles/themes/index.css`
2. `src/styles/themes/contract.css`
3. `src/styles/themes/styles/soft-skeuomorphic.css`
4. `apps/GeneralUIFrame/src/styles/themes/index.css`
5. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.css`
6. `docs/08-theme-system-v2.md`
7. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `src/styles/themes/index.css`
- `src/styles/themes/styles/soft-skeuomorphic.controls.css`（新增）
- `apps/GeneralUIFrame/src/styles/themes/index.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.controls.css`（新增）

### 完成定义

- 主工程与 `GeneralUIFrame` 都新增 soft 控件入口文件。
- `theme-style` 导入顺序已为后续控件迁移预留位置。
- 当前默认 soft 视觉结果不变。

### 最小验证

```bash
npm run build
```

### 通过后回填

- 更新 `docs/08-theme-system-v2.md` 中 `theme-style` / `app-base` 职责口径。
- 在本文“Phase 记录”中填写验证结果与 commit hash。

### 提交要求

- 推荐提交信息：`refactor(theme): 拆分 soft 控件皮肤入口`

### Phase 记录

- [x] 已完成
- 验证命令：`npm run build`
- 验证结果：通过
- 回填文件：`docs/08-theme-system-v2.md`、`docs/38-theme-native-controls-baseline-implement-plan-v1.md`
- 提交 hash：`HEAD`
- 阻塞记录：无

---

## Phase 2 - app-base 基础控件去皮肤化

### 目标

- 将全局基础控件从“soft 风格默认皮肤”改为“中性 / 近原生基线”。
- 保留必要的 `font: inherit`、最小高度、布局尺寸；移除全局圆角、阴影、渐变、appearance 重绘。
- 同时将被移走的 soft 视觉接入 `soft-skeuomorphic.controls.css`，保证默认 soft 不变。

### 先读文件

1. `src/styles/app/base.css`
2. `src/styles/themes/contract.css`
3. `src/styles/themes/palettes/_palette-base.css`
4. `src/styles/themes/styles/_skeleton.css`
5. `src/styles/themes/styles/soft-skeuomorphic.controls.css`
6. `apps/GeneralUIFrame/src/styles/themes/contract.css`
7. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.controls.css`
8. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `src/styles/app/base.css`
- `src/styles/themes/contract.css`
- `src/styles/themes/palettes/_palette-base.css`
- `src/styles/themes/styles/soft-skeuomorphic.controls.css`
- `apps/GeneralUIFrame/src/styles/themes/contract.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.controls.css`

### 完成定义

- 非 soft 路径下：
  - `button`
  - `input / select / textarea`
  - `checkbox`
  - 普通 `input[type="range"]`
  - scrollbar
  不再默认显示 soft 风格圆角、阴影、渐变、自绘皮肤。
- soft 路径下以上对象的视觉与当前实现保持等价。
- `contract.css` 不再默认承担 soft 风格控件皮肤。

### 最小验证

```bash
npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx
npm run build
```

### 通过后回填

- 更新 `docs/08-theme-system-v2.md` 中 `contract` / `app-base` / `theme-style` 的边界描述。
- 若 token 口径变化涉及基础控件命名，补充到 `docs/11-token_design.md`。
- 在本文“Phase 记录”中填写验证结果与 commit hash。

### 提交要求

- 推荐提交信息：`refactor(theme): 让基础控件回归中性基线`

### Phase 记录

- [x] 已完成
- 验证命令：`npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx`；`npm run build`
- 验证结果：通过
- 回填文件：`docs/08-theme-system-v2.md`、`docs/38-theme-native-controls-baseline-implement-plan-v1.md`
- 提交 hash：`HEAD`
- 阻塞记录：无

---

## Phase 3 - 按钮模板与面板局部控件去软直连

### 目标

- 将 `button-template.css` 中统一按钮状态皮肤移出全局默认链路，限制到 soft 作用域。
- 清理 pane / settings / metadata / main 内部对控件的二次 soft 化规则，让非 soft 路径不再被局部规则重新“软化”。
- 保留 soft 路径按钮观感与当前一致。

### 先读文件

1. `src/styles/app/button-template.css`
2. `src/styles/app/sidebar.css`
3. `src/styles/app/main/main.part1.css`
4. `src/styles/app/metadata.css`
5. `src/styles/app/settings/settings.part1.css`
6. `src/styles/app/layout/layout.part1.css`
7. `src/styles/app/layout/layout.part2.css`
8. `src/styles/themes/styles/soft-skeuomorphic.controls.css`
9. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.controls.css`
10. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `src/styles/app/button-template.css`
- `src/styles/app/sidebar.css`
- `src/styles/app/main/main.part1.css`
- `src/styles/app/metadata.css`
- `src/styles/app/settings/settings.part1.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/themes/styles/soft-skeuomorphic.controls.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.controls.css`

### 完成定义

- 非 soft 路径下，按钮模板不再默认带 soft hover / active / pressed 阴影与位移。
- pane 级控件默认阴影、背景、焦点二次皮肤不再强行作用于非 soft 路径。
- soft 路径下 header / settings / sidebar / metadata / main 内按钮与输入控件观感保持当前一致。

### 最小验证

```bash
npx vitest run src/__tests__/App.settings.test.tsx
npm run build
```

### 通过后回填

- 若 `app-state` / `app-component` 职责口径变化明显，更新 `docs/08-theme-system-v2.md`。
- 在本文“Phase 记录”中填写验证结果与 commit hash。

### 提交要求

- 推荐提交信息：`refactor(theme): 收口按钮模板与面板控件皮肤作用域`

### Phase 记录

- [x] 已完成
- 验证命令：`npx vitest run src/__tests__/App.settings.test.tsx`；`npm run build`
- 验证结果：通过
- 回填文件：`docs/38-theme-native-controls-baseline-implement-plan-v1.md`
- 提交 hash：`HEAD`
- 阻塞记录：无

---

## Phase 4 - Runway 基线原生化

### 目标

- 让 `mpx-runway` 在非 soft 路径下回到近原生 / 极简链路。
- 隐藏或清零非 soft 路径下的 groove / fill / thumb 装饰性表现，确保基础链路依赖原生 range 可用。
- 同时保留 soft 路径下的 runway 自绘视觉与交互手感。

### 先读文件

1. `src/styles/app/base.css`
2. `src/styles/themes/contract.css`
3. `src/styles/themes/styles/_skeleton.css`
4. `src/styles/themes/styles/soft-skeuomorphic.runway.css`
5. `src/styles/themes/styles/soft-skeuomorphic.controls.css`
6. `apps/GeneralUIFrame/src/styles/themes/contract.css`
7. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.runway.css`
8. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `src/styles/app/base.css`
- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_skeleton.css`
- `src/styles/themes/styles/soft-skeuomorphic.runway.css`
- `apps/GeneralUIFrame/src/styles/themes/contract.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.runway.css`

### 完成定义

- 非 soft 路径下，`mpx-runway` 不再默认显示 soft fill / thumb / groove 皮肤。
- soft 路径下，video / music / volume / shader runway 视觉保持当前一致。
- 不允许把 runway 皮肤 fallback 再塞回 `contract.css`。

### 最小验证

```bash
npm run build
```

### 通过后回填

- 若新增或收口了 runway 语义 token，更新 `docs/11-token_design.md`。
- 在本文“Phase 记录”中填写验证结果与 commit hash。

### 提交要求

- 推荐提交信息：`refactor(theme): 让 runway 回归中性基线`

### Phase 记录

- [ ] 已完成
- 验证命令：
- 验证结果：
- 回填文件：
- 提交 hash：
- 阻塞记录：

---

## Phase 5 - Transport 与播放器壳层 soft 等价恢复

### 目标

- 在 runway 基线变化后，恢复并确认 soft 路径下 transport、volume、fullscreen/footer、播放器壳层相关控件观感与当前一致。
- 将仍然残留在业务层的播放器 soft 皮肤继续收口到 soft 作用域。

### 先读文件

1. `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
2. `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
3. `src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css`
4. `src/styles/themes/styles/soft-skeuomorphic.runway.css`
5. `src/styles/app/main/main.part2.css`
6. `src/styles/app/main/main.part3.css`
7. `src/styles/app/layout/layout.part2.css`
8. `src/styles/app/layout/layout.part3.css`
9. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
10. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
11. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css`
12. `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.runway.css`
13. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css`
- `src/styles/themes/styles/soft-skeuomorphic.runway.css`
- `src/styles/app/main/main.part2.css`
- `src/styles/app/main/main.part3.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/app/layout/layout.part3.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.main-transport.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.runway.css`

### 完成定义

- `soft-skeuomorphic + skeuomorphic-luxury-white` 下的 transport / volume / fullscreen controls 视觉与本计划开始前一致。
- 非 soft 路径允许退回极简 / 近原生，不为其补临时皮肤。
- 播放器相关皮肤规则不再隐式散落在业务层。

### 最小验证

```bash
npm run build
```

### 通过后回填

- 在本文“Phase 记录”中填写验证结果与 commit hash。
- 如 soft transport 维护边界发生变化，更新 `docs/08-theme-system-v2.md` 的 style 拆分说明。

### 提交要求

- 推荐提交信息：`refactor(theme): 恢复 soft transport 与播放器壳层皮肤`

### Phase 记录

- [ ] 已完成
- 验证命令：
- 验证结果：
- 回填文件：
- 提交 hash：
- 阻塞记录：

---

## Phase 6 - 文档、验收与索引收口

### 目标

- 同步 SSOT 与入口索引，明确“基础控件默认近原生、soft 独占皮肤”的新边界。
- 形成最终验收结论，确保新对话可直接从本文继续维护。

### 先读文件

1. `docs/08-theme-system-v2.md`
2. `docs/01-README.md`
3. `docs/02-DOCS_INDEX.md`
4. `docs/11-token_design.md`
5. `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 涉及文件

- `docs/08-theme-system-v2.md`
- `docs/01-README.md`
- `docs/02-DOCS_INDEX.md`
- `docs/11-token_design.md`（若 token 口径发生变化）
- `docs/38-theme-native-controls-baseline-implement-plan-v1.md`

### 完成定义

- `docs/08-theme-system-v2.md` 已明确：
  - `app-base` 不再负责基础控件统一皮肤
  - 中性基线仅保留布局 / 尺寸 / 最小功能稳定
  - soft style 独占基础控件与 runway 皮肤
- `docs/01-README.md` 与 `docs/02-DOCS_INDEX.md` 已指向本计划。
- 本文所有 Phase 记录已回填完整。

### 最小验证

```bash
npx vitest run src/features/theme/themeRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/__tests__/App.settings.test.tsx
npm run build
```

### 通过后回填

- 在本文“最终验收记录”填写自动验证结果、手工验收结论与遗留项。

### 提交要求

- 推荐提交信息：`docs(theme): 收口 native baseline 控件迁移文档`

### Phase 记录

- [ ] 已完成
- 验证命令：
- 验证结果：
- 回填文件：
- 提交 hash：
- 阻塞记录：

---

## 8. 最终验收清单

- [ ] `soft-skeuomorphic + skeuomorphic-luxury-white` 下按钮、输入框、select、textarea、checkbox、普通 range、scrollbar 视觉与迁移前一致。
- [ ] `soft-skeuomorphic + skeuomorphic-luxury-white` 下 runway / volume / transport / fullscreen controls 视觉与迁移前一致。
- [ ] `TestStyle + test-skeleton` 下基础控件不再残留 soft 风格阴影、渐变、圆角、自绘皮肤。
- [ ] 非 soft 路径允许布局抖动，但基础功能可用、可点击、可聚焦、可拖动。
- [ ] `apps/GeneralUIFrame` 的 theme 镜像文件已同步，不存在主工程 / 镜像漂移。

## 9. 最终验收记录

- 自动验证命令：
- 自动验证结果：
- 手工验收结论：
- 遗留项：
