import { database } from '../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import * as FileSystem from 'expo-file-system/legacy';
import { SYNC_API_URL } from '../../config/appConfig';
import { eq, or } from 'drizzle-orm';
import NetInfo from '@react-native-community/netinfo';

let isProcessing = false;

export class ImageUploadQueue {
  static isPaused = false;
  static subscribers = new Set<() => void>();

  static subscribe(cb: () => void): () => void {
    ImageUploadQueue.subscribers.add(cb);
    return () => {
      ImageUploadQueue.subscribers.delete(cb);
    };
  }

  static unsubscribe(cb: () => void): void {
    ImageUploadQueue.subscribers.delete(cb);
  }

  static notifySubscribers(): void {
    ImageUploadQueue.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[ImageUploadQueue] Error in subscriber callback:', err);
      }
    });
  }

  static async retryTask(taskId: string): Promise<void> {
    console.log(`[ImageUploadQueue] Retrying task ${taskId}`);
    const now = Math.floor(Date.now() / 1000);
    try {
      await database
        .update(sqliteSchema.image_upload_queue)
        .set({ status: 'pending', updated_at: now })
        .where(eq(sqliteSchema.image_upload_queue.id, taskId));

      ImageUploadQueue.notifySubscribers();

      ImageUploadQueue.processQueue();
    } catch (err) {
      console.error(`[ImageUploadQueue] Failed to retry task ${taskId}:`, err);
    }
  }

  static pause(): void {
    ImageUploadQueue.isPaused = true;
    console.log('[ImageUploadQueue] Queue manually paused.');
  }

  static resume(): void {
    ImageUploadQueue.isPaused = false;
    console.log('[ImageUploadQueue] Queue manually resumed.');
    ImageUploadQueue.processQueue();
  }

  static async enqueueImage(
    interactionLogId: string,
    tempUri: string,
    traceId?: string,
    actorId?: string,
  ): Promise<void> {
    console.log(
      `[ImageUploadQueue] Enqueuing screenshot for log ${interactionLogId}, tempUri: ${tempUri}`,
    );

    let localFilePath = tempUri;

    try {
      const ImageManipulator = (require as $Any)('expo-image-manipulator');
      const manipResult = await ImageManipulator.manipulateAsync(
        tempUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      tempUri = manipResult.uri;
    } catch (err) {
      console.warn(
        '[ImageUploadQueue] Failed to compress image before enqueuing:',
        err,
      );
    }

    try {
      const fsAny = FileSystem as $Any;
      const dir = fsAny.documentDirectory + 'viber_uploads/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const filename = `${interactionLogId}-${Date.now()}.jpg`;
      localFilePath = dir + filename;
      await FileSystem.copyAsync({ from: tempUri, to: localFilePath });
      console.log(
        `[ImageUploadQueue] Copied file persistently to: ${localFilePath}`,
      );
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to save persistent local file copy:',
        err,
      );
    }

    const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      await database.insert(sqliteSchema.image_upload_queue).values({
        id: queueId,
        local_file_path: localFilePath,
        interaction_log_id: interactionLogId,
        status: 'pending',
        trace_id: traceId || null,
        actor_id: actorId || null,
        created_at: now,
        updated_at: now,
      });
      console.log(`[ImageUploadQueue] Enqueued task ${queueId}`);
      ImageUploadQueue.notifySubscribers();

      this.processQueue().catch((err) => {
        console.error('[ImageUploadQueue] background process error:', err);
      });
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to write queue entry to local db:',
        err,
      );
    }
  }

  static async enqueueCompetitorInsightImage(
    competitorInsightId: string,
    tempUri: string,
  ): Promise<void> {
    console.log(
      `[ImageUploadQueue] Enqueuing screenshot for competitor insight ${competitorInsightId}, tempUri: ${tempUri}`,
    );

    let localFilePath = tempUri;

    try {
      const ImageManipulator = await import('expo-image-manipulator');
      const manipResult = await ImageManipulator.manipulateAsync(
        tempUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      tempUri = manipResult.uri;
    } catch (err) {
      console.warn(
        '[ImageUploadQueue] Failed to compress image before enqueuing:',
        err,
      );
    }

    try {
      const fsAny = FileSystem as $Any;
      const dir = fsAny.documentDirectory + 'competitor_uploads/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const filename = `${competitorInsightId}-${Date.now()}.jpg`;
      localFilePath = dir + filename;
      await FileSystem.copyAsync({ from: tempUri, to: localFilePath });
      console.log(
        `[ImageUploadQueue] Copied competitor file persistently to: ${localFilePath}`,
      );
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to save persistent local file copy:',
        err,
      );
    }

    const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      await database.insert(sqliteSchema.image_upload_queue).values({
        id: queueId,
        local_file_path: localFilePath,
        competitor_insight_id: competitorInsightId,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
      console.log(`[ImageUploadQueue] Enqueued competitor task ${queueId}`);
      ImageUploadQueue.notifySubscribers();

      this.processQueue().catch((err) => {
        console.error('[ImageUploadQueue] background process error:', err);
      });
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to write competitor queue entry to local db:',
        err,
      );
    }
  }

  static async processQueue(): Promise<void> {
    if (ImageUploadQueue.isPaused) {
      console.log(
        '[ImageUploadQueue] Queue is manually paused. Skipping execution.',
      );
      return;
    }

    let isNetworkDegraded = false;
    try {
      const state = await NetInfo.fetch();
      const is2G =
        state.type === 'cellular' && state.details?.cellularGeneration === '2g';
      const isMockDegraded = (global as $Any).__mockNetworkDegraded === true;
      if (is2G || isMockDegraded) {
        isNetworkDegraded = true;
        console.log(
          '[ImageUploadQueue] Connection is degraded (2G/EDGE or mock packet loss). Enabling aggressive low-res/high-loss compression.',
        );
      }
    } catch (netErr) {
      console.warn(
        '[ImageUploadQueue] Failed to check network state, continuing...',
        netErr,
      );
    }

    if (isProcessing) {
      console.log(
        '[ImageUploadQueue] Queue is already processing. Skipping run.',
      );
      return;
    }

    isProcessing = true;
    console.log('[ImageUploadQueue] Starting queue processor...');

    try {
      const tasks = await database
        .select()
        .from(sqliteSchema.image_upload_queue)
        .where(
          or(
            eq(sqliteSchema.image_upload_queue.status, 'pending'),
            eq(sqliteSchema.image_upload_queue.status, 'failed'),
          ),
        );

      console.log(
        `[ImageUploadQueue] Found ${tasks.length} pending/failed tasks.`,
      );

      for (const task of tasks) {
        console.log(
          `[ImageUploadQueue] Processing task ${task.id} (log ID: ${task.interaction_log_id || 'null'}, competitor ID: ${task.competitor_insight_id || 'null'})`,
        );

        const now = Math.floor(Date.now() / 1000);
        await database
          .update(sqliteSchema.image_upload_queue)
          .set({ status: 'processing', updated_at: now })
          .where(eq(sqliteSchema.image_upload_queue.id, task.id));
        ImageUploadQueue.notifySubscribers();

        let uploadFilePath = task.local_file_path;
        let tempCompressedFile: string | null = null;
        if (isNetworkDegraded) {
          try {
            console.log(
              `[ImageUploadQueue] Aggressively compressing ${task.local_file_path} for degraded network...`,
            );
            const ImageManipulator = (require as $Any)(
              'expo-image-manipulator',
            );
            const manipResult = await ImageManipulator.manipulateAsync(
              task.local_file_path,
              [{ resize: { width: 480 } }],
              { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG },
            );
            uploadFilePath = manipResult.uri;
            tempCompressedFile = manipResult.uri;
            console.log(
              `[ImageUploadQueue] Aggressive compression completed: ${uploadFilePath}`,
            );
          } catch (manipErr) {
            console.warn(
              '[ImageUploadQueue] Failed to aggressively compress image under degraded network, falling back to original:',
              manipErr,
            );
          }
        }

        try {
          let serverUrl = '';

          const uploadParams: Record<string, $Any> = {};
          if (task.competitor_insight_id) {
            uploadParams.competitorInsightId = task.competitor_insight_id;
          } else {
            uploadParams.interactionLogId = task.interaction_log_id || '';
          }

          const uploadResult = await FileSystem.uploadAsync(
            `${SYNC_API_URL}/upload`,
            uploadFilePath,
            {
              fieldName: 'file',
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              parameters: uploadParams,
              headers: {
                'x-trace-id': (task as $Any).trace_id || '',
                'x-actor-id': (task as $Any).actor_id || '',
              },
            },
          );

          if (uploadResult.status >= 200 && uploadResult.status < 300) {
            const resData = JSON.parse(uploadResult.body);
            serverUrl = resData.viberScreenshotUrl || resData.url;
          } else {
            throw new Error(
              `Upload failed with status code ${uploadResult.status}: ${uploadResult.body}`,
            );
          }

          if (serverUrl) {
            console.log(
              `[ImageUploadQueue] Upload succeeded. Server URL: ${serverUrl}`,
            );

            if (task.competitor_insight_id) {
              await database
                .update(sqliteSchema.competitor_insights)
                .set({
                  photo_url: serverUrl,
                  updated_at: Math.floor(Date.now() / 1000),
                })
                .where(
                  eq(
                    sqliteSchema.competitor_insights.id,
                    task.competitor_insight_id,
                  ),
                );
            } else if (task.interaction_log_id) {
              await database
                .update(sqliteSchema.interaction_logs)
                .set({
                  viber_screenshot_url: serverUrl,
                  synced_at_server: null,
                  updated_at: Math.floor(Date.now() / 1000),
                })
                .where(
                  eq(sqliteSchema.interaction_logs.id, task.interaction_log_id),
                );
            }

            try {
              const info = await FileSystem.getInfoAsync(task.local_file_path);
              if (info.exists) {
                await FileSystem.deleteAsync(task.local_file_path, {
                  idempotent: true,
                });
                console.log(
                  `[ImageUploadQueue] Cleaned up local file: ${task.local_file_path}`,
                );
              }
            } catch (cleanupErr) {
              console.warn(
                '[ImageUploadQueue] Failed to delete local file copy:',
                cleanupErr,
              );
            }

            await database
              .delete(sqliteSchema.image_upload_queue)
              .where(eq(sqliteSchema.image_upload_queue.id, task.id));
            ImageUploadQueue.notifySubscribers();
          } else {
            throw new Error(
              'Server upload response did not return a valid screenshot URL.',
            );
          }
        } catch (uploadErr) {
          console.error(
            `[ImageUploadQueue] Upload error for task ${task.id}:`,
            uploadErr,
          );

          const updateTime = Math.floor(Date.now() / 1000);
          await database
            .update(sqliteSchema.image_upload_queue)
            .set({ status: 'failed', updated_at: updateTime })
            .where(eq(sqliteSchema.image_upload_queue.id, task.id));
          ImageUploadQueue.notifySubscribers();
        } finally {
          if (tempCompressedFile) {
            try {
              const info = await FileSystem.getInfoAsync(tempCompressedFile);
              if (info.exists) {
                await FileSystem.deleteAsync(tempCompressedFile, {
                  idempotent: true,
                });
                console.log(
                  `[ImageUploadQueue] Cleaned up temp compressed file: ${tempCompressedFile}`,
                );
              }
            } catch (cleanupErr) {
              console.warn(
                '[ImageUploadQueue] Failed to delete temp compressed file:',
                cleanupErr,
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('[ImageUploadQueue] Error in queue processing loop:', err);
    } finally {
      isProcessing = false;
      console.log('[ImageUploadQueue] Queue processor loop ended.');
    }
  }
}
