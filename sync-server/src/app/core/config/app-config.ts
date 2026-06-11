import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfig {
  readonly uploadsDir = 'uploads';
  readonly mapCacheMaxAge = 86400; // 1 day
  readonly osmUserAgent = 'BurmaInventory/1.0 (contact@burmainventory.org)';
  readonly osmThrottleDelayMs = 200;
  readonly osmTileUrlTemplate = 'https://tile.openstreetmap.org';
  readonly mutedTileUrlTemplate = 'https://a.basemaps.cartocdn.com/light_all';
  readonly ollamaModel = 'gemma4';
  readonly ollamaTimeoutMs = 30000;
  readonly ollamaMaxRetries = 2;
  readonly ollamaBackoffMs = 250;
  readonly gemmaApiUrl = process.env.GEMMA_API_URL || 'http://localhost:11434';
  readonly uploadsWatcherDelayMs = 1000;
  readonly uploadsUrlPrefix = '/api/sync/uploads/';

  readonly auditGenesisHash = 'genesis';
  readonly anomalyQuantityMultiplier = 5;
  readonly anomalyWindowDays = 30;
  readonly autoInvoiceDueDays = 30;
  readonly autoInvoiceGracePeriodDays = 7;

  getUniqueSuffix(): string {
    return Date.now() + '-' + Math.round(Math.random() * 1e9);
  }
}
