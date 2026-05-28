import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DrizzleModule } from '../../core/drizzle';
import { QueueModule } from '../../core/queue/queue.module';

@Module({
  imports: [DrizzleModule, forwardRef(() => QueueModule)],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
