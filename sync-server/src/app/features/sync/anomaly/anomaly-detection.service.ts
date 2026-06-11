import { Injectable, Logger } from '@nestjs/common';
import * as schema from '@burma-inventory/shared-types';
import { and, eq, gte, ne } from 'drizzle-orm';
import { DrizzleService } from '../../../core/drizzle';
import { AppConfig } from '../../../core/config/app-config';

const PENDING_FULFILLMENT_STATUS = 'PENDING_FULFILLMENT';
const MANUAL_REVIEW_REQUIRED_STATUS = 'MANUAL_REVIEW_REQUIRED';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Flags interaction items whose ordered quantity is an outlier relative to the
 * shop's recent ordering history (a moving average over a configurable window),
 * marking them for manual review.
 */
@Injectable()
export class AnomalyDetectionService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: AppConfig,
  ) {}

  async runAnomalyDetection(
    itemChangeset: schema.WatermelonChangeSet<$Any> | undefined,
    logger: Logger,
  ): Promise<void> {
    if (!itemChangeset) return;
    const records = [
      ...(itemChangeset.created || []),
      ...(itemChangeset.updated || []),
    ];

    for (const record of records) {
      if (record.fulfillment_status !== PENDING_FULFILLMENT_STATUS) {
        continue;
      }

      const logs = await this.drizzle.db
        .select()
        .from(schema.pgSchema.interaction_logs)
        .where(
          eq(schema.pgSchema.interaction_logs.id, record.interaction_log_id),
        )
        .limit(1);
      const log = logs[0] || null;
      if (!log || !log.shop_id) {
        continue;
      }

      const shopId = log.shop_id;
      const windowStart =
        Date.now() - this.config.anomalyWindowDays * MILLISECONDS_PER_DAY;

      const historicalItems = await this.drizzle.db
        .select({
          quantity: schema.pgSchema.interaction_items.quantity,
          logId: schema.pgSchema.interaction_logs.id,
        })
        .from(schema.pgSchema.interaction_items)
        .innerJoin(
          schema.pgSchema.interaction_logs,
          eq(
            schema.pgSchema.interaction_items.interaction_log_id,
            schema.pgSchema.interaction_logs.id,
          ),
        )
        .where(
          and(
            eq(schema.pgSchema.interaction_logs.shop_id, shopId),
            gte(schema.pgSchema.interaction_items.created_at, windowStart),
            ne(schema.pgSchema.interaction_logs.id, log.id),
          ),
        );

      const logIds = new Set(historicalItems.map((item) => item.logId));
      const totalQuantity = historicalItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const orderCount = logIds.size;
      const average = orderCount > 0 ? totalQuantity / orderCount : 0;

      if (
        orderCount > 0 &&
        record.quantity > this.config.anomalyQuantityMultiplier * average
      ) {
        logger.log(
          `Anomaly detected: Item ${record.id} quantity ${record.quantity} exceeds 30-day moving average of ${average} by > 500% for shop ${shopId}. Flagging as MANUAL_REVIEW_REQUIRED.`,
        );
        await this.drizzle.db
          .update(schema.pgSchema.interaction_items)
          .set({ compliance_status: MANUAL_REVIEW_REQUIRED_STATUS })
          .where(eq(schema.pgSchema.interaction_items.id, record.id));
      }
    }
  }
}
