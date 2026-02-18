# UI Copy Review Checklist

## Objectives

- Keep tone consistent across `ui.*`, `a11y.*`, and `tip.*`.
- Eliminate hardcoded literals in non-test UI files.
- Ensure error messages are actionable and code-aware.

## Consistency Rules

- Same action uses same verb in all panels (e.g. delete/remove/clear are not mixed).
- Same domain term uses one canonical label (e.g. package, playlist, subtitle).
- Busy states use consistent suffix/pattern (e.g. `...`, `Saving`, `检测中`).
- Count summaries use consistent placeholder order and style.

## Error Message Rules

- Prefer deterministic message templates over raw backend text.
- Preserve backend code as `Error code {{code}}` when available.
- Avoid leaking stack traces, SQL text, or internal file paths.
- Provide operation context (`load/save/delete`) in each failure message.

## Localization Rules

- All user-visible text must be keyed in locale catalogs.
- `zh-CN` and `en-US` keys must remain 1:1.
- No mixed-language sentence unless term is intentionally technical.
- `a11y.*` labels should be concise and pronounceable.

## Review Workflow

1. Run `npm run i18n:check`.
2. Diff scan non-test files for new literals.
3. Validate critical flows in both locales:
   - metadata fetch/save
   - manage actions (hide/move/group/delete)
   - settings diagnostics/runtime paths
   - subtitle load/select/resolve
4. Record copy issues and affected keys in PR notes.

## Sign-off

- [ ] No new hardcoded user-facing literals
- [ ] Error copy follows code-tag policy
- [ ] `zh-CN` / `en-US` parity confirmed
- [ ] Product wording review completed
