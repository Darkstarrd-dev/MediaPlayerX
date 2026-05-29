import {
  mapMediaLocatorToDto,
  mediaLocatorFileName,
} from "../../features/backend";
import { useEffect, useRef, useState } from "react";
import type { ParsedExternalMetadata } from "../../features/metadata/parseExternalMetadata";
import type { ImageItem, ImagePackage } from "../../types";
import { resolveSourceImageCount } from "../../utils/mediaHelpers";
import { MetadataRatingGroup } from "./MetadataRatingGroup";
import { useI18n } from "../../i18n/useI18n";
import { useMetadataImageParsedDraft } from "./useMetadataImageParsedDraft";
import {
  formatTagJson,
  toSourceSite,
  updateSourceTagsBySite,
  updateTagNamespace,
} from "./MetadataImageEditor.helpers";

interface MetadataImageEditorProps {
  contentClassName: string;
  showImageCanvas: boolean;
  focusedImage: ImageItem | null;
  focusedImagePackage: ImagePackage | null;
  displayedImageSrc: string | null;
  metadataPending: boolean;
  editable: boolean;
  currentGrade: number | null;
  workTitleDraft: string;
  seriesIdDraft: string;
  circleDraft: string;
  authorDraft: string;
  tagsDraft: string;
  onWorkTitleDraftChange: (value: string) => void;
  onSeriesIdDraftChange: (value: string) => void;
  onCircleDraftChange: (value: string) => void;
  onAuthorDraftChange: (value: string) => void;
  onTagsDraftChange: (value: string) => void;
  onSubmitPackageWorkTitle: (value: string) => void;
  onSubmitPackageSeriesId: (value: string) => void;
  onSubmitPackageCircle: (value: string) => void;
  onSubmitPackageAuthor: (value: string) => void;
  onSubmitPackageTags: (value: string) => void;
  onSubmitParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>;
  onGradeChange: (grade: number | null) => void;
  onSearchByWorkTitle: (value: string) => void;
  onSearchByCircle: (value: string) => void;
  onSearchByAuthor: (value: string) => void;
  onSearchByTag: (value: string) => void;
  onCaptionChange?: (value: MetadataImageCaption | null) => void;
}

export interface MetadataImageCaption {
  fileName: string;
  metaLine: string;
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  metadataPending,
  editable,
  currentGrade,
  workTitleDraft,
  seriesIdDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onWorkTitleDraftChange,
  onSeriesIdDraftChange,
  onCircleDraftChange,
  onAuthorDraftChange,
  onTagsDraftChange,
  onSubmitPackageWorkTitle,
  onSubmitPackageSeriesId,
  onSubmitPackageCircle,
  onSubmitPackageAuthor,
  onSubmitPackageTags,
  onSubmitParsedMetadata,
  onGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
  onCaptionChange,
}: MetadataImageEditorProps) {
  const { t } = useI18n();
  const [resolvedCaptionDims, setResolvedCaptionDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [resolvedCaptionBytes, setResolvedCaptionBytes] = useState<
    number | null
  >(null);
  const captionRequestIdRef = useRef(0);

  const imageFromPackage =
    focusedImage && focusedImagePackage
      ? (focusedImagePackage.images.find(
          (item) => item.id === focusedImage.id,
        ) ?? null)
      : null;
  const {
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
  } = useMetadataImageParsedDraft({
    focusedImagePackage,
    workTitleDraft,
    circleDraft,
    authorDraft,
    tagsDraft,
    onSubmitParsedMetadata,
    onSearchByAuthor,
    onSearchByCircle,
  });

  const captionResolutionText = (() => {
    const width =
      resolvedCaptionDims?.width ??
      imageFromPackage?.width ??
      focusedImage?.width ??
      0;
    const height =
      resolvedCaptionDims?.height ??
      imageFromPackage?.height ??
      focusedImage?.height ??
      0;
    return width > 0 && height > 0 ? `${width} x ${height}` : "-";
  })();

  const captionSizeText = (() => {
    const bytes = resolvedCaptionBytes;
    if (!bytes || bytes <= 0) {
      const sizeKb = imageFromPackage?.sizeKb ?? focusedImage?.sizeKb ?? 0;
      if (sizeKb <= 0) {
        return "-";
      }
      if (sizeKb >= 1024) {
        return `${(sizeKb / 1024).toFixed(2)}MB`;
      }
      return `${Math.round(sizeKb)}KB`;
    }
    const kb = bytes / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)}MB`;
    }
    return `${Math.round(kb)}KB`;
  })();
  const captionFileName = focusedImage
    ? mediaLocatorFileName(focusedImage.mediaLocator)
    : "-";
  const captionMetaLine = `${captionResolutionText} / ${captionSizeText}`;

  const imagePreference = focusedImagePackage?.preferenceMetrics ?? null;
  const imageEventCount = Math.max(0, imagePreference?.eventCount ?? 0);
  const imagePagesRead = Math.max(0, imagePreference?.pagesRead ?? 0);
  const imageTotalPages = Math.max(
    0,
    imagePreference?.totalPages ??
      (focusedImagePackage ? resolveSourceImageCount(focusedImagePackage) : 0),
  );
  const imageCompletionPercent = `${(Math.max(0, Math.min(1, imagePreference?.completionRatio ?? 0)) * 100).toFixed(1)}%`;
  const imagePagesReadSummary = `${imagePagesRead} / ${imageTotalPages}`;
  const imageLastEventTimeText =
    imagePreference?.lastEventTimeMs && imagePreference.lastEventTimeMs > 0
      ? new Date(imagePreference.lastEventTimeMs).toLocaleString("zh-CN", {
          hour12: false,
        })
      : "-";

  useEffect(() => {
    captionRequestIdRef.current += 1;
    const requestId = captionRequestIdRef.current;

    setResolvedCaptionDims(null);
    setResolvedCaptionBytes(null);

    if (!focusedImage) {
      return;
    }

    const api = window.mediaPlayerBackend;
    if (!api?.resolveMediaResource) {
      return;
    }

    const controller = new AbortController();

    const loadDimsFromUrl = (
      url: string,
    ): Promise<{ width: number; height: number } | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;
          resolve(width > 0 && height > 0 ? { width, height } : null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const resolveContentLength = async (
      url: string,
    ): Promise<number | null> => {
      try {
        const head = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });
        const length = head.headers.get("content-length");
        const parsed = length ? Number.parseInt(length, 10) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      } catch {
        // ignore
      }

      try {
        const range = await fetch(url, {
          method: "GET",
          headers: {
            Range: "bytes=0-0",
          },
          signal: controller.signal,
        });
        const contentRange = range.headers.get("content-range");
        if (!contentRange) {
          return null;
        }
        const match = /\/(\d+)\s*$/.exec(contentRange);
        const total = match?.[1] ? Number.parseInt(match[1], 10) : NaN;
        return Number.isFinite(total) && total > 0 ? total : null;
      } catch {
        return null;
      }
    };

    void (async () => {
      try {
        const resource = await api.resolveMediaResource({
          locator: mapMediaLocatorToDto(focusedImage.mediaLocator),
          preferred_variant: "original",
        });
        const url = resource?.resource_url;
        if (
          !url ||
          controller.signal.aborted ||
          captionRequestIdRef.current !== requestId
        ) {
          return;
        }

        const [dims, bytes] = await Promise.all([
          loadDimsFromUrl(url),
          resolveContentLength(url),
        ]);
        if (
          controller.signal.aborted ||
          captionRequestIdRef.current !== requestId
        ) {
          return;
        }

        if (dims) {
          setResolvedCaptionDims(dims);
        }
        if (bytes && bytes > 0) {
          setResolvedCaptionBytes(bytes);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      controller.abort();
    };
  }, [focusedImage]);

  useEffect(() => {
    if (!onCaptionChange) {
      return;
    }
    if (!showImageCanvas || !focusedImage) {
      onCaptionChange(null);
      return;
    }
    onCaptionChange({
      fileName: captionFileName,
      metaLine: captionMetaLine,
    });
  }, [
    onCaptionChange,
    showImageCanvas,
    focusedImage,
    captionFileName,
    captionMetaLine,
  ]);

  return (
    <div className={contentClassName}>
      {showImageCanvas && focusedImage ? (
        <>
          <div className="metadata-image-canvas">
            {displayedImageSrc ? (
              <img
                className="metadata-image-real"
                src={displayedImageSrc}
                alt={`${focusedImagePackage?.displayName ?? t("ui.metadata.imageFallbackName")} #${focusedImage.ordinal}`}
                draggable={false}
              />
            ) : (
              <div className="metadata-image-placeholder" aria-hidden="true" />
            )}
          </div>
        </>
      ) : (
        <div className="metadata-editor-shell">
          <MetadataRatingGroup
            title={t("ui.metadata.packageRatingLabel")}
            data-tooltip-label={t("tip.common.rating")}
            groupAriaLabel={t("a11y.metadata.packageRating")}
            clearAriaLabel={t("a11y.metadata.clearPackageRating")}
            pending={metadataPending}
            value={currentGrade}
            onChange={onGradeChange}
          />

          {editable || focusedImagePackage ? (
            <div className="metadata-edit-grid mpx-scroll-area">
              {!editable ? (
                <>
                  <label>
                    <span>{t("ui.metadata.packageName")}</span>
                    <input
                      readOnly
                      value={focusedImagePackage?.packageName ?? "-"}
                    />
                  </label>

                  <details
                    className="metadata-preference-record"
                    data-slot="fg-meta-main-image-editor-preference-metrics-panel"
                  >
                    <summary>{t("ui.metadata.preferenceRecordTitle")}</summary>
                    <div className="metadata-preference-record-content">
                      <label>
                        <span>{t("ui.metadata.preferenceEventCount")}</span>
                        <input readOnly value={imageEventCount} />
                        <small
                          className="metadata-field-hint"
                          aria-hidden="true"
                        >
                          preference_metrics.event_count (read-only)
                        </small>
                      </label>

                      <label>
                        <span>{t("ui.metadata.preferencePagesRead")}</span>
                        <input readOnly value={imagePagesReadSummary} />
                        <small
                          className="metadata-field-hint"
                          aria-hidden="true"
                        >
                          preference_metrics.pages_read / total_pages
                          (read-only)
                        </small>
                      </label>

                      <label>
                        <span>
                          {t("ui.metadata.preferenceCompletionRatio")}
                        </span>
                        <input readOnly value={imageCompletionPercent} />
                        <small
                          className="metadata-field-hint"
                          aria-hidden="true"
                        >
                          preference_metrics.completion_ratio (read-only)
                        </small>
                      </label>

                      <label>
                        <span>{t("ui.metadata.preferenceLastEventAt")}</span>
                        <input readOnly value={imageLastEventTimeText} />
                        <small
                          className="metadata-field-hint"
                          aria-hidden="true"
                        >
                          preference_metrics.last_event_time_ms (read-only)
                        </small>
                      </label>
                    </div>
                  </details>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault();
                        copyResolvedTitle();
                      }}
                    >
                      {t("ui.metadata.workTitle")}
                    </span>
                    <div className="metadata-localized-field">
                      <p
                        className="metadata-localized-value"
                        onClick={(e) => e.preventDefault()}
                      >
                        {resolvedTitle}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn feature-action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!hasDualTitle) {
                            return;
                          }
                          setPreferTitleJpn((value) => !value);
                        }}
                      >
                        {titleToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault();
                        copyResolvedAuthor();
                      }}
                    >
                      {t("ui.metadata.author")}
                    </span>
                    <div className="metadata-localized-field">
                      <p
                        className="metadata-localized-value is-clickable"
                        onClick={(e) => {
                          e.preventDefault();
                          searchResolvedAuthor();
                        }}
                      >
                        {resolvedAuthor}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn feature-action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!hasDualAuthor) {
                            return;
                          }
                          setPreferAuthorJpn((value) => !value);
                        }}
                      >
                        {authorToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault();
                        copyResolvedGroup();
                      }}
                    >
                      {t("ui.metadata.circle")}
                    </span>
                    <div className="metadata-localized-field">
                      <p
                        className="metadata-localized-value is-clickable"
                        onClick={(e) => {
                          e.preventDefault();
                          searchResolvedGroup();
                        }}
                      >
                        {resolvedGroup}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn feature-action-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!hasDualGroup) {
                            return;
                          }
                          setPreferGroupJpn((value) => !value);
                        }}
                      >
                        {groupToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span>{t("ui.metadata.publishedAt")}</span>
                    <input readOnly value={parsedDraft.posted.trim() || "-"} />
                  </label>

                  <label>
                    <span>{t("ui.metadata.ratingFavorited")}</span>
                    <input readOnly value={ratingFavoritedDisplayValue} />
                  </label>

                  <label>
                    <span>{t("ui.metadata.parodyName")}</span>
                    <div className="metadata-tag-chip-list">
                      {parodyValues.length > 0
                        ? parodyValues.map((tag) => (
                            <button
                              key={`parody-${tag}`}
                              type="button"
                              onClick={() => onSearchByTag(tag)}
                            >
                              {tag}
                            </button>
                          ))
                        : "-"}
                    </div>
                  </label>

                  <label>
                    <span>{t("ui.metadata.characterName")}</span>
                    <div className="metadata-tag-chip-list">
                      {characterValues.length > 0
                        ? characterValues.map((tag) => (
                            <button
                              key={`character-${tag}`}
                              type="button"
                              onClick={() => onSearchByTag(tag)}
                            >
                              {tag}
                            </button>
                          ))
                        : "-"}
                    </div>
                  </label>

                  <label>
                    <span>{t("ui.metadata.tags")}</span>
                    <div className="metadata-tag-chip-list">
                      {readOnlyTags.length > 0
                        ? readOnlyTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => onSearchByTag(tag)}
                            >
                              {tag}
                            </button>
                          ))
                        : "-"}
                    </div>
                  </label>

                  <label>
                    <span>{t("ui.metadata.source")}</span>
                    <button
                      type="button"
                      disabled={!parsedDraft.sourceUrl.trim()}
                      onClick={openSourceInBrowser}
                    >
                      {sourceDisplayValue}
                    </button>
                  </label>
                </>
              ) : null}

              {editable ? (
                <>
                  <label>
                    <span>{t("ui.metadata.sourceSite")}</span>
                    <select
                      value={parsedDraft.sourceSite}
                      onChange={(event) => {
                        const sourceSite = toSourceSite(event.target.value);
                        void persistParsedPatch({ sourceSite });
                      }}
                    >
                      <option value="nhentai">
                        {t("ui.metadata.sourceSiteNhentai")}
                      </option>
                      <option value="ehentai">
                        {t("ui.metadata.sourceSiteEhentai")}
                      </option>
                      <option value="others">
                        {t("ui.metadata.sourceSiteOthers")}
                      </option>
                    </select>
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.source.site
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.sourceUrl")}</span>
                    <input
                      value={parsedDraft.sourceUrl}
                      onChange={(event) => {
                        const sourceUrl = event.target.value;
                        setParsedDraft((previous) => ({
                          ...previous,
                          sourceUrl,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        void persistParsedPatch({
                          sourceUrl: event.currentTarget.value,
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.source.url
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.japaneseTitle")}</span>
                    <input
                      value={parsedDraft.titleJpn}
                      onChange={(event) => {
                        const titleJpn = event.target.value;
                        setParsedDraft((previous) => ({
                          ...previous,
                          titleJpn,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        void persistParsedPatch({
                          titleJpn: event.currentTarget.value,
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.title_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.englishTitle")}</span>
                    <input
                      value={workTitleDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onWorkTitleDraftChange(nextValue);
                        setParsedDraft((previous) => ({
                          ...previous,
                          title: nextValue,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const value = event.currentTarget.value;
                        onSubmitPackageWorkTitle(value);
                        void persistParsedPatch({ title: value });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.title
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.seriesId")}</span>
                    <input
                      value={seriesIdDraft}
                      onChange={(event) => {
                        onSeriesIdDraftChange(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        onSubmitPackageSeriesId(event.currentTarget.value);
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      series_id
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.japaneseAuthor")}</span>
                    <input
                      value={parsedDraft.artistJpn}
                      onChange={(event) => {
                        const artistJpn = event.target.value;
                        setParsedDraft((previous) => ({
                          ...previous,
                          artistJpn,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        void persistParsedPatch({
                          artistJpn: event.currentTarget.value,
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.artist_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.englishAuthor")}</span>
                    <input
                      value={authorDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onAuthorDraftChange(nextValue);
                        setParsedDraft((previous) => ({
                          ...previous,
                          artist: nextValue,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const value = event.currentTarget.value;
                        onSubmitPackageAuthor(value);
                        void persistParsedPatch({ artist: value });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.artist
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.japaneseCircle")}</span>
                    <input
                      value={parsedDraft.groupJpn}
                      onChange={(event) => {
                        const groupJpn = event.target.value;
                        setParsedDraft((previous) => ({
                          ...previous,
                          groupJpn,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        void persistParsedPatch({
                          groupJpn: event.currentTarget.value,
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.group_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.englishCircle")}</span>
                    <input
                      aria-label={t("a11y.metadata.englishCircle")}
                      value={circleDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onCircleDraftChange(nextValue);
                        setParsedDraft((previous) => ({
                          ...previous,
                          group: nextValue,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const value = event.currentTarget.value;
                        onSubmitPackageCircle(value);
                        void persistParsedPatch({ group: value });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.group
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.publishedAt")}</span>
                    <input
                      value={parsedDraft.posted}
                      onChange={(event) => {
                        const posted = event.target.value;
                        setParsedDraft((previous) => ({
                          ...previous,
                          posted,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        void persistParsedPatch({
                          posted: event.currentTarget.value,
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.posted
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.evaluationReadOnly")}</span>
                    <input readOnly value={evaluationDisplayValue} />
                  </label>

                  <label>
                    <span>{t("ui.metadata.parody")}</span>
                    <input
                      value={editableParodyValue}
                      onChange={(event) => {
                        const nextTags = updateTagNamespace(
                          parsedTagMap,
                          "parody",
                          event.target.value,
                        );
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const nextTags = updateTagNamespace(
                          parsedTagMap,
                          "parody",
                          event.currentTarget.value,
                        );
                        void persistParsedPatch({
                          tagsJson: formatTagJson(nextTags),
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags.parody
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.character")}</span>
                    <input
                      value={editableCharacterValue}
                      onChange={(event) => {
                        const nextTags = updateTagNamespace(
                          parsedTagMap,
                          "character",
                          event.target.value,
                        );
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const nextTags = updateTagNamespace(
                          parsedTagMap,
                          "character",
                          event.currentTarget.value,
                        );
                        void persistParsedPatch({
                          tagsJson: formatTagJson(nextTags),
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags.character
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.tags")}</span>
                    <input
                      value={editableTagsValue}
                      onChange={(event) => {
                        const nextTags = updateSourceTagsBySite(
                          parsedTagMap,
                          parsedDraft.sourceSite,
                          event.target.value,
                        );
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const value = event.currentTarget.value;
                        onTagsDraftChange(value);
                        onSubmitPackageTags(value);
                        const nextTags = updateSourceTagsBySite(
                          parsedTagMap,
                          parsedDraft.sourceSite,
                          value,
                        );
                        void persistParsedPatch({
                          tagsJson: formatTagJson(nextTags),
                        });
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags
                    </small>
                  </label>

                  <label>
                    <span>{t("ui.metadata.sourceId")}</span>
                    <input
                      readOnly
                      value={parsedDraft.sourceId.trim() || "-"}
                    />
                  </label>

                  <label>
                    <span>{t("ui.metadata.sourceToken")}</span>
                    <input
                      readOnly
                      value={parsedDraft.sourceToken.trim() || "-"}
                    />
                  </label>

                  <label>
                    <span>{t("ui.metadata.coverUrl")}</span>
                    <input readOnly value={parsedDraft.thumb.trim() || "-"} />
                  </label>

                  {parsedError ? (
                    <p className="metadata-inline-error">{parsedError}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            <p className="metadata-empty-tip">
              {t("ui.metadata.noEditablePackage")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
