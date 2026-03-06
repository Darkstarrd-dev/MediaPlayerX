# UI Theme Config 与 Tauri 迁移实施路线图 v1

## 1. 目标

- 先把 UI 样式链路梳理为稳定的层级体系，确保后续可以在 `ThemeParameterPanel` 对应分页中逐层调试与验收。
- 最终将主题定义收敛为“小配置文件 + 少量结构化 token”，避免继续逐个修改业务 CSS。
- 在 UI 框架与前端边界稳定后，将桌面壳从 Electron 迁移到 Tauri，同时保持 `Vite + React` 形态不变。

## 2. 成功标准

- 新主题落地时，默认只改主题配置与 token，不直接改业务选择器里的颜色、阴影、渐变与边框串。
- `ThemeParameterPanel` 每个调试字段都能追溯到明确的层级、语义 token、slot token 与消费选择器。
- 导出的快照可进一步收敛为正式主题配置文件，而不是一次性的 inline 覆写集合。
- Renderer 不再直接依赖 Electron 注入对象；平台差异收敛到统一 bridge / repository / transport 层。
- Tauri 迁移后，React 组件层、feature hooks、theme contract 不因桌面壳替换而重写。

## 3. 非目标

- 本路线图不要求一次性消灭全部视觉特例；允许保留播放器、全屏图像调整、广告审核 overlay 等特化子系统。
- 本路线图不要求先迁移 Tauri 再收口主题；顺序必须反过来。
- 本路线图不要求把所有 CSS 删除；CSS 仍保留结构布局、状态选择器与 token 消费职责。

## 4. 总体策略

- 主链路统一为：`palette/style source -> contract semantic token -> slot token -> selector consume`。
- `ThemeParameterPanel` 作为验收台，不直接成为长期主题存储格式；正式主题仍应落到独立配置文件。
- 特例允许存在，但必须进入受控命名空间，不能回到匿名硬编码。
- 平台迁移采用“先前端去 Electron 化，再替换 transport”的方式，避免 UI 与桌面壳同时重构。

## 5. Phase 总览

| Phase | 名称 | 目标产物 |
|---|---|---|
| Phase 1 | UI 链路清点与冻结 | 分层清单、残余硬编码清单、特例白名单 |
| Phase 2 | ThemeParameter 分页对齐 | 分页到层级映射表、逐页可调可验收 |
| Phase 3 | 主题配置文件收口 | 结构化 theme schema、导入导出与默认主题样例 |
| Phase 4 | Renderer 平台解耦 | 无直接 Electron 依赖的 renderer 边界 |
| Phase 5 | Tauri 迁移实施 | Tauri transport/command/event 落地与回归通过 |

---

## Phase 1 - UI 链路清点与冻结

### 状态

- 状态：已完成
- 完成日期：2026-03-06
- 产物：`docs/32-ui-design-tracking-v1.md`、`docs/10-ui_definition.md`、`docs/11-token_design.md`
- 结论：已形成分页归属总表、残余链路清单、特例白名单与命名空间冻结；Phase 2 进入“补齐半成品链路 + ThemeParameter 对页验收”。

### 目标

- 把当前 UI 分层梳理到“可维护、可调试、可追踪”的状态。
- 明确哪些区域必须进入统一 theme 链路，哪些区域允许作为特例保留。

### Todo

- [x] 以 `docs/32-ui-design-tracking-v1.md` 为主表，补齐尚未收口到三段链路的区域。
- [x] 为每个层级补全这四列：`语义 token`、`slot token`、`消费选择器`、`ThemeParameter 所属分页`。
- [x] 标记仍存在的硬编码视觉值、主题耦合类选择器、跨层借壳 token。
- [x] 建立特例白名单，至少包含：播放器子系统、全屏图像调整、广告审核 overlay。
- [x] 对特例建立命名空间前缀，避免继续散落在匿名类规则中。
- [x] 同步 `10-ui_definition.md` 与 `11-token_design.md`，保证 slot 与 token 表一致。

### Check

- [x] 半成品链路已全部登记并标记所属后续 Phase，不再存在未入账区域。
- [x] 业务 CSS 中直连 palette / 硬编码 / 借壳 token 的残余区域已形成冻结清单。
- [x] `docs/32-ui-design-tracking-v1.md`、`docs/10-ui_definition.md`、`docs/11-token_design.md` 三者互相可对照。
- [x] 已可回答任意一个已登记 UI 区块“它属于哪一层、在哪一页调、由哪些 token 驱动”。

---

## Phase 2 - ThemeParameter 分页对齐与逐层验收

### 状态

- 状态：进行中
- 当前已完成子项：Import Task 子块链路、`MetadataFetchPanel` 内层搜索行 / 结果列 / 预览卡、`SubtitleCleanupPanel` 两个 preview panel 接入 `largePanelLayer`
- 当前下一项：metadata 内部卡片（`FeatureTagPickerModal` / `preference-record` / `booklet-binding`）

### 目标

- 让 `ThemeParameterPanel` 成为按层级验收 theme 链路的调试台，而不是临时杂项面板。

### Todo

- [ ] 为现有分页建立正式对照表：`containerLayer / largePanelLayer / smallPanelLayer / commonControls / buttonStates`。
- [ ] 对每个分页列出“必须覆盖的层级节点”和“暂不纳入的特例节点”。
- [ ] 补齐缺页项对应的调试字段，避免出现文档已有层级但分页无法调试的情况。
- [ ] 为每组字段补充用途说明、默认来源、回退来源与预览区域。
- [ ] 确保每个字段都能通过 UI 改值、复位、导出、导入、恢复默认。
- [ ] 逐页完成手工验收，记录“改值生效 / 复位生效 / 快照恢复生效 / 切页不丢状态”。

### Check

- [ ] 每个分页都有稳定预览入口，不依赖临时 DOM hack。
- [ ] 每个可视字段都能定位到实际 CSS 变量，而不是仅停留在文档命名。
- [ ] 快照导出内容可以完整覆盖该页可调字段。
- [ ] 同一字段的实际消费点与文档说明一致，不存在“文档写 A，实际命中 B”的长期偏差。

---

## Phase 3 - 主题配置文件收口

### 目标

- 把 ThemeParameter 的调试结果沉淀为正式主题配置，而不是继续靠散落的 CSS 覆写。

### Todo

- [ ] 定义正式 theme schema，区分 `palette`、`style`、`semantic token override`、`special-case token override`。
- [ ] 确定“小配置文件”边界：优先存 token 值，不存选择器级实现细节。
- [ ] 为颜色、长度、圆角、阴影、渐变、文本串分别定义可接受的值格式。
- [ ] 将当前 `snapshot` 导出结构逐步映射到正式 theme schema。
- [ ] 提供至少一份默认主题配置样例，作为“无需改 CSS 即可复制主题”的基线。
- [ ] 约束新增主题能力优先走 schema，而不是直接补业务 CSS 分支。

### Check

- [ ] 新增一个主题变体时，默认只需新增配置文件与必要的 style/palette 实现，不改业务样式消费端。
- [ ] 配置文件体量可控，能被人工审阅，不演变成隐性 CSS。
- [ ] 导出快照经过整理后可落为正式配置，不需要手工二次拼接大量字段。
- [ ] 复杂值（阴影串、渐变串）有明确承载策略，不再临时塞到随机变量。

---

## Phase 4 - Renderer 平台解耦

### 目标

- 在不改 UI 框架的前提下，让 renderer 不再直接耦合 Electron，全量改为可替换平台桥接。

### Todo

- [ ] 梳理所有直接使用 `window.mediaPlayerBackend`、`window.mediaPlayerWindow` 的位置。
- [ ] 将可走 `Repository` 的能力全部收口到 `MediaRepository` 与适配层。
- [ ] 将窗口能力、外部链接、系统能力等平台接口收口到独立 platform bridge。
- [ ] 保持 `contracts -> bridge -> repository -> feature/hooks` 的边界，不让组件直连平台对象。
- [ ] 为 Electron 与未来 Tauri 设计同一份前端接口，不暴露平台特定命名。
- [ ] 补充 mock 与测试替身，保证浏览器模式和测试环境不依赖 Electron 注入对象。

### Check

- [ ] Renderer 主业务组件中不再直接写 `window.mediaPlayerBackend` / `window.mediaPlayerWindow`。
- [ ] 更换桌面壳时，React 组件与大部分 feature hook 无需改动。
- [ ] 现有 `MockRepository` 与真实实现仍共享同一接口契约。
- [ ] 浏览器 mock 模式下的关键页面仍可工作或明确降级。

---

## Phase 5 - Tauri 迁移实施

### 目标

- 将桌面壳迁移到 Tauri/Rust，保留 `Vite + React` 前端结构与主题系统成果。

### Todo

- [ ] 按现有 `contracts` 定义梳理可迁移的 command/event/streaming 能力边界。
- [ ] 评估 Electron Main 中的能力分类：可直接迁移到 Rust、需要 Node sidecar、短期保留兼容层。
- [ ] 在 Tauri 侧实现 bridge/command 映射，并对齐现有 DTO/Zod 契约。
- [ ] 替换 preload/IPC 注入方式，但保持 renderer 调用接口不变。
- [ ] 逐类迁移高频能力：读取、导入、媒体解析、设置、任务轮询、外部打开、窗口能力。
- [ ] 建立迁移回归清单，覆盖主题、导入、媒体浏览、播放、管理、设置与弹层。

### Check

- [ ] 前端工程仍保持 `Vite + React` 主形态。
- [ ] 主题系统、ThemeParameter、主题配置文件不因平台迁移而改协议。
- [ ] 现有仓库接口与主要 feature hooks 可在 Tauri 环境复用。
- [ ] 关键业务链路通过回归：导入、浏览、播放、metadata、管理、设置、快捷键、弹层。

---

## 6. 执行顺序约束

1. 必须先完成 Phase 1 与 Phase 2，再推进 Phase 3。
2. 必须先完成 Phase 4 的 renderer 平台解耦，再开始 Phase 5。
3. 禁止跳过 theme 配置收口直接迁移 Tauri，否则后续会在新平台重复清理样式债务。
4. 禁止在迁移 Tauri 期间继续新增 renderer 直连 Electron 的代码。

## 7. 风险与防偏措施

### 风险 A：ThemeParameter 变成长期临时层

- 防偏：所有调试字段都必须能回落到正式 token / schema；不能只存在于调试面板组件内部。

### 风险 B：特例无限扩张，反向破坏统一链路

- 防偏：特例必须登记到白名单，并说明“不并入通用基架”的原因。

### 风险 C：主题配置文件失控，变成另一份 CSS

- 防偏：配置文件只承载 token 值与少量结构化复合值，不承载选择器实现。

### 风险 D：Tauri 迁移时 renderer 仍绑死 Electron API

- 防偏：把“清零 direct window API 调用”作为 Phase 4 的硬门禁，而不是建议项。

## 8. 审查方式

- 每完成一个 Phase，先更新本文件对应勾选项，再执行代码与文档对照审查。
- 若某项无法达成，必须在本文件补“阻塞原因 + 临时豁免 + 后续归还计划”，不能默认跳过。
- 审查顺序固定为：`实现 -> ThemeParameter 验收 -> 文档同步 -> 回归`。

## 9. 关联文档

- `08-theme-system-v2.md`
- `09-theme-brainstorm-entry.md`
- `10-ui_definition.md`
- `11-token_design.md`
- `32-ui-design-tracking-v1.md`
- `06-backend-integration-guardrails.md`
- `29-module-file-index.md`
