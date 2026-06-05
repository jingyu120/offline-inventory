import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@burma-inventory/shared-types';
import { API_BASE_URL } from '../../config/appConfig';
import { useCartStore } from '../store/cartStore';
import { getLatestAuditHash } from '../utils/audit';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/trpc`,
      headers() {
        const recoveryState = useCartStore.getState().recoveryState;
        const activeTabId = useCartStore.getState().activeTabId;
        const traceId = activeTabId
          ? useCartStore.getState().sessions[activeTabId]?.traceId ||
            recoveryState?.activeTabId ||
            'system-trace-boot'
          : recoveryState?.activeTabId || 'system-trace-boot';

        const hashChain = getLatestAuditHash() || 'genesis';
        return {
          'x-trace-id': traceId,
          'x-hash-chain': hashChain,
        };
      },
    }),
  ],
});
