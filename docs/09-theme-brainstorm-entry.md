# Theme Brainstorm 入口文档（新对话提示词）

用途：给新对话直接粘贴，快速进入 theme 样式 brainstorm，避免先遍历仓库读取无关文件。

补充：若任务涉及圆角体系，请先对齐执行计划 `docs/cascading-radius-execution-plan-v1.md`，优先消费级联半径 token，避免新增固定 `8px/10px/12px`。

---

## 可直接复制的 Prompt

```text
你现在在 MediaPlayerX 项目中执行 theme brainstorm。

目标：
1) 仅做非结构性样式探索（不改布局结构，不改组件层级）。
2) 基于现有 theme/token 系统产出多套可落地候选。
3) 使用 Electron capturePage 批量截图生成 gallery，供用户选择。

严格约束：
- 不改 AppWorkspace 结构与 pane 布局逻辑。
- 不做业务逻辑改动。
- 优先改 token，其次才写局部 selector override。
- 若目标 style 为 `soft-skeuomorphic`，必须遵守拆分文件边界：
  - 全屏 transport 仅改 `soft-skeuomorphic.fullscreen-transport.css`
  - 非全屏 transport 仅改 `soft-skeuomorphic.main-transport.css`
  - runway/range 仅改 `soft-skeuomorphic.runway.css`
  - image-grid/manage 仅改 `soft-skeuomorphic.image-grid.css`
  - 通用组件仅改 `soft-skeuomorphic.components.css`
- 弹出面板内部结构优先复用内容层原语，避免重复写专有块：
  - `.mpx-overlay-merged-stack`
  - `.mpx-overlay-seamless-row` / `.mpx-overlay-seamless-cell`
  - `.mpx-overlay-result-list` / `.mpx-overlay-scroll-list`
  - `.mpx-overlay-field-row` / `.mpx-overlay-list-surface`
  - `.mpx-overlay-content-surface`
  - `.mpx-overlay-input` / `.mpx-overlay-chip-list` / `.mpx-overlay-chip` / `.mpx-overlay-chip-btn`
  - `.mpx-overlay-description` / `.mpx-overlay-caption` / `.mpx-overlay-list-item-truncate`
  - `.mpx-overlay-section` / `.mpx-overlay-actions` / `.mpx-overlay-actions-start` / `.mpx-overlay-actions-inline-end`
  - `.mpx-overlay-inline-icon-actions` / `.mpx-overlay-footer-actions` / `.mpx-overlay-footer-btn`
  - `.mpx-overlay-check-row`
- 仅读取并使用下列文件/目录，避免全仓库扫描：
  - src/features/theme/themeRegistry.ts
  - src/styles/themes/contract.css
  - src/styles/themes/index.css
  - src/styles/themes/styles/*.css
  - src/styles/themes/palettes/*.css
  - src/styles/app/layout.css
  - src/styles/app/sidebar.css
  - src/styles/app/main.css
  - src/styles/app/metadata.css
  - src/styles/app/settings.css
  - docs/ui/theme-gallery-capture.md
  - docs/ui/soft-skeuomorphic-detail-brainstorm.md

执行步骤：
1) 先读取上述文件，不要读取其他业务代码。
2) 提出 3 套风格候选（命名 + token 调整策略 + 风险点）。
3) 落地到 styles 文件（新建 style 变体），并接入 themeRegistry + themes/index.css。
4) 运行：
   npm run build
   npm run build:electron
   npm run theme:gallery -- --skip-build --styles "<候选列表>" --palettes "skeuomorphic-light,skeuomorphic-dark" --scenes "image-default,image-manage,image-metadata,settings-layout" --out-dir "docs/ui/theme-gallery"
5) 输出 gallery 路径与建议选择。

若涉及 `soft-skeuomorphic + skeuomorphic-luxury-white` 的播放器对齐，附加验收基线：
- 全屏 image/video/music 中间组统一 `gap 16 / btn 40 / icon 20`
- image 图标语义固定为：`play(翻转) / play / prev / next`
- 不得通过“文件尾兜底覆盖”破坏既有分层职责

输出格式要求：
- 列出改动文件清单。
- 列出每个候选的视觉关键词（3-5 个词）。
- 列出验证命令结果。
- 最后给出下一轮微调建议（仅 2-3 条）。
```

---

## 推荐起步命令

```bash
npm run build
npm run build:electron
```

```bash
npm run theme:gallery -- --skip-build --styles "soft-skeuomorphic,soft-skeuomorphic-crisp,soft-skeuomorphic-plush,soft-skeuomorphic-etched" --palettes "skeuomorphic-light,skeuomorphic-dark" --scenes "image-default,image-manage,image-metadata,settings-layout" --out-dir "docs/ui/theme-gallery"
```
