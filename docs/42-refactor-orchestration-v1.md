# 重构编排总文档 v1 — 抽象/聚合/技术债治理批次规划

Last updated: 2026-07-03

## 0. 文档目的

本文档是 MediaPlayerX v0.8.0 阶段"抽象/聚合/技术债治理"的**总编排入口**，基于对 `src/`、`electron/`、IPC 层、测试覆盖的四维探索分析，将可抽象、可聚合、需补的技术债整理为 3 批共 16 个 PR，明确依赖关系与并行边界。

- 详细实施文档：`docs/43`（第一批）、`docs/44`（第二批）、`docs/45`（第三批）
- 前序文档：`docs/30-全仓重复治理PR拆分清单-v1.md`（PR-01~PR-07 已全部完成）
- 本文档是 docs/30 的后续批次，聚焦"未纳入本轮治理"的遗留项与新发现的技术债

## 1. 背景与动机

### 1.1 质量基线（v0.8.0）

| 指标 | 当前状态 | 趋势 |
|------|---------|------|
| 循环依赖 | 0（716 文件） | 稳定 |
| `any`/`as any`/`@ts-ignore` | 0 | 稳定 |
| `eslint-disable`（穿透门禁） | 0 | 稳定 |
| TODO/FIXME/HACK | 1（测试文件） | 稳定 |
| tsconfig strict | 全开 | 稳定 |
| jscpd 重复率 | **4.31%（420 克隆）** | **恶化**（v21 2.89% → v22 4.21% → 当前 4.31%） |
| audit high | **7 项** | electron 文件锁阻断 |
| 测试/源文件比 | 0.30（155/523） | 偏低 |

### 1.2 核心问题

1. **转码三件套重复 25-30%**：Video/Audio/ImageConvert 三个 service + 三个 TaskManager 共享近似的取消/进度/worker-pool/生命周期模式，横跨 service 层与 IPC facade 层
2. **`theme-parameter/` 单体膨胀**：3 个文件合计 10,699 行（含全仓最大文件 5532 行），是 jscpd 恶化主贡献源
3. **前端单 Store 过载**：`useUiStore` 160+ 字段，任何字段变更触发全量订阅链，是 re-render 风险根因
4. **巨型文件集群**：16 个文件 >1000 行（非测试），其中 6 个 >1500 行
5. **Schema 三重解析**：handler + preload + repository 三次 `.parse()` 同一 IPC 响应
6. **测试盲区**：4 个 feature 零测试（import/perf/search/shared），subtitles 严重不足（0.08）

## 2. 批次划分总览

### 2.1 三批 16 个 PR

| 批次 | 定位 | PR 数 | 风险等级 | 并行性 |
|------|------|-------|---------|--------|
| 第一批（B1） | 低风险底座 | 6 | 低 | 全并行（无文件交叉） |
| 第二批（B2） | 核心抽象 | 5 | 中 | 相互可并行（B2-PR5 依赖 B1-PR5） |
| 第三批（B3） | 依赖前置的精修 | 5 | 中-高 | 依赖前批完成 |

### 2.2 PR 清单

#### 第一批 — Foundation（低风险底座）

| PR | 名称 | 涉及层 | 预期收益 |
|----|------|--------|---------|
| B1-PR1 | Review StateStore 合并 | 后端 store | -80 行；消除 98% 相同的薄包装 |
| B1-PR2 | 根级 components 子目录化 | 前端组件 | 维护成本降低；纯文件移动 |
| B1-PR3 | 重导出链清理 | 后端 | 删除 2 个跳板文件 |
| B1-PR4 | BaseStore 基类抽象 | 后端 store | -40~60 行；类型安全增强 |
| B1-PR5 | Schema 三重解析消除 | IPC 边界 | 减少大 payload 的 2 次 Zod 全量遍历 |
| B1-PR6 | 测试盲区补齐（4 feature） | 测试 | import/perf/search/shared 零测试清零 |

#### 第二批 — Core Abstraction（核心抽象）

| PR | 名称 | 涉及层 | 预期收益 |
|----|------|--------|---------|
| B2-PR1 | 转码三件套统一抽象 | 后端 service + IPC facade | -600~850 行；消除跨层重复 |
| B2-PR2 | zustand Store 拆分 | 前端 state | 减少 re-render；解锁 Hook 拆分 |
| B2-PR3 | themeParameterPanelCatalog 拆分 | 前端 theme | jscpd 主贡献源治理 |
| B2-PR4 | FullscreenLayer 拆分 | 前端组件 | 1920 行 → 按子功能拆分 |
| B2-PR5 | bare ipcMain.handle 收归 | IPC 边界 | -15 处 schema parse 样板 |

#### 第三批 — Dependent Refinement（依赖前置的精修）

| PR | 名称 | 涉及层 | 前置依赖 |
|----|------|--------|---------|
| B3-PR1 | MetadataStore 按领域拆分 | 后端 store | B1-PR4（BaseStore 基类） |
| B3-PR2 | useAppWorkspaceProps 拆分 | 前端 hook | B2-PR2（Store 拆分） |
| B3-PR3 | fileSystemReadFacade.impl 拆分 | 后端 facade | B1-PR3（重导出链清理） |
| B3-PR4 | 低优先级治理（P2 批量） | 多层 | 无（可提前） |
| B3-PR5 | 测试补齐（subtitles/media/music-visualizer） | 测试 | 无（建议重构稳定后补） |

## 3. 依赖矩阵

### 3.1 跨批次依赖图

```
第一批（全并行）                 第二批（相互可并行）              第三批（依赖前置）
┌───────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ B1-PR1 StateStore │  │ B2-PR1 转码抽象       │  │ B3-PR1 MetadataStore  │
│ B1-PR2 components │  │ B2-PR2 Store 拆分     │  │   ← B1-PR4            │
│ B1-PR3 重导出链   │──▶│ B2-PR3 themeCatalog  │──▶│ B3-PR2 WorkspaceProps │
│ B1-PR4 BaseStore  │  │ B2-PR4 FullscreenLayer│  │   ← B2-PR2            │
│ B1-PR5 Schema解析 │  │ B2-PR5 bare ipcMain   │  │ B3-PR3 Facade拆分     │
│ B1-PR6 测试补齐   │  │   ← B1-PR5            │  │   ← B1-PR3            │
└───────────────────┘  └───────────────────────┘  │ B3-PR4 低优先级治理   │
                                                  │ B3-PR5 测试补齐       │
                                                  └───────────────────────┘
```

### 3.2 依赖关系表

| PR | 直接前置 | 说明 |
|----|---------|------|
| B2-PR5 | B1-PR5 | 同改 `preload.ts`，须先完成 Schema 解析消除 |
| B2-PR4 | B2-PR2（协调） | FullscreenLayer 消费 store，拆分时需协调 |
| B3-PR1 | B1-PR4 | MetadataStore 需先应用 BaseStore 基类再拆分 |
| B3-PR2 | B2-PR2 | useAppWorkspaceProps 消费 store，Store 拆分后才能按域拆 Hook |
| B3-PR3 | B1-PR3 | Facade 拆分前需先清理重导出链，避免拆分时引用混乱 |

## 4. 文件交叉验证

### 4.1 第一批内文件交叉（已验证无冲突）

| PR | 主要涉及文件 | 与同批交叉 |
|----|------------|-----------|
| B1-PR1 | `manageAdReviewStateStore.ts`, `manageCoverReviewStateStore.ts`, `manageReviewStateStoreFactory.ts` | 无 |
| B1-PR2 | `src/components/` 下文件移动 | 无 |
| B1-PR3 | `fileSystemReadService.ts`(删), `fileSystemReadFacade.ts`(删) | 无 |
| B1-PR4 | 新建 `baseStore.ts`, 改 `mediaLibrary*Store.ts`（根目录 5 个） | 无（与 PR1 改的 `manageReview*Store` 在不同目录） |
| B1-PR5 | `preload.ts`, `realRepository.ts` | 无 |
| B1-PR6 | 新建测试文件 | 无 |

### 4.2 第二批内文件交叉

| PR | 主要涉及文件 | 与同批交叉 |
|----|------------|-----------|
| B2-PR1 | `management*Transcode/ConvertService.ts`(3), `FileSystemManagementHandlers.ts` | 无 |
| B2-PR2 | `useUiStore.ts`, `useAppSettingsStore.ts`, 消费组件 | **与 PR4 需协调** |
| B2-PR3 | `src/components/theme-parameter/` 目录 | 无 |
| B2-PR4 | `FullscreenLayer.tsx` | **与 PR2 协调**（store 消费） |
| B2-PR5 | `registerBackendIpcHandlers.ts`, `preload.ts` | 依赖 B1-PR5 完成 |

## 5. 进度看板

### 5.1 第一批

- [ ] B1-PR1：Review StateStore 合并
- [ ] B1-PR2：根级 components 子目录化
- [ ] B1-PR3：重导出链清理
- [ ] B1-PR4：BaseStore 基类抽象
- [ ] B1-PR5：Schema 三重解析消除
- [ ] B1-PR6：测试盲区补齐（4 feature）

### 5.2 第二批

- [ ] B2-PR1：转码三件套统一抽象
- [ ] B2-PR2：zustand Store 拆分
- [ ] B2-PR3：themeParameterPanelCatalog 拆分
- [ ] B2-PR4：FullscreenLayer 拆分
- [ ] B2-PR5：bare ipcMain.handle 收归

### 5.3 第三批

- [ ] B3-PR1：MetadataStore 按领域拆分
- [ ] B3-PR2：useAppWorkspaceProps 拆分
- [ ] B3-PR3：fileSystemReadFacade.impl 拆分
- [ ] B3-PR4：低优先级治理（P2 批量）
- [ ] B3-PR5：测试补齐（subtitles/media/music-visualizer）

## 6. 通用门禁协议

### 6.1 每个 PR 必须通过的检查

```bash
npm run format:check    # Prettier 检查
npm run lint            # ESLint（必须 0 warning）
npm run test            # 全部测试通过
npm run build           # tsc + Vite 构建通过
npx madge --circular src electron  # 0 循环依赖
```

### 6.2 涉及 Electron 后端链路时额外执行

```bash
npm run build:electron  # Electron 主进程构建
```

### 6.3 涉及跨层协议时同步检查

- `docs/06-backend-integration-guardrails.md`（IPC 接入规则）
- `electron/channels.ts` + `src/contracts/backend.schemas.ts` + `registerBackendIpcHandlers.ts` 三处同步

### 6.4 提交规范

- 分支命名：`refactor/b<批号>-pr<PR号>-<topic>`（如 `refactor/b1-pr1-review-state-store-merge`）
- Commit 格式：`refactor(<scope>): <subject>`
- 每个 PR 内保持原子提交（单一子目标）

## 7. 风险治理策略

### 7.1 风险分级

| 等级 | 定义 | 处置 |
|------|------|------|
| 低 | 纯文件移动/重导出/类型替换 | 直接执行，单元测试验证 |
| 中 | 跨文件逻辑重构/接口变更 | 分步提交，每步可独立回滚 |
| 高 | 跨进程/跨层协议变更 | 分阶段实施，保留兼容层一个版本窗口 |

### 7.2 回滚策略模板

每个 PR 须在实施文档中明确回滚路径：

- **纯函数替换类**：出现问题直接还原导入路径
- **工厂化/基类抽象类**：保留旧实现适配层一个版本窗口
- **接口变更类**：保留旧事件字段兼容至少一个版本

### 7.3 回归验证策略

- 单元测试：每个 PR 必须补齐/更新对应测试
- E2E 手测：涉及 UI 交互的 PR 需用户侧验证后勾选
- 性能验证：涉及数据流的 PR 需确认首屏/翻页/模式切换无退化

## 8. 与现有文档的关系

| 文档 | 关系 |
|------|------|
| `docs/30-全仓重复治理PR拆分清单-v1.md` | 前序，PR-01~PR-07 已完成；本文档是后续批次 |
| `docs/24-high-optimization-demand-table.md` | 性能优化需求总表；本文档 B2-PR1/B2-PR2 直接关联 #3/#4/#8 |
| `docs/04-architecture-v1.md` | 架构 SSOT；B3-PR3 涉及 Facade 层边界变更需同步 |
| `docs/06-backend-integration-guardrails.md` | IPC 接入约束；B1-PR5/B2-PR5 涉及 IPC 边界变更需同步 |
| `docs/29-module-file-index.md` | 模块文件索引；文件移动/拆分后需同步更新 |

## 9. 变更记录

### 2026-07-03：初始创建

- 基于 4 维探索分析（后端/前端/IPC/测试）创建批次规划
- 16 个 PR 划分为 3 批，明确依赖关系与并行边界
- 详细实施文档见 `docs/43`、`docs/44`、`docs/45`
