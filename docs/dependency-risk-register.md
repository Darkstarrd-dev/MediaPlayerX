# Dependency Risk Register

Last updated: 2026-02-18

## Scope

- Source: `npm audit --audit-level=moderate --json`
- Current summary: `moderate=10`, `high=0`, `critical=0`
- CI enforcement baseline: block only `high/critical` via `npm audit --audit-level=high`

## Accepted Risks

| Risk ID | Package chain | Severity | Current status | Mitigation | Next review |
|---|---|---|---|---|---|
| DEP-2026-001 | `eslint -> @eslint/eslintrc -> ajv` | moderate | Accepted (temporary) | Keep `eslint` on v9 for CI compatibility; monitor upstream for peer-compatible upgrade path | 2026-03-15 |
| DEP-2026-002 | `eslint -> @eslint-community/eslint-utils` | moderate | Accepted (temporary) | Track `eslint` and `@eslint/js` major upgrade window once react-hooks peer range supports it | 2026-03-15 |
| DEP-2026-003 | `typescript-eslint` toolchain linked to `eslint` chain | moderate | Accepted (temporary) | Keep `typescript-eslint` at latest compatible minor (`8.56.0`) and re-evaluate with eslint ecosystem updates | 2026-03-15 |
| DEP-2026-004 | `eslint-plugin-react-refresh` via eslint advisory chain | moderate | Accepted (temporary) | Excluded from review KPI together with eslint ecosystem until upstream compatibility unblocks | 2026-03-15 |

## KPI Policy

- For current evaluation cycle, `eslint/@eslint-js/eslint-plugin-react-refresh` are excluded from dependency-upgrade KPIs.
- Exclusion does **not** downgrade CI safety gate: `high/critical` vulnerabilities remain blocking.
