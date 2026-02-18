# <项目名> 项目评估报告（vX）

> 评估日期：YYYY-MM-DD  
> 项目类型：Electron + React  
> 评估人：<姓名/团队>  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪/运行态性能  
> 评估基线：仓库 <路径或URL>，版本 <semver>，commit <SHA>  
> 评估环境：OS <Windows/macOS/Linux>；Node <vX>；npm/pnpm/yarn <vX>；Electron <vX>；CPU/RAM <可选>  
> 产物目录：reports/YYYY-MM-DD_<commit>/（所有日志与JSON统一归档）

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：<小/中/大/大型>（以 LOC /模块数为证据）
- **功能复杂度结论**：<低/中/高>（以 IPC/schema/DB 表/关键链路为证据）
- **总体质量结论**：A / B / C / D（给出依据）
- **发布建议**：✅可发布 / ⚠️限范围发布 / ❌不可发布
- **阻断项（P0）**：
  1) ...
  2) ...
- **主要风险（Top 3）**：
  - 风险1：...（严重度/概率/证据/建议）
  - 风险2：...
  - 风险3：...

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：<src + electron 等>；排除：测试/声明/生成文件/第三方
- 测试范围：unit/component/integration/e2e 的定义与包含目录
- 度量工具：cloc/tokei/自研脚本（版本）
- 覆盖率口径：是否排除 mock、index、类型声明等

### 1.2 验证命令与产物（本次实际执行）
> 建议将所有输出保存到 `reports/YYYY-MM-DD_<commit>/`

| 类别 | 步骤 | 命令（示例） | 产物（建议） | 阈值/判定 |
|---|---|---|---|---|
| 版本基线 | git 信息 | `git rev-parse HEAD` `git status --porcelain` `git describe --tags --always` | `git.txt` | 必须记录 |
| 代码规范 | ESLint | `npm run lint` | `lint.txt` / `lint.json` | 0 error（或按策略） |
| 格式化(P0) | Prettier check | `prettier --check .` | `prettier.txt` | 必须通过（或明确策略） |
| 类型(P0) | TypeScript typecheck | `tsc --noEmit` 或 `npm run typecheck` | `typecheck.txt` | 必须通过 |
| 测试 | Vitest | `npm run test` | `test.txt` | 必须通过 |
| 测试报告 | Vitest JSON(P0) | `vitest --reporter=json --outputFile=...` | `test.json` | 必须生成 |
| 覆盖率 | Vitest coverage | `npm run test:coverage` | `coverage/` + `coverage-summary.json` | lines/branches >= 阈值 |
| 覆盖率JSON(P0) | coverage JSON | `--coverage.reporter=json-summary` | `coverage-summary.json` | 必须生成 |
| 构建(前端) | Vite build | `npm run build` | `build.txt` + `dist/` | 必须通过 |
| 体积(P1) | bundle分析 | `vite-bundle-visualizer` 等 | `bundle-stats.json` / `bundle.html` | 预算与Top依赖 |
| 构建(Electron) | main/preload/worker | `npm run build:electron` | `build-electron.txt` + `electron-dist/` | 必须通过 |
| 打包发布(P0*) | installer/asar | `npm run package`（electron-builder/forge） | `artifacts/` + `package.txt` | 必须通过（如要发布） |
| 签名公证(P0*) | mac签名/公证 | `codesign`/`notarytool` | `signing.txt` | 发布必需（如适用） |
| 安全(依赖) | npm audit | `npm audit --json` | `audit.json` | high/critical=0（或处置清单） |
| 依赖债务 | outdated | `npm outdated --json` | `outdated.json` | major<=N 或有计划 |
| License(P0*) | 许可证扫描 | `license-checker --json` 或工具链 | `licenses.json` | 禁止清单/例外记录 |
| SBOM(P0*) | CycloneDX | `cyclonedx-npm --output-format json` | `sbom.json` | 发布必需（如适用） |
| Secrets(P0) | gitleaks | `gitleaks detect --report-format json` | `secrets.json` | 必须为0（或解释例外） |
| Electron安全(P1) | 安全清单检查 | 自检脚本/人工核对 | `electron-security.md` | 必须结论化 |
| IPC/契约 | IPC&schema指标 | 自研脚本 | `ipc-metrics.json` | 趋势化/阈值化 |
| 结构健康(P1) | 循环依赖 | `madge --circular` | `circular.txt` | 0 或列出与计划 |
| 重复代码(P2) | jscpd | `jscpd --reporters json` | `duplication.json` | 预算/趋势 |
| 死代码(P2) | ts-prune | `ts-prune` | `deadcode.txt` | 列出清理计划 |
| E2E(P1*) | Playwright/Electron | `npm run e2e` | `e2e-report/` | 发布前建议通过 |
| 运行态(P1*) | perf baseline | 自定义脚本 | `perf.json` | 启动/内存/CPU 基线 |

> 注：带 * 的项目在“要出具发布就绪结论”时强烈建议纳入；若仅做“工程健康度评估”，可降级为 P1。

---

## 2. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 关键数字 | 证据（产物路径） |
|---|---|---:|---|
| lint | ✅/❌ | errors / warnings | reports/.../lint.txt |
| prettier(P0) | ✅/❌ | 违规文件数 | reports/.../prettier.txt |
| typecheck(P0) | ✅/❌ | TS errors | reports/.../typecheck.txt |
| test | ✅/❌ | suites/tests/failed | reports/.../test.txt |
| test-json(P0) | ✅/❌ | 是否生成 | reports/.../test.json |
| coverage | ✅/❌ | lines/branches/... | reports/.../coverage-summary.json |
| build | ✅/❌ | warnings、耗时 | reports/.../build.txt |
| bundle(P1) | ✅/⚠️ | top chunk、总资源 | reports/.../bundle.* |
| build:electron | ✅/❌ | 产物与警告 | reports/.../build-electron.txt |
| package(P0*) | ✅/❌ | 安装包大小 | reports/.../package.txt |
| audit | ✅/❌ | high/critical | reports/.../audit.json |
| outdated | ✅/⚠️ | major/minor/patch | reports/.../outdated.json |
| licenses(P0*) | ✅/❌ | 风险许可证数 | reports/.../licenses.json |
| sbom(P0*) | ✅/❌ | 是否生成 | reports/.../sbom.json |
| secrets(P0) | ✅/❌ | 发现数 | reports/.../secrets.json |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：<文件数/行数>
- Electron 后端：<文件数/行数>
- 核心业务合计：<行数>
- 测试代码：<行数>；测试/业务比：<%>
- 样式/脚本/文档：<各自行数>

### 3.2 功能模块规模（建议按 features 分）
- 模块 Top（文件数、行数）
- 增长最快模块（与上版对比）

### 3.3 超大文件 Top（不含测试）
- > 700 行 或 > 1000 行的文件清单与拆分建议

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 编排层边界是否清晰
- shared 层复用是否合理，是否出现跨层依赖

### 4.2 结构健康度指标（P1）
- 循环依赖：数量与具体环路（madge）
- 复杂度：圈复杂度 Top N（eslint complexity 或工具）
- 重复代码：重复率与主要重复片段（jscpd）
- 死代码/未使用导出：列表与清理计划（ts-prune）

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果与失败归因
- 总 suites/tests；失败数；失败集中模块
- 根因分类：断言契约漂移/异步时序/mock污染/环境依赖等
- 慢测 Top N（> X ms）

### 5.2 覆盖率（必须给出数字）
- 总览：lines/branches/functions/statements
- 覆盖率最低 Top N 文件
- 关键链路覆盖率清单（建议固定）：
  - IPC handler 层
  - preload 暴露 API（桥接层）
  - 数据序列化/Schema 校验层
  - DB/Repository
  - 权限/外链/文件 I/O

### 5.3 E2E / 集成测试（P1）
- Electron 启动 smoke：能启动、渲染、打开主页面
- 关键业务链路：<最短可用路径>（导入/播放/管理/可视化等）
- IPC 交互验证：关键通道是否可用、异常是否可控

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- 构建是否通过
- chunk 预警与体积预算：
  - 单 chunk 上限：<例如 500~700k>
  - 总 JS/CSS/资源预算：<例如 X MB>
- bundle 组成分析（P1）：
  - Top 依赖体积贡献
  - 可分包点（dynamic import/manualChunks）

### 6.2 Electron 构建与发布产物（P0*）
- main/preload/worker 是否分别产出
- installer/asar 体积
- 跨平台验证（如适用）：Win/macOS/Linux
- 签名/公证（如适用）：策略与证据日志
- 自动更新（如适用）：更新源与签名链路说明

---

## 7. 安全与合规评估

### 7.1 依赖安全（npm audit + 可选 OSV）
- 漏洞统计：按严重级别
- 处置策略：升级/替换/打补丁/接受风险（必须有理由与期限）

### 7.2 Electron 安全清单（P1，建议表格化）
| 项 | 当前值 | 风险 | 证据 | 结论 |
|---|---|---|---|---|
| contextIsolation | true/false | ... | main.ts | ✅/❌ |
| nodeIntegration | ... | ... | ... | ... |
| sandbox | ... | ... | ... | ... |
| webSecurity | ... | ... | ... | ... |
| permissionRequestHandler | 有/无 | ... | ... | ... |
| CSP | 有/无 | ... | ... | ... |
| 外链打开策略 | 白名单/任意 | ... | ... | ... |

### 7.3 IPC 与契约安全（P0/P1）
- IPC 通道数量、handler 数量
- 入参校验覆盖率：多少 handler 使用 schema 校验？多少没有？
- 高风险通道：涉及文件系统、shell、外链、执行命令等（列清单与约束）
- preload 暴露 API 面：`contextBridge.exposeInMainWorld` 列表与权限最小化说明

### 7.4 License / SBOM（P0*）
- 风险许可证（GPL/AGPL 等）扫描结果
- SBOM 生成与归档（供发布审计/供应链治理）
- 例外批准记录（如有）

### 7.5 Secret 扫描（P0）
- 是否发现 token/私钥/证书等
- 修复方式：历史清理策略（如必要）

---

## 8. 运行态性能与稳定性（P1）

> Electron 项目建议至少给出 3 个“可复现”的基线指标

- 冷启动时间：从启动到首屏可交互（方法：日志点/自动化）
- 内存占用：启动后 N 分钟 / 播放后 / 可视化开启后
- CPU 峰值：播放/可视化/扫描库/导入时
- 崩溃与日志策略：是否有 crash reporter；日志是否脱敏；日志路径与采集方式

---

## 9. 文档与治理

- README：安装/开发/调试/构建/发布是否齐全
- 架构文档/ADR：是否存在并可用
- 版本策略：tag/changelog/回滚策略
- 文档版本治理：明确“最新有效版本”，避免误引用

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵
| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|

### 10.2 改进建议（P0/P1/P2）
- **P0（立即）**：阻断发布/阻断合并的修复项
- **P1（近期）**：1~2 周内提升门禁可信度与主要体验
- **P2（中期）**：结构治理、债务清理、长期优化

---

## 11. 对比上版变化（如有）
| 项 | 上版 | 本版 | 变化解读 |
|---|---|---|---|

---

## 12. 附录：原始产物索引
- git：reports/.../git.txt
- lint：reports/.../lint.txt / lint.json
- prettier：reports/.../prettier.txt
- typecheck：reports/.../typecheck.txt
- test：reports/.../test.txt
- test-json：reports/.../test.json
- coverage：reports/.../coverage-summary.json
- build：reports/.../build.txt
- bundle：reports/.../bundle.*
- build-electron：reports/.../build-electron.txt
- audit：reports/.../audit.json
- outdated：reports/.../outdated.json
- licenses：reports/.../licenses.json
- sbom：reports/.../sbom.json
- secrets：reports/.../secrets.json
- ipc metrics：reports/.../ipc-metrics.json
- e2e：reports/.../e2e-report/
- perf：reports/.../perf.json
