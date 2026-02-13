# UI 开发说明

## 启动画面（Startup Splash）

- 单一真源：`electron/startupSplashTemplate.ts`
- Electron 启动页直接使用 `renderStartupSplashHtml()`。
- 浏览器可视化 mock 由 `renderStartupSplashMockHtml()` 导出。
- 角色图默认来源：`src/assets/banner.png`（mock 导出使用相对路径；Electron 运行时优先解析同名文件）。
- 可通过 `MEDIA_PLAYERX_SPLASH_BANNER_PATH` 指定角色图绝对路径。
- 可通过 `MEDIA_PLAYERX_SPLASH_MIN_DURATION_MS` 临时延长启动页展示时间用于视觉验收（默认 0）。

```bash
npm run mock:splash
```

执行后会生成：`docs/ui/startup-splash-mock.html`
