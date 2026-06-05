import { AiQueueService } from './ai-queue.service';
import { Queue } from 'bullmq';

const mockQueueMethods = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  getFailed: jest.fn().mockResolvedValue([
    {
      id: 'job-failed',
      name: 'process-screenshot',
      data: { interactionLogId: 'log-1' },
      failedReason: 'Redis timeout',
      stacktrace: ['Error line 1'],
      timestamp: 1234567,
    },
  ]),
  getJob: jest.fn().mockResolvedValue({
    id: 'job-123',
    updateData: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  }),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => mockQueueMethods),
  };
});

describe('AiQueueService', () => {
  let service: AiQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiQueueService();
  });

  it('initializes the queue with settings', () => {
    expect(Queue).toHaveBeenCalledWith('ai-tasks', expect.any(Object));
  });

  it('adds screenshot jobs correctly', async () => {
    await service.addScreenshotJob(
      'log-1',
      '/path/to/file.jpg',
      'trace-1',
      'actor-1',
    );
    expect(mockQueueMethods.add).toHaveBeenCalledWith('process-screenshot', {
      interactionLogId: 'log-1',
      filePath: '/path/to/file.jpg',
      traceId: 'trace-1',
      actorId: 'actor-1',
    });
  });

  it('adds EOD digest jobs correctly', async () => {
    await service.addEodJob('2026-06-04');
    expect(mockQueueMethods.add).toHaveBeenCalledWith('eod-digest', {
      dateStr: '2026-06-04',
    });
  });

  it('adds corrupted transaction jobs correctly', async () => {
    await service.addCorruptedTransactionJob(
      'Invalid format',
      { data: 'payload' },
      'trace-1',
      'actor-1',
    );
    expect(mockQueueMethods.add).toHaveBeenCalledWith('corrupted-transaction', {
      reason: 'Invalid format',
      payload: { data: 'payload' },
      traceId: 'trace-1',
      actorId: 'actor-1',
    });
  });

  it('retrieves failed jobs mapped correctly', async () => {
    const failed = await service.getFailedJobs();
    expect(mockQueueMethods.getFailed).toHaveBeenCalled();
    expect(failed).toEqual([
      {
        id: 'job-failed',
        name: 'process-screenshot',
        data: { interactionLogId: 'log-1' },
        failedReason: 'Redis timeout',
        stacktrace: ['Error line 1'],
        timestamp: 1234567,
      },
    ]);
  });

  it('updates job data successfully', async () => {
    const res = await service.updateJobData('job-123', { new: 'data' });
    expect(mockQueueMethods.getJob).toHaveBeenCalledWith('job-123');
    expect(res).toEqual({ success: true });
  });

  it('retries job successfully', async () => {
    const res = await service.retryJob('job-123');
    expect(mockQueueMethods.getJob).toHaveBeenCalledWith('job-123');
    expect(res).toEqual({ success: true });
  });

  it('removes job successfully', async () => {
    const res = await service.removeJob('job-123');
    expect(mockQueueMethods.getJob).toHaveBeenCalledWith('job-123');
    expect(res).toEqual({ success: true });
  });

  it('throws error when job is not found for update, retry, or remove', async () => {
    mockQueueMethods.getJob.mockResolvedValueOnce(null);
    await expect(service.retryJob('job-unknown')).rejects.toThrow(
      'Job job-unknown not found',
    );
  });

  it('closes the queue on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockQueueMethods.close).toHaveBeenCalled();
  });
});
