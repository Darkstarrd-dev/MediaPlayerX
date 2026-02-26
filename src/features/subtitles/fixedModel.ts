export const SUBTITLE_MODEL_CURRENT_ID = 'sensevoice-small-int8-2024-07-17'
export const SUBTITLE_MODEL_FUNASR_NANO_ID = 'funasr-nano-int8-2025-12-30'

export type SubtitleModelSelectionId =
  | typeof SUBTITLE_MODEL_CURRENT_ID
  | typeof SUBTITLE_MODEL_FUNASR_NANO_ID

export interface SubtitleModelSelectionProfile {
  id: SubtitleModelSelectionId
  label: string
  languageCodes: string[]
  sizeBytes: number
  homepageUrl: string
  downloadSupported: boolean
}

export const SUBTITLE_MODEL_SELECTION_PROFILES: SubtitleModelSelectionProfile[] = [
  {
    id: SUBTITLE_MODEL_CURRENT_ID,
    label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue) 2024-07-17',
    languageCodes: ['zh', 'en', 'ja', 'ko', 'yue'],
    sizeBytes: 236_000_000,
    homepageUrl:
      'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17',
    downloadSupported: true,
  },
  {
    id: SUBTITLE_MODEL_FUNASR_NANO_ID,
    label: 'FunASR Nano INT8 (zh/en/ja/ko/yue) 2025-12-30',
    languageCodes: ['zh', 'en', 'ja', 'ko', 'yue'],
    sizeBytes: 950_000_000,
    homepageUrl:
      'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-funasr-nano-int8-2025-12-30.tar.bz2',
    downloadSupported: false,
  },
]

export const DEFAULT_SUBTITLE_MODEL_SELECTION_ID = SUBTITLE_MODEL_CURRENT_ID

export function normalizeSubtitleModelSelectionId(
  value: string | null | undefined,
): SubtitleModelSelectionId {
  const normalized = (value ?? '').trim()
  if (normalized === SUBTITLE_MODEL_FUNASR_NANO_ID) {
    return SUBTITLE_MODEL_FUNASR_NANO_ID
  }
  return SUBTITLE_MODEL_CURRENT_ID
}

export function getSubtitleModelSelectionProfile(
  id: SubtitleModelSelectionId,
): SubtitleModelSelectionProfile {
  return (
    SUBTITLE_MODEL_SELECTION_PROFILES.find((item) => item.id === id)
    ?? SUBTITLE_MODEL_SELECTION_PROFILES[0]
  )
}

export const FIXED_SUBTITLE_MODEL_ID = SUBTITLE_MODEL_CURRENT_ID

export const FIXED_SUBTITLE_MODEL_URL =
  getSubtitleModelSelectionProfile(SUBTITLE_MODEL_CURRENT_ID).homepageUrl
