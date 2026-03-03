我看了你现在的《MediaPlayerX 项目评估报告（v18）》和《全仓重复治理 PR 拆分清单 v1》。 
你提到的“长期迭代导致的**逻辑重复**（看起来不像复制粘贴，但做的是同一件事 / 同一规则多实现）”，确实是 jscpd 这种“文本/Token 级别重复率”很容易漏掉的盲区。

下面我给一个**可以直接落到评估报告要求里**的方案：把“逻辑重复”拆成“可自动化的结构相似检测 + 可治理的规则漂移闭环”，并给出你可以直接复制到报告模板里的条目与命令。

---

## 1) 为什么 jscpd 对“逻辑重复”不敏感

你 v18 报告里已经有 `npx jscpd src electron`，并输出重复率（3.51%）作为指标。
jscpd的定位是“复制粘贴检测”，主要对 **Type-1/Type-2** 这类“足够相像的片段”更有效；而很多逻辑重复是：

* 同一算法/规则被复刻了一份，但变量名/常量/条件顺序/小分支有差异；
* 或者跨层（renderer/electron）实现了两份，迭代后逐渐漂移；
* 或者被拆成多个小 helper，单块都达不到 jscpd 的 minTokens/minLines 门槛。

另外，jscpd 的 `strict/mild/weak` 模式主要影响是否跳过换行/空白/注释等 token（偏“检测质量/噪声控制”），但它并不专门为“忽略标识符/字面量差异的结构相似”而生。([npm][1])

所以，“代码重复率（jscpd）”你保留就好，但需要**新增一个维度**专门盯“结构/逻辑重复”。

---

## 2) 把“逻辑重复”加入评估：新增一项“结构相似度（AST）检测 + 规则漂移闭环”

### 2.1 新增自动化检测：用 AST 结构相似扫“逻辑重复”

我建议在现有评估里增加一条：**AST 结构相似检测（Structural clone / Logic clone）**。
一个很实用的工具是 **jsinspect-plus**（jsinspect 的 TS/TSX 兼容分支）：它不是按 token，而是按 AST 节点结构找相似片段，并且可以配置为**不要求标识符/字面量一致**，这正好对“逻辑重复”更敏感。([GitHub][2])

关键点：

* `-I / --no-identifiers`：不匹配标识符（变量/属性/方法名）
* `-L / --no-literals`：不匹配字面量（字符串/数字等）
* `-t / --threshold`：阈值（节点数），越大越“只抓大块逻辑”，噪声越低
* `--ignore`：排除 test/mock 等高噪声目录
  这些参数在 README 里写得很清楚。([GitHub][2])

**建议命令（先从低噪声开始）**：

```bash
# 先只扫 src/electron，排除测试与产物目录，避免被样板代码淹没
npx jsinspect -I -L -t 50 --reporter json \
  --ignore "node_modules|dist|build|coverage|__tests__|__mocks__|\\.test\\.|\\.spec\\." \
  src electron
```

> 为什么 t=50 起步：大仓库一上来 t=20/30 会爆量；从“只抓明显的大逻辑重复”开始更容易落地治理，然后再逐步下调阈值。README 也建议初次使用可以先用更高阈值，再逐步调低。([GitHub][2])

**把它写进评估的“验证命令与结果”表格**（和 lint/test/madge/jscpd 同级），就能保证每次评估都跑一遍，持续发现。

---

### 2.2 在评估报告里怎么呈现结果，才“可持续治理”而不是“堆报告”

逻辑重复不是“一次性清零”的事，最关键是让它变成**可追踪、可闭环**的指标，而不是每次扫出一堆你也不知道怎么处理的输出。

我建议在评估报告里新增一段固定结构：

1. **本次结构相似匹配数 / cluster 数**
2. **新增 cluster 数（相对上次评估）** —— 这是最重要的“回归指标”
3. Top N（比如 Top 10）重复簇（按 instances 数排序）
4. 每个 Top cluster 必须归档到治理清单：

   * “接受（合理重复）/ 待治理（进入 PR 拆分）/ 必须消除（P1）”
5. **闭环SLA**（比如：核心链路的逻辑重复 2 个评估周期内必须进入 PR）

这样，你的评估就不仅“发现问题”，而是强制把问题流入治理清单（你已经有 PR 拆分清单，很适合接住）。

---

### 2.3 新增“规则漂移”专项：跨层/跨模块同一规则多实现时，必须有“对齐机制”

你提到的痛点之一其实是：

> 逻辑重复最大的风险不是“多几行代码”，而是**同一规则两份实现逐渐漂移**， clone detector 不够，建议在评估里加一个更“工程化”的项：**规则一致性/漂移检查**。

做法很简单（但非常有效）：

* 对“必须一致”的规则（典型：renderer/electron 两侧、或多 mode 共用的规则）建立 **rule list（规则清单）**；
* 每条规则都必须满足二选一：

  1. **单一实现（共享模块）**：强制所有调用方 import 同一个函数；
  2. **双实现但有对齐测试（parity tests）**：同一组 test vectors 同时跑两份实现，断言输出一致。

你现在的拆分清单里已经在做类似的事（例如字幕 Cue 规则统一、Sidebar 三模式一致性、parseSidebarNodeId/pathKeyHasPrefix 等收敛）。
把这类“规则级重复”在评估报告里单独列为**规则漂移风险**，会比只看重复率更贴近你担心的长期稳定性。

---

## 3) 你可以直接复制到评估报告里的“新增条目模板”

下面是一段你可以直接粘到 v18 模在 4.2 后面）的内容。

### 3.1 在「1.2 验证命令与结果」新增一行

（示例）

| 类别         | 实际命令                                                                            | 结果     | 关键信息                                         |
| ---------- | ------------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| 结构相似（逻辑重复） | `npx jsinspect -I -L -t 50 --reporter json --ignore "...regex..." src electron` | ⚠️/✅/❌ | matches: X，clusters: Y；新增 clusters: Z；Top3：… |

> jsinspect 的 `-I/-L/-t/--ignore` 行为与配置项见其 README。([GitHub][2])

### 3.2 在「2. 质量门禁验证结果」新增一项（建议先做 P2/P1）

建议先不要做 “P0 阻断发布”，而是：

* **P2（治理门禁）**：允许存在历史问题，但**不允许新增**
* **P1（风险门禁）**：如果新增 cluster 命中核心链路/跨层规则，升级为 P1

（示例）

| 检查项                         | 结果 |                 关键数字 | 证据                    |
| --------------------------- | -- | -------------------: | --------------------- |
| logic-duplication-delta（P2） | ⚠️ | 新增 cluster = 0（或 ≤N） | jsinspect json report |

### 3.3 新增一个固定章节：逻辑重复与规则漂移

建议结构（你可以直接用）：

* **本次结构相似扫描结论**：clusters / matches / Top N
* **相对上次变化**：新增 clusters / 关闭 clusters
* **判定口径**：

  * 合理重复（DTO/样板）→ 标记排除（ignore 或接受清单）
  * 风险重复（业务规则、状态派生、跨层协议）→ 必须入治理清单
* **治理动作**：对 Top K cluster 生成 PR 计划，落到《拆分清单》某个 PR 或新增 PR 条目。

---

## 4) 除了“逻辑重复”，评估报告还建议再加哪些项目，能更稳、更易维护

你现在的评估项已经覆盖了“能把项目卡死”的大头：lint/typecheck/test/coverage/build/audit/madge/jscpd/ts-prune/LOC
下面这些是我建议补强的“长期稳定性维度”，按**投入产出比**排序（越靠前越建议先上）。

---

### 4.1 复杂度门禁：从“行数”升级到“可理解性”

你报告里已经跟踪了 >1500 行大文件数量，但实际维护成本往往更受 **复杂度**影响（分支、嵌套、早退

1. **圈复杂度（Cyclomatic Complexity）**：ESLint 自带 `complexity` 规则。([eslint.org][3])
2. **认知复杂度（Cognitive Complexity）**：可用 `eslint-plugin-sonarjs` 的 `cognitive-complexity`。([GitHub][4])

评估报告里可以输出：

* Top 10 复杂度最高函数/文件（尤其是 Hook、IPC handler、状态派生）
* 超阈值数量（例如 cognitive complexity > 20 的函数数）

这能比“文件>1500行”更早暴露“要拆了”的点。

---

### 4.2 热点（Hotspot）分析：把“复杂 + 频繁改”作为风险第一优先级

很多线上问题不是出在最复杂的文件，而是出在“**复杂 + 经常改**”的文件。

建议在评估里加一条 Git 维度的统计：

* 最近 30/60/90 天变更次数 Top N 文件
* 与复杂度/文件体积叠加成“热点列表”

治理时优先处理热点，比平均铺开更有效。

（这个可以先用简单脚本 `git log --name-only` 做粗版，不一定要上复杂工具。）

---

### 4.3 类型债指标：`any`、`ts-ignore`、`eslint-disable` 的数量趋势

你拆分清单里已经把 “any 压降”当作一个高风险 PR 来做（PR-06）。
建议把它变成评估报告的常驻指标（趋势比绝对值更重要）：

* `any` 出现次数（可用 `tsc`/ESLint 规则或简单 grep）
* `// @ts-ignore`、`// eslint-disable` 数量
* `eslint-disable @typescript-eslint/no-explicit-any` 这类“文件级豁免”数量

门禁策略同样建议“**不允许新增**”优先（delta gate），比一次性清零更现实。

---

### 4.4 测试稳定性：把“复跑 3 次”写成硬指标

你 v18 报告里已经建议“修复后做 3 次连续复跑留档”。定项：

* **flaky index**：同一 commit 连跑 3 次，是否 100% 通过
* 若出现非确定性失败：直接列为 P0（因为它会随机阻断发布）

这能显著提升长期开发的“节奏稳定性”。

---

### 4.5 依赖健康度：从 audit 扩展到 outdated / 许可证

你现在有 `npm audit` 且是 0 vulnerabilities。
再补两项会更完整：

* `npm outdated`（分 major/minor/patch）→ 依赖“新鲜度”趋势
* license scan期合规踩雷）

---

### 4.6 架构边界门禁：从 “无环” 升级到 “分层不可越界”

你已经用 `madge` 控制循环依赖。
下一步建议加“边界规则”：

* UI 不得直接依赖某些 backend 实现目录
* features 不得跨 domain 互相 import（只能通过 contracts/shared）
* electron services码等

实现方式可以是 ESLint 的 `no-restricted-imports` / 自定义 rule，或 dependency-cruiser 一类工具（这类属于“架构健身函数”，长期收益很大）。

---

## 5) 一句话总结落地路径

* **保留 jscpd**：继续管“复制粘贴重复”。pect-plus**：每次评估跑一遍 `-I -L` 的 AST 结构相似，专门抓“逻辑重复”。([GitHub][2])
* **报告里只盯 delta（新增）+ Top N**：并强制把 Top cluster 流入你的 PR 拆分治理清单，形成闭环。
* 同时补上 **复杂度 + 热点 + 类型债 + flaky** 这四个长期稳定性指标（投入低、收益高）。([eslint.org][3])

如果你愿意，我也可以按你 v18 的格式新增表格行、章节、阈值、命令清单一次性补齐），你复制过去就能用。



[1]: https://www.npmjs.com/jscpd?utm_source=chatgpt.com "jscpd - npm"
[2]: https://github.com/crstnn/jsinspect-plus "GitHub - crstnn/jsinspect-plus: Detect copy-pasted and structurally similar code. Supports ES2020 standard (and most proposed features), TS and TSX files. Using Babel 8's parser."
[3]: https://eslint.org/docs/latest/rules/complexity?utm_source=chatgpt.com "complexity - ESLint - Pluggable JavaScript Linter"
[4]: https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/cognitive-complexity.md?utm_source=chatgpt.com "eslint-plugin-sonarjs/docs/rules/cognitive-complexity.md at master ..."
