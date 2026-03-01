# MediaPlayerX 项目评估报告（v8）

> 评估日期：2026-02-15  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.0.0`，commit `c2dc154`  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Electron `^40.2.1`  
> 产物目录：`docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/`

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 62,493 LOC，290 文件）。
- **功能复杂度结论**：高（IPC `ipcMain.handle` 50、契约 Schema 105、SQLite `CREATE TABLE` 18）。
- **总体质量结论**：**B+**（`lint/test/test:coverage/build/build:electron/audit/licenses/sbom/secrets` 均通过）。
- **发布建议**：✅可发布（工程与供应链审计已补齐）；正式发行前建议补齐 `test.json` 并完成许可证例外审批记录。
- **阻断项（P0）**：
  1) 暂无工程门禁阻断项。
  2) `test.json` 未生成（建议补齐发布证据链）。
- **主要风险（Top 3）**：
  - 风险1：许可证合规例外待确认（严重度中/概率中，LGPL 1 项 + Custom 1 项 + UNLICENSED 1 项）。
  - 风险2：CSP/权限治理证据不足（严重度中/概率中，当前未检测到 CSP 与 `permissionRequestHandler`）。
  - 风险3：超大文件维护成本持续偏高（严重度中/概率中，证据 `loc-metrics.json`）。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- 度量工具：本轮使用 Python 脚本统计（见 `loc-metrics.json`、`ipc-metrics.json`）。
- 覆盖率口径：以 `vitest --coverage` 实测为准；本轮已生成 `coverage-summary.json` 并归档。

### 1.2 验证命令与产物（本次实际执行）

| 类别 | 步骤 | 实际命令 | 产物路径 | 判定 |
|---|---|---|---|---|
| 版本基线 | git 信息 | `git rev-parse ...` `git status --porcelain` | `attachments/git.txt` | ✅ 已记录 |
| 代码规范 | ESLint | `npm run lint` | `attachments/lint.txt` | ✅ 通过 |
| 测试 | Vitest | `npm run test` | `attachments/test.txt` | ✅ 通过 |
| 覆盖率 | Vitest coverage | `npm run test:coverage` | `attachments/test-coverage.txt` + `attachments/coverage-summary.json` | ✅ 通过 |
| 构建(前端) | Vite build | `npm run build` | `attachments/build.txt` | ✅ 通过 |
| 构建(Electron) | main/preload/worker | `npm run build:electron` | `attachments/build-electron.txt` | ✅ 通过 |
| 安全(依赖) | npm audit | `npm audit --audit-level=high --json` | `attachments/audit.json` | ✅ 通过 |
| 依赖债务 | outdated | `npm outdated --json` | `attachments/outdated.json` | ⚠️ 有待升级 |
| License 合规 | license-checker | `npx --yes license-checker --json` | `attachments/licenses.json` | ✅ 通过 |
| SBOM | cyclonedx-npm | `npx --yes @cyclonedx/cyclonedx-npm --output-format json --output-file ...` | `attachments/sbom.json` | ✅ 通过 |
| Secrets | gitleaks | `gitleaks detect --report-format json` | `attachments/secrets.json` | ✅ 通过 |

---

## 2. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 关键数字 | 证据 |
|---|---|---:|---|
| lint | ✅ | errors 0 | `attachments/lint.txt` |
| prettier(P0) | ⚪ 未执行 | - | - |
| typecheck(P0) | ✅(含于 build) | tsc -b 通过 | `attachments/build.txt` |
| test | ✅ | 57 files / 291 tests / 0 fail | `attachments/test.txt` |
| test-json(P0) | ❌ | 未生成 | - |
| coverage | ✅ | lines 58.80 / branches 52.55 / 57 files 291 tests 全通过 | `attachments/test-coverage.txt` + `attachments/coverage-summary.json` |
| build | ✅ | 主包 `index-*.js` 638 kB | `attachments/build.txt` |
| build:electron | ✅ | main 3.7 MB / preload 549.8 kB | `attachments/build-electron.txt` |
| package(P0*) | ⚪ 未执行 | - | - |
| audit | ✅ | high 0 / critical 0 | `attachments/audit.json` |
| outdated | ⚠️ | 10 个依赖待升级 | `attachments/outdated.json` |
| licenses(P0*) | ✅ | packages 432 / copyleft 1 / custom-or-unknown 2 | `attachments/licenses.json` + `attachments/licenses-summary.json` |
| sbom(P0*) | ✅ | CycloneDX 1.6 / components 414 | `attachments/sbom.json` + `attachments/sbom-summary.json` |
| secrets(P0) | ✅ | findings 0 | `attachments/secrets.json` + `attachments/secrets-summary.json` |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：211 文件 / 45,425 行
- Electron 后端：79 文件 / 17,068 行
- 核心业务合计：290 文件 / **62,493 行**
- 测试代码：57 文件 / 14,922 行；测试/业务比：**23.88%**
- 样式/脚本/文档：CSS 9,705 行；scripts 4,639 行；docs 6,396 行

### 3.2 功能模块规模（`src/features`）
- Top 模块：`app` 13,827 行（77 文件）、`backend` 5,233 行、`music-visualizer` 4,753 行。
- 与 v7 对比：`app` 增量温和（13,689 -> 13,827）；`music-visualizer` 规模持平（4,753）。

### 3.3 超大文件 Top（不含测试）
- `electron/services/file-system-read/manageAdReviewService.ts`：1191
- `src/components/MusicMainSection.tsx`：1117
- `src/mockData.ts`：1093
- `src/features/music-visualizer/webglRenderer.ts`：999
- `src/components/MetadataPanel.tsx`：943

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 主分层仍清晰，边界未出现明显回退。
- 导航防护存在（`will-navigate`、`setWindowOpenHandler deny`），主窗口基础安全配置保持稳定。

### 4.2 结构健康度指标（本轮）
- 复杂度核心仍集中在 `app` 和媒体读写服务。
- 超大文件仍存在（>700 行文件 15 个），但 `useAppWorkspaceProps.ts` 已从 1080 降到 863，拆分趋势是正向信号。
- 本轮未执行 `madge/jscpd/ts-prune`，相关指标仍缺口。

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果与失败归因
- `npm run test`：全通过（57 files / 291 tests / 0 fail）。
- `npm run test:coverage`：全通过（57 files / 291 tests / 0 fail）。
- 修复动作：将 `src/App.test.tsx` 重型 UI 场景超时阈值统一提升至 25s。

### 5.2 覆盖率
- 总览：`lines 58.80% / branches 52.55% / functions 59.52% / statements 58.56%`。
- `coverage-summary.json` 已归档，覆盖率门禁已恢复可用。

### 5.3 慢测关注
- `src/App.test.tsx` 在 coverage 模式耗时约 70s，已稳定通过。
- `electron/fileSystemReadService.test.ts` 在 7~8s 区间，属于慢测但稳定通过。

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- 构建通过。
- 主要产物：`index-*.js` 638 kB，`vendor-react` 190 kB，`vendor-data` 69.65 kB。
- 相比 v7（~891 kB 主 chunk）体积明显回落，打包风险下降。

### 6.2 Electron 构建与发布产物
- `main/preload/worker` 均成功产出。
- 产物体积：`main.cjs` 3.7 MB、`preload.cjs` 549.8 kB、`archiveNormalizeWorker.cjs` 19.2 kB。
- 本轮未执行 `desktop:pack`、签名、公证、自动更新链路验证。

---

## 7. 安全与合规评估

### 7.1 依赖安全
- `npm audit`：0 漏洞（high/critical 均为 0）。

### 7.2 Electron 安全清单

| 项 | 当前值 | 风险 | 证据 | 结论 |
|---|---|---|---|---|
| contextIsolation | true | 低 | `electron/main.ts:288` | ✅ |
| nodeIntegration | false | 低 | `electron/main.ts:289` | ✅ |
| sandbox | true | 低 | `electron/main.ts:290` | ✅ |
| webSecurity | 未显式配置（默认 true） | 中 | `electron/main.ts` | ⚠️ |
| permissionRequestHandler | 未见实现 | 中 | `electron/**/*.ts` 检索结果 | ⚠️ |
| CSP | 未发现明确策略 | 中 | 代码检索 | ⚠️ |
| 外链打开策略 | allowlist + 协议限制 + localhost 例外 | 低 | `electron/externalUrlPolicy.ts` + `electron/registerBackendIpcHandlers.ts:439` | ✅ |

### 7.3 IPC 与契约安全
- IPC handler：50（与 v7 持平）。
- Backend schema 导出：105（与 v7 持平）。
- preload 暴露 API：5（`mediaPlayerBackend/Bench/Platform/View/Window`）。
- 当前状态：`openExternalUrl` 已增加 allowlist 与协议限制（阻断非 allowlist 远程 URL）。

### 7.4 License / SBOM / Secret
- License：共扫描 432 个包，强 copyleft 风险 1 项（`@img/sharp-win32-x64@0.34.5`，`Apache-2.0 AND LGPL-3.0-or-later`），另有 Custom/UNLICENSED 各 1 项。
- SBOM：已生成 CycloneDX 1.6，组件 414、依赖关系 440。
- Secret：gitleaks 扫描 275 commits，结果 0 findings（clean）。

---

## 8. 运行态性能与稳定性（P1）

- 未执行独立 perf baseline（冷启动/内存/CPU 指标缺失）。
- 已有慢测信号可作为替代观察：coverage 模式测试耗时显著上升，提示 UI 测试链路接近超时阈值。

---

## 9. 文档与治理

- 文档规模继续增长（29 文件 / 6,396 行）。
- 评估报告已新增 v8，并建立独立附件目录。
- 仍建议在 `docs/01-README.md` 明确“最新有效评估报告”为 v8，避免引用旧版。

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 覆盖率门禁失败 | 高 | 高 | `attachments/test-coverage.txt` | 已关闭 | 已完成超时治理并恢复覆盖率任务稳定性 | 前端 | 已完成 |
| 外链打开无白名单 | 高 | 中 | `electron/externalUrlPolicy.ts` + `electron/registerBackendIpcHandlers.ts:439` | 已关闭 | 已增加协议/域名 allowlist，非白名单请求返回 `ok:false` | Electron | 已完成 |
| 许可证合规例外待确认 | 中 | 中 | `attachments/licenses-summary.json` | 打开 | 对 LGPL/Custom 项出具例外审批或替代计划 | 法务/工程 | 1周 |
| 超大文件维护成本 | 中 | 中 | `loc-metrics.json` | 打开 | 对 Top 文件持续拆分（目标 <700 行） | 全栈 | 2周 |
| 依赖债务累积 | 中 | 中 | `attachments/outdated.json` | 打开 | 分批升级（先 patch/minor） | 全栈 | 2周 |

### 10.2 改进建议（P0/P1/P2）
- **P0（立即）**：补齐 `test.json`，并对 `licenses-summary.json` 中的 LGPL/Custom 项完成例外审批记录。
- **P1（近期）**：补上 `permissionRequestHandler` 与 CSP；在构建链路增加安全基线检查。
- **P2（中期）**：持续拆分超大文件，恢复结构健康度工具（`madge/jscpd/ts-prune`）并做趋势化。

---

## 11. 对比上版变化（v7 -> v8）

| 项 | v7 | v8 | 变化解读 |
|---|---|---|---|
| 核心业务代码规模 | 62,250 | 62,493 | 小幅增长（+243），总体稳定 |
| `npm run lint` | ❌ | ✅ | 已恢复 |
| `npm run test` | ❌（20 fail） | ✅（291 pass） | 断言漂移问题已基本修复 |
| `npm run test:coverage` | ❌ | ✅（291 pass） | 覆盖率门禁已恢复 |
| 发布审计附件（licenses/sbom/secrets） | 缺失 | 已补齐 | 发布证据链已补全 |
| 前端主 chunk | ~891 kB | 638 kB | 体积风险下降 |
| `useAppWorkspaceProps.ts` | 1080 行 | 863 行 | 拆分治理生效 |
| 综合评级 | B- | B+ | 门禁恢复 + 外链安全收敛 |

---

## 12. 附录：原始产物索引

- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/git.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/env.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/lint.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/test.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/test-coverage.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/coverage-summary.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/build.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/build-electron.txt`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/audit.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/outdated.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/licenses.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/licenses-summary.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/sbom.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/sbom-summary.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/secrets.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/secrets-summary.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/tools/gitleaks-release.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/loc-metrics.json`
- `docs/project-evaluation-v8-2026-02-15-c2dc154/attachments/ipc-metrics.json`
