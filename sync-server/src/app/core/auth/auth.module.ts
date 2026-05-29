import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActorService } from './actor.service';
import { ActorInterceptor } from './actor.interceptor';

@Global()
@Module({
  providers: [
    ActorService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActorInterceptor,
    },
  ],
  exports: [ActorService],
})
export class AuthModule {}
