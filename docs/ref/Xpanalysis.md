下面给你一个**可落地**、且与业界/社区常用做法一致的“次数 + 时长/页数完成度 + tags”用户喜好分析与推荐实现方案。整体思路是：把你的行为数据当作**隐式反馈（implicit feedback）**来建模——先把“是否真实观看”和“粘度强度”算出来，再把粘度映射到**用户-内容偏好**（tag画像 & 协同过滤embedding），最后做**召回→排序→多样化/探索**的推荐链路。隐式反馈里“偏好 + 置信度”拆分是经典范式。([Samuel Deng][1])

---

## 1) 数据形态与统一口径

你当前输入可以抽象成两类“消费事件”（event）：

### 漫画（按本/卷）

* user_id, comic_id, volume_id
* session_id（建议有）
* pages_read（本次实际看了多少页）
* total_pages（该本总页数）
* event_time（建议一定要有，用于“时间衰减/近期偏好变化”）

### 动画（按集）

* user_id, anime_id, episode_id
* session_id
* watch_seconds（本次观看秒数）
* total_seconds（该集总秒数）
* event_time

### 内容 tags

* item_id（comic_volume 或 anime_episode 或更高层级的作品id）
* tags: {tag_id -> weight}（没有 weight 就默认 1）
* 建议把 tag 分层：**大类（题材/风格/受众）+ 元素（恋爱/战斗/治愈/悬疑/穿越…）+ 叙事/设定（单元剧/群像/异世界…）**，这样“扩展领域”更自然。

---

## 2) “真实观看”判定：用完成度 + 最小时长/页数阈值做去噪

你的目标是区分：

* 误触/随便点开（不算真实观看）
* 试读/试看片段（弱正反馈）
* 真正看了大半/看完（强正反馈）
* 重复回看/重读（超强偏好）

### 2.1 统一完成度（completion ratio）

对任一次 session：

* 漫画：
  [
  r = \frac{pages_read}{total_pages}
  ]
* 动画：
  [
  r = \frac{watch_seconds}{total_seconds}
  ]

并裁剪到 ([0,1])。

### 2.2 真实观看（Real）二值判定（建议）

用“双阈值”更稳：**既要达到一定完成度，也要达到最低绝对量**。

* 漫画：

  * `pages_read >= p_min` 且 `r >= r_min`
* 动画：

  * `watch_seconds >= t_min` 且 `r >= r_min`

经验起步值（后续用数据校准）：

* 漫画：`p_min = 3~5页`，`r_min = 0.08~0.12`
* 动画：`t_min = 45~90秒`，`r_min = 0.08~0.12`

> 这一步本质是**过滤噪声隐式反馈**。工业界普遍会把“短停留/短观看”当作弱信号甚至负信号处理（例如 YouTube 论文里也强调隐式信号噪声大，并对 watch time 做加权目标）。

---

## 3) 粘度强度：把“看了多少 + 看了几次 + 最近看没看”融合成一个 0~1 指数

建议分三层算：**session 粘度 → item 粘度（用户-作品）→ 用户总体偏好**。

### 3.1 session 粘度分数（Depth）

真实观看后，把完成度映射为连续强度（避免“只要过阈值就同分”）。

一个简单好用的函数：

[
depth(r) =
\begin{cases}
0, & r < r_0 \
\left(\frac{r-r_0}{1-r_0}\right)^{\gamma}, & r \ge r_0
\end{cases}
]

* `r0`：开始计入有效阅读/观看的起点（如 0.1）
* `γ`：强调“接近看完”的权重（建议 1.5~2.5）

直觉：

* 10% vs 90% 完成度差别会被放大（更符合“粘度”）

### 3.2 时间衰减（Recency Decay）

你提到“时间”，做用户画像时强烈建议引入**近期更重要**的衰减：

[
w_{time} = e^{-\Delta t / \tau}
]

* `Δt`：距现在的天数
* `τ`：半衰周期（比如 30 天或 60 天）

### 3.3 用户-作品粘度（Stickiness_ui）

对同一作品（漫画本/动画集/或作品级别聚合）把多次 session 聚合：

核心统计量：

* `cnt_real`：真实观看次数
* `avg_depth`：平均 depth（按时间衰减加权）
* `max_depth`：最大 depth（是否有看完/接近看完）
* `rewatch`：满足 `r >= 0.9` 的次数（强喜欢信号）

一个可落地的组合：

[
S_{ui} = \sigma\Big(
a\cdot \log(1+cnt_real)

* b\cdot avg_depth
* c\cdot max_depth
* d\cdot \log(1+rewatch)
  \Big)
  ]

- (\sigma) 是 sigmoid，把结果压到 0~1
- 权重 a/b/c/d 起步可设：

  * b、c 较大（完成度更关键）
  * a 次之（次数）
  * d 用于奖励重温

> 这类“强度=偏好，强度大小=置信度”的拆分，和隐式反馈协同过滤的经典做法一致：对每个 user-item 既要一个“偏好”，又要一个“置信度/权重”。([Samuel Deng][1])

---

## 4) 从粘度到 tag 喜好画像：可解释、可展示、可用于推荐

### 4.1 item 的 tag 向量

每个作品 i 有 tag 向量 (T_i)，可 multi-hot 或带权重。

建议加一个 **IDF/稀有度** 去抑制“泛标签”（例如“搞笑”“日常”可能很常见）：

[
idf(tag)=\log\frac{N}{df(tag)+1}
]

### 4.2 用户 tag 画像向量

用粘度加权累积：

[
U_{tag} = \sum_{i \in \text{interacted}} S_{ui} \cdot T_i \cdot idf
]

然后归一化（得到比例）：

* 用于展示：Top-N tags 占比、变化趋势（近30天 vs 近180天）
* 用于推荐：与候选作品 tag 向量做 cosine 相似度

### 4.3 “模糊推荐/扩展领域”怎么做

你要的不是完全重合，而是“有一定相似但不完全重合”。

两种成熟做法：

1. **tag 相似图谱（共现/embedding）**

* 用全站交互构建 tag 共现矩阵（同一作品/同一用户高粘度作品里共现）
* 得到 tag-to-tag 相似度（例如 PMI/word2vec 风格 embedding）
* 扩展时选：与用户 Top tag 相似度在 ([0.3,0.6]) 的“邻居 tag”，并且用户历史覆盖较低 → 这就是“扩展领域”。

2. **推荐结果的多样化重排（MMR / DPP）**

* 先挑出相关性高的候选，再重排让列表覆盖更多“元素组合”。
* MMR 的核心就是在“相关性 vs 新颖性（与已选的不同）”之间折中。
* DPP 是用概率模型天然鼓励多样性的一类方法。([arXiv][2])

（下面第 6 节会把它放进推荐链路。）

---

## 5) 推荐系统主链路：召回 → 排序 → 多样化/探索（社区成熟范式）

### 5.1 召回（Candidate Generation）

你可以做**双路召回**，互补：

**A. 协同过滤召回（Implicit CF）**

* 把你的 (S_{ui}) 当作隐式反馈强度，构造：

  * 偏好 (p_{ui}\in{0,1})（比如 (S_{ui}>\theta) 视为正）
  * 置信度 (c_{ui}=1+\alpha\cdot S_{ui})（或 (1+\alpha\cdot cnt_real\cdot avg_depth)）
* 用 Weighted ALS（WRMF）或 BPR 做召回/排序：

  * WRMF/ALS 是隐式反馈的经典基线。([Samuel Deng][1])
  * BPR 用 pairwise 排序目标，适合 Top-K 推荐。
* 工程上可以直接用开源库：

  * `implicit`（benfred/implicit）提供 ALS、BPR 等高性能实现。([benfred.github.io][3])

**B. 内容/标签召回（Content-based）**

* 用 user tag 向量 (U_{tag}) 与 item tag 向量 (T_i) 做相似度召回：

  * 覆盖冷启动（新作品）很好
  * 可解释（“因为你喜欢 X 标签”）

**社区成熟组合**：用 CF 做“你可能喜欢”，用 tag 做“你喜欢的元素”，两路合并去重。

### 5.2 混合模型（更进一步）

如果你希望“一个模型里同时用交互 + tags”，社区常用 LightFM 这类**hybrid 矩阵分解**：

* item/user 表示可以由“特征 embedding 的线性组合”构成，同时吸收协同信息与元数据。
* LightFM 在工程上也有成熟实现和文档。([making.lyst.com][4])

### 5.3 排序（Ranking）

召回拿到几百~几千候选后，排序要把你的“粘度/观看时长目标”用起来。

成熟做法之一：

* 用学习排序（Learning to Rank）的模型（如 LambdaMART / XGBoost Ranker）
* 特征可以包括：

  * CF score（ALS/BPR 的打分）
  * tag cosine 相似度
  * 作品热度/新鲜度/完结状态
  * 用户最近兴趣漂移（近7/30天 tag 权重）
  * 预计粘度（预测 (S_{ui}) 或预计 watch time）
* XGBoost 有完整的 learning-to-rank 支持与参数说明。([xgboost.readthedocs.io][5])

另外一个很贴合你“按时间强度”的行业思路：**把 watch time 当作优化目标/加权目标**。例如 YouTube 推荐论文里在 ranking 阶段会把正样本按 watch time 加权来学习“期望观看时长”。
你这里可以类比为：对“正反馈样本”按 (S_{ui}) 或 watch time/完成度加权，优化更接近“粘度最大化”。

### 5.4 多样化 & 扩展（Rerank）

在排序 topN 后做一次 rerank：

**MMR 重排（简单强大）**
[
score(i)=\lambda\cdot rel(i) - (1-\lambda)\cdot \max_{j\in selected} sim(i,j)
]

* rel(i)：排序模型分数
* sim(i,j)：tag 相似度（或 embedding 相似度）
* (\lambda) 控制“更像你” vs “更不重复”
* MMR 是经典“相关性+新颖性”折中方法。

**DPP（更学术一些，但效果好）**

* 适合你要的“列表整体不重复、覆盖多元素”。([arXiv][2])

### 5.5 探索（Exploration）

你还希望“扩展用户可能会看的领域”，除了多样化，还要留出少量探索位：

* 例如列表中 10% 位点做“相似度中等但新 tag 覆盖高”的作品
* 或对新作品/新 tag 进行轻量试探（后续用真实粘度更新画像）

这属于典型“exploration/exploitation”问题；YouTube 的系统设计里也提到新内容与已知内容的平衡视角。

---

## 6) 逢年过节“用户喜好分析页”怎么产出（可解释、可视化、可运营）

你可以输出以下模块（都能从上面的 (S_{ui})、(U_{tag}) 直接算）：

1. **年度/季度/近30天 Top tags**

* 条形图：Top 10 标签占比
* “你最偏爱：xx(18%)、yy(13%)…”
* 同时展示：近30天 vs 近180天 的变化（兴趣漂移）

2. **粘度最高作品榜**

* Top 10 作品（漫画/动画分开）
* 展示：完成度均值、重温次数、最近一次观看时间

3. **你可能错过的同类精品（强相似）**

* 从高相似 tag + CF 相似召回里选

4. **为你扩展的 3 个新领域（模糊推荐）**

* 每个领域=一组“相似但未覆盖”的 tag cluster
* 每组给 3~5 个代表作
* 文案示例：“你喜欢【热血/成长】，我们发现与你偏好相近但更偏【运动竞技】的作品，你可能会喜欢…”

5. **你的“口味多样性指数”**

* 用 tag 分布熵（entropy）或覆盖数
* 运营上很好用：告诉用户“你是专一派/杂食派”

---

## 7) 工程落地建议：从 MVP 到成熟系统的迭代路径

### MVP（最快上线）

* 计算：Real 判定 + (S_{ui})
* 用户画像：(U_{tag})（加 IDF、时间衰减）
* 推荐：tag 相似度召回 + 热门兜底 + 简单 MMR 去重

### V1（社区成熟“标准形态”）

* 加入协同过滤召回：ALS/BPR（用 implicit 库快速实现）([benfred.github.io][3])
* 排序先用线性/GBDT（含 CF score + tag sim + 热度/新鲜度）
* rerank 用 MMR 保证多样化 

### V2（更强的混合与冷启动）

* 用 LightFM 或类似 hybrid MF，直接把 tags 当 item features 融进模型 
* 排序用 Learning-to-Rank（XGBoost ranker）([xgboost.readthedocs.io][5])
* 目标更贴近“粘度/时长”（参考 watch time 加权思想）

---

## 8) 关键参数如何“合理”设定（不拍脑袋的办法）

你会遇到最大的问题其实是：阈值/权重怎么定？

建议用两步：

1. **统计分布**：看全站 (r) 的分布（完成度直方图），一般会有明显“短停留峰”和“接近看完峰”。
2. **用业务指标校准**：

   * 把“次日/7日留存、续看率、收藏/追番、付费转化”等当作外部验证
   * 调 r_min、γ、a/b/c/d，让 (S_{ui}) 与这些指标相关性最高

---

如果你愿意我也可以进一步把上面内容落成一份更“规格化”的方案文档（数据表结构、离线任务、实时特征、训练/服务接口、指标体系），或者给你一套更具体的**示例参数**（按“短集动画/长集动画/短本漫画/长本漫画”分桶）来减少冷启动阶段的试错。

[1]: https://samuel-deng.github.io/math4ml_su24/project/Hu_et_al.pdf "Collaborative Filtering for Implicit Feedback Datasets"
[2]: https://arxiv.org/abs/1207.6083 "[1207.6083] Determinantal point processes for machine learning"
[3]: https://benfred.github.io/implicit/ "Implicit — Implicit 0.6.1 documentation"
[4]: https://making.lyst.com/lightfm/docs/home.html?utm_source=chatgpt.com "Welcome to LightFM’s documentation! — LightFM 1.16 documentation - Lyst"
[5]: https://xgboost.readthedocs.io/en/latest/tutorials/learning_to_rank.html "Learning to Rank — xgboost 3.3.0-dev documentation"
