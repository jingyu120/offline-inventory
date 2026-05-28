import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from monorepo root — single source of truth
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import './env';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const prefix = process.env['SYNC_SERVER_PREFIX'] || 'api';
  const port = process.env['SYNC_SERVER_PORT'] || 3000;

  app.setGlobalPrefix(prefix);
  app.enableCors();

  await app.listen(port);
  Logger.log(`🚀 Server running on http://localhost:${port}/${prefix}`);
}

bootstrap();
