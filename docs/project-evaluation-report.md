# MediaPlayerX 项目评估报告

> 评估日期：2026-02-10
> 评估范围：项目规模、可维护性、可扩展性

---

## 目录

1. [项目概况](#1-项目概况)
2. [规模评估](#2-规模评估)
3. [可维护性评估](#3-可维护性评估)
4. [可扩展性评估](#4-可扩展性评估)
5. [风险矩阵](#5-风险矩阵)
6. [改进建议](#6-改进建议)

---

## 1. 项目概况

| 属性 | 值 |
|------|-----|
| 项目名称 | `mediaplayerx` |
| 项目类型 | Electron 桌面应用 (Vite + React) |
| 主语言 | TypeScript 5.9 |
| UI 框架 | React 19 + Zustand 5 |
| 构建工具 | Vite 7 |
| 运行时 | Electron 40 |
| 测试框架 | Vitest 4 + Testing Library |
| 验证库 | Zod 4 |
| 3D 引擎 | Three.js 0.182 |
| 数据库 | SQLite (node:sqlite) |

### 关键依赖

| 依赖 | 用途 |
|------|------|
| `react` / `react-dom` 19 | UI 框架 |
| `zustand` 5 | 状态管理 |
| `three` 0.182 | 3D 可视化 (Vector Universe) |
| `zod` 4 | Schema 验证 (IPC 契约) |
| `sharp` 0.34 | 图像处理 / 缩略图生成 (后端) |
| `better-sqlite3` 12 | SQLite 数据库 (后端) |
| `7z-wasm` | 7-Zip 归档解压 |
| `node-unrar-js` | RAR 归档解压 |
| `yauzl` / `node-stream-zip` | ZIP 归档处理 |

---

## 2. 规模评估

### 2.1 代码行数统计

| 文件类型 | 文件数 | 总行数 |
|----------|--------|--------|
| TypeScript (`.ts`) | 175 | 27,633 |
| JSON | 5 | 6,502 |
| CSS | 34 | 4,493 |
| JavaScript (`.js`) | 5 | 3,959 |
| HTML | 4 | 1,441 |
| **合计** | **223** | **44,028** |

- 有效手写代码：~33,757 行（排除 `package-lock.json` 和 `dist/` 下的 vendor 文件）
- 核心业务代码（TypeScript + CSS）：~32,126 行

### 2.2 功能模块分布

| 模块 | 位置 | 说明 |
|------|------|------|
| 核心应用编排 | `src/features/app/` (58文件) | Hook 组合管道，props 构建器 |
| 后端数据访问 | `src/features/backend/` | Repository 模式，IPC 调用 |
| Vector Universe | `src/features/vector-universe/` | Three.js 3D 空间浏览 |
| 导入系统 | `src/features/import/` | 多源导入 + 进度跟踪 |
| 管理模块 | `src/features/management/` | 批量选择与操作 |
| 媒体播放 | `src/features/media/` | 视频播放 + 播放列表 |
| 侧边栏导航 | `src/features/sidebar/` | 树状导航 |
| 搜索过滤 | `src/features/search/` | 多字段 + 向量搜索 |
| 快捷键系统 | `src/features/shortcuts/` | 30+ 快捷键动作 |
| 主题系统 | `src/features/theme/` | 17 套主题，自动发现 |
| 布局系统 | `src/features/layout/` | 面板拖拽缩放 |
| 性能基准 | `src/features/perf/` + `src/bench/` | 基准测试基础设施 |
| AI 广告检测 | `electron/manageAdReview/` | OpenAI Vision 审查引擎 |

### 2.3 功能点分析 (IFPUG)

#### 内部逻辑文件 (ILF) — 10 个数据表

| 数据实体 | 复杂度 | 功能点 |
|----------|--------|--------|
| media_source（图像包） | 高 | 15 |
| image_item（图像条目） | 高 | 15 |
| video_item（视频条目） | 高 | 15 |
| package_grade（评分） | 低 | 7 |
| video_cover（封面） | 低 | 7 |
| video_metadata（视频元数据） | 中 | 10 |
| playlist_entry（播放列表） | 低 | 7 |
| app_state（应用状态） | 中 | 10 |
| root_config（根配置） | 低 | 7 |
| task_log（任务日志） | 中 | 10 |
| **小计** | | **103** |

#### 外部接口文件 (EIF) — 7 个外部集成

| 外部接口 | 复杂度 | 功能点 |
|----------|--------|--------|
| 文件系统（目录扫描/读取） | 高 | 10 |
| sharp 图像处理 | 中 | 7 |
| ffmpeg/ffprobe 视频处理 | 中 | 7 |
| 7z/RAR/ZIP 归档处理 | 高 | 10 |
| OpenAI Vision API（AI 审查） | 高 | 10 |
| Electron IPC（30 通道） | 高 | 10 |
| 剪贴板/原生对话框 | 低 | 5 |
| **小计** | | **59** |

#### 外部输入 (EI) — 用户写入/修改操作

| 功能 | 复杂度 | 功能点 |
|------|--------|--------|
| 导入媒体（文件/文件夹/拖拽/粘贴 4 种方式） | 高 | 6 |
| 编辑图像包元数据（标题/圈子/作者/标签） | 高 | 6 |
| 编辑视频元数据 | 中 | 4 |
| 评分（0-5 星） | 低 | 3 |
| 隐藏/显示图像 | 低 | 3 |
| 批量删除（图像/包/视频） | 中 | 4 |
| 播放列表管理（增删排序） | 中 | 4 |
| 应用设置保存（46 项） | 高 | 6 |
| 数据库重置 | 低 | 3 |
| 主题切换（17 套主题） | 低 | 3 |
| 键盘快捷键系统（30+ 动作） | 高 | 6 |
| Vector Universe 交互（10 种控制） | 高 | 6 |
| **小计** | | **54** |

#### 外部输出 (EO) — 数据展示/输出

| 功能 | 复杂度 | 功能点 |
|------|--------|--------|
| 侧边栏树状导航 | 高 | 7 |
| 图像缩略图网格浏览 | 高 | 7 |
| 视频缩略图网格浏览 | 中 | 5 |
| 元数据面板显示 | 中 | 5 |
| 全屏图像查看（双面板） | 高 | 7 |
| 全屏视频播放（含控制器） | 高 | 7 |
| Vector Universe 3D 空间 | 高 | 7 |
| Vector Universe HUD 叠加层 | 中 | 5 |
| 导入任务进度面板 | 中 | 5 |
| 错误/警告横幅 | 低 | 4 |
| 设置面板 | 中 | 5 |
| 搜索/过滤面板 | 中 | 5 |
| 批量管理面板 | 中 | 5 |
| 性能基准测试 UI | 中 | 5 |
| AI 广告检测结果 | 中 | 5 |
| **小计** | | **84** |

#### 外部查询 (EQ) — 查询/检索操作

| 功能 | 复杂度 | 功能点 |
|------|--------|--------|
| 多字段搜索（名称/标题/圈子/作者/标签） | 高 | 6 |
| 向量相似度搜索 | 高 | 6 |
| 图像分页加载 | 中 | 4 |
| 库快照读取 | 中 | 4 |
| 归档加载状态查询 | 低 | 3 |
| 运行时能力检测 | 中 | 4 |
| 媒体资源解析（Token 鉴权流式传输） | 高 | 6 |
| **小计** | | **33** |

#### 功能点汇总

| 类型 | 功能点 |
|------|--------|
| ILF（内部逻辑文件） | 103 |
| EIF（外部接口文件） | 59 |
| EI（外部输入） | 54 |
| EO（外部输出） | 84 |
| EQ（外部查询） | 33 |
| **未调整功能点 (UFP) 总计** | **333** |

### 2.4 规模总评

| 维度 | 数值 | 评价 |
|------|------|------|
| 手写代码行数 | ~33,800 行 | 中型项目 |
| 未调整功能点 | 333 FP | 中型项目（偏上） |
| React 组件数 | 30 个 | 中等 UI 复杂度 |
| 功能模块数 | 12 个 | 架构分层清晰 |
| 测试文件数 | 16 个 | 测试覆盖适中 |
| IPC 通道数 | 30 个 | 前后端通信复杂 |
| 数据库表数 | 10 张 | 数据模型中等 |
| 主题数 | 17 套 | 高度可定制 |

**规模等级：中型项目**（行业标准：100-500 FP / 10,000-50,000 行）

按等效复杂度换算（考虑 3D 引擎、AI 集成、多格式归档等技术复杂度），实际开发工作量相当于 400-450 FP 的常规项目。

---

## 3. 可维护性评估

**总体评分：B+（良好）**

### 3.1 架构设计 — A-

**优点：**

- **单向数据管道**：状态流严格遵循 `Sources → Read → Display → View` 方向，无反向引用
- **无循环依赖**：依赖图呈严格有向无环图 (DAG)，仅 `app` 模块跨越特性边界
- **Facade + 组合模式**：后端 `FileSystemMediaReadService`（549 行）委派给 6 个专注服务，`MediaLibraryDatabase`（196 行）委派给 5 个存储类
- **Schema-first IPC 契约**：Zod 同时提供编译时类型、运行时验证、文档，一源三用
- **双侧验证**：IPC 处理器对 request 和 response 都做 `schema.parse()`

特性间依赖图（14 条边，全部以 app 为根）：

```
app ──→ backend (16文件), media (7), search (1), import (2),
        management (1), layout (3), perf (4)
import ──→ backend (2)
media ──→ backend (1)
vector-universe ──→ (完全隔离，零跨特性导入)
```

**缺陷：**

- `ReadonlyMediaRepository` 命名不当 — 包含 10+ 写操作方法，违反接口隔离原则 (ISP)
- `app/helpers.ts` 被 `import` 和 `media` 反向导入，造成轻微边界泄漏
- 大多数特性模块缺少 barrel export (`index.ts`)，外部直接引用内部文件路径

### 3.2 内聚性 — A

| 文件/模块 | 行数 | 评价 |
|-----------|------|------|
| `build*Props.ts`（10 个） | 53-107 行 | 纯函数映射，零状态/零副作用，职责单一 |
| `FileSystemMediaReadService` | 549 行 | 标准 Facade 模式，22 个公共方法大多 1-3 行委派 |
| `MediaLibraryDatabase` | 196 行 | 中介者模式，25 个方法全为 1 行委派 |
| 各 Zustand action | 5-15 行 | 带 Zod 校验的浅相等检查 |

### 3.3 Hook 组合深度与复杂度 — B

调用链结构：

```
useAppController (6行)
  └── useAppDataPipeline (35行)
        ├── useAppRuntimeSources ——————— L1 (8个子hook)
        ├── useAppReadAndNavigation ———— L1
        │     ├── useAppReadState (170行) —— L2
        │     │     └── useReadOnlyDataAccess (392行) — L3
        │     └── useAppNavigationState (322行) — L2
        │           └── useAppSidebarScopeState — L3
        │                 └── useManageSelection — L4 ← 最深
        ├── useAppDisplayAndEffects ———— L1 (9个子hook, 389行)
        │     └── useWriteDataAccess (446行) — L2
        └── useAppViewComposition ————— L1
```

| 指标 | 值 |
|------|-----|
| 最大嵌套深度 | 4 层 |
| 传递调用的自定义 hook 总数 | ~30 个 |
| 主调用链总行数 | ~2,400 行 |
| Level 2 最宽处 | 18 个 hook |
| 最大单一 hook | `useWriteDataAccess` 446 行 |

**风险点：**

- `useAppDisplayAndEffects` 解构约 90 个变量，修改需理解 9 个组合 hook
- 广泛使用 `ReturnType<typeof useHook>` 推断类型，签名变更会级联传播
- "通过 hook 传递 props" 的模式增加冗余度

### 3.4 类型安全 — A-

- 54 个 Zod schema 覆盖完整 IPC API 表面（461 行）
- 46 个设置字段全部带有 `min/max` 约束的 Zod 验证
- 几乎没有 `any` 类型，全程严格 TypeScript
- 区分联合类型正确用于多态场景（如 `MediaLocator` = 文件系统 | 归档入口）
- 懒递归 Zod 类型用于树结构（`sidebarNodeDtoSchema`）

### 3.5 测试质量与覆盖

| 指标 | 值 |
|------|-----|
| 测试文件数 | 16 个 |
| 源文件数 | ~100+ 个 |
| 文件级覆盖率 | ~20% |
| 最大测试文件 | `App.test.tsx` 1,026 行 |

**测试质量（B+）：**

- 行为驱动 — 全部通过 `screen.getByRole()` / `getByText()` 断言，零内部状态断言
- 手写 stub/mock 仓库（`WritableRepositoryStub`），耦合接口而非实现
- 真实文件系统集成测试 — 创建临时目录、写入真实 ZIP、执行完整导入管道

**覆盖广度不足（C）：**

| 未测试模块 | 风险 |
|------------|------|
| `src/features/app/` 20+ 编排文件 | 高 — 核心应用逻辑 |
| `mediaLibraryDatabase` 及 5 个子 store | 高 — 数据持久化 |
| `fileSystemMediaAccessGuard` | 高 — 安全性 |
| 归档处理（7z/RAR/ZIP） | 高 |
| 导入管道 (`useImportPipeline`) | 中 |
| 搜索/过滤 (`useFeatureSearch`) | 中 |
| Zustand store (`useUiStore`) | 中 |

### 3.6 文档

| 维度 | 评分 | 说明 |
|------|------|------|
| 外部文档 | A | 完善的 `docs/` 目录，SSOT 规范，主题规格说明，开发清单 |
| 内联文档 | F | 零 JSDoc 注释，整个代码库无一处 `/** */` |
| TODO/FIXME | 零 | 代码干净，无遗留标记 |
| 复杂算法文档 | 缺失 | Vector Universe 场景构建、归档规范化管道、Token 生命周期等缺乏代码级说明 |

### 3.7 依赖管理 — A

| 指标 | 值 |
|------|-----|
| 生产依赖 | 7 个（极精简） |
| 开发依赖 | 16 个 |
| 废弃包 | 0 |
| 版本状态 | 全部当前最新主版本 |

无 lodash、moment、axios 等臃肿工具库。全栈仅用 `zustand`（状态）+ `zod`（验证）+ `three`（3D）。

### 3.8 状态管理架构 — A-

三层状态架构：

| 层级 | 技术 | 内容 | 持久化 |
|------|------|------|--------|
| 持久化设置 | Zustand (`useUiStore`) | 布局、主题、快捷键、缩略图、向量配置（~35 字段） | 是（经后端 `readAppState`/`writeAppState`） |
| 会话状态 | React hooks (`useAppSessionState`) | 选中 ID、焦点状态、管理模式、可变映射 | 否 |
| 后端状态 | Electron 主进程 | 库快照、侧边栏树、图像页、元数据、导入任务 | 是（SQLite） |

---

## 4. 可扩展性评估

**总体评分：B-（中等偏上）**

### 4.1 新增主题 — A（最佳扩展点）

只需在 `src/styles/themes/presets/` 下新增一个 CSS 文件即可：

- Vite `import.meta.glob` 自动发现，零注册代码
- 提供 `_template.css` 模板
- 119 行 `theme-system-v1.md` 规格说明 + QA 检查清单
- 目前已有 19 套主题

### 4.2 新增导入源 — B

修改 3 个位置：

| 步骤 | 文件 | 改动 |
|------|------|------|
| 1 | `src/contracts/backend.ts` | 在 `importTaskSourceSchema` 枚举中添加值 |
| 2 | `src/features/import/` | 新建 hook 提取路径 |
| 3 | `useImportPipeline.ts` | 接入新 hook |

后端导入队列对路径来源透明，无需改动。

### 4.3 新增 IPC 通道 — C+

需改动 5-6 个文件：

```
channels.ts → backend.ts (Zod) → registerBackendIpcHandlers.ts
→ preload.ts → repository/types.ts → realRepository.ts + mockRepository.ts
```

机械性操作，无通用注册机制。Zod 验证提供安全保障。

### 4.4 数据库 Schema 演化 — B-

- 使用 `PRAGMA user_version` 版本控制（当前 v5）
- 条件式 `ALTER TABLE` 迁移，`if (currentVersion < N)` 守卫
- 无降级迁移，无迁移文件隔离
- 迁移逻辑嵌入单一 160 行函数

### 4.5 新增媒体类型（如音频） — D（最弱扩展点）

image/video 二元结构硬编码在 6 个层次中：

| 层次 | 硬编码位置 |
|------|-----------|
| DTO 契约 | `z.enum(['image', 'video'])` |
| 数据库 | 独立的 `image_item` / `video_item` 表 |
| 文件扩展名 | 独立的 `IMAGE_EXTENSIONS` / `VIDEO_EXTENSIONS` Set |
| UI 模式 | `browserModeSchema = z.enum(['image', 'video'])` |
| 快照结构 | 独立的 `image_packages` / `videos` 数组 |
| 组件层 | 独立的 `ImageMainSection` / `VideoMainSection` |

新增音频类型需要触及契约、数据库、采集器、侧边栏构建器、快照、模式切换、元数据面板、播放组件等多个层面。无通用"媒体类型"抽象层。

---

## 5. 风险矩阵

| 风险 | 严重度 | 可能性 | 说明 |
|------|--------|--------|------|
| 核心编排 hook 无测试 | 高 | 中 | 重构 `useAppDataPipeline` 链无安全网 |
| 数据库存储层无单元测试 | 高 | 中 | 迁移或查询变更可能引入数据损坏 |
| 零内联文档 | 中 | 高 | 新开发者理解 Vector Universe 或归档管道需大量时间 |
| Hook 签名级联 | 中 | 中 | `ReturnType<typeof>` 使签名变更传播到所有消费者 |
| 媒体类型不可扩展 | 中 | 低 | 当前无音频需求，但未来受限 |
| 安全守卫无测试 | 高 | 低 | `mediaAccessGuard` 未经独立验证 |

---

## 6. 改进建议

按优先级排列：

| 优先级 | 建议 | 投入 | 收益 |
|--------|------|------|------|
| **P0** | 为数据库存储层和安全守卫补充单元测试 | 中 | 高 — 防止数据损坏和安全漏洞 |
| **P1** | 为核心编排 hooks 补充集成测试 | 高 | 高 — 重构安全网 |
| **P1** | 为 `build*Props` 纯函数补充单元测试（低成本高回报） | 低 | 中 |
| **P2** | 在模块边界定义显式接口，替代 `ReturnType<typeof>` | 中 | 中 — 降低级联风险 |
| **P2** | 将 `app/helpers.ts` 迁移至共享 `utils/` 目录 | 低 | 低 — 消除边界泄漏 |
| **P2** | 重命名 `ReadonlyMediaRepository` 为 `MediaRepository` 或拆分读写接口 | 低 | 低 — 提升语义清晰度 |
| **P3** | 为关键算法（场景构建、归档规范化、Token 生命周期）添加 JSDoc | 中 | 中 — 降低上手门槛 |
| **P3** | 为各特性模块添加 barrel export (`index.ts`) | 低 | 低 — 减少内部路径耦合 |

---

## 附录：关键量化指标汇总

| 指标 | 值 |
|------|-----|
| 手写代码总行数 | ~33,800 |
| 未调整功能点 (UFP) | 333 |
| 等效复杂度功能点 | 400-450 |
| React UI 组件数 | 30 |
| 功能模块数 | 12 |
| Electron 后端服务文件数 | ~30 |
| 测试文件数 | 16 |
| 文件级测试覆盖率 | ~20% |
| 主题预设数 | 19 |
| IPC 通道数 | 30 (27 后端 + 3 基准) |
| Zod Schema 数 | 54 |
| 数据库表数 | 10 |
| 键盘快捷键动作数 | 30 |
| Vector 控制动作数 | 10 |
| 应用设置字段数 | 46 |
| 核心领域模型类型数 | 9 |
| 基准测试脚本数 | 5 |
| Hook 最大嵌套深度 | 4 层 |
| 最大单一 Hook 行数 | 446 (useWriteDataAccess) |
| 最大非 Hook 文件行数 | 549 (fileSystemReadFacade) |
| 生产依赖数 | 7 |
| 开发依赖数 | 16 |
