import { flattenExternalTags } from './workspaceSharedUtils'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { BrowserMode, ImagePackage } from '../../types'

interface MetadataActionsParams {
  mode: BrowserMode
  metadataWriteBindings: MetadataWriteBindingsResult
  metadataImagePackageEffective: ImagePackage | null
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
}: MetadataActionsParams): (parsed: ParsedExternalMetadata) => Promise<void> {
  return async (parsed: ParsedExternalMetadata) => {
    if (mode !== 'image') {
      throw new Error('当前模式不支持写入图包元数据')
    }
    const packageId = metadataImagePackageEffective?.id
    if (!packageId) {
      throw new Error('当前无可用图包，无法保存')
    }
    await metadataWriteBindings.applyPackageMetadataById(packageId, {
      workTitle: parsed.title,
      circle: parsed.group,
      author: parsed.artist,
      tags: flattenExternalTags(parsed.tags),
    })
    await metadataWriteBindings.applyPackageExternalMetadataById(packageId, {
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
