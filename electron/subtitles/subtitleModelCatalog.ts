import type { SubtitleRemoteModelDto } from '../../src/contracts/backend'

export const SUBTITLE_REMOTE_MODEL_CATALOG: SubtitleRemoteModelDto[] = [
  {
    id: 'sensevoice-small-int8-2025-01',
    label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue)',
    description: '通用多语言离线 ASR 模型（推荐）',
    language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
    size_bytes: 186_000_000,
    version: '2025-01',
    artifacts: [
      {
        relative_path: 'model.int8.onnx',
        url: 'https://huggingface.co/k2-fsa/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-01-06/resolve/main/model.int8.onnx',
      },
      {
        relative_path: 'tokens.txt',
        url: 'https://huggingface.co/k2-fsa/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-01-06/resolve/main/tokens.txt',
      },
    ],
  },
  {
    id: 'sensevoice-small-fp32-2025-01',
    label: 'SenseVoice Small FP32 (zh/en/ja/ko/yue)',
    description: '高精度多语言离线 ASR 模型（体积更大）',
    language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
    size_bytes: 740_000_000,
    version: '2025-01',
    artifacts: [
      {
        relative_path: 'model.onnx',
        url: 'https://huggingface.co/k2-fsa/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-01-06/resolve/main/model.onnx',
      },
      {
        relative_path: 'tokens.txt',
        url: 'https://huggingface.co/k2-fsa/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-01-06/resolve/main/tokens.txt',
      },
    ],
  },
]
