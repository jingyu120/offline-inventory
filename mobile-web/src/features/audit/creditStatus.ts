import { InvoiceRow } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OVERDUE_BLOCK_THRESHOLD_DAYS = 30;

/**
 * Determine whether a shop's account is blocked based on its outstanding,
 * unpaid invoices. An account is blocked when the total outstanding balance
 * exceeds the shop's credit limit, or when any invoice is overdue (past its
 * due date plus grace period) by at least the overdue threshold.
 */
export function computeBlockedStatus(
  outstandingInvoices: InvoiceRow[],
  creditLimitMmk: number,
  now: number = Date.now(),
): boolean {
  let totalOutstanding = 0;
  let maxOverdueDays = 0;

  for (const invoice of outstandingInvoices) {
    totalOutstanding += invoice.amount;
    const effectiveDue =
      invoice.due_date + invoice.grace_period_days * MS_PER_DAY;
    if (now > effectiveDue) {
      const agingDays = Math.floor((now - effectiveDue) / MS_PER_DAY);
      if (agingDays > maxOverdueDays) {
        maxOverdueDays = agingDays;
      }
    }
  }

  const creditExceeded = totalOutstanding > creditLimitMmk;
  const overdueExceeded = maxOverdueDays >= OVERDUE_BLOCK_THRESHOLD_DAYS;
  return creditExceeded || overdueExceeded;
}
