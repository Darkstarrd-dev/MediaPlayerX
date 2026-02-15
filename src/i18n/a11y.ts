import type { TranslateFn } from './I18nProvider'

export interface A11yProps {
  'data-a11y-id': string
  'aria-label': string
  title?: string
}

interface BuildA11yPropsParams {
  id: string
  labelKey: string
  titleKey?: string
  t: TranslateFn
}

export function buildA11yProps({
  id,
  labelKey,
  titleKey,
  t,
}: BuildA11yPropsParams): A11yProps {
  const props: A11yProps = {
    'data-a11y-id': id,
    'aria-label': t(labelKey),
  }

  if (titleKey) {
    props.title = t(titleKey)
  }

  return props
}
