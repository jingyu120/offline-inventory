import { Module, Global } from '@nestjs/common';
import { AppConfig } from './app-config';

@Global()
@Module({
  providers: [AppConfig],
  exports: [AppConfig],
})
export class ConfigModule {}
