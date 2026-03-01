# 缩略图自适应布局收尾修复方案 v3

## Context

v2 方案实施后大部分问题已解决，剩余三个边界情况需要收尾。

---

## 问题 1：高度变化后 snap 不触发（import panel 展开/收起）

### 根因

Effect 2（容器尺寸变化检测，`useAppNavigationState.ts:839-881`）在高度变化时只清除了 `lastSnapTimeRef` 和 `snapTargetWidthRef`，但**未清除**以下反振荡状态：

```typescript
// 第 848-852 行 — 当前只清除了这两个：
if (heightChanged) {
  lastSnapTimeRef.current = 0;
  snapTargetWidthRef.current = 0;
  // ❌ 缺失：snapTargetColumnsRef、snapDirectionRef、snapReverseCountRef
}
```

导致 `applyGapSnap` 中的以下守卫阻挡了本应触发的 snap：
- **列数锁定守卫**（第 417-423 行）：`snapTargetColumnsRef` 未清除，若列数恰好匹配锁定值且 `rightGap < cellWidth * 0.5`，snap 被拒绝
- **方向反转熔断**（第 424-426 行）：`snapReverseCountRef >= MAX_SNAP_REVERSES` 时所有 snap 被拒绝

### 方案

在 Effect 2 的高度变化分支中，完整重置所有反振荡状态：

```typescript
if (heightChanged) {
  lastSnapTimeRef.current = 0;
  snapTargetWidthRef.current = 0;
  snapTargetColumnsRef.current = 0;     // 新增
  snapDirectionRef.current = null;       // 新增
  snapReverseCountRef.current = 0;       // 新增
}
```

### 修改文件
- `src/features/app/useAppNavigationState.ts` — Effect 2 高度变化分支（~第 848 行）

---

## 问题 2：rightGap 接近整列宽度时避让不触发

### 根因

`resolveMainDeltaByGap` 计算避让 delta：
```typescript
const resolveMainDeltaByGap = (gap: number) =>
  gap <= halfCell ? -gap : cellSpan - gap + GAP_SNAP_EXPAND_BUFFER_PX;
```

当 `rightGap ≈ cellSpan - 1`（差一两个像素就能放下一整列）：
- `mainDelta = cellSpan - (cellSpan - 1) + 2 = 3px`
- 在第 575 行被 `Math.abs(mainDelta) < GAP_SNAP_MIN_PX(4)` 拦截，snap 不触发

### 方案

将 `GAP_SNAP_EXPAND_BUFFER_PX` 从 2 增加到 `GAP_SNAP_MIN_PX + 1 = 5`。这样即使 `rightGap = cellSpan - 1`，`mainDelta = 1 + 5 = 6 > 4`，snap 可以触发。

```typescript
// 旧：
const GAP_SNAP_EXPAND_BUFFER_PX = 2;
// 新：
const GAP_SNAP_EXPAND_BUFFER_PX = 5;
```

影响评估：多请求 3px 的扩展空间。对于 `pickClosestCols` 来说，额外 3px 不会导致溢出（因为 `pickClosestCols` 有 0.5px 的溢出容差）。对 metadata ratio 的影响微乎其微（3px / bodyWidth ≈ 0.002）。

### 修改文件
- `src/features/app/useAppNavigationState.ts` — 常量 `GAP_SNAP_EXPAND_BUFFER_PX`（第 37 行）

---

## 问题 3：拖动分割条时缩略图垂直裁剪 + 间距放大

### 根因

CSS `gap` 是 `row-gap` 和 `column-gap` 的简写。`computeRenderGap` 返回的调整后 gap 通过 `gap: ${thumbnailGap}px` 同时应用于**水平和垂直**方向：

```tsx
style={{
  gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
  gap: `${thumbnailGap}px`,  // ← 同时影响行间距和列间距
}}
```

当 renderGap 比 baseGap 大时，行间距也增大，导致：
- 行与行之间间隔变大
- 总行高可能超出容器高度
- 缩略图因容器 `overflow: hidden` 被垂直裁剪（从下往上）

### 方案

将 CSS `gap` 拆分为 `rowGap`（固定 baseGap）和 `columnGap`（renderGap）。

**Step 1** — 新增返回值：在 `useAppNavigationState.ts` 中增加 `actualThumbnailRowGap`

```typescript
const actualThumbnailRowGap = thumbnailLayout.gap;  // 始终使用 base gap
```

在 return 中增加 `actualThumbnailRowGap`。

**Step 2** — 透传 prop：沿着现有的 prop 链路透传

- `useAppWorkspaceProps.types.ts` — 新增 `actualThumbnailRowGap: number`
- `useAppWorkspaceBindings.ts` — 透传
- `useAppWorkspaceProps.impl.ts` — 透传
- `buildImageMainSectionProps.ts` — 新增参数 `actualThumbnailRowGap`，传给 `thumbnailRowGap`
- `ImageMainSection.types.ts` — 新增 `thumbnailRowGap: number`

**Step 3** — 修改渲染器：`ImageMainSection.renderers.tsx`

两处网格渲染（普通模式第 258-261 行、node-browse 模式第 114-117 行）：

```tsx
// 旧：
style={{
  gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
  gap: `${thumbnailGap}px`,
}}

// 新：
style={{
  gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
  rowGap: `${thumbnailRowGap}px`,
  columnGap: `${thumbnailGap}px`,
}}
```

### 修改文件
- `src/features/app/useAppNavigationState.ts` — 新增 `actualThumbnailRowGap` 返回值
- `src/features/app/useAppWorkspaceProps.types.ts` — 新增字段
- `src/features/app/useAppWorkspaceBindings.ts` — 透传
- `src/features/app/useAppWorkspaceProps.impl.ts` — 透传
- `src/features/app/buildImageMainSectionProps.ts` — 新增参数
- `src/components/ImageMainSection.types.ts` — 新增 prop
- `src/components/ImageMainSection.renderers.tsx` — 拆分 gap 为 rowGap + columnGap

---

## 实施顺序

1. **问题 3**（拆分 rowGap/columnGap）— 消除垂直裁剪，最高优先级
2. **问题 2**（增大 buffer）— 一行常量修改
3. **问题 1**（清除高度变化反振荡状态）— 补全 Effect 2 的状态清除

## 验证方案

1. `npm run test` — 全部测试通过
2. `npm run lint` — 0 warning
3. `npm run build` — 构建成功
4. `npm run dev:desktop` 实机验证：
   - 向右拖动分割条：缩略图保持正方形，垂直方向不裁剪，行间距不变
   - rightGap 接近整列宽度时：snap 自动触发避让，填满空列
   - 反复展开/收起 import panel：每次都能正确收敛到最优布局
   - 连续快速操作（拖拽+缩放+面板切换）：无振荡卡死
