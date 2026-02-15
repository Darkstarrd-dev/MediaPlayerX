# 稳定性记录：`npm run dev:desktop` 持久“加载中”

## 现象

- 启动命令：`npm run dev:desktop`
- 主窗口可见，但 UI 一直停留在启动骨架（底部显示“加载中...”），无法进入可交互页面。
- `npm run desktop:start` 正常。

## 关键报错与信号

- DevTools Console 报错：
  - `Executing inline script violates the following Content Security Policy directive ...`
  - `@vitejs/plugin-react can't detect preamble. Something is wrong.`
- Electron 运行日志显示主窗口已完成 `did-finish-load` 与 `ready-to-show`，说明不是主窗口没打开，而是 renderer 初始化失败。

## 根因

- Electron 主进程注入的开发态内容安全策略 (Content Security Policy, CSP) 未允许内联脚本执行。
- Vite React 开发时依赖 preamble（内联脚本/注入逻辑）；被 CSP 阻断后，React 入口未能完成初始化，页面停在 `index.html` 的 boot shell。

## 修复

- 文件：`electron/main.ts`
- 函数：`buildContentSecurityPolicy(isPackaged: boolean)`
- 调整：开发态 `script-src` 从
  - `'self' 'unsafe-eval'`
  改为
  - `'self' 'unsafe-eval' 'unsafe-inline'`
- 生产态保持不变（仍为 `'self'`）。

## 为什么 `desktop:start` 正常

- `desktop:start` 走构建产物，不依赖 Vite dev preamble。
- `dev:desktop` 走开发服务器 + HMR，受开发态 CSP 影响。

## 排查过程中确认的易混点

### 1) 浏览器直接打开 `http://127.0.0.1:5173` 出现大量后端异常

- 报错示例：`backend_channel_unavailable:mediaPlayerBackend_not_injected`。
- 原因：`dev:desktop` 会设置 `VITE_MEDIA_REPOSITORY_MODE=real`，而浏览器环境没有 Electron preload 注入的 `window.mediaPlayerBackend`，因此该现象是预期。
- 结论：此类错误不应作为 Electron 桌面端故障根因。

### 2) 会话残留 bench 环境变量会改变启动行为

- 若存在：`MEDIA_PLAYERX_BENCH=dom` / `MEDIA_PLAYERX_BENCH_DEVTOOLS=1`
- 页面 URL 会带 `?bench=dom`，并触发 bench 路径逻辑，干扰常规排查。
- 建议清理：

```powershell
Remove-Item Env:MEDIA_PLAYERX_BENCH -ErrorAction SilentlyContinue
Remove-Item Env:MEDIA_PLAYERX_BENCH_DEVTOOLS -ErrorAction SilentlyContinue
```

## 最小复验清单

1. 运行 `npm run build:electron`，确保 Electron 主进程/预加载构建通过。
2. 清理 bench 环境变量。
3. 运行 `npm run dev:desktop`。
4. 确认 DevTools 不再出现 preamble/CSP 阻断报错，页面可进入正常 UI。
