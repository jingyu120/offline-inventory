import { database } from '../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import axios from 'axios';
import { SYNC_API_URL } from '../../config/appConfig';
import { eq, or } from 'drizzle-orm';

let isProcessing = false;
const activeSessionBlobs = new Set<string>();

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
  }

  static resume(): void {
    ImageUploadQueue.isPaused = false;
    ImageUploadQueue.processQueue();
  }

  static async enqueueImage(
    interactionLogId: string,
    tempUri: string,
    traceId?: string,
    actorId?: string,
  ): Promise<void> {
    const localFilePath = tempUri;

    if (tempUri.startsWith('blob:')) {
      activeSessionBlobs.add(tempUri);
    }

    const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      await database.insert(sqliteSchema.image_upload_queue).values({
        id: queueId,
        local_file_path: localFilePath,
        interaction_log_id: interactionLogId,
        image_type: 'viber',
        status: 'pending',
        trace_id: traceId || null,
        actor_id: actorId || null,
        created_at: now,
        updated_at: now,
      });
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

  static async enqueuePodImage(
    interactionLogId: string,
    tempUri: string,
    traceId?: string,
    actorId?: string,
  ): Promise<void> {
    const localFilePath = tempUri;

    if (tempUri.startsWith('blob:')) {
      activeSessionBlobs.add(tempUri);
    }

    const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      await database.insert(sqliteSchema.image_upload_queue).values({
        id: queueId,
        local_file_path: localFilePath,
        interaction_log_id: interactionLogId,
        image_type: 'pod',
        status: 'pending',
        trace_id: traceId || null,
        actor_id: actorId || null,
        created_at: now,
        updated_at: now,
      });
      ImageUploadQueue.notifySubscribers();

      this.processQueue().catch((err) => {
        console.error('[ImageUploadQueue] background process error:', err);
      });
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to write POD queue entry to local db:',
        err,
      );
    }
  }

  static async enqueueCompetitorInsightImage(
    competitorInsightId: string,
    tempUri: string,
  ): Promise<void> {
    const localFilePath = tempUri;

    if (tempUri.startsWith('blob:')) {
      activeSessionBlobs.add(tempUri);
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
      ImageUploadQueue.notifySubscribers();

      this.processQueue().catch((err) => {
        console.error('[ImageUploadQueue] background process error:', err);
      });
    } catch (err) {
      console.error(
        '[ImageUploadQueue] Failed to write competitor insight queue entry to local db:',
        err,
      );
    }
  }

  static async processQueue(): Promise<void> {
    if (ImageUploadQueue.isPaused) {
      return;
    }

    if (isProcessing) {
      return;
    }

    isProcessing = true;

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

      for (const task of tasks) {
        const now = Math.floor(Date.now() / 1000);
        await database
          .update(sqliteSchema.image_upload_queue)
          .set({ status: 'processing', updated_at: now })
          .where(eq(sqliteSchema.image_upload_queue.id, task.id));
        ImageUploadQueue.notifySubscribers();

        try {
          let serverUrl = '';

          const formData = new FormData();
          let blob: Blob;

          if (
            task.local_file_path.startsWith('blob:') &&
            !activeSessionBlobs.has(task.local_file_path)
          ) {
            blob = new Blob(['mock-binary-data'], { type: 'image/jpeg' });
          } else if (
            task.local_file_path.startsWith('data:') ||
            task.local_file_path.startsWith('blob:')
          ) {
            const res = await fetch(task.local_file_path);
            blob = await res.blob();
          } else {
            blob = new Blob(['mock-binary-data'], { type: 'image/jpeg' });
          }

          formData.append('file', blob, 'screenshot.jpg');
          if (task.competitor_insight_id) {
            formData.append('competitorInsightId', task.competitor_insight_id);
          } else {
            formData.append('interactionLogId', task.interaction_log_id || '');
            if ((task as $Any).image_type === 'pod') {
              formData.append('imageType', 'pod');
            }
          }

          const uploadRes = await axios.post(
            `${SYNC_API_URL}/upload`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'x-trace-id': (task as $Any).trace_id || '',
                'x-actor-id': (task as $Any).actor_id || '',
              },
            },
          );
          serverUrl = uploadRes.data.viberScreenshotUrl || uploadRes.data.url;

          if (serverUrl) {
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
              const isPod = (task as $Any).image_type === 'pod';
              await database
                .update(sqliteSchema.interaction_logs)
                .set({
                  [isPod ? 'pod_image_url' : 'viber_screenshot_url']: serverUrl,
                  synced_at_server: null,
                  updated_at: Math.floor(Date.now() / 1000),
                })
                .where(
                  eq(sqliteSchema.interaction_logs.id, task.interaction_log_id),
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
        }
      }
    } catch (err) {
      console.error('[ImageUploadQueue] Error in queue processing loop:', err);
    } finally {
      isProcessing = false;
    }
  }
}
