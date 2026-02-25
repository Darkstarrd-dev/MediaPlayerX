import type { TranslateFn } from './context'
import { a11yRegistry, type A11yRegistryKey } from './ariaRegistry'

export interface A11yProps {
  'data-a11y-id': string
  'aria-label': string
  'data-tooltip-label'?: string
}

interface BuildA11yPropsParams {
  id: string
  labelKey: string
  titleKey?: string
  t: TranslateFn
  labelParams?: Record<string, string | number | boolean | null | undefined>
  titleParams?: Record<string, string | number | boolean | null | undefined>
}

export function buildA11yProps({
  id,
  labelKey,
  titleKey,
  t,
  labelParams,
  titleParams,
}: BuildA11yPropsParams): A11yProps {
  const props: A11yProps = {
    'data-a11y-id': id,
    'aria-label': t(labelKey, labelParams),
  }

  if (titleKey) {
    props['data-tooltip-label'] = t(titleKey, titleParams)
  }

  return props
}

interface BuildA11yPropsByRegistryParams {
  key: A11yRegistryKey
  t: TranslateFn
  labelParams?: Record<string, string | number | boolean | null | undefined>
  titleParams?: Record<string, string | number | boolean | null | undefined>
}

export function buildA11yPropsByRegistry({
  key,
  t,
  labelParams,
  titleParams,
}: BuildA11yPropsByRegistryParams): A11yProps {
  const entry = a11yRegistry[key]
  const titleKey = 'titleKey' in entry ? entry.titleKey : undefined
  return buildA11yProps({
    id: entry.id,
    labelKey: entry.labelKey,
    titleKey,
    t,
    labelParams,
    titleParams,
  })
}
