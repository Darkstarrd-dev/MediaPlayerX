# MediaPlayer V1 Requirements Freeze

## Product goal

Build a local-first media browser for images and videos with strong scalability, modularity, and testability.

## Tech stack

- Desktop: Electron + Node.js
- UI: Vite + React
- State: Zustand
- Safety: TypeScript + Zod
- Tests: Vitest (unit + component), with user-guided E2E scripts
- Metadata and runtime DB: SQLite
- Vector DB: LanceDB
- Embedding endpoint: LM Studio (configurable)

## Supported platforms and storage

- Primary platform: Windows.
- Ingest from local disks.
- Removable disks can be temporarily browsed, but are not persisted into the database.

## Ingestion and update behavior

### Accepted input forms

- Single image or video file.
- Multiple image or video files.
- Single folder (recursive scan for media and compressed archives).
- Multiple folders (recursive).
- Mixed file + folder selection.

### Input channels

- Drag and drop into app.
- Native file picker from app.
- Clipboard paste of file paths.

### Archive behavior

- Core archive format is `zip`.
- If source is `rar` or `7z`, convert to standard storage `zip` through task pipeline.
- Keep monitoring indexed roots for newly added zip files.
- Detect zip changes by `size/mtime/hash` and trigger update or removal.

## Thumbnail rules

- Generate with Sharp.
- Output format: WebP.
- Default quality: `40`.
- Default max edge: `512` px.
- All thumbnail parameters are configurable in Settings.

## Search and retrieval

- Text retrieval over file/package names and metadata fields.
- Full image-level vector retrieval (not package-level only).
- Similarity threshold is user-adjustable.
- Vector mode is off by default.

## Embedding policy

- Embedding model is not hard-coded.
- Use LM Studio endpoint defaults first; all related parameters are configurable.
- Single active model policy for V1.
- If model changes, vector index is rebuilt.

## Metadata and manual curation

- Metadata fields include placeholders for:
  - `work_title`
  - `language`
  - `circle`
  - `author`
  - `tags`
- Image metadata includes `grade` in range `0..5`, default `null`.
- AI metadata enrichment is reserved by schema and workflow; external retrieval logic is deferred.

## Rename and file mutation policy

- Physical rename sync is optional.
- Physical rename sync scope:
  - Package file names.
  - Folder names.
- Zip internal file rename is treated as an organization tool only.
- Zip internal rename/reorder does not affect core business semantics.

## Removal and conflict policy

- If file is missing on disk, auto-remove from DB index.
- User-initiated remove from DB can optionally delete physical file.
- On rare conflict, prompt user to choose:
  - Replace existing
  - Keep both by renaming

## UI-specific behavior

- Sidebar shows folder/package tree in image mode.
- Sidebar shows folder/video-leaf tree in video mode.
- Main footer shows focused item details:
  - For zip image: `zip absolute path + ordinal`
  - File size
  - Resolution

## Video mode notes

- Video mode uses video files as sidebar leaves.
- Sidebar leaves contain a toggle to include/exclude item from fullscreen playlist.
- Playlist is global for the whole library (not per current root).
- Playlist can be viewed in metadata panel, reordered by drag-and-drop, and item-deleted.
- Deleting from playlist syncs toggle state in sidebar.
- Preview controls include `Save as cover` for manual cover assignment.

## Fullscreen behavior

- Enter by double-click or Enter, toggle by `F11`.
- No permanent chrome; footer appears when pointer reaches bottom 20% area.
- Footer supports display mode switch:
  - Dual display
  - Video only
  - Image only
- In dual mode, image and video regions are both visible and resizable.

## Delivery strategy

- Prioritize architecture and interaction implementation.
- Defer heavy I/O benchmarking to relevant implementation phases.
