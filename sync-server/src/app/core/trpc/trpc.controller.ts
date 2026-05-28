import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@burma-inventory/shared-types/server';

@Controller('trpc')
export class TrpcController {
  private trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
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
    this.trpcMiddleware(req, res, () => {
      req.url = originalUrl;
    });
  }
}
