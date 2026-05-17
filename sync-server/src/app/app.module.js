import { __decorate } from 'tslib';
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma';
import { SyncModule } from './sync/sync.module';
import { HealthController } from './health.controller';
let AppModule = class AppModule {};
AppModule = __decorate(
  [
    Module({
      imports: [PrismaModule, SyncModule],
      controllers: [HealthController],
    }),
  ],
  AppModule,
);
export { AppModule };
//# sourceMappingURL=app.module.js.map
