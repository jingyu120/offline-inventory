import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@burma-inventory/shared-types/server';
import { TrpcRouter } from './trpc.router';
import { requestStorage } from './request-context';

@Controller('trpc')
export class TrpcController {
  constructor(_trpcRouter: TrpcRouter) {
    console.log('[TrpcController] Initialized and dependencies injected');
  }

  private trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  });

  @All('*')
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
