# Theme System V1 规范手册 (SSOT)

本文档是 MediaPlayer 主题系统的唯一事实来源。主题开发者应仅依靠本文档和 CSS 契约文件进行开发。

## 1. 核心原理
- **基于属性切换**：通过在 `html` 根元素设置 `data-mpx-theme="<themeId>"` 激活。
- **纯 CSS 驱动**：新增主题只需在指定目录下增加 `.css` 文件，无需修改 TypeScript 代码。
- **Token 隔离**：组件样式只引用 `--mpx-*` 开头的变量，禁止硬编码颜色。

## 2. 文件目录结构
- `src/styles/themes/contract.css`：Token 定义与默认回退值。
- `src/styles/themes/presets/*.css`：预设主题文件（自动加载）。
- `src/styles/themes/presets/_template.css`：新增主题模板。

## 3. 开发流程
1. **创建文件**：在 `src/styles/themes/presets/` 下新建 `my-theme.css`。
2. **定义作用域**：
   ```css
   :root[data-mpx-theme="my-theme"] {
     color-scheme: dark; /* 或 light */
     /* 按契约填充 token */
   }
   ```
3. **验证结果**：在“设置 -> theme 设置”中选择该主题。

## 4. Token 契约清单

### A. 基础 (Foundations)
- `--mpx-font-ui`：UI 主字体
- `--mpx-font-mono`：等宽字体
- `--mpx-radius-sm` / `md` / `lg` / `xl` / `pill`
- `--mpx-shadow-panel`：面板投影
- `--mpx-shadow-popover`：弹出层投影

### B. 语义色 (Semantic Colors)
#### Surfaces
- `--mpx-bg-app`：应用底层背景
- `--mpx-bg-workspace`：工作区背景
- `--mpx-bg-panel`：侧栏/面板背景
- `--mpx-bg-elevated`：悬浮/卡片背景
- `--mpx-bg-hover`：悬停反馈色
- `--mpx-bg-selected`：选中项背景
- `--mpx-bg-muted`：弱化背景
#### Text
- `--mpx-text-1`：主文本
- `--mpx-text-2`：次要文本
- `--mpx-text-3`：禁用/提示文本
- `--mpx-text-inverse`：反色文本
#### Borders
- `--mpx-border-1`：普通分割线
- `--mpx-border-2`：强边框
- `--mpx-border-focus`：聚焦边框色
#### Accent
- `--mpx-accent`：品牌/强调色
- `--mpx-accent-contrast`：强调色上的文本色
- `--mpx-accent-soft`：强调色弱化背景
#### Status
- `--mpx-status-danger-bg` / `border` / `text`
- `--mpx-status-warning-bg` / `border` / `text`
- `--mpx-status-info-bg` / `border` / `text`
- `--mpx-status-success-bg` / `border` / `text`

### C. 组件别名 (Component Aliases)
这些 token 默认指向语义色，可按需覆盖以微调特定组件。
- `--mpx-header-bg`：顶部导航栏背景
- `--mpx-sidebar-bullet-pending` / `running`
- `--mpx-splitter-track-bg` / `handle-bg`
- `--mpx-card-focus-ring`
- `--mpx-fullscreen-footer-bg`

## 5. 验收清单
- [ ] 所有 Banner (Error/Warning/Task) 背景与文字对比度符合 WCAG AA。
- [ ] 侧栏激活行在当前背景下清晰可辨。
- [ ] 向量检索/特征检索分割条在 hover 时有视觉反馈。
- [ ] 全屏模式下的控制按钮在深色/浅色图背景下均可读。
- [ ] 3D 向量宇宙的 HUD 面板不刺眼。
