import { __decorate, __metadata, __param } from 'tslib';
import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
let SyncController = class SyncController {
  constructor(syncService) {
    this.syncService = syncService;
  }
  async pullChanges(lastPulledAt) {
    const timestamp = parseInt(lastPulledAt, 10) || 0;
    return this.syncService.pullChanges(timestamp);
  }
  async pushChanges(body) {
    if (!body.changes) {
      return { success: false, error: 'No changes provided' };
    }
    await this.syncService.pushChanges(body.changes);
    return { success: true };
  }
};
__decorate(
  [
    Get(),
    __param(0, Query('last_pulled_at')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'pullChanges',
  null,
);
__decorate(
  [
    Post(),
    __param(0, Body()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'pushChanges',
  null,
);
SyncController = __decorate(
  [Controller('sync'), __metadata('design:paramtypes', [SyncService])],
  SyncController,
);
export { SyncController };
//# sourceMappingURL=sync.controller.js.map
