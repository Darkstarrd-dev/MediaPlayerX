import type { SettingsPageId, UiSettingsState } from '../features/uiSettings'

interface SettingsPanelProps {
  open: boolean
  settingsPage: SettingsPageId
  settings: UiSettingsState
  onClose: () => void
  onSettingsPageChange: (page: SettingsPageId) => void
  onSettingsPatch: (patch: Partial<UiSettingsState>) => void
  onReset: () => void
}

const SETTINGS_PAGES: Array<{ id: SettingsPageId; title: string; hint: string }> = [
  { id: 'appearance', title: '外观与主题', hint: '主题 / 语言 / 视觉模式' },
  { id: 'layout', title: '布局与间距', hint: '窗口内边距 / 控件尺寸' },
  { id: 'workspace', title: '工作区比例', hint: '侧栏与右侧信息区宽度' },
  { id: 'ai-model', title: 'AI模型设置', hint: '模型提供商 / 参数 / 密钥' },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function renderSettingsPageContent(
  settingsPage: SettingsPageId,
  settings: UiSettingsState,
  onSettingsPatch: (patch: Partial<UiSettingsState>) => void,
) {
  if (settingsPage === 'appearance') {
    return (
      <section className="settings-block">
        <h3>界面设置 / 外观与主题</h3>
        <div className="settings-runtime-grid">
          <span>语言</span>
          <select
            value={settings.uiLocale}
            onChange={(event) => onSettingsPatch({ uiLocale: event.target.value as UiSettingsState['uiLocale'] })}
          >
            <option value="auto">跟随系统</option>
            <option value="zh-CN">中文（简体）</option>
            <option value="en-US">English</option>
          </select>

          <span>Style</span>
          <select value={settings.styleId} onChange={(event) => onSettingsPatch({ styleId: event.target.value })}>
            <option value="soft-skeuomorphic">soft-skeuomorphic</option>
          </select>

          <span>Palette</span>
          <select value={settings.paletteId} onChange={(event) => onSettingsPatch({ paletteId: event.target.value })}>
            <option value="skeuomorphic-luxury-white">skeuomorphic-luxury-white</option>
          </select>

          <span>明暗模式</span>
          <div className="settings-segmented">
            <button
              type="button"
              className={settings.paletteMode === 'day' ? 'is-active' : ''}
              onClick={() => onSettingsPatch({ paletteMode: 'day' })}
            >
              Day
            </button>
            <button
              type="button"
              className={settings.paletteMode === 'night' ? 'is-active' : ''}
              onClick={() => onSettingsPatch({ paletteMode: 'night' })}
            >
              Night
            </button>
          </div>

          <span>设置面板遮罩</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={10}
              max={45}
              value={settings.settingsBackdropOpacity}
              onChange={(event) =>
                onSettingsPatch({ settingsBackdropOpacity: clamp(Number(event.target.value), 10, 45) })
              }
            />
            <em>{settings.settingsBackdropOpacity}%</em>
          </label>
        </div>
      </section>
    )
  }

  if (settingsPage === 'layout') {
    return (
      <section className="settings-block">
        <h3>界面设置 / 布局与间距</h3>
        <div className="settings-runtime-grid">
          <span>面板外间距</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={0}
              max={18}
              value={settings.layoutPadding}
              onChange={(event) => onSettingsPatch({ layoutPadding: clamp(Number(event.target.value), 0, 18) })}
            />
            <em>{settings.layoutPadding}px</em>
          </label>

          <span>面板内部间距</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={4}
              max={18}
              value={settings.paneInnerPadding}
              onChange={(event) =>
                onSettingsPatch({ paneInnerPadding: clamp(Number(event.target.value), 4, 18) })
              }
            />
            <em>{settings.paneInnerPadding}px</em>
          </label>

          <span>区块堆叠间距</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={4}
              max={18}
              value={settings.paneStackGap}
              onChange={(event) => onSettingsPatch({ paneStackGap: clamp(Number(event.target.value), 4, 18) })}
            />
            <em>{settings.paneStackGap}px</em>
          </label>

          <span>控件圆角</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={4}
              max={16}
              value={settings.controlRadius}
              onChange={(event) => onSettingsPatch({ controlRadius: clamp(Number(event.target.value), 4, 16) })}
            />
            <em>{settings.controlRadius}px</em>
          </label>

          <span>控件高度</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={30}
              max={44}
              value={settings.controlHeight}
              onChange={(event) => onSettingsPatch({ controlHeight: clamp(Number(event.target.value), 30, 44) })}
            />
            <em>{settings.controlHeight}px</em>
          </label>
        </div>
      </section>
    )
  }

  if (settingsPage === 'ai-model') {
    return (
      <section className="settings-block">
        <h3>界面设置 / AI模型设置</h3>
        <div className="settings-runtime-grid">
          <span>启用AI能力</span>
          <label className="settings-inline-toggle">
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(event) => onSettingsPatch({ aiEnabled: event.target.checked })}
            />
            <em>{settings.aiEnabled ? '已启用' : '未启用'}</em>
          </label>

          <span>提供商</span>
          <select
            value={settings.aiProvider}
            onChange={(event) => onSettingsPatch({ aiProvider: event.target.value as UiSettingsState['aiProvider'] })}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
            <option value="deepseek">DeepSeek</option>
            <option value="custom">Custom</option>
          </select>

          <span>API Endpoint</span>
          <input
            type="text"
            value={settings.aiEndpoint}
            placeholder="https://api.openai.com/v1"
            onChange={(event) => onSettingsPatch({ aiEndpoint: event.target.value.slice(0, 256) })}
          />

          <span>模型名称</span>
          <input
            type="text"
            value={settings.aiModelName}
            placeholder="gpt-4o-mini"
            onChange={(event) => onSettingsPatch({ aiModelName: event.target.value.slice(0, 128) })}
          />

          <span>API Key</span>
          <input
            type="password"
            value={settings.aiApiKey}
            placeholder="sk-..."
            autoComplete="off"
            onChange={(event) => onSettingsPatch({ aiApiKey: event.target.value.slice(0, 256) })}
          />

          <span>Temperature</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.aiTemperature}
              onChange={(event) => onSettingsPatch({ aiTemperature: clamp(Number(event.target.value), 0, 2) })}
            />
            <em>{settings.aiTemperature.toFixed(1)}</em>
          </label>

          <span>Max Tokens</span>
          <label className="settings-inline-range">
            <input
              type="range"
              min={256}
              max={32000}
              step={256}
              value={settings.aiMaxTokens}
              onChange={(event) => onSettingsPatch({ aiMaxTokens: clamp(Number(event.target.value), 256, 32000) })}
            />
            <em>{settings.aiMaxTokens}</em>
          </label>
        </div>
      </section>
    )
  }

  return (
    <section className="settings-block">
      <h3>界面设置 / 工作区比例</h3>
      <div className="settings-runtime-grid">
        <span>左侧栏宽度</span>
        <label className="settings-inline-range">
          <input
            type="range"
            min={20}
            max={40}
            value={settings.sidebarWidthPercent}
            onChange={(event) => onSettingsPatch({ sidebarWidthPercent: clamp(Number(event.target.value), 20, 40) })}
          />
          <em>{settings.sidebarWidthPercent}%</em>
        </label>

        <span>右侧信息区宽度</span>
        <label className="settings-inline-range">
          <input
            type="range"
            min={20}
            max={40}
            value={settings.metadataWidthPercent}
            onChange={(event) =>
              onSettingsPatch({ metadataWidthPercent: clamp(Number(event.target.value), 20, 40) })
            }
          />
          <em>{settings.metadataWidthPercent}%</em>
        </label>
      </div>
    </section>
  )
}

export function SettingsPanel({
  open,
  settingsPage,
  settings,
  onClose,
  onSettingsPageChange,
  onSettingsPatch,
  onReset,
}: SettingsPanelProps) {
  if (!open) {
    return null
  }

  return (
    <div className="settings-mask" data-slot="fg-header-g1-settings-root-ovl" onClick={onClose} role="presentation">
      <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <header className="settings-head">
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>设置面板（界面设置）</h2>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="settings-shell">
          <nav className="settings-side" aria-label="界面设置分页">
            {SETTINGS_PAGES.map((page) => {
              const active = page.id === settingsPage
              return (
                <button
                  key={page.id}
                  type="button"
                  className={active ? 'is-active' : ''}
                  aria-pressed={active}
                  onClick={() => onSettingsPageChange(page.id)}
                >
                  {page.title}
                  <span className="module-link-desc">{page.hint}</span>
                </button>
              )
            })}
            <button type="button" onClick={onReset}>
              重置界面设置
            </button>
          </nav>
          <div className="settings-main">{renderSettingsPageContent(settingsPage, settings, onSettingsPatch)}</div>
        </div>
      </section>
    </div>
  )
}
