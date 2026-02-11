# 漫画元数据检索与解析器 (Manga Metadata Explorer) 技术文档

## 1. 项目概述

本项目是一个用于检索 Nhentai 和 E-Hentai 漫画元数据，并将其标准化为 Hitomi.la 兼容 JSON 格式的工具。
核心功能分为两部分：
1.  **数据获取 (Fetcher)**：通过代理服务器，利用 API 或 网页抓取获取原始元数据。
2.  **数据解析 (Parser)**：将不同来源的数据清洗、拆分（社团/作者/标题）并标准化输出。

此逻辑设计用于集成至 **Electron** 桌面应用中。

---

## 2. 核心架构 (Backend Logic)

在 Electron 中，这部分逻辑应运行在 **Main Process** (主进程) 或通过 `contextBridge` 暴露的 Node.js 环境中。

### 2.1 依赖库
*   `axios`: 发送 HTTP 请求。
*   `cheerio`: 解析 HTML（主要用于 E-Hentai 搜索结果）。
*   `socks-proxy-agent` / `https-proxy-agent`: 处理网络代理（必须，因为目标站点通常有墙或 IP 限制）。

### 2.2 数据获取策略

#### A. Nhentai (Source: `nhentai`)
*   **权限模式**: **完全公开 (Public)**。无需登录，无需 Cookie。
*   **接口**: `https://nhentai.net/api/gallery/{id}`
*   **搜索 (Search)**:
    *   接口: `/api/galleries/search?query={keyword}&page=1`
    *   **特点**: 搜索结果列表 (`result[]`) 中直接包含完整的详情数据（Tags, Pages, Cover），**不需要**二次请求。
*   **ID 获取**: 直接请求 Gallery API。
*   **封面图**: API 返回 `media_id`，构造 URL: `https://t.nhentai.net/galleries/{media_id}/cover.{jpg|png}`

#### B. E-Hentai (Source: `ehentai`)
*   **权限模式**: **游客模式 (Guest Mode)**。
    *   虽然 E-Hentai 有会员制，但本工具设计为在**不登录**的情况下也能正常工作。
    *   **Cookie 策略**: 必须在请求头中注入特定的 Cookie 以绕过限制。
*   **搜索 (Search)**:
    1.  **HTML 抓取**: 访问 `https://e-hentai.org/?f_search={keyword}`。
    2.  **解析**: 使用 Cheerio 从列表页提取链接，正则解析出 `gid` 和 `token`。
    3.  **批量获取**: 将所有 `{gid, token}` 组装，POST 请求 `api.php` 的 `gdata` 方法。
    4.  **优势**: 一次 HTTP 请求可获取最多 25 个结果的完整详情，效率极高。
*   **ID 获取**: 将 ID 包装为 `gid:123456` 进行搜索，从而“骗取”到 Token。

---

## 3. 认证与 Cookie 策略 (Authentication)

本项目采用 **“默认游客，兼容会员”** 的策略。

### 3.1 默认配置 (Guest Mode)
对于 E-Hentai，为了在不登录账号的情况下保证搜索稳定性和解析准确性，必须在 `axios` 请求头中默认硬编码以下 Cookie：

```javascript
// metadata_service.js 默认配置
this.cookies = config.cookies || 'sl=dm_1; nw=1';
```

| Cookie 键 | 值 | 作用 | 重要性 |
| :--- | :--- | :--- | :--- |
| `sl` | `dm_1` | **Extended View**。强制将搜索结果显示为“扩展列表模式”。这是爬虫解析 `gid` 和 `token` 的基础格式。 | 🔥 必须 |
| `nw` | `1` | **No Warnings**。自动跳过“Offensive Content”确认页。如果不加此项，访问敏感内容时会被重定向到警告页，导致爬虫失败。 | 🔥 必须 |

### 3.2 会员模式 (可选)
如果用户拥有 ExHentai (里站) 权限，可以通过设置界面填入 `ipb_member_id` 和 `ipb_pass_hash`。
*   **逻辑**: 后端代码直接透传用户输入的 Cookie 字符串。
*   **效果**: 搜索结果将包含里站内容（ExHentai）。
*   **现状**: 当前版本无需强制实现，游客模式已能覆盖 90% 的常规内容。

---

## 4. 解析规则 (Parser Logic)

这是本项目的核心业务逻辑，用于将原始数据转换为标准 JSON。

### 4.1 标题解析 (Title Parser)
针对格式：`(Event) [Group (Artist)] Title (Parody) [Lang]`

*   **正则逻辑**:
    1.  提取第一个 `[...]` 块。
    2.  **判断社团/作者**:
        *   如果 `[...]` 内部包含 `(...)`，即格式为 `[社团 (作者)]`：
            *   `Group` = "社团"
            *   `Artist` = "作者"
        *   如果 `[...]` 内部**不包含**圆括号，即格式为 `[名字]`：
            *   **规则**: `Group` = "" (空), `Artist` = "名字" (作为作者处理)。
    3.  **提取标题**: 截取第一个 `]` 之后的所有内容作为 Title。
*   **多语言**: 对 `title` (英文/罗马音) 和 `title_jpn` (日文) 分别执行上述解析。

### 4.2 标签标准化 (Tag Normalization)
*   **数据源**: Nhentai (对象数组) / E-Hentai (字符串数组)。
*   **处理流程**:
    1.  统一转换为 `namespace:value` 格式。
    2.  **过滤**: 移除 `group`, `artist`, `category`, `language` 命名空间（因为已提升为根字段）。
    3.  **强制保留**: 确保 `parody` 和 `character` 键存在（默认空字符串）。

### 4.3 字段规格化
*   **Source**: `{ site: "...", url: "...", id: 123, token: "..." }`。Nhentai 的 token 为空字符串。
*   **Posted**: 统一格式化为 `YYYY-MM-DD`。
*   **Stats**:
    *   Nhentai 使用键名 `favorited` (收藏数)。
    *   E-Hentai 使用键名 `rating` (评分)。

---

## 5. 输出 JSON 格式规范

```json
{
  "source": {
    "site": "ehentai",          // "nhentai" | "ehentai"
    "url": "https://e-hentai.org/g/2146691/e7ed215837/",
    "id": 2146691,
    "token": "e7ed215837"       // nhentai 为 ""
  },
  "title": "Mesu Ushi Taimanin...",      // 解析后的英文标题
  "title_jpn": "メス牛対魔忍...",         // 解析后的日文标题
  "thumb": "https://...",                // 封面缩略图 URL
  "artist": "Remu",                      // 英文作者
  "group": "Ikemen Teikoku",             // 英文社团
  "artist_jpn": "れむ",                  // 日文作者
  "group_jpn": "イケメン帝国",            // 日文社团
  "posted": "2022-02-20",                // YYYY-MM-DD
  "rating": "4.44",                      // E-Hentai 专有字段
  // "favorited": "2786",                // Nhentai 专有字段 (二选一)
  "tags": {
    "parody": "taimanin yukikaze",
    "character": "shiranui mizuki",
    "female": "big breasts, lactation, ..." // 其他标签，逗号分隔
  }
}
```

---

## 6. Electron 集成指南

### 6.1 IPC 通信架构
建议将 `metadata_service.js` 作为核心工具类放入 Electron 的 `main` 进程或 `utility` 进程中。

*   **Main Process (`main.js`)**:
    ```javascript
    const { ipcMain } = require('electron');
    const MangaMetadataService = require('./services/metadata_service');

    ipcMain.handle('metadata:search', async (event, { input, source }) => {
        // 实例化时应用默认配置
        // 可以在这里读取 Electron Store 中的代理设置
        const service = new MangaMetadataService({ 
            proxy: 'socks5://127.0.0.1:2080',
            cookies: 'sl=dm_1; nw=1' // 默认注入游客 Cookie
        });
        
        if (source) {
            return await service.searchOne(source, input);
        } else {
            return await service.searchAll(input);
        }
    });
    ```

*   **Preload Script (`preload.js`)**:
    ```javascript
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('metadataAPI', {
        search: (input, source) => ipcRenderer.invoke('metadata:search', { input, source })
    });
    ```

### 6.2 前端交互 (Renderer)
1.  **解析逻辑 (Parser)**:
    *   `parseToHitomi` 函数是纯数据转换逻辑，**建议直接运行在 Renderer 进程（前端）**。
    *   用户点击 "Parse" 按钮时，前端直接读取当前内存中的 Search Result 对象，执行 JS 转换，并显示结果。不需要再次请求后端。
2.  **状态管理**:
    *   使用 `CACHE` 对象（或 React/Vue State）暂存搜索结果，以便点击 "Parse" 时能快速获取原始数据。

### 6.3 错误处理与网络
*   **网络超时**: 默认设置为 25s。由于走 SOCKS5 代理，国内网络波动可能导致超时，建议在 UI 上提供“重试”按钮。
*   **Token 失效**: 如果 E-Hentai 返回空结果或解析错误，优先检查 IP 是否被 Ban，或尝试更新 `nw=1` Cookie。
