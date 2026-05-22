import { database } from '../database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { SYNC_API_URL } from '../config';
import { Platform } from 'react-native';
import { eq, or } from 'drizzle-orm';

let isProcessing = false;

export class ImageUploadQueue {
  /**
   * Enqueues an offline viber screenshot.
   * Copies the temporary image file to a persistent location, saves a record in the SQLite queue,
   * and triggers the processQueue runner.
   */
  static async enqueueImage(
    interactionLogId: string,
    tempUri: string,
  ): Promise<void> {
    console.log(
      `[ImageUploadQueue] Enqueuing screenshot for log ${interactionLogId}, tempUri: ${tempUri}`,
    );

    let localFilePath = tempUri;

    if (Platform.OS !== 'web') {
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

      // Start processing background queue
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

  /**
   * Sequentially processes all pending or failed upload tasks in the queue.
   */
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
      // Find all tasks that are pending or failed
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

        // Update task status to processing
        const now = Math.floor(Date.now() / 1000);
        await database
          .update(sqliteSchema.image_upload_queue)
          .set({ status: 'processing', updated_at: now })
          .where(eq(sqliteSchema.image_upload_queue.id, task.id));

        try {
          let serverUrl = '';

          if (Platform.OS === 'web') {
            // Web upload flow
            const formData = new FormData();
            let blob: Blob;

            if (
              task.local_file_path.startsWith('data:') ||
              task.local_file_path.startsWith('blob:')
            ) {
              const res = await fetch(task.local_file_path);
              blob = await res.blob();
            } else {
              // Fallback/mock blob if it's not a valid web URL
              blob = new Blob(['mock-binary-data'], { type: 'image/jpeg' });
            }

            formData.append('file', blob, 'screenshot.jpg');
            formData.append('interactionLogId', task.interaction_log_id);

            const uploadRes = await axios.post(
              `${SYNC_API_URL}/sync/upload`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              },
            );
            serverUrl = uploadRes.data.viberScreenshotUrl || uploadRes.data.url;
          } else {
            // Native upload flow using expo-file-system
            const uploadResult = await FileSystem.uploadAsync(
              `${SYNC_API_URL}/sync/upload`,
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
          }

          if (serverUrl) {
            console.log(
              `[ImageUploadQueue] Upload succeeded. Server URL: ${serverUrl}`,
            );

            // 1. Update local interaction log
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

            // 2. Clean up file locally if native
            if (Platform.OS !== 'web') {
              try {
                const info = await FileSystem.getInfoAsync(
                  task.local_file_path,
                );
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
            }

            // 3. Remove task from queue
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

          // Mark task as failed
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
