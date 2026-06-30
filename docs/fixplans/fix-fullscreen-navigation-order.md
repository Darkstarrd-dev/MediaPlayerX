# 全屏导航排序修复方案

## 涉及的两个问题

1. **视频全屏上一集/下一集不按 sidebar 排序跳转**
2. **图片全屏进场自动跳回当前图包第一页**

---

## 问题 1：视频全屏上一集/下一集不按 sidebar 排序

### 根因

全屏视频导航的队列来自 `buildFullscreenLayerProps.ts:126-128` 的 `resolveSidebarQueueOverride()`，它返回 `rootScopedVideoIds` —— 这是**原始树的 DFS 顺序**。而 sidebar 实际展示的顺序经过了 `normalizePointerSidebarTree` 的 `media-first` 重排序。

两套排序的差异：

| 产物 | 来源 | 排序 |
|------|------|------|
| `rootScopedVideoIds` | `useVideoSidebarState.ts:111-116` → `collectLeafIds(videoRootNode, "video")` | 原始树 DFS（文件夹优先 + zh-CN 字母序） |
| `sidebarVideoQueueIds` | `useAppWorkspaceProps.impl.ts:313-319` → `collectVideoIdsBySidebarOrder(videoTreeForSidebar)` | sidebar 最终展示顺序（含 `media-first` 排序） |

调用链：

```
buildFullscreenLayerProps.ts:207  onPrevVideo: () => goPlaylist(-1, resolveSidebarQueueOverride())
buildFullscreenLayerProps.ts:208  onNextVideo: () => goPlaylist(1, resolveSidebarQueueOverride())
buildFullscreenLayerProps.ts:215  onVideoEnded: () => goPlaylist(1, resolveSidebarQueueOverride(), ...)
                                  ↓
buildFullscreenLayerProps.ts:126  resolveSidebarQueueOverride() → rootScopedVideoIds
                                  ↓
useAppWorkspaceProps.impl.ts:1197 goPlaylist(step, queueOverride, options)
                                  ↓ queueOverride 非 undefined，sidebarVideoQueueIds 回退被跳过
useMediaState.ts:98              goPlaylist(delta, sidebarQueueIds, options)
```

`normalizePointerSidebarTree` 在 `src/features/sidebar/normalizePointerSidebarTree.ts:12-32` 中通过 `compareSiblingNodes` 把媒体项排在文件夹前面（`siblingOrder: "media-first"`），但 `collectLeafIds` 遍历的是原始树，没有这个重排序。

### 修复方案

**修改 `buildFullscreenLayerProps.ts`**

将 `resolveSidebarQueueOverride` 改为返回 `undefined`，让 `useAppWorkspaceProps.impl.ts` 中的 wrapper 函数自动使用正确的 `sidebarVideoQueueIds`。

#### 改法 A（推荐）：直接移除 override，依赖 workspace wrapper 的 fallback

文件：`src/features/app/buildFullscreenLayerProps.ts`

**1. 删除 `resolveSidebarQueueOverride` 函数（第 126-129 行）**

**2. 修改第 207-208 行，移除 queue override 参数：**

```diff
-   onPrevVideo: () => params.goPlaylist(-1, resolveSidebarQueueOverride()),
-   onNextVideo: () => params.goPlaylist(1, resolveSidebarQueueOverride()),
+   onPrevVideo: () => params.goPlaylist(-1),
+   onNextVideo: () => params.goPlaylist(1),
```

**3. 修改第 215-217 行 `onVideoEnded`：**

```diff
-       params.goPlaylist(1, resolveSidebarQueueOverride(), {
-         preserveRate: true,
-       });
+       params.goPlaylist(1, undefined, { preserveRate: true });
```

**4. 从 Props 接口中移除 `rootScopedVideoIds` 字段（第 84 行）：**

```diff
interface BuildFullscreenLayerPropsParams {
   ...
-   rootScopedVideoIds: string[];
   ...
}
```

**5. 修改调用方 `useAppTopLayerState.ts:957` 和 `useAppTopLayerBindings.ts:760`**；移除 `rootScopedVideoIds` 的传递。

修改后，`goPlaylist` 在 `useAppWorkspaceProps.impl.ts:1197-1201` 中会正确回退：

```typescript
goPlaylist: (step, queueOverride, options) => {
  const effectiveQueueOverride =
    queueOverride ??
    (videoQueueSource === "sidebar" ? sidebarVideoQueueIds : undefined);
  goPlaylist(step, effectiveQueueOverride, options);
},
```

#### 改法 B（备选）：直接传入 sidebarVideoQueueIds

如果不想依赖 wrapper 的 fallback，可以在 `buildFullscreenLayerProps` 中直接接受 `sidebarVideoQueueIds` 并传入。但此方案需要在多个文件中传递新参数，改动面较大。

### 影响范围

- `src/features/app/buildFullscreenLayerProps.ts`
- `src/features/app/buildFullscreenLayerProps.test.ts`
- `src/features/app/useAppTopLayerState.ts`
- `src/features/app/useAppTopLayerBindings.ts`
- 键盘快捷键路径 `useAppInteractionEffects.impl.ts:774` 同样使用了 `Array.from(rootScopedVideoIds)`，该处也需同步修复：
  - 将第 774 行的 `Array.from(rootScopedVideoIds)` 改为使用 `sidebarVideoQueueIds`
  - 或在 `useAppInteractionEffects.impl.ts` 中导出/接收正确的 sidebar 排序队列

### 验证方法

1. 在 sidebar 中确认视频排列顺序与展示顺序一致
2. 进入全屏视频播放，按 Ctrl+ArrowDown 或点击下一集按钮
3. 验证跳转顺序与 sidebar 中的视频顺序完全一致
4. 视频播放结束自动跳下一集，验证顺序一致

---

## 问题 2：图片全屏进场自动跳回当前图包第一页

### 根因

`src/features/app/useAppInteractionLayer.ts:435-447` 中存在一个 fallback 效应：

```typescript
// 第 435-447 行
if (
    fullscreenActive &&
    mode === "video" &&
    fullscreenDisplay !== "video-only" &&
    (!focusedImage || !imageFocusActive)
) {
    ensureImageFocusFromSidebar({
      syncSidebarNode: false,
      preferSidebarFirst: true,
    });
} else if (fullscreenActive && !focusedImage && mode === "image") {
    ensureImageFocusFromSidebar();  // ← 问题分支
}
```

`ensureImageFocusFromSidebar` 函数（第 327-432 行）在 `focusedImage` 为 null 时执行 fallback，调用 `findFirstVisibleImageIndex(fallbackPackageId)` 获取该图包第一个非隐藏图片的索引（几乎总是 `0`），然后强制写入：

```typescript
setFocusByPackage((previous) => ({
    ...previous,
    [fallbackPackageId]: fallbackImageIndex,  // ← 重置为 0
}));
setPageByPackage((previous) => ({
    ...previous,
    [fallbackPackageId]: fallbackPageIndex,  // ← 页面重置为 0
}));
```

**触发条件：**

1. **`mode === "image"` 且 `focusedImage === null` 时进入全屏** —— 最常见场景：
   - 用户通过键盘快捷键（Enter）进入全屏，但未先点击任何图片（`imageFocusActive` 为 false）
   - 结构性分页导致当前图包的 `images` 数组为空（`packageById.get(pkgId).images` 为空），使 `focusedImage` 为 null
   - 系统初始化/数据刷新期间 `focusedRef` 暂时为 null

2. **从视频模式进入 dual 全屏** —— `mode === "video" && fullscreenDisplay !== "video-only"` 且无已有图片焦点

### 修复方案

#### 方案 A（推荐）：保留已有的 focus，不回退到 index 0

文件：`src/features/app/useAppInteractionLayer.ts`

**修改 `ensureImageFocusFromSidebar` 函数（约第 327-432 行）：**

在函数开头增加一个检查：若 `focusByPackage` 中已有当前包的合法焦点值，直接复用而不重置到第一张。

```typescript
const ensureImageFocusFromSidebar = (options?: {
    syncSidebarNode?: boolean;
    preferSidebarFirst?: boolean;
}) => {
    const syncSidebarNode = options?.syncSidebarNode ?? true;
    const preferSidebarFirst = options?.preferSidebarFirst ?? false;
    const firstImageSidebarNode = findFirstImageNodeFromTree(imageTreeForSidebar);

    // ... findFirstVisibleImageIndex 定义保持不变 ...

    // --- 新增：尝试保留已有焦点 ---
    // 若 selectedPackageId 有效且 focusByPackage 中已有合法索引，直接使用该索引
    const currentPackage = packageByIdEffective.get(selectedPackageId);
    if (currentPackage && resolveSourceImageCount(currentPackage) > 0) {
      const existingFocus = focusByPackage[selectedPackageId];
      if (typeof existingFocus === 'number' && existingFocus >= 0) {
        const clampedFocus = clamp(
          existingFocus,
          0,
          resolveSourceImageCount(currentPackage) - 1,
        );
        // 已有合法焦点，不触发 fallback 重置
        if (!imageFocusActive) {
          setImageFocusActive(true);
        }
        // 确保 focusByPackage 和 pageByPackage 中有该包的值（可能 unchanged）
        setFocusByPackage((previous) => {
          if (previous[selectedPackageId] === clampedFocus) return previous;
          return { ...previous, [selectedPackageId]: clampedFocus };
        });
        setPageByPackage((previous) => {
          const page = Math.floor(clampedFocus / Math.max(1, pagedPageSize));
          if (previous[selectedPackageId] === page) return previous;
          return { ...previous, [selectedPackageId]: page };
        });
        if (syncSidebarNode) {
          const nodeId = normalImageSourceNodeIdMap.get(selectedPackageId)
            ?? imageSourceNodeIdMap.get(selectedPackageId) ?? null;
          if (nodeId) {
            setSelectedSidebarNodeId(nodeId);
            requestAnimationFrame(() => ensureSidebarNodeVisible(nodeId));
          }
        }
        return true;
      }
    }
    // --- 新增结束 ---

    // 以下为原有的 fallback 逻辑（仅在确实没有焦点时执行）
    const fallbackPackageId = preferSidebarFirst
        ? /* ... 原有逻辑 ... */
    // ...
};
```

#### 方案 B（最小改动）：仅对 `mode === "image"` 分支增加焦点保留检查

文件：`src/features/app/useAppInteractionLayer.ts`

**修改第 445-447 行的 else-if 分支：**

```diff
-   } else if (fullscreenActive && !focusedImage && mode === "image") {
-     ensureImageFocusFromSidebar();
-   }
+   } else if (
+     fullscreenActive &&
+     !focusedImage &&
+     mode === "image" &&
+     !(activePackage && focusByPackage[activePackage.id] !== undefined)
+   ) {
+     // 仅当 focusByPackage 中确实没有当前包的焦点记录时才触发 fallback
+     ensureImageFocusFromSidebar();
+   }
```

同时需要确保 `focusByPackage` 和 `activePackage` 在 useEffect 的依赖数组中（当前 `focusByPackage` 在 lines 169-170 被 `void` 关键字屏蔽了 lint 警告但未在依赖数组中）。

### 影响范围

- `src/features/app/useAppInteractionLayer.ts`（主要修改）
- 需注意 `focusByPackage` 和 `activePackage` 当前被 `void` 屏蔽（lines 169-170），修复时需要将它们加入 useEffect 的依赖数组，或使用 ref 避免循环依赖

### 验证方法

1. 在图片网格视图中，不点击任何图片，直接按 Enter 进入全屏
   - 验证：应展示网格视图中可见区域内第一张图片（而非强制跳回包的第一页）
2. 在图片视图中选中某张图片（例如第 3 页第 5 张），然后进入全屏
   - 验证：应展示所选的第 3 页第 5 张图片（而非第 1 页第 1 张）
3. 在全屏图片浏览中翻页，退出全屏，再重新进入
   - 验证：应展示退出前最后浏览的那张图片
4. 从视频模式进入 dual 全屏
   - 验证：左侧图片区域如有已有焦点则保留，无焦点时回退到 sidebar 首个图包的首张图

---

## 实施建议

1. **优先修复问题 2**（图片跳回第一页）：用户体验影响更大，且修复方案较简单
2. **问题 1 的改法 A** 改动面小、风险低，推荐采用
3. 两个问题修改完成后，需同步更新对应测试文件
4. 务必通过 `npm run lint`、`npm run test`、`npm run build` 三关验证
