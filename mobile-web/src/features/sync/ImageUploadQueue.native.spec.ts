import { ImageUploadQueue } from './ImageUploadQueue.native';
import { database } from '../../core/database/database';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';

jest.mock('../../core/database/database', () => ({
  database: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'mock-doc-dir/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  uploadAsync: jest.fn(),
  deleteAsync: jest.fn(),
  FileSystemUploadType: {
    MULTIPART: 'MULTIPART',
  },
}));

jest.mock('expo-image-manipulator', () => {
  const manipulateAsync = jest
    .fn()
    .mockResolvedValue({ uri: 'mock-compressed-uri' });
  return {
    __esModule: true,
    manipulateAsync,
    SaveFormat: { JPEG: 'jpeg' },
    default: {
      manipulateAsync,
      SaveFormat: { JPEG: 'jpeg' },
    },
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

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

describe('ImageUploadQueue (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ImageUploadQueue.isPaused = false;
    ImageUploadQueue.subscribers.clear();
    (global as any).__mockNetworkDegraded = false;
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'wifi' });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'mock-compressed-uri',
    });
  });

  describe('Enqueuing Images', () => {
    it('should compress and copy image persistently on enqueueImage', async () => {
      const mockInsertValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues } as any);

      // Mock select in processQueue
      mockDb.select.mockReturnValue(createQueryChain([]) as any);

      await ImageUploadQueue.enqueueImage('log-123', 'temp-uri-path');

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'temp-uri-path',
        [{ resize: { width: 1080 } }],
        expect.any(Object),
      );

      expect(FileSystem.copyAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'mock-compressed-uri',
          to: expect.stringContaining('mock-doc-dir/viber_uploads/log-123-'),
        }),
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create upload directory if missing', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      const mockInsertValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues } as any);
      mockDb.select.mockReturnValue(createQueryChain([]) as any);

      await ImageUploadQueue.enqueueImage('log-123', 'temp-uri-path');

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('mock-doc-dir/viber_uploads/'),
        { intermediates: true },
      );
    });

    it('should fall back to the original uri when pre-enqueue compression fails', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Compression failed'),
      );
      const mockInsertValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues } as any);
      mockDb.select.mockReturnValue(createQueryChain([]) as any);

      await ImageUploadQueue.enqueueImage('log-123', 'temp-uri-path');

      // Compression failure must not abort enqueue: it copies the original uri
      // and still persists the queue entry.
      expect(FileSystem.copyAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'temp-uri-path',
          to: expect.stringContaining('mock-doc-dir/viber_uploads/log-123-'),
        }),
      );
      expect(mockDb.insert).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Queue Processing', () => {
    it('should upload images successfully and update DB under normal network', async () => {
      const mockTask = {
        id: 'task-native-1',
        local_file_path: 'mock-doc-dir/viber_uploads/log-123.jpg',
        interaction_log_id: 'log-123',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          url: 'https://cdn.com/uploaded-screenshot.jpg',
        }),
      });

      await ImageUploadQueue.processQueue();

      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        'mock-doc-dir/viber_uploads/log-123.jpg',
        expect.objectContaining({
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        }),
      );

      // Updates status to processing, then updates log, then deletes task
      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should apply aggressive compression when network is degraded', async () => {
      (global as any).__mockNetworkDegraded = true;

      const mockTask = {
        id: 'task-native-2',
        local_file_path: 'mock-doc-dir/viber_uploads/log-456.jpg',
        interaction_log_id: 'log-456',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          url: 'https://cdn.com/compressed-uploaded.jpg',
        }),
      });

      await ImageUploadQueue.processQueue();

      // Should perform aggressive 480px compression
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'mock-doc-dir/viber_uploads/log-456.jpg',
        [{ resize: { width: 480 } }],
        expect.objectContaining({ compress: 0.3 }),
      );

      // Should upload the newly compressed file
      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        'mock-compressed-uri',
        expect.any(Object),
      );
    });

    it('should set task failed if upload fails', async () => {
      const mockTask = {
        id: 'task-native-3',
        local_file_path: 'mock-doc-dir/viber_uploads/log-789.jpg',
        interaction_log_id: 'log-789',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 500,
        body: 'Internal Server Error',
      });

      await ImageUploadQueue.processQueue();

      // First call: set status to 'processing'
      // Second call: set status to 'failed'
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('should handle competitor insights uploads in native queue', async () => {
      const mockTask = {
        id: 'task-native-4',
        local_file_path: 'mock-doc-dir/viber_uploads/insight.jpg',
        competitor_insight_id: 'insight-123',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({ url: 'https://cdn.com/insight-uploaded.jpg' }),
      });

      await ImageUploadQueue.processQueue();

      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle netinfo check errors gracefully', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(
        new Error('NetInfo fetch failed'),
      );
      const mockTask = {
        id: 'task-native-5',
        local_file_path: 'mock-doc-dir/viber_uploads/log-123.jpg',
        interaction_log_id: 'log-123',
        status: 'pending',
      };
      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({ url: 'https://cdn.com/uploaded.jpg' }),
      });

      await ImageUploadQueue.processQueue();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle database errors in processQueue gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockDb.select.mockImplementation(() => {
        throw new Error('Database select failure');
      });

      await expect(ImageUploadQueue.processQueue()).resolves.not.toThrow();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Subscriptions', () => {
    it('should register and notify subscribers', () => {
      const callback = jest.fn();
      const unsubscribe = ImageUploadQueue.subscribe(callback);

      ImageUploadQueue.notifySubscribers();
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      ImageUploadQueue.notifySubscribers();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should register and unsubscribe via unsubscribe method', () => {
      const callback = jest.fn();
      ImageUploadQueue.subscribe(callback);

      ImageUploadQueue.unsubscribe(callback);
      ImageUploadQueue.notifySubscribers();
      expect(callback).not.toHaveBeenCalled();
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

    it('handles subscriber callback throwing an error gracefully', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const badCb = jest.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      ImageUploadQueue.subscribe(badCb);
      ImageUploadQueue.notifySubscribers();
      expect(badCb).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('handles database write operations failing in retryTask', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockDb.update.mockImplementationOnce(() => {
        throw new Error('Update failed');
      });
      await ImageUploadQueue.retryTask('task-fail');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Failed to retry task task-fail:',
        ),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('skips processQueue execution when isPaused is true', async () => {
      ImageUploadQueue.pause();
      mockDb.select.mockReset();
      await ImageUploadQueue.processQueue();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('prevents concurrent execution if already processing', async () => {
      const mockTask = {
        id: 'task-native-concurrent',
        local_file_path: 'mock-doc-dir/viber_uploads/log-123.jpg',
        interaction_log_id: 'log-123',
        status: 'pending',
      };

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

      await ImageUploadQueue.processQueue();

      // The second call must bail out early at the isProcessing guard,
      // so the database select should only have been issued by the first run.
      expect(mockDb.select).toHaveBeenCalledTimes(1);

      resolveSelect([mockTask]);
      await firstProcess;
    });

    it('handles degraded network image compression failure and falls back to original', async () => {
      (global as any).__mockNetworkDegraded = true;
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Manipulate error'),
      );

      const mockTask = {
        id: 'task-native-fallback',
        local_file_path: 'mock-doc-dir/viber_uploads/log-456.jpg',
        interaction_log_id: 'log-456',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          url: 'https://cdn.com/uploaded.jpg',
        }),
      });

      await ImageUploadQueue.processQueue();

      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        'mock-doc-dir/viber_uploads/log-456.jpg',
        expect.any(Object),
      );
    });

    it('throws upload error when server response is empty object', async () => {
      const mockTask = {
        id: 'task-native-empty-body',
        local_file_path: 'mock-doc-dir/viber_uploads/log-789.jpg',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: '{}',
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await ImageUploadQueue.processQueue();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Upload error for task task-native-empty-body:',
        ),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('handles native FileSystem delete/cleanup errors gracefully', async () => {
      const mockTask = {
        id: 'task-native-cleanup-err',
        local_file_path: 'mock-doc-dir/viber_uploads/log-cleanup.jpg',
        interaction_log_id: 'log-cleanup',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({ url: 'https://cdn.com/uploaded.jpg' }),
      });

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(
        new Error('Delete error'),
      );

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await ImageUploadQueue.processQueue();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Failed to delete local file copy:',
        ),
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });

    it('handles temp compressed file delete/cleanup errors gracefully', async () => {
      (global as any).__mockNetworkDegraded = true;

      const mockTask = {
        id: 'task-native-temp-cleanup-err',
        local_file_path: 'mock-doc-dir/viber_uploads/log-cleanup-temp.jpg',
        interaction_log_id: 'log-cleanup-temp',
        status: 'pending',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({ url: 'https://cdn.com/uploaded.jpg' }),
      });

      (FileSystem.deleteAsync as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Temp delete error'));

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await ImageUploadQueue.processQueue();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ImageUploadQueue] Failed to delete temp compressed file:',
        ),
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });

    it('should upload native POD images, update interaction logs pod_image_url, and delete task', async () => {
      const mockTask = {
        id: 'task-native-pod-1',
        local_file_path: 'mock-doc-dir/viber_uploads/log-pod-native.jpg',
        interaction_log_id: 'log-pod-native',
        status: 'pending',
        image_type: 'pod',
      };

      mockDb.select.mockReturnValue(createQueryChain([mockTask]) as any);
      mockDb.update.mockReturnValue(createQueryChain([]) as any);
      mockDb.delete.mockReturnValue(createQueryChain([]) as any);

      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          url: 'https://cdn.com/uploaded-pod.jpg',
        }),
      });

      await ImageUploadQueue.processQueue();

      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        'mock-doc-dir/viber_uploads/log-pod-native.jpg',
        expect.objectContaining({
          parameters: expect.objectContaining({
            imageType: 'pod',
          }),
        }),
      );

      expect(mockDb.update).toHaveBeenNthCalledWith(2, expect.any(Object));
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
