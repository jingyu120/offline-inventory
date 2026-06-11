import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@burma-inventory/shared-types';
import { DatabaseSeeder } from '../seed/database-seeder';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  public db!: NodePgDatabase<typeof schema.pgSchema>;
  public readDb!: NodePgDatabase<typeof schema.pgSchema>;
  private pool!: Pool;
  private readPool!: Pool;
  private readonly seeder = new DatabaseSeeder();

  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not defined');

    this.pool = new Pool({ connectionString: url });
    this.db = drizzle(this.pool, { schema: schema.pgSchema });

    const replicaUrl = process.env['DATABASE_REPLICA_URL'] || url;
    this.readPool = new Pool({ connectionString: replicaUrl });
    this.readDb = drizzle(this.readPool, { schema: schema.pgSchema });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connected to PostgreSQL via Drizzle (Read-Write split)');
    await this.seed();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.pool.end(), this.readPool.end()]);
    this.logger.log('Disconnected from PostgreSQL (Both pools ended)');
  }

  private async seed(): Promise<void> {
    await this.seeder.seedInitial(this.db);
  }

  async runDeterministicSeeding(): Promise<void> {
    await this.seeder.runDeterministicSeeding(this.db);
  }
}
