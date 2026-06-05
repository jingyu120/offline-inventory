import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { DrizzleService } from '../../core/drizzle';
import { AppConfig } from '../../core/config/app-config';
import { AiQueueService } from '../../core/queue/ai-queue.service';
import axios from 'axios';
import * as fs from 'fs';
import * as schema from '@burma-inventory/shared-types';

jest.mock('axios');
jest.mock('fs', () => {
  return {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    watch: jest.fn().mockReturnValue({ close: jest.fn() }),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-image-data')),
    writeFileSync: jest.fn(),
  };
});

// Helper to create chained query builder mock
function createMockQueryBuilder(resolvedValue: any) {
  const query: any = Promise.resolve(resolvedValue);
  query.select = jest.fn().mockReturnValue(query);
  query.from = jest.fn().mockReturnValue(query);
  query.innerJoin = jest.fn().mockReturnValue(query);
  query.where = jest.fn().mockReturnValue(query);
  query.orderBy = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.insert = jest.fn().mockReturnValue(query);
  query.values = jest.fn().mockReturnValue(query);
  query.onConflictDoNothing = jest.fn().mockReturnValue(query);
  query.update = jest.fn().mockReturnValue(query);
  query.set = jest.fn().mockReturnValue(query);
  query.delete = jest.fn().mockReturnValue(query);
  return query;
}

function createMockRejectedQueryBuilder(error: Error) {
  const query: any = Promise.reject(error);
  query.select = jest.fn().mockReturnValue(query);
  query.from = jest.fn().mockReturnValue(query);
  query.innerJoin = jest.fn().mockReturnValue(query);
  query.where = jest.fn().mockReturnValue(query);
  query.orderBy = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.insert = jest.fn().mockReturnValue(query);
  query.values = jest.fn().mockReturnValue(query);
  query.onConflictDoNothing = jest.fn().mockReturnValue(query);
  query.update = jest.fn().mockReturnValue(query);
  query.set = jest.fn().mockReturnValue(query);
  query.delete = jest.fn().mockReturnValue(query);
  query.catch(() => undefined);
  return query;
}

describe('AiService', () => {
  let service: AiService;
  let mockDrizzle: { db: any; readDb: any };
  let mockTx: any;

  const mockAppConfig = {
    uploadsDir: 'uploads',
    uploadsWatcherDelayMs: 100,
    uploadsUrlPrefix: 'http://localhost/uploads/',
    ollamaModel: 'gemma4',
    ollamaTimeoutMs: 5000,
    gemmaApiUrl: 'http://localhost:11434',
  };

  const mockAiQueueService = {
    addScreenshotJob: jest.fn().mockResolvedValue(undefined),
    addEodJob: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Recreate fresh mock objects to prevent test leakage
    mockTx = createMockQueryBuilder([{ hash: 'prev-event-hash' }]);
    mockDrizzle = {
      db: createMockQueryBuilder([]),
      readDb: createMockQueryBuilder([]),
    };
    mockDrizzle.db.transaction = jest
      .fn()
      .mockImplementation((cb) => cb(mockTx));

    (fs.existsSync as jest.Mock).mockReset();
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: AppConfig, useValue: mockAppConfig },
        { provide: AiQueueService, useValue: mockAiQueueService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startUploadsWatcher & handleNewFileInUploads', () => {
    it('sets up FS watch on init and handles module destroy', () => {
      service.onModuleInit();
      expect(fs.watch).toHaveBeenCalled();
      service.onModuleDestroy();
    });

    it('creates uploads directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // uploadsDir check
      service.onModuleInit();
      expect(fs.mkdirSync).toHaveBeenCalled();
      service.onModuleDestroy();
    });

    it('sets up FS watch and processes file when renamed', async () => {
      jest.useFakeTimers();

      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          viber_screenshot_url: 'http://localhost/uploads/test-file.png',
        },
      ];
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder(logs));

      service.onModuleInit();

      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][1];
      watchCallback('rename', 'test-file.png');

      // Fast-forward time
      jest.advanceTimersByTime(100);

      // Let any promises resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(mockAiQueueService.addScreenshotJob).toHaveBeenCalledWith(
        'log-1',
        expect.stringContaining('test-file.png'),
      );

      jest.useRealTimers();
      service.onModuleDestroy();
    });

    it('does not process rename events if file does not exist after delay', async () => {
      jest.useFakeTimers();

      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // startUploadsWatcher uploadDir check
        .mockReturnValueOnce(false); // setTimeout filePath exists check

      service.onModuleInit();

      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][1];
      watchCallback('rename', 'missing-file.png');

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(mockAiQueueService.addScreenshotJob).not.toHaveBeenCalled();

      jest.useRealTimers();
      service.onModuleDestroy();
    });
  });

  describe('dispatchModel & quantization formatting', () => {
    it('handles dispatchModel quantization formats', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { response: '{}' } });

      // With colon in model name
      await (service as any).dispatchModel(
        'prompt',
        [],
        'json',
        'model:latest',
        'q4',
      );
      expect(axios.post).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'model:q4' }),
        expect.any(Object),
      );

      // Without colon in model name
      await (service as any).dispatchModel(
        'prompt',
        [],
        'json',
        'modelOnly',
        'q5',
      );
      expect(axios.post).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'modelOnly:q5' }),
        expect.any(Object),
      );
    });

    it('returns null if Ollama response is empty or malformed', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
      const res = await (service as any).dispatchModel('prompt');
      expect(res).toBeNull();
    });
  });

  describe('parseInteractionNote', () => {
    it('returns parsed JSON keys when Ollama responds successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"commercialStatus": "ORDER_PLACED", "items": [{"sku": "SKU-1", "quantity": 5}], "summary": "Ordered SKU-1"}',
        },
      });

      const res = await service.parseInteractionNote('ordered 5 of SKU-1');
      expect(res.commercialStatus).toBe('ORDER_PLACED');
      expect(res.items).toEqual([{ sku: 'SKU-1', quantity: 5 }]);
      expect(res.summary).toBe('Ordered SKU-1');
    });

    it('falls back to local regex heuristics when Ollama fails or returns invalid JSON', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const res = await service.parseInteractionNote(
        'premium beer order placed',
      );
      expect(res.commercialStatus).toBe('ORDER_PLACED');
      expect(res.items).toEqual([{ sku: 'SKU-PB-640', quantity: 5 }]);
    });

    it('heuristics fall back to other statuses based on note context', async () => {
      (axios.post as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const resInterested = await service.parseInteractionNote(
        'client showed interest',
      );
      expect(resInterested.commercialStatus).toBe('INTERESTED');

      const resRejected = await service.parseInteractionNote(
        'client reject offer, not interested',
      );
      expect(resRejected.commercialStatus).toBe('NOT_INTERESTED');

      const resDefault =
        await service.parseInteractionNote('just standard talk');
      expect(resDefault.commercialStatus).toBe('FOLLOWED_UP');
    });
  });

  describe('verifyViberScreenshot', () => {
    it('returns verified status from Ollama JSON output', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response: '{"verified": true, "extractedText": "Confirmed ok"}',
        },
      });

      const res = await service.verifyViberScreenshot('mockBase64');
      expect(res.verified).toBe(true);
      expect(res.extractedText).toBe('Confirmed ok');
    });

    it('falls back to default true verification on JSON parsing failure or empty output', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response: 'invalid-non-json-string',
        },
      });

      const res = await service.verifyViberScreenshot('mockBase64');
      expect(res.verified).toBe(true);
      expect(res.extractedText).toBe(
        'Order confirmed for 5 Premium Beers (Mock Fallback)',
      );
    });
  });

  describe('ocrInvoice', () => {
    it('matches OCR items against database SKUs', async () => {
      const dbItems = [
        { id: 'item-100', sku: 'SKU-BEER', name: 'Myanmar Beer' },
      ];
      const builder = createMockQueryBuilder(dbItems);
      mockDrizzle.readDb.select = jest.fn().mockReturnValue(builder);

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"items": [{"name": "beer", "quantity": 10}], "explanation": "found beer"}',
        },
      });

      const res = await service.ocrInvoice('mockBase64');
      expect(res.success).toBe(true);
      expect(res.items[0]).toEqual({
        itemId: 'item-100',
        name: 'Myanmar Beer',
        sku: 'SKU-BEER',
        quantity: 10,
      });
    });

    it('falls back to heuristics when OCR returns no items or JSON fails', async () => {
      const dbItems = [
        { id: 'item-1', sku: 'PB-640', name: 'Premium Beer' },
        { id: 'item-2', sku: 'ST-320', name: 'Special Stout' },
      ];
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder(dbItems));
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });

      const res = await service.ocrInvoice('mockBase64');
      expect(res.success).toBe(true);
      expect(res.items.length).toBe(2);
      expect(res.items[0].itemId).toBe('item-1');
      expect(res.items[1].itemId).toBe('item-2');
    });
  });

  describe('analyzeSentiment', () => {
    it('analyzes sentiment list and returns stable when empty', async () => {
      const res = await service.analyzeSentiment([]);
      expect(res.sentimentTrend).toBe('STABLE');
    });

    it('determines sentiment via Ollama when successful', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"sentimentTrend": "IMPROVING", "explanation": "Happy client"}',
        },
      });

      const res = await service.analyzeSentiment(['Client bought many items']);
      expect(res.sentimentTrend).toBe('IMPROVING');
    });

    it('falls back to heuristics with positive notes on Ollama failure', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
      const res = await service.analyzeSentiment([
        'delighted and happy good standard',
      ]);
      expect(res.sentimentTrend).toBe('IMPROVING');
    });

    it('falls back to heuristics with negative notes on Ollama failure', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
      const res = await service.analyzeSentiment([
        'angry client late and unhappy complain',
      ]);
      expect(res.sentimentTrend).toBe('DECLINING');
    });

    it('falls back to heuristics with stable notes on Ollama failure', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
      const res = await service.analyzeSentiment([
        'balanced operational notes',
      ]);
      expect(res.sentimentTrend).toBe('STABLE');
    });
  });

  describe('getDynamicQuotaOptimizations', () => {
    it('returns optimizations array when Ollama succeeds', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '[{"region": "Yangon", "currentQuota": 5, "suggestedQuota": 7, "reason": "growth"}]',
        },
      });

      const res = await service.getDynamicQuotaOptimizations();
      expect(res[0].region).toBe('Yangon');
    });

    it('falls back to default regional optimizations on Ollama error/invalid JSON', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
      const res = await service.getDynamicQuotaOptimizations();
      expect(res.length).toBe(2);
      expect(res[0].region).toBe('Shan State');
      expect(res[1].region).toBe('Yangon Division');
    });
  });

  describe('compileEod heuristics fallback', () => {
    it('uses EOD heuristics fallback when Ollama fails', async () => {
      const logs = [
        {
          id: 'log-1',
          notes: 'short',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
        {
          id: 'log-2',
          notes: 'this is a competitor discount check',
          commercial_status: 'FOLLOWED_UP',
          repUsername: 'rep1',
          shopName: 'Shop 2',
        },
        {
          id: 'log-3',
          notes: 'this is very delay and block construction notes',
          commercial_status: 'FOLLOWED_UP',
          repUsername: 'rep2',
          shopName: 'Shop 3',
        },
        {
          id: 'log-4',
          notes: 'expensive price notes here',
          commercial_status: 'FOLLOWED_UP',
          repUsername: 'rep2',
          shopName: 'Shop 4',
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users) {
            return createMockQueryBuilder([]);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });

      const res = await service.compileEod('2026-06-05');
      expect(res.topPerformingRep.username).toBe('rep1');
      expect(res.marketSynthesis).toContain('Competitor Activity');
      expect(res.marketSynthesis).toContain('Logistics Barriers');
      expect(res.marketSynthesis).toContain('Pricing Resistance');
      expect(res.complianceWarnings.length).toBe(1); // log-1 is short
    });
  });

  describe('processScreenshot', () => {
    it('performs audit check and updates database with audit log event', async () => {
      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          notes: 'mismatch',
          viber_screenshot_url: 'img.png',
        },
      ];
      const shops = [{ id: 'shop-1', name: 'Shop 1' }];
      const items = [{ id: 'item-1', name: 'Item 1', sku: 'SKU-1' }];

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(logs);
        if (callCount === 2) return createMockQueryBuilder(shops);
        return createMockQueryBuilder(items);
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response: '{"status": "MISMATCH", "explanation": "Qty mismatch"}',
        },
      });

      await service.processScreenshot('log-1', '/path/to/screenshot.png');
      expect(mockDrizzle.db.transaction).toHaveBeenCalled();
    });

    it('returns early if log is not found', async () => {
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValueOnce(createMockQueryBuilder([]));
      await expect(
        service.processScreenshot('non-existent-log'),
      ).resolves.toBeUndefined();
      expect(mockDrizzle.db.transaction).not.toHaveBeenCalled();
    });

    it('resolves filePath from URL if not provided directly', async () => {
      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          notes: 'mismatch',
          viber_screenshot_url: 'http://localhost/uploads/screenshot.png',
        },
      ];
      const shops = [{ id: 'shop-1', name: 'Shop 1' }];

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(logs);
        if (callCount === 2) return createMockQueryBuilder(shops);
        return createMockQueryBuilder([]);
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"status": "VERIFIED", "explanation": "Ok"}' },
      });

      await service.processScreenshot('log-1');
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('screenshot.png'),
      );
    });

    it('warns and returns early if URL is missing when filePath is omitted', async () => {
      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          notes: 'mismatch',
          viber_screenshot_url: null,
        },
      ];
      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(logs);
        return createMockQueryBuilder([]);
      });

      await expect(service.processScreenshot('log-1')).resolves.toBeUndefined();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('errors and returns early if screenshot file does not exist on disk', async () => {
      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          notes: 'mismatch',
          viber_screenshot_url: 'http://localhost/uploads/missing.png',
        },
      ];
      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(logs);
        return createMockQueryBuilder([]);
      });
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // file exists check fails

      await expect(service.processScreenshot('log-1')).resolves.toBeUndefined();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('handles offline fallback heuristics when Ollama response is empty', async () => {
      const logs = [
        {
          id: 'log-1',
          shop_id: 'shop-1',
          notes: 'mismatch wrong order',
          viber_screenshot_url: 'img.png',
        },
      ];
      const shops = [{ id: 'shop-1', name: 'Shop 1' }];

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(logs);
        if (callCount === 2) return createMockQueryBuilder(shops);
        return createMockQueryBuilder([]);
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: null }); // Ollama fails

      await service.processScreenshot('log-1', '/path/to/screenshot.png');
      expect(mockDrizzle.db.transaction).toHaveBeenCalled();
    });
  });

  describe('generateEodDigest', () => {
    it('compiles eod data and writes file', async () => {
      const logs = [
        {
          id: 'log-1',
          rep_id: 'rep-1',
          created_at_local: Date.now(),
          notes: 'mismatch',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
      ];
      const users = [{ id: 'rep-1', username: 'rep1' }];
      const quotas = [
        {
          target_visits: 5,
          target_phone: 2,
          target_viber: 1,
          effective_from: 100,
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users) {
            return createMockQueryBuilder(users);
          }
          if (table === schema.pgSchema.daily_quotas) {
            return createMockQueryBuilder(quotas);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"topPerformingRep": {"username": "rep1", "justification": "Good logs"}, "marketSynthesis": "Synthesis info", "complianceWarnings": [{"username": "rep1", "issue": "Brief logs"}]}',
        },
      });

      const res = await service.generateEodDigest('2026-06-04');
      expect(res.topPerformingRep).toContain('rep1');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('detects batch dumping and alerts YELLOW compliance', async () => {
      // 5 logs logged within 10 minutes
      const baseTime = Date.now();
      const logs = [
        {
          id: 'log-1',
          rep_id: 'rep-1',
          created_at_local: baseTime,
          notes: 'note text standard longer than 10',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
        {
          id: 'log-2',
          rep_id: 'rep-1',
          created_at_local: baseTime + 1000,
          notes: 'note text standard longer than 10',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 2',
        },
        {
          id: 'log-3',
          rep_id: 'rep-1',
          created_at_local: baseTime + 2000,
          notes: 'note text standard longer than 10',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 3',
        },
        {
          id: 'log-4',
          rep_id: 'rep-1',
          created_at_local: baseTime + 3000,
          notes: 'note text standard longer than 10',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 4',
        },
        {
          id: 'log-5',
          rep_id: 'rep-1',
          created_at_local: baseTime + 4000,
          notes: 'note text standard longer than 10',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 5',
        },
      ];
      const users = [{ id: 'rep-1', username: 'rep1' }];
      const quotas = [
        {
          target_visits: 10,
          target_phone: 10,
          target_viber: 10,
          effective_from: 100,
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users) {
            return createMockQueryBuilder(users);
          }
          if (table === schema.pgSchema.daily_quotas) {
            return createMockQueryBuilder(quotas);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"topPerformingRep": {"username": "rep1", "justification": "Good logs"}, "marketSynthesis": "Synthesis info", "complianceWarnings": []}',
        },
      });

      const res = await service.generateEodDigest('2026-06-04');
      expect(res.complianceScorecard[0].batchDumpingFlagged).toBe(true);
      expect(res.complianceScorecard[0].complianceStatus).toBe('YELLOW');
      expect(res.warnings).toContain(
        'Sales Rep rep1 flagged for end-of-day batch data dumping.',
      );
    });

    it('creates digest folder if missing and logs write errors', async () => {
      const logs = [
        {
          id: 'log-1',
          rep_id: 'rep-1',
          created_at_local: Date.now(),
          notes: 'mismatch',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
      ];
      const users = [{ id: 'rep-1', username: 'rep1' }];
      const quotas = [
        {
          target_visits: 5,
          target_phone: 2,
          target_viber: 1,
          effective_from: 100,
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users) {
            return createMockQueryBuilder(users);
          }
          if (table === schema.pgSchema.daily_quotas) {
            return createMockQueryBuilder(quotas);
          }
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"topPerformingRep": {"username": "rep1", "justification": "Good logs"}, "marketSynthesis": "Synthesis info", "complianceWarnings": []}',
        },
      });

      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // digest folder does not exist
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => undefined);

      await service.generateEodDigest('2026-06-04');
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write EOD digest file'),
        expect.any(Error),
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('Watcher and Heuristic Fallbacks', () => {
    it('handles FS watcher errors', () => {
      // Mock fs.watch to throw
      (fs.watch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Watch init failed');
      });
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => undefined);

      service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to start uploads directory watcher: Watch init failed',
        ),
      );

      loggerSpy.mockRestore();
      service.onModuleDestroy();
    });

    it('handles error thrown inside handleNewFileInUploads callback', async () => {
      jest.useFakeTimers();
      (fs.watch as jest.Mock).mockImplementationOnce((_dir, cb) => {
        // Trigger immediately on call
        setTimeout(() => cb('rename', 'error-trigger.png'), 10);
        return { close: jest.fn() };
      });
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValueOnce(
          createMockRejectedQueryBuilder(new Error('DB read error')),
        );
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => undefined);

      service.onModuleInit();
      jest.advanceTimersByTime(200);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error in uploads directory watcher for error-trigger.png: DB read error',
        ),
      );

      loggerSpy.mockRestore();
      jest.useRealTimers();
      service.onModuleDestroy();
    });

    it('returns early in handleNewFileInUploads if already processing', async () => {
      service['processingFiles'].add('processing-file.png');
      const res = await (service as any).handleNewFileInUploads(
        'processing-file.png',
        'path',
      );
      expect(res).toBeUndefined();
    });

    it('handles notes heuristics parsing catch block on invalid JSON', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-json:' },
      });
      const res = await service.parseInteractionNote(
        'ordered 5 of Premium Beer',
      );
      expect(res.commercialStatus).toBe('ORDER_PLACED');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse note JSON'),
      );
      loggerSpy.mockRestore();
    });

    it('handles invoice OCR parsing catch block on invalid JSON', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-ocr:' },
      });
      const res = await service.ocrInvoice('mockBase64');
      expect(res.success).toBe(true);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse invoice OCR JSON'),
      );
      loggerSpy.mockRestore();
    });

    it('handles sentiment analysis parsing catch block on invalid JSON', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-sentiment:' },
      });
      const res = await service.analyzeSentiment(['some notes']);
      expect(res.sentimentTrend).toBe('STABLE');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ollama sentiment analysis failed'),
      );
      loggerSpy.mockRestore();
    });

    it('handles compile EOD when rows list is empty', async () => {
      mockDrizzle.readDb.select = jest
        .fn()
        .mockReturnValue(createMockQueryBuilder([]));
      const res = await service.generateEodDigest('2026-06-04');
      expect(res.topPerformingRep).toBe('N/A');
      expect(res.marketSynthesis).toBe(
        'No sales interactions recorded today to synthesize.',
      );
    });

    it('handles compile EOD JSON parsing catch block on invalid JSON', async () => {
      const logs = [
        {
          id: 'log-1',
          rep_id: 'rep-1',
          notes: 'all good',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
      ];
      const users = [{ id: 'rep-1', username: 'rep1' }];
      const quotas = [
        {
          target_visits: 5,
          target_phone: 2,
          target_viber: 1,
          effective_from: 100,
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users)
            return createMockQueryBuilder(users);
          if (table === schema.pgSchema.daily_quotas)
            return createMockQueryBuilder(quotas);
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-eod:' },
      });
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);

      const res = await service.generateEodDigest('2026-06-04');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse EOD compile JSON'),
      );
      expect(res.marketSynthesis).toContain(
        'Market conditions operating stable',
      );
      loggerSpy.mockRestore();
    });

    it('handles fallback EOD insights and RED complianceStatus warnings', async () => {
      const logs = [
        {
          id: 'log-1',
          rep_id: 'rep-1',
          notes: 'normal report',
          commercial_status: 'ORDER_PLACED',
          repUsername: 'rep1',
          shopName: 'Shop 1',
        },
      ];
      const users = [
        { id: 'rep-1', username: 'rep1' },
        { id: 'rep-2', username: 'rep2' }, // rep2 has 0 logs, will be RED compliance
      ];
      const quotas = [
        {
          target_visits: 5,
          target_phone: 2,
          target_viber: 1,
          effective_from: 100,
        },
      ];

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users)
            return createMockQueryBuilder(users);
          if (table === schema.pgSchema.daily_quotas)
            return createMockQueryBuilder(quotas);
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"topPerformingRep": {"username": "N/A", "justification": ""}, "marketSynthesis": "", "complianceWarnings": []}',
        },
      });

      const res = await service.generateEodDigest('2026-06-04');
      expect(res.warnings).toContain(
        'Sales Rep rep2 failed to log any operational entries.',
      );
      expect(res.topPerformingRep).toContain('rep1');
    });

    it('handles rep complianceStatus GREEN when target achieved', async () => {
      const logs = [
        {
          id: 'l1',
          rep_id: 'rep-1',
          notes: 'note',
          repUsername: 'rep1',
          created_at_local: 100,
        },
        {
          id: 'l2',
          rep_id: 'rep-1',
          notes: 'note',
          repUsername: 'rep1',
          created_at_local: 200,
        },
      ];
      const users = [{ id: 'rep-1', username: 'rep1' }];
      const quotas = [
        {
          target_visits: 1,
          target_phone: 0,
          target_viber: 0,
          effective_from: 100,
        },
      ]; // target = 1

      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        const query = createMockQueryBuilder([]);
        query.from = jest.fn().mockImplementation((table) => {
          if (table === schema.pgSchema.users)
            return createMockQueryBuilder(users);
          if (table === schema.pgSchema.daily_quotas)
            return createMockQueryBuilder(quotas);
          return createMockQueryBuilder(logs);
        });
        return query;
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          response:
            '{"topPerformingRep": {"username": "rep1", "justification": ""}, "marketSynthesis": "", "complianceWarnings": []}',
        },
      });

      const res = await service.generateEodDigest('2026-06-04');
      expect(res.complianceScorecard[0].complianceStatus).toBe('GREEN');
    });

    it('handles screenshot audit result JSON parsing catch block on invalid JSON', async () => {
      const log = { id: 'log-1', notes: 'mismatch flagged', rep_id: 'rep-1' };

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder([log]); // logs
        if (callCount === 2)
          return createMockQueryBuilder([{ id: 'shop-1', name: 'Shop 1' }]); // shops
        if (callCount === 3) return createMockQueryBuilder([]); // interactionItems
        return createMockQueryBuilder([]);
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-screenshot-json:' },
      });
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);

      await service.processScreenshot('log-1', 'uploads/screenshot.png');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse screenshot audit result JSON'),
      );
      loggerSpy.mockRestore();
    });

    it('handles offline fallback heuristics for differing / mismatch / wrong notes', async () => {
      // Offline fallback: axios fails (throws or returns null response)
      (axios.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      // log has "differ" in notes
      const log = { id: 'log-1', notes: 'quantities differ', rep_id: 'rep-1' };

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder([log]); // logs
        if (callCount === 2)
          return createMockQueryBuilder([{ id: 'shop-1', name: 'Shop 1' }]); // shops
        if (callCount === 3) return createMockQueryBuilder([]); // interactionItems
        return createMockQueryBuilder([]);
      });

      await service.processScreenshot('log-1', 'uploads/screenshot.png');
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('handles default offline fallback verified status', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      // normal log note
      const log = { id: 'log-1', notes: 'all matches', rep_id: 'rep-1' };

      let callCount = 0;
      mockDrizzle.readDb.select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder([log]); // logs
        if (callCount === 2)
          return createMockQueryBuilder([{ id: 'shop-1', name: 'Shop 1' }]); // shops
        if (callCount === 3) return createMockQueryBuilder([]); // interactionItems
        return createMockQueryBuilder([]);
      });

      await service.processScreenshot('log-1', 'uploads/screenshot.png');
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('handles quota optimizations JSON parsing catch block on invalid JSON', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { response: '{"invalid-quota-json:' },
      });
      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);

      const res = await service.getDynamicQuotaOptimizations();
      expect(res).toHaveLength(2); // returns fallback list of 2 items
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse quota optimizations JSON'),
      );
      loggerSpy.mockRestore();
    });
  });
});
