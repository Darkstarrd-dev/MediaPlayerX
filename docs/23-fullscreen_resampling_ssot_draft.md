# 全屏图片重采样 SSOT 草案（Draft）

Last updated: 2026-02-22

## 1. 范围

- 目标：提升全屏图片质量（上采样/下采样）。
- 范围：设置面板、前端预取与 URL 解析、IPC 合约、Electron 后端 Sharp 重采样与缓存。
- 非目标：改变全屏翻页交互语义、引入阻塞式等待策略。

## 2. 设计原则

- 不阻塞翻页：重采样未就绪时回退原图，不等待。
- 优先清晰度：`fullscreen > original > thumbnail`。
- 可配置：分别配置上采样算法与下采样算法。
- 可回退：关闭开关后完全回退到原图链路。

## 3. 设置项定义

| key | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fullscreenResamplingEnabled` | `boolean` | `false` | 全屏重采样总开关 |
| `fullscreenDownsamplingKernel` | `"lanczos3" \| "mitchell" \| "nearest" \| "cubic"` | `"lanczos3"` | 原图大于屏幕时算法 |
| `fullscreenUpsamplingKernel` | `"lanczos3" \| "mitchell" \| "nearest" \| "cubic"` | `"lanczos3"` | 原图小于屏幕时算法 |

## 4. 设置面板 Tooltip 语义

- `fullscreenResamplingEnabled`：开启后按视口目标尺寸预生成；未就绪自动回退原图，不阻塞翻页。
- `fullscreenDownsamplingKernel`：用于大图缩小场景。
- `fullscreenUpsamplingKernel`：用于小图放大场景。

## 5. 前端行为规范

- 全屏启用且开关开启时，预取窗口除 `image-original:*` 外，额外加入 `image-fullscreen:*`。
- `image-fullscreen:*` 请求参数包含目标尺寸与 kernel，作为独立缓存键。
- 尺寸上限遵循协议校验：`target_width <= 7680`，`target_height <= 4320`。

## 6. IPC 协议草案

- `resolveMediaResourceRequest` 新增可选字段 `fullscreen_resize`：
  - `target_width: int[1,7680]`
  - `target_height: int[1,4320]`
  - `kernel: enum(lanczos3, mitchell, nearest, cubic)`
- 返回结构沿用现有 `resolveMediaResourceResponse`。

## 7. 后端实现规范

- 文件：`electron/fileSystemFullscreenResizer.ts`。
- 复用 thumbnail 目录作为缓存根目录，缓存键包含：源标识、mtime、size、targetWidth、targetHeight、kernel。
- 输出：WebP，质量 95。
- 算法：Sharp `fit: inside`，`withoutEnlargement: false`，允许上采样。

## 8. 验收标准（本轮）

- 功能：开关与两种 kernel 可配置，且实时生效。
- 视觉：`fullscreenImageSrc` 按 `fullscreen > original > thumbnail` 取值。
- 性能：快速翻页时不阻塞；未就绪可回退原图；不出现明显闪烁。
- 质量门禁：`lint`、相关 `vitest`、`build` 通过。

## 9. 风险与回滚

- 风险：高分辨率下重采样任务竞争 CPU token，可能延后重采样命中。
- 缓解：默认关闭；按需开启；保持回退链路。
- 回滚：关闭 `fullscreenResamplingEnabled` 即可回退到原图链路。
