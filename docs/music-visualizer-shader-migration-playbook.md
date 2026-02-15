# 音乐可视化 Shader 迁移与实施手册

本文档用于沉淀 Shadertoy Shader 迁移（Shader Migration）到 MediaPlayerX 的标准流程、约束、排障路径与验收标准，作为后续多 Shader 开发的常驻参考。

## 1. 目标与适用范围

- 目标：降低重复踩坑概率，保证新 Shader 的接入速度、稳定性与可调试性。
- 适用：`src/features/music-visualizer/` 下的 GPU 渲染（WebGL2 Renderer）与 CPU 回退（Canvas2D Fallback）链路。
- 范围说明：当前已支持 Shadertoy 风格多 Pass（含 Buffer 自反馈）与 4 路通道采样；不支持键盘输入（`iKeyboard`）与鼠标输入（`iMouse`）默认注入。

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
- `iDate`（`vec4`）
- `iChannel0`（`sampler2D`）
- `iChannel1`（`sampler2D`）
- `iChannel2`（`sampler2D`）
- `iChannel3`（`sampler2D`）
- `iChannelResolution[4]`（`vec3[4]`）
- `iAudioLevel`（`float`，舒适化平滑音量包络）
- `iAudioBeat`（`float`，舒适化节拍脉冲包络）
- `iForegroundOffset`（`vec2`，仅分层合成时用于前景平移）
- `iForegroundScale`（`float`，仅分层合成时用于前景缩放）

### 2.2.1 多 Pass 运行时约束

- Shader 可在 `MusicVisualizerShaderDefinition.multiPass` 中声明 Pass 链路。
- 当前实现约束：
  - 必须且只能有 1 个 `output=screen` 的 pass。
  - `output=screen` pass 必须位于 pass 列表末尾。
  - `feedback=true` 的 pass 通道读取上一帧同 pass 纹理（ping-pong）。
  - 中间 pass 不做 Tone Mapping；末尾 screen pass 可启用 Tone Mapping。
- 分层合成（`layered`）额外约束：
  - 前景/背景 shader 在运行时被编排为中间 buffer pass。
  - Tone Mapping 只允许在最终 `compose-screen` pass 执行一次。

### 2.3 音频纹理约定

- 音频纹理尺寸：`512 x 2`
- 第 0 行：频谱（Frequency Bins）
- 第 1 行：波形（Waveform）
- 来源：`src/features/music-visualizer/audioAnalyser.ts`

补充：

- `audioAnalyser` 在纹理输出之外，还会产出两路“人体感知友好”信号：
  - `audioLevel`：Attack/Release 平滑后的响度包络。
  - `audioBeat`：基于快慢包络差的 onset 脉冲（带衰减）。

### 2.4 全局 Tone Mapping 管线

- Tone Mapping 由运行时统一注入（Shader 后处理），支持全局设置：
  - 模式：`off` / `reinhard` / `aces` / `filmic` / `agx` / `khronos`
  - 曝光：`0.5 ~ 2.0`
  - 强度：`0 ~ 1`
- Shader 可通过定义字段进行覆盖：
  - `toneMapPolicy?: 'inherit' | 'force-on' | 'force-off'`
  - `toneMapStrengthBias?: number`（在全局强度基础上偏移后再 clamp）
- 运行时输入：
  - `iToneMapMode`（`int`）
  - `iToneMapExposure`（`float`）
  - `iToneMapStrength`（`float`）
- 设计目标：
  - 统一解决不同 Shader 的高光过曝与对比失真。
  - 避免每个 Shader 重复实现 Tone Mapping 逻辑。
  - 避免设置突变导致的运行时异常或画面突跳。

运行时稳定性策略（Stability Guardrails）：

- Tone Mapping 参数采用“斜率限制（slew-rate limiting）”平滑过渡：
  - 曝光与强度按帧渐进收敛，而非一次性硬切。
- Tone Mapping / FPS / Render Long Edge 调整走运行时热更新（hot update），避免每次改动都重建渲染器。
- 单帧渲染异常会被捕获并显示 runtime 错误，不会导致渲染循环直接中断。

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

## 3.1 分层合成配置（Layered Composition）

- 入口配置（`musicVisualizerShaderSettingsSchema`）：
  - `compositionMode`: `single | layered`
  - `renderScaleCoeff`: 全局渲染分辨率系数（替代旧 `foregroundBackgroundScaleRatio`）
  - `layeredBackgroundShaderId` / `layeredForegroundShaderId`
  - `layeredBackgroundEnabled` / `layeredForegroundEnabled`
  - `layeredForegroundOffsetX` / `layeredForegroundOffsetY`
  - `layeredForegroundScale`
- 兼容迁移：
  - 持久化读取时若存在旧字段 `foregroundBackgroundScaleRatio`，自动迁移到 `renderScaleCoeff`。
  - 新字段缺失时回填默认值，避免历史配置导致运行时崩溃。

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

### 4.5 音乐响应“过快 / 过闪”导致生理不适

典型现象：

- 颜色高频翻转，出现“反色感”或视觉噪音。
- 亮度按帧抖动（frame-level flicker），刺眼、疲劳、眩晕。
- 与音乐节奏不一致，主观感受像随机闪烁。

根因：

- 直接使用时域单点（waveform center sample）驱动亮度。
- 未做 Attack/Release 包络平滑，输入噪声直接进入 shader。
- 对整帧执行乘法脉冲（`color *= pulse`），导致全屏 strobe。

标准优化策略（Human Factors Baseline）：

1. **信号层（JS）先舒适化，再喂给 Shader**
   - 计算带权音量：低频 + 中频 + 高频 + waveform RMS。
   - 包络：`attack 40~70ms`，`release 200~350ms`。
   - 节拍：快慢包络差（onset）+ 衰减保持（`250~400ms`）。
2. **Shader 仅做“表现层”**
   - `iAudioLevel` 控制颜色混合比例（慢变化）。
   - `iAudioBeat` 控制高光脉冲（短促但不过载）。
   - 禁止直接改动几何核心路径，避免构图漂移。
3. **脉冲只作用在高光区域**
   - 使用亮度 mask（例如 `smoothstep`）限制脉冲作用面。
   - 亮度采用加法提升（additive boost）优先，避免全屏乘法闪烁。
4. **高光压缩防过曝**
   - 使用轻度压缩（soft compression）防止纯白剪切。

推荐默认参数：

- `ENVELOPE_ATTACK_SEC = 0.06`
- `ENVELOPE_RELEASE_SEC = 0.28`
- `SLOW_ENVELOPE_SEC = 0.55`
- `BEAT_DECAY_SEC = 0.34`
- `ONSET_THRESHOLD = 0.014`
- `ONSET_GAIN = 5.4`

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
   - 前景层原始代码依赖 `iChannel1`；该版本接入时为了减少通道依赖，映射到 `iChannel0` 频谱采样并保持中心构图。
  - 合成策略使用 screen blend，前景作为高亮层叠加在背景之上。

## 6.3 新增 Shader（Nebula）

- Shader：`src/features/music-visualizer/shaders/nebula.ts`
- 来源 URL（背景层）：`https://www.shadertoy.com/view/MXXcD4`
- 来源 URL（前景层）：`https://www.shadertoy.com/view/43GGDm`
- 接入定位：完整复合结构（背景 + 前景）。
- 适配说明：
   - 前景层原始代码依赖 `iChannel1` 和 `iMouse`；该版本接入时改为 `iChannel0` 音频采样与时间驱动相机运动。
  - 前景层的动态射线循环改为固定上限 `int` 循环并按音频幅值门限激活，避免 WebGL 循环编译不稳定。
  - 合成策略为背景黑位压暗 + 前景能量 mask + screen blend，降低全局雾化风险。

## 6.4 新增 Shader（Fungi）

- Shader：`src/features/music-visualizer/shaders/fungi.ts`
- 来源 URL：`https://www.shadertoy.com/view/33VGzW`
- 实施要点：
  - 未播放或低音量时，保持原版灰白构图基线。
  - 播放后再进入霓虹渐变 + 节拍亮度脉冲。
  - 几何与运动沿用原算法；音乐只驱动颜色/亮度，不驱动形变。
  - 脉冲仅作用于高光区，避免全屏 strobe。

## 6.5 新增 Shader（Rain Drips）

- Shader：`src/features/music-visualizer/shaders/rain_drips.ts`
- 来源 URL：`https://www.shadertoy.com/view/tstXRj`
- 接入定位：雨滴挂窗（多 Pass 版本）。
- 适配说明：
  - 运行时新增多 Pass 后，按 `Buffer A -> Buffer B -> Image` 链路重建。
  - `Buffer A` 使用自反馈粒子状态；`Buffer B` 使用历史反馈叠加雨痕；`Image` 负责折射与合成。
  - `iChannel1` 与 `iChannel3` 使用项目内贴图资源（`src/assets/iChannel1.png`、`src/assets/iChannel3.png`），`iChannel2` 使用运行时程序化扰动纹理。
  - 前景叠加来源 `https://www.shadertoy.com/view/Nd33zr`，并按中心缩放到原始尺寸的 `60%`。
  - 音乐响应仅作用于亮度（brightness）：`iAudioLevel` 与 `iAudioBeat` 仅驱动高光区域增亮，不驱动几何路径。

## 6.6 新增 Shader（Escape）

- Shader：`src/features/music-visualizer/shaders/escape.ts`
- 背景来源 URL：`https://www.shadertoy.com/view/4lcGWr`
- 前景来源 URL：`https://www.shadertoy.com/view/W3y3Wy`
- 接入定位：高速隧道背景 + 音频柱状前景（多 Pass 复合）。
- 适配说明：
  - 背景链路按 `Buffer A -> Image` 重建，并接入本地纹理资源：
    - `src/assets/EscapeBufferAIChannel0.png`
    - `src/assets/EscapeBufferAIChannel1.png`
    - `src/assets/EscapeImageIChannel0.png`
  - 前景链路单独实现 `escape-foreground` pass，保留原始音频柱状动画。
  - 最终合成 pass 采用 screen blend，将前景覆盖到背景之上。
  - 为适配 UNORM 缓冲，`Buffer A` 的 `tdist` 写入 alpha 时做归一化编码，`Image` pass 按同尺度解码。

## 6.7 新增 Shader（Tissue）

- Shader：`src/features/music-visualizer/shaders/tissue.ts`
- 背景来源 URL：`https://www.shadertoy.com/view/XdBSzd`
- 前景来源 URL：`https://www.shadertoy.com/view/4cBXDz`
- 接入定位：组织纹理隧道背景 + 环形音频柱前景（多 Pass 复合）。
- 适配说明：
  - 背景原版依赖 `iMouse`，运行时改为 `iAudioLevel`/`iAudioBeat` 驱动时间偏移。
  - 背景 `iChannel0` 贴图使用本地纹理 `src/assets/iChannel1.png`，避免程序化近似导致的复杂度损失与接缝放大。
   - 前景保留原始环形柱结构，输入来自 `iChannel0` 音频纹理。
   - 最终合成 pass 采用 screen blend，前景作为高亮层覆盖背景。

## 6.8 分层架构重构（2026-02-15）

- 目的：把“单 Shader 内部复合”升级为“运行时可组合复合”。
- 关键变更：
  - `galaxy/starfield/escape/tissue` 拆分为背景与前景独立 shader：
    - 背景：`galaxy.ts` / `starfield.ts` / `escape.ts` / `tissue.ts`
    - 前景：`galaxyforeground.ts` / `starfieldforeground.ts` / `escapeforeground.ts` / `tissueforeground.ts`
  - `Default (mcs-szb)` 标记为前景角色（`layerRole: 'foreground'`）。
  - UI 新增 `single/layered` 模式切换、分层启停、前景偏移与缩放控制。
  - 分层选择器按 `layerRole` 过滤，避免把纯前景 shader 误选为背景（反之亦然）。
  - Tone Mapping 在分层模式下仅在最终合成 pass 生效。

## 7. 变更记录（持续追加）

- 2026-02-14
  - 新增本手册。
  - 记录 `McsSzB` 迁移中的构图偏移、裁切与输入差异问题。
  - 记录 `McsSzB` 在业务场景下的构图修正参数（耳机左移、下移）。
  - 新增 `Starfield` Shader，来源 `https://www.shadertoy.com/view/43cGDs`，并记录背景层适配要点。
  - 合并前景来源 `https://www.shadertoy.com/view/7l2SWV`，形成完整复合版 `Starfield`。
  - 新增 `Galaxy` Shader，来源 `https://www.shadertoy.com/view/MXXcD4` + `https://www.shadertoy.com/view/WcXSDn`，完成背景与居中前景合并。
  - 新增 `Nebula` Shader，来源 `https://www.shadertoy.com/view/MXXcD4` + `https://www.shadertoy.com/view/43GGDm`，完成背景与前景融合。
  - 新增 `Fungi` Shader，来源 `https://www.shadertoy.com/view/33VGzW`，并落地音频响应的人机工程优化方案（包络平滑 + onset 脉冲 + 高光局部脉冲 + 过曝压缩）。
  - 新增 `Rain Drips` Shader，来源 `https://www.shadertoy.com/view/tstXRj`，并基于多 Pass 运行时实现 `Buffer A/B/Image` 链路；`iChannel1/iChannel3` 已接入本地贴图资源，叠加 `Nd33zr` 前景并缩放至 60%，音乐响应限定为亮度通道。
  - 新增 `Escape` Shader，来源 `https://www.shadertoy.com/view/4lcGWr` + `https://www.shadertoy.com/view/W3y3Wy`，完成背景与前景多 Pass 复合接入。
  - 新增 `Tissue` Shader，来源 `https://www.shadertoy.com/view/XdBSzd` + `https://www.shadertoy.com/view/4cBXDz`，完成背景与前景多 Pass 复合接入。
  - Tone Mapping 模式扩展为 `off/reinhard/aces/filmic/agx/khronos`，由统一后处理管线驱动。
  - Tone Mapping / FPS / 渲染长边切换改为热更新，减少运行时重建引发的不稳定。
- 2026-02-15
  - 引入分层合成模式（`single/layered`），支持前景/背景独立 shader 选择与开关。
  - 旧 `foregroundBackgroundScaleRatio` 迁移为 `renderScaleCoeff`。
  - 新增前景全局变换：`iForegroundOffset`、`iForegroundScale`。
  - 拆分 `galaxy/starfield/escape/tissue` 为背景 + `*foreground` 独立 shader。
  - 分层模式下 Tone Mapping 改为仅最终合成 pass 执行一次。
