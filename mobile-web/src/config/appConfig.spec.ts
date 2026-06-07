describe('appConfig getApiBaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses default API base URL when no env variable is defined', () => {
    delete process.env.SYNC_API_URL;
    delete process.env.EXPO_PUBLIC_SYNC_API_URL;
    const { API_BASE_URL } = (require as any)('./appConfig');
    expect(API_BASE_URL).toBe('http://localhost:3000/api');
  });

  it('uses SYNC_API_URL and strips trailing /sync if present', () => {
    process.env.SYNC_API_URL = 'http://my-api.com/sync';
    const { API_BASE_URL } = (require as any)('./appConfig');
    expect(API_BASE_URL).toBe('http://my-api.com');
  });

  it('uses SYNC_API_URL without stripping if it does not end with /sync', () => {
    process.env.SYNC_API_URL = 'http://my-api.com/api';
    const { API_BASE_URL } = (require as any)('./appConfig');
    expect(API_BASE_URL).toBe('http://my-api.com/api');
  });
});

describe('appConfig helper functions', () => {
  let appConfig: any;

  beforeAll(() => {
    appConfig = (require as any)('./appConfig');
  });

  it('getRepresentativeName returns rep name if found, or repId if not found', () => {
    expect(appConfig.getRepresentativeName('rep-1')).toBe('Ko Min');
    expect(appConfig.getRepresentativeName('rep-unknown')).toBe('rep-unknown');
  });

  it('getLogTypeLabel returns Viber or translates or replaces underscore', () => {
    const tMock = jest.fn((key) => `translated-${key}`);
    expect(appConfig.getLogTypeLabel('VIBER', tMock)).toBe('Viber');
    expect(appConfig.getLogTypeLabel('SHOP_VISIT', tMock)).toBe(
      'translated-typeVisit',
    );
    expect(appConfig.getLogTypeLabel('SOME_UNKNOWN_TYPE', tMock)).toBe(
      'SOME UNKNOWN TYPE',
    );
  });
});
