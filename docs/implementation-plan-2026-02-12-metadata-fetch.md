# 实施计划 2026-02-12：元数据获取与元数据界面重构（仅计划）

本文件只定义下一轮的目标、接口与落地步骤，不包含任何实际功能开发。

参考实现与交互来源：`docs/ref/metadata-scraper/`。

## 目标范围

1) 设置中新增代理服务器地址设置，并用于元数据获取链路（同时兼容现有环境变量启动方式）。

2) “元数据管理”新增“获取元数据”按钮：点击后弹出与设置面板同风格的浮动容器；复现参考项目的前端交互（两个输入框：Text 与 ID）。

3) Text 输入框默认预填：当前图包文件名去除后缀（`.zip/.rar/.7z/.cbz/.cbr` 等）。

4) 点击检索后返回查询结果：可点击查看详情，合适的点击“解析”得到标准化 JSON（Hitomi 兼容格式），并将其保存为图包元数据；保存后在元数据面板展示。

5) 元数据面板与特征检索根据新元数据结构做相应调整：新增必要字段、展示/编辑口径与筛选口径更新。

6) 解析得到的 `cover/thumb` 作为“节点 cover”持久化：
   - 改造 Sidebar：对“不直接包含图片、但包含压缩包/包含图片目录”的节点显示“包含的压缩包数量/图片数量”，并用不同颜色区分。
   - 改造缩略图容器：在“节点浏览态”展示这些 cover/thumb；点击 cover 跳转到对应节点。

## 非目标（本轮不做/可延后）

- ExHentai 会员 Cookie 管理与账号体系（仅保留游客模式默认 Cookie，必要时在弹窗中增加高级输入）。
- 向量检索/Embedding 链路扩展（当前架构不回退）。
- 复杂的多源合并与去重策略（先以“用户选择结果并解析保存”为主）。

## 架构落点（推荐）

## 元数据检索（Fetcher）

- 运行位置：Electron 主进程（Main Process）。
- 形式：新增一个 `metadataScraperService`（TypeScript 实现），参考 `docs/ref/metadata-scraper/metadata_service.js` 的输入解析与 nhentai/ehentai 获取策略。
- 网络代理：由“设置中的代理地址”驱动（同时兼容 `MEDIA_PLAYERX_PROXY_SERVER` 作为启动/兜底）。

## 元数据解析（Parser）

- 运行位置：Renderer（参考项目也建议在前端 parse）。
- 形式：将参考项目 `public/index.html` 内 `parseToHitomi` 的核心逻辑抽为纯函数（TS），对用户选中的“搜索结果 raw”生成标准化 JSON。

## 数据持久化（Storage）

现有 `writePackageMetadata` 仅能写入：`work_title/circle/author/tags`，不足以保存标准化 JSON 与 cover。

推荐新增两类持久化：

1) **扩展元数据表**（保存标准化 JSON 与关键字段冗余，便于展示/检索）
- SQLite：新增 `media_source_external_metadata`（以 `source_id` 为主键）。
- 字段建议：
  - `source_site`、`source_url`、`source_remote_id`、`source_token`
  - `title`、`title_jpn`、`group`、`group_jpn`、`artist`、`artist_jpn`
  - `posted`、`rating`、`favorited`
  - `tags_json`（namespace -> string）
  - `raw_json`（保留原始/标准化 JSON 全量字符串，作为审计与未来迁移依据）

2) **节点 cover 表**（保存下载后的 cover/thumb 本地路径）
- SQLite：新增 `media_source_cover`（以 `source_id` 为主键）。
- 字段建议：`cover_color`、`cover_image_path`、`updated_at_ms`。
- cover 的下载与落盘：建议写入 `thumbnail_cache_path` 同级独立目录（例如 `covers/`），并通过既有 `resolveMediaResource` 令牌访问机制对 Renderer 暴露。

## 接口与文件改造清单（SSOT）

本节列出“下一轮真实开发”需要改动/新增的文件（只做计划，不执行）。

### A. 设置：新增代理服务器地址

- `src/contracts/settings.ts`
  - 新增字段：`proxyServer: string`（必要时加 `proxyBypass: string`）。
- `src/store/useUiStore.ts`
  - 新增默认值与 `updateSettings` patch 支持。
- `src/features/app/useAppSettingsStore.ts`
  - 透出 `proxyServer` 给 SettingsPanel。
- `src/components/SettingsPanel.tsx`
  - 新增 props：`proxyServer`、`onProxyServerChange`。
- `src/components/settings/renderSettingsMainSection.tsx`
  - 在合适 section（建议：`database` 或新增 `network`）渲染输入框。
- （可选）`electron/main.ts`
  - 若希望对 Renderer 网络也生效：通过 `session.defaultSession.setProxy` 应用代理（需新增 IPC 或在启动期读取 `ui_settings_v1`）。

### B. 元数据获取：IPC/后端服务

- `src/contracts/backend.ts`
  - 新增请求/响应 schema：
    - `searchExternalMetadataRequestSchema`（inputText/inputId/source/proxyServer 等）
    - `searchExternalMetadataResponseSchema`（归一化列表，包含 raw）
    - `downloadExternalCoverRequestSchema`（保存 cover/thumb 并返回 media locator 或 token url）
  - （或）复用现有 `writePackageMetadataRequestSchema` 扩展字段。
- `electron/channels.ts`
  - 新增 `BACKEND_CHANNELS.metadataSearch` / `BACKEND_CHANNELS.metadataCoverDownload` 等。
- `electron/preload.ts`
  - 在 `backendApi` 暴露新方法（invoke + Zod parse）。
- `electron/registerBackendIpcHandlers.ts`
  - `ipcMain.handle` 实现新通道：调用 `metadataScraperService`，并执行超时/错误归类。
- 新增：`electron/services/metadata/metadataScraperService.ts`
  - TypeScript 版本抓取器（参考：`docs/ref/metadata-scraper/metadata_service.js`）。
  - 需明确依赖：`axios`、`cheerio`、`socks-proxy-agent`、`https-proxy-agent`。

### C. 元数据管理 UI：获取元数据弹窗

- `src/components/MetadataManagementPanel.tsx`
  - 新增按钮：`获取元数据`。
- 新增：`src/components/metadata/MetadataFetchPanel.tsx`
  - 浮动容器（外观对齐 SettingsPanel），包含：
    - Text 输入（默认预填文件名去后缀）
    - ID 输入
    - 检索按钮、加载态、错误态
    - 结果列表 -> 详情查看
    - 解析按钮 -> JSON 预览
    - 保存按钮 -> 写入图包元数据 + 写入外部 JSON + 保存 cover
- 新增：`src/features/metadata/parseExternalMetadata.ts`
  - 纯函数：将搜索结果 raw 解析为 Hitomi 兼容 JSON（参考 `docs/ref/metadata-scraper/public/index.html` 中 `parseToHitomi`）。
- `src/features/app/useMetadataWriteBindings.ts`
  - 新增“保存外部元数据/cover”的 write 编排（必要时新增新的 write API）。
- `src/features/app/useAppTopLayerBindings.ts` / `src/features/app/useAppDisplayAndEffects.ts`
  - 管理弹窗 open/close、Esc 优先级、overlay click close。

### D. 数据层：持久化外部元数据与节点 cover

- `electron/mediaLibrarySchema.ts`
  - bump `SCHEMA_VERSION`；新增表 `media_source_external_metadata`、`media_source_cover`。
- `electron/mediaLibraryMetadataStore.ts`
  - 新增读写 cover 与 external metadata 的 store API。
- `electron/services/file-system-read/libraryReadWriteService.ts`
  - 写入外部元数据与 cover 的领域方法。
- `electron/services/file-system-read/librarySnapshotService.ts`
  - snapshot 拼装时 join/merge external metadata + cover（用于 UI 展示/检索）。
- `src/contracts/backend.ts`
  - 扩展 `imagePackageDtoSchema`（可选字段）以携带 external metadata 与 cover。
- `src/features/backend/mappers.ts`
  - DTO -> ViewModel 映射补齐新字段。

### E. Sidebar 与缩略图容器：节点浏览态

- `src/contracts/backend.ts`
  - 扩展 `sidebarNodeDtoSchema`：增加聚合计数（descendant counts）与节点类型区分（至少能区分：压缩包 package vs 目录 directory vs 中间 folder）。
- `electron/fileSystemSidebarTree.ts`
  - 计算聚合计数（包含压缩包数量、包含图片数量）；并为“目录叶子节点”显式标记（避免与中间 folder 混淆）。
- `src/types.ts` + `src/features/backend/mappers.ts`
  - 映射新字段到 `SidebarNode`。
- `src/components/SidebarPanel.tsx`
  - 改造计数展示：用不同颜色/徽标区分“包数量/图片数量”。
- `src/components/ImageMainSection.tsx`
  - 增加“节点浏览态”渲染分支：当当前选中节点不是叶子 package/directory 时，主区网格显示子节点 cover（而非图片）。
- `src/features/app/*`（视图模型层）
  - 为节点浏览态新增数据模型：子节点列表、cover url 解析、点击跳转逻辑。

### F. 元数据面板与特征检索适配

- `src/components/MetadataPanel.tsx`
  - 新增外部元数据展示区（source/title_jpn/group_jpn/artist_jpn/posted/rating 等）；并保持现有可编辑字段仍可写入。
- `src/features/search/useFeatureSearch.ts`
  - 将新字段纳入筛选：
    - 最小集：`title/title_jpn/group/artist` 加入查询字段；tags namespace 合并到现有 tags 筛选。
  - 同步更新 options（circle/author/tag）生成口径。
- `src/contracts/backend.ts` + `electron/services/*`
  - 若检索要走后端查询：扩展 `FeatureFilterDto`，并在 DB 查询侧实现。

## 推荐实施顺序（里程碑）

1) 先做 UI/交互闭环（不落库）：MetadataFetchPanel + IPC search + parse preview（可临时不保存，只验证交互）。

2) 再做持久化：external metadata + cover 下载落盘 + resolveMediaResource 打通。

3) 最后做“节点浏览态”与 Sidebar 计数/颜色重构（这是最大改动面）。

## 验收标准（Definition of Done）

- 设置中可配置代理地址；重启后仍保留；元数据检索请求按该代理生效。
- 元数据管理面板存在“获取元数据”；弹窗 UI 与设置面板同风格；Text 默认预填文件名去后缀。
- 检索 -> 结果 -> 详情 -> 解析 -> 保存 的闭环可用；保存后元数据面板展示新增字段。
- Sidebar 对中间节点显示“包数/图数”并颜色区分；主区在节点浏览态显示 cover 网格，点击可跳转。
- `npm run lint` / `npm run test` / `npm run build` 通过。

## 风险与约束

- 网络与合规：目标站点可能存在访问限制/Cloudflare；需提供超时与重试 UI，并避免在默认配置下触发高频并发。
- 安全：所有 cover 下载与本地落盘必须走受控目录与 token 访问；不得开放任意路径读取。
- 迁移：DB schema bump 需保证旧库升级与回退策略（至少具备安全的向前迁移）。
