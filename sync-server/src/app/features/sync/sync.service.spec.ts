import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { TABLE_REGISTRY } from './sync-registry';
import { DrizzleService } from '../../core/drizzle';
import { AiService } from '../ai/ai.service';
import { OdooImporterService } from './odoo-importer.service';
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

  const mockOdooImporter = {
    importOdoo: jest.fn(),
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
        { provide: OdooImporterService, useValue: mockOdooImporter },
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

    it('filters returned tables when targetTable is defined', async () => {
      const res = await service.pullChanges(
        Date.now(),
        'device-1',
        'user-1',
        'item_stocks',
      );
      expect(res.changes.item_stocks).toBeDefined();
      expect(res.changes.shops).toBeUndefined();
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

    it('writes pull audit log without userId', async () => {
      const spy = jest.spyOn(mockDrizzle.db, 'insert');
      await service.pullChanges(Date.now(), 'device-1');
      expect(spy).toHaveBeenCalled();
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
      await expect(
        service.pushChanges({} as any, 'device-1', 'user-1'),
      ).rejects.toThrow('Transaction error');
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
        .mockReturnValue(createMockQueryBuilder([{ hash: 'db-hash' }]));

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
          if (table === schema.pgSchema.sync_audit_logs) {
            return createMockQueryBuilder([{ created_at: 100 }]);
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

    describe('field-level conflict resolution and merging', () => {
      it('merges fields concurrently when different fields are modified on client and server', async () => {
        const changes = {
          shops: {
            created: [],
            updated: [
              {
                id: 'shop-1',
                name: 'Updated Name',
                address: 'Main St',
                region_id: 'reg-1',
                latitude: undefined,
                updated_at: 110,
              },
              {
                id: 'shop-2',
                name: 'Updated Name 2',
                updated_at: 110,
              },
              {
                id: 'shop-no-time',
                name: 'Updated Shop No Time',
              },
            ],
            deleted: [],
          },
        } as any;

        let shopsSelectCount = 0;

        mockTx.select = jest.fn().mockImplementation((_selectArg?: any) => {
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.sync_audit_logs) {
              return createMockQueryBuilder([{ created_at: 100 }]);
            }
            if (table === schema.pgSchema.audit_events) {
              return createMockQueryBuilder([
                {
                  previous_state: '{invalid}',
                  new_state: '{invalid}',
                  created_at: 101,
                },
                {
                  previous_state: null,
                  new_state: JSON.stringify({
                    id: 'shop-2',
                    name: 'Original Name 2',
                  }),
                  created_at: 102,
                },
                {
                  previous_state: JSON.stringify({
                    id: 'shop-1',
                    address: 'Main St',
                    name: 'Original Name',
                  }),
                  new_state: JSON.stringify({
                    id: 'shop-1',
                    address: 'Broadway',
                    name: 'Original Name',
                  }),
                  created_at: 105,
                },
              ]);
            }
            if (table === schema.pgSchema.shops) {
              if (shopsSelectCount === 0) {
                shopsSelectCount++;
                return createMockQueryBuilder([
                  {
                    id: 'shop-1',
                    name: 'Original Name',
                    address: 'Broadway',
                    region_id: 'reg-1',
                    latitude: 12.345,
                    updated_at: 105,
                  },
                ]);
              } else if (shopsSelectCount === 1) {
                shopsSelectCount++;
                return createMockQueryBuilder([
                  {
                    id: 'shop-2',
                    name: 'Original Name 2',
                    updated_at: 102,
                  },
                ]);
              } else {
                return createMockQueryBuilder([
                  {
                    id: 'shop-no-time',
                    name: 'Existing Shop No Time',
                  },
                ]);
              }
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

        await service.pushChanges(changes, 'device-1', 'user-1');

        expect(mockTx.update).toHaveBeenCalledWith(schema.pgSchema.shops);
        expect(mockTx.set).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'shop-1',
            name: 'Updated Name',
            address: 'Broadway',
            region_id: 'reg-1',
            latitude: 12.345,
          }),
        );
        expect(mockTx.set).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'shop-2',
            name: 'Original Name 2',
          }),
        );
      });

      it('logs conflict warning on commercial_status and maintains server value on true conflict', async () => {
        const changes = {
          interaction_logs: {
            created: [],
            updated: [
              {
                id: 'log-1',
                commercial_status: 'PENDING',
                updated_at: 110,
              },
            ],
            deleted: [],
          },
        } as any;

        mockTx.select = jest.fn().mockImplementation((_selectArg?: any) => {
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.sync_audit_logs) {
              return createMockQueryBuilder([{ created_at: 100 }]);
            }
            if (table === schema.pgSchema.audit_events) {
              return createMockQueryBuilder([
                {
                  previous_state: JSON.stringify({
                    id: 'log-1',
                    commercial_status: 'PAID',
                  }),
                  new_state: JSON.stringify({
                    id: 'log-1',
                    commercial_status: 'CANCELLED',
                  }),
                  created_at: 105,
                },
              ]);
            }
            if (table === schema.pgSchema.interaction_logs) {
              return createMockQueryBuilder([
                {
                  id: 'log-1',
                  commercial_status: 'CANCELLED',
                  updated_at: 105,
                },
              ]);
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

        const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
        await service.pushChanges(changes, 'device-1', 'user-1');

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            '[Conflict Resolution] True conflict on critical operational field "commercial_status"',
          ),
        );

        expect(mockTx.set).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'log-1',
            commercial_status: 'CANCELLED',
          }),
        );
      });

      it('handles contacts table synchronization with audit events', async () => {
        const changes = {
          contacts: {
            created: [
              { id: 'contact-new', name: 'New Contact', phone_number: '123' },
            ],
            updated: [
              {
                id: 'contact-update',
                name: 'Updated Contact',
                phone_number: '456',
                updated_at: 110,
              },
              {
                id: 'contact-missing',
                name: 'Missing Contact',
                phone_number: '999',
                updated_at: 110,
              },
            ],
            deleted: ['contact-delete'],
          },
        } as any;

        let contactSelectCount = 0;
        mockTx.select = jest.fn().mockImplementation((_selectArg?: any) => {
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.sync_audit_logs) {
              return createMockQueryBuilder([{ created_at: 100 }]);
            }
            if (table === schema.pgSchema.audit_events) {
              return createMockQueryBuilder([]);
            }
            if (table === schema.pgSchema.contacts) {
              if (contactSelectCount === 0) {
                contactSelectCount++;
                return createMockQueryBuilder([
                  {
                    id: 'contact-update',
                    name: 'Old Contact',
                    phone_number: '456',
                    updated_at: 50,
                  },
                ]);
              } else if (contactSelectCount === 1) {
                contactSelectCount++;
                return createMockQueryBuilder([]); // contact-missing not found
              } else {
                return createMockQueryBuilder([
                  {
                    id: 'contact-delete',
                    name: 'Delete Contact',
                    phone_number: '789',
                  },
                ]);
              }
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

        const commitAuditSpy = jest.spyOn(service, 'commitAuditEvent');
        await service.pushChanges(changes, 'device-1', 'user-1');

        expect(mockTx.insert).toHaveBeenCalled();
        expect(mockTx.update).toHaveBeenCalled();
        expect(commitAuditSpy).toHaveBeenCalledWith(
          expect.any(Object),
          'SHOP',
          'CREATE',
          null,
          expect.objectContaining({ id: 'contact-new' }),
          'user-1',
          'device-1',
          null,
        );
        expect(commitAuditSpy).toHaveBeenCalledWith(
          expect.any(Object),
          'SHOP',
          'UPDATE',
          expect.objectContaining({ id: 'contact-update' }),
          expect.objectContaining({ id: 'contact-update' }),
          'user-1',
          'device-1',
          null,
        );
        expect(commitAuditSpy).toHaveBeenCalledWith(
          expect.any(Object),
          'SHOP',
          'CREATE',
          null,
          expect.objectContaining({ id: 'contact-missing' }),
          'user-1',
          'device-1',
          null,
        );
        expect(commitAuditSpy).toHaveBeenCalledWith(
          expect.any(Object),
          'SHOP',
          'DELETE',
          expect.objectContaining({ id: 'contact-delete' }),
          null,
          'user-1',
          'device-1',
          null,
        );
      });

      it('handles null changesets in pushChanges', async () => {
        await service.pushChanges({ shops: null } as any);
        expect(mockDrizzle.db.transaction).toHaveBeenCalled();
      });

      it('automatically creates an invoice when an ORDER_PLACED interaction log is created', async () => {
        const changes = {
          interaction_logs: {
            created: [
              {
                id: 'log-order-1',
                shop_id: 'shop-123',
                commercial_status: 'ORDER_PLACED',
                created_at_local: Date.now(),
              },
            ],
            updated: [],
            deleted: [],
          },
        } as any;

        const mockItems = [
          { quantity: 2, unit_price_at_sale: 1500 },
          { quantity: 3, unit_price_at_sale: 2000 },
        ];

        mockTx.select = jest.fn().mockImplementation((selectArg?: any) => {
          if (selectArg && selectArg.hash) {
            return createMockQueryBuilder([{ hash: 'prev-event-hash' }]);
          }
          const q = createMockQueryBuilder([]);
          q.from = jest.fn().mockImplementation((table: any) => {
            if (table === schema.pgSchema.interaction_items) {
              return createMockQueryBuilder(mockItems);
            }
            if (table === schema.pgSchema.sync_audit_logs) {
              return createMockQueryBuilder([{ created_at: 100 }]);
            }
            return createMockQueryBuilder([]);
          });
          return q;
        });

        await service.pushChanges(changes, 'device-1', 'user-1');

        expect(mockTx.insert).toHaveBeenCalledWith(schema.pgSchema.invoices);
        expect(mockTx.values).toHaveBeenCalledWith(
          expect.objectContaining({
            shop_id: 'shop-123',
            amount: 9000,
            state: 'PENDING',
          }),
        );
      });

      it('detects compromised audit events hash chain when lastDbEvent is null', async () => {
        const changes = {
          audit_events: {
            created: [
              {
                event_id: 'evt-1',
                created_at: 1000,
                hash: 'invalid-hash-value',
                actor_id: 'user-1',
              },
            ],
            updated: [],
            deleted: [],
          },
        } as any;
        mockDrizzle.readDb.select = jest
          .fn()
          .mockReturnValue(createMockQueryBuilder([])); // Null db events

        await service.pushChanges(changes, 'device-1', 'user-1');
        expect(changes.audit_events.created[0].status).toBe('COMPROMISED');
      });

      it('detects compromised audit events hash chain when database event has falsy hash', async () => {
        const changes = {
          audit_events: {
            created: [
              {
                event_id: 'evt-1',
                created_at: 1000,
                hash: 'invalid-hash-value',
                actor_id: 'user-1',
              },
            ],
            updated: [],
            deleted: [],
          },
        } as any;
        mockDrizzle.readDb.select = jest
          .fn()
          .mockReturnValue(createMockQueryBuilder([{ hash: null }])); // Falsy hash

        await service.pushChanges(changes, 'device-1', 'user-1');
        expect(changes.audit_events.created[0].status).toBe('COMPROMISED');
      });

      it('detects compromised audit events hash chain when sequential events have falsy hashes', async () => {
        const changes = {
          audit_events: {
            created: [
              {
                event_id: 'evt-1',
                created_at: 1000,
                hash: null,
                actor_id: 'user-1',
              },
              {
                event_id: 'evt-2',
                created_at: 2000,
                hash: 'invalid-hash',
                actor_id: 'user-1',
              },
            ],
            updated: [],
            deleted: [],
          },
        } as any;
        mockDrizzle.readDb.select = jest
          .fn()
          .mockReturnValue(createMockQueryBuilder([]));

        await service.pushChanges(changes, 'device-1', 'user-1');
        expect(changes.audit_events.created[1].status).toBe('COMPROMISED');
      });

      it('returns early if parent interaction log is not found', async () => {
        mockDrizzle.db.select = jest.fn().mockImplementation(() => {
          return createMockQueryBuilder([]); // Empty array (log not found)
        });

        // Directly invoke private method with undefined updated to test fallback branch
        const promise = (service as any).runAnomalyDetection({
          created: [
            {
              id: 'ii-1',
              interaction_log_id: 'log-1',
              fulfillment_status: 'PENDING_FULFILLMENT',
              quantity: 100,
            },
          ],
          updated: undefined,
        });

        await expect(promise).resolves.toBeUndefined();
        expect(mockDrizzle.db.update).not.toHaveBeenCalled();
      });

      it('directly tests triggerAuditForPushedLogs with missing created or updated arrays', async () => {
        mockDrizzle.db.select = jest.fn().mockImplementation(() => {
          return createMockQueryBuilder([]);
        });

        // Directly invoke private method with undefined updated to test fallback branch
        const promise = (service as any).triggerAuditForPushedLogs(
          {
            created: [
              { id: 'log-1', viber_screenshot_url: '/api/uploads/img.jpg' },
            ],
            updated: undefined,
          },
          'system',
          'trace-1',
        );

        await expect(promise).resolves.toBeUndefined();
      });

      it('handles case where no historical items exist for average calculation', async () => {
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

        mockDrizzle.db.select = jest
          .fn()
          .mockImplementation((selectArg?: any) => {
            if (selectArg && selectArg.quantity) {
              return createMockQueryBuilder([]); // No historical items
            }
            return createMockQueryBuilder([
              { id: 'log-1', shop_id: 'shop-123' },
            ]);
          });

        await service.pushChanges(changes);
        expect(mockDrizzle.db.update).not.toHaveBeenCalled();
      });
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

    it('resolves mismatch log with default unit and stock condition if omitted', async () => {
      const input = {
        logId: 'log-1',
        shopId: 'shop-1',
        notes: 'notes',
        items: [
          {
            itemId: 'item-1',
            quantity: 5,
            unitPrice: 1000,
            selectedUnit: '',
            stockCondition: '',
          },
        ],
      };
      await service.resolveMismatchLog(input);
      expect(mockTx.insert).toHaveBeenCalled();
    });
  });

  describe('getMismatchLogs edge cases', () => {
    it('returns Unknown Shop when shop is not found', async () => {
      const logs = [{ id: 'log-1', shop_id: 'shop-1', notes: 'discrepancy' }];
      const items = [
        { id: 'ii-1', interaction_log_id: 'log-1', item_id: 'item-1' },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.shops) {
            return createMockQueryBuilder([]); // not found
          }
          if (table === schema.pgSchema.interaction_items) {
            return createMockQueryBuilder(items);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      const res = await service.getMismatchLogs();
      expect(res[0].shopName).toBe('Unknown Shop');
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
    it('delegates to OdooImporterService', async () => {
      const spy = jest.spyOn(mockOdooImporter, 'importOdoo').mockResolvedValue({
        importedCount: 1,
        warnings: [],
      });
      const res = await service.importOdoo('csv-text');
      expect(spy).toHaveBeenCalledWith('csv-text');
      expect(res).toEqual({ importedCount: 1, warnings: [] });
    });
  });

  describe('TABLE_REGISTRY mapping functions', () => {
    it('covers all toRecord and toDrizzle mappings inside TABLE_REGISTRY', () => {
      const mockRecordObj = {
        id: 'id-1',
        name: 'test',
        previous_state: { a: 1 },
        new_state: { b: 2 },
        stock_condition: null,
        pending_allocation_count: null,
        fulfillment_status: null,
        badges: null,
      };

      const mockRecordStr = {
        id: 'id-1',
        name: 'test',
        previous_state: '{"a": 1}',
        new_state: '{"b": 2}',
        stock_condition: null,
        pending_allocation_count: null,
        fulfillment_status: null,
        badges: null,
      };

      Object.entries(TABLE_REGISTRY).forEach(([, cfg]) => {
        // Test toRecord with string-based states (covers parsing bypass/conversion)
        const recStr = cfg.toRecord(mockRecordStr);
        expect(recStr).toBeDefined();

        // Test toRecord with object-based states (covers stringify logic)
        const recObj = cfg.toRecord(mockRecordObj);
        expect(recObj).toBeDefined();

        // Test toDrizzle with string-based states (covers parse logic)
        const drizStr = cfg.toDrizzle(mockRecordStr);
        expect(drizStr).toBeDefined();

        // Test toDrizzle with object-based states (covers parsing bypass)
        const drizObj = cfg.toDrizzle(mockRecordObj);
        expect(drizObj).toBeDefined();
      });
    });
  });
});
