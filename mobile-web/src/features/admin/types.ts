import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@burma-inventory/shared-types';
import type { useTranslation } from '../../core/i18n/i18n';

/** Valid i18n key accepted by the translation function. */
export type TranslationKey = Parameters<
  ReturnType<typeof useTranslation>['t']
>[0];

/**
 * Single source of truth for the admin (Leadership Oversight) data shapes.
 * Derived directly from the tRPC AppRouter so they stay in lockstep with the
 * server contract instead of being hand-redeclared per component.
 */
type AdminRouterOutputs = inferRouterOutputs<AppRouter>;

export type SyncAuditLog = AdminRouterOutputs['getSyncLogs']['logs'][number];

export type QuotaOptimization =
  AdminRouterOutputs['quotaOptimizations'][number];

export type EodDigest = AdminRouterOutputs['eodDigest'];

/** Shape returned by the REST `POST /sync/import-odoo` endpoint. */
export interface OdooImportResult {
  success: boolean;
  importedCount?: number;
  warnings?: string[];
  error?: string;
}

export const OVERSIGHT_TAB = {
  OVERSIGHT: 'oversight',
  HITL: 'hitl',
  DLQ: 'dlq',
  APPROVALS: 'approvals',
  RECONCILIATION: 'reconciliation',
} as const;

export type OversightTab = (typeof OVERSIGHT_TAB)[keyof typeof OVERSIGHT_TAB];
