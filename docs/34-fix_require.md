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
