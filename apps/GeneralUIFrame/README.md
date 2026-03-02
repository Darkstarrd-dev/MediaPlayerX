# GeneralUIFrame

GeneralUIFrame 是在线应用基座工程，用于复用 MediaPlayerX 的主题系统与 UI 框架。

当前阶段仅落地：

- 主题与 token 系统（`src/styles/themes`）
- 模块化 UI 容器结构（侧栏模块列表 + 主内容区）
- 占位模块（执行逻辑暂空）
- 设置面板 UI（仅“界面设置”分页，含外观/布局/工作区比例）
- 界面设置本地持久化（`localStorage`，刷新后保持）

## 与主 App 对应关系

本模块的目标不是复刻 Electron 业务逻辑，而是复用同一套主题与 UI 结构，让在线应用和主 App 视觉一致。

- 主题层：复用 `src/styles/themes/*`（`--mpx-*` token）
- 应用样式层：`apps/GeneralUIFrame/src/App.css` 直接 `@import` 主仓库 `src/styles/app/*`
- 布局骨架层：`apps/GeneralUIFrame/src/App.tsx` 使用主 App 同名 class（如 `.app`、`.app-header`、`.sidebar`、`.workspace`）
- 运行边界：Web 端固定 `html/body/#root` 全屏并 `overflow: hidden`，将浏览器窗口视为 App 窗口

### 开发时如何“对应主 App”

1. **样式变更优先在主仓库落地**：先改 `src/styles/themes` 或 `src/styles/app`，再同步到本模块观察效果。
2. **模块先做 UI 壳再接逻辑**：先接入主 App 的布局与 token，再逐步注入 Web 能力（FSAA、ZIP、浏览器音视频）。
3. **避免平台耦合**：本模块禁止直接引入 Electron API，仅保留 Web 运行时能力。
4. **新增 UI 槽位需同步 SSOT**：涉及槽位增删改时，按主仓库规则同步 `docs/10-ui_definition.md` 与 `docs/11-token_design.md`。

### 当前默认主题

- Style: `soft-skeuomorphic`
- Palette: `skeuomorphic-luxury-white`

由 `apps/GeneralUIFrame/src/App.tsx` 在运行时写入 `data-mpx-style` / `data-mpx-palette`。

## 模块接入模板（后续开发）

以下模板用于把既有单页应用逐步接入 GeneralUIFrame，保持“同 UI 系统、不同业务逻辑”的演进方式。

### 目录建议

```text
src/modules/
  file-list/
    index.ts
    FileListPanel.tsx
    fileList.types.ts
    fileList.adapter.ts
  rename/
    index.ts
    RenamePanel.tsx
    rename.types.ts
    rename.adapter.ts
```

### 模块契约约定

- `*.types.ts`：定义模块输入/输出，不绑定平台。
- `*.adapter.ts`：定义运行时能力接入（Web 先实现，Electron 不引入）。
- `*.tsx`：纯 UI 组件，优先复用主 App class/token（禁止硬编码主题色）。
- `index.ts`：模块导出入口，供注册表统一管理。

### 最小接入步骤

1. 在 `src/modules/<module-name>/` 创建模块骨架。
2. 在 `App.tsx` 模块列表注册入口（先占位，后接真实逻辑）。
3. UI 结构优先复用主 App class 与 `data-slot`，确保主题一致。
4. 执行逻辑通过 adapter 注入，禁止在组件内直接访问平台 API。

### File List 模块建议（第一批）

- UI：先完成列表容器、筛选条、状态栏。
- 能力：接入 FSAA 目录句柄读取（可先 mock 数据）。
- 约束：外层不滚动，仅模块内容区滚动（使用 `mpx-scroll-area`）。

### Rename 模块建议（第二批）

- UI：先完成批量规则表单 + 预览结果区。
- 能力：先做纯前端预览（不落盘），再接入实际执行器。
- 约束：所有“写操作”必须走显式确认按钮，避免误操作。

## 本地开发

```bash
npm install
npm run dev
```

若需局域网调试：

```bash
npm run dev:host
```

## 构建

```bash
npm run build
npm run preview
```

## Cloudflare Pages

建议配置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22`

## 与主仓库同步方式（subtree）

本目录在主仓库路径：`apps/GeneralUIFrame`。

完整操作说明见：`apps/GeneralUIFrame/SUBTREE_GUIDE.md`。

常用固定脚本（在主仓库根目录执行）：

```bash
npm run subtree:pull:generaluiframe
npm run subtree:push:generaluiframe
```

- 推送到独立仓库：

```bash
git subtree push --prefix=apps/GeneralUIFrame general-ui-frame main
```

- 从独立仓库回拉：

```bash
git subtree pull --prefix=apps/GeneralUIFrame general-ui-frame main --squash
```
