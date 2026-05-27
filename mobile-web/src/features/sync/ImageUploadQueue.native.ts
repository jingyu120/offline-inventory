import { database } from '../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import * as FileSystem from 'expo-file-system/legacy';
import { SYNC_API_URL } from '../../config/appConfig';
import { eq, or } from 'drizzle-orm';

let isProcessing = false;

export class ImageUploadQueue {
  static async enqueueImage(
    interactionLogId: string,
    tempUri: string,
  ): Promise<void> {
    console.log(
      `[ImageUploadQueue] Enqueuing screenshot for log ${interactionLogId}, tempUri: ${tempUri}`,
    );

    let localFilePath = tempUri;

    try {
      const fsAny = FileSystem as any;
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
        created_at: now,
        updated_at: now,
      });
      console.log(`[ImageUploadQueue] Enqueued task ${queueId}`);

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

  static async processQueue(): Promise<void> {
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
          `[ImageUploadQueue] Processing task ${task.id} (log ID: ${task.interaction_log_id})`,
        );

        const now = Math.floor(Date.now() / 1000);
        await database
          .update(sqliteSchema.image_upload_queue)
          .set({ status: 'processing', updated_at: now })
          .where(eq(sqliteSchema.image_upload_queue.id, task.id));

        try {
          let serverUrl = '';

          const uploadResult = await FileSystem.uploadAsync(
            `${SYNC_API_URL}/upload`,
            task.local_file_path,
            {
              fieldName: 'file',
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              parameters: {
                interactionLogId: task.interaction_log_id,
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
