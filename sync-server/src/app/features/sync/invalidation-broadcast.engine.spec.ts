import { Test, TestingModule } from '@nestjs/testing';
import { InvalidationBroadcastEngine } from './invalidation-broadcast.engine';
import { take } from 'rxjs';

const mockConnect = jest.fn();
const mockQuery = jest.fn();
const mockOn = jest.fn();
const mockEnd = jest.fn();

const mockClientInstance = {
  connect: mockConnect,
  query: mockQuery,
  on: mockOn,
  end: mockEnd,
};

jest.mock('pg', () => {
  return {
    Client: jest.fn().mockImplementation(() => mockClientInstance),
  };
});

describe('InvalidationBroadcastEngine', () => {
  let engine: InvalidationBroadcastEngine;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnect.mockReset();
    mockQuery.mockReset();
    mockOn.mockReset();
    mockEnd.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [InvalidationBroadcastEngine],
    }).compile();

    engine = module.get<InvalidationBroadcastEngine>(
      InvalidationBroadcastEngine,
    );
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  it('broadcasts table invalidation events correctly', (done) => {
    engine
      .getInvalidations()
      .pipe(take(1))
      .subscribe({
        next: (event) => {
          expect(event.data).toEqual({ table: 'item_stocks' });
          done();
        },
        error: (err) => done(err),
      });

    engine.broadcast('item_stocks');
  });

  it('handles onModuleInit and onModuleDestroy in test environment without throwing', async () => {
    // NODE_ENV is 'test' so it will skip connecting Client
    await expect(engine.onModuleInit()).resolves.toBeUndefined();
    await expect(engine.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('connects to Postgres and listens for notifications in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost/db';

    // Mock pg client
    mockConnect.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
    let notificationCallback: (msg: any) => void = jest.fn();
    mockOn.mockImplementation((event, cb) => {
      if (event === 'notification') {
        notificationCallback = cb;
      }
    });

    await engine.onModuleInit();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith('LISTEN live_invalidations');
    expect(mockOn).toHaveBeenCalledWith('notification', expect.any(Function));

    // Test notification triggers broadcast
    let broadcasted: any = null;
    const sub = engine.getInvalidations().subscribe((event) => {
      broadcasted = event.data;
    });

    notificationCallback({ payload: JSON.stringify({ table: 'item_stocks' }) });
    expect(broadcasted).toEqual({ table: 'item_stocks' });

    notificationCallback({
      payload: JSON.stringify({ table: 'exchange_rates' }),
    });
    expect(broadcasted).toEqual({ table: 'exchange_rates' });

    // Falsy payload fallback branch (msg.payload || '{}')
    broadcasted = null;
    notificationCallback({}); // payload undefined
    expect(broadcasted).toBeNull();

    // Invalid table
    broadcasted = null;
    notificationCallback({
      payload: JSON.stringify({ table: 'invalid_table' }),
    });
    expect(broadcasted).toBeNull();

    // Invalid json
    notificationCallback({ payload: '{invalid json' });
    expect(broadcasted).toBeNull();

    // Throws non-Error instance in JSON parse
    const spyParse = jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
      throw 'not an Error instance';
    });
    notificationCallback({ payload: '{}' });
    expect(broadcasted).toBeNull();
    spyParse.mockRestore();

    // Clean up
    sub.unsubscribe();
    await engine.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.DATABASE_URL;
  });

  it('handles pgClient connection error and onModuleDestroy end error gracefully', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost/db';

    // Test connection error throwing Error instance
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));
    await expect(engine.onModuleInit()).resolves.toBeUndefined();

    // Test connection error throwing non-Error instance (string)
    mockConnect.mockRejectedValueOnce('Connection failed string');
    await expect(engine.onModuleInit()).resolves.toBeUndefined();

    // Now test destroy with error throwing Error instance
    const mockEndError = jest
      .fn()
      .mockRejectedValueOnce(new Error('Close failed'));
    (engine as any).pgClient = {
      end: mockEndError,
    };
    await expect(engine.onModuleDestroy()).resolves.toBeUndefined();

    // Test destroy with error throwing non-Error instance (string)
    const mockEndErrorString = jest
      .fn()
      .mockRejectedValueOnce('Close failed string');
    (engine as any).pgClient = {
      end: mockEndErrorString,
    };
    await expect(engine.onModuleDestroy()).resolves.toBeUndefined();

    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.DATABASE_URL;
  });

  it('warns and returns if DATABASE_URL is not defined in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const loggerWarnSpy = jest
      .spyOn((engine as any).logger, 'warn')
      .mockImplementation(() => undefined);

    await engine.onModuleInit();

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'DATABASE_URL not defined. Live DB listener disabled.',
    );

    process.env.NODE_ENV = originalNodeEnv;
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    loggerWarnSpy.mockRestore();
  });
});
