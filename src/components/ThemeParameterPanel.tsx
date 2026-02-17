import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'

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
  labelTokenKeys?: Record<string, string>
  min: number
  max: number
  step: number
  fallback: number
  unit: 'px' | '%' | ''
  read: (computed: CSSStyleDeclaration) => number
  apply: (root: HTMLElement, value: number, values: ThemeParameterValues) => void
  reset: (root: HTMLElement) => void
}

interface ThemeParameterSnapshot {
  version: 1
  styleId: string
  values: Record<string, number>
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

function parseFirstNonZeroPxValue(raw: string, fallback: number): number {
  const matches = raw.matchAll(/(-?[\d.]+)px/g)
  for (const match of matches) {
    const value = Number.parseFloat(match[1])
    if (Number.isFinite(value) && Math.abs(value) > 0.01) {
      return Math.abs(value)
    }
  }
  return fallback
}

type SectionScope = 'header' | 'sidebar' | 'main' | 'metadata'
type SectionTarget = 'pane' | 'control'
type SectionMetric = 'elevation' | 'shadow-strength' | 'shadow-hardness' | 'border-contrast' | 'border-color'

const SECTION_SCOPES: readonly SectionScope[] = ['header', 'sidebar', 'main', 'metadata']
const SECTION_METRICS: readonly SectionMetric[] = ['elevation', 'shadow-strength', 'shadow-hardness', 'border-contrast', 'border-color']

function resolveParameterLabel(parameter: ThemeParameterDefinition, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (!parameter.labelTokenKeys) {
    return t(parameter.labelKey)
  }
  const tokenValues = Object.fromEntries(
    Object.entries(parameter.labelTokenKeys).map(([token, key]) => [token, t(key)]),
  )
  return t(parameter.labelKey, tokenValues)
}

function createSectionMetricId(scope: SectionScope, target: SectionTarget, metric: SectionMetric): string {
  return `skeuo-${scope}-${target}-${metric}`
}

function createSectionMetricStateVariable(scope: SectionScope, target: SectionTarget, metric: SectionMetric): string {
  return `--mpx-tp-${scope}-${target}-${metric}`
}

function getSectionScopeLabelKey(scope: SectionScope): string {
  if (scope === 'header') {
    return 'ui.themeParameter.scopeHeader'
  }
  if (scope === 'sidebar') {
    return 'ui.themeParameter.scopeSidebar'
  }
  if (scope === 'main') {
    return 'ui.themeParameter.scopeMain'
  }
  return 'ui.themeParameter.scopeMetadata'
}

function getSectionTargetLabelKey(target: SectionTarget): string {
  return target === 'pane' ? 'ui.themeParameter.targetPane' : 'ui.themeParameter.targetControl'
}

function getSectionMetricLabelKey(metric: SectionMetric): string {
  if (metric === 'elevation') {
    return 'ui.themeParameter.metricElevation'
  }
  if (metric === 'shadow-strength') {
    return 'ui.themeParameter.metricShadowStrength'
  }
  if (metric === 'shadow-hardness') {
    return 'ui.themeParameter.metricShadowHardness'
  }
  if (metric === 'border-contrast') {
    return 'ui.themeParameter.metricBorderContrast'
  }
  return 'ui.themeParameter.metricBorderColor'
}

function getSectionMetricConfig(target: SectionTarget, metric: SectionMetric): {
  min: number
  max: number
  step: number
  unit: 'px' | '%'
} {
  if (metric === 'elevation') {
    return target === 'pane'
      ? { min: 6, max: 26, step: 1, unit: 'px' }
      : { min: 2, max: 14, step: 1, unit: 'px' }
  }
  if (metric === 'shadow-strength') {
    return { min: 8, max: 48, step: 1, unit: '%' }
  }
  if (metric === 'shadow-hardness') {
    return { min: 20, max: 92, step: 1, unit: '%' }
  }
  if (metric === 'border-contrast') {
    return { min: 10, max: 50, step: 1, unit: '%' }
  }
  return { min: 0, max: 100, step: 1, unit: '%' }
}

function getSectionMetricFallback(scope: SectionScope, target: SectionTarget, metric: SectionMetric): number {
  if (metric === 'elevation') {
    if (target === 'pane') {
      return scope === 'header' ? 15 : 14
    }
    return scope === 'header' ? 4 : 5
  }
  if (metric === 'shadow-strength') {
    return target === 'pane' ? 26 : 28
  }
  if (metric === 'shadow-hardness') {
    return target === 'pane' ? 58 : 64
  }
  if (metric === 'border-contrast') {
    return target === 'pane' ? 24 : 30
  }
  return target === 'pane' ? 32 : 38
}

function getPaneShadowVariable(scope: SectionScope): string {
  if (scope === 'header') {
    return '--mpx-header-shadow'
  }
  if (scope === 'sidebar') {
    return '--mpx-sidebar-shadow'
  }
  if (scope === 'main') {
    return '--mpx-main-shadow'
  }
  return '--mpx-metadata-shadow'
}

function getPaneBorderColorVariable(scope: SectionScope): string {
  if (scope === 'header') {
    return '--mpx-header-border-color'
  }
  if (scope === 'sidebar') {
    return '--mpx-sidebar-border-color'
  }
  if (scope === 'main') {
    return '--mpx-main-border-color'
  }
  return '--mpx-metadata-border-color'
}

function getControlShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-shadow`
}

function getControlHoverShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-hover-shadow`
}

function getControlActiveShadowVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-active-shadow`
}

function getControlBorderColorVariable(scope: SectionScope): string {
  return `--mpx-${scope}-control-border-color`
}

function getSectionMetricValue(values: ThemeParameterValues, scope: SectionScope, target: SectionTarget, metric: SectionMetric): number {
  const id = createSectionMetricId(scope, target, metric)
  const fallback = getSectionMetricFallback(scope, target, metric)
  const value = values[id]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function buildSkeuoBorderColor(contrast: number, tint: number): string {
  const tintMix = clampValue(tint, 0, 100)
  const contrastMix = clampValue(contrast, 10, 50)
  return `color-mix(in srgb, color-mix(in srgb, var(--mpx-palette-accent-raw) ${tintMix}%, var(--mpx-palette-text-raw)) ${contrastMix}%, var(--mpx-palette-surface))`
}

function applySectionPaneVisual(root: HTMLElement, scope: SectionScope, values: ThemeParameterValues): void {
  const elevation = clampValue(getSectionMetricValue(values, scope, 'pane', 'elevation'), 6, 26)
  const strength = clampValue(getSectionMetricValue(values, scope, 'pane', 'shadow-strength'), 8, 48)
  const hardness = clampValue(getSectionMetricValue(values, scope, 'pane', 'shadow-hardness'), 20, 92)
  const borderContrast = clampValue(getSectionMetricValue(values, scope, 'pane', 'border-contrast'), 10, 50)
  const borderTint = clampValue(getSectionMetricValue(values, scope, 'pane', 'border-color'), 0, 100)

  const hardnessFactor = (110 - hardness) / 100
  const blur = Math.max(8, Math.round(elevation * (2.2 * hardnessFactor + 0.42)))
  const shadowColor = `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`
  const highlightColor = `color-mix(in srgb, var(--mpx-palette-surface) ${clampValue(100 - Math.round(strength * 0.75), 62, 98)}%, #ffffff)`
  const borderColor = buildSkeuoBorderColor(borderContrast, borderTint)

  root.style.setProperty(
    getPaneShadowVariable(scope),
    `0 ${elevation}px ${blur}px ${shadowColor}, 0 2px ${Math.max(4, Math.round(blur * 0.35))}px color-mix(in srgb, var(--mpx-palette-text-raw) ${Math.max(8, strength - 10)}%, transparent), inset 0 1px 0 ${highlightColor}`,
  )
  root.style.setProperty(getPaneBorderColorVariable(scope), borderColor)
}

function applySectionControlVisual(root: HTMLElement, scope: SectionScope, values: ThemeParameterValues): void {
  const elevation = clampValue(getSectionMetricValue(values, scope, 'control', 'elevation'), 2, 14)
  const strength = clampValue(getSectionMetricValue(values, scope, 'control', 'shadow-strength'), 8, 48)
  const hardness = clampValue(getSectionMetricValue(values, scope, 'control', 'shadow-hardness'), 20, 92)
  const borderContrast = clampValue(getSectionMetricValue(values, scope, 'control', 'border-contrast'), 10, 50)
  const borderTint = clampValue(getSectionMetricValue(values, scope, 'control', 'border-color'), 0, 100)

  const hardnessFactor = (108 - hardness) / 100
  const blur = Math.max(6, Math.round(elevation * (2 * hardnessFactor + 0.38)))
  const hoverElevation = Math.min(16, elevation + 1)
  const hoverBlur = blur + 3
  const pressDepth = Math.max(1, Math.round(elevation * 0.7))
  const activeBlur = Math.max(2, Math.round(pressDepth * (1.8 - hardness / 120)))

  const darkColor = `color-mix(in srgb, var(--mpx-palette-text-raw) ${strength}%, transparent)`
  const lightColor = `color-mix(in srgb, var(--mpx-palette-surface) ${clampValue(100 - Math.round(strength * 0.7), 62, 98)}%, #ffffff)`
  const borderColor = buildSkeuoBorderColor(borderContrast, borderTint)

  const shadow = `${elevation}px ${elevation}px ${blur}px ${darkColor}, -${elevation}px -${elevation}px ${blur}px ${lightColor}`
  const hoverShadow = `${hoverElevation}px ${hoverElevation}px ${hoverBlur}px ${darkColor}, -${hoverElevation}px -${hoverElevation}px ${hoverBlur}px ${lightColor}`
  const activeShadow = `inset ${pressDepth}px ${pressDepth}px ${activeBlur * 2}px ${darkColor}, inset -${pressDepth}px -${pressDepth}px ${activeBlur * 2}px ${lightColor}`

  root.style.setProperty(getControlShadowVariable(scope), shadow)
  root.style.setProperty(getControlHoverShadowVariable(scope), hoverShadow)
  root.style.setProperty(getControlActiveShadowVariable(scope), activeShadow)
  root.style.setProperty(getControlBorderColorVariable(scope), borderColor)

  if (scope === 'header') {
    root.style.setProperty('--mpx-header-btn-shadow', shadow)
    root.style.setProperty('--mpx-header-btn-hover-shadow', hoverShadow)
    root.style.setProperty('--mpx-header-btn-active-shadow', activeShadow)
  }
}

function resetSectionTargetVisual(root: HTMLElement, scope: SectionScope, target: SectionTarget): void {
  if (target === 'pane') {
    removeVariables(root, [getPaneShadowVariable(scope), getPaneBorderColorVariable(scope)])
    return
  }

  const vars = [
    getControlShadowVariable(scope),
    getControlHoverShadowVariable(scope),
    getControlActiveShadowVariable(scope),
    getControlBorderColorVariable(scope),
  ]

  if (scope === 'header') {
    vars.push('--mpx-header-btn-shadow', '--mpx-header-btn-hover-shadow', '--mpx-header-btn-active-shadow')
  }
  removeVariables(root, vars)
}

function createSectionMetricParameter(scope: SectionScope, target: SectionTarget, metric: SectionMetric): ThemeParameterDefinition {
  const config = getSectionMetricConfig(target, metric)
  const fallback = getSectionMetricFallback(scope, target, metric)
  const id = createSectionMetricId(scope, target, metric)
  const stateVar = createSectionMetricStateVariable(scope, target, metric)

  return {
    id,
    labelKey: 'ui.themeParameter.sectionMetric',
    labelTokenKeys: {
      scope: getSectionScopeLabelKey(scope),
      target: getSectionTargetLabelKey(target),
      metric: getSectionMetricLabelKey(metric),
    },
    min: config.min,
    max: config.max,
    step: config.step,
    fallback,
    unit: config.unit,
    read: (computed) => {
      if (metric === 'elevation') {
        if (target === 'pane') {
          return parseFirstNonZeroPxValue(computed.getPropertyValue(getPaneShadowVariable(scope)).trim(), fallback)
        }
        const ownControlShadow = computed.getPropertyValue(getControlShadowVariable(scope)).trim()
        if (ownControlShadow) {
          return parseFirstNonZeroPxValue(ownControlShadow, fallback)
        }
        if (scope === 'header') {
          return parseFirstNonZeroPxValue(computed.getPropertyValue('--mpx-header-btn-shadow').trim(), fallback)
        }
        return parseFirstNonZeroPxValue(computed.getPropertyValue('--mpx-control-shadow').trim(), fallback)
      }
      return parseNumber(computed.getPropertyValue(stateVar).trim(), fallback)
    },
    apply: (root, value, values) => {
      root.style.setProperty(stateVar, `${value}`)
      if (target === 'pane') {
        applySectionPaneVisual(root, scope, values)
      } else {
        applySectionControlVisual(root, scope, values)
      }
    },
    reset: (root) => {
      root.style.removeProperty(stateVar)
      resetSectionTargetVisual(root, scope, target)
    },
  }
}

const SKEUO_SECTION_PARAMETERS: ThemeParameterDefinition[] = [
  ...SECTION_SCOPES.flatMap((scope) => SECTION_METRICS.map((metric) => createSectionMetricParameter(scope, 'pane', metric))),
  ...SECTION_SCOPES.flatMap((scope) => SECTION_METRICS.map((metric) => createSectionMetricParameter(scope, 'control', metric))),
]

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
    ...SKEUO_SECTION_PARAMETERS,
    {
      id: 'skeuo-pane-elevation',
      labelKey: 'ui.themeParameter.skeuoPaneElevation',
      min: 8,
      max: 24,
      step: 1,
      fallback: 14,
      unit: 'px',
      read: (computed) => {
        return parseFirstNonZeroPxValue(computed.getPropertyValue('--mpx-panel-shadow').trim(), 14)
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 8, 24)
        const panelBlur = Math.max(12, Math.round(elevation * 2.1))
        const headerElevation = elevation + 1
        const headerBlur = Math.max(14, Math.round(elevation * 2.3))
        root.style.setProperty(
          '--mpx-panel-shadow',
          `0 ${elevation}px ${panelBlur}px var(--mpx-skeuo-shadow-dark), 0 2px 6px color-mix(in srgb, var(--mpx-palette-text-raw) 14%, transparent), inset 0 1px 0 color-mix(in srgb, var(--mpx-palette-surface) 96%, #ffffff)`,
        )
        root.style.setProperty('--mpx-main-shadow', 'var(--mpx-panel-shadow)')
        root.style.setProperty('--mpx-sidebar-shadow', 'var(--mpx-panel-shadow)')
        root.style.setProperty('--mpx-metadata-shadow', 'var(--mpx-panel-shadow)')
        root.style.setProperty(
          '--mpx-header-shadow',
          `0 ${headerElevation}px ${headerBlur}px var(--mpx-skeuo-shadow-dark), 0 2px 6px color-mix(in srgb, var(--mpx-palette-text-raw) 16%, transparent), inset 0 1px 0 color-mix(in srgb, var(--mpx-palette-surface) 97%, #ffffff)`,
        )
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-panel-shadow', '--mpx-main-shadow', '--mpx-sidebar-shadow', '--mpx-metadata-shadow', '--mpx-header-shadow'])
      },
    },
    {
      id: 'skeuo-header-gap',
      labelKey: 'ui.themeParameter.skeuoHeaderGap',
      min: 8,
      max: 20,
      step: 1,
      fallback: 12,
      unit: 'px',
      read: (computed) => {
        const raw = computed.getPropertyValue('--mpx-header-margin').trim()
        return parseFirstPxValueFromShadow(raw, 12)
      },
      apply: (root, value) => {
        const gap = clampValue(value, 8, 20)
        root.style.setProperty('--mpx-header-margin', `${gap}px ${gap}px 0px`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-header-margin'])
      },
    },
    {
      id: 'skeuo-container-elevation',
      labelKey: 'ui.themeParameter.skeuoContainerElevation',
      min: 4,
      max: 18,
      step: 1,
      fallback: 9,
      unit: 'px',
      read: (computed) => {
        return parseFirstNonZeroPxValue(computed.getPropertyValue('--mpx-card-shadow').trim(), 9)
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 4, 18)
        const blur = Math.max(8, Math.round(elevation * 2.1))
        const lightLift = Math.max(2, Math.round(elevation * 0.35))
        root.style.setProperty(
          '--mpx-card-shadow',
          `0 ${elevation}px ${blur}px var(--mpx-skeuo-shadow-dark), -${lightLift}px -${lightLift}px ${Math.max(6, blur - 4)}px var(--mpx-skeuo-shadow-light)`,
        )
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-card-shadow'])
      },
    },
    {
      id: 'skeuo-control-elevation',
      labelKey: 'ui.themeParameter.skeuoControlElevation',
      min: 3,
      max: 12,
      step: 1,
      fallback: 4,
      unit: 'px',
      read: (computed) => {
        return parseFirstNonZeroPxValue(computed.getPropertyValue('--mpx-control-shadow').trim(), 4)
      },
      apply: (root, value) => {
        const elevation = clampValue(value, 3, 12)
        const hover = elevation + 1
        const active = Math.max(2, elevation - 1)
        const blur = Math.max(7, Math.round(elevation * 2.1))
        root.style.setProperty(
          '--mpx-control-shadow',
          `${elevation}px ${elevation}px ${blur}px var(--mpx-skeuo-shadow-dark), -${elevation}px -${elevation}px ${blur}px var(--mpx-skeuo-shadow-light)`,
        )
        root.style.setProperty(
          '--mpx-control-hover-shadow',
          `${hover}px ${hover}px ${blur + 3}px var(--mpx-skeuo-shadow-dark), -${hover}px -${hover}px ${blur + 3}px var(--mpx-skeuo-shadow-light)`,
        )
        root.style.setProperty(
          '--mpx-control-active-shadow',
          `inset ${active}px ${active}px ${active * 2}px var(--mpx-skeuo-shadow-dark), inset -${active}px -${active}px ${active * 2}px var(--mpx-skeuo-shadow-light)`,
        )
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-control-shadow', '--mpx-control-hover-shadow', '--mpx-control-active-shadow'])
      },
    },
    {
      id: 'skeuo-border-contrast',
      labelKey: 'ui.themeParameter.skeuoBorderContrast',
      min: 14,
      max: 44,
      step: 1,
      fallback: 22,
      unit: '%',
      read: (computed) => {
        return parseFirstPercentValue(computed.getPropertyValue('--mpx-skeuo-border-contrast').trim(), 22)
      },
      apply: (root, value) => {
        const contrast = clampValue(value, 14, 44)
        const accentContrast = clampValue(contrast + 8, 20, 56)
        root.style.setProperty('--mpx-skeuo-border-contrast', `${contrast}%`)
        root.style.setProperty('--mpx-border-1', `color-mix(in srgb, var(--mpx-palette-text-raw) ${contrast}%, var(--mpx-palette-surface))`)
        root.style.setProperty('--mpx-border-2', `color-mix(in srgb, var(--mpx-palette-accent-raw) ${accentContrast}%, var(--mpx-palette-surface))`)
      },
      reset: (root) => {
        removeVariables(root, ['--mpx-skeuo-border-contrast', '--mpx-border-1', '--mpx-border-2'])
      },
    },
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

function includesSearch(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.trim().toLowerCase())
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('invalid file reader result'))
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('file reader failed'))
    }
    reader.readAsText(file)
  })
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
  const [searchText, setSearchText] = useState('')
  const [commonExpanded, setCommonExpanded] = useState(true)
  const [styleExpanded, setStyleExpanded] = useState(true)
  const [snapshotJson, setSnapshotJson] = useState('')
  const [snapshotMessage, setSnapshotMessage] = useState('')
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredCommonParameters = useMemo(() => {
    const keyword = searchText.trim()
    if (!keyword) {
      return COMMON_PARAMETERS
    }
    return COMMON_PARAMETERS.filter((parameter) => includesSearch(resolveParameterLabel(parameter, t), keyword))
  }, [searchText, t])

  const filteredStyleParameters = useMemo(() => {
    const keyword = searchText.trim()
    if (!keyword) {
      return styleParameters
    }
    return styleParameters.filter((parameter) => includesSearch(resolveParameterLabel(parameter, t), keyword))
  }, [searchText, styleParameters, t])

  useEffect(() => {
    if (!open) {
      return
    }
    setValues(readParameterValues(parameters))
    setSnapshotMessage('')
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

  const buildSnapshotPayload = (): ThemeParameterSnapshot => {
    return {
      version: 1,
      styleId,
      values: Object.fromEntries(parameters.map((parameter) => [parameter.id, values[parameter.id] ?? parameter.fallback])),
    }
  }

  const buildSnapshotJson = (): string => {
    return JSON.stringify(buildSnapshotPayload(), null, 2)
  }

  const exportSnapshotJson = () => {
    setSnapshotJson(buildSnapshotJson())
    setSnapshotMessage(t('ui.themeParameter.snapshotExported'))
  }

  const downloadSnapshotJson = () => {
    const snapshotText = buildSnapshotJson()
    setSnapshotJson(snapshotText)

    try {
      if (typeof URL.createObjectURL !== 'function') {
        throw new Error('blob url unavailable')
      }
      const blob = new Blob([snapshotText], { type: 'application/json' })
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const normalizedStyleId = styleId.replace(/[^a-zA-Z0-9-_]/g, '-')
      link.href = blobUrl
      link.download = `theme-parameter-${normalizedStyleId}-${timestamp}.json`
      link.click()
      URL.revokeObjectURL(blobUrl)
      setSnapshotMessage(t('ui.themeParameter.snapshotDownloaded'))
    } catch {
      setSnapshotMessage(t('ui.themeParameter.snapshotDownloadFailed'))
    }
  }

  const openSnapshotFilePicker = () => {
    snapshotFileInputRef.current?.click()
  }

  const loadSnapshotFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const text = await readFileAsText(file)
      setSnapshotJson(text)
      setSnapshotMessage(t('ui.themeParameter.snapshotFileLoaded', { fileName: file.name }))
    } catch {
      setSnapshotMessage(t('ui.themeParameter.snapshotFileLoadFailed'))
    } finally {
      event.target.value = ''
    }
  }

  const copySnapshotJson = async () => {
    if (!snapshotJson.trim()) {
      setSnapshotMessage(t('ui.themeParameter.snapshotEmpty'))
      return
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable')
      }
      await navigator.clipboard.writeText(snapshotJson)
      setSnapshotMessage(t('ui.themeParameter.snapshotCopied'))
    } catch {
      setSnapshotMessage(t('ui.themeParameter.snapshotCopyFailed'))
    }
  }

  const importSnapshotJson = () => {
    if (!snapshotJson.trim()) {
      setSnapshotMessage(t('ui.themeParameter.snapshotEmpty'))
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(snapshotJson)
    } catch {
      setSnapshotMessage(t('ui.themeParameter.snapshotImportFailed'))
      return
    }

    if (!parsed || typeof parsed !== 'object') {
      setSnapshotMessage(t('ui.themeParameter.snapshotImportFailed'))
      return
    }

    const payload = parsed as Partial<ThemeParameterSnapshot>
    if (!payload.values || typeof payload.values !== 'object') {
      setSnapshotMessage(t('ui.themeParameter.snapshotImportFailed'))
      return
    }

    const importedValues = payload.values as Record<string, unknown>
    const root = document.documentElement
    const nextValues: ThemeParameterValues = { ...values }

    for (const parameter of parameters) {
      const rawValue = importedValues[parameter.id]
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        continue
      }
      const normalized = normalizeByStep(rawValue, parameter.min, parameter.max, parameter.step)
      nextValues[parameter.id] = normalized
      parameter.apply(root, normalized, nextValues)
    }

    setValues(nextValues)

    if (payload.styleId && payload.styleId !== styleId) {
      setSnapshotMessage(t('ui.themeParameter.snapshotImportedStyleMismatch', { styleId: payload.styleId }))
      return
    }
    setSnapshotMessage(t('ui.themeParameter.snapshotImported'))
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
                <span>{t('ui.themeParameter.toolsSection')}</span>
              </header>
              <label className="theme-parameter-search" htmlFor="theme-parameter-search-input">
                <span>{t('ui.themeParameter.searchLabel')}</span>
                <input
                  id="theme-parameter-search-input"
                  type="text"
                  value={searchText}
                  placeholder={t('ui.themeParameter.searchPlaceholder')}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
              <div className="theme-parameter-actions">
                <button type="button" onClick={exportSnapshotJson}>
                  {t('ui.themeParameter.exportJson')}
                </button>
                <button type="button" onClick={downloadSnapshotJson}>
                  {t('ui.themeParameter.downloadJsonFile')}
                </button>
                <button type="button" onClick={openSnapshotFilePicker}>
                  {t('ui.themeParameter.loadJsonFile')}
                </button>
                <button type="button" onClick={() => {
                  void copySnapshotJson()
                }}>
                  {t('ui.themeParameter.copyJson')}
                </button>
                <button type="button" onClick={importSnapshotJson}>
                  {t('ui.themeParameter.importJson')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSnapshotJson('')
                    setSnapshotMessage('')
                  }}
                >
                  {t('ui.themeParameter.clearJson')}
                </button>
              </div>
              <input
                ref={snapshotFileInputRef}
                className="theme-parameter-file-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void loadSnapshotFile(event)
                }}
              />
              <label className="theme-parameter-json-field" htmlFor="theme-parameter-json-input">
                <span>{t('ui.themeParameter.snapshotLabel')}</span>
                <textarea
                  id="theme-parameter-json-input"
                  value={snapshotJson}
                  placeholder={t('ui.themeParameter.snapshotPlaceholder')}
                  onChange={(event) => setSnapshotJson(event.target.value)}
                />
              </label>
              {snapshotMessage ? <p className="settings-placeholder">{snapshotMessage}</p> : null}
            </section>

            <details className="settings-collapsible" open={commonExpanded} onToggle={(event) => setCommonExpanded((event.currentTarget as HTMLDetailsElement).open)}>
              <summary>{t('ui.themeParameter.sectionCommon')}</summary>
              <div className="settings-collapsible-content">
                <div className="theme-parameter-list">
                  {filteredCommonParameters.map((parameter) => {
                    const value = values[parameter.id] ?? parameter.fallback
                    return (
                      <label key={parameter.id} className="theme-parameter-row" htmlFor={`theme-parameter-${parameter.id}`}>
                        <span>{resolveParameterLabel(parameter, t)}</span>
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
                {filteredCommonParameters.length === 0 ? <p className="settings-placeholder">{t('ui.common.noResults')}</p> : null}
              </div>
            </details>

            <details className="settings-collapsible" open={styleExpanded} onToggle={(event) => setStyleExpanded((event.currentTarget as HTMLDetailsElement).open)}>
              <summary>{t('ui.themeParameter.sectionStyle', { styleId })}</summary>
              <div className="settings-collapsible-content">
                {styleParameters.length === 0 ? (
                  <p className="settings-placeholder">{t('ui.themeParameter.noStyleSpecific')}</p>
                ) : (
                  <div className="theme-parameter-list">
                    {filteredStyleParameters.map((parameter) => {
                      const value = values[parameter.id] ?? parameter.fallback
                      return (
                        <label key={parameter.id} className="theme-parameter-row" htmlFor={`theme-parameter-${parameter.id}`}>
                          <span>{resolveParameterLabel(parameter, t)}</span>
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
                {styleParameters.length > 0 && filteredStyleParameters.length === 0 ? <p className="settings-placeholder">{t('ui.common.noResults')}</p> : null}
              </div>
            </details>

            <section className="settings-group">
              <header className="settings-group-head">
                <span>{t('ui.themeParameter.actionsSection')}</span>
              </header>
              <div className="theme-parameter-actions">
                <button type="button" onClick={resetCurrentStyleParameters}>
                  {t('ui.themeParameter.resetCurrentStyle')}
                </button>
              </div>
            </section>
          </section>
        </main>
      </section>
    </div>
  )
}

export default ThemeParameterPanel
