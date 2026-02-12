import type {
  LibrarySnapshotDto,
  ImportTaskDto,
  ManageAdReviewTaskDto,
} from '../../../../contracts/backend'

export interface MockRepositoryState {
  playlistIds: string[]
  importTasks: ImportTaskDto[]
  manageAdReviewTasks: Map<string, ManageAdReviewTaskDto>
  appStates: Map<string, string>
  sourceCoverImageUrlBySourceId: Record<string, string>
}

export const MOCK_LIBRARY_SNAPSHOT_REF: { current: LibrarySnapshotDto | null } = {
  current: null,
}
