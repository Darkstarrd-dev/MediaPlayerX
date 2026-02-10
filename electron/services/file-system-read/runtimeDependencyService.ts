import {
  readRuntimeCapabilitiesResponseSchema,
  type ReadRuntimeCapabilitiesResponseDto,
} from '../../../src/contracts/backend'
import { readArchiveWasmSupport } from '../../archiveWasmExtractor'
import { checkCommandAvailability, getSharpModule } from '../../fileSystemRuntimeHelpers'

export interface RuntimeDependencySnapshot {
  sharp: boolean
  ffmpeg: boolean
  ffprobe: boolean
  sevenZip: boolean
  powershell: boolean
  checkedAtMs: number
}

export class RuntimeDependencyService {
  private runtimeDependencySnapshot: RuntimeDependencySnapshot | null = null

  private runtimeDependencyLoadingPromise: Promise<RuntimeDependencySnapshot> | null = null

  constructor(
    private readonly ffmpegBin: string,
    private readonly ffprobeBin: string,
  ) {}

  private async loadRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    const [sharpModule, ffmpeg, ffprobe, archiveWasm, powershell] = await Promise.all([
      getSharpModule(),
      checkCommandAvailability(this.ffmpegBin, ['-version']),
      checkCommandAvailability(this.ffprobeBin, ['-version']),
      readArchiveWasmSupport(),
      checkCommandAvailability('powershell.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']),
    ])

    return {
      sharp: Boolean(sharpModule?.default),
      ffmpeg,
      ffprobe,
      sevenZip: Boolean(sharpModule?.default) && archiveWasm.rar && archiveWasm.sevenZip,
      powershell,
      checkedAtMs: Date.now(),
    }
  }

  async ensureRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    if (this.runtimeDependencySnapshot) {
      return this.runtimeDependencySnapshot
    }

    if (!this.runtimeDependencyLoadingPromise) {
      this.runtimeDependencyLoadingPromise = this.loadRuntimeDependencies().finally(() => {
        this.runtimeDependencyLoadingPromise = null
      })
    }

    this.runtimeDependencySnapshot = await this.runtimeDependencyLoadingPromise
    return this.runtimeDependencySnapshot
  }

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    const dependencies = await this.ensureRuntimeDependencies()

    return readRuntimeCapabilitiesResponseSchema.parse({
      dependencies: {
        sharp: dependencies.sharp,
        ffmpeg: dependencies.ffmpeg,
        ffprobe: dependencies.ffprobe,
        seven_zip: dependencies.sevenZip,
        powershell: dependencies.powershell,
      },
      strategies: {
        thumbnail: dependencies.sharp ? 'sharp-webp-cache' : 'original-fallback',
        video_probe: dependencies.ffprobe ? 'ffprobe' : 'metadata-fallback',
        video_cover: dependencies.ffmpeg ? 'ffmpeg' : 'color-only-fallback',
        archive_rar_7z: dependencies.sevenZip ? 'normalize-to-zip-store' : 'skip-unsupported',
        archive_zip_repack:
          dependencies.ffmpeg && dependencies.powershell ? 'repack-webp-store' : 'safe-entry-fallback',
      },
      minimum_matrix: [
        {
          capability: '基础浏览（文件系统图片/视频）',
          status: 'available',
          note: '无需外部依赖，默认可用',
        },
        {
          capability: '缩略图缓存（Sharp WebP）',
          status: dependencies.sharp ? 'available' : 'degraded',
          note: dependencies.sharp ? 'Sharp 可用，启用 thumbnail 变体缓存' : 'Sharp 缺失，自动回退 original 变体',
        },
        {
          capability: '视频元数据探测（ffprobe）',
          status: dependencies.ffprobe ? 'available' : 'degraded',
          note: dependencies.ffprobe ? 'ffprobe 可用，读取真实时长与分辨率' : 'ffprobe 缺失，使用默认时长与分辨率',
        },
        {
          capability: '视频封面抓取（ffmpeg）',
          status: dependencies.ffmpeg ? 'available' : 'degraded',
          note: dependencies.ffmpeg ? 'ffmpeg 可用，支持 Save as cover 真实截帧' : 'ffmpeg 缺失，仅保留封面颜色写入',
        },
        {
          capability: 'rar/7z 归一化',
          status: dependencies.sevenZip ? 'available' : 'unavailable',
          note: dependencies.sevenZip ? 'WASM 解包器 + Sharp 可用，归一化为 zip(store)' : 'WASM 解包器或 Sharp 不可用，rar/7z 图包被跳过并记录告警',
        },
        {
          capability: 'zip 非 store/deflate 重处理',
          status: dependencies.ffmpeg && dependencies.powershell ? 'available' : 'degraded',
          note:
            dependencies.ffmpeg && dependencies.powershell
              ? 'ffmpeg + powershell 可用，执行 webp90 重打包'
              : '依赖不足，回退 safe-entry 模式，仅加载可直接读取条目',
        },
      ],
      generated_at_ms: Date.now(),
    })
  }
}
