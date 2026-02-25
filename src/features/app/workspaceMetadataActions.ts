import { flattenExternalTags } from './workspaceSharedUtils'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { BrowserMode, ImagePackage } from '../../types'

interface MetadataActionsParams {
  mode: BrowserMode
  metadataWriteBindings: MetadataWriteBindingsResult
  metadataImagePackageEffective: ImagePackage | null
}

interface SaveParsedMetadataErrors {
  saveParsedMetadataErrors: {
    unsupportedMode: string
    noAvailablePackage: string
  }
}

export function createApplyMetadataSyncName({
  mode,
  metadataWriteBindings,
}: MetadataActionsParams): () => void {
  return () => {
    if (mode === 'image') {
      metadataWriteBindings.applyPackageSyncName()
      return
    }
    if (mode === 'music') {
      return
    }
    metadataWriteBindings.applyVideoSyncName()
  }
}

export function createSaveParsedMetadata({
  mode,
  metadataWriteBindings,
  metadataImagePackageEffective,
  saveParsedMetadataErrors,
}: MetadataActionsParams & SaveParsedMetadataErrors): (parsed: ParsedExternalMetadata) => Promise<void> {
  const saveByPackageId = createSaveParsedMetadataByPackageId({
    mode,
    metadataWriteBindings,
    saveParsedMetadataErrors,
  })

  return async (parsed: ParsedExternalMetadata) => {
    if (mode !== 'image') {
      throw new Error(saveParsedMetadataErrors.unsupportedMode)
    }
    const packageId = metadataImagePackageEffective?.id
    if (!packageId) {
      throw new Error(saveParsedMetadataErrors.noAvailablePackage)
    }
    await saveByPackageId(packageId, parsed)
  }
}

interface SaveParsedMetadataByPackageIdParams {
  mode: BrowserMode
  metadataWriteBindings: MetadataWriteBindingsResult
  saveParsedMetadataErrors: {
    unsupportedMode: string
    noAvailablePackage: string
  }
}

export function createSaveParsedMetadataByPackageId({
  mode,
  metadataWriteBindings,
  saveParsedMetadataErrors,
}: SaveParsedMetadataByPackageIdParams): (packageId: string, parsed: ParsedExternalMetadata) => Promise<void> {
  return async (packageId: string, parsed: ParsedExternalMetadata) => {
    if (mode !== 'image') {
      throw new Error(saveParsedMetadataErrors.unsupportedMode)
    }
    const normalizedPackageId = packageId.trim()
    if (!normalizedPackageId) {
      throw new Error(saveParsedMetadataErrors.noAvailablePackage)
    }
    await metadataWriteBindings.applyPackageMetadataById(normalizedPackageId, {
      workTitle: parsed.title,
      circle: parsed.group,
      author: parsed.artist,
      tags: flattenExternalTags(parsed.tags),
    })
    await metadataWriteBindings.applyPackageExternalMetadataById(normalizedPackageId, {
      sourceSite: parsed.source.site,
      sourceUrl: parsed.source.url,
      sourceRemoteId: parsed.source.id,
      sourceToken: parsed.source.token,
      title: parsed.title,
      titleJpn: parsed.title_jpn,
      group: parsed.group,
      groupJpn: parsed.group_jpn,
      artist: parsed.artist,
      artistJpn: parsed.artist_jpn,
      posted: parsed.posted,
      rating: parsed.rating,
      favorited: parsed.favorited,
      thumbUrl: parsed.thumb,
      tags: parsed.tags,
      rawJson: JSON.stringify(parsed),
    })
  }
}
