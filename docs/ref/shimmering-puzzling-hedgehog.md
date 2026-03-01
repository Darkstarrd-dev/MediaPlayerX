# 缩略图自适应布局修复方案 v2

## Context

前一版方案已实施，但出现两个新问题：
1. `computeRenderGap` 在列数变化时（如拖动分割条导致列数从 N 变为 N-1），epsilon 剧增至接近一整列宽度，被均匀分摊后导致 gap 极大（如从 8px 变为 33px+），缩略图卡片虽然 `width` 不变但在 CSS Grid 中因总宽度超出容器而被截断
2. metadata toolbar/footer 的 paddingInline 对齐策略实际观感不佳，用户希望改为：图片放大填满容器宽度，上下部分可截断

---

## 问题 1 修复：`computeRenderGap` gap 暴增

### 根因分析

`computeRenderGap` 当前逻辑：
```typescript
adjusted = (gridWidth - columns * cellWidth) / (columns - 1);
return adjusted >= baseGap ? adjusted : baseGap;
```

当列数从 5 降到 4（cellWidth=150, baseGap=8, gridWidth=700）：
- `adjusted = (700 - 4×150) / 3 = 100/3 ≈ 33.3px` — 远超 baseGap 的 8px
- CSS Grid 渲染出 4 列 + 33px 间距，视觉上间隔极大
- 且 `4×150 + 3×33.3 = 700px` 精确填满，gap snap 的 `rightGap` 为 0，不会触发修正

### 方案：限制 per-gap 增量上限

只在 epsilon 较小时分摊（per-gap 增量不超过 cellWidth 的一个小比例）。超过时回退到 baseGap，让 gap snap 处理大间隙。

**修改 `src/features/layout/thumbnailLayout.ts` 的 `computeRenderGap`：**

```typescript
export function computeRenderGap(params: {
  gridWidth: number;
  columns: number;
  cellWidth: number;
  baseGap: number;
}): number {
  if (params.columns <= 1) return params.baseGap;
  const totalGapSpace = params.gridWidth - params.columns * params.cellWidth;
  if (totalGapSpace <= 0) return params.baseGap;
  const perGap = totalGapSpace / (params.columns - 1);
  // 限制 per-gap 增量：不超过 baseGap + cellWidth 的 8%
  const maxPerGap = params.baseGap + Math.max(2, params.cellWidth * 0.08);
  return perGap <= maxPerGap ? perGap : params.baseGap;
}
```

效果：
- cellWidth=150, baseGap=8 → maxPerGap = 8+12 = 20px
- epsilon 6px (3 gaps): perGap ≈ 10px ≤ 20 → 分摊 ✓，右侧完美对齐
- epsilon 76px (3 gaps): perGap ≈ 33px > 20 → 回退 baseGap=8，右侧留白 76px，gap snap 修正

**同步修改 `GAP_SNAP_RENDER_GAP_SKIP_RATIO`：**

当前 `GAP_SNAP_RENDER_GAP_SKIP_RATIO = 0.3`（rightGap < cellWidth×0.3 时 skip snap）。需要让此阈值与 renderGap 的可分摊范围匹配。

renderGap 最大可分摊的总 epsilon：
- `maxExtraPerGap = cellWidth * 0.08`
- 总额 = `maxExtraPerGap * (columns - 1)` ≈ `cellWidth * 0.08 * (columns-1)`
- 对于 columns=4: `150 * 0.08 * 3 = 36px`，占 cellWidth 的 24%

将 `GAP_SNAP_RENDER_GAP_SKIP_RATIO` 从 0.3 调整为 0.15（更保守）。当 renderGap 无法分摊时 snap 能及时介入。

### 修改文件
- `src/features/layout/thumbnailLayout.ts` — 修改 `computeRenderGap`
- `src/features/app/useAppNavigationState.ts` — 调整 `GAP_SNAP_RENDER_GAP_SKIP_RATIO`
- `src/features/layout/thumbnailLayout.test.ts` — 更新/补充测试

---

## 问题 2 修复：metadata 图片改为宽度填满、上下截断

### 新需求

用户不满意 paddingInline 对齐策略。改为：
- 图片**始终填满容器宽度**（`width: 100%`）
- 高度按比例缩放，超出容器部分垂直截断
- 这样 toolbar/footer 自然与图片左右对齐（都是容器全宽）

### 方案：修改 CSS + 移除 inset 逻辑

**Step 1 — 修改 `.metadata-image-real` CSS (`src/styles/app/metadata.css`)**

```css
/* 旧 */
.metadata-image-real {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
}

/* 新 */
.metadata-image-real {
  width: 100%;
  height: auto;
  max-width: 100%;
  /* 移除 max-height: 100% — 允许图片高度超出容器 */
  object-fit: contain; /* width: 100% 时等效于 cover 的宽度行为 */
  object-position: center center;
}
```

`.metadata-image-canvas` 已有 `overflow: hidden` 和 `align-items: center`：
- 宽图：`width: 100%` 填满宽度，高度按比例缩放，可能小于容器高度 → 垂直居中
- 窄/高图：`width: 100%` 填满宽度，高度按比例缩放超出容器 → `align-items: center` 垂直居中 + `overflow: hidden` 截断上下

**Step 2 — 移除 inset 对齐逻辑**

`src/components/metadata/MetadataImageEditor.tsx`：
- 移除 `onImageAlignInsetChange` prop
- 移除 ResizeObserver 测量 effect（第 338-401 行）
- 移除 `imageElementRef`、`imageCanvasElementRef`（如果仅用于 inset 测量）

`src/components/MetadataPanel.tsx`：
- 移除 `metadataImageAlignInsetPx` state
- 移除 `METADATA_IMAGE_ALIGN_MIN_INSET_PX` 常量
- 移除 `metadataAlignStyle` 计算
- 移除 toolbar/footer 上的 `style={metadataAlignStyle}`
- 移除 `handleImageAlignInsetChange` callback
- 移除传给 `MetadataImageEditor` 的 `onImageAlignInsetChange` prop

`src/styles/app/metadata.css`：
- 移除 `.metadata-head` 的 `transition: padding-inline 0.12s ease;`
- 移除 `[data-slot="fg-meta-footer"]` 的 `transition: padding-inline 0.12s ease;`

**Step 3 — 检查 `isMetadataImageHeightBound` 的影响**

`useAppNavigationState.ts` 中的 `isMetadataImageHeightBound()` 通过 DOM 查询 `.metadata-image-real` 的 `getBoundingClientRect().height` 和 `.metadata-image-canvas` 的高度来判断图片是否贴边。

改为 `width: 100%` 后：
- 图片的渲染宽度始终等于 canvas 宽度
- 图片的渲染高度可能超出 canvas 高度
- `isMetadataImageHeightBound` 检测 `imageHeight >= canvasContentHeight - epsilon`
- 对于高图（高度 > canvas），条件为 true → 仍然触发右避让策略

这是正确的行为：高图填满宽度后高度溢出，说明容器对图片有约束力，右避让策略应继续生效。

### 修改文件
- `src/styles/app/metadata.css` — 修改 `.metadata-image-real` 样式，移除 transition
- `src/components/metadata/MetadataImageEditor.tsx` — 移除 inset 测量逻辑
- `src/components/MetadataPanel.tsx` — 移除 inset 状态和 paddingInline 逻辑

---

## 实施顺序

1. **问题 1**：修改 `computeRenderGap` + 调整 snap skip ratio
2. **问题 2**：修改 CSS + 清理 inset 代码

## 验证方案

1. `npm run test` — 全部测试通过
2. `npm run lint` — 0 warning
3. `npm run build` — 构建成功
4. `npm run dev:desktop` 实机验证：
   - 拖动分割条：缩略图保持 1:1 比例，间隔不暴增
   - 不同列数下右侧对齐效果（小 epsilon 被分摊，大 epsilon 由 snap 修正）
   - metadata 图片始终填满面板宽度，高图上下截断、垂直居中
   - toolbar/footer 与图片自然左右对齐
   - 快速拖动分割条无振荡
