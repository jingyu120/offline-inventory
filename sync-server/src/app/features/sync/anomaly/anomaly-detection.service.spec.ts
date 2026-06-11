import { Logger } from '@nestjs/common';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AppConfig } from '../../../core/config/app-config';
import * as schema from '@burma-inventory/shared-types';

function chain(resolved: unknown): $Any {
  const q: $Any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolved),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    then: (onfulfilled?: $Any, onrejected?: $Any) =>
      Promise.resolve(resolved).then(onfulfilled, onrejected),
  };
  return q;
}

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let logger: Logger;
  let config: AppConfig;

  const makeLogger = (): Logger =>
    ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }) as unknown as Logger;

  beforeEach(() => {
    config = new AppConfig();
    logger = makeLogger();
  });

  it('returns early when the changeset is undefined', async () => {
    const drizzle: $Any = { db: { select: jest.fn() } };
    service = new AnomalyDetectionService(drizzle, config);
    await service.runAnomalyDetection(undefined, logger);
    expect(drizzle.db.select).not.toHaveBeenCalled();
  });

  it('treats missing created/updated arrays as empty', async () => {
    const drizzle: $Any = { db: { select: jest.fn() } };
    service = new AnomalyDetectionService(drizzle, config);
    await service.runAnomalyDetection(
      { created: undefined, updated: undefined } as $Any,
      logger,
    );
    expect(drizzle.db.select).not.toHaveBeenCalled();
  });

  it('skips items that are not pending fulfillment', async () => {
    const drizzle: $Any = { db: { select: jest.fn() } };
    service = new AnomalyDetectionService(drizzle, config);
    await service.runAnomalyDetection(
      {
        created: [{ id: 'ii-1', fulfillment_status: 'FULFILLED' }],
        updated: [],
      } as $Any,
      logger,
    );
    expect(drizzle.db.select).not.toHaveBeenCalled();
  });

  it('flags an anomalous quantity exceeding the configured multiplier', async () => {
    const selectImpl = jest.fn().mockImplementation((arg?: $Any) => {
      if (arg && arg.quantity) {
        return chain([
          { quantity: 10, logId: 'h-1' },
          { quantity: 10, logId: 'h-2' },
        ]);
      }
      return chain([{ id: 'log-1', shop_id: 'shop-1' }]);
    });
    const updateSpy = jest.fn().mockReturnValue(chain(undefined));
    const drizzle: $Any = { db: { select: selectImpl, update: updateSpy } };
    service = new AnomalyDetectionService(drizzle, config);

    await service.runAnomalyDetection(
      {
        created: [
          {
            id: 'ii-1',
            interaction_log_id: 'log-1',
            fulfillment_status: 'PENDING_FULFILLMENT',
            quantity: 100,
          },
        ],
        updated: [],
      } as $Any,
      logger,
    );

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Anomaly detected: Item ii-1 quantity 100'),
    );
    expect(updateSpy).toHaveBeenCalledWith(schema.pgSchema.interaction_items);
  });

  it('does not flag when no historical orders exist', async () => {
    const selectImpl = jest.fn().mockImplementation((arg?: $Any) => {
      if (arg && arg.quantity) {
        return chain([]);
      }
      return chain([{ id: 'log-1', shop_id: 'shop-1' }]);
    });
    const updateSpy = jest.fn().mockReturnValue(chain(undefined));
    const drizzle: $Any = { db: { select: selectImpl, update: updateSpy } };
    service = new AnomalyDetectionService(drizzle, config);

    await service.runAnomalyDetection(
      {
        created: [
          {
            id: 'ii-1',
            interaction_log_id: 'log-1',
            fulfillment_status: 'PENDING_FULFILLMENT',
            quantity: 100,
          },
        ],
        updated: [],
      } as $Any,
      logger,
    );

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('skips when the parent log is missing or has no shop', async () => {
    const drizzle: $Any = {
      db: { select: jest.fn().mockReturnValue(chain([])), update: jest.fn() },
    };
    service = new AnomalyDetectionService(drizzle, config);
    await service.runAnomalyDetection(
      {
        created: [
          {
            id: 'ii-1',
            interaction_log_id: 'log-1',
            fulfillment_status: 'PENDING_FULFILLMENT',
            quantity: 100,
          },
        ],
        updated: [],
      } as $Any,
      logger,
    );
    expect(drizzle.db.update).not.toHaveBeenCalled();
  });
});
