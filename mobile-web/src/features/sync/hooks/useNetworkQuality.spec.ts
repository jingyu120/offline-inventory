import { act, renderHook } from '@testing-library/react-native';
import { syncData } from '../syncEngine';

jest.mock('react', () => jest.requireActual('react'));
jest.mock('../syncEngine', () => ({
  syncData: jest.fn().mockResolvedValue(undefined),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
}

let mockAddEventListenerCallback: ((state: any) => void) | null = null;
let addEventListenerCalled = false;

const mockAddEventListenerFn = jest.fn().mockImplementation((cb) => {
  mockAddEventListenerCallback = cb;
  addEventListenerCalled = true;
  return () => undefined;
});

jest.mock('@react-native-community/netinfo', () => {
  const mockFetchFn = jest.fn().mockResolvedValue({
    type: 'wifi',
    isConnected: true,
    details: {},
  });
  return {
    __esModule: true,
    default: {
      fetch: mockFetchFn,
      addEventListener: mockAddEventListenerFn,
      configure: jest.fn(),
    },
  };
});

let NetInfo: any;
let useNetworkQuality: any;
let getActiveNetworkQuality: any;
let NetworkQualityObserver: any;
let mockSyncData: jest.Mock;

beforeAll(() => {
  Object.defineProperty(global, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  });

  jest.isolateModules(() => {
    NetInfo = (require as any)('@react-native-community/netinfo').default;
    const module = (require as any)('./useNetworkQuality');
    useNetworkQuality = module.useNetworkQuality;
    getActiveNetworkQuality = module.getActiveNetworkQuality;
    NetworkQualityObserver = module.NetworkQualityObserver;
    mockSyncData = syncData as jest.Mock;
  });
});

describe('useNetworkQuality', () => {
  beforeEach(() => {
    const mockFetch = NetInfo.fetch as jest.Mock;
    mockFetch.mockClear();
    (global as any).__mockNetworkDegraded = false;
  });

  it('initializes and registers a NetInfo listener at the module level', () => {
    expect(addEventListenerCalled).toBe(true);
    expect(mockAddEventListenerCallback).toBeDefined();
  });

  it('disables the active internet-reachability probe (avoids HEAD "/" request spam)', () => {
    expect(NetInfo.configure).toHaveBeenCalledTimes(1);
    const config = (NetInfo.configure as jest.Mock).mock.calls[0][0];
    expect(config.reachabilityShouldRun()).toBe(false);
  });

  it('updates network quality when a new NetInfo event is received', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'wifi',
      });
    });

    expect(getActiveNetworkQuality()).toEqual({
      isConnected: true,
      type: 'wifi',
      isDegraded: false,
    });
  });

  it('detects cellular 2G network as a degraded network state', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'cellular',
        details: { cellularGeneration: '2g' },
      });
    });

    expect(getActiveNetworkQuality()).toEqual({
      isConnected: true,
      type: 'cellular',
      isDegraded: true,
    });
  });

  it('does not treat cellular 4G network as degraded', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'cellular',
        details: { cellularGeneration: '4g' },
      });
    });

    expect(getActiveNetworkQuality()).toEqual({
      isConnected: true,
      type: 'cellular',
      isDegraded: false,
    });
  });

  it('handles cellular type without details gracefully', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'cellular',
        details: null,
      });
    });

    expect(getActiveNetworkQuality()).toEqual({
      isConnected: true,
      type: 'cellular',
      isDegraded: false,
    });
  });

  it('maps mock network degradation flags to degraded network states', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;
    (global as any).__mockNetworkDegraded = true;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'wifi',
      });
    });

    expect(getActiveNetworkQuality()).toEqual({
      isConnected: true,
      type: 'wifi',
      isDegraded: true,
    });
  });

  it('handles empty/undefined isConnected state gracefully', () => {
    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: null,
        type: 'unknown',
      });
    });

    expect(getActiveNetworkQuality().isConnected).toBe(false);
  });

  it('allows observers to subscribe to network quality changes and unsubscribe properly', () => {
    const observerMock = jest.fn();
    const unsubscribe = NetworkQualityObserver.subscribe(observerMock);

    expect(observerMock).toHaveBeenCalledTimes(1);

    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'ethernet',
      });
    });

    expect(observerMock).toHaveBeenCalledTimes(2);
    expect(observerMock).toHaveBeenLastCalledWith({
      isConnected: true,
      type: 'ethernet',
      isDegraded: false,
    });

    unsubscribe();

    act(() => {
      mockNetInfoCallback({
        isConnected: false,
        type: 'none',
      });
    });

    expect(observerMock).toHaveBeenCalledTimes(2);
  });

  it('hook useNetworkQuality tracks active network quality state updates', () => {
    const { result } = renderHook(() => useNetworkQuality());

    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;

    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'wifi',
      });
    });

    expect(result.current).toEqual({
      isConnected: true,
      type: 'wifi',
      isDegraded: false,
    });

    act(() => {
      mockNetInfoCallback({
        isConnected: false,
        type: 'none',
      });
    });

    expect(result.current).toEqual({
      isConnected: false,
      type: 'none',
      isDegraded: false,
    });
  });

  it('handles errors thrown by subscriber callbacks gracefully', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    let callCount = 0;
    const observerMock = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount > 1) {
        throw new Error('Subscriber error');
      }
    });
    NetworkQualityObserver.subscribe(observerMock);

    const mockNetInfoCallback = mockAddEventListenerCallback as (
      state: any,
    ) => void;
    act(() => {
      mockNetInfoCallback({
        isConnected: true,
        type: 'wifi',
      });
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  describe('SSE Invalidation Stream', () => {
    beforeEach(() => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      if (mockNetInfoCallback) {
        act(() => {
          mockNetInfoCallback({
            isConnected: false,
            type: 'none',
          });
        });
      }
      MockEventSource.instances = [];
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('establishes SSE connection when online and not degraded', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;

      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      expect(MockEventSource.instances.length).toBe(1);
      const instance = MockEventSource.instances[0];
      expect(instance.url).toContain('/live-invalidations');

      // Trigger onopen
      act(() => {
        instance.onopen?.();
      });
    });

    it('triggers targeted syncData on receiving valid message', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      act(() => {
        instance.onmessage?.({
          data: JSON.stringify({ table: 'item_stocks' }),
        });
      });

      expect(mockSyncData).toHaveBeenCalledWith('item_stocks');
    });

    it('does not trigger syncData on receiving invalid message or message without table', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      mockSyncData.mockClear();

      // Invalid JSON
      act(() => {
        instance.onmessage?.({ data: '{invalid' });
      });
      expect(mockSyncData).not.toHaveBeenCalled();

      // No table
      act(() => {
        instance.onmessage?.({ data: JSON.stringify({}) });
      });
      expect(mockSyncData).not.toHaveBeenCalled();
    });

    it('closes connection and schedules reconnect on error if still online', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      expect(instance.close).not.toHaveBeenCalled();

      act(() => {
        instance.onerror?.(new Error('connection closed'));
      });

      expect(instance.close).toHaveBeenCalled();

      // Fast-forward reconnect timer
      expect(MockEventSource.instances.length).toBe(1); // Old one cleared
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(MockEventSource.instances.length).toBe(2); // Reconnect spawned a new one
    });

    it('disconnects SSE when transitioning offline or degraded', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      // Connect first
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      expect(instance.close).not.toHaveBeenCalled();

      // Transition to offline
      act(() => {
        mockNetInfoCallback({
          isConnected: false,
          type: 'none',
        });
      });

      expect(instance.close).toHaveBeenCalled();
    });

    it('warns and returns if EventSource is undefined', () => {
      const originalEventSource = global.EventSource;
      delete (global as any).EventSource;
      delete (globalThis as any).EventSource;

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SSE] EventSource is not defined in this environment.',
      );

      consoleWarnSpy.mockRestore();
      global.EventSource = originalEventSource;
      globalThis.EventSource = originalEventSource;
    });

    it('logs error when targeted syncData rejects', async () => {
      mockSyncData.mockRejectedValueOnce(new Error('Sync failed'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      await act(async () => {
        instance.onmessage?.({
          data: JSON.stringify({ table: 'item_stocks' }),
        });
        await Promise.resolve();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SSE] Targeted sync failed:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('logs error when EventSource constructor throws', () => {
      const originalEventSource = global.EventSource;
      const throwingMock = jest.fn().mockImplementation(() => {
        throw new Error('Constructor failed');
      });
      global.EventSource = throwingMock as any;
      globalThis.EventSource = throwingMock as any;

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SSE] Failed to create EventSource:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      global.EventSource = originalEventSource;
      globalThis.EventSource = originalEventSource;
    });

    it('clears active reconnect timeout on disconnect', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];

      // Trigger error to schedule reconnect
      act(() => {
        instance.onerror?.(new Error('err'));
      });

      // Now transition offline to trigger disconnect while reconnect timeout is pending
      act(() => {
        mockNetInfoCallback({
          isConnected: false,
          type: 'none',
        });
      });

      // Verify that after fast-forwarding, no reconnect happens
      MockEventSource.instances = [];
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(MockEventSource.instances.length).toBe(0);
    });

    it('handles falsy event data in onmessage gracefully', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      mockSyncData.mockClear();

      act(() => {
        instance.onmessage?.({ data: '' });
      });

      expect(mockSyncData).not.toHaveBeenCalled();
    });

    it('handles error gracefully when event source close throws', () => {
      const mockNetInfoCallback = mockAddEventListenerCallback as (
        state: any,
      ) => void;
      act(() => {
        mockNetInfoCallback({
          isConnected: true,
          type: 'wifi',
        });
      });

      const instance = MockEventSource.instances[0];
      instance.close.mockImplementationOnce(() => {
        throw new Error('Close error');
      });

      act(() => {
        mockNetInfoCallback({
          isConnected: false,
          type: 'none',
        });
      });

      expect(instance.close).toHaveBeenCalled();
    });
  });
});
