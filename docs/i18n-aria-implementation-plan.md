# i18n 与 aria-label 规范化实施计划 (v1)

Last updated: 2026-02-15

## 实施状态（2026-02-15）

- [x] Phase 1 完成，commit: `6eb69d0`
- [x] Phase 2 完成，commit: `8ac0b85`
- [x] Phase 3 完成，commit: `34da577`
- [x] Phase 4 完成，commit: `b6b72ab`
- [x] Phase 5 完成，commit: `77e135e`
- [x] Phase 6 完成，commit: `TBD (本次提交)`

本计划用于落地以下目标：

1. 建立可维护的国际化 (i18n, internationalization) 基础设施。
2. 建立可扩展的可访问名称 (aria-label, Accessible Name) 规范。
3. 在新增/删除按钮、文案、提示、选项时可低成本调整。
4. 通过配置驱动多语言，避免散落硬编码。
5. 让自动化与测试不再依赖具体语言文案，降低回归脆弱性。

---

## 执行总约束

- 分阶段执行：`Phase N` 完成并通过测试后，才允许进入 `Phase N+1`。
- 最小读取：每个 Phase 只读取该 Phase 指定文件，避免上下文过载。
- 单阶段自洽：每个 Phase 内包含目标、TODO、checklist、测试、提交推送。
- 测试门禁：测试未通过，不允许提交。
- Git 门禁：每个 Phase 完成后单独 commit + push。
- 文案边界：用户可见字符串统一进入字典，不再新增硬编码。
- 自动化边界：测试/脚本优先使用稳定选择器，不使用语言文案作唯一定位条件。

术语约定：
- 国际化 (i18n)
- 本地化 (l10n, localization)
- 可访问名称 (Accessible Name)
- 稳定选择器 (stable selector)

---

## 范围定义

纳入本次 i18n 的字符串范围（除你已列出的内容外，补齐如下）：

- 按钮文字、界面文字、`aria-label`、`tooltip`。
- 对话框标题、确认文案、危险操作提示。
- 空状态、加载状态、成功/失败状态提示。
- 表单 `label`、`placeholder`、`option` 文案。
- 状态 HUD 文案、可读错误提示（面向用户）。

不纳入本次范围：

- 纯开发期异常文本（`throw new Error(...)`）可暂保留中文/英文混合。
- 第三方库内部文案。

---

## 新对话启动提示词（总模板）

```text
你现在执行 docs/i18n-aria-implementation-plan.md 的 <PHASE_ID>。

强约束：
1) 只读取该 Phase 的“仅读文件列表”，不要额外扩读。
2) 仅按该 Phase 的 TODO 和 checklist 改动，不做跨 Phase 扩散。
3) 先跑该 Phase 测试；测试通过后再 commit + push。
4) 输出：
   - 改动文件列表
   - checklist 勾选结果
   - 测试命令与结果
   - commit hash 与 push 结果
```

---

## Phase 1 - i18n 基础骨架与 locale 持久化

### 目标

- 增加 `uiLocale` 配置项并接入现有设置持久化链路。
- 建立字典目录与类型约束，不修改现有 UI 文案行为。

### 仅读文件列表

- `src/contracts/settings.ts`
- `src/store/useUiStore.ts`
- `src/store/useUiStore.test.ts`
- `src/features/app/useAppSettingsStore.ts`
- `src/features/app/usePersistedAppSettings.ts`
- `src/features/app/useSettingsPersistence.ts`
- `src/features/app/useSettingsPersistence.test.tsx`

### TODO

1. 在 `AppSettings` 增加 `uiLocale`（建议：`auto | zh-CN | en-US`）。
2. 默认值设为 `auto`，并保证旧持久化数据缺失该字段时可平滑迁移。
3. 新建 i18n 字典基础文件：
   - `src/i18n/locales/zh-CN.ts`（默认、SSOT）
   - `src/i18n/locales/en-US.ts`
   - `src/i18n/catalog.ts`（类型与注册）
   - `src/i18n/locale.ts`（locale 解析与 fallback）
4. 为字典键增加类型约束（以默认字典键为基准）。

### Checklist

- [ ] `uiLocale` 可被 `updateSettings` 校验并持久化。
- [ ] 旧版本设置可自动迁移，不出现崩溃或重置。
- [ ] 字典结构可扩展，新增语言无需修改业务组件。
- [ ] 默认行为保持不变（未启用新语言前界面表现不回退）。

### 测试

- 更新：`src/store/useUiStore.test.ts`
- 更新：`src/features/app/useSettingsPersistence.test.tsx`
- 新增：`src/i18n/locale.test.ts`

```bash
npm run test -- src/store/useUiStore.test.ts src/features/app/useSettingsPersistence.test.tsx src/i18n/locale.test.ts
```

### 提交与推送

```bash
git add src/contracts/settings.ts src/store/useUiStore.ts src/store/useUiStore.test.ts src/features/app/useAppSettingsStore.ts src/features/app/usePersistedAppSettings.ts src/features/app/useSettingsPersistence.ts src/features/app/useSettingsPersistence.test.tsx src/i18n/locales/zh-CN.ts src/i18n/locales/en-US.ts src/i18n/catalog.ts src/i18n/locale.ts src/i18n/locale.test.ts
git commit -m "feat(i18n): add locale setting and typed locale catalogs"
git push
```

### Phase 2 启动提示词

```text
执行 Phase 2。只实现 i18n runtime 注入与通用 t() 能力，不迁移业务组件文案。
```

---

## Phase 2 - i18n runtime 注入与通用 helper

### 目标

- 在 renderer 注入 i18n 上下文。
- 提供统一 `t()` 与 `a11y` helper，供后续组件迁移复用。

### 仅读文件列表

- `src/main.tsx`
- `src/App.tsx`
- `src/store/useUiStore.ts`
- `src/i18n/catalog.ts`
- `src/i18n/locale.ts`

### TODO

1. 新增 `I18nProvider` 与 `useI18n` hook：
   - `resolveActiveLocale(uiLocale, navigator.language)`
   - `t(key, params?)` 支持基础变量替换。
2. 在 `src/main.tsx` 注入 provider。
3. 新增可访问 helper（建议 `src/i18n/a11y.ts`）：
   - 统一输出 `data-a11y-id`
   - 统一输出 `aria-label`
   - 可选输出 `title`
4. 保持现有组件不变，仅完成基础设施。

### Checklist

- [ ] `uiLocale=auto` 时可根据浏览器语言解析到支持语言。
- [ ] `t()` 在缺 key 时有安全 fallback（不崩溃）。
- [ ] helper 产物结构稳定，可供自动化与测试依赖。

### 测试

- 新增：`src/i18n/I18nProvider.test.tsx`
- 新增：`src/i18n/a11y.test.ts`

```bash
npm run test -- src/i18n/I18nProvider.test.tsx src/i18n/a11y.test.ts
```

### 提交与推送

```bash
git add src/main.tsx src/i18n/I18nProvider.tsx src/i18n/useI18n.ts src/i18n/a11y.ts src/i18n/I18nProvider.test.tsx src/i18n/a11y.test.ts
git commit -m "feat(i18n): wire runtime provider and shared translation helpers"
git push
```

### Phase 3 启动提示词

```text
执行 Phase 3。仅迁移 AppHeader 与 SettingsPanel，建立首批稳定 data-a11y-id 契约。
```

---

## Phase 3 - Header/Settings 试点迁移（文案 + aria-label + tooltip）

### 目标

- 先迁移高频入口控件，验证模式可行性。
- 确立“文案可本地化 + 自动化稳定定位”双轨规范。

### 仅读文件列表

- `src/components/AppHeader.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/AppHeader.accessibility.test.tsx`
- `src/App.test.tsx`（仅 Header/Settings 相关断言段）
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
- `src/i18n/a11y.ts`

### TODO

1. 将 Header/Settings 中硬编码文字迁移到 `t()`：
   - 按钮文字
   - `aria-label`
   - `title`
2. 为关键控件补充稳定 id（示例）：
   - `header.search`
   - `header.manage`
   - `header.metadataToggle`
   - `header.settingsOpen`
   - `settings.close`
3. 更新测试策略：
   - 保留少量可访问名称断言（验证语义存在）
   - 主体定位改为 `data-a11y-id` 契约

### Checklist

- [ ] Header/Settings 不再新增硬编码 UI 文案。
- [ ] 关键控件均有 `data-a11y-id`。
- [ ] 现有测试稳定，不因切语言导致大面积断言失败。

### 测试

- 更新：`src/components/AppHeader.accessibility.test.tsx`
- 更新：`src/App.test.tsx`（Header/Settings 相关）

```bash
npm run test -- src/components/AppHeader.accessibility.test.tsx src/App.test.tsx
```

### 提交与推送

```bash
git add src/components/AppHeader.tsx src/components/SettingsPanel.tsx src/components/AppHeader.accessibility.test.tsx src/App.test.tsx src/i18n/locales/zh-CN.ts src/i18n/locales/en-US.ts
git commit -m "refactor(a11y): localize header settings labels with stable selector ids"
git push
```

### Phase 4 启动提示词

```text
执行 Phase 4。只处理 theme gallery 自动化选择器，避免继续扩散业务文案迁移。
```

---

## Phase 4 - 自动化选择器去文案耦合（Theme Gallery）

### 目标

- 消除自动化脚本对中文 `aria-label` 的硬依赖。
- 切换语言后 screenshot gallery 流程仍可运行。

### 仅读文件列表

- `electron/themeGalleryCaptureRuntime.ts`
- `scripts/capture-theme-gallery.mjs`
- `docs/ui/theme-gallery-capture.md`
- `src/components/AppHeader.tsx`
- `src/components/SettingsPanel.tsx`

### TODO

1. 将 `themeGalleryCaptureRuntime` 内选择器从 `[aria-label=...]` 迁移到 `[data-a11y-id=...]`。
2. 如需兼容过渡，保留有限 fallback（旧 aria 选择器）并标注 TODO 删除时间点。
3. 更新 gallery 相关文档，明确“自动化脚本禁止依赖语言文案”。
4. 新增或更新最小单测验证关键选择器常量。

### Checklist

- [ ] Gallery 采集脚本在默认语言可正常运行。
- [ ] 切换 `uiLocale` 后脚本不受影响。
- [ ] 无新增 aria 文案耦合选择器。

### 测试

- 新增：`electron/themeGalleryCaptureRuntime.test.ts`

```bash
npm run test -- electron/themeGalleryCaptureRuntime.test.ts
```

### 提交与推送

```bash
git add electron/themeGalleryCaptureRuntime.ts electron/themeGalleryCaptureRuntime.test.ts scripts/capture-theme-gallery.mjs docs/ui/theme-gallery-capture.md
git commit -m "fix(automation): switch theme gallery selectors to stable a11y ids"
git push
```

### Phase 5 启动提示词

```text
执行 Phase 5。仅迁移 Main/Metadata/Management 高频界面文案与 aria-label，不触碰后端逻辑。
```

---

## Phase 5 - 主界面文案与 aria-label 批量迁移

### 目标

- 覆盖核心交互组件，统一接入 `t()` + `data-a11y-id`。
- 收敛 tooltip 与 option 文案规范。

### 仅读文件列表

- `src/components/ImageMainSection.tsx`
- `src/components/VideoMainSection.tsx`
- `src/components/MusicMainSection.tsx`
- `src/features/app/buildMainFooter.tsx`
- `src/components/MetadataPanel.tsx`
- `src/components/ManagementPanel.tsx`
- `src/components/metadata/MetadataFetchPanel.tsx`
- `src/components/metadata/MetadataAdReviewSection.tsx`
- `src/components/settings/renderSettingsMainSection.tsx`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`

### TODO

1. 迁移以下字符串类别到字典：
   - 工具栏按钮文案
   - `aria-label`
   - `title` tooltip
   - `option` 文案
   - 空状态/加载状态/提示文案
2. 对重复动作统一 key：`delete`、`clearSelection`、`fullscreen`、`mute`、`next/prev`。
3. 为关键批量操作按钮补充 `data-a11y-id`。
4. 保持默认中文显示不变，避免业务认知跳变。

### Checklist

- [ ] 上述组件无新增硬编码用户文案。
- [ ] aria 与 tooltip 文案来源一致且可翻译。
- [ ] 关键按钮均可通过稳定 id 定位。
- [ ] 主要回归测试通过。

### 测试

- 更新：`src/features/app/buildMainFooter.test.tsx`
- 更新：`src/components/metadata/MetadataAdReviewSection.test.tsx`
- 更新：`src/App.test.tsx`（与迁移范围相关断言）

```bash
npm run test -- src/features/app/buildMainFooter.test.tsx src/components/metadata/MetadataAdReviewSection.test.tsx src/App.test.tsx
```

### 提交与推送

```bash
git add src/components/ImageMainSection.tsx src/components/VideoMainSection.tsx src/components/MusicMainSection.tsx src/features/app/buildMainFooter.tsx src/components/MetadataPanel.tsx src/components/ManagementPanel.tsx src/components/metadata/MetadataFetchPanel.tsx src/components/metadata/MetadataAdReviewSection.tsx src/components/settings/renderSettingsMainSection.tsx src/features/app/buildMainFooter.test.tsx src/components/metadata/MetadataAdReviewSection.test.tsx src/App.test.tsx src/i18n/locales/zh-CN.ts src/i18n/locales/en-US.ts
git commit -m "refactor(i18n): migrate core main-view labels tooltips and aria contracts"
git push
```

### Phase 6 启动提示词

```text
执行 Phase 6。只做 i18n 校验门禁、排序本地化收口与最终全量回归。
```

---

## Phase 6 - 校验门禁与最终收口

### 目标

- 建立可持续门禁：字典完整性校验 + 全量回归。
- 解决主要排序 locale 固定值问题（先收口 renderer 侧）。

### 仅读文件列表

- `package.json`
- `scripts/`（新增 `i18n-check` 脚本）
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
- `src/features/app/workspaceSharedUtils.ts`
- `src/features/search/useFeatureSearch.ts`
- `src/features/app/useImageSidebarBaseState.ts`

### TODO

1. 新增 `i18n:check`：
   - 比较所有 locale key 集合与默认字典是否一致。
   - 缺失 key / 空字符串直接失败。
2. 在 `package.json` 增加脚本入口。
3. 将 renderer 关键排序从硬编码 `zh-CN` 改为当前 active locale（可通过 `Intl.Collator` 封装）。
4. 更新本计划文档状态与后续维护约定。

### Checklist

- [ ] `i18n:check` 可在 CI/本地直接执行。
- [ ] 字典漏配可被阻断。
- [ ] 关键排序受当前 locale 驱动。
- [ ] 全量门禁通过。

### 测试

- 新增：`src/i18n/catalog.consistency.test.ts`

```bash
npm run test -- src/i18n/catalog.consistency.test.ts
npm run lint
npm run test
npm run build
npm run i18n:check
```

### 提交与推送

```bash
git add package.json scripts/i18n-check.mjs src/i18n/locales/zh-CN.ts src/i18n/locales/en-US.ts src/i18n/catalog.consistency.test.ts src/features/app/workspaceSharedUtils.ts src/features/search/useFeatureSearch.ts src/features/app/useImageSidebarBaseState.ts docs/i18n-aria-implementation-plan.md
git commit -m "chore(i18n): add locale consistency gate and finalize localization baseline"
git push
```

---

## 维护约定（实施后长期有效）

> 详细长期约束见：`docs/i18n-aria-guardrails.md`。

- 新增 UI 字符串时：先加 key，再引用 `t()`，禁止直接硬编码。
- 新增可交互控件时：补 `data-a11y-id`，避免测试和自动化绑死文案。
- 新增语言时：只新增 locale 文件并通过 `i18n:check`，不改业务组件。
- 任意 Phase 若发现跨 Phase 阻塞：先最小修复阻塞，再回到当前 Phase 范围。
