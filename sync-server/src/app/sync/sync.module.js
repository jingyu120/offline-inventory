import { __decorate } from 'tslib';
import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
let SyncModule = class SyncModule {};
SyncModule = __decorate(
  [
    Module({
      controllers: [SyncController],
      providers: [SyncService],
    }),
  ],
  SyncModule,
);
export { SyncModule };
//# sourceMappingURL=sync.module.js.map
