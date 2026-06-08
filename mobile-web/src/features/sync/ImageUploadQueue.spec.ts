import { ImageUploadQueue } from './ImageUploadQueue.web';
import { database } from '../../core/database/database';
import axios from 'axios';

jest.mock('../../core/database/database', () => ({
  database: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('axios');

const createQueryChain = (rows: unknown[]) => {
  const self: Record<string, any> = {};
  const methods = [
    'select',
    'from',
    'where',
    'insert',
    'values',
    'update',
    'set',
    'delete',
  ];
  methods.forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self);
  });
  self['then'] = (
    onFulfilled?: (value: any) => any,
    onRejected?: (reason: any) => any,
  ) => Promise.resolve(rows).then(onFulfilled, onRejected);
  return self;
};

const mockDb = database as jest.Mocked<typeof database>;

describe('ImageUploadQueue (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ImageUploadQueue.isPaused = false;
    ImageUploadQueue.subscribers.clear();
  });

  describe('Subscriptions', () => {
    it('should register and notify subscribers', () => {
      const callback = jest.fn();
      const unsubscribe = ImageUploadQueue.subscribe(callback);

      ImageUploadQueue.notifySubscribers();
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      ImageUploadQueue.notifySubscribers();
      expect(callback).toHaveBeenCalledTimes(1); // not called again
    });

    it('should register and unsubscribe via unsubscribe method', () => {
      const callback = jest.fn();
      ImageUploadQueue.subscribe(callback);

      ImageUploadQueue.unsubscribe(callback);
      ImageUploadQueue.notifySubscribers();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should catch errors thrown by subscribers and continue', () => {
      const badCallback = jest.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = jest.fn();

      ImageUploadQueue.subscribe(badCallback);
      ImageUploadQueue.subscribe(goodCallback);

      expect(() => ImageUploadQueue.notifySubscribers()).not.toThrow();
      expect(badCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Queue Actions', () => {
    it('should update task status to pending on retryTask', async () => {
      const updateSetMock = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });
      mockDb.update.mockReturnValue({
        set: updateSetMock,
      } as any);

      // Mock empty queue processing selection
      mockDb.select.mockReturnValue(createQueryChain([]) as any);

      await ImageUploadQueue.retryTask('task-123');

      expect(mockDb.update).toHaveBeenCalled();
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('should toggle manual pause and resume state', async () => {
      ImageUploadQueue.pause();
      expect(ImageUploadQueue.isPaused).toBe(true);

      mockDb.select.mockReturnValue(createQueryChain([]) as any);
      ImageUploadQueue.resume();
      expect(ImageUploadQueue.isPaused).toBe(false);
    });
  });

  describe('Queue Processing', () => {
    it('should skip processing if paused', async () => {
      ImageUploadQueue.pause();
      await ImageUploadQueue.processQueue();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should upload pending images, update logs, and delete task from queue', async () => {
      const mockTask = {
        id: 'task-1',
        local_file_path: 'data:image/jpeg;base64,mock-data',
        interaction_log_id: 'log-1',
        status: 'pending',
        trace_id: 'trace-1',
        actor_id: 'actor-1',
      };

      const selectChain = createQueryChain([mockTask]);
      mockDb.select.mockReturnValue(selectChain as any);

      const updateChain = createQueryChain([]);
      mockDb.update.mockReturnValue(updateChain as any);

      const deleteChain = createQueryChain([]);
      mockDb.delete.mockReturnValue(deleteChain as any);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { url: 'https://cdn.server.com/screenshot123.jpg' },
      });

      // Mock fetch response for data: uri
      const mockBlob = new Blob(['mock-binary-data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      await ImageUploadQueue.processQueue();

      // Should set status to 'processing'
      expect(mockDb.update).toHaveBeenNthCalledWith(1, expect.any(Object));

      // Should post to sync server
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-trace-id': 'trace-1',
            'x-actor-id': 'actor-1',
          }),
        }),
      );

      // Should update the interaction log's screenshot url
      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));

      // Should delete task from queue
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle competitor insights uploads', async () => {
      const mockTask = {
        id: 'task-2',
        local_file_path: 'mock-uri',
        competitor_insight_id: 'insight-1',
        status: 'pending',
      };

      const selectChain = createQueryChain([mockTask]);
      mockDb.select.mockReturnValue(selectChain as any);

      const updateChain = createQueryChain([]);
      mockDb.update.mockReturnValue(updateChain as any);

      const deleteChain = createQueryChain([]);
      mockDb.delete.mockReturnValue(deleteChain as any);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { url: 'https://cdn.server.com/screenshot123.jpg' },
      });

      await ImageUploadQueue.processQueue();

      // Should update competitor insights url
      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should mark task failed if upload fails', async () => {
      const mockTask = {
        id: 'task-3',
        local_file_path: 'mock-uri',
        interaction_log_id: 'log-2',
        status: 'pending',
      };

      const selectChain = createQueryChain([mockTask]);
      mockDb.select.mockReturnValue(selectChain as any);

      const updateChain = createQueryChain([]);
      mockDb.update.mockReturnValue(updateChain as any);

      (axios.post as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await ImageUploadQueue.processQueue();

      // First call: set status to 'processing'
      // Second call: set status to 'failed' since axios threw error
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors in processQueue gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockDb.select.mockImplementation(() => {
        throw new Error('Database query failure');
      });

      await expect(ImageUploadQueue.processQueue()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Error in queue processing loop:',
        ),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should prevent concurrent execution if already processing', async () => {
      const mockTask = {
        id: 'task-4',
        local_file_path: 'mock-uri',
        status: 'pending',
      };

      // Set select mock to hang so processing stays active
      let resolveSelect: any;
      const selectPromise = new Promise((resolve) => {
        resolveSelect = resolve;
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() => selectPromise),
        }),
      } as any);

      const firstProcess = ImageUploadQueue.processQueue();

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Call processQueue again while first is running
      await ImageUploadQueue.processQueue();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Queue is already processing. Skipping run.',
        ),
      );

      // Clean up first run
      resolveSelect([mockTask]);
      await firstProcess;
      consoleLogSpy.mockRestore();
    });

    it('should throw error when server upload response has no valid URL', async () => {
      const mockTask = {
        id: 'task-5',
        local_file_path: 'mock-uri',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);

      // Return empty response data
      (axios.post as jest.Mock).mockResolvedValue({ data: {} });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      await ImageUploadQueue.processQueue();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Upload error for task task-5:',
        ),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle database failures in retryTask', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      await expect(
        ImageUploadQueue.retryTask('task-fail'),
      ).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Failed to retry task task-fail:',
        ),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('uses fallback empty blob when local_file_path is blob: but not in activeSessionBlobs', async () => {
      const mockTask = {
        id: 'task-blob-fallback',
        local_file_path: 'blob:not-in-session-999',
        interaction_log_id: 'log-1',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { url: 'https://cdn.com/uploaded.jpg' },
      });

      await ImageUploadQueue.processQueue();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should upload POD images, update interaction logs pod_image_url, and delete task', async () => {
      const mockTask = {
        id: 'task-pod-1',
        local_file_path: 'data:image/jpeg;base64,mock-data',
        interaction_log_id: 'log-pod-1',
        status: 'pending',
        image_type: 'pod',
      };

      const selectChain = createQueryChain([mockTask]);
      mockDb.select.mockReturnValue(selectChain as any);

      const updateChain = createQueryChain([]);
      mockDb.update.mockReturnValue(updateChain as any);

      const deleteChain = createQueryChain([]);
      mockDb.delete.mockReturnValue(deleteChain as any);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { url: 'https://cdn.server.com/pod123.jpg' },
      });

      const mockBlob = new Blob(['mock-binary-data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      await ImageUploadQueue.processQueue();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.any(FormData),
        expect.any(Object),
      );

      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
