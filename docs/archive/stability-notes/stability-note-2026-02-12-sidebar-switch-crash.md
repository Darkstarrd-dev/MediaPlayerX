# Sidebar 快速切换闪退问题记录（2026-02-12）

## 1. 现象

- 在 Sidebar 高频切换节点时，主区缩略图会先出现部分不显示，随后应用闪退。
- 问题在开发态可复现，且复现前后无稳定业务层异常提示。

## 2. 可能原因（当前判断）

- 缩略图链路在短时间触发大量并发请求时，主进程图片缩略图生成（Sharp）存在瞬时内存峰值风险。
- 同一缩略图目标在高频切换下可能被重复生成，造成额外 CPU/内存开销。
- 该问题表现更接近运行时资源竞争/内存压力，不是单一前端状态错误。

## 3. 本次临时修复（已上线）

- 对缩略图生成引入全局并发上限（`MAX_CONCURRENT_THUMBNAIL_GENERATION = 4`）。
- 对同一 `cachePath` 的缩略图生成任务做 in-flight 去重：若已有任务在执行，后续请求直接复用同一 Promise。
- 增加主进程运行时诊断日志：记录 `render-process-gone`、`child-process-gone`、`did-fail-load`、媒体协议读失败、`resolveMediaResource` 异常统计等。

涉及文件：

- `electron/fileSystemThumbnailResolver.ts`
- `electron/runtimeDiagnostics.ts`
- `electron/main.ts`
- `electron/registerBackendIpcHandlers.ts`

## 4. 当前验证结果

- 应用侧复测：本轮修复后“Sidebar 高频切换导致闪退”未再复现。
- 说明：该结论属于阶段性稳定结论，仍需继续观察真实数据集下的长时运行。

## 5. 后续观察与收敛策略

- 保留诊断日志能力，继续收集 `runtime-diagnostics.log`。
- 若问题复现，优先回传以下事件段：
  - `renderer-process-gone`
  - `child-process-gone`
  - `media-protocol-read-failed`
  - `resolve-media-resource-audit`
- 如果再次出现“日志断尾且无 process-gone 事件”，进入 crash dump 路线做 native 层定位。
