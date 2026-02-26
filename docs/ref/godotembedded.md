下面把你关心的几个点（社区实践/讨论、Electron 下整合方式、性能对比、以及“后端数据怎么进 Godot 场景”）按“能落地”的角度整理一下，并把关键限制/坑位也标出来。

---

## 1) 社区是否有人这么做过？有哪些实践与讨论？

确实有人在做，而且主流路径基本一致：**Electron 本质是 Chromium，所以把 Godot 的 Web（HTML5/WebAssembly）导出当成一个“网页游戏”塞进 Electron 的 renderer 里**。

你可以参考这些“讨论/落地案例”：

* **Godot Forum：把 Godot 嵌入 Electron/SwiftUI 等桌面壳的讨论**
  有人明确建议：Electron 里直接用 Godot 的 Web Export，并指向官方 Web 导出与定制 HTML Shell 的文档。([Godot Forum][1])

* **GemShell（商业工具）：用 Electron 把 Godot HTML5 导出直接打包成桌面应用**
  他们的卖点就是 “Electron under the hood / Full Chromium，所以 Construct/Phaser/**Godot HTML5 export** 可直接跑”。这从侧面证明“Godot Web 导出 → Electron 桌面壳”是可行且常见的工程路线。([GemShell][2])

* **Narrat + Godot 的整合示例（开源仓库）：Web 导出嵌入 Web UI，并双向通信**
  这个仓库把 Godot Web 导出嵌在另一个前端 UI（Narrat）里，UI 覆盖在 Godot 上层，并通过 Godot 的 JavaScriptBridge 做双向交互；作者也直说“Web build 预期性能比 native 差”。这和你 “Electron + React UI + Godot 场景” 的结构非常接近。([GitHub][3])

* **React 内嵌 Godot HTML5 导出的 StackOverflow 讨论**
  典型坑：Godot Web 导出**需要在服务器环境下运行**（而不是随便 import 一个 js 就完事），以及导出文件（.js/.wasm/.pck）放置路径的要求。([Stack Overflow][4])

* **如果你选 Three.js：Electron + React + Three.js 的 boilerplate 非常多**
  例如这个 repo 就是“Electron + React + Three.js（含基础场景/物理）”开箱模板。([GitHub][5])
  也有 React Three Fiber 官方 examples 索引，生态成熟。([r3f.docs.pmnd.rs][6])

---

## 2) Godot Web（HTML5/WebAssembly）在 Electron 里怎么整合？能不能“直接塞进去”？

### 2.1 结论

**能整合，而且 Electron 里跑起来通常比在 Safari/移动端浏览器更省心**（因为 Chromium 环境一致），但要注意两类问题：

1. **Godot Web 导出不是“随便打开一个本地 html 文件就完事”，官方明确是“生成一组需要被 Web Server 服务的文件”。**([Godot Engine documentation][7])
2. 如果你开了 **Use Threads（多线程）**，会牵扯到 **SharedArrayBuffer + COOP/COEP** 之类的“跨域隔离/安全上下文”要求；Godot 4.3 起默认更偏向单线程导出以绕开这个门槛，但性能会差一些。([Godot Engine documentation][7])

---

### 2.2 推荐的整合方式（更稳、更像工程化）

#### 方式 A：Electron 内起一个本地 HTTP Server 来 serve 导出目录（最推荐）

* 把 Godot Web 导出的文件夹（index.html、.js、.wasm、.pck…）放到 app 资源目录
* Electron main process 起一个本地 server（Express / Koa / 静态文件服务器都行）
* BrowserWindow / React 里用 `http://127.0.0.1:PORT/godot/index.html` 加载
* 好处：

  * 更贴近 Godot 文档要求的“Serving the files from a web server”。([Godot Engine documentation][7])
  * `.wasm` 的 MIME type（`application/wasm`）等问题更好控制，启动优化更容易满足。([Godot Engine documentation][7])
  * 后面如果需要 COOP/COEP / PWA 也好处理。([Godot Engine documentation][7])

#### 方式 B：不用本地 server，直接 `loadFile` / 自定义 protocol（可行但坑更多）

你可以做到，但会更容易踩到：

* wasm 加载/MIME、路径基准（basePath）、缓存/跨域隔离等细节
  因此除非你非常熟 Electron 的 protocol + header 注入链路，否则优先 A。

---

### 2.3 React UI 怎么“嵌”Godot：两种常用布局

#### 方案 1：Godot 独立页面（iframe / webview / 单独 BrowserWindow）

* React 页面里放一个 `<iframe src=".../godot/index.html" />`
* 或者 Electron 用 `<webview>`/BrowserView
* 好处：UI 与 Godot DOM 隔离，React 不容易误伤 canvas/脚本生命周期
* 官方也提到：默认 HTML 页面绘制方式适合被插进 `<iframe>` 里，这是常见做法。([Godot Engine documentation][7])

#### 方案 2：同一页面内把 Godot canvas 当“一个组件”（更紧耦合、更像“UI 覆盖在游戏上”）

这时你通常会：

* 用 Godot 的 **Custom HTML page (HTML shell)** 自己写一个壳页面，在里面放你的布局容器与 `<canvas>`，再用 `Engine(...).startGame()` 启动。([Godot Engine documentation][8])
* 通过 `EngineConfig.canvas` 指定 canvas 元素；用 `canvasResizePolicy=0` 自己控制尺寸（更符合 React 布局）。([Godot Engine documentation][9])

> 这条路线和 narrat-godot-sample 的“Web UI 在上层、Godot 在底层”结构非常像。([GitHub][3])

---

## 3) 性能：Electron + Godot HTML5（Web） vs 原生 Windows/iOS 导出

### 3.1 Web 导出本质是什么

Godot Web 导出依赖浏览器端能力：**WebAssembly + WebGL 2.0**。([Godot Engine documentation][7])
Electron 里跑 Web 导出，本质就是在 Chromium 里跑。

### 3.2 对比结论（经验 + 官方限制推导）

* **原生 Windows 导出**（Godot desktop export）通常会更强：

  * 渲染走原生图形 API（如 Vulkan/DirectX 之类，具体取决于 Godot 渲染后端与平台）
  * 线程、文件 IO、底层网络等能力更完整
* **原生 iOS 导出**也通常更强：

  * 原生渲染与系统能力（Metal、系统音频/输入/资源管线）
  * 注意：**Electron 本身无法在 iOS 上跑**，所以你如果要上 iOS，实际还是要做 Godot 原生 iOS 包（或 Web 版跑 Safari/WKWebView，但那又回到 Web 限制）。

### 3.3 Godot Web 的“线程/性能”关键点（非常影响你在 Electron 的策略）

* Godot 文档明确：

  * 开启 **Thread Support** 能用多线程提升性能，并且能启用更低延迟的音频流播放，但需要 **cross-origin isolation headers**。([Godot Engine documentation][7])
  * 如果开启 Use Threads，Godot Web 会用 `SharedArrayBuffer`，要求安全上下文，并要求服务端发：

    * `Cross-Origin-Opener-Policy: same-origin`
    * `Cross-Origin-Embedder-Policy: require-corp` ([Godot Engine documentation][7])
* Godot 4.3 起：提供**单线程 Web 导出**作为默认/推荐路径，解决了上面一堆 header/隔离问题，但缺点是**不能用线程，性能不如多线程导出**。([Godot Engine documentation][7])
* 官方还提到：单线程 Web 导出在 macOS/iOS 上兼容性更好（以前多线程 Web 导出在 Apple 平台有兼容问题）。([Godot Engine documentation][7])

**因此在 Electron 下的实用建议是：**

* 如果你是“教育/工具类 + 中轻量 2D/3D”，先用 **单线程 Web 导出**跑通整合与通信（最省心）。([Godot Engine documentation][7])
* 如果你确实需要更高性能/需要 GDExtension/低延迟音频流：再考虑打开 Thread Support + 配置 COOP/COEP（下面给你 Electron 侧怎么配）。([Godot Engine documentation][7])

另外一个现实点：很多社区整合示例也会提醒“Web build 性能会比 native 差”，比如 narrat 的示例仓库就直说可以预期更差的性能。([GitHub][3])

---

## 4) 在 Electron 里启用 Godot Web 多线程（Use Threads）怎么配？SharedArrayBuffer 怎么搞？

### 4.1 Godot 要求的 headers

如上，Godot 文档给了 COOP/COEP 两个响应头。([Godot Engine documentation][7])

### 4.2 Electron 侧常见做法：用 `webRequest.onHeadersReceived` 注入

社区里有可直接用的做法（StackOverflow 里验证过）：在 BrowserWindow 的 session 上拦截响应头，补上 COOP/COEP。([Stack Overflow][10])
Electron 官方也说明 `WebRequest` 就是用来拦截/修改请求生命周期内容的。([Electron][11])

伪代码示意（不要照抄安全配置到生产就完事，按你工程结构落地）：

```js
// main process
const win = new BrowserWindow({ /* ... */ })

win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  const headers = details.responseHeaders || {}
  headers['Cross-Origin-Opener-Policy'] = ['same-origin']
  headers['Cross-Origin-Embedder-Policy'] = ['require-corp']
  callback({ responseHeaders: headers })
})
```

> 如果你走“方式 A：本地 HTTP server”，你也可以直接在 server 返回这些 headers（更直观）。

### 4.3 PWA workaround

如果你“无法控制响应头”，Godot 也提供了 PWA（service worker）方案去模拟这些 header，但仍需要安全上下文。([Godot Engine documentation][7])
在 Electron 里你一般是可控的，所以更常用的是“本地 server + headers”或“webRequest 注入”。

---

## 5) 后端服务数据能否传递到 Godot 场景？怎么做最稳？

结论：**能**，而且有两条主路径，你可以按“跨平台一致性 vs Electron 特化”取舍。

---

### 路径 1：Godot（Web）自己连后端（HTTP/WebSocket）

Godot Web 平台的网络能力是有明确边界的：

* 低层网络（比如传统 UDP/TCP 那种）在 Web 平台不实现
* 目前支持：HTTP client/requests、WebSocket（client）、WebRTC
* 并且 HTTP 受 same-origin policy 等浏览器限制（CORS）。([Godot Engine documentation][7])

所以你可以：

* 在 Godot 用 `HTTPRequest` 拉 REST API
* 或用 `WebSocketPeer` 连实时服务
* 后端要配 CORS（或者把 API 同源化）

优点：跨平台（未来你做纯 Web、做 iOS Safari/WKWebView）都能复用。
缺点：受 Web 限制更多，CORS/鉴权/证书等要处理。

---

### 路径 2：Electron（Node）做“后端代理/客户端”，再把数据喂给 Godot（推荐做复杂业务时用）

这在“Electron + React + Godot Web”里经常更舒服：

1. Electron main process（Node）去请求后端（不受浏览器 CORS 约束）
2. 通过 IPC 把数据送到 renderer（React）
3. 再用 **JavaScriptBridge** 把数据送进 Godot 场景

Godot 官方提供 `JavaScriptBridge.get_interface()` 取全局对象，以及 `create_callback()` 把 Godot 函数变成 JS 可调用回调。([Godot Engine documentation][12])

#### 2.1 React/网页 → Godot：推送消息（最直观）

思路：在 Godot 里注册一个回调到 `window.godotReceive`，React 调用它。

**Godot（GDScript）示意：**

```gdscript
extends Node

var _recv_cb

func _ready():
    if OS.has_feature("web"):
        var window = JavaScriptBridge.get_interface("window")
        _recv_cb = JavaScriptBridge.create_callback(_on_from_js)
        window.godotReceive = _recv_cb

func _on_from_js(args):
    var json_text = str(args[0]) # JS 第一个参数
    var msg = JSON.parse_string(json_text)
    if msg and msg.has("type"):
        # 这里更新场景/节点状态
        print("got message: ", msg)
```

**React / Electron renderer 侧示意：**

```js
window.godotReceive(JSON.stringify({
  type: "backend_data",
  payload: { /* ... */ }
}))
```

`create_callback` 的回调签名要求“只接收一个 Array 参数（JS arguments 转数组）”，这一点官方有警告说明。([Godot Engine documentation][12])

#### 2.2 Godot → React/网页：调用 JS API（拉取/命令式调用）

Godot 侧可以 `get_interface("window")` / `get_interface("axios")` 这种方式拿到 JS 对象并调用。([Godot Engine documentation][12])
（narrat 示例也是用 JavaScriptBridge 来拿到外部对象并通信。([GitHub][3])）

---

## 6) Godot vs Three.js：在 Electron + React 场景下怎么选？

### 选 Godot（Web 导出塞 Electron）的典型理由

* 你要的是“完整引擎”能力：场景树、动画、物理、编辑器工作流、资源管线等
* 你接受 Web 平台限制，并愿意处理“导出文件服务/headers/桥接通信”
* 你希望未来同一套内容还能走纯 Web 发布（HTML5）

但你要接受：

* Web 导出依赖 WebAssembly + WebGL2，且 Web 平台在网络/线程/音频等方面有明确限制。([Godot Engine documentation][7])
* 多线程性能路线要处理 COOP/COEP；单线程省心但性能更弱。([Godot Engine documentation][7])
* Godot 4 的 C# 项目目前不能导出到 Web（如果你打算用 C#，要么改 GDScript，要么考虑 Godot 3 的 Web 导出路线）。([Godot Engine documentation][7])

### 选 Three.js（或 React Three Fiber）的典型理由

* 你本来就用 React，Three.js/R3F 在 React 生态里非常顺滑，Electron 里就是“原生支持的 Web 渲染路径”
* UI（React）与 3D（Three/R3F）同构，不需要“引擎导出 + 桥接”那套额外工程
* 社区模板/脚手架非常多，上手成本低（比如 Electron + React + Three.js boilerplate）。([GitHub][5])

但你要接受：

* Three.js 不是“游戏引擎”：关卡、资源管理、物理、动画状态机、编辑器工作流等，需要你自己搭或引入更多库/工具链。

---

## 7) 给你一个“最稳的落地路线”（不纠结、先跑通）

如果你现在是“Electron + React 必须保留”，同时又想用 Godot 做核心互动/场景：

1. **先用 Godot 4.3+ 的单线程 Web 导出**跑通（默认推荐方向），把工程集成/通信打通。([Godot Engine documentation][7])
2. Electron main 起本地静态 server serve Godot 导出目录（按文档要求）。([Godot Engine documentation][7])
3. React 用 iframe/webview 承载 Godot（隔离 DOM，减少互相干扰），通信先用 `postMessage` 或“同 window 的 JSBridge 回调”。（Godot 文档也提到 iframe 常见。([Godot Engine documentation][7])）
4. 需要性能再开 Use Threads，并在 Electron/本地 server 侧补 COOP/COEP（webRequest 注入或 server headers）。([Godot Engine documentation][7])
5. 后端数据：复杂业务走 Electron main 代理 → IPC → JSBridge 喂给 Godot；简单业务直接 Godot HTTPRequest/WebSocket。([Godot Engine documentation][7])

---

如果你愿意，我也可以按你更偏好的 UI 结构给你画两套“工程目录 + 运行链路”的参考：

* **React 覆盖在 Godot 画面上（同页面）**：更像游戏内 UI/工具条
* **React 与 Godot 分 tab/分 iframe（隔离）**：更像“应用 + 游戏”双模块

但不管选哪种，核心结论不变：**Godot Web 导出能进 Electron；性能一般弱于 native；通过 JavaScriptBridge + Electron IPC 可以把后端数据可靠送进 Godot 场景。**

[1]: https://forum.godotengine.org/t/how-to-embed-a-godot-game-inside-another-native-desktop-app/105613 "How to embed a Godot game inside another native desktop app? - General - Godot Forum"
[2]: https://gemshell.dev/?utm_source=chatgpt.com "GemShell - Convert HTML5 Games to Steam Desktop Apps | GemShell"
[3]: https://github.com/liana-p/narrat-godot-sample "GitHub - liana-p/narrat-godot-sample: Sample project of the Narrat and Godot integration, with instructions on how to set one up"
[4]: https://stackoverflow.com/questions/73529339/how-to-embed-an-html5-godot-export-into-a-react-app "javascript - How to embed an HTML5 Godot export into a React app - Stack Overflow"
[5]: https://github.com/Wow-Its-Ian/electron-react-three-boilerplate "GitHub - Wow-Its-Ian/electron-react-three-boilerplate"
[6]: https://r3f.docs.pmnd.rs/getting-started/examples?utm_source=chatgpt.com "Examples - React Three Fiber - Poimandres"
[7]: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html "Exporting for the Web — Godot Engine (stable) documentation in English"
[8]: https://docs.godotengine.org/en/stable/tutorials/platform/web/customizing_html5_shell.html "Custom HTML page for Web export — Godot Engine (stable) documentation in English"
[9]: https://docs.godotengine.org/en/stable/tutorials/platform/web/html5_shell_classref.html "HTML5 shell class reference — Godot Engine (stable) documentation in English"
[10]: https://stackoverflow.com/questions/71770369/use-sharearraybuffer-from-an-electron-app "sharedarraybuffer - Use ShareArrayBuffer from an electron app - Stack Overflow"
[11]: https://www.electronjs.org/docs/latest/api/web-request "Class: WebRequest | Electron"
[12]: https://docs.godotengine.org/en/stable/tutorials/platform/web/javascript_bridge.html "The JavaScriptBridge singleton — Godot Engine (stable) documentation in English"


可以，但要先把预期说清楚：**Electron 本身并没有“把任意外部原生窗口嵌到网页 DOM 里”的官方能力**；你要在 Electron 里“嵌入 Godot 原生 Windows 导出（.exe）”，本质上是 **Win32 窗口句柄（HWND）级别的重父子化/窗口拼装**，通常需要 **Native Node addon（N-API）或调用 Win32 API** 来做。([GitHub][1])

下面给你三条可落地路线，按“稳定性/复杂度/效果”从低到高排列。

---

## 方案 A：不做真正嵌入（最稳）——单独 Godot 窗口 + 通信

**Godot 原生 exe 作为独立窗口运行**，Electron 负责 UI/业务壳，二者通过 IPC 通信。

* 优点：最稳定、跨版本风险小、不会踩 SetParent 的各种坑。
* 缺点：看起来不是“一个窗口里的一个区域”，而是两个窗口（但可以做一些“看似一体化”的优化，比如自动对齐位置）。

**通信怎么做：WebSocket/TCP 都行**。
Godot 原生端可以用 `WebSocketPeer`（Godot 4.x 文档里明确它支持作为 client 或 server 连接，靠 `connect_to_url()` + `poll()` 驱动收发）。([Godot Engine documentation][2])
Electron 侧用 Node 的 `ws` 起个 localhost server，然后 Godot 连接过来即可。

> 这条路线和“嵌入”无关——即使你后面升级到方案 B/C，通信层也建议保持一致（WebSocket + JSON 消息）。

---

## 方案 B：伪嵌入（工程上常用）——Godot 在下层，Electron 透明叠加 UI

做法是：

1. Godot 原生 exe 正常开一个窗口（全屏或固定尺寸）
2. Electron 开一个 **透明/无边框** 的 BrowserWindow，当作 UI overlay 盖在 Godot 上面
3. Electron 监听移动/缩放，把自己的 overlay 跟着 Godot 窗口同步（或反过来）

这在“视频播放器 UI overlay”之类的场景很常见（Electron 官方 issue 里也有人用透明窗口叠加来模拟“嵌入”效果）。([GitHub][3])

* 优点：**性能最好**（Godot 完全原生渲染，不被 SetParent 干扰），并且 UI（React）叠加也自然。
* 缺点：严格说仍然是两个窗口，只是用户感知接近一个。

如果你要的是“Electron 壳 + React UI + 原生 Godot 渲染”，而且希望避开 Win32 黑魔法，**这方案往往是性价比最高**。

---

## 方案 C：真嵌入（SetParent）——把 Godot 的 HWND 变成 Electron 窗口的子窗口

这是你问的“真正嵌入在 Electron 应用里”的路线。核心是：**拿到两边 HWND → 改样式 → SetParent → resize/clip 处理**。

### C1. 关键点：Electron/Chromium 不直接支持，通常要 Native addon

Electron 社区有不少“把记事本/计算器窗口嵌进 Electron”的 demo，普遍做法是写一个 Node 原生模块负责：

* 枚举外部进程窗口
* 改窗口 style（WS_POPUP/WS_CHILD 等）
* `SetParent` 重设父窗口
* `SetWindowPos` 跟随容器缩放

例如这个开源项目的 README 就明确说：Electron 不原生支持嵌入外部 Windows 应用窗口，需要 Native module 来桥接。([GitHub][1])
Electron 官方也有教程说明如何在 Windows 上用 C++/Win32 写 Native addon 并与 JS 通信。([Electron][4])

### C2. 你需要拿到两个 HWND

**(1) Electron 容器 HWND：**
`BrowserWindow.getNativeWindowHandle()` 返回平台句柄，Windows 上就是 `HWND`（Buffer）。([Electron][5])

**(2) Godot exe 的 HWND：**

* Godot 4.x：`DisplayServer.window_get_native_handle(DisplayServer.WINDOW_HANDLE, window_id)`，HandleType 里明确 `WINDOW_HANDLE` 在 Windows 上是 `HWND`。([Godot Engine documentation][6])

> 实战建议：让 Godot 在启动后把自己的 HWND 打印到 stdout（或通过 WebSocket 发给 Electron），Electron spawn 子进程时读取 stdout 就能拿到，不用做复杂的 EnumWindows 查找。

### C3. SetParent 之前必须处理窗口样式（非常关键）

Win32 的 `SetParent` **不会自动帮你把窗口从 WS_POPUP 变成 WS_CHILD**，微软文档明确写了：兼容性原因，`SetParent` 不会修改 `WS_CHILD` 或 `WS_POPUP` 样式，所以你要自己改。([Microsoft Learn][7])

典型流程（在 native addon 里做）：

1. `GetWindowLongPtr(child, GWL_STYLE)`
2. 去掉 `WS_POPUP | WS_CAPTION | WS_THICKFRAME` 等顶层窗口样式
3. 加上 `WS_CHILD`
4. `SetParent(child, container)`
5. `SetWindowPos(..., SWP_FRAMECHANGED | SWP_SHOWWINDOW)` 让样式生效并调整尺寸

（开源 demo 的 C++ 片段也基本就是这套路：改 style → SetParent → SetWindowPos。([GitHub][1])）

### C4. resize/渲染卡死/闪烁：SetParent 跨进程的经典坑

把两个不同进程的 UI 窗口做父子关系，容易出现：

* 父窗口 resize 时子窗口停止渲染/卡住
* 闪烁、重绘异常、输入焦点问题

有实践者总结过：`SetParent` 会让两边消息循环被“串行化/互相等待”，导致卡顿或渲染冻结；同时建议配合 `WS_CLIPCHILDREN`（父）和 `WS_CLIPSIBLINGS`（子）来减少互相干扰。([GitHub][8])
Electron 社区的相关讨论也提到要处理 Chromium 内部的子窗口（Intermediate D3D Window）以及 clip 样式，否则会闪烁。([bleepCoder][9])

> 所以：**真嵌入能做，但你要准备花时间处理 Win32 消息/重绘/焦点/DPI**。这也是为什么很多团队最后更偏向方案 B 的“overlay”。

---

## 通信：不管你选 A/B/C，都能和 Godot 原生 exe 通信

一旦 Godot 是独立进程，“嵌入”只是 UI 表现；**通信层跟是否嵌入没有强绑定**。

### 推荐：WebSocket（最通用）

* Electron（Node）起 server：`ws://127.0.0.1:PORT`
* Godot 用 `WebSocketPeer.connect_to_url()` 连上，循环 `poll()` 收包发包。([Godot Engine documentation][2])
* 消息用 JSON（事件名 + payload），Godot 收到后更新场景状态即可

这样你后面即使从“原生 Godot”切到“Godot HTML5（Electron 内嵌）”，消息协议也能复用（只要把 Godot 侧换成 JSBridge 或 WebSocket）。

---

## 我给你的“选择建议”（按你最开始的诉求：更高性能 + Electron/React 壳）

* **你想要最高稳定性 + 原生性能**：优先 **方案 B（overlay）**，体验上接近嵌入，但工程风险远小于 SetParent。
* **你必须要“一个窗口里一个区域就是 Godot”**：走 **方案 C（SetParent + native addon）**，并且从一开始就接受它是 Windows-only、需要 Win32 深度调参的路线。([Electron][4])

如果你愿意，我可以按你现在的 UI 结构（React 里是否需要在某个 div 区域显示 Godot、是否要滚动布局、是否要多窗口/多屏）给你一套更具体的“嵌入容器窗口 + rect 同步 + 子窗口 resize”的实现骨架（Electron main/renderer IPC 以及 native addon 暴露的 API 形状）。

[1]: https://github.com/sweetwisdom/electron-native-windows "GitHub - sweetwisdom/electron-native-windows: Electron comunicate with native process by grpc"
[2]: https://docs.godotengine.org/en/stable/classes/class_websocketpeer.html?utm_source=chatgpt.com "WebSocketPeer — Godot Engine (stable) documentation in English"
[3]: https://github.com/electron/electron/issues/10547?utm_source=chatgpt.com "Embed External Native Windows · Issue #10547 · electron/electron - GitHub"
[4]: https://www.electronjs.org/docs/latest/tutorial/native-code-and-electron-cpp-win32?utm_source=chatgpt.com "Native Code and Electron: C++ (Windows)"
[5]: https://www.electronjs.org/docs/latest/api/browser-window "BrowserWindow | Electron"
[6]: https://docs.godotengine.org/en/stable/classes/class_displayserver.html "DisplayServer — Godot Engine (stable) documentation in English"
[7]: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent?utm_source=chatgpt.com "SetParent function (winuser.h) - Win32 apps | Microsoft Learn"
[8]: https://github.com/guoliang724/ExplorationAtWork-electron-embed-nativewindows "GitHub - guoliang724/ExplorationAtWork-electron-embed-nativewindows"
[9]: https://bleepingcoder.com/electron/258604996/embed-external-native-windows?utm_source=chatgpt.com "electron - Embed External Native Windows - bleepingcoder.com"
