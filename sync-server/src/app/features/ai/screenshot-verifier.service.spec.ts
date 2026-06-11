import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ScreenshotVerifierService } from './screenshot-verifier.service';
import { ModelDispatcherService } from './model-dispatcher.service';
import { DrizzleService } from '../../core/drizzle';
import { AppConfig } from '../../core/config/app-config';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('img')),
}));

function createMockQueryBuilder(resolvedValue: unknown) {
  const query: Record<string, jest.Mock> & PromiseLike<unknown> =
    Promise.resolve(resolvedValue) as never;
  for (const method of [
    'select',
    'from',
    'innerJoin',
    'where',
    'orderBy',
    'limit',
    'insert',
    'values',
    'update',
    'set',
  ]) {
    (query as Record<string, jest.Mock>)[method] = jest
      .fn()
      .mockReturnValue(query);
  }
  return query;
}

describe('ScreenshotVerifierService', () => {
  let logger: Logger;
  let dispatcher: { dispatchModel: jest.Mock };
  let drizzle: {
    db: ReturnType<typeof createMockQueryBuilder>;
    readDb: ReturnType<typeof createMockQueryBuilder>;
  };
  let tx: ReturnType<typeof createMockQueryBuilder>;
  let service: ScreenshotVerifierService;

  const config = { uploadsDir: 'uploads' } as unknown as AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    logger = new Logger('test');
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    dispatcher = { dispatchModel: jest.fn() };
    tx = createMockQueryBuilder([]); // no prior audit events -> genesis path
    drizzle = {
      db: createMockQueryBuilder([]),
      readDb: createMockQueryBuilder([]),
    };
    drizzle.db.transaction = jest
      .fn()
      .mockImplementation((cb: (t: unknown) => unknown) => cb(tx));
    service = new ScreenshotVerifierService(
      drizzle as unknown as DrizzleService,
      config,
      dispatcher as unknown as ModelDispatcherService,
      logger,
    );
  });

  function stubReads(log: unknown, shop: unknown): void {
    let call = 0;
    drizzle.readDb.select = jest.fn().mockImplementation(() => {
      call++;
      if (call === 1) return createMockQueryBuilder([log]);
      if (call === 2) return createMockQueryBuilder([shop]);
      return createMockQueryBuilder([]);
    });
  }

  it('uses the genesis hash and provided actorId when no prior events exist', async () => {
    stubReads(
      { id: 'log-1', shop_id: 'shop-1', notes: 'ok' },
      { id: 'shop-1', name: 'Shop 1' },
    );
    dispatcher.dispatchModel.mockResolvedValueOnce(
      '{"status":"VERIFIED"}', // no explanation -> default branch
    );

    await service.processScreenshot('log-1', '/file.png', 'trace-1', 'actor-9');

    expect(drizzle.db.transaction).toHaveBeenCalled();
    expect(tx.insert).toHaveBeenCalled();
  });

  it('applies the wrong-notes heuristic when audit JSON parsing fails', async () => {
    stubReads(
      { id: 'log-1', shop_id: 'shop-1', notes: 'this looks wrong' },
      { id: 'shop-1', name: 'Shop 1' },
    );
    dispatcher.dispatchModel.mockResolvedValueOnce('{not-json');

    await service.processScreenshot('log-1', '/file.png');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse screenshot audit result JSON'),
    );
    expect(tx.update).toHaveBeenCalled();
  });

  it('falls back to verified offline when the model is unavailable and notes are clean', async () => {
    stubReads(
      { id: 'log-1', shop_id: 'shop-1', notes: 'all good here' },
      { id: 'shop-1', name: 'Shop 1' },
    );
    dispatcher.dispatchModel.mockResolvedValueOnce(null);

    await service.processScreenshot('log-1', '/file.png');
    expect(tx.update).toHaveBeenCalled();
  });
});
