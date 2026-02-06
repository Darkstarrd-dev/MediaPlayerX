# MediaPlayer 虚拟 UI 阶段说明

## 阶段目标

- 先验证产品交互设计，不接真实数据链路。
- 以可运行 UI 骨架确认布局、控件、快捷键、模式切换是否准确反映用户意图。
- 为后续接入 Electron、数据库与 I/O 任务管线提供稳定前端结构。

## 技术决策

- 本阶段采用 `Vite + React + TypeScript + Zustand + Vitest`。
- 不采用 plain HTML + vanilla JavaScript 临时原型。
- 原因：后续项目正式栈即为 React + Zustand，直接用同栈可避免重复推倒。

## 本阶段范围

- 实现 Header / Sidebar / Main 的整体框架。
- 图片模式与视频模式切换。
- 向量模式容器显示与阈值调节交互。
- Sidebar 节点、Current Root 范围化显示、视频叶子 toggle。
- Main 分页缩略图（占位）与视频预览（占位）。
- 元数据面板与播放列表管理（含拖拽排序与删除）。
- 全屏层、底部浮动 Footer、双显示/仅视频/仅图片切换。
- 快捷键默认方案与设置面板重映射。
- 文件加载前端入口（导入文件/导入文件夹弹窗、全窗口拖拽、窗口焦点粘贴路径）。

## 明确不在本阶段

- 不连接 SQLite/LanceDB。
- 不执行真实 Embedding 推理。
- 不接真实视频解码与帧提取。
- 不进行海量 I/O 压测。

## 模拟规则

- 图片：使用带分辨率标签的色块占位。
- 视频：使用“当前时间/总时长”的数字时钟模拟播放。
- 导入、封面保存、向量任务等未接后端行为使用 `console` 输出模拟结果。

## 当前代码结构（已完成 App 拆分）

- `src/App.tsx`：页面状态编排、模式切换逻辑、快捷键路由。
- `src/components/AppHeader.tsx`：顶部控件区与导入入口。
- `src/components/SidebarPanel.tsx`：目录树与视频播放列表 toggle。
- `src/components/ImageMainSection.tsx`：图片网格分页与焦点交互。
- `src/components/VideoMainSection.tsx`：视频预览与虚拟播放控件。
- `src/components/MetadataPanel.tsx`：图片/视频元数据与播放列表管理。
- `src/components/FullscreenLayer.tsx`：全屏层与底部浮动控制区。
- `src/components/SettingsPanel.tsx`：设置覆盖层与快捷键映射。

## 验收标准

- 布局比例可调，页面结构与交互文档一致。
- 快捷键在正确作用域生效，且可在设置面板修改。
- 模式切换、播放列表同步、全屏显示模式切换均可正确联动。
- 基础测试（Vitest）可运行并覆盖关键交互路径。

## 当前进度

- 已完成虚拟 UI 脚手架搭建与主框架落地（Header / Sidebar / Main / Metadata / Fullscreen / Settings）。
- 已完成 `App.tsx` 的模块化拆分，当前以组件化结构迭代。
- 已完成文件加载前端链路：导入文件/文件夹弹窗、全窗口拖拽、窗口焦点粘贴路径，并统一输出 `console`。
- 已完成拖拽检测叠加层占位，后续可替换为 Shader/CSS 动画。
- 已完成 Sidebar 交互修正：统一“设为根”按钮、目录直接图片计数、Sidebar/Main 拖动分割条、Sidebar 键盘导航接管。
- 已完成 Sidebar 宽度策略修正：取消固定比例下限、接入“<3% 自动折叠”、新增最小宽度/字号/间隔设置项。
- 已完成折叠态三角展开按钮、标题点击折叠、根目录标题显示与 Sidebar 翻页滚动规则修正。
- 已完成 Sidebar 焦点行为修正：点击 Sidebar 项保持 Sidebar 焦点，左右键切回 Main，方向键持续作用于 Sidebar。
- 已完成 Sidebar 分页键修正：`PageUp/PageDown` 按“可视项数 - 1”步长翻页，边界直接钳制首末项。
- 已完成目录结构 Mock 数据再次扩容，可覆盖“两次翻页可继续、第三次不足直接到末项”的验证场景。
- 已通过当前阶段质量检查：`lint`、`test`、`build`。
- 已确认“上一个文件夹/下一个文件夹”顺序问题不在 Sidebar，定位为缩略图浏览链路问题，留待缩略图界面专项修复。
- 下一步进入“按模块修正 UI 细节与交互行为”的迭代阶段。
