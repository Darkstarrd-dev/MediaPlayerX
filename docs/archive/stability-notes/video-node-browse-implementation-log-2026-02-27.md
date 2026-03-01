# 视频节点浏览改造实施记录（2026-02-27）

## 目标与范围

- 记录两轮连续实现：
  - 第一轮：视频模式 Sidebar 计数与节点浏览基础能力。
  - 第二轮：分页/缩放/键盘交互/自动封面保存增强。
- 作为本次代码变更的实施日志，供后续远程分支继续开发对齐。

## 第一轮实现（已完成）

### 1) Sidebar 计数对齐 image 模式

- 在 `video` 模式可折叠目录节点上，增加和 `image` 模式一致的子节点计数徽标。
- 复用现有 `sidebar-count` 视觉样式与无障碍文案，避免新增样式分叉。

### 2) 视频节点浏览基础容器

- 点击视频模式可折叠目录节点后，`fg.main.content` 可切到缩略图容器。
- 缩略图容器结构复用图片模式卡片骨架（`image-grid node-browse-grid` + `thumb-card`）。
- 点击缩略图或 Sidebar 子节点，回到 `preview + control-shell` 并开始播放。

### 3) 数据链路与资源解析

- 新增视频节点浏览卡片构建：从选中目录直属视频子节点生成浏览项。
- 新增视频封面 URL 映射透传链路，用于节点浏览封面显示。
- 复用已有媒体解析通道，不新增独立 IPC 协议。

## 第二轮增强（已完成）

### 1) 自动分页 + 1:1 卡片约束

- 视频节点浏览接入与图片节点浏览同语义分页：`pageStart/pageSize/totalPages`。
- Main 仅渲染当前页切片，避免全量挤压。
- 卡片保持 `1:1` 容器约束，统一缩略图视觉密度。
- Footer 在“视频节点浏览 + 多页”时显示分页控件。

### 2) 节点浏览 Toolbar 缩放 Popover

- 视频节点浏览态接入 `ImageMainScaleControl`。
- 复用现有缩放级别、草稿值、hover 展开/延迟关闭行为。
- 缩放改变后复用全局缩略图布局计算，不新增单独缩放状态。

### 3) 交互分层：预览与激活分离

- 预览（不播放）：
  - 单击缩略图。
  - 方向键移动焦点（Left/Right/Up/Down）。
- 激活（进入播放）：
  - 双击缩略图。
  - `Enter` / `Space`。
- 浏览态下进入目录即停止播放，避免“浏览态仍播放”的状态不一致。

### 4) 无封面自动首帧落库

- 若当前视频不存在已保存封面：
  - 取首帧时间点（约 `0.1s`）触发封面保存链路。
  - 保存后走既有封面更新回写。
- 使用 `videoId` 去重，避免同视频重复自动保存。

## 本次主要变更文件

- 组件层
  - `src/components/SidebarPanelRow.tsx`
  - `src/components/SidebarPanel.tsx`
  - `src/components/VideoMainSection.tsx`
- 应用装配层
  - `src/features/app/useAppWorkspaceProps.impl.ts`
  - `src/features/app/buildSidebarPanelProps.ts`
  - `src/features/app/buildVideoMainSectionProps.ts`
  - `src/features/app/buildMainFooter.tsx`
  - `src/features/app/workspaceImageDerivations.ts`
- 资源解析与绑定
  - `src/features/app/useResolvedMediaState.ts`
  - `src/features/app/useAppDisplayResources.ts`
  - `src/features/app/useAppWorkspaceBindings.ts`
  - `src/features/app/useAppWorkspaceProps.types.ts`
- 测试
  - `src/components/SidebarPanel.test.tsx`
  - `src/features/app/workspaceImageDerivations.test.ts`
  - `src/features/app/buildVideoMainSectionProps.test.ts`
  - `src/features/app/buildMainFooter.test.tsx`
- 文档
  - `docs/05-interaction-v1.md`
  - `docs/video-node-browse-implementation-log-2026-02-27.md`（本文）

## 验证记录

- 已执行：
  - `npm run test -- src/features/app/buildVideoMainSectionProps.test.ts src/features/app/buildMainFooter.test.tsx src/components/SidebarPanel.test.tsx src/features/app/workspaceImageDerivations.test.ts`
  - `npm run build`
- 结果：通过。

## 后续远程继续开发建议

- 增补 `VideoMainSection` 专项测试，覆盖以下完整链路：
  - 单击预览 / 双击播放。
  - Arrow 预览 / Enter-Space 播放。
  - 自动首帧封面保存仅触发一次。
- 评估是否为视频节点浏览增加“当前焦点高亮”独立视觉 token，避免与普通缩略图焦点样式耦合。
- 若后续引入视频封面批量预热，优先接入现有资源并发治理策略，避免影响主播放链路。
