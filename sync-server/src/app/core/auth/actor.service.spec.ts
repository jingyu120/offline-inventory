import { ActorService } from './actor.service';
import { Request } from 'express';

describe('ActorService', () => {
  it('returns custom header values when present', () => {
    const mockRequest = {
      headers: {
        'x-actor-id': 'user-123',
        'x-device-id': 'device-456',
        'x-trace-id': 'trace-789',
      },
    } as unknown as Request;

    const service = new ActorService(mockRequest);
    expect(service.getActorId()).toBe('user-123');
    expect(service.getDeviceId()).toBe('device-456');
    expect(service.getTraceId()).toBe('trace-789');
  });

  it('returns default fallback values when headers are absent', () => {
    const mockRequest = {
      headers: {},
    } as unknown as Request;

    const service = new ActorService(mockRequest);
    expect(service.getActorId()).toBe('system');
    expect(service.getDeviceId()).toBe('system-device');
    expect(service.getTraceId()).toBeUndefined();
  });

  it('handles null request parameter gracefully', () => {
    const service = new ActorService(null as any);
    expect(service.getActorId()).toBe('system');
    expect(service.getDeviceId()).toBe('system-device');
    expect(service.getTraceId()).toBeUndefined();
  });
});
