# MediaPlayer Architecture V1

## Design principles

- Local-first data ownership.
- High cohesion and strict module boundaries.
- IPC contracts validated with Zod.
- Long-running tasks offloaded to workers.
- Database pressure minimized for archive internals.

## Runtime layers

### Electron main process

- Window lifecycle and app shell.
- Native dialogs and clipboard path intake.
- Filesystem watch orchestration.
- Task queue scheduling and execution supervision.
- IPC routing and permission boundary.

### Preload bridge

- Exposes only allowlisted API surface.
- Validates inputs and outputs against shared contracts.
- Prevents direct Node API reachability from renderer.

### Renderer (React)

- Header, Sidebar tree, Main grid/preview, metadata panel, settings overlay, fullscreen footer.
- Mode switching: image mode and video mode.
- Vector mode container and result controls.
- State handled with Zustand slices.

### Worker services

- Scanner worker: recursive discovery, archive detection, change checks.
- Thumbnail worker: Sharp pipeline with configurable params.
- Vector worker: batching and LM Studio embedding calls.
- Archive maintenance worker: convert/repack/rename/reorder tasks.
- Video worker: metadata extraction and manual cover update persistence.

## Module boundaries

- `contracts`: Zod schemas and typed IPC request/response.
- `domain`: pure business rules and use cases.
- `infra`: filesystem, SQLite, LanceDB, LM Studio adapter, watcher adapter.
- `ui`: React screens/components and UI-only state.

No module reads another module internals directly; all crossing happens through interface contracts.

## Data model strategy

### SQLite responsibilities

- Source roots and watch settings.
- Package/archive level metadata.
- Item-level stable identifiers and display state.
- User curation fields (`grade`, display names, manual metadata).
- Task state and operation logs.

### LanceDB responsibilities

- Image-level vectors.
- Similarity search and candidate recall.

### Archive internal names policy

- Avoid relying on zip internal file names for core browsing.
- Use stable item identity and ordinal-based navigation.
- Footer path display for zip images uses absolute zip path plus ordinal.

## Task orchestration

- All heavy operations are asynchronous jobs with states:
  - pending
  - running
  - paused
  - completed
  - failed
  - cancelled
- Jobs support resume and retry.
- Queue concurrency and batch parameters are configurable.

## Safety constraints

- Path normalization and traversal protections.
- Zip handling with guardrails for malformed archives.
- Explicit user confirmation for physical file mutations.
- No silent destructive mutation.

## Test strategy alignment

- Unit tests for domain rules, path handling, scheduling, and schema validations.
- Component tests for major UI panels and mode transitions.
- Integration tests for SQLite + LanceDB + filesystem workflow.
- E2E remains user-executed via scripted checklist.
