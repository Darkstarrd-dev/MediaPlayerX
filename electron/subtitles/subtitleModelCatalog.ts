import type { SubtitleRemoteModelDto } from '../../src/contracts/backend'

export const SUBTITLE_REMOTE_MODEL_CATALOG: SubtitleRemoteModelDto[] = [
  {
    id: 'sensevoice-small-int8-2024-07-17',
    label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue) 2024-07-17',
    description: '通用多语言离线 ASR 模型（固定默认）',
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
]
