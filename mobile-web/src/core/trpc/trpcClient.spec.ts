let capturedHeadersFn: (() => Record<string, string>) | null = null;

jest.mock('@trpc/client', () => ({
  createTRPCProxyClient: jest.fn().mockImplementation((config) => {
    // Intercept the links and retrieve headers function
    capturedHeadersFn = config.links?.[0]?.headers || null;
    return {};
  }),
  httpBatchLink: jest.fn().mockImplementation((options) => ({
    url: options.url,
    headers: options.headers,
  })),
}));

const mockGetState = jest.fn();
jest.mock('../store/cartStore', () => ({
  useCartStore: {
    getState: () => mockGetState(),
  },
}));

const mockGetLatestAuditHash = jest.fn();
jest.mock('../utils/audit', () => ({
  getLatestAuditHash: () => mockGetLatestAuditHash(),
}));

let trpcClient: any;

beforeAll(() => {
  jest.isolateModules(() => {
    trpcClient = (require as any)('./trpcClient').trpcClient;
  });
});

describe('trpcClient headers propagation', () => {
  const invokeHeaders = (): Record<string, string> => {
    if (!capturedHeadersFn) {
      throw new Error('capturedHeadersFn is not defined');
    }
    return capturedHeadersFn();
  };

  beforeEach(() => {
    mockGetState.mockReset();
    mockGetLatestAuditHash.mockReset();
  });

  it('initializes trpcClient with links interceptor', () => {
    expect(trpcClient).toBeDefined();
    expect(capturedHeadersFn).toBeInstanceOf(Function);
  });

  it('propagates traceId from active session and latest audit hash chain', () => {
    mockGetState.mockReturnValue({
      activeTabId: 'shop-abc',
      sessions: {
        'shop-abc': { traceId: 'trace-12345' },
      },
      recoveryState: { activeTabId: 'shop-xyz' },
    });
    mockGetLatestAuditHash.mockReturnValue('hash-abcdef-123456');

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'trace-12345',
      'x-hash-chain': 'hash-abcdef-123456',
    });
  });

  it('falls back to recovery activeTabId when active session traceId is missing', () => {
    mockGetState.mockReturnValue({
      activeTabId: 'shop-abc',
      sessions: {
        'shop-abc': { traceId: null },
      },
      recoveryState: { activeTabId: 'shop-recovery-xyz' },
    });
    mockGetLatestAuditHash.mockReturnValue(null);

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'shop-recovery-xyz',
      'x-hash-chain': 'genesis',
    });
  });

  it('falls back to recovery activeTabId when session object for activeTabId is missing', () => {
    mockGetState.mockReturnValue({
      activeTabId: 'shop-abc',
      sessions: {},
      recoveryState: { activeTabId: 'shop-recovery-xyz' },
    });
    mockGetLatestAuditHash.mockReturnValue(null);

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'shop-recovery-xyz',
      'x-hash-chain': 'genesis',
    });
  });

  it('falls back to recovery activeTabId when activeTabId itself is missing', () => {
    mockGetState.mockReturnValue({
      activeTabId: null,
      sessions: {},
      recoveryState: { activeTabId: 'shop-recovery-xyz' },
    });
    mockGetLatestAuditHash.mockReturnValue(undefined);

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'shop-recovery-xyz',
      'x-hash-chain': 'genesis',
    });
  });

  it('falls back to system-trace-boot when active session traceId and recovery activeTabId are both missing', () => {
    mockGetState.mockReturnValue({
      activeTabId: 'shop-abc',
      sessions: {
        'shop-abc': { traceId: null },
      },
      recoveryState: null,
    });
    mockGetLatestAuditHash.mockReturnValue('hash-xyz');

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'system-trace-boot',
      'x-hash-chain': 'hash-xyz',
    });
  });

  it('uses system-trace-boot fallback when no trace context is available', () => {
    mockGetState.mockReturnValue({
      activeTabId: null,
      sessions: {},
      recoveryState: null,
    });
    mockGetLatestAuditHash.mockReturnValue('');

    const headers = invokeHeaders();

    expect(headers).toEqual({
      'x-trace-id': 'system-trace-boot',
      'x-hash-chain': 'genesis',
    });
  });
});
