# 音乐可视化 Shader 迁移与实施手册

本文档用于沉淀 Shadertoy Shader 迁移（Shader Migration）到 MediaPlayerX 的标准流程、约束、排障路径与验收标准，作为后续多 Shader 开发的常驻参考。

## 1. 目标与适用范围

- 目标：降低重复踩坑概率，保证新 Shader 的接入速度、稳定性与可调试性。
- 适用：`src/features/music-visualizer/` 下的 GPU 渲染（WebGL2 Renderer）与 CPU 回退（Canvas2D Fallback）链路。
- 非目标：当前不支持 Shadertoy 多 Buffer（Buffer A/B/C/D）与多通道资源采样（除 `iChannel0` 音频纹理）。

## 2. 当前运行时契约（Runtime Contract）

### 2.1 Shader 文件契约

- 每个 Shader 文件位于：`src/features/music-visualizer/shaders/*.ts`
- 导出结构：`MusicVisualizerShaderDefinition`
  - 必填：`id`、`label`、`fragmentSource`
  - 可选：`defaultEntry`
- 自动注册：`src/features/music-visualizer/shaderRegistry.ts` 使用 `import.meta.glob('./shaders/*.ts', { eager: true })` 扫描。

### 2.2 注入 Uniform（Shadertoy Adapter）

由 `src/features/music-visualizer/shadertoyAdapter.ts` 注入：

- `iResolution`（`vec3`）
- `iTime`（`float`）
- `iFrame`（`int`）
- `iChannel0`（`sampler2D`）

### 2.3 音频纹理约定

- 音频纹理尺寸：`512 x 2`
- 第 0 行：频谱（Frequency Bins）
- 第 1 行：波形（Waveform）
- 来源：`src/features/music-visualizer/audioAnalyser.ts`

## 3. 标准迁移流程（SOP）

1. **源 Shader 预审**
   - 确认是否依赖 Buffer Pass、外部贴图、鼠标输入（`iMouse`）、键盘输入（`iKeyboard`）、日期（`iDate`）等。
   - 若依赖以上能力，先给出降级方案，再进入实现。

2. **落盘 Shader 文件**
   - 新建：`src/features/music-visualizer/shaders/<shader-id>.ts`
   - 填写 `MusicVisualizerShaderDefinition`。
   - 保持 `mainImage(out vec4, in vec2)` 入口。

3. **坐标系适配**
   - 优先保持原始视觉构图，避免直接改动主体算法。
   - 宽高比适配优先在坐标映射层处理，不要在核心路径逻辑里叠加临时硬编码。

4. **运行时联调**
   - 在设置面板调节渲染长边（Render Long Edge）与 GPU/CPU 模式。
   - 同时验证非全屏与全屏。

5. **回归测试**
   - 最小集：
     - `npm run test -- src/features/music-visualizer/shadertoyAdapter.test.ts src/features/music-visualizer/shaderRegistry.test.ts src/components/MusicMainSection.test.tsx`

6. **文档同步**
   - 更新本手册中的“已知问题与规避策略”与“变更记录”。

## 4. 高频问题与规避策略

### 4.1 画面与 Shadertoy 不一致

常见原因：

- 输入源不一致：Shadertoy 音频通道与本地 `AnalyserNode` 频谱分布不同。
- 时序不一致：`smoothingTimeConstant` 会显著影响动态幅度。
- 分辨率策略不同：本项目使用容器尺寸 + 渲染长边缩放，不等同 Shadertoy 固定帧缓冲。
- Shader 被本地适配过：坐标中心、裁剪条件、偏移值会改变构图。

规避：

- 优先做输入与坐标映射对齐，再判断 shader 本体是否异常。
- 每次仅改一个变量（输入 / 坐标 / 分辨率 / 偏移），避免混合调参导致结论失真。

### 4.2 非全屏/全屏构图偏移、裁切

常见原因：

- 使用容器外框尺寸或时序不稳定尺寸。
- 在 shader 内存在硬裁切阈值（例如基于 `uv.x` 的早退 `return`）。

规避：

- 运行时优先使用容器内容区尺寸（`clientWidth/clientHeight`）。
- 避免对宽高比敏感区域做硬裁切，改用可解释的坐标映射。

### 4.3 GPU 初始化失败或回退异常

常见原因：

- WebGL2 不可用。
- Shader 编译/链接失败。

规避：

- 查看 runtime 错误：已带 stage 前缀（`[vertex compile]`、`[fragment compile]`、`[program link]`）。
- 观察 `rendererLabel` 的 active uniforms 信息，确认 uniform 是否被优化裁剪。

### 4.4 测试环境误报 Canvas 异常

`vitest + jsdom` 下会出现 `HTMLCanvasElement.getContext()` not implemented 警告；属于已知限制，不等于业务失败。

## 5. 开发检查清单（Checklist）

合入前必须满足：

- [ ] 新 Shader 已放入 `src/features/music-visualizer/shaders/` 并可自动注册。
- [ ] 非全屏与全屏构图通过人工验证。
- [ ] GPU 模式可运行；GPU 失败时 CPU 回退可运行。
- [ ] HUD 信息可定位 `shaderId`、`backend`、`rendererLabel`。
- [ ] 最小测试集通过。
- [ ] 本文档已追加本次特有坑点与规避策略。

## 6. 当前基线经验（Default / McsSzB）

- Shader：`src/features/music-visualizer/shaders/mcs_szb.ts`
- 来源 URL：`https://www.shadertoy.com/view/McsSzB`
- 已做适配：
  - 移除会导致宽屏误裁切的硬阈值早退。
  - 使用基于 `min(iResolution.x, iResolution.y)` 的居中坐标映射。
  - 为对齐目标构图，增加偏移参数：`HEADPHONE_OFFSET_X`（耳机横向）与 `SCENE_OFFSET_Y`（耳机+频谱整体纵向）。

## 6.1 新增 Shader（Starfield）

- Shader：`src/features/music-visualizer/shaders/starfield.ts`
- 来源 URL（背景层）：`https://www.shadertoy.com/view/43cGDs`
- 来源 URL（前景层）：`https://www.shadertoy.com/view/7l2SWV`
- 接入定位：作为复合结构中的背景层（Background Layer）候选。
- 适配说明：
  - 原始代码依赖 `iMouse`，当前运行时未注入该 uniform，已改为时间驱动运动向量。
  - 原始 Bloom 分支依赖 `iChannelResolution`，当前版本按背景层用途保留主渲染路径，不启用 Bloom 分支。
  - 已与前景层代码合并为完整 `Starfield`：背景保留音乐反应，前景内容居中显示并用 screen blend 合成。

## 6.2 新增 Shader（Galaxy）

- Shader：`src/features/music-visualizer/shaders/galaxy.ts`
- 来源 URL（背景层）：`https://www.shadertoy.com/view/MXXcD4`
- 来源 URL（前景层）：`https://www.shadertoy.com/view/WcXSDn`
- 接入定位：完整复合结构（背景 + 居中前景）。
- 适配说明：
  - 背景层依赖 `iAmplifiedTime` 与 `FFT`，按本地 `iChannel0` 音频纹理实现。
  - 前景层原始代码依赖 `iChannel1`，当前运行时无 `iChannel1`，已映射到 `iChannel0` 频谱采样并保持中心构图。
  - 合成策略使用 screen blend，前景作为高亮层叠加在背景之上。

## 6.3 新增 Shader（Nebula）

- Shader：`src/features/music-visualizer/shaders/nebula.ts`
- 来源 URL（背景层）：`https://www.shadertoy.com/view/MXXcD4`
- 来源 URL（前景层）：`https://www.shadertoy.com/view/43GGDm`
- 接入定位：完整复合结构（背景 + 前景）。
- 适配说明：
  - 前景层原始代码依赖 `iChannel1` 和 `iMouse`，运行时改为 `iChannel0` 音频采样与时间驱动相机运动。
  - 前景层的动态射线循环改为固定上限 `int` 循环并按音频幅值门限激活，避免 WebGL 循环编译不稳定。
  - 合成策略为背景黑位压暗 + 前景能量 mask + screen blend，降低全局雾化风险。

## 7. 变更记录（持续追加）

- 2026-02-14
  - 新增本手册。
  - 记录 `McsSzB` 迁移中的构图偏移、裁切与输入差异问题。
  - 记录 `McsSzB` 在业务场景下的构图修正参数（耳机左移、下移）。
  - 新增 `Starfield` Shader，来源 `https://www.shadertoy.com/view/43cGDs`，并记录背景层适配要点。
  - 合并前景来源 `https://www.shadertoy.com/view/7l2SWV`，形成完整复合版 `Starfield`。
  - 新增 `Galaxy` Shader，来源 `https://www.shadertoy.com/view/MXXcD4` + `https://www.shadertoy.com/view/WcXSDn`，完成背景与居中前景合并。
  - 新增 `Nebula` Shader，来源 `https://www.shadertoy.com/view/MXXcD4` + `https://www.shadertoy.com/view/43GGDm`，完成背景与前景融合。
