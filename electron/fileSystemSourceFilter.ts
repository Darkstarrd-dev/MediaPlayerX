import type {
  ImagePackageDto,
  LibrarySnapshotDto,
  ReadImageSidebarTreeRequestDto,
} from '../src/contracts/backend'
import { matchesFeatureFilter, normalizeFeatureFilter } from './fileSystemServiceHelpers'

export function filterSources(
  snapshot: LibrarySnapshotDto | null,
  request: Pick<ReadImageSidebarTreeRequestDto, 'feature_filter' | 'grade_overrides'>,
): {
  imagePackages: ImagePackageDto[]
  imageDirectories: ImagePackageDto[]
} {
  if (!snapshot) {
    return {
      imagePackages: [],
      imageDirectories: [],
    }
  }

  const normalizedFilter = normalizeFeatureFilter(request.feature_filter)

  return {
    imagePackages: snapshot.image_packages.filter((source) =>
      matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
    ),
    imageDirectories: snapshot.image_directories.filter((source) =>
      matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
    ),
  }
}
