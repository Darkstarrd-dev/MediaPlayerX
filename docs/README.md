# MediaPlayer 文档

该目录用于记录 MediaPlayer 当前阶段的产品定义与工程决策。

## 文档索引

- `requirements-v1.md`：V1 需求范围与行为冻结。
- `architecture-v1.md`：运行时架构、模块边界与数据流。
- `interaction-v1.md`：界面布局、交互逻辑、全屏行为与快捷键定义。
- `ui/theme-system-v1.md`：主题系统 CSS 契约与开发规范 (SSOT)。
- `开发启动清单.md`：跨机器拉取仓库后的标准启动与续开发流程。
- `backend-integration-guardrails.md`：后端接入阶段的强制规避方案与执行门禁。
- `perf/2026-02-08-ui-perf-benchmark-plan.md`：UI 性能基准与选型结论（定型：R1-S1）。
- `perf/2026-02-07-scan-benchmark.md`：扫描/索引性能基准报告。

## 参考文档

- `ref/虚拟UI阶段说明.md`：虚拟 UI 阶段过程记录（历史参考）。
- `ref/3dwidgetsolution1.md`：3D 坐标控件方案草案 1（参考）。
- `ref/3dwidgetsolution2.md`：3D 坐标控件方案草案 2（参考）。
- `ref/scalesolution.html`：缩略图排布算法早期原型（历史参考）。
- `ref/scalesolution2.tsx`：缩略图排布算法对照实现（历史参考）。

## 当前状态

- 产品范围已冻结到交互规范版本 `v1.5`。
- 当前开发阶段为“Electron 可用化阶段”，目标是除向量检索/特征检索外的基础能力可用。
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
- Header 已新增“向量宇宙”入口：可打开独立 Three.js 3D 漫游层（模拟阶段），当前实现为 billboard + 距离 LOD + tag 颜色映射 + 正前方 Raycast 命中选择，并已将控制参数接入设置面板 3D 设置页；向量宇宙范围与 Sidebar 当前范围保持一致，进入即自动捕捉鼠标，且以进入图片作为坐标原点。快捷键与 3D 控制映射现支持弹窗式新增/清除（键盘/鼠标/组合），并新增离散度与边界穿越控制。
- 向量宇宙前端内容已阶段性完成：包含二次确认退出、全息球体位置控件（深度亮度、方向箭头、越界穿入）与设置面板参数化调节。
- 本轮“按职责块拆分”已完成并封版：
  - `src/App.tsx` 主要保留编排职责，头部/任务面板/全屏/设置/侧栏与主区 props 构建、告警与导入面板、根范围与侧栏状态计算已下沉到独立模块。
  - `electron/fileSystemReadService.ts` 主要保留服务编排职责，导入任务、媒体访问守卫、媒体读取、缩略图解析、封面抓取、源过滤与归档/文件收集辅助已拆到独立模块。
  - 当前关键大文件规模：`src/App.tsx` 约 `1797` 行，`electron/fileSystemReadService.ts` 约 `1740` 行。
- 后端接入必须遵循 `backend-integration-guardrails.md`，禁止绕过数据访问层与 DTO 映射层。
- 后端接入 Phase-1（只读垂直切片）已启动：新增 Repository 双实现（Mock/Real）、DTO->ViewModel 映射层、Renderer 读链路异步一致性控制（取消旧请求 + request id 防覆盖）与错误可见反馈（重试 + 快照回退）。
- Repository 切换方式：可通过 `VITE_MEDIA_REPOSITORY_MODE=mock|real` 强制指定；未指定时若检测到 `window.mediaPlayerBackend` 则自动走 `real`。
- Electron 通道已从骨架升级到真实 Main 读服务：`registerBackendIpcHandlers` 现接入 `FileSystemMediaReadService`（文件系统适配），并在 IPC 入参与出参统一执行 Zod 校验。
- Main/Sidebar 的特征筛选口径已收敛到 Repository SSOT，前端不再维护同构筛选副本。
- 已补充 Repository/IPC 集成测试：覆盖超时、取消、重试、快照回退；`App.test.tsx` 仍可能在 Vitest 输出非阻断性 `act(...)` 警告。
- 已新增真实文件性能门禁并完成首份基准报告：`docs/perf/2026-02-07-scan-benchmark.md`。
- 后端接入 Phase-2（真实媒体可用化）已落地：Main/Metadata/Fullscreen 由占位渲染切换为真实 `<img>/<video>` 渲染链路。
- 新增媒体定位模型 `MediaLocator`（文件系统/压缩包统一表达），并在 DTO -> ViewModel 映射层收敛为 SSOT。
- 新增 Main 白名单媒体访问协议：Renderer 仅可通过 `Repository -> preload bridge -> ipc` 获取受控 `resource_url`，禁止直连 Node/FS。
- `FileSystemMediaReadService` 已支持 zip 压缩包轻扫（仅 entry name），扫描阶段不做全量解压、不依赖 entry size。
- 已补充 Phase-2 集成测试：真实渲染链路、协议权限边界、压缩包轻扫与异常重试；`lint/test/build` 基线通过。
- 新增视频元数据真实探测链路：Main 使用 `ffprobe` 探测时长/分辨率，Renderer 在 `loadedmetadata` 回传并校准进度显示。
- 新增写链路下沉：图包评分与 `Save as cover` 通过 Main 写入；Renderer 采用 optimistic update + 失败回滚。
- 后端存储已切换到 SQLite 基座：`migration/init/version`、`source/package`、`image`、`video`、`grade`、`cover`、`playlist`、`app_state`、`root_config`、`task_log` 已落地。
- 读链路（snapshot/sidebar/page/metadata）已改为“扫描结果事务 upsert -> SQLite 查询回读”的 DB 优先路径，内存快照仅作为短生命周期缓存。
- 播放列表已接入持久化链路：Renderer 通过 `Repository -> preload -> ipc` 读写播放列表，重启后恢复。
- 导入链路已接入任务队列：文件/文件夹/拖拽/粘贴统一入队，任务状态持久化到 `task_log` 并在前端任务面板展示，失败可重试；导入为“纯引用”：库外路径不复制入库，仅登记引用并在原路径扫描/读取媒体。
- Electron 启动脚本已补齐：`npm run dev:desktop`（开发）与 `npm run desktop:start`（构建+启动）。
- Electron 代理支持：可通过 `MEDIA_PLAYERX_PROXY_SERVER` / `MEDIA_PLAYERX_PROXY_BYPASS` 透传运行时代理配置（用于依赖联网能力或受限网络环境）。
- 缩略图渲染链路已接入 Sharp WebP 缓存：Main 按请求变体生成并缓存缩略图，Renderer 缩略图网格优先读取 thumbnail 变体，Metadata/Fullscreen 保持 original 变体。
- 新增 `resolveMediaResource` 审计统计：拒绝原因分类、token 命中/未命中/过期/清理计数可通过 IPC 读取。
- 新增运行时依赖预检：Main 启动后可输出 `sharp/ffmpeg/ffprobe/archive-wasm/powershell` 可用性，Renderer 在降级生效时展示可见告警；`rar/7z` 与 zip 重处理策略按依赖可用性自动收口。
- 压缩包策略升级：`rar/7z` 统一走“内存解包 -> 非 webp 图片转 webp(quality=90) -> zip(store)”并在同目录原地替换为 `.zip`（成功后删除原始 `rar/7z`）；zip 遇到非 `store/deflate` 图片条目时走“解压 -> webp(quality=90) -> zip(store)”归一化策略。
- 归一化调度策略：`rar/7z` 默认进入低优先级后台队列（等待交互空闲后执行，按 Sidebar 路径排序）；当用户显式打开某个 `rar/7z` 包时提升为高优先级并立即后台处理。
- Header 已新增任务状态按钮（`加载中/空闲`）：位于 Logo 与模式切换之间，点击后才显示导入任务面板；任务面板默认隐藏。
- Sidebar 已增加加载状态标记：左侧圆点表示 `pending`，高亮圆点与行背景表示 `running`，完成后不显示标记。
- 缩略图网格显示策略已更新：卡片比例改为 `1:1`，卡片内不再显示 caption；caption 迁移到元数据预览区底部。
- 纯文件名模式已改为展示真实值：文件大小使用真实字节换算，分辨率优先真实探测；未知值显示 `-`，不再使用 `1920x1080 / 0KB` 占位。
- 扫描/重处理性能门禁改为双规并行：`Z:\bench`（实际负载回放） + `perf-data/<日期>-scan-dataset/input`（脚本生成全覆盖）。
- 覆盖门禁判定以“脚本生成全覆盖目录”执行，实际负载目录用于真实性能回放与回归对照。
- 性能门禁覆盖项包含：中文/日文/特殊符号目录、中文/日文/特殊符号压缩包路径、长路径与损坏压缩包样本。
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
