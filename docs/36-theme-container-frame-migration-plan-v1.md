# Theme Container Frame 全量迁移实施计划 v1

## 1. 目标

- 将 `containerLayer` 的“大容器层调试”重构为真正的共享基础层 + 单容器覆写层，而不是继续叠加历史 `metal / chrome / skeuo` 语义。
- 为未来主题提供稳定基础能力：共享壳层、单容器外观覆写、单容器视觉变换（错位 / 旋转 / 缩放 / 镜像 / 预留 3D）。
- 保持布局占位、splitter、缩略图自适应与分页推导继续基于原布局盒计算；视觉错位全部通过 `frame` 层完成，不污染布局算法。
- 最终彻底移除旧变量与别名兼容，运行链路、SSOT 活跃文档、测试与示例全部切换到新名称。

## 2. 非目标

- 本计划不引入“单容器真实外边距占位”；共享总控间距仍只保留工作区 padding 与 splitter size。
- 本计划第一阶段不做容器级 `z-index` 可调；若后续发现视觉越界遮挡控制不足，再单开高级项。
- 本计划不要求第一批就让所有内部件分页一起重构；`fg-sidebar-main` 与 `fg-main-content-image-name-list` 维持独立分页分组。

## 3. 设计原则

1. **共享值优先**：单容器默认回退到共享值；只有用户显式调节单容器字段，才写局部覆写。
2. **布局与视觉分层**：`root` 负责布局占位；`frame` 负责 `fill / border / shadow / radius / transform`。
3. **视觉越界允许**：默认允许视觉层越界覆盖相邻区域，不强制裁切；以满足新野兽主义等错位风格需求。
4. **通用语义命名**：不再把基础层语义绑定到 `metal / chrome / skeuo` 之类风格词。
5. **最终硬切换**：允许分阶段迁移，但最终合并完成后，代码与活跃文档中不再保留旧变量名，也不保留 alias/fallback 兼容链路。

## 4. 新变量族目标模型

### 4.1 共享基础层

| 语义 | 目标变量 | 说明 |
|---|---|---|
| App 根背景 | `--mpx-app-root-bg` | 取代旧的根背景基础变量命名 |
| 共享 fill 起点 | `--mpx-container-frame-fill-start` | 允许纯色/渐变构造 |
| 共享 fill 终点 | `--mpx-container-frame-fill-end` | 允许纯色/渐变构造 |
| 共享 fill 角度 | `--mpx-container-frame-fill-angle` | 补齐当前缺失的渐变角度控制 |
| 共享 fill 串 | `--mpx-container-frame-fill` | 最终容器背景，可为纯色或渐变 |
| 共享边框色 | `--mpx-container-frame-border-color` | 当前共享壳层缺失 |
| 共享阴影 | `--mpx-container-frame-shadow` | 对应共享壳层阴影 |
| 共享圆角 | `--mpx-container-frame-radius` | 总控圆角 |
| 工作区内边距 | `--mpx-workspace-padding` | 对应现有 layout padding 通用语义 |
| Header 外间距 | `--mpx-header-outer-gap` | 对应现有 header 顶部/两侧总控间距 |
| 分割条尺寸 | `--mpx-workspace-splitter-size` | 对应现有 splitter width 通用语义 |

### 4.2 单容器外观覆写

统一前缀：

- `--mpx-header-frame-*`
- `--mpx-sidebar-frame-*`
- `--mpx-main-frame-*`
- `--mpx-metadata-frame-*`

每个容器第一批统一具备：

- `fill`
- `border-color`
- `shadow`
- `radius`

### 4.3 单容器视觉变换

每个容器第一批统一具备：

- `translate-x`
- `translate-y`
- `rotate-z`
- `scale-x`
- `scale-y`
- `origin-x`
- `origin-y`

高级 3D 预留：

- `perspective`
- `rotate-x`
- `rotate-y`
- `transform-style`
- `backface-visibility`

说明：镜像不单独做 `mirror-x / mirror-y` 开关，直接允许 `scale-x` 或 `scale-y` 为负值。

## 5. DOM / CSS 重构目标

### 5.1 根原则

- 保留现有 `header / sidebar / main / metadata` 根节点继续承担布局、宽度、splitter、比例、数据 slot。
- 在根节点内部新增 `frame` 层，消费新的基础外观与视觉变换变量。
- 任何缩略图列数、分页、workspace 宽度推导继续从原布局盒读取，不从 `frame` 读取。

### 5.2 目标落点

| 容器 | 保留为布局 root | 新增 frame 层建议位置 | 主要文件 |
|---|---|---|---|
| Header | `app-header` | `app-header-frame` | `src/components/AppHeader.tsx`、`src/styles/app/layout/layout.part1.css` |
| Sidebar | `sidebar` | `sidebar-frame` | `src/components/SidebarPanel.tsx`、`src/styles/app/sidebar.css` |
| Main | `main-pane` | `main-pane-frame` | `src/components/AppWorkspace.tsx`、`src/styles/app/main/main.part1.css` |
| Metadata | `metadata-panel` | `metadata-frame` | `src/components/MetadataPanel.tsx`、`src/styles/app/metadata.css` |

### 5.3 保持不变的布局责任

- `AppWorkspace` 中 sidebar/main/metadata 的宽度计算仍保留在 root：
  - `src/components/AppWorkspace.tsx`
- 缩略图列数与分页继续由 `gridSize.width` 驱动：
  - `src/features/app/useAppNavigationState.ts`
- `workspace padding` 与 `splitter size` 仍是唯一共享布局间距入口。

## 6. ThemeParameter UI 目标结构

`containerLayer` 重排为：

1. `共享壳层`
2. `Header`
3. `Sidebar`
4. `Main`
5. `Metadata`
6. `Sidebar Main 内部件`
7. `Main Image Name List 内部件`
8. `高级 / 迁移后置项`

其中 `1~5` 每层再拆三段：

- `基础外观`
- `视觉变换`
- `高级 3D`

折叠态要求：

- 顶层 section 可折叠
- section 内子组可折叠
- 会话态改为 map，不继续为每个 section 单独堆布尔字段

## 7. Phase 总览

| Phase | 名称 | 目标 |
|---|---|---|
| Phase 0 | 语义冻结与迁移边界确认 | 确认新变量族、root/frame 模型、文档边界 |
| Phase 1 | 共享基础层改名与 contract 接入 | 共享层新变量可驱动现有容器外观 |
| Phase 2 | 四大容器 root/frame 改造 | 视觉层从根节点迁到 frame，布局保持不变 |
| Phase 3 | 单容器外观覆写接入 | header/sidebar/main/metadata 均可独立覆写 fill/border/shadow/radius |
| Phase 4 | 单容器视觉变换接入 | translate/rotate/scale/origin 生效，预留 3D |
| Phase 5 | ThemeParameter UI 重排与快照迁移 | 新结构可调、可导出、可复位、可验收 |
| Phase 6 | 旧变量与兼容链路清除 | 旧变量、旧文案、旧文档、旧测试引用全部归零 |

---

## Phase 0 - 语义冻结与迁移边界确认

### 目标

- 把新命名、迁移边界、最终清理要求写成 SSOT。

### Todo

- [ ] 在 `08-theme-system-v2.md` 增补“共享基础层 / 单容器 frame / visual transform”模型。
- [ ] 在 `10-ui_definition.md` 标明四大容器 `root` 与 `frame` 的槽位关系。
- [x] 在 `11-token_design.md` 新增 `container-frame` 与四容器 `*-frame-*` 前缀规则。
- [x] 在 `32-ui-design-tracking-v1.md` 把 `2.0 legacy` 更新为“共享壳层 + 单容器覆写”新结构。
- [ ] 明确“最终迁移完成后不保留旧变量 / alias”的约束。

### 相关文件

- `docs/08-theme-system-v2.md`
- `docs/10-ui_definition.md`
- `docs/11-token_design.md`
- `docs/32-ui-design-tracking-v1.md`
- `docs/35-ui-theme-config-tauri-roadmap-v1.md`
- `docs/36-theme-container-frame-migration-plan-v1.md`

### Check

- [ ] 团队可仅根据文档回答“共享层有哪些变量、单容器有哪些覆写、哪些属于 visual transform”。
- [ ] 文档中不再把基础层命名为 `metal / chrome / skeuo`。
- [ ] 后续实现不再新增旧变量名家族。

### 当前判断（2026-03）

- `header-floating-gap` 已改为直接映射 `--mpx-header-floating-gap`，本质属于 Header 根层布局间隙，不属于单容器 frame visual transform。
- 若继续推进最终收口，建议把该项从“容器外观参数”语义中彻底分离，归入布局层 spacing / workspace shell 规则，而不是继续挂在 skeuo 历史命名下。
- Header / SysInfo 的 margin 旧 fallback 链已收口：Header 直接消费 `--mpx-header-floating-gap`，SysInfo 独立消费 `--mpx-sysinfo-root-margin`。
- SysInfo 卡片视觉骨架已不再走 Header token fallback，改为直接消费大面板 token：`--mpx-large-panel-main-*` + `--mpx-large-panel-shadow`。
- 四大容器 root 外观 slot 覆写链已删除；root/frame 只再消费共享壳层、单容器语义 token 与 `*-frame-*` visual transform。

---

## Phase 1 - 共享基础层改名与 contract 接入

### 目标

- 先把共享层新语义接入 contract / style / palette / ThemeParameter 基础结构。

### Todo

- [ ] 在 `contract.css` 中引入共享基础层新变量族。
- [ ] 在 `_style-template.css` 中提供新变量默认骨架。
- [ ] 在当前默认主题样式（如 `soft-skeuomorphic.css`）改为使用新变量名生成共享 fill / border / shadow / radius。
- [ ] 在 `themeParameterDefinitions.ts` 中将 `layout-padding / splitter-width / header-floating-gap` 改为新通用语义文案与变量名。
- [ ] 在 `ThemeParameterPanelMain.tsx` 中重写容器通用字段说明文案。
- [ ] 快照字段接入新共享层变量。

### 相关文件

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_style-template.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`
- `src/components/theme-parameter/themeParameterDefinitions.ts`
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/components/ThemeParameterPanel.test.tsx`
- `apps/GeneralUIFrame/src/styles/themes/contract.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/_style-template.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.css`

### Check

- [ ] 共享 fill / border / shadow / radius / workspace padding / header gap / splitter size 均已使用新变量名。
- [ ] `containerLayer` 基础层说明文字改为可理解语义，不再出现泛化的“用于对应 CSS 消费点的主题调试变量”。
- [ ] 主题运行链路中已可通过新共享变量改变大容器基础外观。

---

## Phase 2 - 四大容器 root/frame 改造

### 目标

- 把外观消费点从 root 迁到 frame，布局占位与 splitter 逻辑不变。

### Todo

- [ ] 为 Header 增加 `frame` 层，并将 `fill / border / shadow / radius / transform` 消费迁到 frame。
- [ ] 为 Sidebar 增加 `frame` 层，并处理 `overflow`、继承圆角与 focus ring。
- [ ] 为 Main 增加 `frame` 层，并保持图片/视频/音乐内容区布局不变。
- [ ] 为 Metadata 增加 `frame` 层，并处理 header/toggle 与主体滚动区域。
- [ ] 重新梳理 `overflow` 策略，默认允许视觉越界，但避免破坏内部滚动区。
- [ ] 验证 Electron header 拖拽区不受影响。

### 相关文件

- `src/components/AppHeader.tsx`
- `src/components/SidebarPanel.tsx`
- `src/components/AppWorkspace.tsx`
- `src/components/MetadataPanel.tsx`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/sidebar.css`
- `src/styles/app/main/main.part1.css`
- `src/styles/app/metadata.css`
- `src/styles/app/layout/layout.part2.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
- `src/components/AppHeader.test.tsx`
- `src/components/ThemeParameterPanel.test.tsx`

### Check

- [ ] 四大容器布局尺寸、splitter 拖动、折叠/展开、ratio 计算与当前版本一致。
- [ ] 视觉外观已由 `frame` 层承担，而不是根节点直接承担。
- [ ] 允许视觉越界时，容器不会因旧 `overflow: hidden` 被全部裁掉。
- [ ] 缩略图列数和分页仍只由原布局占位决定，不因 frame transform 发生变化。

---

## Phase 3 - 单容器外观覆写接入

### 目标

- Header / Sidebar / Main / Metadata 均可在共享值基础上独立覆写 `fill / border / shadow / radius`。

### Todo

- [ ] 为四大容器建立 `*-frame-fill` 覆写入口，且支持纯色与渐变串。
- [ ] 为四大容器建立 `*-frame-border-color` 覆写入口。
- [ ] 为四大容器建立 `*-frame-shadow` 覆写入口。
- [ ] 为四大容器建立 `*-frame-radius` 覆写入口。
- [ ] 更新 ThemeParameter 分组，让单容器外观字段位于共享层之后。
- [ ] 快照导出/导入覆盖单容器外观覆写字段。

### 相关文件

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_style-template.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/sidebar.css`
- `src/styles/app/main/main.part1.css`
- `src/styles/app/metadata.css`
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/components/theme-parameter/themeParameterDefinitions.ts`
- `src/components/ThemeParameterPanel.test.tsx`

### Check

- [ ] 不调单容器字段时，四大容器继续回退共享值。
- [ ] 调了单容器字段后，只影响对应容器，不串改其他容器。
- [ ] `fill` 既可承载纯色，也可承载渐变。
- [ ] 单容器复位可独立生效。

---

## Phase 4 - 单容器视觉变换接入

### 目标

- 在不改变布局占位的前提下，实现错位 / 旋转 / 缩放 / 镜像，并预留 3D 翻转能力。

### Todo

- [ ] 为四大容器接入 `translate-x / translate-y`。
- [ ] 为四大容器接入 `rotate-z`。
- [ ] 为四大容器接入 `scale-x / scale-y`，允许负值用于镜像。
- [ ] 为四大容器接入 `origin-x / origin-y`。
- [ ] 预留 `perspective / rotate-x / rotate-y / transform-style / backface-visibility`，即使第一批先隐藏高级控件，也要完成 contract 结构。
- [ ] 验证 visual transform 不改变缩略图自适应计算链路。
- [ ] 验证视觉越界下与相邻 pane、header overlay、focus ring 的叠放关系。

### 相关文件

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_style-template.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/app/sidebar.css`
- `src/styles/app/main/main.part1.css`
- `src/styles/app/metadata.css`
- `src/components/theme-parameter/themeParameterDefinitions.ts`
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/features/app/useAppNavigationState.ts`
- `src/components/ThemeParameterPanel.test.tsx`

### Check

- [ ] 视觉变换只影响表现，不改变布局占位。
- [ ] 缩略图 `thumbnailColumns / actualCellWidth / pageSize` 在同一布局尺寸下保持不变。
- [ ] 容器支持镜像（负 scale）与旋转。
- [ ] 未来引入 `rotateX / rotateY` 时无需再重做变量体系。

---

## Phase 5 - ThemeParameter UI 重排与快照迁移

### 目标

- 将 `containerLayer` 真正重排成“共享层 -> 单容器层 -> 内部件层”，并完成新字段的调试、快照与手工验收链路。

### Todo

- [ ] 将 `containerLayer` 顶层 section 改为：共享壳层 / Header / Sidebar / Main / Metadata / Sidebar Main 内部件 / Main Image Name List 内部件 / 高级后置项。
- [ ] 每个容器 section 下拆为：基础外观 / 视觉变换 / 高级 3D。
- [ ] 会话态从若干布尔值改为 section map + subgroup map。
- [ ] 快照导出结构迁移到新变量名家族。
- [ ] 逐页补全字段用途说明、默认来源、回退来源与预览区域。
- [ ] 按新顺序完成手工验收记录。

### 相关文件

- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/components/theme-parameter/themeParameterPanelSessionState.ts`
- `src/components/theme-parameter/themeParameterDefinitions.ts`
- `src/components/ThemeParameterPanel.test.tsx`
- `docs/32-ui-design-tracking-v1.md`
- `docs/35-ui-theme-config-tauri-roadmap-v1.md`

### Check

- [ ] 每个 section 与 subgroup 都可折叠，且会话态保留。
- [ ] 新字段都可改值、单项复位、快照导入/导出、切页保态。
- [x] `containerLayer` 不再混放历史 `legacy` 残留组。
- [ ] 手工验收记录改为围绕“共享层 + 单容器层”结构回填。

---

## Phase 6 - 旧变量与兼容链路清除

### 目标

- 将旧变量、旧 UI 文案、旧文档命名、旧测试引用全部移除，完成硬切换。

### Todo

- [ ] 删除旧共享壳层命名族在 `src/`、`apps/GeneralUIFrame/`、测试与活跃文档中的引用。
- [ ] 删除旧 `skeuo-*` 与其他风格耦合型基础层文案/参数名。
- [ ] 删除所有 alias / fallback 兼容链路，确保运行链路只依赖新变量名。
- [ ] 更新 `08-theme-system-v2.md`、`10-ui_definition.md`、`11-token_design.md` 为最终新名称版本。
- [ ] 更新 `32` / `35` / `36` 与 `01` / `02` 的文档入口与手工验收口径。
- [ ] 若历史说明必须保留旧名字，仅允许迁入 `docs/archive/`，不保留在活跃 SSOT。

### 相关文件

- `src/styles/themes/contract.css`
- `src/styles/themes/styles/_style-template.css`
- `src/styles/themes/styles/soft-skeuomorphic.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/components/theme-parameter/themeParameterDefinitions.ts`
- `src/components/ThemeParameterPanel.test.tsx`
- `apps/GeneralUIFrame/src/styles/themes/contract.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/_style-template.css`
- `apps/GeneralUIFrame/src/styles/themes/styles/soft-skeuomorphic.css`
- `docs/08-theme-system-v2.md`
- `docs/10-ui_definition.md`
- `docs/11-token_design.md`
- `docs/32-ui-design-tracking-v1.md`
- `docs/35-ui-theme-config-tauri-roadmap-v1.md`
- `docs/36-theme-container-frame-migration-plan-v1.md`

### Check

- [ ] `src/` 与 `apps/GeneralUIFrame/` 中旧变量名 grep 结果为 `0`。
- [ ] 活跃文档（`docs/archive/` 之外）中旧变量名仅允许出现在迁移回顾或归档说明准备阶段，最终版本归零。
- [ ] 运行链路、ThemeParameter、快照、测试、默认主题、示例工程全部只使用新变量名。
- [ ] 不存在 alias / 双写 / fallback 到旧变量的兼容链路。

---

## 8. 推荐实施顺序

1. 先完成 `Phase 0` 文档冻结，避免边做边改语义。
2. 先做 `Phase 1` 共享层，再做 `Phase 2` root/frame 改造。
3. `Phase 3` 与 `Phase 4` 可以连续推进，但必须先完成外观覆写，再做 visual transform。
4. `Phase 5` 必须在 `Phase 1~4` 主链路打通后再做；否则 UI 分组会反复重排。
5. `Phase 6` 作为硬切换收口；在它完成前，不视为迁移完成。

## 9. 回归与人工验收清单

### 9.1 自动检查

- `npm run test`
- `npm run lint`
- `npm run build`

必要时增加定向检查：

- `npx vitest run src/components/ThemeParameterPanel.test.tsx`
- `npx vitest run src/features/app/useResolvedMediaState.test.tsx`
- `npx vitest run src/features/app/useImageBrowserViewModel.test.tsx`

### 9.2 手工回归

- `containerLayer`：共享层、Header、Sidebar、Main、Metadata 新分组全部可调
- 缩略图模式：列数 / 单元宽度 / 分页不因 visual transform 变化
- name-list 模式：row/hover/focus/selected 链路不回退
- 视频 / 音乐模式：主区容器 frame 改造后不影响控件布局
- header：拖拽区、按钮点击、top banner 宽度约束正常
- splitter：拖拽、锁定、collapse/expand 正常

## 10. 风险与防偏

### 风险 A：视觉越界被旧裁切规则吞掉

- 防偏：在 `Phase 2` 单列检查 `overflow`、focus ring、圆角继承链。

### 风险 B：ThemeParameter UI 在迁移中继续叠旧字段

- 防偏：`Phase 5` 前禁止新增新的旧命名字段；新增字段只能进入新分组。

### 风险 C：旧变量长期残留，形成双轨

- 防偏：`Phase 6` 设为强制门槛；不完成旧变量归零，不视为迁移完成。

### 风险 D：示例工程与主工程名称漂移

- 防偏：`apps/GeneralUIFrame` 与主工程同 phase 同步修改，不允许延后独立漂移。

## 11. 当前结论

- 该迁移不是单纯重命名变量，而是一次“共享基础层语义重建 + 容器 root/frame 分层 + ThemeParameter 重排 + 旧命名硬切换”的联合改造。
- 只要坚持“布局占位不变、视觉变换走 frame、最终旧变量归零”三条红线，就能同时满足当前验收问题与未来风格扩展需求。
