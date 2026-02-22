# 偏好行为指标口径表（v1）

Last updated: 2026-02-22

本文档定义“偏好行为指标（Preference Metrics）”在 MediaPlayerX 中的字段口径、采集边界、写入时机与噪音过滤规则，供后续推荐模型直接接入。

## 1. 总体原则

- 指标分为两类：图片（图包级）与视频（视频级）。
- 采集与持久化解耦：播放/浏览过程中仅更新内存缓冲，会话结束再一次性写入数据库。
- 当前版本不含音频偏好行为指标。

## 2. 数据表与主键

| 表名 | 粒度 | 主键 | 说明 |
|---|---|---|---|
| `image_preference_metrics` | 图包级 | `source_id` | 一条记录代表某图包的聚合偏好行为 |
| `video_preference_metrics` | 视频级 | `video_id` | 一条记录代表某视频的聚合偏好行为 |

## 3. 字段口径

### 3.1 图片指标（`image_preference_metrics`）

| 字段 | 类型 | 口径定义 |
|---|---|---|
| `event_count` | INTEGER | 有效图片会话次数（每次全屏图片会话结束 +1） |
| `pages_read` | INTEGER | 历史最大已读页数（按 `max(历史值, 本次会话最大页索引+1)` 累积） |
| `total_pages` | INTEGER | 图包总页数（取当前快照值） |
| `completion_ratio` | REAL | `pages_read / total_pages`，截断到 `[0,1]` |
| `last_event_time_ms` | INTEGER\|NULL | 最近一次有效图片会话结束时间（Unix ms） |
| `updated_at_ms` | INTEGER | 本条记录最后更新时间（Unix ms） |

### 3.2 视频指标（`video_preference_metrics`）

| 字段 | 类型 | 口径定义 |
|---|---|---|
| `event_count` | INTEGER | 有效视频会话次数（满足噪音过滤后，会话结束 +1） |
| `watch_seconds` | REAL | 累积有效观看秒数（正向时间增量求和） |
| `total_seconds` | INTEGER | 视频总时长秒数（取当前快照值） |
| `completion_ratio` | REAL | `watch_seconds / total_seconds`，截断到 `[0,1]` |
| `last_event_time_ms` | INTEGER\|NULL | 最近一次有效视频会话结束时间（Unix ms） |
| `updated_at_ms` | INTEGER | 本条记录最后更新时间（Unix ms） |

## 4. 会话开始与结束规则

### 4.1 图片会话

- 开始条件：`mode=image && fullscreenActive=true`。
- 非开始场景：仅点击节点触发缩略图加载，不计入会话。
- 结束并写入触发：
  - 退出全屏；
  - 切换到其他模式的全屏；
  - 退出 App（`beforeunload`）。

### 4.2 视频会话

- 开始条件：`mode=video && videoPlaying=true`（全屏/非全屏均可）。
- 结束并尝试写入触发：
  - 停止播放；
  - 切换视频节点；
  - 切换模式；
  - 退出 App（`beforeunload`）。

## 5. 噪音过滤规则

- 视频非全屏会话若累计播放时长 `<10s`，判定为噪音，不写入数据库。
- 全屏视频会话不受 10 秒噪音阈值限制。
- 图片会话无最小时长阈值，是否有效由“是否进入全屏图片会话”决定。

## 6. 写入链路

- Renderer 将内存缓冲编码为 `xp_preference_metrics_v1` 的 `state_json`。
- Main 在 `writeAppState` 中解析该 key，写入 `image_preference_metrics` 与 `video_preference_metrics`。
- 同时保留 `app_state` 原始 JSON 作为诊断与回溯数据。

## 7. 推荐模型接入建议

- 训练特征优先使用：`event_count`、`completion_ratio`、`watch_seconds`、`last_event_time_ms`。
- 时间衰减建议在离线特征层处理：基于 `last_event_time_ms` 计算 `recency_decay`。
- 若后续引入 session 明细表，可将当前聚合表作为“在线快速特征缓存”。
