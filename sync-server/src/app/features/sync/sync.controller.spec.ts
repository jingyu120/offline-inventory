import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AiQueueService } from '../../core/queue/ai-queue.service';
import { AppConfig } from '../../core/config/app-config';
import { InvalidationBroadcastEngine } from './invalidation-broadcast.engine';
import { Response } from 'express';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';

jest.mock('multer', () => {
  const original = jest.requireActual('multer');
  const mockMulter = jest
    .fn()
    .mockImplementation((...args) => original(...args));
  Object.assign(mockMulter, original);
  (mockMulter as any).diskStorage = jest.fn().mockImplementation((opts) => {
    (globalThis as any).capturedStorageOpts = opts;
    return original.diskStorage(opts);
  });
  return mockMulter;
});

jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFile: jest.fn().mockImplementation((path, data, cb) => cb(null)),
    promises: {
      writeFile: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: SyncService;
  let aiQueueService: AiQueueService;

  const mockSyncService = {
    pullChanges: jest.fn().mockResolvedValue({ changes: {}, timestamp: 1234 }),
    pushChanges: jest.fn().mockResolvedValue(undefined),
    checkIdempotency: jest.fn().mockResolvedValue(null),
    saveIdempotency: jest.fn().mockResolvedValue(undefined),
    importOdoo: jest.fn().mockResolvedValue({ imported: 5 }),
    getSyncLogs: jest.fn().mockResolvedValue([]),
    updateCompetitorInsightPhoto: jest.fn().mockResolvedValue('url-photo'),
    updateInteractionLogScreenshot: jest
      .fn()
      .mockResolvedValue('url-screenshot'),
    getContactByPhone: jest.fn().mockResolvedValue({ shop_id: 'shop-123' }),
    createViberLog: jest.fn().mockResolvedValue(undefined),
  };

  const mockAiQueueService = {
    addScreenshotJob: jest.fn().mockResolvedValue(undefined),
  };

  const mockAppConfig = {
    uploadsDir: 'uploads',
    getUniqueSuffix: () => 'suffix-123',
    mapCacheMaxAge: 3600,
    osmTileUrlTemplate: 'http://osm',
    osmThrottleDelayMs: 0,
    osmUserAgent: 'agent',
  };

  const mockInvalidationBroadcastEngine = {
    getInvalidations: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
  };

  beforeAll(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as any);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        { provide: SyncService, useValue: mockSyncService },
        { provide: AiQueueService, useValue: mockAiQueueService },
        { provide: AppConfig, useValue: mockAppConfig },
        {
          provide: InvalidationBroadcastEngine,
          useValue: mockInvalidationBroadcastEngine,
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    syncService = module.get<SyncService>(SyncService);
    aiQueueService = module.get<AiQueueService>(AiQueueService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('multer diskStorage callbacks', () => {
    it('covers the destination storage callback', () => {
      const opts = (globalThis as any).capturedStorageOpts;
      expect(opts).toBeDefined();
      const mockCb = jest.fn();

      // Directory exists
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      opts.destination(null, null, mockCb);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringContaining('uploads'),
      );

      // Directory does not exist
      mockCb.mockClear();
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      opts.destination(null, null, mockCb);
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringContaining('uploads'),
      );
    });

    it('covers the filename storage callback', () => {
      const opts = (globalThis as any).capturedStorageOpts;
      const mockCb = jest.fn();
      const file = { originalname: 'custom_file.png' };
      opts.filename(null, file, mockCb);
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^\d+-\d+\.png$/),
      );

      mockCb.mockClear();
      opts.filename(null, {}, mockCb);
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^\d+-\d+$/),
      );
    });
  });

  describe('liveInvalidations', () => {
    it('returns the getInvalidations observable from engine', () => {
      const mockObservable = { subscribe: jest.fn() };
      mockInvalidationBroadcastEngine.getInvalidations.mockReturnValueOnce(
        mockObservable,
      );
      const res = controller.liveInvalidations();
      expect(
        mockInvalidationBroadcastEngine.getInvalidations,
      ).toHaveBeenCalled();
      expect(res).toBe(mockObservable);
    });
  });

  describe('pullChanges', () => {
    it('calls pullChanges on service', async () => {
      const res = await controller.pullChanges(
        '1000',
        undefined,
        'dev-1',
        'user-1',
      );
      expect(syncService.pullChanges).toHaveBeenCalledWith(
        1000,
        'dev-1',
        'user-1',
      );
      expect(res).toEqual({ changes: {}, timestamp: 1234 });
    });
  });

  describe('pushChanges', () => {
    it('calls pushChanges on service and caches idempotency key', async () => {
      const body = {
        changes: { regions: { created: [], updated: [], deleted: [] } },
        device_id: 'dev-1',
        user_id: 'user-1',
      };
      const res = await controller.pushChanges(
        'idemp-123',
        body as any,
        'user-1',
        'trace-1',
      );

      expect(syncService.checkIdempotency).toHaveBeenCalledWith('idemp-123');
      expect(syncService.pushChanges).toHaveBeenCalledWith(
        body.changes,
        'dev-1',
        'user-1',
        'trace-1',
      );
      expect(syncService.saveIdempotency).toHaveBeenCalledWith('idemp-123', {
        success: true,
      });
      expect(res).toEqual({ success: true });
    });

    it('returns cached response immediately if idempotency key is matched', async () => {
      mockSyncService.checkIdempotency.mockResolvedValueOnce({
        success: true,
        cached: true,
      });
      const body = { changes: {} };
      const res = await controller.pushChanges('idemp-123', body as any);
      expect(res).toEqual({ success: true, cached: true });
      expect(syncService.pushChanges).not.toHaveBeenCalled();
    });

    it('returns error when no changes are provided in body', async () => {
      const res = await controller.pushChanges(undefined, {} as any);
      expect(res).toEqual({ success: false, error: 'No changes provided' });
    });
  });

  describe('importOdoo', () => {
    it('returns error if csvData is absent', async () => {
      const res = await controller.importOdoo('');
      expect(res).toEqual({ success: false, error: 'No CSV data provided' });
    });

    it('invokes importOdoo service on valid CSV input', async () => {
      const res = await controller.importOdoo('a,b,c');
      expect(syncService.importOdoo).toHaveBeenCalledWith('a,b,c');
      expect(res).toEqual({ success: true, imported: 5 });
    });
  });

  describe('getSyncLogs', () => {
    it('calls getSyncLogs with limit parsing', async () => {
      const res = await controller.getSyncLogs('id-1', '10');
      expect(syncService.getSyncLogs).toHaveBeenCalledWith('id-1', 10);
      expect(res).toEqual({ success: true, logs: [] });
    });
  });

  describe('uploadFile', () => {
    it('returns error if no file uploaded', async () => {
      const res = await controller.uploadFile(undefined, {});
      expect(res).toEqual({ success: false, error: 'No file uploaded' });
    });

    it('processes competitorInsightId correctly', async () => {
      const file = { filename: 'test.jpg' };
      const res = await controller.uploadFile(
        file,
        {},
        undefined,
        'insight-123',
      );
      expect(syncService.updateCompetitorInsightPhoto).toHaveBeenCalledWith(
        'insight-123',
        'test.jpg',
      );
      expect(res).toEqual({ success: true, url: 'url-photo' });
    });

    it('returns error if both ids are missing', async () => {
      const file = { filename: 'test.jpg' };
      const res = await controller.uploadFile(file, {});
      expect(res).toEqual({
        success: false,
        error: 'No interactionLogId or competitorInsightId provided',
      });
    });

    it('processes interactionLogId and enqueues screenshot audit job', async () => {
      const file = { filename: 'test.jpg' };
      const req = { headers: { 'x-trace-id': 'tr-1', 'x-actor-id': 'ac-1' } };
      const res = await controller.uploadFile(file, req, 'log-123');
      expect(syncService.updateInteractionLogScreenshot).toHaveBeenCalledWith(
        'log-123',
        'test.jpg',
      );
      expect(aiQueueService.addScreenshotJob).toHaveBeenCalledWith(
        'log-123',
        expect.any(String),
        'tr-1',
        'ac-1',
      );
      expect(res).toEqual({
        success: true,
        viberScreenshotUrl: 'url-screenshot',
      });
    });
  });

  describe('serveFile', () => {
    it('sends file using express response', async () => {
      const mockRes = {
        sendFile: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.serveFile('photo.jpg', mockRes);
      expect(mockRes.sendFile).toHaveBeenCalled();
    });

    it('returns 404 when file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const mockRes = {
        sendFile: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.serveFile('photo.jpg', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTile', () => {
    it('returns status 400 on invalid coordinates bounds', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '5', '5', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns status 400 on out of bounds coordinates', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '-1', '1', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns cached tile image when existing in cache path', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const mockRes = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '1', '1', mockRes);
      expect(mockRes.sendFile).toHaveBeenCalled();
    });

    it('downloads tile from OSM templates, cache saves and responds buffer', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // cache file exists check
        .mockReturnValueOnce(false); // cache folder exists check

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '1', '1', mockRes);
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('returns status 502 when fetch from OSM fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      } as any);

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '1', '1', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(502);
    });

    it('returns status 500 when fetch throws an error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getTile('2', '1', '1', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('viberWebhook', () => {
    it('authenticates signature, maps shop from phone, decodes media and registers log', async () => {
      const body = {
        phone_number: '09123456',
        message: { text: 'order note', media: 'base64Content' },
      };
      const mockReq = {} as any;

      const res = await controller.viberWebhook(
        mockReq,
        body,
        'mock_signature',
      );
      expect(syncService.getContactByPhone).toHaveBeenCalledWith('09123456');
      expect(syncService.createViberLog).toHaveBeenCalled();
      expect(aiQueueService.addScreenshotJob).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('throws UnauthorizedException on invalid signature', async () => {
      await expect(
        controller.viberWebhook({} as any, {}, 'invalid_sig'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException if no phone number in payload', async () => {
      await expect(
        controller.viberWebhook({} as any, {}, 'mock_signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if contact is not found by phone', async () => {
      mockSyncService.getContactByPhone.mockResolvedValueOnce(null);
      await expect(
        controller.viberWebhook(
          {} as any,
          { phone_number: '123' },
          'mock_signature',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if no media is provided', async () => {
      await expect(
        controller.viberWebhook(
          {} as any,
          { phone_number: '123', message: {} },
          'mock_signature',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('downloads media from url and creates Viber log', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any);

      const body = {
        phone_number: '123',
        message: { media: 'http://my-image.jpg', text: 'hello' },
      };

      const res = await controller.viberWebhook(
        {} as any,
        body,
        'mock_signature',
      );
      expect(res.success).toBe(true);
      expect(syncService.createViberLog).toHaveBeenCalled();
    });

    it('throws BadRequestException if media download fails', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as any);

      const body = {
        phone_number: '123',
        message: { media: 'http://my-image.jpg', text: 'hello' },
      };

      await expect(
        controller.viberWebhook({} as any, body, 'mock_signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles base64 media with prefix', async () => {
      const body = {
        phone_number: '123',
        message: { media: 'data:image/jpeg;base64,YWJj' }, // 'YWJj' is 'abc'
      };

      const res = await controller.viberWebhook(
        {} as any,
        body,
        'mock_signature',
      );
      expect(res.success).toBe(true);
    });

    it('validates rawBody signature when bot token is set', async () => {
      process.env.VIBER_BOT_TOKEN = 'my-token';
      const rawBody = Buffer.from(
        JSON.stringify({ phone_number: '123', message: { media: 'YWJj' } }),
      );
      const computedSignature = crypto
        .createHmac('sha256', 'my-token')
        .update(rawBody)
        .digest('hex');

      const mockReq = { rawBody } as any;
      const body = { phone_number: '123', message: { media: 'YWJj' } };

      const res = await controller.viberWebhook(
        mockReq,
        body,
        computedSignature,
      );
      expect(res.success).toBe(true);

      delete process.env.VIBER_BOT_TOKEN;
    });

    it('verifies signature automatically in development mode if token is missing', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      delete process.env.VIBER_BOT_TOKEN;

      const body = {
        phone_number: '123',
        message: { media: 'YWJj' },
      };

      const res = await controller.viberWebhook(
        {} as any,
        body,
        'some_invalid_signature',
      );
      expect(res.success).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('throws BadRequestException if base64 decoding fails with a TypeError', async () => {
      const body = {
        phone_number: '123',
        message: { media: { startsWith: () => false } }, // will pass startsWith check but fail includes check inside try block
      };

      await expect(
        controller.viberWebhook({} as any, body, 'mock_signature'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
