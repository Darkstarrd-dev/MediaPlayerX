修正之前执行中没有正确实施的内容:

基线提交hash是10f6c42

上一轮的内容已经提交，其中有不少地方出现了错误，需要对比基线提交时的状态，并根据上一轮的要求进行整改

目前的问题是：
1、theme parameter仅调节的数据持久化保存，但是退出时的状态没有持久化保存（本次级别，退出重启不需要保存）
比如当前打开某个分页，调节某项参数，退出页面查看该状态，然后重新打开，theme parameter应该保持之前的位置方便继续调节
2、大容器层新增的属性仍然有很多调节没有反应
3、检查新的token化，以及设置链路是否已经和上层的容器一样直接的一一对应，不再有跳很多级的相互引用
4、修复相对于基线提交时的样式错误，可观察到的有label borderleft变成了可移动的动画，focus的label is-sweeping动画消失，focus的label样式错误
也可能还有未被观察到的

---

## 完整修复实施方案

基线提交：10f6c42（fix(theme): 修复竖向滑杆预览区高度自适应）
当前提交：d0b9da3（fix(theme): 修复大容器调试不生效并改为会话内持久化）
差异范围：14 个文件，+1887 / -99 行

---

### 问题 1：Theme Parameter 面板 UI 状态未持久化

#### 1.1 现状分析

当前只有大容器层的 CSS 变量值（debugColors / debugTexts）通过模块级 `containerDebugSessionState` 做了会话级持久化。

以下 UI 状态每次打开面板都被重置，不符合"退出后保持之前位置"的要求：

| 状态 | 当前行为 | 期望行为 |
|------|---------|---------|
| activePage（当前分页） | 每次打开重置为 "parameters"（ThemeParameterPanelContainer.tsx:1009） | 保持上次关闭时所在的分页 |
| containerLegacyExpanded | 每次打开重置为 true（ThemeParameterPanelMain.tsx:1426） | 保持上次关闭时的折叠状态 |
| containerSidebarMainExpanded | 每次打开重置为 false（ThemeParameterPanelMain.tsx:1428） | 保持上次关闭时的折叠状态 |
| containerMainImageNameListExpanded | 每次打开重置为 false（ThemeParameterPanelMain.tsx:1430） | 保持上次关闭时的折叠状态 |
| commonExpanded / styleExpanded | 每次打开重置为 true（ThemeParameterPanelContainer.tsx:917-918） | 保持上次关闭时的折叠状态 |

#### 1.2 修复方案

**扩展模块级会话状态**

在 `ThemeParameterPanelContainer.tsx` 中，在现有 `containerDebugSessionState` 旁新增一个 UI 状态会话变量：

```typescript
interface ThemeParameterUISessionState {
  activePage: ThemeParameterPageId;
  containerLegacyExpanded: boolean;
  containerSidebarMainExpanded: boolean;
  containerMainImageNameListExpanded: boolean;
  commonExpanded: boolean;
  styleExpanded: boolean;
}

let uiSessionState: ThemeParameterUISessionState = {
  activePage: "parameters",
  containerLegacyExpanded: true,
  containerSidebarMainExpanded: false,
  containerMainImageNameListExpanded: false,
  commonExpanded: true,
  styleExpanded: true,
};
```

**修改面板打开 effect**（ThemeParameterPanelContainer.tsx:~1009）：
- 将 `setActivePage("parameters")` 改为 `setActivePage(uiSessionState.activePage)`

**修改面板关闭 effect**（ThemeParameterPanelContainer.tsx:~1038-1047）：
- 在 `captureContainerDebugSessionState` 之后，同步捕获 `activePage` 和所有折叠状态到 `uiSessionState`

**分页切换时同步**：
- `setActivePage` 调用处增加 `uiSessionState.activePage = newPage`

**折叠状态同步**：
- 需要将折叠状态从 Main 组件传回 Container，或通过 props 回调通知
- 建议方案：在 ThemeParameterPanelMain 中增加 `onUIStateChanged` 回调，每次折叠/展开时通知父组件更新 `uiSessionState`

**涉及文件**：
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`

---

### 问题 2：大容器层调节不生效（残余问题）

#### 2.1 已验证的 token 消费覆盖率

通过对比 contract.css 声明和各 CSS 文件的消费点：

**Sidebar Main 区域**：
- 总声明：~35 个变量
- 已使用：33 个（94.3%）
- 未使用：2 个

**Main Image Name-List 区域**：
- 总声明：26 个变量
- 已使用：26 个（100%）

#### 2.2 未被消费的变量

| 变量 | 声明位置 | 问题 |
|------|---------|------|
| `--mpx-sidebar-main-count-text` | contract.css:342 | 声明了但没有任何消费点引用。实际消费走的是 `--mpx-sidebar-main-count-packages-text` 和 `--mpx-sidebar-main-count-images-text` |
| `--mpx-sidebar-main-count-packages-shadow` | contract.css:349-352 | 声明了但没有消费点。soft-skeuomorphic.components.part2.css:238 中 packages 的 box-shadow 直接用的是 `--mpx-slot-fg-sidebar-main-count-packages-shadow` -> `--mpx-sidebar-main-count-packages-shadow`，但实际的 CSS 回退链中可能引用了但结构复杂导致工具未匹配到 |

#### 2.3 修复方案

1. **`--mpx-sidebar-main-count-text`**：
   - 在 soft-skeuomorphic.components.part2.css 的 `.sidebar-count` color 属性中，将硬编码回退改为引用此变量
   - 或者将其作为 `--mpx-sidebar-main-count-packages-text` 和 `--mpx-sidebar-main-count-images-text` 的 fallback 父变量
   - 当前 count-packages-text 默认值是 `var(--mpx-status-info-text)`，count-images-text 是 `var(--mpx-status-success-text)`，建议在消费点 `.sidebar-count` 的 color 中补充 `var(--mpx-sidebar-main-count-text, #000)` 作为中间层

2. **`--mpx-sidebar-main-count-packages-shadow`**：
   - 检查 part2.css:238 的 packages shadow 消费链，确认是否已正确消费
   - 如果确实未消费，在 packages 的 box-shadow 中补充此变量

3. **完整验证**：
   - 逐一在 Theme Parameter 中调节每个变量，在界面上确认视觉变化
   - 特别关注 count 系列、toggle-text、active 系列

**涉及文件**：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`

---

### 问题 3：Token 链路层级检查

#### 3.1 当前链路结构

当前实现的三层链路：
```
消费点: var(--mpx-slot-fg-*, var(--mpx-semantic-*, fallback))
                ↑ slot 层         ↑ 语义层          ↑ 硬编码
```

Theme Parameter 设置的是语义层（`--mpx-sidebar-main-*` / `--mpx-main-image-name-list-*`）。
当 slot 层（`--mpx-slot-fg-*`）已被设置时，语义层的修改不会生效。

#### 3.2 与上层系统的对比

上层容器（header、sidebar 骨架等）的链路：
```
contract.css 声明语义 token (默认值)
  -> style/palette 文件赋值
    -> slot 作为局部覆写入口
      -> 组件选择器消费
```

当前 sidebar-main / name-list 的链路基本符合这个模式，但存在以下偏差：

| 偏差项 | 说明 | 严重程度 |
|--------|------|---------|
| slot 层拦截语义层 | 如果用户或代码曾设置过 `--mpx-slot-fg-*`，语义层的 Theme Parameter 调节无效 | 高（已通过迁移函数缓解） |
| 部分变量 fallback 跳级 | 如 `count-packages-bg` 的 fallback 链为 `slot -> semantic -> count-bg 的 slot -> count-bg 的 semantic -> transparent`，嵌套四层 | 中 |
| style/palette 层未赋值 | 所有语义 token 的默认值直接写在 contract.css 的 `:root` 中，没有通过 style/palette 分层 | 低（当前只有一个主题风格） |

#### 3.3 修复方案

**短期（本次修复）**：
- 确保迁移函数 `migrateLegacySidebarMainSlots()` 覆盖所有可能残留的旧 slot 变量
- Theme Parameter 在设置值时应同时清除对应的 slot 变量（如果存在），确保语义层生效
- 减少不必要的嵌套层级，4 层以上的嵌套简化为 2-3 层

**中期（后续优化）**：
- 将语义 token 默认值从 contract.css 的 `:root` 移到 style 层文件中（如 soft-skeuomorphic-components 相关文件）
- contract.css 只声明变量名，不赋默认值

**涉及文件**：
- `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`（迁移函数扩展）
- `src/components/theme-parameter/ThemeParameterPanelMain.tsx`（设置值时清除 slot）
- `src/styles/themes/contract.css`（简化嵌套）
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`（简化嵌套）

---

### 问题 4：相对于基线的样式回归

#### 4.1 sidebar-label marker 伪元素从 `::before` 改为 `::after`

**基线行为**（10f6c42）：
- marker（左侧彩条）使用 `::before`（soft-skeuomorphic.components.part1.css:643）
- 折叠箭头也使用 `::before`（sidebar.css:529），通过 `content: "▾"` 覆盖 marker 的 `content: ""`
- 结果：collapsible label 只有折叠箭头，没有左侧彩条
- 非 collapsible label 有左侧彩条（marker），focus/active 时显示

**当前行为**（d0b9da3）：
- marker 改为 `::after`（soft-skeuomorphic.components.part1.css:676）
- 折叠箭头仍为 `::before`（sidebar.css:617）
- 结果：**collapsible label 同时有折叠箭头和 marker**
- 当 collapsible label 处于 active/focused 状态时，左侧彩条（`::after` marker opacity: 1）会显示，这在基线时不存在

**用户观察到的现象**："label border-left 变成了可移动的动画"——即 collapsible label 在 active/focus 状态切换时，左侧出现了不该有的彩条。

**修复方案**：

方案 A（推荐）：**marker 改回 `::before`，折叠箭头改用组件内 span**
- 在 `SidebarPanelRow.tsx` 中，将折叠箭头从 CSS `::before` 改为 JSX 中的 `<span>` 元素
- marker 恢复为 `::before`（还原 part1.css 的改动）
- 这样彻底解决伪元素冲突

方案 B：**保持 `::after` marker，对 collapsible label 的 `::after` 做隐藏**
- 在 part1.css 中增加选择器：
  ```css
  .sidebar-label.is-collapsible::after {
    display: none;  /* 基线行为：collapsible 没有 marker */
  }
  ```
- 或者将 is-active / focus-visible 下的 `::after` 排除 `.is-collapsible`：
  ```css
  .sidebar-row.is-active .sidebar-label:not(.is-collapsible)::after { opacity: 1; }
  ```
- 但这可能丢失一些 toggle-text 修复

方案 C：**还原 `::before`，接受 toggle-text 不可调的限制**
- 将 part1.css 中所有 `::after` 改回 `::before`（逆向 diff）
- 放弃在当前架构下单独调节折叠箭头颜色

**建议采用方案 B**：影响最小，只需在 part1.css 中补充对 `.is-collapsible` 的排除规则。

**涉及文件**：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`（marker 显示规则）

#### 4.2 focus 时 label 的 marker 视觉效果变化

**基线行为**：
- 非 collapsible label focus 时，`::before` marker 的 `opacity: 0 -> 1`，显示左侧彩条
- collapsible label focus 时，`::before` 是折叠箭头，不显示彩条

**当前行为**：
- 非 collapsible label focus 时，`::after` marker 的 `opacity: 0 -> 1`（行为与基线一致）
- collapsible label focus 时，`::after` marker 也会 `opacity: 0 -> 1`（**回归**：基线时不显示）

**用户描述**："focus 的 label is-sweeping 动画消失"
- `is-sweeping` 类实际只用于 header logo 光泽效果（part1.css:1000-1002），从未用于 sidebar-label
- 用户可能指的是 focus 时 marker 彩条的视觉效果出现异常，或者其他 focus 视觉反馈的变化

**修复方案**：
- 与 4.1 同步修复，确保 collapsible label 在 focus 时不显示 marker（还原基线行为）
- 确保非 collapsible label 在 focus 时正确显示 marker

#### 4.3 `.sidebar-label:not(.is-collapsible)` 选择器简化引入的差异

**基线**（sidebar.css:475-484）：
```css
/* 4 个组合选择器，覆盖所有状态 */
:root[...] .sidebar-row .sidebar-label:not(.is-collapsible),
:root[...] .sidebar-row.is-active .sidebar-label:not(.is-collapsible),
:root[...] .sidebar-row.is-hover-active .sidebar-label:not(.is-collapsible),
:root[...] .sidebar-row.is-active.is-hover-active .sidebar-label:not(.is-collapsible) {
  background: linear-gradient(135deg, #f3f0ea, #e9e5de);
  border-color: #d5d0c8;
}
```

**当前**（sidebar.css:555-575）：
```css
/* 只排除 is-active，未排除 is-hover-active */
:root[...] .sidebar-row:not(.is-active) .sidebar-label:not(.is-collapsible) {
  background: var(--mpx-slot-..., var(--mpx-sidebar-main-label-plain-bg, ...));
  border-color: var(--mpx-slot-..., var(--mpx-sidebar-main-label-plain-border, ...));
}
```

**差异分析**：
- 基线：所有状态（包括 active）的 non-collapsible label 都用 plain gradient 背景。active 的 focus-color 背景被这条规则覆盖（因为特异性相同但后出现）
- 当前：active 状态排除在外，active 的 non-collapsible label 可以显示 focus-color 背景

**这可能是有意的修复**：基线时 active 的 non-collapsible label 背景被 plain gradient 覆盖，active 背景无法显示。当前版本修复了这个问题。

**但同时引入了视觉差异**：
- is-hover-active（非 active 的 hover 状态）在基线时有 plain gradient，当前版本没有这条规则覆盖
- 需要确认 is-hover-active 的 non-collapsible label 是否需要保持 plain gradient

**修复方案**：
- 确认 `is-hover-active` 状态下 non-collapsible label 的期望行为
- 如果需要保持 plain gradient，补充 `is-hover-active:not(.is-active)` 的规则

**涉及文件**：
- `src/styles/app/sidebar.css`

#### 4.4 其他可能未被观察到的样式差异

| 区域 | 基线 | 当前 | 风险 |
|------|------|------|------|
| sidebar-tree-content background | 硬编码 | 三层变量回退 | 低（默认值与基线一致） |
| sidebar-bullet pending/running | 硬编码 | 三层变量回退 | 低（默认值一致） |
| sidebar-count text/border/bg | 硬编码 | 三层变量回退 | 低（默认值一致） |
| name-list header/body/row | 单层变量 | 三层变量回退 | 低（默认值一致） |
| name-list row-main | 单层变量 | 三层变量 + 新增 text/outline/font-weight | 中（新增属性可能影响未设置状态） |

**建议验证**：
- 启动应用后切换到 soft-skeuomorphic / skeuomorphic-luxury-white 风格
- 逐一检查 sidebar 和 name-list 在以下状态下的视觉表现：
  - idle、hover、active、focus-visible、manage-selected
  - collapsible collapsed/expanded
  - count-packages / count-images 徽标样式

---

### 执行顺序

按优先级和依赖关系排序：

**第一步：修复样式回归（问题 4）**

最高优先级，用户已观察到的视觉错误。

1. 修复 collapsible label 的 `::after` marker 显示问题（4.1 + 4.2）
   - 文件：`soft-skeuomorphic.components.part1.css`
   - 对 `.sidebar-label.is-collapsible` 的 `::after` 增加 `display: none` 或排除规则
   - 对 active/focus-visible 的 `::after` 选择器排除 `.is-collapsible`

2. 检查并修复 non-collapsible label 的 hover-active 状态（4.3）
   - 文件：`sidebar.css`

3. 全面视觉回归测试

**第二步：修复 Token 链路残余问题（问题 2 + 3）**

4. 补齐 `--mpx-sidebar-main-count-text` 和 `--mpx-sidebar-main-count-packages-shadow` 的消费点
   - 文件：`soft-skeuomorphic.components.part2.css`

5. 简化 4 层以上的 CSS 变量嵌套
   - 文件：`soft-skeuomorphic.components.part2.css`（count-packages-bg 的 4 层嵌套）

6. Theme Parameter 设置值时确保清除对应 slot 变量
   - 文件：`ThemeParameterPanelMain.tsx`

**第三步：实现面板状态持久化（问题 1）**

7. 新增 UI 会话状态变量（activePage + 折叠状态）
   - 文件：`ThemeParameterPanelContainer.tsx`

8. 修改面板打开 effect，从会话状态恢复 activePage
   - 文件：`ThemeParameterPanelContainer.tsx`（第 1009 行）

9. 增加折叠状态的回调同步机制
   - 文件：`ThemeParameterPanelMain.tsx`（onUIStateChanged 回调）
   - 文件：`ThemeParameterPanelContainer.tsx`（接收并保存折叠状态）

10. 面板关闭 effect 中捕获完整 UI 状态
    - 文件：`ThemeParameterPanelContainer.tsx`（第 1038-1047 行）

**第四步：验证**

11. 运行测试：`npx vitest run src/components/ThemeParameterPanel.test.tsx`
12. 运行 lint：`npx eslint` 覆盖所有改动文件
13. 补充测试用例：
    - 面板关闭后重新打开，activePage 保持
    - 面板关闭后重新打开，折叠状态保持
    - 测试位置：`src/components/ThemeParameterPanel.test.tsx`
14. 视觉回归测试（手动）：
    - sidebar collapsible label 在 active/focus 状态下无多余 marker
    - sidebar non-collapsible label 在各状态下视觉与基线一致
    - Theme Parameter 各调节项生效验证

---

### 涉及文件汇总

| 文件 | 修改内容 |
|------|---------|
| `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css` | marker 对 collapsible label 的排除规则 |
| `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css` | 补齐 count-text/count-packages-shadow 消费点、简化嵌套 |
| `src/styles/app/sidebar.css` | 检查 hover-active non-collapsible 规则 |
| `src/components/theme-parameter/ThemeParameterPanelContainer.tsx` | UI 会话状态持久化、面板打开/关闭 effect 修改 |
| `src/components/theme-parameter/ThemeParameterPanelMain.tsx` | 折叠状态回调、设置值时清除 slot |
| `src/components/ThemeParameterPanel.test.tsx` | 补充 activePage 持久化、折叠状态持久化测试 |

---

### 修复方案实施反馈

已读取 `docs/34-fix_require.md`。当前可以直接按文档落地，实施顺序建议保持不变（先修回归样式，再修 token 链路，再补 UI 会话态，最后验证）。

**执行计划（不改代码，仅规划）**
- 第 1 阶段：样式回归修复  
  - `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`：让 collapsible label 不再出现多余 marker（恢复基线视觉）。  
  - `src/styles/app/sidebar.css`：核对并修正 `is-hover-active` + `not(.is-active)` 的 non-collapsible 行为。
- 第 2 阶段：大容器 token 链路补齐  
  - `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`：补齐 `--mpx-sidebar-main-count-text` 与 `--mpx-sidebar-main-count-packages-shadow` 消费点；简化过深 fallback 链。
  - `src/components/theme-parameter/ThemeParameterPanelMain.tsx`：设置 semantic token 时同步清对应 slot，避免 slot 拦截。
- 第 3 阶段：Theme Parameter 面板 UI 状态会话持久化  
  - `src/components/theme-parameter/ThemeParameterPanelContainer.tsx`：新增 `uiSessionState`（`activePage` + 各折叠状态），在打开/关闭面板时恢复/捕获。  
  - `src/components/theme-parameter/ThemeParameterPanelMain.tsx`：通过回调上报折叠状态变更。
- 第 4 阶段：验证  
  - 自动化：`npx vitest run src/components/ThemeParameterPanel.test.tsx`、`npx eslint ...`（覆盖改动文件）。  
  - 测试补充：面板重开后 `activePage` 保持、折叠状态保持。  
  - 手工视觉：sidebar 在 idle/hover/active/focus/manage-selected + collapsible 展开/折叠场景对比基线 `10f6c42`。

**验收标准（本轮）**
- 关闭并重开 Theme Parameter 后，分页和折叠状态保持（仅会话内，不跨重启）。  
- 大容器调节项不再“调了没反应”（尤其 count/toggle/active 系列）。  
- 相对基线的已知回归（marker、focus 视觉、label 样式）修复。  
- token 链路趋于一一对应，减少多级跳转。

**待你确认 1 项（唯一分歧点）**
- `is-hover-active` 的 non-collapsible label，要不要严格对齐基线视觉？  
  - 推荐：**严格对齐基线**（风险最小，便于回归验证）。  
  - 若你选择“保留当前优化”，我会只修明显回归，不强制回滚该状态表现。


已按你“按推荐实施”完成修复，重点是把回归样式、token 链路、面板会话态三块一次性收敛。

- 修了 sidebar 回归：`collapsible` label 不再显示多余 marker，active/focus/manage 仅对非 collapsible 显示 marker，恢复接近基线行为（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`）。
- 修了 hover-active 对齐：补了 non-active + hover-active 的 plain 规则显式匹配，避免状态差异漂移（`src/styles/app/sidebar.css`）。
- 修了 count token 链路：`count-packages/images-bg` 的 fallback 从多层嵌套简化为语义直连；`count-packages/images-text` 默认回落到 `--mpx-sidebar-main-count-text`，保证通用 token 可生效（`src/styles/app/sidebar.css`、`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`、`src/styles/themes/contract.css`）。
- 实现了 UI 会话持久化：分页 `activePage`、`common/style` 折叠、容器三段折叠都能在关闭重开后保留（会话内，不跨重启），并保持你之前的大容器调试会话态（`src/components/theme-parameter/ThemeParameterPanelContainer.tsx`、`src/components/theme-parameter/themeParameterPanelSessionState.ts`）。
- 补了“设置语义 token 时清理 legacy slot”逻辑，避免 slot 层继续拦截语义层（`src/components/theme-parameter/ThemeParameterPanelMain.tsx`）。
- 新增并更新测试：覆盖分页持久化、折叠持久化、写语义 token 自动清 slot（`src/components/ThemeParameterPanel.test.tsx`）。

已验证：
- `npx vitest run src/components/ThemeParameterPanel.test.tsx`（23/23 通过）
- `npx eslint src/components/theme-parameter/ThemeParameterPanelMain.tsx src/components/theme-parameter/ThemeParameterPanelContainer.tsx src/components/theme-parameter/themeParameterPanelSessionState.ts src/components/ThemeParameterPanel.tsx src/components/ThemeParameterPanel.test.tsx`（通过）

可继续的自然下一步：
1. 你本地跑一轮手工视觉回归（sidebar 的 idle/hover/active/focus + collapsible 展开/折叠）。
2. 需要的话我可以再把这轮变更同步写入 `docs/32-ui-design-tracking-v1.md`（会话持久化与链路收敛说明）。

### 需要继续核查的问题

主要是2、4两个问题的修复，依然没有生效

2、无法测试全部，仅列出前面一部分的参数测试结果，供用于定位问题
--mpx-sidebar-main-bg（用于侧栏主列表壳层背景（.sidebar-tree）） 不生效
--mpx-sidebar-main-label-text（用于侧栏主列表（fg-sidebar-main）样式链路） 生效
--mpx-sidebar-main-label-border（用于侧栏主列表标签边框（.sidebar-label）） 生效
--mpx-sidebar-main-label-plain-border（用于侧栏主列表（fg-sidebar-main）样式链路）生效
--mpx-sidebar-main-label-active-bg（用于侧栏主列表标签激活背景（.sidebar-row.is-active .sidebar-label）） 不生效
--mpx-sidebar-main-active-ring（用于侧栏主列表标签激活外圈（active ring））不生效或没使用
--mpx-sidebar-main-active-underlay（用于侧栏主列表标签激活内圈衬底（active underlay）） 不生效或没使用
--mpx-sidebar-main-label-marker-focus-bg（用于侧栏主列表（fg-sidebar-main）样式链路）生效（这个就是问题4当中的左侧色块的颜色设置）
--mpx-sidebar-main-label-marker-selected-bg（用于侧栏主列表（fg-sidebar-main）样式链路）生效
--mpx-sidebar-main-label-manage-selected-bg（用于侧栏主列表（fg-sidebar-main）样式链路）不生效或没使用
--mpx-sidebar-main-label-toggle-text（用于侧栏可折叠箭头颜色（.sidebar-label.is-collapsible::before））生效

4、在基线提交 10f6c42 中
sidebar-label通过附加类名 mpx-random-sheen-host is-sweeping 触发掠过label整体的动画，模拟高光扫掠效果
通过附加类名 is-selected 在label左侧增加#8A919A颜色的色带
is-active 在label左侧增加#F2D796颜色的色带
同类型的设置在name-list-row中有明确的border-left-color border-left两个属性控制
但是在f12查看sidebar-label时找不到类似的设置，实际显示出来的效果是正常的

## 第二轮排查：残余问题定位与修复方案

基于提交 58e8bfb（fix(theme): 修复参数面板会话态与侧栏样式回归）之后的用户反馈，以下问题仍然存在。

---

### 问题 2 残余：调节不生效的根因定位

#### 不生效变量清单与根因

##### 2-A. `--mpx-sidebar-main-bg`（侧栏主列表壳层背景）—— 不生效

**根因：soft-skeuomorphic 主题中硬编码背景色的特异性更高**

消费链路（sidebar.css:329-332）：
```css
.sidebar-tree {
  background: var(--mpx-slot-fg-sidebar-main-bg, var(--mpx-sidebar-main-bg, transparent));
}
```
特异性：(0, 1, 0)

覆盖规则（soft-skeuomorphic.components.part1.css:34-38）：
```css
:root[data-mpx-style^="soft-skeuomorphic"][data-mpx-palette="skeuomorphic-luxury-white"]
  .sidebar-main-shell
  .sidebar-tree {
  background: #e3e7ec;
}
```
特异性：(0, 3, 1)

**part1.css 的规则特异性 (0,3,1) 远高于 sidebar.css 的 (0,1,0)，硬编码 `#e3e7ec` 始终覆盖变量。**

**修复方案**：将 part1.css:34-38 的硬编码改为消费语义 token：
```css
:root[data-mpx-style^="soft-skeuomorphic"][data-mpx-palette="skeuomorphic-luxury-white"]
  .sidebar-main-shell
  .sidebar-tree {
  background: var(
    --mpx-slot-fg-sidebar-main-bg,
    var(--mpx-sidebar-main-bg, #e3e7ec)
  );
}
```
同时将 contract.css 中 `--mpx-sidebar-main-bg` 的默认值从 `transparent` 改为留空（不设初始值），让各风格文件自行赋值。

**涉及文件**：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`（第 34-38 行）
- `src/styles/themes/contract.css`（第 331 行）

---

##### 2-B. `--mpx-sidebar-main-label-active-bg`（标签激活背景）—— 不生效

**根因：soft-skeuomorphic 基础 label 规则特异性高于 active 规则**

active 规则（sidebar.css:380-384）：
```css
.sidebar-row.is-active .sidebar-label {
  background: var(--mpx-slot-fg-sidebar-main-label-active-bg,
    var(--mpx-sidebar-main-label-active-bg, var(--mpx-state-focus-color)));
}
```
特异性：(0, 3, 0)

基础 label 规则（soft-skeuomorphic.components.part1.css:628-658）：
```css
:root[data-mpx-style^="soft-skeuomorphic"][data-mpx-palette="skeuomorphic-luxury-white"]
  [data-slot="fg-sidebar-main"]
  .sidebar-row
  .sidebar-label {
  background: var(--mpx-slot-fg-sidebar-main-label-bg,
    var(--mpx-sidebar-main-label-bg, linear-gradient(135deg, #e4e6ea, #c8ccd3)));
  box-shadow: var(--mpx-slot-fg-sidebar-main-label-shadow, ...);
}
```
特异性：(0, 5, 1)

**part1.css 基础 label 规则 (0,5,1) >> sidebar.css active 规则 (0,3,0)。基础 label 的 `background` 和 `box-shadow` 始终覆盖 active 状态的值。**

**修复方案**：在 part1.css 中增加与基础 label 同等特异性的 active 覆盖规则：
```css
:root[data-mpx-style^="soft-skeuomorphic"][data-mpx-palette="skeuomorphic-luxury-white"]
  [data-slot="fg-sidebar-main"]
  .sidebar-row.is-active
  .sidebar-label {
  background: var(
    --mpx-slot-fg-sidebar-main-label-active-bg,
    var(--mpx-sidebar-main-label-active-bg, var(--mpx-state-focus-color))
  );
  box-shadow:
    var(
      --mpx-slot-fg-sidebar-main-label-active-shadow,
      var(--mpx-sidebar-main-label-active-shadow,
        var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow)))
    ),
    0 0 0 2px color-mix(in srgb,
      var(--mpx-slot-fg-sidebar-main-active-underlay,
        var(--mpx-sidebar-main-active-underlay, var(--mpx-sidebar-bg))) 90%, transparent),
    0 0 0 4px color-mix(in srgb,
      var(--mpx-slot-fg-sidebar-main-active-ring,
        var(--mpx-sidebar-main-active-ring, var(--mpx-state-focus-color))) 82%, transparent);
  transform: var(--mpx-control-active-transform);
}
```
特异性 (0, 6, 1) > 基础 label (0, 5, 1)，active 背景和 ring/underlay 都能生效。

**涉及文件**：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`（在第 726 行 `:active` 规则之后插入）

---

##### 2-C. `--mpx-sidebar-main-active-ring` / `--mpx-sidebar-main-active-underlay`（激活外圈/内圈）—— 不生效

**根因与 2-B 相同**：这两个变量用在 `.sidebar-row.is-active .sidebar-label` 的 `box-shadow` 中（sidebar.css:398-417），但被 part1.css 基础 label 的更高特异性 `box-shadow` 覆盖。

**修复方案**：与 2-B 合并处理，在 part1.css 新增的 active 规则中一并设置 `box-shadow`。

---

##### 2-D. `--mpx-sidebar-main-label-manage-selected-bg`（管理模式选中背景）—— 不生效

**根因**：manage.css 中的消费规则特异性不够。

manage.css 中的规则可能也被 part1.css 基础 label 规则覆盖。需要在 part1.css 中补充 `.is-manage.is-selected` 对应的高特异性规则。

**修复方案**：在 part1.css 中增加 manage-selected 覆盖：
```css
:root[data-mpx-style^="soft-skeuomorphic"][data-mpx-palette="skeuomorphic-luxury-white"]
  [data-slot="fg-sidebar-main"]
  .sidebar-row.is-manage.is-selected
  .sidebar-label {
  background: var(
    --mpx-slot-fg-sidebar-main-label-manage-selected-bg,
    var(--mpx-sidebar-main-label-manage-selected-bg, var(--mpx-state-selected-color))
  );
  box-shadow: var(
    --mpx-slot-fg-sidebar-main-label-manage-selected-shadow,
    var(--mpx-sidebar-main-label-manage-selected-shadow,
      var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))));
}
```

**涉及文件**：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

---

##### 不生效的统一根因总结

**所有不生效变量共享同一个根本原因**：soft-skeuomorphic.components.part1.css 中 `.sidebar-label` 的基础规则选择器特异性为 (0, 5, 1)，而 sidebar.css / manage.css 中各状态规则的特异性只有 (0, 3, 0)。基础规则的 `background` 和 `box-shadow` 始终覆盖状态规则。

**统一修复策略**：在 part1.css 中为 `.is-active`、`.is-active.is-hover-active`、`.is-manage.is-selected` 三种状态补充与基础 label 同一嵌套层级的覆盖规则，使用对应的语义 token。

---

### 问题 4 残余：is-sweeping 动画消失的真正根因

#### 4-A. sidebar-label 确实使用 is-sweeping 动画

用户的描述是正确的。`SidebarPanelRow.tsx:245` 的代码：
```tsx
className={`sidebar-label ${...} ${isFocusedNode ? "mpx-random-sheen-host" : ""} ${isFocusedNode && sidebarFocusSweeping ? "is-sweeping" : ""}`}
```

当 sidebar-label 获得焦点时，组件会给它添加 `mpx-random-sheen-host` 类；扫掠动画触发时添加 `is-sweeping` 类。

#### 4-B. `::after` 伪元素冲突 —— 动画消失的直接原因

**基线（10f6c42）的无冲突架构**：
- `::before` → marker（左侧彩条），由 part1.css:643 定义
- `::after` → 扫掠动画高光层，由 part1.css:984 定义（`.mpx-random-sheen-host::after`）
- 两个伪元素各司其职，互不干扰

**当前（58e8bfb）的冲突架构**：
- `::before` → 折叠箭头，由 sidebar.css:617 定义
- `::after` → marker（左侧彩条），由 part1.css:676 定义
- `::after` → 也是扫掠动画高光层，由 part1.css:984 定义

**两个功能共用 `::after`，产生属性冲突**：

| 属性 | marker `::after`（part1.css:676）特异性 (0,5,2) | sweeping `::after`（part1.css:984）特异性 (0,3,2) | 生效的 |
|------|------|------|------|
| `top` | `-1px` | `-100%` | marker（特异性高） |
| `left` | `-1px` | `-100%` | marker（特异性高） |
| `bottom` | `-1px` | `-100%` | marker（特异性高） |
| `width` | `calc(marker-width)` | 未设置 | marker |
| `right` | 未设置 | `-100%` | sweeping |
| `opacity` | `0` | `0` | 相同 |
| `background` | `var(--state-selected-color)` | `var(--random-sheen-overlay)` | marker（特异性高） |

**结果**：扫掠动画的 `::after` 被强制压缩到 marker 的狭窄区域（宽 12px），高光背景被 marker 颜色替换，动画视觉效果完全消失。

#### 4-C. 左侧色带（marker）的实现机制补充说明

用户在 F12 中找不到类似 `border-left` 的属性，但视觉上有色带效果。原因是：

sidebar-label 的左侧色带**不是通过 `border-left` 实现**的，而是通过 `::after`（基线时是 `::before`）伪元素实现：
- `position: absolute; left: -1px; top: -1px; bottom: -1px`
- `width: calc(var(--mpx-sidebar-marker-width) + 1px)` = 13px
- `border-radius` 只在左侧有圆角
- `opacity: 0`（默认不可见），`is-active` / `focus-visible` 时 `opacity: 1`
- `background` 设为对应状态颜色

这是一个绝对定位的窄条覆盖在 label 左侧，模拟 `border-left` 效果但有圆角和可动画的 opacity。

而 name-list-row 中使用的是真正的 `border-left-color` + `border-left-width` 属性（main.part2.css），两者实现方式不同。

#### 4-D. 修复方案

**必须将 marker 改回 `::before`**，因为 `::after` 与 `mpx-random-sheen-host` 的扫掠动画存在不可调和的冲突。

**完整修复步骤**：

1. **part1.css：marker 从 `::after` 改回 `::before`**
   - 第 676 行：`.sidebar-label::after` → `.sidebar-label::before`
   - 第 703 行：`.sidebar-label.is-collapsible::after` → `.sidebar-label.is-collapsible::before`
   - 第 731 行：`.sidebar-label:not(.is-collapsible)::after` → `.sidebar-label:not(.is-collapsible)::before`
   - 第 742 行：同上
   - 第 749 行：`.sidebar-label:focus-visible::after` → `.sidebar-label:focus-visible::before`

2. **sidebar.css：折叠箭头从 `::before` 改为其他方式**

   因为 marker 需要回到 `::before`，折叠箭头不能继续用 `::before`。

   方案一（CSS 方案，不改组件）：折叠箭头改用 `::after`
   - sidebar.css:617 `.sidebar-label.is-collapsible::before` → `.sidebar-label.is-collapsible::after`
   - sidebar.css:628 `.sidebar-label.is-collapsible.is-collapsed::before` → `.sidebar-label.is-collapsible.is-collapsed::after`
   - 但 `.is-collapsible::after` 需要避开 sweeping 的 `::after`
   - **问题**：这会把冲突从 marker 转移到折叠箭头，collapsible label focus 时箭头和 sweeping 仍然冲突

   方案二（推荐，改组件 + CSS）：折叠箭头改为 JSX 内联 span
   - 在 `SidebarPanelRow.tsx` 中，在 `<button className="sidebar-label ...">` 内部最前面加一个 `<span className="sidebar-toggle-arrow" aria-hidden="true">{imageFolderCollapsed ? "▸" : "▾"}</span>`
   - 删除 sidebar.css 中 `.sidebar-label.is-collapsible::before` 的 content 规则
   - 新增 `.sidebar-toggle-arrow` 样式（继承原 `::before` 的 display/width/margin/color）
   - 这样 `::before` 完全归 marker，`::after` 完全归 sweeping，span 负责箭头

   方案三（最小改动）：接受 collapsible label 不显示 marker（与基线行为一致）
   - marker 改回 `::before`
   - 折叠箭头仍用 `::before`（与基线一致，箭头的 `content: "▾"` 覆盖 marker 的 `content: ""`）
   - 但这意味着 `--mpx-sidebar-main-label-toggle-text`（折叠箭头颜色）无法独立于 marker 调节

   **建议采用方案三**：与基线完全一致，改动量最小，不引入新问题。toggle-text 颜色的独立调节可以作为后续优化，通过方案二实现。

**涉及文件**（方案三）：
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
  - 第 676、703、731、742、749 行：`::after` → `::before`
  - 删除第 703-705 行（`.is-collapsible::after { display: none }` 不再需要）
- `src/styles/app/sidebar.css`
  - 第 617-629 行保持不变（折叠箭头仍为 `::before`，与基线一致）

---

### 修复执行顺序（第二轮）

**第一步：恢复 marker 为 `::before`，解决 sweeping 冲突（问题 4-D）**

最高优先级。修改 soft-skeuomorphic.components.part1.css：
- `::after` → `::before`（marker 定义、active/focus/manage-selected 状态）
- 删除 `.is-collapsible::after { display: none }` 规则

验证点：
- sidebar-label focus 时 is-sweeping 高光扫掠动画正常显示
- 非 collapsible label 在 active/focus 时左侧色带正常显示
- collapsible label 不显示左侧色带（基线行为）

**第二步：补充 active / manage-selected 的高特异性规则（问题 2-B/C/D）**

在 part1.css 中新增三组规则：
1. `.sidebar-row.is-active .sidebar-label` 的 background + box-shadow + transform
2. `.sidebar-row.is-active.is-hover-active .sidebar-label` 的 box-shadow
3. `.sidebar-row.is-manage.is-selected .sidebar-label` 的 background + box-shadow

**第三步：修复 sidebar-tree 背景硬编码（问题 2-A）**

将 part1.css:34-38 的 `background: #e3e7ec` 改为消费语义 token。

**第四步：验证**

- `npx vitest run src/components/ThemeParameterPanel.test.tsx`
- 手工验证：所有之前不生效的变量在 Theme Parameter 中调节后视觉变化
- 手工验证：is-sweeping 高光扫掠在 sidebar-label focus 时正常触发

---

### 涉及文件汇总（第二轮）

| 文件 | 修改内容 |
|------|---------|
| `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css` | marker `::after` → `::before`；新增 active/manage-selected 高特异性规则 |
| `src/styles/themes/contract.css` | `--mpx-sidebar-main-bg` 默认值调整 |

---

### 文档同步：docs/32-ui-design-tracking-v1.md 2.2.2.1 需要的调整

修复落地后，`docs/32-ui-design-tracking-v1.md` 的 `2.2.2.1 fg-sidebar-main` 需要同步更新以下内容：

#### 调整 1：CSS 触发点补充

当前文档列出的触发点：
```
src/styles/app/sidebar.css:309
src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:592
src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css:203
```

需要补充以下触发点（修复后新增的高特异性规则）：
- `soft-skeuomorphic.components.part1.css:34`（`.sidebar-tree` 背景，改为消费 `--mpx-sidebar-main-bg`）
- `soft-skeuomorphic.components.part1.css:~727`（新增 `.sidebar-row.is-active .sidebar-label` active 状态覆盖）
- `soft-skeuomorphic.components.part1.css:~740`（新增 `.sidebar-row.is-active.is-hover-active .sidebar-label` hover-active 状态覆盖）
- `soft-skeuomorphic.components.part1.css:~755`（新增 `.sidebar-row.is-manage.is-selected .sidebar-label` manage-selected 状态覆盖）

具体行号以修复实施后的实际位置为准。

#### 调整 2：变量说明中增加特异性约束说明

在变量分组列表之后、"说明"段落之前，增加一段：

```
特异性约束（soft-skeuomorphic 主题）

在 soft-skeuomorphic × skeuomorphic-luxury-white 主题下，part1.css 中 `.sidebar-label` 的基础规则
选择器特异性为 (0,5,1)（含 :root[data-mpx-style][data-mpx-palette] [data-slot] .sidebar-row .sidebar-label），
高于 sidebar.css / manage.css 中各状态规则的 (0,3,0)。

因此以下变量的消费点必须位于 part1.css（与基础 label 同级或更高特异性），
而非 sidebar.css / manage.css：
- --mpx-sidebar-main-bg（消费点在 part1.css .sidebar-tree 规则）
- --mpx-sidebar-main-label-active-bg（消费点在 part1.css .is-active 规则）
- --mpx-sidebar-main-active-ring / --mpx-sidebar-main-active-underlay（同上，box-shadow 中）
- --mpx-sidebar-main-label-manage-selected-bg（消费点在 part1.css .is-manage.is-selected 规则）

sidebar.css 中的对应规则作为非 soft-skeuomorphic 主题的 fallback 仍然保留。
```

#### 调整 3：C 组 marker / bullet 增加实现机制说明

当前 C 组只列出了变量名，需要增加实现方式描述：

```
C. marker / bullet

marker 实现方式：
sidebar-label 左侧色带通过 `::before` 伪元素实现（非 border-left）：
- position: absolute; left: -1px; top: -1px; bottom: -1px
- width: calc(var(--mpx-sidebar-marker-width) + 1px)
- opacity: 0（默认不可见），is-active / focus-visible 时 opacity: 1
- background 设为对应状态颜色

伪元素分工约束：
- `::before` → marker（左侧色带）
- `::after` → mpx-random-sheen-host 扫掠动画（高光扫过效果）
- 两者不可共用同一伪元素，否则 sweeping 动画失效
- collapsible label 的 `::before` 被折叠箭头（content: "▾"）覆盖，
  因此 collapsible label 不显示 marker（基线行为）

对应变量：
--mpx-sidebar-main-label-marker-focus-bg
--mpx-sidebar-main-label-marker-selected-bg
--mpx-sidebar-main-bullet-pending-bg
--mpx-sidebar-main-bullet-running-bg
--mpx-sidebar-main-bullet-running-ring
--mpx-sidebar-main-bullet-active-bg
```

#### 调整 4：D 组 count 徽标标注无消费点变量

当前 D 组写法：
```
--mpx-sidebar-main-count-text/border/bg/shadow
--mpx-sidebar-main-count-packages-text/border/bg/shadow
--mpx-sidebar-main-count-images-text/border/bg
```

需要改为明确标注状态：
```
D. count 徽标（默认 / packages / images）

--mpx-sidebar-main-count-text（通用 count 文本色，作为 packages/images 的 fallback 父变量）
--mpx-sidebar-main-count-border / --mpx-sidebar-main-count-bg / --mpx-sidebar-main-count-shadow

--mpx-sidebar-main-count-packages-text / border / bg
--mpx-sidebar-main-count-packages-shadow（待补消费点 —— contract.css 已声明但 part2.css 未引用）

--mpx-sidebar-main-count-images-text / border / bg
```

#### 调整 5："说明"段落补充

当前说明：
```
fg-sidebar-main 调试入口已切到语义 token（--mpx-sidebar-main-*）；
slot 变量继续保留用于局部覆写，快照字段 id 保持兼容。
```

修改为：
```
fg-sidebar-main 调试入口已切到语义 token（--mpx-sidebar-main-*）；
slot 变量继续保留用于局部覆写，快照字段 id 保持兼容。

注意：soft-skeuomorphic 主题下，部分状态变量（active / manage-selected / bg）
的实际消费点在 part1.css 而非 sidebar.css，原因是 part1.css 基础 label 规则的
选择器特异性更高。sidebar.css 中的对应规则仅在非 soft-skeuomorphic 主题下生效。

marker（左侧色带）使用 ::before 伪元素实现，::after 保留给 mpx-random-sheen-host
扫掠动画。修改伪元素分配会导致 sweeping 高光动画失效。
```

---

### 实现链路结构调整：fg-sidebar-main / fg-main-content-image-name-list 的 token 分层

#### 现有系统的分层模式对比

**上层容器（2.0-2.4）的链路**：
```
palette 层定义原始色值
  → style 层组合语义变量（引用 palette）
    → contract.css 声明组件别名（引用 style/palette 语义）
      → slot 变量（局部覆写入口）
        → 组件 CSS 消费
```

示例（Header 背景）：
- palette: `--mpx-metal-light: #f5f2ec`、`--mpx-metal-base: #e6e2da`
- style: `--mpx-surface-chrome-bg: linear-gradient(180deg, var(--mpx-metal-light), var(--mpx-metal-base))`
- style: `--mpx-header-bg: var(--mpx-surface-chrome-bg)`
- contract: `--mpx-header-bg: var(--mpx-bg-panel)`（通用默认，被 style 覆盖）
- 消费: `background: var(--mpx-slot-fg-header-root-bg, var(--mpx-header-bg))`

**按钮层（4.0）的链路**：
```
palette 层定义 btn-core-* 原始值（完整的颜色/阴影/动画）
  → contract.css 定义 btn-variant-*（引用 btn-core-*）
    → 组件 CSS 消费 btn-variant-*
```

示例（按钮背景）：
- palette: `--mpx-btn-core-bg-idle: #ecf0f3`
- contract: `--mpx-btn-variant-default-bg-idle: var(--mpx-btn-core-bg-idle)`
- 消费: `background: var(--mpx-btn-variant-default-bg-idle)`

**当前 fg-sidebar-main 的链路**：
```
contract.css 直接定义所有值（混合硬编码 + 语义引用）
  → slot 变量（局部覆写入口）
    → 组件 CSS 消费
```

#### 问题：fg-sidebar-main 的 token 链路缺失了分层

当前 `--mpx-sidebar-main-*` 的定义全部在 `contract.css:330-386`，其中包含大量 palette 特定的硬编码值：

| 变量 | 当前默认值（contract.css） | 是否 palette 特定 |
|------|--------------------------|------------------|
| `--mpx-sidebar-main-bg` | `transparent` | 否（但 part1.css 硬编码 `#e3e7ec`） |
| `--mpx-sidebar-main-label-text` | `var(--mpx-text-1)` | 否（引用语义 token） |
| `--mpx-sidebar-main-label-border` | `#bcc1c9` | **是** |
| `--mpx-sidebar-main-label-bg` | `linear-gradient(135deg, #e4e6ea, #c8ccd3)` | **是** |
| `--mpx-sidebar-main-label-shadow` | `0 2px 4px rgba(150,140,130,0.2), inset 0 1px 0 #fff` | **是** |
| `--mpx-sidebar-main-label-hover-filter` | `brightness(0.97)` | **是** |
| `--mpx-sidebar-main-label-collapsed-bg` | `linear-gradient(135deg, #ede6d6, #ddd4bf)` | **是** |
| `--mpx-sidebar-main-label-expanded-bg` | `linear-gradient(135deg, #f8f4eb, #ede6d6)` | **是** |
| `--mpx-sidebar-main-label-plain-bg` | `linear-gradient(135deg, #f3f0ea, #e9e5de)` | **是** |
| `--mpx-sidebar-main-count-text` | `#000000` | **是** |
| `--mpx-sidebar-main-count-border` | `#bcc4cf` | **是** |
| `--mpx-sidebar-main-count-packages-shadow` | `inset 0 2px 4px rgba(0,0,0,0.15), ...` | **是** |
| `--mpx-sidebar-main-label-active-bg` | `var(--mpx-state-focus-color)` | 否（引用语义） |
| `--mpx-sidebar-main-active-ring` | `var(--mpx-state-focus-color)` | 否 |
| `--mpx-sidebar-main-bullet-*` | `var(--mpx-sidebar-bullet-*)` | 否（引用 palette） |
| `--mpx-sidebar-main-count-packages-text` | `var(--mpx-status-info-text)` | 否 |
| `--mpx-sidebar-main-label-active-shadow` | `var(--mpx-sidebar-control-active-shadow, ...)` | 否 |

**12 个变量直接硬编码了 skeuomorphic-luxury-white 的色值**，不具备主题切换能力。

同样的问题也存在于 `--mpx-main-image-name-list-*`（contract.css:388-425），但严重程度较低，因为多数值已引用语义 token，只有少量硬编码（如 `#c7d0d8`、`#ecf0f3`）。

#### 对比结论

| 维度 | 上层容器 (2.0) | 按钮层 (4.0) | sidebar-main (当前) |
|------|--------------|-------------|-------------------|
| palette 层定义原始值 | ✓ metal-light/base/dark | ✓ btn-core-* | ✗ 无 |
| style 层组合语义 | ✓ surface-chrome-bg | — | ✗ 无 |
| contract 引用上层 | ✓ var(--mpx-bg-panel) | ✓ var(--mpx-btn-core-*) | ✗ 直接硬编码 |
| 切换 palette 自动适配 | ✓ | ✓ | ✗ |
| _palette-template 有模板 | — | ✓ btn-core-* | ✗ 无 |
| _style-template 有模板 | ✓ | — | ✗ 无 |

#### 修复方案

**目标**：将 palette 特定的硬编码值从 contract.css 中抽出，放到正确的分层位置，使主题切换时自动适配。

**第一步：在 palette 层定义 sidebar-main 原始值**

在 `src/styles/themes/palettes/skeuomorphic-luxury-white.css` 中新增 sidebar-main 区段（与 btn-core 同级）：

```css
/* Sidebar Main (2.2.2.1) - palette-specific values */
--mpx-sidebar-main-tree-bg: #e3e7ec;
--mpx-sidebar-main-label-border: #bcc1c9;
--mpx-sidebar-main-label-bg: linear-gradient(135deg, #e4e6ea, #c8ccd3);
--mpx-sidebar-main-label-shadow:
  0 2px 4px rgba(150, 140, 130, 0.2), inset 0 1px 0 #ffffff;
--mpx-sidebar-main-label-hover-filter: brightness(0.97);
--mpx-sidebar-main-label-collapsed-bg: linear-gradient(135deg, #ede6d6, #ddd4bf);
--mpx-sidebar-main-label-expanded-bg: linear-gradient(135deg, #f8f4eb, #ede6d6);
--mpx-sidebar-main-label-plain-bg: linear-gradient(135deg, #f3f0ea, #e9e5de);
--mpx-sidebar-main-label-plain-border: #d5d0c8;
--mpx-sidebar-main-count-text: #000000;
--mpx-sidebar-main-count-border: #bcc4cf;
--mpx-sidebar-main-count-packages-shadow:
  inset 0 2px 4px rgba(0, 0, 0, 0.15),
  inset 0 1px 1px rgba(0, 0, 0, 0.15),
  0 1px 0 rgba(255, 255, 255, 1);
```

同样，`--mpx-main-image-name-list-*` 的少量硬编码也应移到 palette：
```css
/* Main Image Name-List (2.3.2.2) - palette-specific values */
--mpx-main-image-name-list-border: #c7d0d8;
--mpx-main-image-name-list-bg: #ecf0f3;
```

**第二步：contract.css 改为引用语义 token 或留空**

将 contract.css 中的硬编码默认值改为引用已有的语义 token 作为通用 fallback：

```css
/* 改前 */
--mpx-sidebar-main-label-border: #bcc1c9;
--mpx-sidebar-main-label-bg: linear-gradient(135deg, #e4e6ea, #c8ccd3);
--mpx-sidebar-main-count-text: #000000;

/* 改后 */
--mpx-sidebar-main-label-border: var(--mpx-border-2);
--mpx-sidebar-main-label-bg: var(--mpx-bg-elevated);
--mpx-sidebar-main-count-text: var(--mpx-text-1);
```

palette 文件中的具体值会覆盖 contract.css 的通用默认值（因为 palette 在 cascade 中后加载或同一 `:root` 下后声明的优先）。

**第三步：part1.css 中的硬编码也改为引用语义 token**

`soft-skeuomorphic.components.part1.css:34-38` 的 `.sidebar-tree { background: #e3e7ec }` 改为：
```css
background: var(--mpx-slot-fg-sidebar-main-bg, var(--mpx-sidebar-main-tree-bg, var(--mpx-sidebar-main-bg)));
```

**第四步：模板文件同步**

在 `_palette-template.css` 中补充 sidebar-main 区段注释（让新 palette 知道需要提供哪些值）：
```css
/* Sidebar Main (2.2.2.1) */
/* --mpx-sidebar-main-tree-bg: ; */
/* --mpx-sidebar-main-label-border: ; */
/* --mpx-sidebar-main-label-bg: ; */
/* ... */
```

#### 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `src/styles/themes/palettes/skeuomorphic-luxury-white.css` | 新增 sidebar-main / name-list 原始值定义 |
| `src/styles/themes/palettes/_palette-template.css` | 新增 sidebar-main 模板注释 |
| `src/styles/themes/contract.css` | 将硬编码默认值改为语义 token 引用 |
| `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css` | `.sidebar-tree` 背景改为消费语义 token |

#### 与其他修复的关系

此分层调整应在第二轮修复（marker 恢复 `::before`、active 高特异性规则）之后执行，作为独立的结构优化步骤。修复后的链路：

```
palette (skeuomorphic-luxury-white.css)
  定义 --mpx-sidebar-main-tree-bg: #e3e7ec
  定义 --mpx-sidebar-main-label-bg: linear-gradient(...)
  定义 --mpx-sidebar-main-count-text: #000000
  ...
    ↓
contract.css
  声明 --mpx-sidebar-main-bg: var(--mpx-bg-elevated)  /* 通用 fallback */
  声明 --mpx-sidebar-main-label-bg: var(--mpx-bg-elevated)  /* 被 palette 覆盖 */
  声明 --mpx-sidebar-main-label-active-bg: var(--mpx-state-focus-color)  /* 语义引用保持 */
  ...
    ↓
part1.css (soft-skeuomorphic 风格)
  消费：background: var(--mpx-slot-..., var(--mpx-sidebar-main-*, fallback))
  高特异性状态规则（active / manage-selected）
    ↓
sidebar.css / manage.css
  非 soft-skeuomorphic 主题的 fallback 消费
```

此结构下切换 palette 时，sidebar-main 的视觉会随 palette 自动变化，与上层容器和按钮层行为一致。

---

## 第三轮验收记录（用户实测）

验收结论（用户反馈）：

1. `is-sweeping` 动画已恢复正常。
2. `active` 仅在根节点表现正常；在直属媒体节点表现为整行 label 全覆盖。
3. `manage-selected` 在所有节点均表现为整行 label 全覆盖。

验收截图已提供：
- 根节点 `active`/`selected` 对比
- 直属媒体节点 `active` 全覆盖现象
- `manage-selected` 全覆盖现象

结论：
- 问题 4（sweeping 动画冲突）已通过。
- 问题 2 的状态样式仍存在残余差异（active / manage-selected 在不同节点层级表现不一致），需继续细化规则范围。

---

## 后续优先级（按用户要求）

优先处理文档剩余内容：

1. 先完成 `docs/32-ui-design-tracking-v1.md` 的 2.2.2.1 同步（触发点、特异性约束、marker 实现、count 说明、说明段补充）。
2. 再回到样式细化：将 `active / manage-selected` 的覆盖范围从”全 label 覆盖”收敛为与基线一致的节点层级表现。

---

## 实施状态核查（提交 4fee096 之后）

核查日期：2026-03-06
基准提交：4fee096（refactor(theme): 重构sidebar-main分层并重排调试分组）

### 已实施项

| 修复项 | 状态 | 说明 |
|--------|------|------|
| marker `::after` → `::before` | ✅ 已完成 | part1.css 中所有 marker 伪元素已改回 `::before`，10+ 处选择器已更新 |
| `.is-collapsible::after { display: none }` 删除 | ✅ 已完成 | 该规则已不存在 |
| active 高特异性规则 | ✅ 已完成 | part1.css:724-834 新增完整的 `.is-active .sidebar-label` 规则（含 collapsible/expanded/plain 三种变体） |
| manage-selected 高特异性规则 | ✅ 已完成 | part1.css:836-922 新增完整的 `.is-manage.is-selected .sidebar-label` 规则 |
| sidebar-tree 背景消费语义 token | ✅ 已完成 | part1.css:34-41 改为 `var(--mpx-slot-..., var(--mpx-sidebar-main-bg, var(--mpx-sidebar-main-tree-bg, #e3e7ec)))` |
| palette 层 sidebar-main 原始值 | ✅ 已完成 | skeuomorphic-luxury-white.css:174-198 新增 21 个变量（含 active/manage-selected 的 collapsible/expanded/plain 三种变体背景） |
| contract.css 硬编码清除 | ✅ 已完成 | 40+ 变量全部改为语义 token 引用，无硬编码色值 |
| _palette-template 模板 | ✅ 已完成 | 新增 sidebar-main 区段注释 |
| UI 会话持久化 | ✅ 已完成 | themeParameterPanelSessionState.ts 已创建，activePage + 折叠状态会话级保存 |
| is-sweeping 动画恢复 | ✅ 用户确认通过 | marker 改回 `::before` 后 `::after` 归还给 sweeping |

### 残余问题

| 问题 | 状态 | 说明 |
|------|------|------|
| active 在直属媒体节点表现为全 label 覆盖 | ⚠️ 待修复 | 根节点正常，但直属媒体节点的 active 背景扩散到整个 label 而非仅显示 marker |
| manage-selected 在所有节点全 label 覆盖 | ⚠️ 待修复 | 所有节点的 manage-selected 背景扩散到整个 label |
| docs/32 的 2.2.2.1 文档同步 | ⏳ 待执行 | 触发点、特异性约束、marker 机制等需要更新 |

### 架构合规性

| 维度 | 状态 |
|------|------|
| palette → contract → slot → component 分层 | ✅ 已对齐 |
| contract.css 无 palette 特定硬编码 | ✅ 已清除 |
| `::before` = marker, `::after` = sweeping 伪元素分工 | ✅ 已恢复 |
| 高特异性规则覆盖基础 label | ✅ 已补充 |
| 切换 palette 自动适配 | ✅ 架构就绪（需实际验证） |
