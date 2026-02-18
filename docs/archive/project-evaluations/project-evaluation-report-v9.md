# MediaPlayerX 项目评估报告（v9）

> 评估日期：2026-02-15  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪/运行态性能  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.0.0`，commit `8e4c3bf`（工作区非洁净）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Electron `v40.2.1`  
> 产物目录：`docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/`

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 67,947 LOC，302 文件）。
- **功能复杂度结论**：高（`ipcMain.handle` 51、契约 Schema 120、`CREATE TABLE` 21）。
- **总体质量结论**：**B**（`lint/test/test-json/test:coverage/build/build:electron/audit/licenses/sbom/secrets` 均通过；`outdated` 待治理）。
- **发布建议**：⚠️限范围发布（P0 已清零；仍有合规例外、体积告警、运行态基线缺口）。
- **阻断项（P0）**：
  1) 无（本轮已完成整改并闭环）。
- **主要风险（Top 3）**：
  - 风险1：许可证例外仍待确认（严重度中/概率中，证据 `attachments/licenses-summary.json`）。
  - 风险2：前端主 chunk 持续超预算（严重度中/概率中，证据 `attachments/build.txt`）。
  - 风险3：运行态性能基线缺失（严重度中/概率中，证据 `attachments/` 无 `perf.json`）。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- 度量工具：本轮使用 Python 脚本统计（`loc-metrics.json`、`ipc-metrics.json`）。
- 覆盖率口径：以 `vitest --coverage` 实测，已产出 `coverage-summary.json`。

### 1.2 验证命令与产物（本次实际执行）

| 类别 | 步骤 | 实际命令 | 产物路径 | 判定 |
|---|---|---|---|---|
| 版本基线 | git 信息 | `git rev-parse ...` `git status --porcelain` | `attachments/git.txt` | ✅ 已记录 |
| 代码规范 | ESLint | `npm run lint` | `attachments/lint.txt` | ✅ 通过（3 warning） |
| 测试 | Vitest | `npm run test` | `attachments/test.txt` | ✅ 通过 |
| 测试报告 | Vitest JSON | `npx vitest run --reporter=json --outputFile=...` | `attachments/test.json` + `attachments/test-summary.json` | ✅ 生成且通过 |
| 覆盖率 | Vitest coverage | `npm run test:coverage` | `attachments/test-coverage.txt` + `attachments/coverage-summary.json` | ✅ 通过 |
| 覆盖率 JSON | `coverage-summary.json` | `--coverage.reporter=json-summary` | `attachments/coverage-summary.json` | ✅ 已生成 |
| 构建(前端) | Vite build | `npm run build` | `attachments/build.txt` | ✅ 通过（有 chunk 警告） |
| 构建(Electron) | main/preload/worker | `npm run build:electron` | `attachments/build-electron.txt` | ✅ 通过 |
| 安全(依赖) | npm audit | `npm audit --audit-level=high --json` | `attachments/audit.json` + `attachments/audit-summary.json` | ✅ 通过 |
| 依赖债务 | outdated | `npm outdated --json` | `attachments/outdated.json` + `attachments/outdated-summary.json` | ⚠️ 有待升级 |
| License 合规 | license-checker | `npx --yes license-checker --json` | `attachments/licenses.json` + `attachments/licenses-summary.json` | ✅ 可审计 |
| SBOM | cyclonedx-npm | `npx --yes @cyclonedx/cyclonedx-npm ...` | `attachments/sbom.json` + `attachments/sbom-summary.json` | ✅ 可审计 |
| Secrets | gitleaks | `gitleaks detect ...` | `attachments/secrets.txt` + `attachments/secrets.json` + `attachments/secrets-summary.json` | ✅ 通过（baseline） |

---

## 2. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 关键数字 | 证据 |
|---|---|---:|---|
| lint | ✅ | errors 0 / warnings 3 | `attachments/lint.txt` |
| prettier(P0) | ⚪ 未执行 | - | - |
| typecheck(P0) | ✅(含于 build) | `tsc -b` 通过 | `attachments/build.txt` |
| test | ✅ | 144 suites / 350 tests / 0 fail | `attachments/test.txt` + `attachments/test-summary.json` |
| test-json(P0) | ✅ | JSON 已生成且 `success=true` | `attachments/test.json` |
| coverage | ✅ | lines 57.59 / branches 51.46 / functions 58.2 / statements 57.46 | `attachments/test-coverage.txt` |
| coverage-json(P0) | ✅ | 已生成 | `attachments/coverage-summary.json` |
| build | ✅ | 主包 `index-*.js` 767.71 kB（超 700 kB 警告） | `attachments/build.txt` |
| bundle(P1) | ⚠️ | Top: `index` 767.71 kB / `vendor-react` 190.25 kB | `attachments/build.txt` |
| build:electron | ✅ | main 3.7 MB / preload 551.4 kB / worker 19.2 kB | `attachments/build-electron.txt` |
| package(P0*) | ⚪ 未执行 | - | - |
| audit | ✅ | high 0 / critical 0 | `attachments/audit.json` |
| outdated | ⚠️ | 10 个依赖待升级（major 估计 4） | `attachments/outdated.json` |
| licenses(P0*) | ✅ | packages 432 / copyleft 1 / custom-or-unknown 2 | `attachments/licenses-summary.json` |
| sbom(P0*) | ✅ | CycloneDX 1.6 / components 414 | `attachments/sbom-summary.json` |
| secrets(P0) | ✅ | findings 0（baseline 已启用） | `attachments/secrets-summary.json` |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：223 文件 / 50,130 行
- Electron 后端：79 文件 / 17,817 行
- 核心业务合计：302 文件 / **67,947 行**
- 测试代码：69 文件 / 17,587 行；测试/业务比：**25.88%**
- 样式/脚本/文档：CSS 9,906 行；scripts 4,729 行；docs 7,353 行

### 3.2 功能模块规模（`src/features`）
- Top 模块：`app` 15,144 行（78 文件）、`backend` 5,612 行、`music-visualizer` 4,761 行。
- 对比 v8：`app` 持续扩张（13,827 -> 15,144），核心复杂度仍集中在应用编排层。

### 3.3 超大文件 Top（不含测试）
- `electron/services/file-system-read/manageAdReviewService.ts`：1222
- `src/components/MusicMainSection.tsx`：1154
- `src/mockData.ts`：1093
- `src/features/app/useAppWorkspaceProps.ts`：1011
- `src/features/music-visualizer/webglRenderer.ts`：999

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 分层依旧可识别，未出现明显跨层耦合失控。
- 窗口导航防护存在（`will-navigate` + `setWindowOpenHandler('deny')`），基础外链面仍受控。

### 4.2 结构健康度指标（本轮）
- 超大文件数量上升到 23（v8 为 15），维护成本与回归半径扩大。
- 关键编排文件（`useAppWorkspaceProps.ts`）回升到 1011 行，拆分收益被部分抵消。
- 本轮未执行 `madge/jscpd/ts-prune`，循环依赖/重复率/死代码仍缺口。

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果与失败归因
- `npm run test`：通过（144 suites / 350 tests，0 failed）。
- 本轮已修复失败根因：UI 文案断言漂移（中英文可访问名称差异）与 1 处异步 mock 目标错误。
- 仍观察到 `act(...)` 警告高频，属于稳定性风险信号（非阻断）。

### 5.2 覆盖率
- `coverage-summary.json` 已生成并归档。
- 总覆盖率：lines **57.59%** / branches **51.46%** / functions **58.2%** / statements **57.46%**。
- 当前状态：覆盖率门禁恢复可审计，但关键链路覆盖深度仍有提升空间。

### 5.3 慢测关注
- `App.test.tsx` 耗时约 72s，`electron/fileSystemReadService.test.ts` 耗时约 7.5s，仍为慢测热点。
- `MetadataAdReviewSection.test.tsx`、`MusicMainSection.test.tsx` 分别约 2.16s / 3.30s，整改后已回归稳定通过。
- `App.test.tsx` 仍持续输出 `act` 警告，建议单独治理。

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- 构建通过。
- 主要产物：`index-*.js` 767.71 kB，`vendor-react` 190.25 kB，`vendor-data` 69.65 kB。
- 触发 chunk 预算告警（>700 kB），建议继续拆包（`dynamic import/manualChunks`）。

### 6.2 Electron 构建与发布产物
- `main/preload/worker` 均成功产出。
- 产物体积：`main.cjs` 3.7 MB、`preload.cjs` 551.4 kB、`archiveNormalizeWorker.cjs` 19.2 kB。
- 本轮未执行 `desktop:pack`、签名、公证、自动更新链路验证。

---

## 7. 安全与合规评估

### 7.1 依赖安全（npm audit）
- `npm audit`：0 漏洞（high/critical 均为 0）。

### 7.2 Electron 安全清单

| 项 | 当前值 | 风险 | 证据 | 结论 |
|---|---|---|---|---|
| contextIsolation | true | 低 | `electron/main.ts:288` | ✅ |
| nodeIntegration | false | 低 | `electron/main.ts:289` | ✅ |
| sandbox | true | 低 | `electron/main.ts:290` | ✅ |
| webSecurity | 未显式配置（默认 true） | 中 | `electron/main.ts` | ⚠️ |
| permissionRequestHandler | 未见实现 | 中 | `attachments/ipc-metrics.json` (`permission_request_handler_count=0`) | ⚠️ |
| CSP | 未发现明确策略 | 中 | `attachments/ipc-metrics.json` (`csp_reference_count=0`) | ⚠️ |
| 外链打开策略 | allowlist + 协议限制 + localhost 例外 | 低 | `electron/externalUrlPolicy.ts` + `electron/registerBackendIpcHandlers.ts:468` | ✅ |

### 7.3 IPC 与契约安全
- IPC handler：51（`ipcMain.handle`）。
- Schema 导出：120。
- preload 暴露 API：5（`mediaPlayerBackend/Bench/Platform/View/Window`）。
- 高风险面：仍需补 `permissionRequestHandler` 与 CSP，降低窗口权限请求与远程内容策略风险。

### 7.4 License / SBOM（发布审计）
- License：432 包，copyleft 1（`@img/sharp-win32-x64@0.34.5`），Custom/UNLICENSED 共 2。
- SBOM：CycloneDX 1.6，components 414，dependencies 440。

### 7.5 Secret 扫描
- 已完成 `gitleaks` 扫描，`secrets.json` 结果为 `[]`，findings=0。
- 使用 baseline（`attachments/secrets-baseline.json`）消化历史误报，`secrets-summary.json` 记录 `baseline_used=true`。
- 结论：secrets 审计闭环已恢复。

---

## 8. 运行态性能与稳定性（P1）

- 未执行独立 perf baseline（冷启动/内存/CPU 仍缺失）。
- 当前仅有测试运行时信号：高频 `act` 警告提示 UI 状态时序稳定性仍需治理。

---

## 9. 文档与治理

- 文档规模继续增长（`docs` 7,353 行）。
- v9 已建立独立附件目录并完成归档。
- 建议在 `docs/README.md` 更新“最新有效评估报告”为 v9（当前结论为限范围发布）。

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 测试门禁失败（7 fail） | 高 | 高 | `attachments/test-summary.json` | 已关闭 | 持续监控回归并压缩慢测 | 前端 | 已完成 |
| 覆盖率证据缺失 | 高 | 高 | `attachments/coverage-summary.json` | 已关闭 | 持续补关键链路覆盖率 | 前端 | 已完成 |
| secrets 扫描不可用 | 高 | 中 | `attachments/secrets-summary.json` | 已关闭 | 固化 gitleaks + baseline 流程 | 平台/工程效能 | 已完成 |
| 许可证例外待确认 | 中 | 中 | `attachments/licenses-summary.json` | 打开 | 完成 LGPL/Custom 例外审批或替代方案 | 法务/工程 | 1周 |
| 超大文件持续扩张 | 中 | 中 | `attachments/loc-metrics.json` | 打开 | 对 >700 行 Top 文件做分层拆分 | 全栈 | 2周 |

### 10.2 改进建议（P0/P1/P2）
- **P0（立即）**：无新增阻断项；保持门禁脚本与证据归档不回退。
- **P1（近期）**：为窗口权限请求补 `setPermissionRequestHandler`，并增加 CSP 策略校验。
- **P1（近期）**：治理 `App.test.tsx` 的 `act(...)` 警告并缩短慢测链路。
- **P2（中期）**：持续拆分超大文件（目标 `<700` 行）并恢复 `madge/jscpd/ts-prune` 趋势治理。

---

## 11. 对比上版变化（v8 -> v9）

| 项 | v8 | v9 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `c2dc154` | `8e4c3bf`（非洁净工作区） | v9 在进行中改动上评估，风险暴露更真实 |
| 核心业务代码规模 | 62,493 | 67,947 | 规模上升，`app` 模块继续膨胀 |
| `npm run test` | ✅（291 pass） | ✅（350 pass） | 通过且测试规模提升 |
| `npm run test:coverage` | ✅ | ✅ | 覆盖率门禁通过并恢复可审计 |
| `test.json` | ❌ 未生成 | ✅ 已生成（success=true） | 测试证据链完整 |
| 前端主 chunk | 638 kB | 767.71 kB | 体积回升并触发 >700k 告警 |
| secrets 扫描 | ✅（0 findings） | ✅（0 findings，baseline 启用） | 安全审计能力恢复并留存例外依据 |
| 综合评级 | B+ | B | P0 闭环完成，但体积/合规/性能基线仍拖累上限 |

---

## 12. 附录：原始产物索引

- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/git.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/env.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/lint.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/test.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/test.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/test-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/test-failures.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/test-coverage.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/coverage-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/build.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/build-electron.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/audit.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/audit-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/outdated.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/outdated-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/licenses.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/licenses-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/sbom.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/sbom-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/secrets.txt`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/secrets.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/secrets-summary.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/secrets-baseline.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/loc-metrics.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/ipc-metrics.json`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/tools/gitleaks.exe`
- `docs/project-evaluation-v9-2026-02-15-8e4c3bf/attachments/tools/gitleaks-release.json`
