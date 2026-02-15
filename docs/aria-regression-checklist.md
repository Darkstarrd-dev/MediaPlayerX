# ARIA Regression Checklist

## Scope

- Routes: main shell, settings panel, metadata panel, management panel, fullscreen layer.
- Inputs: keyboard only, mouse, screen reader (NVDA/VoiceOver at minimum one).
- Locales: `zh-CN`, `en-US`.

## Global Checks

- Dialogs have `role="dialog"`, `aria-modal="true"`, and valid accessible name.
- Icon buttons have localized `aria-label` and `title` bindings.
- Dynamic status regions use `aria-live` and are not overly noisy.
- All separators/sliders expose proper `aria-orientation` and current value where needed.
- No duplicate interactive labels in the same control group without disambiguation.

## Keyboard Checks

- `Tab` order follows visual flow and does not trap unexpectedly.
- `Escape` closes active overlays in correct priority (top-most first).
- `Enter`/`Space` activate all button-like controls.
- Focus restoration is correct after closing dialogs/popovers.
- Manage mode and fullscreen hotkeys do not break form inputs.

## Panel Checks

### Header

- Mode switch group label is localized and announced once.
- Window control buttons expose distinct localized labels.
- Autoplay/scale popovers announce open state and inner controls.

### Sidebar/Main

- Expand/collapse actions are keyboard accessible.
- Page navigation controls announce current page summary.
- Manage action short buttons still have full descriptive aria labels.

### Metadata

- Source switch (`NH/EH/ALL`) has localized control name.
- Rating stars have localized accessible labels for each value.
- Fetch/parse/save buttons expose localized busy states.

### Settings

- Section tabs and dialogs announce localized names.
- Runtime diagnostics and backend error blocks are screen-reader readable.
- Vision model test/save actions expose pending/failed/success states.

### Fullscreen / Media

- Play/pause/next/prev/mute/fullscreen controls are localized in aria.
- Subtitle toggle and playlist controls announce current state.
- Dual-mode split handle is keyboard reachable and labelled.

## Error Accessibility Checks

- Error banner text is localized and deterministic (no raw stack traces).
- If backend returns coded errors, UI displays stable code tag format.
- Error updates in live regions are concise and non-duplicated.

## Sign-off

- [ ] `zh-CN` pass
- [ ] `en-US` pass
- [ ] Keyboard-only pass
- [ ] Screen reader pass
- [ ] No high-severity aria regressions
