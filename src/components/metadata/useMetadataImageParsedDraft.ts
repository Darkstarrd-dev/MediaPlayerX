import { useEffect, useMemo, useRef, useState } from 'react'

import type { ParsedExternalMetadata } from '../../features/metadata/parseExternalMetadata'
import { useI18n } from '../../i18n/useI18n'
import type { ImagePackage } from '../../types'
import {
  PARSED_METADATA_ERROR_INVALID_TAG_JSON,
  PARSED_METADATA_ERROR_SOURCE_ID_REQUIRED,
  PARSED_METADATA_ERROR_SOURCE_URL_REQUIRED,
  PARSED_METADATA_ERROR_TAG_NAMESPACE_STRING,
  type ParsedMetadataDraft,
  buildParsedDraft,
  copyTextValue,
  flattenTagValuesExcluding,
  joinTagValues,
  parseTagJson,
  resolveEditableTagsValue,
  resolveEvaluationDisplayValue,
  resolveLanguageLabel,
  resolveSourceSiteLabel,
  splitTagValues,
  toParsedPayload,
} from './MetadataImageEditor.helpers'

interface UseMetadataImageParsedDraftParams {
  focusedImagePackage: ImagePackage | null
  workTitleDraft: string
  circleDraft: string
  authorDraft: string
  tagsDraft: string
  onSubmitParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>
  onSearchByAuthor: (value: string) => void
  onSearchByCircle: (value: string) => void
}

export function useMetadataImageParsedDraft({
  focusedImagePackage,
  workTitleDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onSubmitParsedMetadata,
  onSearchByAuthor,
  onSearchByCircle,
}: UseMetadataImageParsedDraftParams) {
  const { t } = useI18n()
  const [preferTitleJpn, setPreferTitleJpn] = useState(true)
  const [preferAuthorJpn, setPreferAuthorJpn] = useState(true)
  const [preferGroupJpn, setPreferGroupJpn] = useState(true)
  const [parsedDraft, setParsedDraft] = useState<ParsedMetadataDraft>(
    buildParsedDraft(focusedImagePackage, workTitleDraft, circleDraft, authorDraft, tagsDraft),
  )
  const [parsedError, setParsedError] = useState<string | null>(null)

  const resolveParsedErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message === PARSED_METADATA_ERROR_INVALID_TAG_JSON) {
        return t('ui.metadata.parsedError.invalidTagJson')
      }
      if (error.message.startsWith(`${PARSED_METADATA_ERROR_TAG_NAMESPACE_STRING}:`)) {
        const namespace = error.message.slice(`${PARSED_METADATA_ERROR_TAG_NAMESPACE_STRING}:`.length)
        return t('ui.metadata.parsedError.tagNamespaceMustBeString', { namespace })
      }
      if (error.message === PARSED_METADATA_ERROR_SOURCE_URL_REQUIRED) {
        return t('ui.metadata.parsedError.sourceUrlRequired')
      }
      if (error.message === PARSED_METADATA_ERROR_SOURCE_ID_REQUIRED) {
        return t('ui.metadata.parsedError.sourceIdRequired')
      }
      return error.message
    }
    return t('ui.metadata.parsedWriteFailed')
  }

  const latestPackageDraftFallbackRef = useRef({
    workTitleDraft,
    circleDraft,
    authorDraft,
    tagsDraft,
  })

  useEffect(() => {
    latestPackageDraftFallbackRef.current = {
      workTitleDraft,
      circleDraft,
      authorDraft,
      tagsDraft,
    }
  }, [authorDraft, circleDraft, tagsDraft, workTitleDraft])

  useEffect(() => {
    const latestDraftFallback = latestPackageDraftFallbackRef.current
    setPreferTitleJpn(true)
    setPreferAuthorJpn(true)
    setPreferGroupJpn(true)
    setParsedDraft(
      buildParsedDraft(
        focusedImagePackage,
        latestDraftFallback.workTitleDraft,
        latestDraftFallback.circleDraft,
        latestDraftFallback.authorDraft,
        latestDraftFallback.tagsDraft,
      ),
    )
    setParsedError(null)
  }, [focusedImagePackage])

  const parsedTagMap = useMemo(() => {
    try {
      return parseTagJson(parsedDraft.tagsJson)
    } catch {
      return {} as Record<string, string>
    }
  }, [parsedDraft.tagsJson])

  const readOnlyTags = useMemo(() => {
    const parsedValues = flattenTagValuesExcluding(parsedTagMap, ['parody', 'character'])
    if (parsedValues.length > 0) {
      return parsedValues
    }
    return tagsDraft
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
  }, [parsedTagMap, tagsDraft])

  const sourceDisplayValue = resolveSourceSiteLabel(parsedDraft.sourceSite, {
    nhentai: t('ui.metadata.sourceSiteNhentai'),
    ehentai: t('ui.metadata.sourceSiteEhentai'),
    others: t('ui.metadata.sourceSiteOthers'),
  })

  const resolvedTitle = useMemo(() => {
    const primary = preferTitleJpn ? parsedDraft.titleJpn : parsedDraft.title
    const fallback = preferTitleJpn ? parsedDraft.title : parsedDraft.titleJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.title, parsedDraft.titleJpn, preferTitleJpn])

  const resolvedAuthor = useMemo(() => {
    const primary = preferAuthorJpn ? parsedDraft.artistJpn : parsedDraft.artist
    const fallback = preferAuthorJpn ? parsedDraft.artist : parsedDraft.artistJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.artist, parsedDraft.artistJpn, preferAuthorJpn])

  const resolvedGroup = useMemo(() => {
    const primary = preferGroupJpn ? parsedDraft.groupJpn : parsedDraft.group
    const fallback = preferGroupJpn ? parsedDraft.group : parsedDraft.groupJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.group, parsedDraft.groupJpn, preferGroupJpn])

  const titleLangLabel = useMemo(
    () => resolveLanguageLabel(preferTitleJpn, parsedDraft.titleJpn, parsedDraft.title),
    [parsedDraft.title, parsedDraft.titleJpn, preferTitleJpn],
  )
  const authorLangLabel = useMemo(
    () => resolveLanguageLabel(preferAuthorJpn, parsedDraft.artistJpn, parsedDraft.artist),
    [parsedDraft.artist, parsedDraft.artistJpn, preferAuthorJpn],
  )
  const groupLangLabel = useMemo(
    () => resolveLanguageLabel(preferGroupJpn, parsedDraft.groupJpn, parsedDraft.group),
    [parsedDraft.group, parsedDraft.groupJpn, preferGroupJpn],
  )
  const hasDualTitle = parsedDraft.title.trim().length > 0 && parsedDraft.titleJpn.trim().length > 0
  const hasDualAuthor = parsedDraft.artist.trim().length > 0 && parsedDraft.artistJpn.trim().length > 0
  const hasDualGroup = parsedDraft.group.trim().length > 0 && parsedDraft.groupJpn.trim().length > 0
  const titleToggleLabel = titleLangLabel === 'EN' ? 'EN' : 'JP'
  const authorToggleLabel = authorLangLabel === 'EN' ? 'EN' : 'JP'
  const groupToggleLabel = groupLangLabel === 'EN' ? 'EN' : 'JP'
  const ratingFavoritedDisplayValue = `${parsedDraft.rating.trim() || '-'} / ${parsedDraft.favorited.trim() || '-'}`

  const parodyValues = useMemo(() => splitTagValues(parsedTagMap.parody ?? ''), [parsedTagMap])
  const characterValues = useMemo(() => splitTagValues(parsedTagMap.character ?? ''), [parsedTagMap])
  const editableParodyValue = useMemo(() => joinTagValues(parsedTagMap.parody ?? ''), [parsedTagMap])
  const editableCharacterValue = useMemo(() => joinTagValues(parsedTagMap.character ?? ''), [parsedTagMap])
  const editableTagsValue = useMemo(
    () => resolveEditableTagsValue(parsedDraft.sourceSite, parsedTagMap),
    [parsedDraft.sourceSite, parsedTagMap],
  )
  const evaluationDisplayValue = useMemo(() => resolveEvaluationDisplayValue(parsedDraft), [parsedDraft])

  const persistParsedPatch = async (patch: Partial<ParsedMetadataDraft>) => {
    const nextDraft = {
      ...parsedDraft,
      ...patch,
    }
    setParsedDraft(nextDraft)
    setParsedError(null)
    try {
      const payload = toParsedPayload(nextDraft)
      await onSubmitParsedMetadata(payload)
    } catch (error) {
      setParsedError(resolveParsedErrorMessage(error))
    }
  }

  const openSourceInBrowser = () => {
    const targetUrl = parsedDraft.sourceUrl.trim()
    if (!targetUrl) {
      return
    }
    const backendApi = window.mediaPlayerBackend as
      | (typeof window.mediaPlayerBackend & {
          openExternalUrl?: (request: { url: string }) => Promise<{ ok: boolean }>
        })
      | undefined
    const openExternalUrl = backendApi?.openExternalUrl
    if (openExternalUrl) {
      void openExternalUrl({ url: targetUrl })
      return
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const copyResolvedTitle = () => {
    const value = resolvedTitle.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const copyResolvedAuthor = () => {
    const value = resolvedAuthor.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const copyResolvedGroup = () => {
    const value = resolvedGroup.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const searchResolvedAuthor = () => {
    const value = resolvedAuthor.trim()
    if (!value || value === '-') {
      return
    }
    onSearchByAuthor(value)
  }

  const searchResolvedGroup = () => {
    const value = resolvedGroup.trim()
    if (!value || value === '-') {
      return
    }
    onSearchByCircle(value)
  }

  return {
    parsedDraft,
    setParsedDraft,
    parsedError,
    parsedTagMap,
    readOnlyTags,
    sourceDisplayValue,
    resolvedTitle,
    resolvedAuthor,
    resolvedGroup,
    hasDualTitle,
    hasDualAuthor,
    hasDualGroup,
    titleToggleLabel,
    authorToggleLabel,
    groupToggleLabel,
    ratingFavoritedDisplayValue,
    parodyValues,
    characterValues,
    editableParodyValue,
    editableCharacterValue,
    editableTagsValue,
    evaluationDisplayValue,
    setPreferTitleJpn,
    setPreferAuthorJpn,
    setPreferGroupJpn,
    persistParsedPatch,
    openSourceInBrowser,
    copyResolvedTitle,
    copyResolvedAuthor,
    copyResolvedGroup,
    searchResolvedAuthor,
    searchResolvedGroup,
  }
}
