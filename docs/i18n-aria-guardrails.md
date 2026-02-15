# i18n / aria 开发约束（长期执行）

## 适用范围

- 适用于 renderer 侧所有新增或修改的 UI 文案、可访问名称 (Accessible Name) 与 tooltip。
- 本文为长期约束，优先级高于临时口头约定。

## 强制规则

1. 文案来源唯一化（Single Source of Truth, SSOT）
   - 新增用户可见字符串必须进入 i18n 字典，禁止在 JSX 中新增硬编码中文/英文。
   - 字典基线以 `src/i18n/locales/zh-CN.ts` 为准，`src/i18n/locales/en-US.ts` 必须同步补齐。

2. key 命名分层
   - 可见界面文案：`ui.*`
   - 可访问标签：`a11y.*`
   - tooltip 提示：`tip.*`
   - 禁止跨层复用（例如把 `tip.*` 直接当 `aria-label` 使用）。

3. 可访问语义约束
   - 交互控件（button/input/select/slider 等）必须具备稳定 `aria-label`。
   - 关键控件必须具备稳定 `data-a11y-id`，优先通过 `ariaRegistry` + `buildA11yPropsByRegistry` 产出。
   - 动态 `aria-label` 必须使用模板 key + params（例如 `{{count}}`），禁止字符串拼接硬编码。

4. 组件实现约束
   - 组件中禁止新增以下硬编码属性值：`aria-label`、`title`、`placeholder`、`alt`、tab/button 可见文本。
   - 对历史遗留硬编码，按“触达即治理”原则：本次改动覆盖到的区域应一并迁移到 `t()`。

5. 测试与自动化约束
   - 新增测试定位优先使用 `data-a11y-id`，避免绑定具体自然语言文案。
   - 可保留少量 `getByRole(..., { name })` 断言用于验证语义存在，但不得作为唯一稳定定位手段。

## 开发流程（每次改动必走）

1. 先加 key：先补 `zh-CN`，再补 `en-US`。
2. 再替换引用：组件只通过 `t()` 或 a11y helper 取值。
3. 自检门禁：
   - `npm run i18n:check`
   - 受影响测试（最小范围）
   - `npm run build`

## 合并门禁（Definition of Done）

- 不存在新增硬编码 `aria-label/title/placeholder/alt/按钮文本`。
- `i18n:check` 通过。
- 受影响测试通过，且构建通过。
- 若新增关键交互控件，`ariaRegistry` 与相关测试同步更新。
