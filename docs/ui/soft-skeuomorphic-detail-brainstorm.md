# Soft Skeuomorphic Detail Brainstorm (Strong Alignment)

Scope: keep the current pane alignment and layout structure unchanged, only explore detail-level style differences.

## Constraints

- No structural layout changes.
- No floating offsets between sidebar/main/metadata panes.
- Keep splitter behavior and panel proportions unchanged.

## Candidate Styles

1. `soft-skeuomorphic-crisp`
   - Tighter geometry, clearer edge contrast.
   - Stronger border readability and compact elevation.

2. `soft-skeuomorphic-plush`
   - Softer and more cushioned depth.
   - Wider radius and lighter shadows.

3. `soft-skeuomorphic-etched`
   - More carved/pressed interaction feel.
   - Deeper active inset and stronger edge definition.

## Implementation Notes

- Shared soft-skeuomorphic component rules are now matched by `data-mpx-style^="soft-skeuomorphic"`.
- Variant files only override token values to keep maintenance cost low.
- Variants are restricted to `skeuomorphic-light` and `skeuomorphic-dark` in theme registry.

## Quick Capture Command

```bash
npm run theme:gallery -- \
  --styles "soft-skeuomorphic,soft-skeuomorphic-crisp,soft-skeuomorphic-plush,soft-skeuomorphic-etched" \
  --palettes "skeuomorphic-light,skeuomorphic-dark" \
  --scenes "image-default,image-manage,image-metadata,settings-layout" \
  --out-dir "docs/ui/theme-gallery"
```
