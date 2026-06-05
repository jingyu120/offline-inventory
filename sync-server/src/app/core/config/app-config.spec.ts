import { Test, TestingModule } from '@nestjs/testing';
import { AppConfig } from './app-config';

describe('AppConfig', () => {
  let config: AppConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppConfig],
    }).compile();

    config = module.get<AppConfig>(AppConfig);
  });

  it('should be defined', () => {
    expect(config).toBeDefined();
  });

  it('should return config properties', () => {
    expect(config.uploadsDir).toBe('uploads');
    expect(config.mapCacheMaxAge).toBe(86400);
    expect(config.osmUserAgent).toContain('BurmaInventory');
    expect(config.osmThrottleDelayMs).toBe(200);
    expect(config.osmTileUrlTemplate).toBe('https://tile.openstreetmap.org');
    expect(config.ollamaModel).toBe('gemma4');
    expect(config.ollamaTimeoutMs).toBe(30000);
    expect(config.gemmaApiUrl).toBeDefined();
    expect(config.uploadsWatcherDelayMs).toBe(1000);
    expect(config.uploadsUrlPrefix).toBe('/api/sync/uploads/');
  });

  it('should generate a unique suffix', () => {
    const suffix1 = config.getUniqueSuffix();
    const suffix2 = config.getUniqueSuffix();
    expect(suffix1).toBeDefined();
    expect(suffix2).toBeDefined();
    expect(suffix1).not.toBe(suffix2);
  });
});
