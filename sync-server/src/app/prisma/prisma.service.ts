import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not defined');

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');

    // Seed default reps to prevent sync foreign key errors when database is fresh.
    // Passwords are bcrypt-hashed; update:{} means re-runs are no-ops (idempotent).
    try {
      const hashedPassword = await bcrypt.hash('changeme-rep-default', 10);
      await (this as any).user.upsert({
        where: { id: 'rep-1' },
        update: {},
        create: {
          id: 'rep-1',
          username: 'rep1',
          password: hashedPassword,
        },
      });
      await (this as any).user.upsert({
        where: { id: 'rep-2' },
        update: {},
        create: {
          id: 'rep-2',
          username: 'rep2',
          password: hashedPassword,
        },
      });
      this.logger.log('Seeded default reps (rep-1, rep-2) successfully');
    } catch (error: any) {
      this.logger.error('Failed to seed default reps:', error.message || error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
