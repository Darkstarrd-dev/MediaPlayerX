# MediaPlayer Interaction Spec V1.5

## Primary layout

- Root layout: `Header + Sidebar + Main`.
- Header, Sidebar, and Main proportions are user-adjustable.
- Main contains:
  - paged content area
  - metadata panel (collapsible)
  - footer for focused item details

## Header controls

- Logo acts as import trigger.
- Unified import action supports files, folders, and mixed selection.
- Mode switch: image mode vs video mode.
- Vector mode toggle.
- Metadata feature filters.
- Grade control for focused image.
- Thumbnail zoom control.
- Auto-play toggle and interval presets.
- Settings entry.

## Sidebar behavior

### Image mode

- Show hierarchical roots, folders, and archive nodes.
- Do not show image file leaves.
- Allow setting any node as `Current Root` for scoped navigation.

### Video mode

- Show hierarchical roots, folders, and video file leaves.
- Each video leaf has a toggle for fullscreen playlist inclusion.
- Playlist is global across entire library.

## Main behavior

### Image mode

- Paged thumbnail grid, not infinite scroll.
- Supports thumbnail mode and filename-only mode.
- Focus by click or keyboard navigation.
- Metadata panel updates with focused item.

### Video mode

- Preview panel with playback controls.
- Includes `Save as cover` button for manual cover selection.
- Metadata panel can switch between:
  - video metadata view
  - playlist management view

### Footer

- Always reflects focused item details.
- Includes path details, size, and resolution.
- Zip image path format: `absolute_zip_path + ordinal`.

## Playlist interactions

- Playlist can be reordered by drag-and-drop.
- Playlist items can be removed directly.
- Removal syncs corresponding sidebar toggle to off.
- If currently playing item is removed, switch to next available item.

## Fullscreen mode

- Enter by Enter or double-click on focused item.
- Toggle fullscreen by `F11`.
- Footer appears when pointer enters bottom 20% area.
- Display mode switches:
  - dual display
  - video only
  - image only

## Keyboard controls

### Global and image browsing

- `Left/Right`: previous or next image.
- `Up/Down`: first or last image.
- `Ctrl+Left/Right`: previous or next package.
- `A`: start or stop auto-play.
- `1/2/3/4/5`: set auto-play interval to `1/2/3/5/8` seconds.
- `Alt+0..5` or numpad `0..5`: set rating where `0 => null`.
- `Tab` in windowed mode: switch keyboard focus between Sidebar and Main.

### Video controls

- Active only in fullscreen video or dual-display with video focus.
- `Space`: play or pause.
- `PageUp/PageDown`: previous or next playlist video.
- `Ctrl+PageUp/PageDown`: decrease or increase playback speed.
- `Home/End`: decrease or increase volume.

## Shortcut customization

- All shortcuts are editable in Settings.
- Save-time conflict detection applies by scope.
- Default profile can be restored in one action.

## Settings overlay

- Opens as a centered panel at about 80% workspace size.
- Background content remains visible with light blur.
- All numeric, API, vector, and UI behavior settings are managed here.
