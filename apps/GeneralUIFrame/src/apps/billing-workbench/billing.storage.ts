import { DEFAULT_BILLING_CONFIG, type BillingConfigState, type BillingWorkspaceState } from './types'

const BILLING_WORKSPACE_STORAGE_KEY = 'general-ui-frame.billing-workbench.v1'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim()
  if (normalized.length === 0) {
    return fallback
  }
  return normalized.slice(0, maxLength)
}

function asLongText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback
  }
  return value.slice(0, maxLength)
}

function asHeaderRow(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return Math.floor(clamp(value, 1, 1000))
}

function normalizeBillingConfig(input: unknown): BillingConfigState {
  if (!input || typeof input !== 'object') {
    return DEFAULT_BILLING_CONFIG
  }

  const raw = input as Partial<BillingConfigState>

  return {
    headerRow: asHeaderRow(raw.headerRow, DEFAULT_BILLING_CONFIG.headerRow),
    newSheetName: asText(raw.newSheetName, DEFAULT_BILLING_CONFIG.newSheetName, 64),
    expenseCol: asText(raw.expenseCol, DEFAULT_BILLING_CONFIG.expenseCol, 64),
    expenseKey: asText(raw.expenseKey, DEFAULT_BILLING_CONFIG.expenseKey, 64),
    amountCol: asText(raw.amountCol, DEFAULT_BILLING_CONFIG.amountCol, 64),
    exclusionCol: asText(raw.exclusionCol, DEFAULT_BILLING_CONFIG.exclusionCol, 64),
    colsToKeepText: asLongText(raw.colsToKeepText, DEFAULT_BILLING_CONFIG.colsToKeepText, 1024),
    colWidthsText: asLongText(raw.colWidthsText, DEFAULT_BILLING_CONFIG.colWidthsText, 512),
    exclusionListText: asLongText(raw.exclusionListText, DEFAULT_BILLING_CONFIG.exclusionListText, 4096),
  }
}

export function loadBillingWorkspaceState(): BillingWorkspaceState {
  try {
    const raw = window.localStorage.getItem(BILLING_WORKSPACE_STORAGE_KEY)
    if (!raw) {
      return { config: DEFAULT_BILLING_CONFIG }
    }
    const parsed = JSON.parse(raw) as Partial<BillingWorkspaceState>
    return {
      config: normalizeBillingConfig(parsed.config),
    }
  } catch {
    return { config: DEFAULT_BILLING_CONFIG }
  }
}

export function persistBillingWorkspaceState(state: BillingWorkspaceState): void {
  try {
    window.localStorage.setItem(BILLING_WORKSPACE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write failures in strict browser contexts
  }
}
