import { useEffect, useMemo, useState } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { buildA11yProps } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'

type StyleGroup = 'default' | 'soft-skeuomorphic' | 'liquid-glass' | 'neobrutalism'
type ThemeParameterValues = Record<string, number>

interface ThemeParameterPanelProps {
  open: boolean
  styleId: string
  settingsFontSize: number
  onClose: () => void
}

interface ThemeParameterDefinition {
  id: string
  labelKey: string
  min: number
  max: number
  step: number
  fallback: number
  unit: 'px' | '%' | ''
  read: (computed: CSSStyleDeclaration) => number
  apply: (root: HTMLElement, value: number, values: ThemeParameterValues) => void
  reset: (root: HTMLElement) => void
}

function resolveStyleGroup(styleId: string): StyleGroup {
  if (styleId.startsWith('soft-skeuomorphic')) {
    return 'soft-skeuomorphic'
  }
  if (styleId === 'liquid-glass') {
    return 'liquid-glass'
  }
  if (styleId === 'neobrutalism') {
    return 'neobrutalism'
  }
  return 'default'
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeByStep(value: number, min: number, max: number, step: number): number {
  const clamped = clampValue(value, min, max)
  const stepped = Math.round(clamped / step) * step
  return Number(stepped.toFixed(step < 1 ? 2 : 0))
}

function parseNumber(raw: string, fallback: number): number {
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readCssPxVariable(computed: CSSStyleDeclaration, variableName: string, fallback: number): number {
  return parseNumber(computed.getPropertyValue(variableName).trim(), fallback)
}

function removeVariables(root: HTMLElement, variableNames: readonly string[]): void {
  for (const variableName of variableNames) {
    root.style.removeProperty(variableName)
  }
}

function createCssPxParameter({
  id,
  labelKey,
  variableName,
  min,
  max,
  step,
  fallback,
}: {
  id: string
  labelKey: string
  variableName: string
  min: number
  max: number
  step: number
  fallback: number
}): ThemeParameterDefinition {
  return {
    id,
    labelKey,
    min,
    max,
    step,
    fallback,
    unit: 'px',
    read: (computed) => readCssPxVariable(computed, variableName, fallback),
    apply: (root, value) => {
      root.style.setProperty(variableName, `${value}px`)
    },
    reset: (root) => {
      root.style.removeProperty(variableName)
    },
  }
}

function parseBackdropFilter(value: string): { blur: number; saturation: number } | null {
  const blurMatch = value.match(/blur\(([-\d.]+)px\)/i)
  const saturationMatch = value.match(/saturate\(([-\d.]+)%\)/i)
  if (!blurMatch || !saturationMatch) {
    return null
  }
  const blur = Number.parseFloat(blurMatch[1])
  const saturation = Number.parseFloat(saturationMatch[1])
  if (!Number.isFinite(blur) || !Number.isFinite(saturation)) {
    return null
  }
  return { blur, saturation }
}

function parseFirstPercentValue(raw: string, fallback: number): number {
  const match = raw.match(/([\d.]+)%/)
  if (!match) {
    return fallback
  }
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : fallback
}

function parseFirstPxValueFromShadow(raw: string, fallback: number): number {
  const match = raw.match(/([\d.]+)px/)
  if (!match) {
    return fallback
  }
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : fallback
}

const COMMON_PARAMETERS: ThemeParameterDefinition[] = [
  createCssPxParameter({
    id: 'layout-padding',
    labelKey: 'ui.themeParameter.layoutPadding',
    variableName: '--mpx-layout-padding',
    min: 0,
    max: 24,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: 'splitter-width',
    labelKey: 'ui.themeParameter.splitterWidth',
    variableName: '--mpx-splitter-width',
    min: 4,
    max: 24,
    step: 1,
    fallback: 8,
  }),
  createCssPxParameter({
    id: 'panel-radius',
    labelKey: 'ui.themeParameter.panelRadius',
    variableName: '--mpx-panel-radius',
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: 'header-radius',
    labelKey: 'ui.themeParameter.headerRadius',
    variableName: '--mpx-header-radius',
    min: 0,
    max: 30,
    step: 1,
    fallback: 0,
  }),
  createCssPxParameter({
    id: 'card-radius',
    labelKey: 'ui.themeParameter.cardRadius',
    variableName: '--mpx-card-radius',
    min: 0,
    max: 24,
    step: 1,
    fallback: 10,
  }),
  createCssPxParameter({
    id: 'control-radius',
    labelKey: 'ui.themeParameter.controlRadius',
    variableName: '--mpx-control-radius',
    min: 0,
    max: 24,
    step: 1,
    fallback: 8,
  }),
  createCssPxParameter({
    id: 'panel-border-width',
    labelKey: 'ui.themeParameter.panelBorderWidth',
    variableName: '--mpx-panel-border-width',
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
  createCssPxParameter({
    id: 'control-border-width',
    labelKey: 'ui.themeParameter.controlBorderWidth',
    variableName: '--mpx-control-border-width',
    min: 0,
    max: 6,
    step: 1,
    fallback: 1,
  }),
]

const EMPTY_PARAMETERS: ThemeParameterDefinition[] = []

const STYLE_PARAMETERS: Record<Exclude<StyleGroup, 'default'>, ThemeParameterDefinition[]> = {
  'soft-skeuomorphic': [
    createCssPxParameter({
      id: 'skeuo-panel-padding',
      labelKey: 'ui.themeParameter.panelPadding',
      variableName: '--mpx-panel-padding',
      min: 6,
      max: 24,
      step: 1,
      fallback: 12,
    }),
    createCssPxParameter({
      id: 'skeuo-header-btn-size',
      labelKey: 'ui.themeParameter.headerButtonSize',
      variableName: '--mpx-header-btn-size',
      min: 30,
      max: 56,
      step: 1,
      fallback: 40,
    }),
    createCssPxParameter({
      id: 'skeuo-header-btn-radius',
      labelKey: 'ui.themeParameter.headerButtonRadius',
      variableName: '--mpx-header-btn-radius',
      min: 6,
      max: 22,
      step: 1,
      fallback: 12,
    }),
    createCssPxParameter({
      id: 'skeuo-header-group-gap',
      labelKey: 'ui.themeParameter.headerGroupGap',
      variableName: '--mpx-header-group-gap',
      min: 8,
      max: 36,
      step: 1,
      fallback: 22,
    }),
    createCssPxParameter({
      id: 'skeuo-header-item-gap',
      labelKey: 'ui.themeParameter.headerItemGap',
      variableName: '--mpx-header-item-gap',
      min: 4,
      max: 18,
      step: 1,
      fallback: 8,
    }),
    {
      id: 'skeuo-shadow-strength',
      labelKey: 'ui.themeParameter.skeuoShadowStrength',
      min: 8,
      max: 40,
      step: 1,
      fallback: 18,
      unit: '%',
      read: (computed) => {
        return parseFirstPercentValue(computed.getPropertyValue('--mpx-control-shadow').trim(), 18)
      },
      apply: (root, value) => {
        const strength = clampValue(value, 8, 40)
        const lightStrength = clampValue(100 - Math.round(strength * 0.8), 64, 95)
        root.style.setProperty('--mpx-skeuo-shadow-dark', `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`)
        root.style.setProperty('--mpx-skeuo-shadow-light', `color-mix(in srgb, var(--mpx-palette-surface) ${lightStrength}%, var(--mpx-bg-elevated))`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-skeuo-shadow-dark', '--mpx-skeuo-shadow-light'])
      },
    },
    {
      id: 'skeuo-press-depth',
      labelKey: 'ui.themeParameter.skeuoPressDepth',
      min: 1,
      max: 10,
      step: 1,
      fallback: 3,
      unit: 'px',
      read: (computed) => {
        return parseFirstPxValueFromShadow(computed.getPropertyValue('--mpx-header-btn-active-shadow').trim(), 3)
      },
      apply: (root, value) => {
        const depth = clampValue(value, 1, 10)
        root.style.setProperty(
          '--mpx-header-btn-active-shadow',
          `inset ${depth}px ${depth}px ${depth * 2}px var(--mpx-skeuo-shadow-dark), inset -${depth}px -${depth}px ${depth * 2}px var(--mpx-skeuo-shadow-light)`,
        )
        root.style.setProperty(
          '--mpx-control-active-shadow',
          `inset ${depth}px ${depth}px ${depth * 2}px color-mix(in srgb, var(--mpx-palette-text-raw) 16%, transparent), inset -${depth}px -${depth}px ${depth * 2}px color-mix(in srgb, var(--mpx-palette-surface) 88%, var(--mpx-bg-elevated))`,
        )
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-header-btn-active-shadow', '--mpx-control-active-shadow'])
      },
    },
  ],
  'liquid-glass': [
    {
      id: 'liquid-glass-blur',
      labelKey: 'ui.themeParameter.glassBlur',
      min: 6,
      max: 36,
      step: 1,
      fallback: 20,
      unit: 'px',
      read: (computed) => {
        const parsed = parseBackdropFilter(computed.getPropertyValue('--mpx-panel-backdrop-filter'))
        return parsed?.blur ?? 20
      },
      apply: (root, value, values) => {
        const blur = clampValue(value, 6, 36)
        const saturation = clampValue(values['liquid-glass-saturation'] ?? 170, 100, 240)
        const nextFilter = `blur(${blur}px) saturate(${saturation}%)`
        root.style.setProperty('--mpx-panel-backdrop-filter', nextFilter)
        root.style.setProperty('--mpx-header-backdrop-filter', nextFilter)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-panel-backdrop-filter', '--mpx-header-backdrop-filter'])
      },
    },
    {
      id: 'liquid-glass-saturation',
      labelKey: 'ui.themeParameter.glassSaturation',
      min: 100,
      max: 240,
      step: 5,
      fallback: 170,
      unit: '%',
      read: (computed) => {
        const parsed = parseBackdropFilter(computed.getPropertyValue('--mpx-panel-backdrop-filter'))
        return parsed?.saturation ?? 170
      },
      apply: (root, value, values) => {
        const blur = clampValue(values['liquid-glass-blur'] ?? 20, 6, 36)
        const saturation = clampValue(value, 100, 240)
        const nextFilter = `blur(${blur}px) saturate(${saturation}%)`
        root.style.setProperty('--mpx-panel-backdrop-filter', nextFilter)
        root.style.setProperty('--mpx-header-backdrop-filter', nextFilter)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-panel-backdrop-filter', '--mpx-header-backdrop-filter'])
      },
    },
    {
      id: 'liquid-glass-surface-opacity',
      labelKey: 'ui.themeParameter.glassSurfaceOpacity',
      min: 40,
      max: 90,
      step: 1,
      fallback: 56,
      unit: '%',
      read: (computed) => {
        return parseFirstPercentValue(computed.getPropertyValue('--mpx-bg-panel').trim(), 56)
      },
      apply: (root, value) => {
        const panelOpacity = clampValue(value, 40, 90)
        const elevatedOpacity = clampValue(panelOpacity + 14, 54, 96)
        const shellOpacity = clampValue(panelOpacity + 2, 42, 92)
        root.style.setProperty('--mpx-bg-panel', `color-mix(in srgb, var(--mpx-palette-surface) ${panelOpacity}%, transparent)`)
        root.style.setProperty('--mpx-bg-elevated', `color-mix(in srgb, var(--mpx-palette-surface) ${elevatedOpacity}%, transparent)`)
        root.style.setProperty('--mpx-sidebar-bg', `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity}%, transparent)`)
        root.style.setProperty('--mpx-main-bg', `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 4}%, transparent)`)
        root.style.setProperty('--mpx-metadata-bg', `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 2}%, transparent)`)
        root.style.setProperty('--mpx-header-bg', `color-mix(in srgb, var(--mpx-palette-surface) ${shellOpacity + 1}%, transparent)`)
      },
      reset: (root) => {
        removeVariables(root, [
          '--mpx-bg-panel',
          '--mpx-bg-elevated',
          '--mpx-sidebar-bg',
          '--mpx-main-bg',
          '--mpx-metadata-bg',
          '--mpx-header-bg',
        ])
      },
    },
    {
      id: 'liquid-glass-control-depth',
      labelKey: 'ui.themeParameter.glassControlDepth',
      min: 4,
      max: 28,
      step: 1,
      fallback: 14,
      unit: 'px',
      read: (computed) => {
        return parseFirstPxValueFromShadow(computed.getPropertyValue('--mpx-control-shadow').trim(), 14)
      },
      apply: (root, value) => {
        const depth = clampValue(value, 4, 28)
        root.style.setProperty('--mpx-control-shadow', `0 ${Math.round(depth * 0.45)}px ${depth}px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-control-hover-shadow', `0 ${Math.round(depth * 0.7)}px ${Math.round(depth * 1.7)}px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-control-active-shadow', `0 ${Math.max(2, Math.round(depth * 0.3))}px ${Math.max(6, Math.round(depth * 0.75))}px var(--mpx-palette-shadow-color)`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-control-shadow', '--mpx-control-hover-shadow', '--mpx-control-active-shadow'])
      },
    },
  ],
  neobrutalism: [
    {
      id: 'neobrutalism-shadow-offset',
      labelKey: 'ui.themeParameter.shadowOffset',
      min: 1,
      max: 12,
      step: 1,
      fallback: 4,
      unit: 'px',
      read: (computed) => {
        const raw = computed.getPropertyValue('--mpx-panel-shadow').trim()
        const match = raw.match(/([-\d.]+)px\s+([-\d.]+)px/i)
        if (!match) {
          return 4
        }
        const offset = Number.parseFloat(match[1])
        return Number.isFinite(offset) ? Math.abs(offset) : 4
      },
      apply: (root, value) => {
        const offset = clampValue(value, 1, 12)
        const cardOffset = Math.max(1, offset - 1)
        const controlOffset = Math.max(1, offset - 2)
        const hoverOffset = offset + 1
        root.style.setProperty('--mpx-panel-shadow', `${offset}px ${offset}px 0px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-header-shadow', `${offset}px ${offset}px 0px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-card-shadow', `${cardOffset}px ${cardOffset}px 0px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-control-shadow', `${controlOffset}px ${controlOffset}px 0px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-control-hover-shadow', `${hoverOffset}px ${hoverOffset}px 0px var(--mpx-palette-shadow-color)`)
        root.style.setProperty('--mpx-control-active-shadow', `${controlOffset}px ${controlOffset}px 0px var(--mpx-palette-shadow-color)`)
      },
      reset: (root) => {
        removeVariables(root, [
          '--mpx-panel-shadow',
          '--mpx-header-shadow',
          '--mpx-card-shadow',
          '--mpx-control-shadow',
          '--mpx-control-hover-shadow',
          '--mpx-control-active-shadow',
        ])
      },
    },
    {
      id: 'neobrutalism-hover-shift',
      labelKey: 'ui.themeParameter.controlHoverOffset',
      min: 0,
      max: 6,
      step: 1,
      fallback: 2,
      unit: 'px',
      read: (computed) => {
        const raw = computed.getPropertyValue('--mpx-control-hover-transform').trim()
        const match = raw.match(/translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/i)
        if (!match) {
          return 2
        }
        const x = Number.parseFloat(match[1])
        return Number.isFinite(x) ? Math.abs(x) : 2
      },
      apply: (root, value) => {
        const offset = clampValue(value, 0, 6)
        const activeOffset = Math.max(0, Math.floor(offset / 2))
        root.style.setProperty('--mpx-control-hover-transform', `translate(-${offset}px, -${offset}px)`)
        root.style.setProperty('--mpx-control-active-transform', `translate(${activeOffset}px, ${activeOffset}px)`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-control-hover-transform', '--mpx-control-active-transform'])
      },
    },
    {
      id: 'neobrutalism-border-width',
      labelKey: 'ui.themeParameter.brutalBorderWidth',
      min: 1,
      max: 6,
      step: 1,
      fallback: 3,
      unit: 'px',
      read: (computed) => {
        return readCssPxVariable(computed, '--mpx-panel-border-width', 3)
      },
      apply: (root, value) => {
        const width = clampValue(value, 1, 6)
        root.style.setProperty('--mpx-panel-border-width', `${width}px`)
        root.style.setProperty('--mpx-header-border-width', `${width}px`)
        root.style.setProperty('--mpx-card-border-width', `${Math.max(1, width - 1)}px`)
        root.style.setProperty('--mpx-control-border-width', `${Math.max(1, width - 1)}px`)
      },
      reset: (root) => {
        removeVariables(root, [
          '--mpx-panel-border-width',
          '--mpx-header-border-width',
          '--mpx-card-border-width',
          '--mpx-control-border-width',
        ])
      },
    },
    {
      id: 'neobrutalism-corner-radius',
      labelKey: 'ui.themeParameter.brutalCornerRadius',
      min: 0,
      max: 8,
      step: 1,
      fallback: 2,
      unit: 'px',
      read: (computed) => {
        return readCssPxVariable(computed, '--mpx-panel-radius', 2)
      },
      apply: (root, value) => {
        const radius = clampValue(value, 0, 8)
        root.style.setProperty('--mpx-panel-radius', `${radius}px`)
        root.style.setProperty('--mpx-header-radius', `${radius}px`)
        root.style.setProperty('--mpx-card-radius', `${radius}px`)
        root.style.setProperty('--mpx-control-radius', `${radius}px`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-panel-radius', '--mpx-header-radius', '--mpx-card-radius', '--mpx-control-radius'])
      },
    },
  ],
}

function readParameterValues(parameters: ThemeParameterDefinition[]): ThemeParameterValues {
  const computed = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    parameters.map((parameter) => {
      const value = normalizeByStep(parameter.read(computed), parameter.min, parameter.max, parameter.step)
      return [parameter.id, value]
    }),
  )
}

function formatValue(value: number, step: number): string {
  if (step < 1) {
    return value.toFixed(1)
  }
  return String(Math.round(value))
}

function ThemeParameterPanel({ open, styleId, settingsFontSize, onClose }: ThemeParameterPanelProps) {
  const { t } = useI18n()
  const styleGroup = resolveStyleGroup(styleId)
  const styleParameters = styleGroup === 'default' ? EMPTY_PARAMETERS : STYLE_PARAMETERS[styleGroup]
  const parameters = useMemo(
    () => (styleGroup === 'default' ? COMMON_PARAMETERS : [...COMMON_PARAMETERS, ...STYLE_PARAMETERS[styleGroup]]),
    [styleGroup],
  )
  const [values, setValues] = useState<ThemeParameterValues>({})

  useEffect(() => {
    if (!open) {
      return
    }
    setValues(readParameterValues(parameters))
  }, [open, parameters, styleId])

  if (!open) {
    return null
  }

  const panelA11y = buildA11yProps({
    id: 'themeParameter.panel',
    labelKey: 'a11y.themeParameter.panel',
    t,
  })
  const closeA11y = buildA11yProps({
    id: 'themeParameter.close',
    labelKey: 'a11y.themeParameter.close',
    titleKey: 'tip.themeParameter.close',
    t,
  })

  const applyParameter = (parameter: ThemeParameterDefinition, rawValue: number) => {
    const nextValue = normalizeByStep(rawValue, parameter.min, parameter.max, parameter.step)
    const root = document.documentElement
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      }
      parameter.apply(root, nextValue, nextValues)
      return nextValues
    })
  }

  const resetCurrentStyleParameters = () => {
    const root = document.documentElement
    for (const parameter of parameters) {
      parameter.reset(root)
    }
    setValues(readParameterValues(parameters))
  }

  return (
    <div {...panelA11y} className="settings-mask" role="dialog" aria-modal="true" data-overlay-close="theme-parameter">
      <section className="settings-panel theme-parameter-panel" style={{ fontSize: `${settingsFontSize}px` }}>
        <div className="settings-head">
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>{t('ui.themeParameter.panel')}</h2>
          <button {...closeA11y} className="settings-icon-btn main-icon-square-btn" type="button" onClick={onClose}>
            <MainUiIcon name="close" />
          </button>
        </div>

        <main className="settings-main theme-parameter-main">
          <section className="settings-block theme-parameter-block">
            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t('ui.themeParameter.sectionCommon')}</span>
              </header>
              <div className="theme-parameter-list">
                {COMMON_PARAMETERS.map((parameter) => {
                  const value = values[parameter.id] ?? parameter.fallback
                  return (
                    <label key={parameter.id} className="theme-parameter-row" htmlFor={`theme-parameter-${parameter.id}`}>
                      <span>{t(parameter.labelKey)}</span>
                      <div className="theme-parameter-control">
                        <input
                          id={`theme-parameter-${parameter.id}`}
                          type="range"
                          min={parameter.min}
                          max={parameter.max}
                          step={parameter.step}
                          value={value}
                          onChange={(event) => applyParameter(parameter, Number(event.target.value))}
                        />
                        <code>{`${formatValue(value, parameter.step)}${parameter.unit}`}</code>
                      </div>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t('ui.themeParameter.sectionStyle', { styleId })}</span>
              </header>
              {styleParameters.length === 0 ? (
                <p className="settings-placeholder">{t('ui.themeParameter.noStyleSpecific')}</p>
              ) : (
                <div className="theme-parameter-list">
                  {styleParameters.map((parameter) => {
                    const value = values[parameter.id] ?? parameter.fallback
                    return (
                      <label key={parameter.id} className="theme-parameter-row" htmlFor={`theme-parameter-${parameter.id}`}>
                        <span>{t(parameter.labelKey)}</span>
                        <div className="theme-parameter-control">
                          <input
                            id={`theme-parameter-${parameter.id}`}
                            type="range"
                            min={parameter.min}
                            max={parameter.max}
                            step={parameter.step}
                            value={value}
                            onChange={(event) => applyParameter(parameter, Number(event.target.value))}
                          />
                          <code>{`${formatValue(value, parameter.step)}${parameter.unit}`}</code>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="theme-parameter-actions">
              <button type="button" onClick={resetCurrentStyleParameters}>
                {t('ui.themeParameter.resetCurrentStyle')}
              </button>
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}

export default ThemeParameterPanel
