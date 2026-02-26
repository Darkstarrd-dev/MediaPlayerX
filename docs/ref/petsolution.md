下面把你提到的几种“桌面宠物（桌宠）”实现路径拆开讲清楚：**Electron 纯做系统级悬浮桌宠**、**Electron 仅做应用内页面级桌宠**、以及**桌宠用别的框架/引擎实现但用 Electron 做设置 UI 并联动**。同时我也把社区里相对“现成可抄”的项目和关键技术点整理出来，方便你快速选型与落地。

---

## 社区里已经有人做了哪些“现成实现”

### Electron 方向（可直接参考窗口/透传/动画组织方式）

* **samejima-ai/electron-desktop-pet**：Electron + React + TS，小像素角色在屏幕上走动、靠近鼠标逃跑，强调“无边框&透明、可替换精灵图”等，结构清晰适合作为最小可行 Demo。 ([GitHub][1])
* **ee3lol/valentine-pet**：Electron + TS 的桌宠，加入“提醒喝水/监督专注”等生产力玩法，适合作为“桌宠 + 功能面板”形态参考。 ([GitHub][2])
* **fre2dom0/Virtual-Pet**：Electron + Phaser，主打“透明、置顶、动画多状态”。如果你希望桌宠本质像个 2D 小游戏循环，这类结构很顺。 ([GitHub][3])
* **alex22022005/Mimo---Your-Cute-Desktop-Companion**：Electron 桌面伴侣，README 描述了透明置顶、点击/穿透等桌宠常见交互点（自述）。 ([GitHub][4])
* **Vinceli2401/Vixie**：Electron 桌宠 demo（Win/macOS），可当作“最简窗口层 + 透明”骨架参考。 ([GitHub][5])

### Tauri 方向（轻量、跨平台桌宠社区更活跃）

* **SeakMengs/WindowPet**：Tauri + React 的“桌面悬浮宠物/角色”项目，支持多角色、点击穿透、开机启动、自动更新等，README 直接覆盖桌宠产品化常见需求。 ([GitHub][6])
* **ayangweb/BongoCat**：非常热门的跨平台互动桌宠（Tauri），支持 macOS/Windows/Linux(x11)，能根据键盘/鼠标/手柄动作同步响应，并支持导入自定义模型。 ([GitHub][7])
* **liwenka1/bongo-cat-next**：Tauri 2 + Live2D 的桌宠，包含“透明窗、置顶、可选点击穿透、系统托盘、全局快捷键、多窗口（主窗+设置窗）”等一整套桌宠工程化要素（部分性能数据为项目自述）。 ([GitHub][8])
* **CrabNebula：Building a Desktop Pet with Tauri**：直接手把手讲“用 Tauri v2 做一个跨平台桌宠”的教程型文章。 ([crabnebula.dev][9])

### Live2D/更复杂渲染（Electron 仍然有人这么做）

* **x380kkm/Live2DPet**：Electron + Live2D Cubism SDK + PixiJS + pixi-live2d-display，属于“桌宠 + Live2D”典型技术栈示例。 ([GitHub][10])
* **morettt/my-neuro**：一个更“重”的 AI 桌面伙伴工程，其中明确包含 Electron 透明置顶桌面覆盖层（同时还有控制面板等）。 ([GitHub][11])

### “挂到壁纸/桌面图标层”的工具（Windows 方向更成熟）

* **robinwassen/electron-wallpaper**：Windows-only，把窗口插到“壁纸与桌面图标之间”，但**不支持用户交互**，更像 Rainmeter 面板。 ([GitHub][12])
* **meslzy/electron-as-wallpaper**：把 Electron 窗口作为“桌面壁纸层”并支持透明/输入转发等（项目描述如此）。 ([GitHub][13])

---

## Electron 实现“系统级桌面宠物”的主流方式

这里的“系统级”我按产品语义拆成两类，你可以选其一或混合：

### A) 悬浮置顶桌宠（最常见：在所有应用窗口之上漂浮）

这是绝大多数桌宠/悬浮挂件采用的方式：创建一个**透明 + 无边框 + 置顶**的独立窗口（一般窗口尺寸只包住宠物本体），宠物移动时就移动这个窗口。

**关键 Electron API**

1. 透明窗 & 无边框
   Electron 官方示例中提到透明窗需要 `transparent: true`（结合 CSS 绘制“只看到宠物”）。 ([Electron][14])

2. 置顶等级（非常关键：避免被 Dock/任务栏/全屏窗口压住）
   `win.setAlwaysOnTop(flag[, level][, relativeLevel])` 支持 `screen-saver` 等级，并且文档明确：从 `pop-up-menu` 及以上会显示在任务栏之上。 ([Electron][15])

3. 多桌面/全屏可见（macOS/Linux）
   `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`：可让窗口出现在所有工作区，并可选择在全屏窗口之上显示（注意：官方文档也写了 Windows 上这个 API 不生效）。 ([Electron][15])

4. 鼠标穿透（点击透传到下面的应用）
   `win.setIgnoreMouseEvents(true, { forward: true })`：让窗口忽略所有鼠标事件，鼠标事件会传给下层窗口；`forward: true` 可转发鼠标移动给 Chromium，从而还能触发 `mouseleave` 等事件（常用于“靠近宠物时临时取消穿透/显示交互UI”）。 ([Electron][15])

5. “非矩形窗口命中区域”（强烈建议关注）
   `win.setShape(rects)`（Windows/Linux，实验特性）：**决定系统允许绘制和交互的区域**；区域外不绘制、也不接收鼠标事件，并且鼠标事件会落到后面的窗口。这个能力对桌宠特别好用：你可以把窗口命中区域裁成“宠物轮廓附近的矩形集合”，从而实现“透明区域不挡点击”。 ([Electron][15])

6. 多显示器/鼠标位置/屏幕边界
   用 `screen` 模块获取显示器尺寸、鼠标位置等信息，桌宠碰撞边界/跨屏移动都靠它。 ([Electron][16])

**一个工程上更稳的窗口策略**

* **不要做“全屏透明大窗 + 在里面画宠物”**：因为会拦截大量点击、输入、焦点问题多。
* **做“宠物本体大小的透明小窗”**：宠物移动 = 移动小窗；点击/拖拽也只影响这一小块。
* 若你仍希望“透明区域完全不挡点击”，优先考虑：

  * Windows/Linux：`setShape` 做命中裁剪；([Electron][15])
  * 或者默认 `setIgnoreMouseEvents(true)` 让它穿透，需要交互时再临时关闭穿透（比如按住 Ctrl、或鼠标靠近时切换）。 ([Electron][15])

**最小骨架示例（思路）**

```js
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let petWin;

app.whenReady().then(() => {
  petWin = new BrowserWindow({
    width: 220,
    height: 220,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 桌宠动画通常需要避免后台节流（具体看你的渲染策略）
      backgroundThrottling: false,
    },
  });

  // 更强的置顶等级（尤其 macOS/Windows 更明显）
  petWin.setAlwaysOnTop(true, 'screen-saver');

  // macOS/Linux：跨工作区 + 可在全屏上层（Windows 无效）
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // 默认穿透；需要交互时再切回来
  petWin.setIgnoreMouseEvents(true, { forward: true });

  petWin.loadFile('pet.html');

  // 使用 screen 获取边界/鼠标位置，驱动运动逻辑
  const primary = screen.getPrimaryDisplay().workArea;
  // ...你的运动/碰撞/跨屏逻辑
});
```

上面用到的 `setAlwaysOnTop / setVisibleOnAllWorkspaces / setIgnoreMouseEvents` 行为都在 Electron 文档中有明确说明。 ([Electron][15])

---

### B) “桌面/壁纸层”桌宠（在图标后面、像动态壁纸那层）

如果你想让桌宠处在“桌面图标附近”或“像壁纸一样”，通常是 Windows 技巧更成熟：把窗口塞到 WorkerW/壁纸层。

* `electron-wallpaper` 的定位很明确：**Windows-only**，把窗口插到壁纸与图标之间，且**不支持交互**，适合做桌面面板而非可点可拖桌宠。 ([GitHub][12])
* `electron-as-wallpaper` 这类项目/包则主打“把 Electron 窗口作为壁纸层”，并宣称支持透明与输入转发（项目描述如此）。 ([GitHub][13])

**建议**：除非你的产品就要“动态壁纸/桌面挂件层”，否则桌宠更推荐做 A 类“悬浮置顶窗”，跨平台可控性更强。

---

## Electron “页面级桌宠”（仅在 Electron 自己的页面/窗口里）

这个就非常简单了：桌宠只是一个 **React/Vue 组件** 或 **Canvas/WebGL 场景**，它的活动范围仅限你的 Electron 窗口（比如设置页里一个小伙伴）。

优点：

* 实现成本最低；
* 不涉及系统级置顶、穿透、多工作区等坑；
* UI 联动最容易（同一个 renderer state/store 即可）。

缺点：

* “系统级桌宠”体验做不出来：离开你的应用窗口就看不到宠物；
* 想覆盖别的应用窗口不可能（除非把这个窗口也做成 A 类悬浮窗）。

---

## “用其他框架做桌宠 + Electron 做设置 UI 并联动”的混合架构

你这个设想在工程上完全可行，而且在你**已经有一套 Electron 主应用**时经常是最现实的路线（避免为了桌宠把整个技术栈推倒重来）。

### 推荐的架构形态：两个进程（两个应用）+ 本地 IPC

* **桌宠进程**：负责“系统级窗口 + 渲染 + 低延迟输入响应”

  * 可选：Tauri、原生（WinUI/WPF/Qt）、Unity/Godot、或者你自己的 C++ 小窗
* **Electron 主应用**：负责“设置 UI + 账号/资源管理 + 商店/皮肤等”
* **IPC**：WebSocket / Named Pipe / Local HTTP / gRPC 都行

  * 重点不是协议，而是**消息要版本化**、状态要可回放、命令要幂等。

### 为什么这种方式值得考虑

* 桌宠窗口是“常驻高频渲染 + 置顶穿透”等偏系统特性的东西；
* Electron 主应用则偏“复杂 UI + 表单 + 页面路由 + 业务逻辑”。

把两者解耦后：

* 桌宠崩了不影响主 UI（反之亦然）；
* 桌宠可用更轻的运行时（比如 Tauri）降低常驻资源；
* Electron 仍保留你熟悉的 UI 生态和开发效率。

### 联动怎么做得“像一个产品”

可以学习 BongoCat / WindowPet 这类产品化桌宠的做法：**主窗（桌宠）+ 偏好设置窗（UI）**，并通过事件同步状态。
例如 BongoCat 就明确是“主窗口显示透明桌宠 + 偏好窗口显示设置”的双窗口思路。 ([GitHub][7])
WindowPet README 也覆盖了“Settings window、click through、auto startup”等桌宠典型系统集成需求。 ([GitHub][6])

---

## 性能更好、扩展性更强：Electron vs Tauri vs 原生/游戏引擎

下面给你一个“更贴桌宠场景”的选型结论（不是泛泛而谈）：

### 1) 如果你最在意“常驻资源占用 / 包体体积”

**优先看 Tauri（或原生）**。

原因是架构差异：

* Electron 官方就直接写了：Electron **把 Chromium 和 Node.js 嵌入到应用里**。这意味着你天然带着一整套浏览器运行时。 ([Electron][17])
* Tauri 官方架构描述：Tauri 通过 WRY 使用系统 WebView（Windows WebView2、macOS WKWebView、Linux WebKitGTK），并且“应用很小，因为使用 OS webview，不随应用分发 runtime，最终二进制由 Rust 编译”。 ([GitHub][18])

桌宠这种“就一只小动画常驻”的产品，用户对“内存几十到上百 MB 常驻”的容忍度更低，所以 Tauri 的优势更容易被用户感知。

### 2) 如果你最在意“跨平台一致性 + JS 生态扩展速度”

**Electron 更省心**。

Electron 的一大现实优势是：

* 渲染一致：你永远是 Chromium；
* Node 生态极其丰富：接入各种能力（托盘、热键、文件、网络、插件）成熟。

而 Tauri 的权衡点之一是系统 WebView 带来的差异：官方文档也会提醒不同平台 webview 的能力和版本更新方式不同（Windows WebView2 更“evergreen”，macOS 的 WKWebView 跟随系统版本等）。 ([Jonas Kruckenberg][19])

### 3) 如果你最在意“复杂渲染/Live2D/3D/物理效果”

分两种：

* **WebGL 路线**：Electron/Tauri 都可以，用 PixiJS/Phaser/Three.js 等做渲染。社区里 Electron + PixiJS + Live2D 的例子很多（如 Live2DPet）。 ([GitHub][10])
* **游戏引擎路线（Unity/Godot）**：上限更高，但工程复杂度/包体/平台适配成本也更高；适合你明确要 3D、骨骼、复杂碰撞、丰富特效的场景。

### 4) “扩展性更强”到底指什么？

* 指 **功能扩展快**：Electron（npm + Node）通常更快；
* 指 **系统能力扩展深**（全局输入、窗口管理、无障碍、低级 API）：Tauri（Rust 插件）或原生更有优势，且 Tauri 明确支持扩展默认 API，把 Webview 与 Rust 后端桥接起来。 ([Tauri][20])

---

## 给你一个更落地的建议（按你描述的需求组合）

### 你已经有 Electron 主应用，只是想加“系统级桌宠”

优先做 **Electron 内新增一个“桌宠悬浮窗”**：

* 桌宠做独立 `BrowserWindow`（透明/无边框/置顶/跳任务栏）；([Electron][14])
* 交互用 `setIgnoreMouseEvents` 做“默认穿透，需要时再可交互”；([Electron][15])
* Windows/Linux 尽量用 `setShape` 把命中区域裁小，解决“透明区域挡点击”；([Electron][15])
* 设置 UI 仍在你现有 Electron 窗口里，通过 IPC 同步配置。

这种方案总体工程量最可控，而且“联动”天然就是 Electron IPC。

### 你要做一个独立桌宠产品，并且很在意轻量/低占用

直接从 **Tauri 桌宠项目抄骨架**会更快：

* WindowPet/BongoCat/bongo-cat-next 这类项目已经把“透明置顶、穿透、托盘、快捷键、设置窗、跨平台打包”这些坑踩得差不多了。 ([GitHub][6])

### 你要“桌宠引擎很强（3D/Live2D/复杂交互）”，但 UI 想继续用 Electron

走 **混合架构**：桌宠进程（Tauri/Unity/原生）+ Electron 设置中心，IPC 联动。
这样你能把“常驻高频渲染”放在更适合的运行时里，同时保留 Electron 的业务 UI 开发效率。

---

## 你做系统级桌宠时一定会踩的几个坑（提前提醒）

1. **置顶并不等于永远最上层**：要用 `setAlwaysOnTop(true, 'screen-saver')` 之类更高 level 才更稳（尤其涉及任务栏、全屏窗口）。 ([Electron][15])
2. **Linux Wayland 环境对窗口全局坐标有限制**：Electron 文档里明确提到在 Wayland 下 `getBounds/getPosition` 会返回 `{x:0,y:0...}` 或 `[0,0]`，因为不允许全局坐标探测/操控——桌宠这种“自己到处跑”的产品在 Wayland 下更麻烦。 ([Electron][15])
3. **透明窗 + 鼠标交互**：要么用“窗口小 + 不穿透”，要么用“穿透 + 需要时切换”，要么用 `setShape` 裁命中区域（Windows/Linux）。 ([Electron][15])

---

如果你愿意我可以按你更偏的目标，给出一份更“可直接开工”的目录结构与模块拆分（比如：主进程窗口管理、桌宠渲染层选型 Pixi/Phaser、运动/碰撞/状态机、配置中心、托盘/热键、跨平台差异封装）。你不需要再回答很多问题——只要你告诉我：**你主要目标平台是 Windows/macOS/Linux 哪几个**，以及桌宠是 **2D sprite 还是 Live2D/3D**，我就按最合适的路线给你一套具体方案与关键代码片段。

[1]: https://github.com/samejima-ai/electron-desktop-pet?utm_source=chatgpt.com "samejima-ai/electron-desktop-pet - GitHub"
[2]: https://github.com/ee3lol/valentine-pet?utm_source=chatgpt.com "GitHub - ee3lol/valentine-pet: A charming, advanced Desktop Pet ..."
[3]: https://github.com/fre2dom0/Virtual-Pet?utm_source=chatgpt.com "GitHub - fre2dom0/Virtual-Pet: A fun and interactive desktop pet ..."
[4]: https://github.com/alex22022005/Mimo---Your-Cute-Desktop-Companion?utm_source=chatgpt.com "Cute Mimo - Your Cute Desktop Companion - GitHub"
[5]: https://github.com/Vinceli2401/Vixie?utm_source=chatgpt.com "GitHub - Vinceli2401/Vixie: An Electron-based desktop pet app that ..."
[6]: https://github.com/SeakMengs/WindowPet?utm_source=chatgpt.com "GitHub - SeakMengs/WindowPet: Pet overlay app built with tauri and ..."
[7]: https://github.com/ayangweb/BongoCat?utm_source=chatgpt.com "ayangweb/BongoCat: 跨平台互动桌宠 BongoCat ... - GitHub"
[8]: https://github.com/liwenka1/bongo-cat-next?utm_source=chatgpt.com "GitHub - liwenka1/bongo-cat-next: A modern desktop pet app with cute ..."
[9]: https://crabnebula.dev/blog/building-a-desktop-pet-with-tauri/?utm_source=chatgpt.com "Building and Distributing a Desktop Pet with Tauri - CrabNebula"
[10]: https://github.com/x380kkm/Live2DPet?utm_source=chatgpt.com "GitHub - x380kkm/Live2DPet: AI-powered Live2D desktop pet companion ..."
[11]: https://github.com/morettt/my-neuro?utm_source=chatgpt.com "My-neuro - GitHub"
[12]: https://github.com/robinwassen/electron-wallpaper?utm_source=chatgpt.com "Node module that allows you to attach a window as wallpaper in Windows."
[13]: https://github.com/meslzy/electron-as-wallpaper?utm_source=chatgpt.com "set your electron window as wallpaper behind desktop icons"
[14]: https://www.electronjs.org/docs/latest/tutorial/custom-window-styles?utm_source=chatgpt.com "Custom Window Styles - Electron"
[15]: https://www.electronjs.org/docs/latest/api/browser-window "BrowserWindow | Electron"
[16]: https://www.electronjs.org/docs/latest/api/screen?utm_source=chatgpt.com "screen - Electron"
[17]: https://www.electronjs.org/?utm_source=chatgpt.com "Build cross-platform desktop apps with JavaScript, HTML, and CSS | Electron"
[18]: https://github.com/tauri-apps/tauri?utm_source=chatgpt.com "GitHub - tauri-apps/tauri: Build smaller, faster, and more secure ..."
[19]: https://jonaskruckenberg.github.io/tauri-docs-wip/development/windows-and-webviews.html?utm_source=chatgpt.com "Windows & Webviews - The Tauri Documentation WIP"
[20]: https://v2.tauri.app/concept/architecture/?utm_source=chatgpt.com "Tauri Architecture"
