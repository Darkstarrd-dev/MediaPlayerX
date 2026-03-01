# 全屏图片重采样（Fullscreen Image Resampling）执行计划

Last updated: 2026-02-22

## 1. 背景与目标

全屏浏览模式下，图片通过 `<img>` + `object-fit: contain` 渲染，浏览器默认 bilinear 缩放在以下场景画质不佳：

- **大图缩小（下采样）**：原图远大于屏幕时产生摩尔纹、锯齿
- **小图放大（上采样）**：原图远小于屏幕时画面模糊

**目标**：在 Electron 后端用 Sharp 将图片预先重采样到匹配屏幕分辨率的尺寸，在不影响翻页性能的前提下增强全屏画质。

**性能约束**：

| 约束 | 说明 |
|------|------|
| 第一张图 | 允许先显示原图，后台完成后替换为重采样版本 |
| 后续图片 | 必须预处理预加载完毕，不出现"先原图后替换"的闪烁 |
| 翻页速率 | 维持现有的至少 1s 切换 10 张图不卡顿不闪烁 |

## 2. 总体策略

**复用现有 ±N 预取机制**。

`useResolvedMediaState`（`src/features/app/useResolvedMediaState.ts:176-187`）在全屏模式下已预取当前图片前后各 `fullscreenPrefetchRadius`（默认 6）张的 `image-original:` URL。开启重采样后，在同一预取窗口中额外推入 `image-fullscreen:` 目标，由 `useResolvedMediaUrls` 的并发队列和缓存统一管理。显示时优先使用重采样 URL，若尚未就绪则 fallback 到原图。

```
翻页流程（重采样开启时）：

  用户翻到第 N 张 → focusedRef 更新
       ↓
  useResolvedMediaState 重建 target 列表
       ↓
  推入 image-original:N, N±1..N±6（现有逻辑）
  推入 image-fullscreen:N, N±1..N±6（新增逻辑）
       ↓
  useResolvedMediaUrls 并发队列解析
  ├─ 缓存命中 → 立即可用
  └─ 缓存未命中 → IPC → 后端 Sharp → 缓存 → 返回 URL
       ↓
  fullscreenImageSrc = fullscreenUrl ?? originalUrl ?? thumbnailUrl
       ↓
  useFullscreenImageSource → 解码缓存命中则零延迟显示
```

## 3. 实施步骤

### 3.1 新增设置项

#### `src/contracts/settings.ts`

新增 schema 和字段：

```typescript
export const fullscreenResamplingKernelSchema = z.enum([
  "lanczos3", "mitchell", "nearest", "cubic",
]);

// 在 appSettingsSchema 中追加：
fullscreenResamplingEnabled: z.boolean(),
fullscreenUpsamplingKernel: fullscreenResamplingKernelSchema,
fullscreenDownsamplingKernel: fullscreenResamplingKernelSchema,
```

#### `src/store/useUiStore.ts`

`DEFAULT_SETTINGS` 追加默认值：

```typescript
fullscreenResamplingEnabled: false,
fullscreenUpsamplingKernel: "lanczos3",
fullscreenDownsamplingKernel: "lanczos3",
```

`SETTINGS_KEYS` 数组追加三个 key。

#### `src/features/app/useAppSettingsStore.ts`

selector 中增加三个字段。

#### 设置面板 UI

在 layout section（`src/components/settings/renderSettingsMainSectionContent.tsx`）中现有 `fullscreenPrefetchRadius` 控件附近添加：

1. **开关 toggle**：`fullscreenResamplingEnabled`（开关标签：「全屏重采样」）
2. **下采样模式下拉**：`fullscreenDownsamplingKernel`（当图片大于屏幕时），仅在开关打开时显示
3. **上采样模式下拉**：`fullscreenUpsamplingKernel`（当图片小于屏幕时），仅在开关打开时显示

涉及文件：

| 文件 | 改动 |
|------|------|
| `src/components/settings/renderSettingsMainSection.types.ts` | 添加 3 个 prop + 3 个 handler |
| `src/components/settings/renderSettingsMainSectionContent.tsx` | 添加 toggle + 2 个 select |
| `src/features/app/buildSettingsPanelProps.ts` | handler 映射 |

#### i18n

| 文件 | 改动 |
|------|------|
| `src/i18n/locales/zh-CN.ts` | 添加翻译 key |
| `src/i18n/locales/en-US.ts` | 添加翻译 key |

翻译 key 清单：

```
ui.settings.fullscreenResamplingEnabled     → 全屏重采样 / Fullscreen Resampling
ui.settings.fullscreenDownsamplingKernel    → 下采样算法 / Downsampling Kernel
ui.settings.fullscreenUpsamplingKernel      → 上采样算法 / Upsampling Kernel
ui.settings.resamplingKernelLanczos3        → Lanczos3（锐利）
ui.settings.resamplingKernelMitchell        → Mitchell（均衡）
ui.settings.resamplingKernelNearest         → Nearest（像素风）
ui.settings.resamplingKernelCubic           → Cubic（平滑）
```

### 3.2 扩展 IPC 协议

#### `src/contracts/backend.schemas.ts`

在 `resolveMediaResourceRequestSchema`（第 248 行）中新增可选字段：

```typescript
export const resolveMediaResourceRequestSchema = z.object({
  locator: mediaLocatorDtoSchema,
  preferred_variant: z.enum(["original", "thumbnail"]).optional(),
  thumbnail: z.object({ ... }).optional(),
  // ── 新增 ──
  fullscreen_resize: z.object({
    target_width: z.number().int().min(1).max(7680),
    target_height: z.number().int().min(1).max(4320),
    kernel: z.enum(["lanczos3", "mitchell", "nearest", "cubic"]),
  }).optional(),
});
```

`resolveMediaResourceResponseSchema` 不变——返回结构与缩略图一致（`resource_url` + `mime_type` + `expires_at_ms`）。

`src/contracts/backend.types.ts` 类型由 Zod 推导，自动生效。

### 3.3 前端预取集成

#### `src/features/backend/mediaResolveUtils.ts`

扩展 `MediaResolveTarget` 接口：

```typescript
export interface MediaResolveTarget {
  targetId: string
  locator: MediaLocator | null
  variant?: 'original' | 'thumbnail' | 'fullscreen'   // 新增 fullscreen
  thumbnailMaxEdge?: number
  thumbnailQuality?: number
  thumbnailGenerationConcurrency?: number
  // ── 新增 ──
  fullscreenTargetWidth?: number
  fullscreenTargetHeight?: number
  fullscreenKernel?: 'lanczos3' | 'mitchell' | 'nearest' | 'cubic'
}
```

扩展 `buildRequestKey()`（第 40 行）：

```typescript
// 现有逻辑末尾追加
if (target.variant === 'fullscreen') {
  return `${base}|variant:fullscreen|w:${target.fullscreenTargetWidth}|h:${target.fullscreenTargetHeight}|k:${target.fullscreenKernel}`
}
```

扩展 `buildResolveRequest()`（第 55 行）：

```typescript
// 在 thumbnail 分支之后追加
if (target.variant === 'fullscreen') {
  return {
    locator: mapMediaLocatorToDto(target.locator as MediaLocator),
    preferred_variant: 'original',
    fullscreen_resize: {
      target_width: target.fullscreenTargetWidth!,
      target_height: target.fullscreenTargetHeight!,
      kernel: target.fullscreenKernel!,
    },
  }
}
```

#### `src/features/app/useResolvedMediaState.ts`

**新增参数**（`UseResolvedMediaStateParams` 接口，第 23 行起）：

```typescript
fullscreenResamplingEnabled?: boolean
fullscreenUpsamplingKernel?: 'lanczos3' | 'mitchell' | 'nearest' | 'cubic'
fullscreenDownsamplingKernel?: 'lanczos3' | 'mitchell' | 'nearest' | 'cubic'
```

**新增预取逻辑**（在第 187 行现有预取循环之后）：

```typescript
if (fullscreenResamplingEnabled && fullscreenActive) {
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 1080

  const pushFullscreenTarget = (image: ImageItem | null) => {
    if (!image || image.width <= 0 || image.height <= 0) return
    // 计算适配缩放比：图片 fit 到 viewport 后的比例
    const fittedScale = Math.min(viewportW / image.width, viewportH / image.height)
    // 缩放比接近 1 时无需重采样
    if (fittedScale > 0.95 && fittedScale < 1.05) return
    const kernel = fittedScale < 1
      ? (fullscreenDownsamplingKernel ?? 'lanczos3')
      : (fullscreenUpsamplingKernel ?? 'lanczos3')
    pushTarget({
      targetId: `image-fullscreen:${image.id}`,
      locator: image.mediaLocator,
      variant: 'fullscreen',
      fullscreenTargetWidth: viewportW,
      fullscreenTargetHeight: viewportH,
      fullscreenKernel: kernel,
    }, true)
  }

  pushFullscreenTarget(focusedImage)
  if (focusedIndex >= 0) {
    for (let offset = 1; offset <= prefetchRadius; offset += 1) {
      const ahead = orderedRootScopedImageRefs[focusedIndex + offset]
      const behind = orderedRootScopedImageRefs[focusedIndex - offset]
      if (ahead) {
        pushFullscreenTarget(
          packageById.get(ahead.packageId)?.images[ahead.imageIndex] ?? null
        )
      }
      if (behind) {
        pushFullscreenTarget(
          packageById.get(behind.packageId)?.images[behind.imageIndex] ?? null
        )
      }
    }
  }
}
```

**新增 URL 提取**（在第 402 行 `originalImageUrlById` 之后）：

```typescript
const fullscreenImageUrlById = useMemo<Record<string, string>>(() => {
  const next: Record<string, string> = {}
  for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
    if (!targetId.startsWith('image-fullscreen:')) continue
    next[targetId.slice('image-fullscreen:'.length)] = url
  }
  return next
}, [resolvedMedia.urlByTargetId])
```

**修改 `fullscreenImageSrc` 优先级**（第 429 行）：

```typescript
const fullscreenImageSrc = focusedImage
  ? (fullscreenImageUrlById[focusedImage.id]
    ?? originalImageUrlById[focusedImage.id]
    ?? thumbnailImageUrlById[focusedImage.id]
    ?? null)
  : null
```

#### `src/features/app/useAppDisplayResources.ts`

在调用 `useResolvedMediaState` 时（约第 587 行）传入新参数：

```typescript
fullscreenResamplingEnabled: appSettings.fullscreenResamplingEnabled,
fullscreenUpsamplingKernel: appSettings.fullscreenUpsamplingKernel,
fullscreenDownsamplingKernel: appSettings.fullscreenDownsamplingKernel,
```

### 3.4 后端重采样逻辑

#### 新建 `electron/fileSystemFullscreenResizer.ts`

复用 `electron/fileSystemThumbnailResolver.ts` 的基础设施模式（缓存、去重、并发限流），核心区别：

| 维度 | 缩略图 | 全屏重采样 |
|------|--------|-----------|
| `withoutEnlargement` | `true` | `false`（允许上采样） |
| kernel | 固定 | 由请求参数指定 |
| 输出格式 | WebP q82 | WebP q95 |
| 缓存 variant | `"thumb"` | `"fullscreen"` |

导出函数签名：

```typescript
export async function maybeResolveFullscreenLocator(params: {
  locator: MediaLocatorDto
  request: ResolveMediaResourceRequestDto
  thumbnailCacheRootDir: string
  ensureRuntimeDependencies: () => Promise<{ sharp: boolean }>
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>
}): Promise<MediaLocatorDto | null>
```

内部逻辑要点：

1. 检查 `request.fullscreen_resize` 是否存在，不存在则返回 `null`
2. 仅处理 `media_type === 'image'` 的 locator
3. 计算缓存路径（SHA1 hash），key 包含 `variant: "fullscreen"` + 源文件标识 + `targetWidth` + `targetHeight` + `kernel`
4. 缓存命中 → 直接返回 filesystem locator
5. 缓存未命中 → 去重检查 → 加入并发限流队列 → 读取源图 → Sharp resize → 写入缓存
6. 共用 `thumbnailCacheRootDir` 目录

Sharp 调用：

```typescript
sharp(sourceBuffer, { failOn: 'none' })
  .rotate()
  .resize({
    width: targetWidth,
    height: targetHeight,
    fit: 'inside',
    kernel: sharp.kernel[requestedKernel],  // lanczos3 | mitchell | nearest | cubic
    withoutEnlargement: false,
  })
  .webp({ quality: 95 })
  .toFile(cachePath)
```

缓存 key 结构：

```json
{
  "variant": "fullscreen",
  "kind": "filesystem",
  "path": "/path/to/image.jpg",
  "mtimeMs": 1708617600000,
  "size": 2048576,
  "targetWidth": 1920,
  "targetHeight": 1080,
  "kernel": "lanczos3"
}
```

#### `electron/services/file-system-read/mediaResourceService.ts`

在 `resolveMediaResource()` 方法（第 148 行）中，现有 thumbnail 分支之后添加 fullscreen 分支：

```typescript
// 现有逻辑（第 177-193 行）
const thumbnailLocator = await maybeResolveThumbnailLocator({ ... })
if (thumbnailLocator) { locator = thumbnailLocator }

// ── 新增：fullscreen 与 thumbnail 互斥 ──
if (!thumbnailLocator && request.fullscreen_resize) {
  const fullscreenLocator = await maybeResolveFullscreenLocator({
    locator,
    request,
    thumbnailCacheRootDir: this.options.thumbnailCacheRootDir,
    ensureRuntimeDependencies: this.options.ensureRuntimeDependencies,
    readImageBufferForThumbnail: this.options.readImageBufferForThumbnail,
    runWithCpuToken: this.options.runWithThumbnailCpuToken,
  })
  if (fullscreenLocator) { locator = fullscreenLocator }
}
```

## 4. 涉及文件清单

### 前端

| 文件 | 改动类型 |
|------|----------|
| `src/contracts/settings.ts` | 新增 schema + 3 个字段 |
| `src/contracts/backend.schemas.ts` | 扩展 `resolveMediaResourceRequestSchema` |
| `src/store/useUiStore.ts` | `DEFAULT_SETTINGS` + `SETTINGS_KEYS` |
| `src/features/app/useAppSettingsStore.ts` | selector 增加 3 字段 |
| `src/features/backend/mediaResolveUtils.ts` | 扩展 `MediaResolveTarget` + `buildRequestKey` + `buildResolveRequest` |
| `src/features/app/useResolvedMediaState.ts` | 预取 fullscreen targets + URL 提取 + 优先级 |
| `src/features/app/useAppDisplayResources.ts` | 传递 3 个新设置参数 |
| `src/components/settings/renderSettingsMainSection.types.ts` | 添加 props + handlers |
| `src/components/settings/renderSettingsMainSectionContent.tsx` | toggle + 2 个 dropdown |
| `src/features/app/buildSettingsPanelProps.ts` | handler 映射 |
| `src/i18n/locales/zh-CN.ts` | 中文翻译 |
| `src/i18n/locales/en-US.ts` | 英文翻译 |

### 后端

| 文件 | 改动类型 |
|------|----------|
| `electron/fileSystemFullscreenResizer.ts` | **新建** — Sharp 重采样 + 缓存 |
| `electron/services/file-system-read/mediaResourceService.ts` | 调用 fullscreen resizer |

## 5. 不需要改动的文件

以下文件**不需要改动**，因为重采样 URL 通过现有的 `fullscreenImageSrc` 数据流自然传递：

- `src/components/FullscreenLayer.tsx` — 已接收 `focusedImageSrc`
- `src/components/fullscreen/useFullscreenImageSource.ts` — 已有解码缓存，直接使用重采样 URL
- `src/components/fullscreen/FullscreenPanes.tsx` — 渲染 `displayedImageSrc` 不变
- `src/features/app/buildFullscreenLayerProps.ts` — 透传 `focusedImageSrc` 不变
- `src/features/app/useAppTopLayerState.ts` — 透传 `fullscreenImageSrc` 不变

## 6. 验证方案

### 功能验证

1. 设置面板打开「全屏重采样」开关，上下采样均选 Lanczos3
2. 进入全屏，打开一张远大于屏幕的图片（如 4000×3000）→ 确认边缘更锐利、无摩尔纹
3. 打开一张远小于屏幕的像素图（如 320×240），切换上采样为 Nearest → 确认像素边缘清晰
4. 关闭开关 → 确认行为完全回退到原图

### 翻页性能验证

1. 连续快速翻页 20+ 张 → 确认无卡顿无闪烁
2. 预取窗口内的后续图片应直接显示重采样版本，无"先模糊后锐利"的替换
3. 第一张图允许短暂原图→重采样替换

### 质量门禁

```bash
npm run lint            # 0 warning
npm run test            # 全部通过
npm run build           # 前端构建通过
npm run build:electron  # Electron 构建通过
```
