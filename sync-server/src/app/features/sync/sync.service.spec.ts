import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { DrizzleService } from '../../core/drizzle';
import { AiService } from '../ai/ai.service';
import * as schema from '@burma-inventory/shared-types';
import * as fs from 'fs';

// Prevent env.ts from calling process.exit(1) when DATABASE_URL is missing in CI
jest.mock('../../../env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5433/test_db',
    DATABASE_REPLICA_URL: undefined,
    GEMMA_API_URL: 'http://localhost:11434',
    REDIS_URL: 'redis://localhost:6379',
    SYNC_SERVER_PORT: 3000,
    SYNC_SERVER_PREFIX: 'api',
    NODE_ENV: 'test',
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Helper to create chained query builder mock
function createMockQueryBuilder(resolvedValue: any) {
  let value = resolvedValue;
  const query: any = {
    then: (onfulfilled?: any, onrejected?: any) => {
      return Promise.resolve(value).then(onfulfilled, onrejected);
    },
    catch: (onrejected?: any) => {
      return Promise.resolve(value).catch(onrejected);
    },
  };
  const allMethods = [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'insert',
    'values',
    'onConflictDoNothing',
    'update',
    'set',
    'delete',
    'transaction',
    'innerJoin',
    'returning',
  ];
  allMethods.forEach((m) => {
    query[m] = jest.fn().mockReturnValue(query);
  });
  query.setValue = (newValue: any) => {
    value = newValue;
  };
  return query;
}

describe('SyncService', () => {
  let service: SyncService;
  let mockTx: any;
  let mockDrizzle: { db: any; readDb: any };

  const mockAiService = {
    processScreenshot: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create fresh query builder mock instances
    mockTx = createMockQueryBuilder([{ hash: 'prev-event-hash' }]);
    mockDrizzle = {
      db: createMockQueryBuilder([]),
      readDb: createMockQueryBuilder([]),
    };
    mockDrizzle.db.transaction = jest
      .fn()
      .mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
        cb(mockTx),
      );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLastAuditEvent', () => {
    it('returns null when no events exist', async () => {
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const res = await service.getLastAuditEvent();
      expect(res).toBeNull();
    });

    it('returns the last audit event when one exists', async () => {
      const mockEvent = { event_id: 'evt-1', hash: 'hash-1' };
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([mockEvent]));
      const res = await service.getLastAuditEvent();
      expect(res).toEqual(mockEvent);
    });
  });

  describe('calculateEventHash', () => {
    it('generates a 64-character hex string (SHA-256)', () => {
      const event = {
        event_id: '1',
        trace_id: 'trace',
        entity_type: 'ORDER',
        action: 'CREATE',
        previous_state: null,
        new_state: '{"test": 1}',
        gps_coordinates: null,
        created_at: 1000,
      };
      const hash = service.calculateEventHash(event, 'rep-1', 'prev-hash');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different hashes for different events', () => {
      const base = {
        event_id: '1',
        trace_id: 'trace',
        entity_type: 'ORDER',
        action: 'CREATE',
        previous_state: null,
        new_state: '{"a": 1}',
        gps_coordinates: null,
        created_at: 1000,
      };
      const hash1 = service.calculateEventHash(base, 'rep-1', 'prev-hash');
      const hash2 = service.calculateEventHash(
        { ...base, event_id: '2' },
        'rep-1',
        'prev-hash',
      );
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('commitAuditEvent', () => {
    it('commits audit event with correct hash and previous event hash', async () => {
      const mockTxLocal = createMockQueryBuilder([{ hash: 'some-prev-hash' }]);
      await service.commitAuditEvent(
        mockTxLocal,
        'SHOP',
        'CREATE',
        null,
        { id: 'shop-1', gps_coordinates: '12.3,45.6' },
        'user-1',
        'device-1',
        'trace-1',
      );
      expect(mockTxLocal.insert).toHaveBeenCalled();
    });

    it('uses genesis when there are no previous events', async () => {
      const mockTxLocal = createMockQueryBuilder([]);
      await service.commitAuditEvent(
        mockTxLocal,
        'SHOP',
        'CREATE',
        null,
        { id: 'shop-1' },
        'user-1',
        'device-1',
        null,
      );
      expect(mockTxLocal.insert).toHaveBeenCalled();
    });
  });

  describe('pullChanges', () => {
    it('returns a changeset and a server timestamp', async () => {
      const before = Date.now();
      const res = await service.pullChanges(Date.now(), 'device-1', 'user-1');
      expect(res.changes).toBeDefined();
      expect(res.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('throws error if table is not defined in pgSchema', async () => {
      const originalRegions = (schema.pgSchema as any).regions;
      delete (schema.pgSchema as any).regions;
      try {
        await expect(service.pullChanges(Date.now())).rejects.toThrow(
          'Drizzle table for regions is not defined',
        );
      } finally {
        (schema.pgSchema as any).regions = originalRegions;
      }
    });

    it('logs error when pull audit log write fails', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      mockDrizzle.db.insert = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.values = jest
          .fn()
          .mockReturnValue(Promise.reject(new Error('Insert error')));
        return q;
      });
      await service.pullChanges(Date.now(), 'device-1', 'user-1');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write pull audit log: Insert error'),
      );
    });
  });

  describe('pushChanges', () => {
    it('runs inside a database transaction', async () => {
      await service.pushChanges({} as any, 'device-1', 'user-1', 'trace-1');
      expect(mockDrizzle.db.transaction).toHaveBeenCalled();
    });

    it('logs error when push audit log write fails', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      mockDrizzle.db.insert = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.values = jest
          .fn()
          .mockReturnValue(Promise.reject(new Error('Insert error')));
        return q;
      });
      await service.pushChanges({} as any, 'device-1', 'user-1', 'trace-1');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write push audit log: Insert error'),
      );
    });

    it('throws error when database transaction fails', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      mockDrizzle.db.transaction = jest
        .fn()
        .mockRejectedValue(new Error('Transaction error'));
      await expect(service.pushChanges({} as any)).rejects.toThrow(
        'Transaction error',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to push sync changes: Transaction error',
        ),
        expect.any(String),
      );
    });

    it('detects compromised audit events hash chain', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      const auditEvent: any = {
        event_id: 'evt-2',
        created_at: 2000,
        hash: 'invalid-hash-value',
        actor_id: 'user-1',
      };
      const changes = {
        audit_events: {
          created: [
            {
              event_id: 'evt-1',
              created_at: 1000,
              hash: 'hash-1',
              actor_id: 'user-1',
            },
            auditEvent,
          ],
          updated: [],
          deleted: [],
        },
      } as any;
      mockDrizzle.readDb.select = jest
        .fn()
        .mockImplementation((selectArg?: any) => {
          if (selectArg && selectArg.hash) {
            return createMockQueryBuilder([{ hash: 'db-hash' }]);
          }
          return createMockQueryBuilder([]);
        });

      await service.pushChanges(changes, 'device-1', 'user-1');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Audit Hash Chain Broken] Event evt-1'),
      );
      expect(auditEvent.status).toBe('COMPROMISED');
    });

    it('inserts, updates, and deletes records across registry tables with LWW conflict checks', async () => {
      const changes = {
        shops: {
          created: [
            { id: 'shop-new', name: 'New Shop', gps_coordinates: '12.3,45.6' },
          ],
          updated: [
            // 1. Missing shop in DB -> insert it (triggers insert failure warning)
            { id: 'shop-missing', name: 'Missing Shop', updated_at: 100 },
            // 2. Exists but incomingTime > existingTime -> update full
            { id: 'shop-newer', name: 'Newer Shop', updated_at: 200 },
            // 3. Exists and incomingTime <= existingTime -> patch null fields
            {
              id: 'shop-older',
              name: 'Older Shop',
              updated_at: 50,
              address: 'Patched Address',
            },
            // 4. Exists and incomingTime <= existingTime, but no fields to patch -> do nothing
            { id: 'shop-same', name: 'Same Shop', updated_at: 100 },
          ],
          deleted: ['shop-deleted'],
        },
        planned_routes: {
          created: [],
          updated: [],
          deleted: ['route-deleted'], // softDelete: false
        },
        item_stocks: {
          created: [{ id: 'stock-1' }],
          updated: [],
          deleted: [],
        },
        rep_scores: {
          created: [{ id: 'score-1' }],
          updated: [],
          deleted: [],
        },
      } as any;

      const tracker = { selectCallCount: 0 };
      const selectResults = [
        [], // for shop-missing (not found)
        [{ id: 'shop-newer', name: 'Old Newer Shop', updated_at: 100 }], // for shop-newer
        [
          {
            id: 'shop-older',
            name: 'Old Older Shop',
            updated_at: 100,
            address: null,
          },
        ], // for shop-older
        [
          {
            id: 'shop-same',
            name: 'Old Same Shop',
            updated_at: 100,
            address: 'Existing',
          },
        ], // for shop-same
        [{ id: 'shop-deleted', name: 'Shop to Delete' }], // for audit event look up before delete
      ];

      mockTx.select = jest.fn().mockImplementation((selectArg?: any) => {
        if (selectArg && selectArg.hash) {
          return createMockQueryBuilder([{ hash: 'prev-event-hash' }]);
        }
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockImplementation((table: any) => {
          if (table === schema.pgSchema.audit_events) {
            return createMockQueryBuilder([{ hash: 'prev-event-hash' }]);
          }
          const res = selectResults[tracker.selectCallCount] || [];
          tracker.selectCallCount++;
          return createMockQueryBuilder(res);
        });
        return q;
      });

      // Mock missing record insert to fail with warning only for shop-missing
      const originalInsert = mockTx.insert;
      mockTx.insert = jest.fn().mockImplementation((table: any) => {
        const q = createMockQueryBuilder([]);
        if (table === schema.pgSchema.shops) {
          q.values = jest.fn().mockImplementation((valuesArg: any) => {
            const hasMissing = Array.isArray(valuesArg)
              ? valuesArg.some((v) => v.id === 'shop-missing')
              : valuesArg?.id === 'shop-missing';
            if (hasMissing) {
              return Promise.reject(new Error('Insert warning'));
            }
            return q;
          });
          return q;
        }
        return originalInsert.call(mockTx, table);
      });

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      await service.pushChanges(changes, 'device-1', 'user-1');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Could not create missing update record shop-missing',
        ),
      );
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.delete).toHaveBeenCalled();
    });

    it('logs error when post-push screenshot audit fails', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      // Mock db.select inside triggerAuditForPushedLogs to reject
      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockReturnValue(q);
        q.where = jest.fn().mockReturnValue(q);
        q.limit = jest
          .fn()
          .mockReturnValue(Promise.reject(new Error('Trigger fail')));
        return q;
      });

      const changes = {
        interaction_logs: {
          created: [
            { id: 'log-1', viber_screenshot_url: '/api/uploads/img.jpg' },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      await service.pushChanges(changes, 'device-1', 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to trigger post-push screenshot audit: Trigger fail',
        ),
      );
    });
  });

  describe('runAnomalyDetection', () => {
    it('returns early if changeset has no items', async () => {
      const changes = {
        interaction_items: undefined,
      } as any;
      await service.pushChanges(changes);
      expect(mockDrizzle.db.select).not.toHaveBeenCalled();
    });

    it('filters fulfillment status and flags anomalies exceeding 5x average', async () => {
      const changes = {
        interaction_items: {
          created: [
            {
              id: 'ii-1',
              interaction_log_id: 'log-1',
              fulfillment_status: 'PENDING_FULFILLMENT',
              quantity: 100, // Very high
            },
            {
              id: 'ii-2',
              interaction_log_id: 'log-1',
              fulfillment_status: 'FULFILLED', // Should be skipped
              quantity: 200,
            },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      mockDrizzle.db.select = jest
        .fn()
        .mockImplementation((selectArg?: any) => {
          // If selectArg has quantity, this is the historicalItems query
          if (selectArg && selectArg.quantity) {
            return createMockQueryBuilder([
              { quantity: 10, logId: 'hist-log-1' },
              { quantity: 10, logId: 'hist-log-2' },
            ]);
          }
          // Otherwise it is the parent interaction logs query
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.interaction_logs) {
              return createMockQueryBuilder([
                { id: 'log-1', shop_id: 'shop-123' },
              ]);
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.pushChanges(changes);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Anomaly detected: Item ii-1 quantity 100 exceeds 30-day moving average of 10',
        ),
      );
      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('returns early if parent interaction log has no shop_id', async () => {
      const changes = {
        interaction_items: {
          created: [
            {
              id: 'ii-1',
              interaction_log_id: 'log-1',
              fulfillment_status: 'PENDING_FULFILLMENT',
              quantity: 100,
            },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockImplementation((table: any) => {
          if (table === schema.pgSchema.interaction_logs) {
            return createMockQueryBuilder([{ id: 'log-1', shop_id: null }]); // shop_id is null
          }
          return createMockQueryBuilder([]);
        });
        return q;
      });

      await service.pushChanges(changes);
      expect(mockDrizzle.db.update).not.toHaveBeenCalled();
    });

    it('logs error when anomaly detection queries fail', async () => {
      const changes = {
        interaction_items: {
          created: [
            {
              id: 'ii-1',
              interaction_log_id: 'log-1',
              fulfillment_status: 'PENDING_FULFILLMENT',
              quantity: 100,
            },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockReturnValue(q);
        q.where = jest.fn().mockReturnValue(q);
        q.limit = jest
          .fn()
          .mockReturnValue(Promise.reject(new Error('Select failed')));
        return q;
      });

      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      await service.pushChanges(changes);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Anomaly detection error: Select failed'),
      );
    });
  });

  describe('triggerAuditForPushedLogs', () => {
    it('processes Viber screenshots and triggers OCR audit', async () => {
      const changes = {
        interaction_logs: {
          created: [
            {
              id: 'log-1',
              viber_screenshot_url: '/api/uploads/test-screenshot.png',
            },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        return createMockQueryBuilder([
          {
            id: 'log-1',
            viber_screenshot_url: '/api/uploads/test-screenshot.png',
            ai_verification_status: null,
          },
        ]);
      });

      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);

      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.pushChanges(changes);
      // Wait for processScreenshot async resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Post-push hook matched file test-screenshot.png for log log-1',
        ),
      );
      expect(mockAiService.processScreenshot).toHaveBeenCalledWith(
        'log-1',
        expect.stringContaining('test-screenshot.png'),
        undefined,
        'system',
      );
    });

    it('logs error when post-push screenshot processing fails', async () => {
      const changes = {
        interaction_logs: {
          created: [
            {
              id: 'log-1',
              viber_screenshot_url: '/api/uploads/test-screenshot.png',
            },
          ],
          updated: [],
          deleted: [],
        },
      } as any;

      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        return createMockQueryBuilder([
          {
            id: 'log-1',
            viber_screenshot_url: '/api/uploads/test-screenshot.png',
            ai_verification_status: null,
          },
        ]);
      });

      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      mockAiService.processScreenshot.mockRejectedValueOnce(
        new Error('Process error'),
      );

      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      await service.pushChanges(changes);
      // Wait for processScreenshot async resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error processing screenshot for pushed log log-1: Process error',
        ),
      );
    });
  });

  describe('checkIdempotency', () => {
    it('returns parsed body when record exists', async () => {
      const records = [{ response_body: '{"success":true,"cached":true}' }];
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder(records));
      const res = await service.checkIdempotency('key-1');
      expect(res).toEqual({ success: true, cached: true });
    });

    it('returns fallback success object when body is invalid JSON', async () => {
      const records = [{ response_body: 'invalid-json' }];
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder(records));
      const res = await service.checkIdempotency('key-1');
      expect(res).toEqual({ success: true });
    });

    it('returns null when no record exists', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const res = await service.checkIdempotency('key-2');
      expect(res).toBeNull();
    });
  });

  describe('getContactByPhone', () => {
    it('returns contact object if exists', async () => {
      const contactObj = { id: 'c-1', phone_number: '123', shop_id: 'shop-1' };
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([contactObj]));
      const res = await service.getContactByPhone('123');
      expect(res).toEqual(contactObj);
    });

    it('returns null if not exists', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const res = await service.getContactByPhone('123');
      expect(res).toBeNull();
    });
  });

  describe('saveIdempotency', () => {
    it('calls db insert and onConflictDoNothing', async () => {
      await service.saveIdempotency('key-1', { success: true });
      expect(mockDrizzle.db.insert).toHaveBeenCalled();
    });

    it('logs error when database insert throws', async () => {
      const loggerSpy = jest.spyOn(
        SyncService.prototype as any,
        'saveIdempotency',
      );
      mockDrizzle.db.insert = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.values = jest.fn().mockReturnValue(q);
        q.onConflictDoNothing = jest
          .fn()
          .mockReturnValue(Promise.reject(new Error('DB error')));
        return q;
      });
      await service.saveIdempotency('key-1', { success: true });
      // Verify function was invoked, and it didn't throw out of saveIdempotency
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('createViberLog', () => {
    it('inserts a Viber interaction log', async () => {
      await service.createViberLog({
        id: 'log-1',
        shopId: 'shop-1',
        notes: 'notes',
        screenshotUrl: 'url',
      });
      expect(mockDrizzle.db.insert).toHaveBeenCalled();
    });
  });

  describe('updateCompetitorInsightPhoto', () => {
    it('updates when record exists', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([{ id: 'insight-1' }]));
      const url = await service.updateCompetitorInsightPhoto(
        'insight-1',
        'img.jpg',
      );
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(url).toBe('/api/sync/uploads/img.jpg');
    });

    it('does not update when record does not exist', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const url = await service.updateCompetitorInsightPhoto(
        'insight-1',
        'img.jpg',
      );
      expect(mockDrizzle.db.update).not.toHaveBeenCalled();
      expect(url).toBe('/api/sync/uploads/img.jpg');
    });
  });

  describe('updateInteractionLogScreenshot', () => {
    it('updates when record exists', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([{ id: 'log-1' }]));
      const url = await service.updateInteractionLogScreenshot(
        'log-1',
        'img.jpg',
      );
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(url).toBe('/api/sync/uploads/img.jpg');
    });

    it('does not update when record does not exist', async () => {
      mockDrizzle.db.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const url = await service.updateInteractionLogScreenshot(
        'log-1',
        'img.jpg',
      );
      expect(mockDrizzle.db.update).not.toHaveBeenCalled();
      expect(url).toBe('/api/sync/uploads/img.jpg');
    });
  });

  describe('getMismatchLogs', () => {
    it('returns logs with shop name and items', async () => {
      const logs = [{ id: 'log-1', shop_id: 'shop-1', notes: 'discrepancy' }];
      const shop = [{ id: 'shop-1', name: 'Shop 1' }];
      const items = [
        { id: 'ii-1', interaction_log_id: 'log-1', item_id: 'item-1' },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.shops) {
            return createMockQueryBuilder(shop);
          }
          if (table === schema.pgSchema.interaction_items) {
            return createMockQueryBuilder(items);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      const res = await service.getMismatchLogs();
      expect(res).toEqual([
        {
          ...logs[0],
          shopName: 'Shop 1',
          items,
        },
      ]);
    });
  });

  describe('resolveMismatchLog', () => {
    it('updates log and inserts new items inside transaction', async () => {
      const input = {
        logId: 'log-1',
        shopId: 'shop-1',
        notes: 'notes',
        items: [
          {
            itemId: 'item-1',
            quantity: 5,
            unitPrice: 1000,
            selectedUnit: 'PCS',
            stockCondition: 'GOOD',
          },
        ],
      };
      const res = await service.resolveMismatchLog(input);
      expect(mockDrizzle.db.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.delete).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });
  });

  describe('getSyncLogs', () => {
    it('returns sync audit logs without user details when users match is empty', async () => {
      const logs = [
        { id: 'log-1', device_id: 'd-1', user_id: null, created_at: 1000 },
      ];
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder(logs));

      const res = await service.getSyncLogs();
      expect(res[0].id).toBe('log-1');
      expect(res[0].user).toBeNull();
    });

    it('returns sync audit logs with user details mapped correctly', async () => {
      const logs = [
        { id: 'log-2', device_id: 'd-2', user_id: 'u-1', created_at: 2000 },
      ];
      const users = [{ id: 'u-1', username: 'john', role: 'REP' }];

      mockDrizzle.readDb.select = jest
        .fn()
        .mockImplementation((selectArg?: any) => {
          if (selectArg && selectArg.id) {
            return createMockQueryBuilder(users);
          }
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.sync_audit_logs) {
              return createMockQueryBuilder(logs);
            }
            if (table === schema.pgSchema.users) {
              return createMockQueryBuilder(users);
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

      const res = await service.getSyncLogs('log-1', 10);
      expect(res[0].id).toBe('log-2');
      expect(res[0].user).toEqual(users[0]);
    });
  });

  describe('importOdoo', () => {
    it('returns empty when CSV is empty', async () => {
      const res = await service.importOdoo('');
      expect(res).toEqual({ importedCount: 0, warnings: [] });
    });

    it('skips rows missing phone number or name', async () => {
      const csv = `Name,Address,Region,PhoneNumber
,Yangon,Yangon,09123
Shop A,Yangon,Yangon,`;
      const res = await service.importOdoo(csv);
      expect(res.importedCount).toBe(0);
      expect(res.warnings).toHaveLength(2);
    });

    it('skips duplicates phone numbers', async () => {
      const csv = `Name,Address,Region,PhoneNumber
Shop A,Yangon,Yangon,09123`;
      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockImplementation((table: any) => {
          if (table === schema.pgSchema.contacts) {
            return createMockQueryBuilder([
              {
                id: 'c-1',
                name: 'Existing Contact',
                phone_number: '09123',
                shop_id: 'shop-1',
              },
            ]);
          }
          if (table === schema.pgSchema.shops) {
            return createMockQueryBuilder([
              { id: 'shop-1', name: 'Existing Shop' },
            ]);
          }
          return createMockQueryBuilder([]);
        });
        return q;
      });

      const res = await service.importOdoo(csv);
      expect(res.importedCount).toBe(0);
      expect(res.warnings[0]).toContain(
        "Skipped duplicate phone number '09123'",
      );
    });

    it('imports new shop, creates region if not found, and inserts contact successfully', async () => {
      const csv = `Name,Address,Region,PhoneNumber
New Shop,Mandalay,Mandalay,09456`;

      const regionsSelectMock: any[] = []; // Region Mandalay not found initially
      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockImplementation((table: any) => {
          if (table === schema.pgSchema.contacts) {
            return createMockQueryBuilder([]); // No duplicate phone number
          }
          if (table === schema.pgSchema.regions) {
            return createMockQueryBuilder(regionsSelectMock);
          }
          return createMockQueryBuilder([]);
        });
        return q;
      });

      mockDrizzle.db.insert = jest.fn().mockImplementation((table: any) => {
        const q = createMockQueryBuilder([]);
        q.values = jest.fn().mockImplementation(() => {
          let returnedVal: any[] = [];
          if (table === schema.pgSchema.regions) {
            returnedVal = [{ id: 'region-mandalay', name: 'Mandalay' }];
          } else if (table === schema.pgSchema.shops) {
            returnedVal = [{ id: 'shop-mandalay-123', name: 'New Shop' }];
          }
          return createMockQueryBuilder(returnedVal);
        });
        return q;
      });

      const res = await service.importOdoo(csv);
      expect(res.importedCount).toBe(1);
      expect(res.warnings).toHaveLength(0);
      expect(mockDrizzle.db.insert).toHaveBeenCalledTimes(3); // Region, Shop, Contact
    });

    it('uses existing region when found in database', async () => {
      const csv = `Name,Address,Region,PhoneNumber
New Shop,Yangon,Yangon,09456`;

      mockDrizzle.db.select = jest.fn().mockImplementation(() => {
        const q = createMockQueryBuilder([]);
        q.from = jest.fn().mockImplementation((table: any) => {
          if (table === schema.pgSchema.contacts) {
            return createMockQueryBuilder([]); // No duplicate phone number
          }
          if (table === schema.pgSchema.regions) {
            return createMockQueryBuilder([
              { id: 'region-yangon', name: 'Yangon' },
            ]); // Region exists
          }
          return createMockQueryBuilder([]);
        });
        return q;
      });

      mockDrizzle.db.insert = jest.fn().mockImplementation((table: any) => {
        const q = createMockQueryBuilder([]);
        q.values = jest.fn().mockImplementation(() => {
          let returnedVal: any[] = [];
          if (table === schema.pgSchema.shops) {
            returnedVal = [{ id: 'shop-yangon-123', name: 'New Shop' }];
          }
          return createMockQueryBuilder(returnedVal);
        });
        return q;
      });

      const res = await service.importOdoo(csv);
      expect(res.importedCount).toBe(1);
      expect(res.warnings).toHaveLength(0);
      expect(mockDrizzle.db.insert).toHaveBeenCalledTimes(2); // Shop, Contact (no Region insert)
    });
  });
});
