let PrismaService_1;
import { __decorate, __metadata } from 'tslib';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
let PrismaService = (PrismaService_1 = class PrismaService extends (
  PrismaClient
) {
  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not defined');
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.logger = new Logger(PrismaService_1.name);
  }
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
});
PrismaService = PrismaService_1 = __decorate(
  [Injectable(), __metadata('design:paramtypes', [])],
  PrismaService,
);
export { PrismaService };
//# sourceMappingURL=prisma.service.js.map
