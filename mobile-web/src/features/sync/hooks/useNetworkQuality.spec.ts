import { act, renderHook } from '@testing-library/react-native';

jest.mock('react', () => jest.requireActual('react'));

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
    },
  };
});

let NetInfo: any;
let useNetworkQuality: any;
let getActiveNetworkQuality: any;
let NetworkQualityObserver: any;

beforeAll(() => {
  jest.isolateModules(() => {
    NetInfo = (require as any)('@react-native-community/netinfo').default;
    const module = (require as any)('./useNetworkQuality');
    useNetworkQuality = module.useNetworkQuality;
    getActiveNetworkQuality = module.getActiveNetworkQuality;
    NetworkQualityObserver = module.NetworkQualityObserver;
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
});
