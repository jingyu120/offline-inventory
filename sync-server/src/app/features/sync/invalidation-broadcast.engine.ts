import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { Client } from 'pg';

@Injectable()
export class InvalidationBroadcastEngine
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InvalidationBroadcastEngine.name);
  private readonly subject = new Subject<MessageEvent>();
  private pgClient: Client | null = null;

  broadcast(table: 'item_stocks' | 'exchange_rates') {
    this.logger.log(`Broadcasting invalidation for table: ${table}`);
    this.subject.next({
      data: { table },
    });
  }

  getInvalidations(): Observable<MessageEvent> {
    return this.subject.asObservable();
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log(
        'Test environment detected. Skipping active Postgres listener connection.',
      );
      return;
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.warn('DATABASE_URL not defined. Live DB listener disabled.');
      return;
    }

    try {
      this.pgClient = new Client({ connectionString: url });
      await this.pgClient.connect();
      await this.pgClient.query('LISTEN live_invalidations');

      this.pgClient.on('notification', (msg) => {
        try {
          const payload = JSON.parse(msg.payload || '{}');
          if (
            payload.table === 'item_stocks' ||
            payload.table === 'exchange_rates'
          ) {
            this.broadcast(payload.table);
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.error(`Failed to parse pg notification payload: ${msg}`);
        }
      });
      this.logger.log(
        'Successfully established pg LISTEN listener for "live_invalidations"',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to connect pg listener to database: ${msg}`);
    }
  }

  async onModuleDestroy() {
    if (this.pgClient) {
      try {
        await this.pgClient.end();
        this.logger.log('pg LISTEN listener client connection closed.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error closing pg LISTEN client: ${msg}`);
      }
    }
  }
}
