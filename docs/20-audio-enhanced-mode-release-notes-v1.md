# 音频增强模式发布说明（v1）

Last updated: 2026-02-28

## 1. 已知限制

- 增强模式（mpv）在极端驱动/设备组合下可能触发异常退出，当前版本已接入自动拉起与熔断保护。
- 可视化数据仍以 `af-metadata` 近似纹理为主，复杂 shader 的高频细节响应与 WebAudio 实时 FFT 存在差异。
- `dsf/dff/iso` 依赖后端解码链路，兼容模式（Chromium）下可能无法直接播放。
- 转码能力受当前 ffmpeg 构建影响，若缺少 encoder/muxer，预设会自动灰度为不可用。

## 2. 回退路径

- 一级回退：设置 `audio.engineMode=chromium`，立即切回兼容模式。
- 二级回退：
  - 关闭 `audio.output.exclusive`
  - 关闭 `audio.visualizer.mode=sidecar-texture`（如后续启用）
  - 保持转码入口可用但不阻断播放
- 熔断场景：若 mpv 在短时间连续崩溃，系统会自动回退兼容模式并提示冷却时间。

## 3. 常见问题（FAQ）

### Q1：为什么“开始转码”按钮是灰色？

- 请先检查转码能力提示：
  - `ffmpeg unavailable`
  - `missing encoder <name>`
  - `missing muxer <name>`

### Q2：为什么转码后在媒体库里看不到新文件？

- 如果输出目录在库外，且关闭了“自动加入音乐导入源”，结果文件不会自动入库。
- 建议保留默认输出目录（库内 `.mediaplayerx/transcoded`）或开启自动入源。

### Q3：增强模式突然没声音并自动切回兼容模式？

- 这通常是 mpv 进程异常退出后的保护行为。
- 可先在兼容模式继续播放，再检查 `MPX_MPV_BIN` 指向的 mpv 版本与驱动兼容性。

## 4. 许可证与源码获取方式

- 本项目允许以 GPLv3 约束分发内置 `mpv/ffmpeg` 运行时。
- 发布包应附带第三方许可证清单与源码获取路径说明（或构建脚本）。
- 建议在发布产物中维护 `release/NOTICE`，记录：
  - 三方组件名称与版本
  - 许可证类型
  - 源码获取地址/构建入口
