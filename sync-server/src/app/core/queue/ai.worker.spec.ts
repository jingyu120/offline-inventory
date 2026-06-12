import { Test, TestingModule } from '@nestjs/testing';
import { AiWorker } from './ai.worker';
import { AiService } from '../../features/ai/ai.service';
import { Worker, Job } from 'bullmq';

const registeredEventHandlers: Record<string, (...args: any[]) => any> = {};
const mockWorkerMethods = {
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn().mockImplementation((event, handler) => {
    registeredEventHandlers[event] = handler;
  }),
};

let workerConstructorCallback: ((job: Job) => Promise<void>) | null = null;

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((name, cb, _opts) => {
      workerConstructorCallback = cb;
      return mockWorkerMethods;
    }),
  };
});

describe('AiWorker', () => {
  let aiWorker: AiWorker;

  const mockAiService = {
    processScreenshot: jest.fn().mockResolvedValue(undefined),
    generateEodDigest: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    workerConstructorCallback = null;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiWorker,
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    aiWorker = module.get<AiWorker>(AiWorker);
  });

  it('should initialize the worker onModuleInit', () => {
    aiWorker.onModuleInit();
    expect(Worker).toHaveBeenCalledWith(
      'ai-tasks',
      expect.any(Function),
      expect.any(Object),
    );
    expect(mockWorkerMethods.on).toHaveBeenCalledWith(
      'failed',
      expect.any(Function),
    );
  });

  it('should close the worker onModuleDestroy', async () => {
    aiWorker.onModuleInit();
    await aiWorker.onModuleDestroy();
    expect(mockWorkerMethods.close).toHaveBeenCalled();
  });

  describe('Job Processing', () => {
    beforeEach(() => {
      aiWorker.onModuleInit();
    });

    it('should process screenshot job', async () => {
      const mockJob = {
        id: 'job-1',
        name: 'process-screenshot',
        data: {
          interactionLogId: 'log-1',
          filePath: '/path/to/file.jpg',
          traceId: 'trace-1',
          actorId: 'actor-1',
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }
      await workerConstructorCallback(mockJob);

      expect(mockAiService.processScreenshot).toHaveBeenCalledWith(
        'log-1',
        '/path/to/file.jpg',
        'trace-1',
        'actor-1',
      );
    });

    it('should process eod-digest job', async () => {
      const mockJob = {
        id: 'job-2',
        name: 'eod-digest',
        data: {
          dateStr: '2026-06-04',
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }
      await workerConstructorCallback(mockJob);

      expect(mockAiService.generateEodDigest).toHaveBeenCalledWith(
        '2026-06-04',
      );
    });

    it('should fail on corrupted-transaction job', async () => {
      const mockJob = {
        id: 'job-3',
        name: 'corrupted-transaction',
        data: {
          reason: 'Invalid trace format',
          payload: { invalidHeader: true },
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }
      await expect(workerConstructorCallback(mockJob)).rejects.toThrow(
        /Corrupted Transaction Frame: Invalid trace format/,
      );
    });

    it('should send Slack alert when SLACK_WEBHOOK_URL is configured', async () => {
      const originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('ok'),
      });
      global.fetch = mockFetch;

      const mockJob = {
        id: 'job-3',
        name: 'corrupted-transaction',
        data: {
          reason: 'Invalid trace format',
          payload: { invalidHeader: true },
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }

      await expect(workerConstructorCallback(mockJob)).rejects.toThrow(
        /Corrupted Transaction Frame: Invalid trace format/,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(
            'Security Alert: Corrupted Transaction Detected',
          ),
        }),
      );

      process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
      delete (global as any).fetch;
    });

    it('should handle Slack alert fetch failure status', async () => {
      const originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });
      global.fetch = mockFetch;

      const mockJob = {
        id: 'job-3',
        name: 'corrupted-transaction',
        data: {
          reason: 'Invalid trace format',
          payload: { invalidHeader: true },
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }

      await expect(workerConstructorCallback(mockJob)).rejects.toThrow(
        /Corrupted Transaction Frame: Invalid trace format/,
      );

      expect(mockFetch).toHaveBeenCalled();
      process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
      delete (global as any).fetch;
    });

    it('should handle fetch exceptions', async () => {
      const originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const mockJob = {
        id: 'job-3',
        name: 'corrupted-transaction',
        data: {
          reason: 'Invalid trace format',
          payload: { invalidHeader: true },
        },
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }

      await expect(workerConstructorCallback(mockJob)).rejects.toThrow(
        /Corrupted Transaction Frame: Invalid trace format/,
      );

      expect(mockFetch).toHaveBeenCalled();
      process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
      delete (global as any).fetch;
    });

    it('should log warning for unknown job name', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(jest.fn());
      const mockJob = {
        id: 'job-4',
        name: 'unknown-job',
        data: {},
      } as Job;

      if (!workerConstructorCallback) {
        throw new Error('workerConstructorCallback is not defined');
      }
      await workerConstructorCallback(mockJob);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AiWorker] Unknown job name: unknown-job'),
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle failed worker events', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn());

      registeredEventHandlers['failed'](
        { id: 'job-6' },
        new Error('Test failure'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AiWorker] Job job-6 failed:'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
