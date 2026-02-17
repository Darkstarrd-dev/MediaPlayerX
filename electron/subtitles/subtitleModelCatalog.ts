import type { SubtitleRemoteModelDto } from '../../src/contracts/backend'

export const SUBTITLE_REMOTE_MODEL_CATALOG: SubtitleRemoteModelDto[] = [
  {
    id: 'sensevoice-small-int8-2024-07-17',
    label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue) 2024-07-17',
    description: '通用多语言离线 ASR 模型（中英日韩粤语平衡）',
    language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
    size_bytes: 236_000_000,
    version: '2024-07-17',
    artifacts: [
      {
        relative_path: 'model.int8.onnx',
        url: 'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/model.int8.onnx',
      },
      {
        relative_path: 'tokens.txt',
        url: 'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/tokens.txt',
      },
    ],
  },
  {
    id: 'sensevoice-small-int8-2025-01',
    label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue) 2025-09-09',
    description: '粤语增强离线 ASR 模型（粤语优先，其他语言可能退化）',
    language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
    size_bytes: 186_000_000,
    version: '2025-09-09',
    artifacts: [
      {
        relative_path: 'model.int8.onnx',
        url: 'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/resolve/main/model.int8.onnx',
      },
      {
        relative_path: 'tokens.txt',
        url: 'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/resolve/main/tokens.txt',
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
