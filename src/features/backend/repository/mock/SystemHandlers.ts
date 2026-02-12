import {
  pickDirectoryPathResponseSchema,
  pickFilePathResponseSchema,
  pickImportPathsResponseSchema,
  readClipboardImportPathsResponseSchema,
  searchExternalMetadataResponseSchema,
  type PickDirectoryPathRequestDto,
  type PickDirectoryPathResponseDto,
  type PickFilePathRequestDto,
  type PickFilePathResponseDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type ReadClipboardImportPathsResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
} from '../../../../contracts/backend'
import { type MockRepositoryState } from './types'

export class MockSystemHandlers {
  constructor(private state: MockRepositoryState) {}

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    const val = localStorage.getItem(`mpx_mock_state_${request.state_key}`)
    return { state_json: val ?? request.fallback_json ?? 'null' }
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    localStorage.setItem(`mpx_mock_state_${request.state_key}`, request.state_json)
    return { updated_at_ms: Date.now() }
  }

  pickImportPathsSync(request: PickImportPathsRequestDto): PickImportPathsResponseDto {
    void request
    return pickImportPathsResponseSchema.parse({
      paths: [],
    })
  }

  pickFilePathSync(request: PickFilePathRequestDto): PickFilePathResponseDto {
    void request
    return pickFilePathResponseSchema.parse({
      canceled: true,
      path: null,
    })
  }

  pickDirectoryPathSync(request: PickDirectoryPathRequestDto): PickDirectoryPathResponseDto {
    void request
    return pickDirectoryPathResponseSchema.parse({
      canceled: true,
      path: null,
    })
  }

  readClipboardImportPathsSync(): ReadClipboardImportPathsResponseDto {
    return readClipboardImportPathsResponseSchema.parse({
      paths: [],
    })
  }

  searchExternalMetadataSync(
    request: SearchExternalMetadataRequestDto,
  ): SearchExternalMetadataResponseDto {
    const text = request.input_text?.trim() || request.input_id?.trim() || ''
    if (!text) {
      return searchExternalMetadataResponseSchema.parse({ items: [] })
    }

    const mockItem = {
      source: request.source ?? 'nhentai',
      id: request.input_id?.trim() || '114514',
      title: text,
      title_original: null,
      cover: null,
      url: 'https://example.com/mock-metadata',
      token: request.source === 'ehentai' ? 'mocktoken' : '',
      tags: ['language:chinese', 'parody:original'],
      pages: 1,
      posted: null,
      rating: null,
      favorited: null,
      raw: {
        mock: true,
        input_text: request.input_text ?? '',
        input_id: request.input_id ?? '',
      },
    }

    return searchExternalMetadataResponseSchema.parse({
      items: [mockItem],
    })
  }
}
