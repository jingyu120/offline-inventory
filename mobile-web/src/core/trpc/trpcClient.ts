import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@burma-inventory/shared-types';
import { API_BASE_URL } from '../../config/appConfig';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/trpc`,
    }),
  ],
});
