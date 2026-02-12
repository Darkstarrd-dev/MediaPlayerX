import { mediaLocatorFileName } from '../../features/backend'
import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { ImageItem, ImagePackage } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'

interface MetadataImageEditorProps {
  contentClassName: string
  showImageCanvas: boolean
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  displayedImageSrc: string | null
  imagePreviewSizing: { width?: string; height?: string }
  metadataPending: boolean
  editable: boolean
  currentGrade: number | null
  workTitleDraft: string
  circleDraft: string
  authorDraft: string
  tagsDraft: string
  onWorkTitleDraftChange: (value: string) => void
  onCircleDraftChange: (value: string) => void
  onAuthorDraftChange: (value: string) => void
  onTagsDraftChange: (value: string) => void
  onSubmitPackageWorkTitle: (value: string) => void
  onSubmitPackageCircle: (value: string) => void
  onSubmitPackageAuthor: (value: string) => void
  onSubmitPackageTags: (value: string) => void
  onGradeChange: (grade: number | null) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  imagePreviewSizing,
  metadataPending,
  editable,
  currentGrade,
  workTitleDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onWorkTitleDraftChange,
  onCircleDraftChange,
  onAuthorDraftChange,
  onTagsDraftChange,
  onSubmitPackageWorkTitle,
  onSubmitPackageCircle,
  onSubmitPackageAuthor,
  onSubmitPackageTags,
  onGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
}: MetadataImageEditorProps) {
  const [preferTitleJpn, setPreferTitleJpn] = useState(true)
  const [preferAuthorJpn, setPreferAuthorJpn] = useState(true)
  const [preferGroupJpn, setPreferGroupJpn] = useState(true)

  useEffect(() => {
    setPreferTitleJpn(true)
    setPreferAuthorJpn(true)
    setPreferGroupJpn(true)
  }, [focusedImagePackage?.id])

  const readOnlyTags = tagsDraft
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)

  const commitOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    onCommit: (value: string) => void,
  ) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    onCommit(event.currentTarget.value)
  }

  const external = focusedImagePackage?.externalMetadata ?? null
  const sourceLabel = external ? (external.sourceSite === 'nhentai' ? 'NH' : 'EH') : 'USER'
  const sourceDisplayValue = external ? `${sourceLabel} #${external.sourceRemoteId}` : sourceLabel

  const resolvedTitle = useMemo(() => {
    if (!external) {
      return workTitleDraft.trim() || '-'
    }
    const primary = preferTitleJpn ? external.titleJpn : external.title
    const fallback = preferTitleJpn ? external.title : external.titleJpn
    return primary.trim() || fallback.trim() || '-'
  }, [external, preferTitleJpn, workTitleDraft])

  const resolvedAuthor = useMemo(() => {
    if (!external) {
      return authorDraft.trim() || '-'
    }
    const primary = preferAuthorJpn ? external.artistJpn : external.artist
    const fallback = preferAuthorJpn ? external.artist : external.artistJpn
    return primary.trim() || fallback.trim() || '-'
  }, [authorDraft, external, preferAuthorJpn])

  const resolvedGroup = useMemo(() => {
    if (!external) {
      return circleDraft.trim() || '-'
    }
    const primary = preferGroupJpn ? external.groupNameJpn : external.groupName
    const fallback = preferGroupJpn ? external.groupName : external.groupNameJpn
    return primary.trim() || fallback.trim() || '-'
  }, [circleDraft, external, preferGroupJpn])

  const externalTagValues = useMemo(() => {
    if (!external) {
      return [] as string[]
    }
    const values: string[] = []
    for (const raw of Object.values(external.tags)) {
      const parts = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      values.push(...parts)
    }
    return Array.from(new Set(values))
  }, [external])

  const parodyValues = useMemo(() => {
    const raw = external?.tags.parody ?? ''
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }, [external])

  const characterValues = useMemo(() => {
    const raw = external?.tags.character ?? ''
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }, [external])

  const openSourceInBrowser = () => {
    if (!external?.sourceUrl) {
      return
    }
    const backendApi = window.mediaPlayerBackend as
      | (typeof window.mediaPlayerBackend & {
          openExternalUrl?: (request: { url: string }) => Promise<{ ok: boolean }>
        })
      | undefined
    const openExternalUrl = backendApi?.openExternalUrl
    if (openExternalUrl) {
      void openExternalUrl({ url: external.sourceUrl })
      return
    }
    window.open(external.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={contentClassName}>
      {showImageCanvas && focusedImage ? (
        <>
          <div className="metadata-image-canvas">
            {displayedImageSrc ? (
              <img
                className="metadata-image-real"
                src={displayedImageSrc}
                alt={`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}
                draggable={false}
              />
            ) : (
              <div
                className="metadata-image-media"
                style={{
                  background: focusedImage.color,
                  aspectRatio: `${focusedImage.width} / ${focusedImage.height}`,
                  ...imagePreviewSizing,
                }}
              >
                <span>{`${focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width} x ${focusedImage.height}` : '-'}`}</span>
              </div>
            )}
          </div>
          <div className="metadata-image-caption">
            <strong>{`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}</strong>
            <span>{mediaLocatorFileName(focusedImage.mediaLocator)}</span>
          </div>
        </>
      ) : (
        <div className="metadata-editor-shell">
          <MetadataRatingGroup
            title="评分"
            groupAriaLabel="图包评分"
            clearAriaLabel="清空评分"
            pending={metadataPending}
            value={currentGrade}
            onChange={onGradeChange}
          />

          {focusedImagePackage ? (
            <div className="metadata-edit-grid">
              <label>
                <span>图包名</span>
                <input readOnly value={focusedImagePackage.packageName} />
              </label>

              <label>
                <span>作品名</span>
                {editable ? (
                  <input
                    value={workTitleDraft}
                    onChange={(event) => onWorkTitleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageWorkTitle)
                    }}
                  />
                ) : (
                  <input readOnly value={workTitleDraft.trim() || '-'} />
                )}
              </label>

              <label>
                <span>社团</span>
                {editable ? (
                  <input
                    value={circleDraft}
                    onChange={(event) => onCircleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageCircle)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={circleDraft.trim().length === 0}
                    onClick={() => onSearchByCircle(circleDraft.trim())}
                  >
                    {circleDraft.trim() || '-'}
                  </button>
                )}
              </label>

              <label>
                <span>作者</span>
                {editable ? (
                  <input
                    value={authorDraft}
                    onChange={(event) => onAuthorDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageAuthor)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={authorDraft.trim().length === 0}
                    onClick={() => onSearchByAuthor(authorDraft.trim())}
                  >
                    {authorDraft.trim() || '-'}
                  </button>
                )}
              </label>

              <label>
                <span>Tags</span>
                {editable ? (
                  <input
                    value={tagsDraft}
                    placeholder="多个标签用逗号分隔"
                    onChange={(event) => onTagsDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageTags)
                    }}
                  />
                ) : (
                  <div className="metadata-tag-chip-list">
                    {readOnlyTags.length > 0
                      ? readOnlyTags.map((tag) => (
                          <button key={tag} type="button" onClick={() => onSearchByTag(tag)}>
                            {tag}
                          </button>
                        ))
                      : '-'}
                  </div>
                )}
              </label>

              <label>
                <span>来源</span>
                <button
                  type="button"
                  disabled={!external || !external.sourceUrl}
                  onClick={openSourceInBrowser}
                >
                  {sourceDisplayValue}
                </button>
              </label>

              <label>
                <span>来源标题</span>
                <button
                  type="button"
                  disabled={!external || !(external.title.trim() && external.titleJpn.trim())}
                  onClick={() => {
                    if (!external) {
                      return
                    }
                    setPreferTitleJpn((value) => !value)
                  }}
                >
                  {resolvedTitle}
                </button>
              </label>

              <label>
                <span>来源作者</span>
                <button
                  type="button"
                  disabled={!external || !(external.artist.trim() && external.artistJpn.trim())}
                  onClick={() => {
                    if (!external) {
                      return
                    }
                    setPreferAuthorJpn((value) => !value)
                  }}
                >
                  {resolvedAuthor}
                </button>
              </label>

              <label>
                <span>来源社团</span>
                <button
                  type="button"
                  disabled={!external || !(external.groupName.trim() && external.groupNameJpn.trim())}
                  onClick={() => {
                    if (!external) {
                      return
                    }
                    setPreferGroupJpn((value) => !value)
                  }}
                >
                  {resolvedGroup}
                </button>
              </label>

              <label>
                <span>发布时间</span>
                <input readOnly value={external?.posted?.trim() || '-'} />
              </label>

              <label>
                <span>评分/收藏</span>
                <input readOnly value={`${external?.rating ?? '-'} / ${external?.favorited ?? '-'}`} />
              </label>

              <label>
                <span>Parody</span>
                <div className="metadata-tag-chip-list">
                  {parodyValues.length > 0
                    ? parodyValues.map((tag) => (
                        <button key={`parody-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                          {tag}
                        </button>
                      ))
                    : '-'}
                </div>
              </label>

              <label>
                <span>Character</span>
                <div className="metadata-tag-chip-list">
                  {characterValues.length > 0
                    ? characterValues.map((tag) => (
                        <button key={`character-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                          {tag}
                        </button>
                      ))
                    : '-'}
                </div>
              </label>

              <label>
                <span>外部标签</span>
                <div className="metadata-tag-chip-list">
                  {externalTagValues.length > 0
                    ? externalTagValues.map((tag) => (
                        <button key={`external-tag-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                          {tag}
                        </button>
                      ))
                    : '-'}
                </div>
              </label>
            </div>
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
