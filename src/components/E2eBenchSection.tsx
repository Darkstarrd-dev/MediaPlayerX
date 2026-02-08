import E2eBenchController, { type E2eBenchControllerProps } from '../bench/E2eBenchController'

interface E2eBenchSectionProps extends E2eBenchControllerProps {
  enabled: boolean
  benchMode: string | null
}

function E2eBenchSection({ enabled, benchMode, ...controllerProps }: E2eBenchSectionProps) {
  if (!enabled || benchMode !== 'e2e') {
    return null
  }

  return <E2eBenchController {...controllerProps} />
}

export default E2eBenchSection
