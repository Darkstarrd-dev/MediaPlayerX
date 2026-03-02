下面给一个**贴合你现有“Music Shader 体系”**、并且能同时支持 **Shadertoy 风格（mainImage）/通用 GLSL（main）**，同时通过 **“输入变量映射（Input Mapping）”**把音频信息注入 shader 的实现方案。重点是：**不要求 shader 代码改造**，而是通过运行时的 **uniform / sampler 绑定与映射**来适配。

---

## 0) 设计目标与边界

### 目标

1. **Shadertoy 兼容**：支持 `mainImage(out vec4, in vec2 fragCoord)`、标准 uniforms（`iTime/iResolution/iFrame/iMouse/iChannel0..3...`）与多 Pass（你现有已经支持）。
2. **通用 GLSL 兼容**：支持用户提供完整 fragment shader（`void main()`）的写法（WebGL2 GLSL300 为主），同时可选择注入 Shadertoy uniforms 以便同一份代码可复用。
3. **音频注入可映射**：用户在 UI 里把“App 提供的音频信号”映射到 shader 的目标变量（uniform/sampler/channel），无需改 shader 文本。
4. **尽量热更新**：映射变化尽可能不触发 shader 重编译（让它落在“更新 uniform/纹理绑定”的范畴）。

### 非目标（建议明确）

* 不追求 100% 覆盖 Shadertoy 网站所有输入（键盘、摄像头等），但可以以“可选能力”逐步补齐。
* 不做 Shadertoy 网站级别的 shader 拉取/资源同步（你项目定位是本地可视化基座）。

---

## 1) 总体方案：在你现有架构上新增一个“Input Mapping 层”

你现在的链路是：

`FrameInput（含 freq/wave/audioLevel/audioBeat） -> renderer.render(frameInput) -> GPU 多Pass -> screen输出`

新增一层：

**FrameInput → SignalBank（把音频/主题/合成控制转成“可绑定信号”） → Binder（把信号按映射绑定到 Program uniforms/samplers/channels） → renderer.drawPass**

关键新增模块：

1. **SignalBank（信号仓库）**
   把 FrameInput 统一转成：

* 标准 Shadertoy uniforms 值
* 音频纹理（Shadertoy 声音纹理格式）
* 额外派生音频特征（bass/mid/treble、peak、rms、onset 等）

2. **ProgramIntrospection（Program 反射）**
   在 WebGL program link 后用 `getActiveUniform` 拿到：

* 该 pass 实际存在的 uniforms（名字、类型、array size）
* sampler uniforms（2D/Cube 等）

3. **InputBinder（映射绑定器）**
   把“用户映射配置”应用到该 pass：

* 对 float/vec/int：每帧 `uniform1f/2f/3f/4f/1i...`
* 对 sampler：分配 texture unit、绑定 texture、`uniform1i(unit)`
* 对 Shadertoy iChannel：沿用你现有 `PassDef.channels` 通道绑定逻辑，但把 `kind:'audio'`升级成明确的音频纹理类型（下面讲）。

这样你可以实现：**同一份 shader 代码，用户通过映射把音频接入，且不改 shader 文本**。

---

## 2) Shadertoy / 通用 GLSL 的“统一编译适配器”

建议把你已有的 `buildShadertoyFragmentSource` 抽象成适配器体系：

### 2.1 ShaderAdapter 接口

```ts
interface BuildContext {
  toneMapMode: ToneMapMode
  injectToneMap: boolean
  injectShadertoyUniforms: boolean
  injectCompatMacros: boolean
  // 未来可加：injectKeyboard, injectCamera 等
}

interface BuiltPassSource {
  fragmentSource: string
  // 你已有 multiPass 的 passId / output / renderScale 等保持不变
}

interface ShaderAdapter {
  canHandle(src: string, hint?: 'auto'|'shadertoy'|'glsl'): boolean
  build(src: string, ctx: BuildContext): BuiltPassSource
}
```

### 2.2 ShadertoyAdapter（mainImage）

触发条件：

* 源码包含 `mainImage(` 或用户显式选择 “Shadertoy 模式”。

它做的事：

1. **插入/保证 GLSL300**（`#version 300 es`）
2. 注入 precision、Shadertoy uniforms（见 3.1）
3. 包装 `main()`：

```glsl
layout(location=0) out vec4 _fragColor;

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  _fragColor = color;
}
```

### 2.3 GlslAdapter（main）

触发条件：

* 不包含 mainImage，且用户选 “GLSL 模式” 或 auto 判定为 glsl。

它做的事（尽量不干涉用户源码）：

* 可选注入：

  * Shadertoy uniforms（让用户写 `iTime` 也能跑）
  * 兼容宏（例如 `#define texture2D texture`，减少 WebGL1 风格代码迁移成本）
* **不强行包裹 main**，也不强行声明输出变量（避免和用户已有 `out vec4` 冲突）

> 结果：GLSL 模式下用户给“完整 fragment shader”即可；Shadertoy 模式下用户给 mainImage 片段即可。

---

## 3) 统一输入：Shadertoy 标准 uniforms + 你项目扩展 uniforms

### 3.1 Shadertoy 标准 uniforms（建议全量提供）

你可以完整注入这些（你已覆盖大半）：

* `iResolution`、`iTime`、`iTimeDelta`、`iFrame`、`iChannelTime[4]`、`iChannelResolution[4]`、`iChannel0..3`、`iDate`、`iSampleRate`、`iMouse` 等。([cables][1])

### 3.2 你项目扩展 uniforms（保持现有）

继续提供你已经设计好的：

* `iAudioLevel`、`iAudioBeat`
* `iForegroundOffset/iForegroundScale/iCompositeMode`
* `iThemeMode/iThemeBackgroundColor`
* `iToneMapMode/iToneMapExposure/iToneMapStrength`

这部分建议**不强依赖 “shader 是否声明”**：Shadertoy 模式统一注入；GLSL 模式则采用“注入但跳过重复声明”（见 3.3）。

### 3.3 避免重复声明：轻量扫描/反射两段式

因为 GLSL 模式用户可能已经写了 `uniform float iTime;` 等，你注入会重复报错。建议：

* **编译前：源文本轻量扫描**（regex 级别足够）
  提取已声明的 uniform 名字集合（含数组）。
* **注入时：只注入缺失的声明**。

这样能最大程度兼容“别人写的通用 GLSL”。

---

## 4) 音频注入：关键是对齐 Shadertoy 的“声音纹理格式”

Shadertoy 的音频输入（当 channel 选择 sound/music/mic 时）在 shader 中表现为一张纹理：**512×2**，**R8（red 单通道 8-bit）**。并且：**第一行是频谱（spectrum），第二行是波形（waveform）**。([Gist][2])

### 4.1 建议你在 SignalBank 里做一个标准 AudioTexture

* 尺寸：`W=512, H=2`
* 格式：`internalFormat=R8, format=RED, type=UNSIGNED_BYTE`
* 数据布局：

  * row 0：`frequencyData[0..511]`
  * row 1：`waveformData[0..511]`

WebGL2 更新（每帧一次，成本很低）：

```ts
// 初始化
gl.bindTexture(gl.TEXTURE_2D, audioTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 512, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// 每帧更新：拼成 512*2 的 Uint8Array
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 512, 2, gl.RED, gl.UNSIGNED_BYTE, audioPacked);
```

> 这样做的直接收益：很多“Shadertoy 音乐可视化 shader”会天然兼容（它们通常假定的就是这种 512×2 声音纹理）。

### 4.2 采样约定（兼容常见 Shadertoy 写法）

2 像素高的纹理，两行 texel center 在 `y=0.25` 与 `y=0.75`，因此很多 shader 会用类似：

* `texture(iChannel0, vec2(x, 0.25)).r` 读频谱
* `texture(iChannel0, vec2(x, 0.75)).r` 读波形

你只要保证上面的数据布局，就能最大概率“直接跑”。

### 4.3 把音频纹理暴露成可映射输入源

在 SignalBank 里把它注册为：

* `audio.soundTex`（shadertoy-compatible 512×2）
  并提供派生源（可选，但对可视化很有用）：
* `audio.bass`, `audio.mid`, `audio.treble`, `audio.rms`, `audio.peak`, `audio.onset`
  这些可以从 `frequencyData` 做简单分桶/平滑得到（也能缓解 MPV 路径的估算差异）。

---

## 5) 输入变量映射：把“App 信号”映射到 shader 的 uniform / sampler / channel

### 5.1 映射的核心：以 Program 反射出来的 Uniform 列表为“目标集合”

也就是说：**目标变量来自 shader 自己**（你不发明新名字），用户只是在 UI 里指定“这个 uniform 由哪个 App 信号驱动”。

#### 目标（Target）

* `uniform float uBeat;`
* `uniform vec3 uColor;`
* `uniform sampler2D uAudio;`
* `uniform sampler2D iChannel0;`（Shadertoy）

#### 源（Source）

* `timeSec / frame / resolution`
* `audioLevel / audioBeat`
* `audio.soundTex`
* 主题/合成控制/用户参数 slider

### 5.2 建议的数据结构（最小可行）

```ts
type SignalKey =
  | 'timeSec' | 'timeDelta' | 'frame' | 'frameRate'
  | 'resolution'
  | 'audioLevel' | 'audioBeat'
  | 'audio.soundTex'
  | 'theme.bgColor' | 'theme.mode'
  | 'foreground.offset' | 'foreground.scale' | 'composite.mode'
  | 'toneMap.mode' | 'toneMap.exposure' | 'toneMap.strength'
  | `param.${string}`; // UI 自定义参数

type UniformTransform =
  | { kind: 'none' }
  | { kind: 'scaleBias'; scale: number; bias: number }
  | { kind: 'clamp'; min: number; max: number }
  | { kind: 'smooth'; attack: number; release: number } // 可选

interface UniformBinding {
  uniformName: string        // shader 中的名字（由反射得到/用户选择）
  signal: SignalKey          // App 信号
  transform?: UniformTransform[]
}

interface SamplerBinding {
  uniformName: string        // sampler2D uniform 名
  signal: 'audio.soundTex' | `texture.${string}` | `pass.${string}` // 纹理来源
}
```

### 5.3 绑定执行（每帧）

* **float/vec/int**：从 SignalBank 取值 → transform → `gl.uniform*`
* **sampler2D**：

  * 从 SignalBank 取纹理对象（audioTex / static texture / pass output）
  * 为该 pass 分配 unit（或共享 unit）
  * `activeTexture/bindTexture`
  * `uniform1i(location, unit)`

### 5.4 “映射不重编译”的关键点

只要你不靠 `#define` 之类改源码来做映射，而是靠 WebGL 的 uniform/sampler 设置，那么：

* 改变“哪个 uniform 对应哪个信号”不需要重编译，只需要改变 binder 的映射表
* 改变信号值当然也只是更新 uniform

这会非常符合你现在的“热更新能力”设计哲学。

---

## 6) 与你现有 Multi-pass / Layered Composition 的融合方式

### 6.1 Multi-pass（你已有）

保持你现有的：

* `PassDef.channels`（0..3）
* `kind: 'pass'` / `feedback` ping-pong
* `kind: 'texture'`
* `kind: 'audio'`（建议升级为明确音频类型）

建议把 `ChannelSource` 扩展成：

```ts
type ChannelSource =
  | { kind: 'audio'; audioKind?: 'shadertoySoundTex' } // 默认就是 shadertoySoundTex
  | { kind: 'pass'; passId: string; feedback?: boolean }
  | { kind: 'texture'; textureId: string }
```

然后：

* `kind:'audio'` 就把 `audio.soundTex` 绑定到该 pass 的 `iChannelN`

### 6.2 Layered Composition（你已有）

你现在把 bg/fg 动态拼成一个虚拟复合 shader，并在末尾追加 `compose-screen`。
建议策略：

* compose 层也使用同一个 SignalBank（不额外做一套时间/音频）
* tone mapping 仍旧只在最终 screen pass 做（你现有已经这样）

映射层对分层合成几乎是透明的：它只是在每个 pass draw 前把 uniforms/samplers 设置好。

---

## 7) UI 与“高可定制性”如何落地

### 7.1 “输入映射面板”建议交互

针对当前选中的 shader（或 pass）展示两组列表：

1. **Uniforms（标量/向量）**

* 左侧：uniformName（来自 program 反射）
* 右侧：下拉选择 SignalKey（time/audio/theme/param）
* 高级：scale/bias/smoothing（可折叠）

2. **Samplers（纹理输入）**

* 左侧：sampler uniformName（或 iChannel0..3）
* 右侧：下拉选择 `audio.soundTex / 某静态纹理 / 某 buffer 输出 / webcam(未来)`
* 纹理参数：filter/wrap（可选）

### 7.2 自动映射（强烈建议）

为了让“粘贴一个 shader 就能动”，可以做非常简单的启发式：

* 名字包含 `beat` → `audioBeat`
* `level/vol/amp` → `audioLevel`
* `fft/spectrum/freq` → `audio.soundTex`
* `wave` → `audio.soundTex`
* `time` → `timeSec`
* `resolution` → `resolution`

自动映射成功后用户再微调即可，这会极大提升可用性。

---

## 8) 落地步骤（按最小增量实施）

### Phase 1：把 Shadertoy 音频纹理做对（兼容性立刻上升）

* 实现 `AudioTexture512x2`（频谱+波形，R8）并更新到 SignalBank。([Gist][2])
* `ChannelSource.kind:'audio'` 默认绑定到 `iChannel0`（或用户可选 iChannelN）
* 保持 `iAudioLevel/iAudioBeat` 继续推送（给不采样纹理的 shader 用）

### Phase 2：Program 反射 + UniformBinder（让“通用 GLSL 映射”成立）

* 在 program link 后拿 activeUniforms，做 `UniformSetter` 缓存
* 每帧按映射表设置（float/vec/int/sampler2D）

### Phase 3：UI 映射面板 + 自动映射

* shader 选择后读取 program uniforms 列表
* 提供映射、保存到本地配置（按 shaderId）

### Phase 4：GlslAdapter（通用 GLSL 接入）

* 支持用户提供完整 fragment shader
* 可选注入 Shadertoy uniforms（避免用户必须写两套）
* 遇到编译错误，HUD 给出“缺失 out 变量/版本不兼容”等可读错误

---

## 9) 验收标准（建议你在评审里写清）

1. 粘贴一个 Shadertoy 音频可视化 shader（mainImage），不改代码：

   * 绑定 `iChannel0 = audio.soundTex`
   * shader 对音频有响应（频谱/波形采样正常）
2. 粘贴一个通用 GLSL（main），不改代码：

   * UI 能列出其 uniforms/samplers
   * 通过映射将 `uBeat/uAudioTex` 等接上音频
3. Multi-pass/feedback 仍工作（音频输入在每个 pass 可用）
4. 映射调整不触发重建（除非 shader 代码变更/切换）

---

如果你愿意把你项目里当前的 `buildShadertoyFragmentSource` 和 `WebglMusicVisualizerRenderer` 的关键片段（尤其是 uniform 推送、channel 绑定、program 缓存）贴一点出来，我可以把上面方案进一步“落到你现有文件结构里”，给出更接近可直接实现的 TypeScript 代码骨架（包括：uniform 反射、setter 分发、sampler unit 分配、以及 audio 512×2 纹理更新的具体实现）。

[1]: https://cables.gl/docs/faq/shadertoy/shadertoy "Shadertoy"
[2]: https://gist.github.com/soulthreads/2efe50da4be1fb5f7ab60ff14ca434b8?utm_source=chatgpt.com "Some details on Shadertoy FFT · GitHub"
