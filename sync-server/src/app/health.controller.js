import { __decorate, __metadata } from 'tslib';
import { Controller, Get } from '@nestjs/common';
let HealthController = class HealthController {
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
};
__decorate(
  [
    Get(),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  HealthController.prototype,
  'check',
  null,
);
HealthController = __decorate([Controller('health')], HealthController);
export { HealthController };
//# sourceMappingURL=health.controller.js.map
