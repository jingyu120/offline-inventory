import { Injectable, Scope, Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class ActorService {
  constructor(@Optional() @Inject(REQUEST) private readonly request: Request) {}

  getActorId(): string {
    if (!this.request || !this.request.headers) return 'system';
    return (this.request.headers['x-actor-id'] as string) || 'system';
  }

  getDeviceId(): string {
    if (!this.request || !this.request.headers) return 'system-device';
    return (this.request.headers['x-device-id'] as string) || 'system-device';
  }

  getTraceId(): string | undefined {
    if (!this.request || !this.request.headers) return undefined;
    return this.request.headers['x-trace-id'] as string;
  }
}
