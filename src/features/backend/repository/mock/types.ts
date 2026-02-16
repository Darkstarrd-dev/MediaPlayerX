import type {
  LibrarySnapshotDto,
  ImportTaskDto,
  ManageAdReviewTaskDto,
  ManageCoverReviewTaskDto,
} from '../../../../contracts/backend'

export interface MockRepositoryState {
  playlistIds: string[]
  importTasks: ImportTaskDto[]
  manageAdReviewTasks: Map<string, ManageAdReviewTaskDto>
  manageCoverReviewTasks: Map<string, ManageCoverReviewTaskDto>
  appStates: Map<string, string>
  sourceCoverImageUrlBySourceId: Record<string, string>
}

export const MOCK_LIBRARY_SNAPSHOT_REF: { current: LibrarySnapshotDto | null } = {
  current: null,
}
