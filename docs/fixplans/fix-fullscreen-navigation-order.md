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

### 类型差异说明（重要）

`rootScopedVideoIds` 在传递链路中存在 **`Set<string>` → `string[]` 的类型转换**，移除该字段前必须厘清：

| 文件 | 行号 | 类型 | 说明 |
|------|------|------|------|
| `useVideoSidebarState.ts` | 23, 111-116 | `Set<string>` | **源头**，`new Set(collectLeafIds(...))` |
| `useAppSidebarScopeState.ts` | 112 | `Set<string>` | 透传 |
| `useAppEffects.ts` | 65 | `Set<string>` | 透传，`rootScopedVideoIds.has(selectedVideoId)` 依赖 Set 语义 |
| `usePersistedSessionCursor.ts` | 52, 334-341 | `Set<string>` | 透传，`.size` / `.has()` / `Array.from()[0]` |
| `useAppInteractionEffects.impl.ts` | 419, 774 | `Set<string>` | 来自 sidebarScopeState，`Array.from(rootScopedVideoIds)` 在此是必要的 Set→Array |
| **`useAppTopLayerBindings.ts`** | **760** | **转换点** | `rootScopedVideoIds: Array.from(rootScopedVideoIds)` —— **Set→Array 的唯一转换点** |
| `useAppTopLayerState.ts` | 314 | `string[]` | 接收转换后的数组 |
| `buildFullscreenLayerProps.ts` | 84 | `string[]` | 接收数组 |
| `buildFullscreenLayerProps.test.ts` | 49 | `string[]` | 测试用例直接传数组 |

**结论**：改法 A 移除 `buildFullscreenLayerProps.ts:84` 的 `rootScopedVideoIds` 字段后，**仅需同步移除 `useAppTopLayerState.ts` 和 `useAppTopLayerBindings.ts` 中向 `buildFullscreenLayerProps` 传递该字段的路径**。`useAppEffects.ts`、`usePersistedSessionCursor.ts`、`useAppSidebarScopeState.ts` 中作为 `Set<string>` 的 `rootScopedVideoIds` **不受影响，保留不动**（它们不经过 `buildFullscreenLayerProps`，且依赖 Set 语义）。

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

**5. 修改调用方 `useAppTopLayerState.ts:957` 和 `useAppTopLayerBindings.ts:760`**：移除向 `buildFullscreenLayerProps` 传递 `rootScopedVideoIds` 的代码。

  - `useAppTopLayerBindings.ts:760`：删除 `rootScopedVideoIds: Array.from(rootScopedVideoIds),` 这一行（这是 Set→Array 的转换点，移除字段后该转换不再需要）。
  - `useAppTopLayerState.ts:957` 附近：移除 `rootScopedVideoIds` 从 `BuildFullscreenLayerPropsParams` 的传递。
  - **注意**：`useAppTopLayerBindings.ts` 中 `rootScopedVideoIds`（Set 形态）本身**保留**，因为它可能还被该文件内其他逻辑引用；仅移除"向 buildFullscreenLayerProps 传递"的那一行。

**6. 同步修复 `useAppInteractionEffects.impl.ts:774`（必须，非二选一）**：

  该行当前为 `const sidebarQueueIds = Array.from(rootScopedVideoIds);`，其中 `rootScopedVideoIds` 来自 `sidebarScopeState`（第 419 行解构），类型为 `Set<string>`。虽然此处不经过 `buildFullscreenLayerProps`，但它与问题 1 同根——用的也是未经 media-first 排序的原始树顺序。

  **决断**：改为使用 `sidebarVideoQueueIds`（已经过 media-first 排序的数组）。

  - 将 `sidebarVideoQueueIds` 从 `useAppWorkspaceProps.impl.ts` 经 props 链路传入 `useAppInteractionEffects.impl.ts` 的入参（该 hook 当前未接收此字段，需新增 props 透传）。
  - 或：将该 `goPlaylist` 调用改为走 workspace 的 wrapper（即调用经过 `useAppWorkspaceProps.impl.ts:1197` 包装后的 `goPlaylist`，让 wrapper 自动 fallback 到 `sidebarVideoQueueIds`）。**推荐此方案**，因为它与改法 A 的思路一致，且避免新增 props 透传链路。
  - 修改后第 774 行简化为：直接调用 wrapper `goPlaylist(step)`，无需手动构造 `sidebarQueueIds`。

  ```diff
  -   goPlaylist: (step) => {
  -     const sidebarQueueIds = Array.from(rootScopedVideoIds);
  -     if (videoQueueSource === "sidebar") {
  -       goPlaylist(step, sidebarQueueIds);
  -       return;
  -     }
  -     goPlaylist(step);
  -   },
  +   goPlaylist: (step) => {
  +     goPlaylist(step);  // 走 workspace wrapper，自动 fallback 到 sidebarVideoQueueIds
  +   },
  ```

  **注意**：此修改的前提是 `useAppInteractionEffects.impl.ts` 中的 `goPlaylist` 引用的是 workspace wrapper（`useAppWorkspaceProps.impl.ts:1197` 的版本），而非底层 `useMediaState.ts` 的原始 `goPlaylist`。实施时需确认该 hook 接收的 `goPlaylist` 来自哪一层。若来自底层，则需改为接收 wrapper 版本，或在此处显式传入 `sidebarVideoQueueIds`。

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
- `src/features/app/useAppInteractionEffects.impl.ts`（第 774 行，修复方式见上文"改法 A 第 6 点"）

### 测试更新清单

**`buildFullscreenLayerProps.test.ts`**（必须修改）：

| 现有用例 | 行号 | 修改方式 |
|----------|------|---------|
| `rootScopedVideoIds: ['video-a', 'video-b']` | 49 | 删除该字段（字段已从 Props 接口移除） |
| `expect(params.goPlaylist).toHaveBeenCalledWith(1, params.rootScopedVideoIds, ...)` | 119 | 改为 `toHaveBeenCalledWith(1, undefined, ...)`（移除 override 后传 undefined，由 wrapper fallback） |
| `expect(params.goPlaylist).toHaveBeenNthCalledWith(1, -1, params.rootScopedVideoIds)` | 131-132 | 同上，改为 `undefined` |

**新增测试用例**：

| 用例 | 验证点 |
|------|--------|
| `goPlaylist(-1) 传入 undefined 作为 queueOverride` | 确认 override 被移除，依赖 wrapper fallback |
| `goPlaylist(1, undefined, { preserveRate: true })` for onVideoEnded | 同上 |
| `onPrevVideo/onNextVideo 调用后 goPlaylist 第一参数为 ±1` | 确保方向正确 |

**`useAppInteractionEffects.impl.ts` 相关测试**（若有）：
- 确认 `goPlaylist(step)` 调用不再手动构造 `sidebarQueueIds`，而是直接透传给 wrapper。

### 回滚方案

若移除 `rootScopedVideoIds` 字段后 fallback 行为不符合预期（如 `sidebarVideoQueueIds` 为空导致导航失败）：

1. **快速回滚**：`git revert` 本次 commit，恢复 `resolveSidebarQueueOverride` 和 `rootScopedVideoIds` 字段。
2. **部分回滚**：仅恢复 `buildFullscreenLayerProps.ts` 的 `resolveSidebarQueueOverride`，但改为返回 `Array.from(rootScopedVideoIds)` 时显式标注"未经 media-first 排序"的 TODO，作为临时回退。
3. **注意**：回滚时 `useAppInteractionEffects.impl.ts:774` 的修改需同步回滚，否则该处仍依赖已被移除的 `sidebarVideoQueueIds` 透传。

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

    // 以下为原有的 fallback 逻辑（完全保留不变，仅在上述前置检查未 return 时执行）
    // 即：当 focusByPackage 中没有当前包的合法焦点时，才走原有的"回退到首张"逻辑
    const fallbackPackageId = preferSidebarFirst
        ? firstSidebarPackageId ||
          (selectedPackageUsable ? selectedPackageId : "") ||
          orderedRootScopedPackages.find(
            (pkg) => resolveSourceImageCount(pkg) > 0,
          )?.id ||
          scopedImageSourcesEffective.find(
            (source) => resolveSourceImageCount(source) > 0,
          )?.id ||
          ""
        : selectedPackageUsable
          ? selectedPackageId
          : firstSidebarPackageId ||
            orderedRootScopedPackages.find(
              (pkg) => resolveSourceImageCount(pkg) > 0,
            )?.id ||
            scopedImageSourcesEffective.find(
              (source) => resolveSourceImageCount(source) > 0,
            )?.id ||
            "";

    if (!fallbackPackageId) {
        return false;
    }

    const fallbackImageIndex = findFirstVisibleImageIndex(fallbackPackageId);
    if (fallbackImageIndex === null) {
        return false;
    }

    // ... 以下为原有的 setSelectedPackageId / setImageFocusActive /
    //     setFocusByPackage / setPageByPackage / setSelectedSidebarNodeId 逻辑 ...
    //     （见 useAppInteractionLayer.ts:398-432，保持不变）
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

**依赖数组修复方案（二选一，推荐 ref 方案）**：

**方案 B-1（ref 方案，推荐）**：用 ref 镜像 `focusByPackage`，避免 effect 频繁重跑。

```typescript
// 在 useEffect 外部声明 ref
const focusByPackageRef = useRef(focusByPackage);
useEffect(() => {
  focusByPackageRef.current = focusByPackage;
}, [focusByPackage]);

// 在 useEffect 内部读取 ref 而非闭包变量
// 将条件中的 focusByPackage[selectedPackageId] 改为：
//   focusByPackageRef.current[selectedPackageId]
// effect 依赖数组不新增 focusByPackage，避免循环触发
```

**方案 B-2（加入依赖数组）**：直接将 `focusByPackage` 和 `selectedPackageId` 加入 effect 依赖数组。

- 风险：每次 `focusByPackage` 变化（用户翻页、点击图片）都会重跑该 effect，可能触发不必要的 `ensureImageFocusFromSidebar` 调用。
- 缓解：在 effect 开头加 early return 守卫——仅当 `fullscreenActive && !focusedImage && mode === "image"` 且 `focusByPackage` 中无合法焦点时才继续，否则 return。
- 需验证：翻页时 `focusedImage` 非空，early return 生效，不会重复触发 fallback。

**注意**：当前 `void focusByPackage; void selectedPackageId;`（lines 169-170）仅用于消除"未使用变量"lint 警告。若改用 ref 方案，这些 `void` 可保留（仍需消除 lint）；若改用依赖数组方案，需删除对应的 `void` 并将变量加入依赖数组。

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
