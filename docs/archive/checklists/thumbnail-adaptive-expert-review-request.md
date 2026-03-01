# 缩略图自适应与缩放稳定性专家评审申请报告

## 0. 文档元信息

- 文档目的：提交本轮缩略图自适应改造的最终需求、实现路径、涉及文件与当前阻塞问题，申请专家级技术评审。
- 适用范围：`fg.main.content.grid` 缩略图网格的缩放、自适应、分割条联动逻辑（图片模式）。
- 当前状态：评审已完成，P0/P1 修复已实施并通过回归验证。
- 日期：2026-02-23
- 更新日期：2026-02-23（评审实施完成）

---

## 1. 本轮最终需求（用户确认版）

### 1.1 交互目标

1. 分割条拖动过程中即进行自适应，不再仅在 mouseup 后计算。  
2. 计算频率需受控：不追求逐帧更新，但应保持视觉连续、无明显延迟。  
3. 缩放级别不应单向滑落：允许因空间不足临时降级，空间恢复后应回归用户设定中心值。  
4. 缩放滑条驱动时也需触发有限自适应，并允许一定程度自动微调分割条。  
5. 缩放级数仅作为相对档位，核心目标是“升/降一级时尽量保持完整、均匀分布”。

### 1.2 行为约束

- 优先级：无裁剪（硬约束） > 空隙均匀（软目标） > 贴近偏好缩放。  
- 拖动与被动变化（启动、最大化、容器展开/挤压）均需自动重算。  
- 禁止 UI 反复弹跳与大幅跳级。

---

## 2. 已实施方案（本轮收敛版本）

### 2.1 状态分层与触发分层

- 引入 `preferred/effective` 双层缩放语义：
  - `thumbnailScale` 作为偏好中心（用户输入）。
  - `effectiveThumbnailScale` 作为运行时临时结果。
- 引入自适应触发原因分类：
  - `live_resize`
  - `commit_settle`
  - `passive_resize`
  - `manual_scale`
  - `initial_mount`

### 2.2 拖动中实时自适应

- 在分割条拖动层增加 live 上下文（source/delta/tick），并采用节流+位移门限：
  - 时间门限：`80ms`
  - 位移门限：`28px`
- 目标：降低频率冲击，同时保持拖动过程可见反馈。

### 2.3 缩放稳定策略

- 手动缩放冷却窗：`MANUAL_SCALE_SUPPRESS_MS = 500`。
- 手动缩放短延迟执行：`MANUAL_ADAPT_DELAY_MS = 36`。
- 计算签名去重：相同输入签名不重复求解。
- 级别跳变限制：`clampScaleStep(..., maxStep=2)`（按用户确认”2级”）。

### 2.4 首屏/被动变化补偿

- 新增 `initial_mount` 首次有效尺寸自适应。
- 新增 `passive_resize` 目标列推导（~~基于前后宽度差 + 半格阈值 + 步进~~，已在 P1 修复中改为基于绝对宽度的直接计算），用于展开/挤压双向重算。

### 2.5 滑条驱动分割条微调

- 手动缩放时允许有限自动微调分割条：
  - 触发阈值：`>= 10px`
  - 单次最大：`min(120px, 主区宽度*6%)`
  - 阻尼：`0.35`
  - 优先最近交互侧（sidebar/metadata）

---

## 3. 涉及文件清单（本轮核心）

### 3.1 运行时代码

- `src/features/app/useAppNavigationState.ts`
  - 自适应主编排、触发分层、首屏策略、跳级约束、手动冷却窗、分割条微调。
  - **[P0 修复]** 新增 `adaptiveOscillationRef` 振荡熔断：连续 3 次目标值相同时锁定至 preferred 并终止本轮自适应。
  - **[P1 修复]** `resolvePassiveTargetColumns` 改为基于当前绝对宽度 + preferred zoomLevel 直接计算目标列数。
- `src/features/app/useAppEffects.ts`
  - **[P0 修复]** 删除 `thumbnailScale ↔ normalizedThumbnailScale` 同步回写 effect（白屏根因）。
- `src/features/app/useAppInteractionEffects.impl.ts`
  - **[P0 修复]** 移除已废弃的 `thumbnailScale`、`normalizedThumbnailScale` 参数传递。
- `src/features/layout/usePaneResizers.ts`
  - 分割条拖动 live 上下文、节流与位移门限。
- `src/features/layout/thumbnailHorizontalSnap.ts`
  - 横向吸附上下文与目标列映射类型扩展。
- `src/features/layout/thumbnailAdaptiveSolver.ts`
  - 自适应求解结果结构与目标列约束求解。
- `src/components/ImageMainScaleControl.tsx`
  - 滑条 onChange 去重，避免同档位重复触发。

### 3.2 测试与验证相关

- `src/features/layout/thumbnailAdaptiveSolver.test.ts`
- `src/features/layout/thumbnailHorizontalSnap.test.ts`
- `src/features/layout/thumbnailLayout.test.ts`
- `src/__tests__/App.settings.test.tsx`
- `src/__tests__/App.mount.test.tsx`
- `src/__tests__/App.management.test.tsx`
- `src/__tests__/App.state.test.tsx`

---

## 4. 执行与验证记录

### 4.1 已通过项（评审前）

- 关键回归测试通过（settings/mount/management/state/layout）。
- `npm run build` 通过。
- `npm run build:electron` 通过。

### 4.2 非阻塞项（评审前）

- `npm run lint` 存在仓内既有 warning（非本轮核心改动文件）：
  - `src/features/app/useAppViewComposition.ts:470`（`react-hooks/exhaustive-deps`）。

### 4.3 评审实施后验证（2026-02-23）

- `npm run build` 通过（tsc + Vite，无新增错误）。
- `npm run test` 通过：**96 个测试文件，527 tests，全部通过**（1 个预置 skipped 保持不变）。

---

## 5. 当前阻塞问题（用户实机反馈）

> 评审已完成，P0/P1 已实施。以下记录原始阻塞问题及对应处置状态。

1. **缩放触发白屏**：拖动缩放滑条即出现白屏（不可操作）。**→ [已修复 P0]** 根因为 `useAppEffects` 中 `normalizedThumbnailScale` 回写 `thumbnailScale` 的同步 effect 与自适应链路构成闭合反馈环，已删除该 effect 并加入振荡熔断。
2. **重启后仍白屏**：首次重启仍白屏；第二次重启恢复可进入，但缩放操作仍复现白屏。**→ [已修复 P0]** 与第 1 条同源。
3. **展开方向计算失败**：挤压时计算相对正确，展开时大面积留白，推测与首屏留白同源。**→ [已修复 P1]** `resolvePassiveTargetColumns` 改为基于绝对宽度直接计算，消除了增量 delta 在展开场景的估算误差。
4. **右侧异常空洞**：用户原文”自适应右侧会有孔雀”，结合上下文判定为右侧存在明显”空缺/空洞”视觉问题。**→ [已修复 P1]** 与第 3 条同源。
5. **跳级感仍明显**：历史观察曾出现 5->9 的大跳（当前代码已加入 `±2` 限制，需实机复核）。**→ [待实机验证]** 代码层面 `clampScaleStep` 限制已保留，振荡熔断新增后理论上不会再出现快速振荡造成的跳级感，需实机确认。

---

## 6. 复现线索（供评审快速对齐）

### 6.1 复现路径 A（白屏）

1. 启动桌面端。  
2. 进入图片模式，打开缩放滑条。  
3. 连续拖动滑条（快慢均可）。  
4. 观察：界面白屏，需 `Alt+F4` 退出。

### 6.2 复现路径 B（首屏/展开留白）

1. 冷启动进入图片模式。  
2. 观察首屏网格填充。  
3. 通过分割条先挤压后展开。  
4. 观察：展开后留白显著，且右侧可能出现空洞。

---

## 7. 风险审计（评审后更新）

1. **渲染层重入风险**：~~滑条高频输入叠加自适应与分割条微调，可能形成短周期更新风暴。~~ **[已缓解]** 删除回写 effect + 振荡熔断后，闭合环已切断；`MANUAL_SCALE_SUPPRESS_MS` 冷却窗保留。
2. **策略耦合风险**：~~`manual_scale` 与 `passive_resize` 的目标函数存在竞态，可能在展开场景相互抵消。~~ **[已缓解]** `resolvePassiveTargetColumns` 改为绝对宽度计算后，展开场景不再依赖 delta 增量，竞态空间压缩。
3. **列推导误差风险**：~~被动场景列目标估算可能对某些尺寸区间偏乐观，导致右侧空洞。~~ **[已修复]** 直接用 preferred zoomLevel 下的布局计算目标列数，消除了估算误差来源。
4. **桌面端差异风险**：Vitest/jsdom 回归通过不等于 Electron 实时渲染稳定。**[仍存在]** 需实机验证第 5 条跳级感与整体视觉效果。

---

## 8. 专家评审结论（2026-02-23）

### 8.1 根因诊断

白屏的直接根因是 `useAppEffects.ts` 中的同步回写 effect（原 288-293 行）：只要 `normalizedThumbnailScale !== thumbnailScale` 就无条件调用 `updateSettings({ thumbnailScale: normalizedThumbnailScale })`，与自适应链路形成以下闭合环：

```
用户改 thumbnailScale
  → applyThumbnailAdaptiveScale(“manual_scale”)
  → setEffectiveThumbnailScale(solvedScale)          ← 可能 ≠ thumbnailScale
  → thumbnailLayout 重算 → normalizedThumbnailScale 变化
  → useAppEffects 回写 → updateSettings({ thumbnailScale: normalizedThumbnailScale })
  → 回到第一步，无限循环
```

展开留白的根因是 `resolvePassiveTargetColumns` 使用增量 delta 推算目标列数，在展开幅度接近半格阈值时 `steps = 0`，导致列数不更新、右侧出现大面积空洞。

### 8.2 各申请事项回答

1. **算法层**：当前多目标加权评分可用，主要问题不在算法质量而在调度层循环。待循环切断后可按需优化为分层求解（先列数 → 再 level → 再 gap）。
2. **调度层**：当前规模下无需引入统一调度器，`queueThumbnailAdaptiveScale` 的 setTimeout 替换策略已足够。
3. **稳定层**：已实施。振荡熔断（`adaptiveOscillationRef`，连续 3 次同目标值时锁定至 preferred）取代了”超阈值锁定”方案，侵入性更小。
4. **展开补偿层**：已实施。改为基于绝对宽度直接计算，等价于”偏好列回填”，无需额外策略切换。
5. **可观测性层**：未实施（非阻塞）。已有 O/C 全局调试开关可接入，后续需要时添加。

### 8.3 原申请事项（存档）

> 原评审申请事项如下，已在 8.2 中逐项回答。

1. **算法层**：是否应将当前多目标启发式改为明确分层求解（先离散列，再连续宽度，再缩放）。
2. **调度层**：是否应引入统一调度器（单飞队列 + 丢帧策略）替代多处 effect 触发。
3. **稳定层**：白屏场景是否需要运行时熔断（超过阈值直接锁定至 `preferred` 并暂停自适应）。
4. **展开补偿层**：被动展开是否应强制执行”回填列优先”而非”空隙最小优先”。
5. **可观测性层**：建议最小侵入日志指标集（触发源、输入签名、求解耗时、步进级差、最终 patch）。

---

## 9. 下一轮验收标准（建议）

1. 连续拖动滑条 10 秒，不出现白屏/卡死/无响应。**[P0 修复后，此项应通过]**
2. 首屏进入后 1 秒内完成一次稳定布局，右侧无明显空洞。**[P1 修复后，此项应通过]**
3. 展开场景可回填，不长期保留大面积空白。**[P1 修复后，此项应通过]**
4. 任一单次自适应级别变化不超过 `2`。**[`clampScaleStep` 保留，待实机确认]**
5. 分割条联动无反向牵引，不出现明显弹跳。**[待实机确认]**

---

## 10. 结论

~~本轮已完成需求翻译、策略落地与多轮回归，但实机仍存在高优先级稳定性阻塞（白屏与展开留白）。当前建议停止继续局部补丁，进入专家评审后再进行结构化重构，以避免在现有耦合路径上重复试错。~~

**（2026-02-23 更新）** 专家评审已完成并实施。P0（白屏根因：回写 effect 闭合循环）和 P1（展开留白：被动列数增量估算误差）均已修复，`npm run build` 与 `npm run test`（527 tests）全部通过。剩余待实机验证项：跳级感（第 5 条）与分割条弹跳（第 5 条验收标准），建议在下次 Electron 实机测试中逐项核对第 9 节验收标准。
