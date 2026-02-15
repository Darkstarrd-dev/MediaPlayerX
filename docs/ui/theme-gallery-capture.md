# Theme Layout Mock 工作流（Electron `capturePage`）

目标：在不改结构布局（Layout Structure）的前提下，批量产出多套主题样式截图，供选择后再落地为 App 实际 theme。

---

## 1) 现状与边界

- 固定结构：不引入 pane 重排，不改 `AppWorkspace` 结构。
- 可变范围：style 层 token + 非结构性单 area 变换（如 header 偏斜、pane 浮动错位感）。
- 数据源：强制 `mock repository`，避免真实库差异干扰视觉评审。
- 自动化选择器：优先使用 `data-a11y-id` 稳定选择器，禁止新脚本仅依赖 `aria-label` 文案。

---

## 2) 已落地能力

### 2.1 批量截图脚本

- 命令：`npm run theme:gallery`
- 脚本：`scripts/capture-theme-gallery.mjs`
- 截图引擎：Electron 主进程 `BrowserWindow.capturePage()`
- 主进程运行时：`electron/themeGalleryCaptureRuntime.ts`

### 2.2 产物结构

默认输出目录：`docs/ui/theme-gallery/<run-tag>/`

- `index.html`：可直接浏览的 gallery 页面
- `manifest.json`：完整 capture 清单与配置
- `images/*.png`：每张截图

文件名格式：

`<序号>_<scene-id>__<style-id>__<palette-id>.png`

### 2.3 预置 scene（可扩展）

- `image-default`
- `image-manage`
- `image-metadata`
- `image-search`
- `video-default`
- `music-default`
- `settings-layout`

---

## 3) 常用命令

### 3.1 默认矩阵

```bash
npm run theme:gallery
```

### 3.2 指定 style/palette/scene

```bash
npm run theme:gallery -- \
  --styles "soft-skeuomorphic,neobrutalism,liquid-glass" \
  --palettes "skeuomorphic-light,skeuomorphic-dark,parchment" \
  --scenes "image-default,image-manage,settings-layout"
```

### 3.3 指定窗口尺寸与输出目录

```bash
npm run theme:gallery -- \
  --width 1920 \
  --height 1080 \
  --out-dir "docs/ui/theme-gallery"
```

---

## 4) 非结构性单 area 变换（已纳入 token 体系）

为支持未来 brutalism / floating 风格的“弱关联浮动感”，新增并接通 Header 变换 token：

- `--mpx-header-transform`
- `--mpx-header-transform-origin`
- `--mpx-header-transition`

对应接线：`src/styles/app/layout.css`。

Pane 侧（此前已存在）可继续用：

- `--mpx-sidebar-transform`
- `--mpx-main-transform`
- `--mpx-metadata-transform`

建议：

- 先用小幅旋转/平移（`rotate(-0.6deg)`、`translateY(4px)`）构建风格感。
- 避免大幅 transform 影响交互热区与分割条命中。

---

## 5) 落地节奏建议

1. 先固定 scene 集合（评审基线）。
2. 批量生成 style 候选并截图。
3. 在 gallery 中筛选 1~2 套候选。
4. 只对胜出候选做细节打磨（hover/active/密度/对比度）。
5. 最后补一轮同 scene 的视觉回归截图。

---

## 6) Soft Skeuomorphic 细节探索

- 细节变体定义与选择基线：`docs/ui/soft-skeuomorphic-detail-brainstorm.md`
- 新对话入口提示词：`docs/ui/theme-brainstorm-entry.md`
