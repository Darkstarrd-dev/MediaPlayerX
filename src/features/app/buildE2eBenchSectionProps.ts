import type { Dispatch, SetStateAction } from 'react'

import type { E2eBenchSectionProps } from '../../components/E2eBenchSection'
import type { ImagePackage } from '../../types'
import type { ReadonlyMediaRepository } from '../backend/repository'

interface BuildE2eBenchSectionPropsParams {
  enabled: boolean
  benchMode: string | null
  repository: ReadonlyMediaRepository
  mode: 'image' | 'video'
  orderedPackages: ImagePackage[]
  selectedPackageId: string
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  pageIndex: number | null
  totalPages: number
  pageLoading: boolean
  refsInPageCount: number
  goNextPage: () => void
  goPrevPage: () => void
}

export function buildE2eBenchSectionProps({
  enabled,
  benchMode,
  repository,
  mode,
  orderedPackages,
  selectedPackageId,
  setSelectedPackageId,
  pageIndex,
  totalPages,
  pageLoading,
  refsInPageCount,
  goNextPage,
  goPrevPage,
}: BuildE2eBenchSectionPropsParams): E2eBenchSectionProps {
  return {
    enabled,
    benchMode,
    repository,
    mode,
    orderedPackages,
    selectedPackageId,
    setSelectedPackageId,
    pageIndex,
    totalPages,
    pageLoading,
    refsInPageCount,
    goNextPage,
    goPrevPage,
  }
}
