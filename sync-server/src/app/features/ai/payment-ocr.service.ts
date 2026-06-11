import { Logger } from '@nestjs/common';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, or, asc } from 'drizzle-orm';
import { DrizzleService } from '../../core/drizzle';
import { ModelDispatcherService } from './model-dispatcher.service';

export interface PaymentTransferResult {
  transactionId: string | null;
  amount: number | null;
  timestamp: string | null;
  senderName: string | null;
  rawText: string;
  confidence: 'HIGH' | 'LOW' | 'FAILED';
}

export interface ReconciledInvoice {
  invoiceId: string;
  amountApplied: number;
  newState: string;
}

export interface FifoReconciliationResult {
  applied: ReconciledInvoice[];
  remainingAmount: number;
}

/** Invoice states eligible for FIFO reconciliation, oldest due date first. */
const RECONCILABLE_INVOICE_STATES = [
  'PENDING',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const;

/** Handles payment-transfer OCR and FIFO accounts-receivable reconciliation. */
export class PaymentOcrService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly dispatcher: ModelDispatcherService,
    private readonly logger: Logger,
  ) {}

  async parsePaymentTransfer(
    base64Image: string,
  ): Promise<PaymentTransferResult> {
    const nullResult: PaymentTransferResult = {
      transactionId: null,
      amount: null,
      timestamp: null,
      senderName: null,
      rawText: '',
      confidence: 'FAILED',
    };

    try {
      const prompt = `You are an OCR assistant that extracts payment details from Myanmar bank transfer screenshots (KBZ Pay, Wave Money, AYA, CB Bank, etc.).

Extract the following fields and return ONLY a valid JSON object with these exact keys:
- "transactionId": the transaction reference / receipt ID (string or null)
- "amount": the transferred amount as a number in Kyat (null if not found)
- "timestamp": the transfer date/time as an ISO string or human-readable string (null if not found)
- "senderName": the name or account of the sender (null if not found)
- "rawText": the full raw text extracted from the image

Return ONLY raw JSON with no markdown or explanation.`;

      const res = await this.dispatcher.dispatchModel(
        prompt,
        [base64Image],
        'json',
      );
      if (!res) return { ...nullResult, confidence: 'FAILED' };

      const clean = res.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      const hasEnoughData =
        (parsed.amount !== null && parsed.amount !== undefined) ||
        parsed.transactionId;
      return {
        transactionId: parsed.transactionId ?? null,
        amount:
          typeof parsed.amount === 'number'
            ? parsed.amount
            : parsed.amount
              ? parseFloat(String(parsed.amount).replace(/[^0-9.]/g, ''))
              : null,
        timestamp: parsed.timestamp ?? null,
        senderName: parsed.senderName ?? null,
        rawText: parsed.rawText ?? '',
        confidence: hasEnoughData ? 'HIGH' : 'LOW',
      };
    } catch (err) {
      this.logger.warn(
        `[parsePaymentTransfer] Failed to parse model response: ${err}`,
      );
      return nullResult;
    }
  }

  async reconcilePaymentFifo(
    shopId: string,
    paymentAmount: number,
    transactionRef: string | null,
    screenshotUrl: string | null,
    actorId: string,
  ): Promise<FifoReconciliationResult> {
    const unpaidInvoices = await this.drizzle.db
      .select()
      .from(schema.pgSchema.invoices)
      .where(
        and(
          eq(schema.pgSchema.invoices.shop_id, shopId),
          or(
            eq(schema.pgSchema.invoices.state, RECONCILABLE_INVOICE_STATES[0]),
            eq(schema.pgSchema.invoices.state, RECONCILABLE_INVOICE_STATES[1]),
            eq(schema.pgSchema.invoices.state, RECONCILABLE_INVOICE_STATES[2]),
          ),
        ),
      )
      .orderBy(asc(schema.pgSchema.invoices.due_date)); // oldest first = FIFO

    let remaining = paymentAmount;
    const applied: ReconciledInvoice[] = [];
    const now = Date.now();

    for (const inv of unpaidInvoices) {
      if (remaining <= 0) break;

      const apply = Math.min(remaining, inv.amount);
      remaining -= apply;
      const newState =
        remaining >= 0 && apply >= inv.amount ? 'PAID' : 'PARTIALLY_PAID';

      await this.drizzle.db
        .update(schema.pgSchema.invoices)
        .set({ state: newState, updated_at: now })
        .where(eq(schema.pgSchema.invoices.id, inv.id));

      const paymentId = `pay-${now}-${Math.random().toString(36).substring(2, 9)}`;
      await this.drizzle.db.insert(schema.pgSchema.payments).values({
        id: paymentId,
        invoice_id: inv.id,
        amount: apply,
        payment_date: now,
        transaction_ref: transactionRef,
        screenshot_url: screenshotUrl,
        reconciled_by: actorId,
        created_at: now,
        updated_at: now,
      });

      applied.push({ invoiceId: inv.id, amountApplied: apply, newState });
    }

    this.logger.log(
      `[reconcilePaymentFifo] shop=${shopId} applied=${applied.length} invoices, remaining=${remaining}`,
    );

    return { applied, remainingAmount: remaining };
  }
}
