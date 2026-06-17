# 修复总结

## 修复的问题

### 1. Sidebar 删除后 focus 跳转和显示同步问题

**问题描述**：在 sidebar tree 中删除 label 后：
1. sidebar focus 会跳到 tree 中的第一个 label，而不是前一个或后一个
2. 删除后虽然 sidebar focus 正确，但缩略图网格和 metadata-image-canvas 显示的仍是第一个 label 的内容，没有同步显示当前 focus 的图包

**修复方案**：
- 修改 `src/features/app/useManageModeActions.ts` 中的 `confirmManageDelete` 函数
- 在删除前计算下一个合理的 focus 位置：
  - **单个删除**：优先选择后一个节点，如果是最后一个则选前一个
  - **批量删除**：focus 移到批量删除列表中最后一个节点的父级目录
- 删除成功后：
  1. 设置新的 sidebar focus 位置
  2. 如果新 focus 节点有图包，重置其页码和焦点到第一页
  3. **关键修复**：调用 `setSelectedPackageId` 来同步更新 `selectedPackageId`，确保缩略图网格和 metadata 显示正确的图包

**修改文件**：
- `src/features/app/useManageModeActions.ts` - 添加 focus 计算逻辑、页码重置、selectedPackageId 同步更新和新参数
- `src/features/app/useAppManageBindings.ts` - 传递必要的参数和实现页码重置回调
- `src/features/app/useManageModeActions.test.ts` - 更新测试以包含新参数

### 2. Dual 全屏模式下 Del 键不生效问题

**问题描述**：在 dual 全屏模式下，当 focus 在 video pane 时，Del 键标记删除和连续按三下的立即删除功能不生效（单独 video 全屏模式下生效）。

**根因分析**：
- `videoNodeIdMap` 在 `useSidebarNavigation` 中只在 `mode === 'video'` 时才构建
- 在 dual 全屏模式下，如果当前 mode 是 'image'，`videoNodeIdMap` 为空 Map
- 导致 `fullscreenDeleteVideoNodeId` 为 null，Del 键无法找到目标节点

**修复方案**：
- 修改 `src/features/sidebar/useSidebarNavigation.ts` 中的 `videoNodeIdMap` 构建逻辑
- 改为检查 `videoTreeForSidebar` 是否为空，而不是只检查 mode
- 这样在 dual 全屏模式下，即使 mode 是 'image'，只要有 video sidebar tree 就会构建 videoNodeIdMap

**修改文件**：
- `src/features/sidebar/useSidebarNavigation.ts` - 修改 videoNodeIdMap 构建条件

### 3. Sidebar 切换图包时页码重置问题

**问题描述**：通过 sidebar 切换图包时，会保留之前的页码状态。例如：
- 某个图包翻到网格第 7 页
- 切换到其他 label
- 再切回这个图包的 label
- 仍然定位在第 7 页（期望从第 1 页开始）

**需求**：
- 通过 sidebar 切换图包时，应该从第一页开始显示（页码和焦点都重置为 0）
- 仅当在当前图包浏览过程中退出 app，再进入时，才定位到退出时的位置

**修复方案**：
- 在 `SidebarPanelRow` 的点击处理中添加 `onResetPackagePage` 回调
- **关键修改**：在 `onSelectPackage` **之前**调用 `onResetPackagePage`，确保 `selectedPackageId` 改变时页码已经重置
- 同时保持 `useSidebarNavigation` 中的相同逻辑，确保通过键盘导航切换图包时也能正确重置页码
- 在 `useAppSidebarScopeState` 和 `useAppWorkspaceProps` 的完整调用链中实现该回调，同时更新 `pageByPackage` 和 `focusByPackage`
- 这样通过 sidebar 切换图包时，总是从第一页开始，而退出 app 再进入时，由持久化机制恢复上次位置

**修改文件**：
- `src/components/SidebarPanelRow.tsx` - 添加 `onResetPackagePage` 参数，在 `applyMediaSelection` 中调用
- `src/components/SidebarPanel.tsx` - 添加 `onResetPackagePage` 参数并传递给 SidebarPanelRow
- `src/features/app/buildSidebarPanelProps.ts` - 添加 `onResetPackagePage` 参数传递
- `src/features/app/useAppWorkspaceBindings.ts` - 实现 `onResetPackagePage` 回调
- `src/features/app/useAppWorkspaceProps.types.ts` - 添加 `onResetPackagePage` 类型定义
- `src/features/app/useAppWorkspaceProps.impl.ts` - 传递 `onResetPackagePage` 参数
- `src/features/sidebar/useSidebarNavigation.ts` - 添加 `onResetPackagePage` 参数，在 `onSelectPackage` 前调用
- `src/features/app/useAppSidebarScopeState.ts` - 实现 `onResetPackagePage` 回调

## 验证结果

- ✅ ESLint 检查通过（0 warnings）
- ✅ TypeScript 编译通过
- ✅ 前端构建成功
- ✅ 相关单元测试通过（4/4）
- ✅ Prettier 格式检查通过

## 注意事项

1. **问题1** 的修复依赖于 `flatSidebarNodes` 的顺序与实际 UI 显示顺序一致，并且删除后必须同步调用 `setSelectedPackageId` 来更新选中的图包 ID
2. **问题2** 的修复确保了在 dual 全屏模式下，video pane 的删除功能与独立 video 模式下行为一致
3. **问题3** 的修复需要在多个层级传递 `onResetPackagePage` 回调，确保 sidebar 点击和键盘导航都能正确重置页码
