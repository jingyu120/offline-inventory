import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ActorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request && request.headers) {
      // Inject actor details into request context
      request.actorId = request.headers['x-actor-id'] || 'system';
      request.deviceId = request.headers['x-device-id'] || 'system-device';
      request.traceId = request.headers['x-trace-id'];
    }
    return next.handle();
  }
}
