import { useCallback, useEffect, useState } from 'react';
import { guardAsync } from '@burma-inventory/shared-types';
import { trpcClient } from '../../../core/trpc/trpcClient';
import { SyncAuditLog } from '../types';

const SYNC_LOGS_PAGE_SIZE = 20;

export interface UseSyncAuditLogsReturn {
  syncLogs: SyncAuditLog[];
  syncLogsLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Owns the paginated Sync Audit Log feed previously inlined in the screen.
 * Reads run through the tRPC client; the screen only consumes the result.
 */
export const useSyncAuditLogs = (): UseSyncAuditLogsReturn => {
  const [syncLogs, setSyncLogs] = useState<SyncAuditLog[]>([]);
  const [syncLogsLoading, setSyncLogsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchSyncLogs = useCallback(
    async (isLoadMore: boolean): Promise<void> => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setSyncLogsLoading(true);
      }

      const lastLog = isLoadMore ? syncLogs[syncLogs.length - 1] : undefined;
      const [response, error] = await guardAsync(
        trpcClient.getSyncLogs.query({
          lastSeenId: lastLog?.id,
          limit: SYNC_LOGS_PAGE_SIZE,
        }),
      );

      if (error) {
        console.error('Failed to fetch sync logs via tRPC:', error);
      } else if (response && response.success) {
        const newLogs = response.logs ?? [];
        setSyncLogs((prev) => (isLoadMore ? [...prev, ...newLogs] : newLogs));
        setHasMore(newLogs.length === SYNC_LOGS_PAGE_SIZE);
      }

      setSyncLogsLoading(false);
      setLoadingMore(false);
    },
    [syncLogs],
  );

  const refresh = useCallback(() => fetchSyncLogs(false), [fetchSyncLogs]);
  const loadMore = useCallback(() => fetchSyncLogs(true), [fetchSyncLogs]);

  useEffect(() => {
    fetchSyncLogs(false);
  }, []);

  return {
    syncLogs,
    syncLogsLoading,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
  };
};
