# Theme 派生回落审计与修正实施文档 v1

## 1. 目标

- 在保留“局部可直控”这一既定设计前提下，确认并修正 Theme 系统的默认回落链。
- 明确区分两类情况：
  - 局部直控存在时：允许直接覆盖。
  - 局部直控不存在时：必须稳定回落到上级派生值，而不是意外掉回 `soft` 基线、`overlay-soft` 基线或历史特例默认值。
- 将当前 Theme 系统从“主链成立但局部仍混入 soft/default fallback”收口为“主链成立 + 局部可直控 + 未直控时稳定派生”。

## 2. 本文相对前置计划的定位

- 本文是对以下计划完成后现状的补充审计与修正计划：
  - `docs/38-theme-style-palette-skeleton-implement-plan-v1.md`
  - `docs/38-theme-native-controls-baseline-implement-plan-v1.md`
- 前两份计划解决的是“分层脚手架、skeleton/palette/style 拆分、基础控件 soft 独占边界”。
- 本文解决的是“当局部不直控时，是否真正使用派生值”这一收口问题。
- 本文不否定局部直控；相反，本文将局部直控视为正式需求，仅修正其默认回落链。

## 3. 当前结论

### 3.1 总体判断

- 当前实现已经具备“主链可派生 + 大量局部可直控”的基本形态。
- 但“局部不直控时是否一定走派生值”这一点尚未全域成立。
- 现状应判断为：
  - **主容器 / 主面板 / 主槽位：大部分已满足**
  - **内部件 / 列表 / 对话框子块 / 交互态：仍有明显残留**

### 3.2 审计口径

本文统一采用以下判定标准：

1. 若某 selector/token 存在局部直控入口，则视为符合设计，不构成问题。
2. 若局部直控缺失时，回落到所属上级语义 token，则判定为“已满足”。
3. 若局部直控缺失时，回落到 `soft` 专属 token、`overlay-soft`、`--mpx-skeuo-*`、或与所属上级无关的历史默认值，则判定为“未满足”。

## 4. 已满足“未直控走派生”的链路清单

### 4.1 四大容器共享壳层链路

已满足：

- `container-frame -> header`
- `container-frame -> sidebar`
- `container-frame -> main`
- `container-frame -> metadata`

证据：

- `src/styles/themes/contract.css:359`
- `src/styles/themes/contract.css:375`
- `src/styles/themes/contract.css:874`
- `src/styles/themes/contract.css:902`
- `src/styles/themes/contract.css:912`
- `src/styles/themes/contract.css:940`
- `src/styles/themes/contract.css:992`

结论：

- 当 Header / Sidebar / Main / Metadata 未做局部直控时，能够回落到 `--mpx-container-frame-*` 派生链，而不是直接依赖 soft selector。

### 4.2 Large Panel 共享面板链路

已满足：

- `large-panel-section -> large-panel-head`
- `large-panel-section -> large-panel-side`
- `large-panel-section -> large-panel-main`
- `large-panel-main / side -> settings-*`

证据：

- `src/styles/themes/contract.css:1260`
- `src/styles/themes/contract.css:1271`
- `src/styles/themes/contract.css:1324`
- `src/styles/themes/contract.css:1361`
- `src/styles/themes/contract.css:1405`
- `src/styles/themes/contract.css:1413`

结论：

- Settings 主体语义层已经建立；对应 slot 未直控时，多数场景会先回到 `large-panel-*`，再回到更上层默认值。

### 4.3 Header / Sidebar / Metadata 按钮 fallback 链路

已满足：

- `slot -> *-button-effective -> btn-variant-default`

证据：

- Header：`src/styles/app/layout/layout.part1.css:20`
- Sidebar：`src/styles/app/sidebar.css:182`
- Metadata：`src/styles/app/metadata.css:149`
- Metadata g3：`src/styles/app/metadata.css:182`

结论：

- 这类按钮族即使局部 slot 不直控，也能回落到容器级按钮有效值，而不是立即断链。

### 4.4 Root Panel 局部 current 变量链路

已满足：

- 大面板 root panel 的 `*-current` 变量未直控时，可回落到 `large-panel-*` 语义值。

证据：

- `src/styles/app/settings/settings.part1.css:344`
- `src/styles/app/settings/settings.part1.css:431`
- `src/styles/app/settings/settings.part1.css:518`

结论：

- 当前 `theme parameter` 面板中的许多 root-panel 特例虽然允许直控，但未直控时仍有上级兜底链，不属于错误旁路。

## 5. 未满足“未直控走派生”的残留清单

### 5.1 File List 基线仍掉回 overlay-soft

现状：

- File list 语义层虽然存在，但其默认来源仍绑定 `overlay-soft`，并未稳定回落到所属容器或上级 panel 派生值。

证据：

- `src/styles/themes/contract.css:497`
- `src/styles/app/main/main.part2.css:14`
- `src/styles/app/main/main.part2.css:20`
- `src/styles/app/main/main.part2.css:45`
- `src/styles/app/main/main.part2.css:114`

问题性质：

- 当前表现不是“来自 Main 容器语义的派生”，而是“掉回历史 soft overlay 基线”。

### 5.2 Metadata Fetch / Subtitle Cleanup / Transcode / Rename Preview 等子块默认掉回 overlay-soft

现状：

- 多个子块内部件语义 token 在 `contract` 中仍直接指向 `overlay-soft`。

证据：

- `src/styles/themes/contract.css:1443`
- `src/styles/themes/contract.css:1450`
- `src/styles/themes/contract.css:1604`
- `src/styles/themes/contract.css:1616`

问题性质：

- 这些区域虽然在 UI 上隶属于某个 panel，但默认值并不沿 panel/container 链回落，而是掉回 soft 风格中间层。

### 5.3 App 层仍存在 soft selector 决定交互态

现状：

- 一批 hover / active / pressed / focus 规则仍通过 `:root[data-mpx-style^='soft-skeuomorphic']` 决定。

高频文件：

- `src/styles/app/button-template.css`
- `src/styles/app/settings/settings.part1.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/app/metadata.css`

问题性质：

- 这类规则并非“局部直控”，而是“由 soft selector 直接裁决最终状态”；未直控时并不必然回落到语义 token 派生。

### 5.4 Skeleton 仍残留对 skeuo 变量的隐式依赖

现状：

- `_skeleton.css` 中 `--mpx-range-fill-progress` 仍回落到 `--mpx-skeuo-range-pct`。

证据：

- `src/styles/themes/styles/_skeleton.css:78`

问题性质：

- 隐藏骨架层仍在读取 soft 专属运行时变量，不符合“未直控时走中性/派生骨架”的目标。

### 5.5 一部分 app selector 直接使用 overlay-soft，而不是语义 token

现状：

- 部分业务样式未通过语义 token，而是直接引用 `--mpx-overlay-soft-*`。

证据：

- `src/styles/app/settings/settings.part1.css:1979`
- `src/styles/app/settings/settings.part1.css:2222`
- `src/styles/app/settings/settings.part1.css:3334`

问题性质：

- 这种写法会让局部未直控时直接掉到 soft overlay 默认值，绕开所属区域的派生语义层。

## 6. 修正原则

1. **保留局部直控**：不得以“减少特例”为名删除业务需要的 slot / current / local override。
2. **只修默认回落链**：修正重点是 fallback 指向，不是砍功能入口。
3. **禁止新增 soft 旁路**：任何新 token 默认值不得再直接指向 `overlay-soft`、`--mpx-skeuo-*`、或 `data-mpx-style^='soft-skeuomorphic'` selector。
4. **语义层必须逐级回落**：优先 `slot -> 本层语义 -> 上级语义 -> 中性 contract`。
5. **soft 只负责皮肤**：soft 仍可覆盖视觉结果，但不再承担“默认 fallback 基线”的角色。

## 7. 修正方案

### Phase 1 - File List 语义链收口

目标：

- 让 file list 默认值不再直接绑定 `overlay-soft`，而是绑定到所属容器或面板语义层。

建议做法：

1. 在 `contract` 中新增中性 file-list 源语义，例如：
   - `--mpx-file-list-surface-border`
   - `--mpx-file-list-surface-bg`
   - `--mpx-file-list-surface-head-bg`
   - `--mpx-file-list-surface-row-divider`
2. 这些源语义优先从所属容器语义派生，而非从 `overlay-soft` 派生。
3. `--mpx-main-image-name-list-*`、`--mpx-metadata-file-list-*` 继续保留，但默认改为指向 `file-list-surface-*` 或容器级派生值。
4. `src/styles/app/main/main.part2.css` 中所有直接 `var(--mpx-overlay-soft-*)` fallback 改为对应 `--mpx-main-image-name-list-*` / `--mpx-file-list-*` 链路。

涉及文件：

- `src/styles/themes/contract.css`
- `src/styles/app/main/main.part2.css`
- `src/styles/app/settings/settings.part1.css`

完成定义：

- file list 未直控时，默认从所属语义层派生。
- app selector 中不再直接以 `overlay-soft` 作为 file-list 的最终 fallback。

### Phase 2 - 子块内部件默认值去 overlay-soft 化

目标：

- 让 Metadata Fetch / Subtitle Cleanup / Transcode / Rename Preview 等子块默认值回到所属 panel 语义，而不是掉回 `overlay-soft`。

建议做法：

1. 为这些子块补一层“panel 内部件语义 token”，例如：
   - `--mpx-large-panel-control-bg`
   - `--mpx-large-panel-control-border`
   - `--mpx-large-panel-subsurface-bg`
   - `--mpx-large-panel-subsurface-head-bg`
   - `--mpx-large-panel-subsurface-divider`
2. 各业务子块默认值先指向这层 panel 内部件语义。
3. soft style 可继续覆盖这些 panel 内部件语义，让 soft 视觉保持不变。

涉及文件：

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`

完成定义：

- 相关子块在未直控时，默认来源是所属 panel 语义链，不再是 `overlay-soft`。

### Phase 3 - App 层交互态去 soft selector 裁决化

目标：

- 保留 soft 皮肤，但将 app 层交互态收口为 token 驱动，而不是 selector 直裁决。

建议做法：

1. 将 `button-template.css`、`layout.part1.css`、`layout.part2.css`、`metadata.css` 中 soft selector 下的 hover / active / pressed 规则，改为消费统一状态 token，例如：
   - `--mpx-control-hover-transform`
   - `--mpx-control-active-transform`
   - `--mpx-header-btn-hover-shadow`
   - `--mpx-header-btn-active-shadow`
2. app 层保留结构规则与状态应用点，但去掉 `data-mpx-style^='soft-skeuomorphic'` 条件判断。
3. soft style 文件负责提供这些状态 token 的视觉值；非 soft style 则给中性值或 `none`。

涉及文件：

- `src/styles/app/button-template.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/app/metadata.css`
- `src/styles/themes/contract.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`

完成定义：

- 未直控时，交互态由 token 派生而来。
- soft 只提供值，不再由 app selector 判定“是否套用某种状态机”。

### Phase 4 - Skeleton 去 skeuo 运行时依赖

目标：

- 让 `_skeleton.css` 完全不读取 `--mpx-skeuo-*`。

建议做法：

1. 将 `--mpx-range-fill-progress` 的默认来源改为中性运行时变量，例如：
   - `--mpx-range-progress-pct`
2. `SkeuoRunway` 与相关组件同时写入中性运行时变量；soft 专属变量仅作为兼容过渡，不再被 skeleton 直接消费。

涉及文件：

- `src/styles/themes/styles/_skeleton.css`
- `src/components/primitives/SkeuoRunway.tsx`
- `src/components/MusicMainSection.tsx`

完成定义：

- skeleton 不再依赖 `--mpx-skeuo-range-pct`。

### Phase 5 - Theme Parameter 面板与预览页同步收口

目标：

- 确保调参面板的预览链与正式链路一致，不再因为预览页直接用 `overlay-soft` 而产生误判。

建议做法：

1. `theme-parameter` 相关预览样式统一优先消费正式语义 token。
2. 仅保留中性 fallback，不再直接落回 `overlay-soft`。
3. 快照目录中若仍存在以 `overlay-soft` 作为默认说明值的项，同步改写为正式语义 token。

涉及文件：

- `src/styles/app/settings/settings.part1.css`
- `src/components/theme-parameter/themeParameterSnapshotCatalog.ts`
- `src/components/theme-parameter/themeParameterPanelCatalog.ts`

完成定义：

- Theme Parameter 面板显示的“未直控默认值”与正式界面一致。

## 8. 推荐实施顺序

1. Phase 1：先修 file-list，因为这是当前最明显的“语义存在但 fallback 仍掉回 soft”的链路。
2. Phase 2：再修 dialog / panel 子块，因为它们覆盖范围广且最容易继续复制错误模式。
3. Phase 3：收口 app-state / app-layout 中的 soft selector 裁决逻辑。
4. Phase 4：去掉 skeleton 对 skeuo 变量的最后依赖。
5. Phase 5：最后修 theme parameter 预览与快照，避免调参界面与正式链路继续漂移。

## 9. 验收清单

- [ ] Header / Sidebar / Main / Metadata 在不设置 slot 直控时，仍稳定继承共享壳层派生值。
- [ ] Settings / Help / Theme Parameter 等 large panel 在不设置 root-panel slot 直控时，仍稳定继承 `large-panel-*` 派生值。
- [ ] File list 未直控时，不再掉回 `overlay-soft`。
- [ ] Metadata Fetch / Subtitle Cleanup / Transcode / Rename Preview 未直控时，不再掉回 `overlay-soft`。
- [ ] app 层不再使用 `data-mpx-style^='soft-skeuomorphic'` 直接裁决 hover / active / pressed 最终样式。
- [ ] `_skeleton.css` 不再依赖 `--mpx-skeuo-*`。
- [ ] Theme Parameter 预览页与正式界面的默认回落链一致。

## 10. 最小验证

```bash
npm run lint
npm run test
npm run build
```

补充手工验证：

1. 打开 `Theme Parameter` 面板，对同一组区域分别执行“直控”和“复位”。
2. 复位后确认界面回到上级派生值，而不是回到 soft 特例默认值。
3. 至少检查以下区域：
   - Header
   - Sidebar
   - Main Image Name List
   - Metadata Header / File List
   - Settings Root Panel
   - Metadata Fetch Panel

## 11. 文档同步要求

- 若修正中新增或重命名正式语义 token，必须同步更新：
  - `docs/08-theme-system-v2.md`
  - `docs/10-ui_definition.md`
  - `docs/11-token_design.md`
- 若新增后续 Phase 文档或迁移本文状态，必须同步更新：
  - `README.md`
  - `docs/01-README.md`
  - `docs/02-DOCS_INDEX.md`
