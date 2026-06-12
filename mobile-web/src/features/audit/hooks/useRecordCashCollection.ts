import { useCallback, useState } from 'react';
import axios from 'axios';
import { guardAsync } from '@burma-inventory/shared-types';
import { API_BASE_URL } from '../../../config/appConfig';
import { useAuth } from '../../../core/auth/auth';
import { syncData } from '../../sync/sync';

const RECONCILE_PAYMENT_ENDPOINT = `${API_BASE_URL}/sync/ai/reconcile-payment`;

interface ReconcileAllocation {
  id: string;
  amount: number;
  outstanding: number;
  allocated: number;
  newState: string;
  dueDate: number;
}

export interface ReconcileSummary {
  applied: ReconcileAllocation[];
  remainingAmount: number;
}

interface ReconcilePaymentPayload {
  shopId: string;
  paymentAmount: number;
  transactionRef: string | null;
  screenshotUrl: string | null;
  actorId: string;
}

export interface RecordCashCollectionInput {
  shopId: string;
  amount: string;
  transactionRef?: string | null;
  screenshotUrl?: string | null;
}

export type RecordCashCollectionStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error';

export interface UseRecordCashCollectionReturn {
  status: RecordCashCollectionStatus;
  summary: ReconcileSummary | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  submit: (input: RecordCashCollectionInput) => Promise<boolean>;
  reset: () => void;
}

const MIN_PAYMENT_AMOUNT = 0;
const INVALID_AMOUNT_ERROR = 'INVALID_AMOUNT';

/**
 * Encapsulates the "Record Cash Collection" submission so the modal stays a
 * declarative shell. Reuses the exact FIFO reconcile endpoint that the admin
 * PendingReconciliationPanel posts to, then triggers a sync so the local
 * SQLite credit-lock state can refresh and the lock can lift.
 */
export const useRecordCashCollection = (): UseRecordCashCollectionReturn => {
  const { activeRep } = useAuth();
  const [status, setStatus] = useState<RecordCashCollectionStatus>('idle');
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setSummary(null);
    setErrorMessage(null);
  }, []);

  const submit = useCallback(
    async (input: RecordCashCollectionInput): Promise<boolean> => {
      const paymentAmount = parseFloat(input.amount);
      if (isNaN(paymentAmount) || paymentAmount <= MIN_PAYMENT_AMOUNT) {
        setStatus('error');
        setErrorMessage(INVALID_AMOUNT_ERROR);
        return false;
      }

      setStatus('submitting');
      setErrorMessage(null);

      const payload: ReconcilePaymentPayload = {
        shopId: input.shopId,
        paymentAmount,
        transactionRef: input.transactionRef || null,
        screenshotUrl: input.screenshotUrl || null,
        actorId: activeRep.id,
      };

      const [response, error] = await guardAsync(
        axios.post<ReconcileSummary>(RECONCILE_PAYMENT_ENDPOINT, payload),
      );

      if (error || !response) {
        console.error('Failed to record cash collection:', error);
        setStatus('error');
        setErrorMessage(error?.message ?? null);
        return false;
      }

      setSummary(response.data);

      // Refresh the local SQLite mirror so the AR credit-lock state can lift.
      const [, syncError] = await guardAsync(syncData());
      if (syncError) {
        console.error(
          'Cash collection recorded but post-sync refresh failed:',
          syncError,
        );
      }

      setStatus('success');
      return true;
    },
    [activeRep.id],
  );

  return {
    status,
    summary,
    errorMessage,
    isSubmitting: status === 'submitting',
    submit,
    reset,
  };
};
