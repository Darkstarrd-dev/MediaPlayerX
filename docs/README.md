# MediaPlayer 文档

该目录用于记录 MediaPlayer 当前阶段的产品定义与工程决策。

## 文档索引

- `requirements-v1.md`：V1 需求范围与行为冻结。
- `architecture-v1.md`：运行时架构、模块边界与数据流。
- `interaction-v1.md`：界面布局、交互逻辑、全屏行为与快捷键定义。
- `开发启动清单.md`：跨机器拉取仓库后的标准启动与续开发流程。
- `虚拟UI阶段说明.md`：当前阶段的目标、范围与验收方式（纯模拟交互）。
- `backend-integration-guardrails.md`：后端接入阶段的强制规避方案与执行门禁。

## 当前状态

- 产品范围已冻结到交互规范版本 `v1.5`。
- 当前开发阶段为“虚拟 UI 交互阶段”，优先验证布局、控件位置与快捷键行为。
- 虚拟 UI 脚手架与首版交互已落地，且已完成 `App.tsx` 的模块化拆分。
- 文件加载前端部分已完成：导入文件/文件夹弹窗、全窗口拖拽、窗口焦点粘贴路径，并带拖拽叠加层占位反馈。
- Sidebar 部分修正已完成：统一“设为根”按钮与“恢复”逻辑、根目录标题显示/点击折叠、可拖动分割条、`<3%` 自动折叠（三角展开按钮）、PageUp/PageDown 翻页修正、Sidebar 样式参数可配置，且目录 Mock 已扩容。
- Main 下一轮修正待办已按 `interaction-v1.md` 完成（1~6 全部落地），并补充图包级评分、视频封面随机色保存与列表/缩略图布局修正。
- Main 模块修正与全屏模式专项已完成（含第三轮：Ctrl+左右包切换兜底、Alt+方向对齐快捷键、视频悬浮控件贴边锚点修正、双显示视频按留白水平/垂直微调）。
- 已按顺序完成 App 拆分：`useShortcutEngine -> useSidebarNavigation -> useImportPipeline -> useMediaState`。
- Header 检索链路已改版：移除向量模式 toggle 与检索输入控件，改为“检索”按钮展开检索容器；向量检索改为手动触发并支持“阈值改动后重检索”。
- 设置面板已改为 side/main 分栏，新增 `theme 设置` 与 `3D 设置` 占位项用于后续能力扩展。
- 设置面板已进一步调整为 `side 20% | main 80%`，并在布局参数中新增“布局锁定”开关用于禁用主界面分割条拖动。
- 设置面板新增“设置面板字体大小”调节项，`main` 区统一圆角容器外观，内容容器用于居中排版。
- 检索容器已增加“向量检索 / 特征检索”页签，并支持与主区之间的高度拖动分割条；特征检索升级为多字段组合过滤（名称/作品名/社团/作者/tags/图包评分）。
- 检索容器支持折叠后保持检索模式，顶部居中箭头按钮可快速恢复；向量/特征页切换时容器高度自动贴合控件。
- 元数据面板展开态以标题“元数据面板”作为折叠入口，折叠态使用侧边箭头恢复展开。
- Mock 数据已补充随机 tags 与图包评分初始值，用于检索与评分筛选验证。
- 为控制复杂度，`App.tsx` 已进一步模块拆分：检索容器抽离为 `components/SearchPanel.tsx`，特征检索状态/过滤逻辑下沉到 `features/search/useFeatureSearch.ts`。
- 主界面布局渲染层已从 `App.tsx` 抽离为 `components/AppWorkspace.tsx`，用于承载 Sidebar/Workspace/Main/Metadata 编排。
- 本轮继续模块化：`features/app/useImageBrowserViewModel.ts` 聚合图片浏览核心视图模型，`features/app/useAppEffects.ts` 集中副作用同步链，`features/layout/usePaneResizers.ts` 统一分割条拖拽与比例归一化。
- 后端接入必须遵循 `backend-integration-guardrails.md`，禁止绕过数据访问层与 DTO 映射层。
- 当前代码质量检查基线为：`npm run lint`、`npm run test`、`npm run build` 全部通过。
- 大 I/O 性能压测按具体实施阶段执行，不提前进行。
- 仓库初始化以本目录文档为起点。

## 文档使用方式（单一事实源）

- 本目录文档是项目当前阶段的唯一事实来源（SSOT）。
- 当代码与文档出现不一致时，默认以文档为准，并在同一开发周期内修正代码或补齐文档说明。
- 所有功能变更必须同时更新代码与对应文档，禁止只改其一。
- 新成员或新机器接手时，先阅读文档再改代码，避免按个人记忆实现。

## 跨机器继续开发流程

1. 拉取仓库：`git clone` 后切换到目标分支并执行 `git pull`。
2. 先读文档：按 `requirements-v1.md -> architecture-v1.md -> interaction-v1.md` 顺序确认范围与约束。
3. 再看代码：以文档中的模块边界、交互约束、数据策略为核对基线。
4. 开发实现：新增/修改功能时，同步更新相关文档条目。
5. 提交前自检：确认“代码行为、接口约束、交互逻辑”与文档一致。

## 文档维护约定

- 需求变更：更新 `requirements-v1.md`。
- 架构调整：更新 `architecture-v1.md`。
- 交互变化：更新 `interaction-v1.md`。
- 如果变更跨多个维度，需同时修改多个文档并在提交信息中说明关联关系。
