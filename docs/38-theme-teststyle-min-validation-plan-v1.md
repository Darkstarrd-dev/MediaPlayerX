# Theme 系统完成度审计与 TestStyle 最小验证实施方案 v1

## 1. 目标

- 固化当前 Theme 系统已知状态，作为后续收口的基线记录。
- 新增一个最小验证用 style：`TestStyle`。
- 该 style 只在顶层定义颜色种子，其余尽量通过 token 回退和自动派生验证覆盖链路。

## 2. 当前已知状态（审计结论）

1. Theme 分层骨架已落地：`contract -> palette -> theme-style -> app-*`，且 `@layer` 顺序明确。
2. 文档口径与实现仍有偏差：当前并非完整的自由 `style × palette` 组合系统，主路径仍以 `soft-skeuomorphic × skeuomorphic-luxury-white` 为核心。
3. 样式发现与加载未完全一致：`themeRegistry` 可发现 style/palette 元数据，但实际生效仍依赖 `src/styles/themes/index.css` 的显式 `@import`。
4. 自动派生链路在大面板、settings、file-list、metadata fetch 等区域相对稳定。
5. style 侧存在覆盖缺口：`soft-skeuomorphic` 分拆文件中仍有大量 palette 绑定选择器与硬编码颜色。
6. app 侧仍有少量功能型硬编码（如 fullscreen image adjust levels 黑白灰轨道/手柄）。
7. 因为上述缺口，新增最小验证 style 的首轮目标应是“诊断覆盖缺口”，而不是“替代现有主题视觉”。

## 3. 实施边界

### 3.1 本次纳入

- 新增 `TestStyle` 文件并接入主题入口。
- 在 `TestStyle` 仅定义顶层颜色种子。
- 通过 `color-mix()` 与语义 token 回退派生常见基础色（panel/input/button/overlay/list）。

### 3.2 本次不纳入

- 不改造 `soft-skeuomorphic` 既有硬编码与 palette 绑定选择器。
- 不处理 fullscreen transport / runway / image-grid halo 的专项视觉一致性。
- 不改变当前默认 style/palette 选择策略。

## 4. TestStyle 设计原则

1. 颜色定义仅集中在顶层种子：
   - `--mpx-palette-surface`
   - `--mpx-palette-base`
   - `--mpx-palette-accent-raw`
   - `--mpx-palette-text-raw`
   - `--mpx-palette-shadow-color`
2. 其余颜色尽量由种子自动派生，不写组件级局部硬编码颜色。
3. 保留布局与结构 token 的默认回退，避免把“布局问题”混入本轮颜色覆盖验证。

## 5. 首轮验收范围

### 5.1 主验收场景

- 三栏主界面（Header / Sidebar / Main / Metadata）。
- Settings 大面板。
- Metadata Fetch / Rename / Transcode 等 overlay 面板。

### 5.2 暂不作为阻塞项

- fullscreen image adjust levels。
- fullscreen/non-fullscreen transport 控件细节。
- music shader 专项与 image-grid halo 特效。

## 6. 验收口径

1. `TestStyle` 在不补 scoped selector 的前提下，可形成统一主路径视觉。
2. 如出现局部明显失配，优先记录为覆盖缺口，不在 `TestStyle` 内补丁式修复。
3. 缺口后续统一回填到 Theme 收口计划（`35` / `36`）对应 phase。

## 7. TestStyle 命中成功/未命中确认清单

> 使用方式：每轮手工验收后按项勾选，并在括号内补 1 行证据（页面路径或截图编号）。

### 7.1 命中成功确认（主路径）

- [ ] 三栏主界面容器层（Header/Sidebar/Main/Metadata）背景、文本、边框色整体一致（证据：）。
- [ ] Settings 大面板主骨架（side/main/group/item）可读性稳定，未出现高对比刺眼区域（证据：）。
- [ ] Overlay 体系（Metadata Fetch / Rename / Transcode）的输入框、边框、hover/focus 状态可感知（证据：）。
- [ ] 文件列表链路（Main/Metadata）行背景、hover、selected 状态随 `TestStyle` 派生色变化（证据：）。
- [ ] 按钮主链路（primary/secondary/default）颜色与文本对比正常，无明显“旧主题残留色块”（证据：）。

### 7.2 未命中确认（覆盖缺口）

- [ ] fullscreen image adjust levels 仍含黑白灰硬编码轨道/手柄，未被 `TestStyle` 接管（证据：`layout.part3.css` 区域 + 页面截图）。
- [ ] transport/fullscreen 专项控件存在独立视觉链路，未完全跟随 `TestStyle` 顶层种子（证据：）。
- [ ] runway/settings slider 局部 thumb 或阴影存在 style 专项残留，未完全自动派生（证据：）。
- [ ] image-grid/manage halo 特效存在独立色链或硬编码，不在本轮主路径覆盖内（证据：）。
- [ ] `soft-skeuomorphic` 分拆文件中的 palette 绑定选择器导致部分区域仅在指定 palette 命中（证据：样式选择器命中截图）。

### 7.3 结论记录

- [ ] 本轮结论：`TestStyle` 可作为“覆盖缺口诊断样式”继续推进。
- [ ] 本轮结论：需回填 `35/36` 的缺口条目已登记。
- [ ] 本轮结论：是否进入下一轮（仅修主路径 / 开始处理专项链路）。
