# 全屏图片分层渲染 SSOT 草案（Draft）

Last updated: 2026-06-14

## 1. 范围

- 目标：消除全屏连续匀速翻页的“最后一公里”解码/重新光栅化开销，将连续翻页上限从约 8 张/秒提升到间隔均匀的更高帧率。
- 范围：设置面板开关、前端全屏窗口 src 列表生成、`FullscreenImagePane` 多层 `<img>` 预渲染、`useFullscreenImageSource` 的 layered 快路径。
- 非目标：改变全屏翻页交互语义；新增独立窗口大小设置；改动 IPC/后端字节链路（URL 解析与 HTTP 缓存已在上轮优化到位）。

## 2. 设计原则

- 不阻塞翻页：目标层已预渲染解码，切图仅翻转 opacity，无 `await decode`。
- URL 一致性：窗口层与显示同源取值（`preloadedFullscreenUrlByImageId ?? originalImageUrlById`），保证解码位图复用命中。
- 可回退：关闭开关后完全回退到单 `<img>` 切 `src` 链路，零行为变化。
- 内存可控：窗口大小跟随 `fullscreenCrossPackagePrefetchCount`，滑出窗口的层卸载即释放位图（天然 LRU）。

## 3. 设置项定义

| key | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fullscreenLayeredRenderEnabled` | `boolean` | `false` | 全屏分层渲染总开关 |

> 预渲染窗口半径复用 `fullscreenCrossPackagePrefetchCount`（`int[3,16]`，默认 `6`），不新增独立设置项。

## 4. 设置面板 Tooltip 语义

- `fullscreenLayeredRenderEnabled`：开启后在窗口内预渲染多层图像，切换近瞬时、无需重新解码；窗口越大、图片越大，内存占用越高（窗口大小跟随“全屏跨图包预取数量”）。默认关闭。

## 5. 前端行为规范

- `useResolvedMediaState` 产出 `fullscreenWindowImageSrcs: string[]`：顺序 `[fi, fi+1, fi-1, fi+2, fi-2, ...]`，聚焦图置于 index 0；URL 来源与显示一致；去重。
- 透传链：`useResolvedMediaState → useAppDisplayResources → useAppTopLayerBindings → useAppTopLayerState → buildFullscreenLayerProps → FullscreenLayer → FullscreenImagePane`，同时透传开关 `fullscreenLayeredRenderEnabled`。
- `FullscreenImagePane` 在 `layeredRenderEnabled && !imageConvertPreviewMode && windowImageSrcs?.length` 时渲染 `.fullscreen-media-image-layers` 容器，内含 `windowImageSrcs.map(src => <img key={src} .../>)`；仅 `src === displayedImageSrc` 的层加 `is-active`（`opacity:1`），其余 `opacity:0`。
- `key={src}` 是关键：窗口滑动时中间层 DOM 稳定复用 → 解码位图保活；滑出窗口的层卸载 → 位图释放。
- 仅 active 层 `onLoad` 驱动 `onImageNaturalSize`（避免背景层抢设 footer 分辨率/aspect）。
- `useFullscreenImageSource` 在 `layered === true` 时 `displayedImageSrc` 直接跟随 `focusedImageSrc`（跳过 `await decode`，保留 sequence guard）。

## 6. CSS 规范

- 文件：`src/styles/app/layout/layout.part2.css`。
- `.fullscreen-media-image-layers`：`position: relative; width/height: 100%; overflow: hidden`。
- `.fullscreen-media-image-layer`：`position: absolute; inset: 0; object-fit: contain; opacity: 0; transition: opacity 40ms linear`（参照 `.fullscreen-image-compare-layer`）。
- `.fullscreen-media-image-layer.is-active`：`opacity: 1; pointer-events: auto`。
- zoom/pan 作用于父包装 `.fullscreen-media-image`（`width/height` + `translate3d`），多层容器作为子节点自动继承，无需每层重复 transform。

## 7. 性能埋点（dev-only）

- 复用 `src/features/perf/benchRecorder.ts` 的 `benchMark(...)`，`getBenchSettings().enabled` 关时零开销。
- 事件：`fs_focused_src_changed`（含 `layered: true/false`、`src`）。
- 帧间隔 p50/p95 复用 `benchEnd()` 自动采集的 `rafGapsMs` / `longTaskDurationsMs`，不建额外 UI。

## 8. 验收标准（本轮）

- 功能：开关 OFF 时单 `<img>` 切 src 路径零变化；开关 ON 时多层叠加 + opacity 翻转；开关实时生效。
- 边界：跨包边界、滚轮翻页、zoom/pan、footer 分辨率显示、退出/重入全屏均回归正常。
- 性能：同一图包开关 OFF vs ON 对比，ON 的连续翻页流畅度与间隔均匀性显著优于 OFF，且明显高于约 8 张/秒上限。
- 内存：大窗口（`fullscreenCrossPackagePrefetchCount = 12/16`）内存占用可接受（滑出层卸载回收）。
- 质量门禁：`format:check`、`lint`、`vitest`、`build` 通过；`npx madge --circular src electron` 0 循环依赖。

## 9. 风险与回滚

- 风险：`fullscreenCrossPackagePrefetchCount = 16` 时窗口约 33 张 `<img>`，大图位图可达数百 MB。
- 缓解：默认关闭；靠 `key={src}` 卸载滑出层控制内存；tooltip/文档提示“大窗口+超大图慎用”。
- 风险：转换预览（convert-preview）有自己的双 `<img>` 路径——已用 `!imageConvertPreviewActive` 门控 layered 路径，两者互斥。
- 回滚：关闭 `fullscreenLayeredRenderEnabled` 即可回退到单 `<img>` 切 src 链路（关闭态路径一行不改）。
