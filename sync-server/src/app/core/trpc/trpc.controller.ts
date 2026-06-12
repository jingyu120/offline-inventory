import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@burma-inventory/shared-types/server';
import { TrpcRouter } from './trpc.router';
import { requestStorage } from './request-context';

@Controller('trpc')
export class TrpcController {
  // TrpcRouter is injected so Nest instantiates it (registering tRPC
  // resolvers via its OnModuleInit hook) even though it is not used directly.
  constructor(_trpcRouter: TrpcRouter) {
    // Intentionally empty: dependency injection alone is the required effect.
  }

  private trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  });

  // Named wildcard ('*path') per path-to-regexp v8 (NestJS 11 / Express 5);
  // the param itself is unused — the sub-path is derived from req.url below.
  @All('*path')
  handleTRPC(@Req() req: Request, @Res() res: Response) {
    // Because NestJS routing matches /trpc/*, we adjust req.url
    // so that the tRPC handler receives the sub-path correctly.
    const originalUrl = req.url;
    req.url = req.url.replace(/^\/trpc/, '');
    if (req.url === '') {
      req.url = '/';
    }
    requestStorage.run(req, () => {
      this.trpcMiddleware(req, res, () => {
        req.url = originalUrl;
      });
    });
  }
}
