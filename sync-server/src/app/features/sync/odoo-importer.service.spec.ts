import { Test, TestingModule } from '@nestjs/testing';
import { OdooImporterService } from './odoo-importer.service';
import { DrizzleService } from '../../core/drizzle';
import * as schema from '@burma-inventory/shared-types';

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

describe('OdooImporterService', () => {
  let service: OdooImporterService;
  let mockDrizzle: { db: any; readDb: any };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDrizzle = {
      db: createMockQueryBuilder([]),
      readDb: createMockQueryBuilder([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OdooImporterService,
        { provide: DrizzleService, useValue: mockDrizzle },
      ],
    }).compile();

    service = module.get<OdooImporterService>(OdooImporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
"New Shop",Mandalay,Mandalay,"09456"`;

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
