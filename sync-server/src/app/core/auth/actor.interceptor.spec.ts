import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ActorInterceptor } from './actor.interceptor';

describe('ActorInterceptor', () => {
  let interceptor: ActorInterceptor;

  beforeEach(() => {
    interceptor = new ActorInterceptor();
  });

  it('injects headers from execution context into request object properties', (done) => {
    const mockRequest: Record<string, unknown> = {
      headers: {
        'x-actor-id': 'actor-abc',
        'x-device-id': 'dev-xyz',
        'x-trace-id': 'trace-111',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => of('next-val'),
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toBe('next-val');
        expect(mockRequest['actorId']).toBe('actor-abc');
        expect(mockRequest['deviceId']).toBe('dev-xyz');
        expect(mockRequest['traceId']).toBe('trace-111');
        done();
      },
    });
  });

  it('injects fallback values when request headers are absent', (done) => {
    const mockRequest: Record<string, unknown> = {
      headers: {},
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => of('next-val'),
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(mockRequest['actorId']).toBe('system');
        expect(mockRequest['deviceId']).toBe('system-device');
        expect(mockRequest['traceId']).toBeUndefined();
        done();
      },
    });
  });
});
