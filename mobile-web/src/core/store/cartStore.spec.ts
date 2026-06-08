import { useCartStore, defaultSession } from './cartStore';
import { StateRecovery } from '../utils/stateRecovery';

jest.mock('../utils/stateRecovery', () => {
  return {
    StateRecovery: {
      saveState: jest.fn(),
      loadState: jest.fn().mockReturnValue({
        currentScreen: 'ledger',
        selectedShopId: null,
        activeRowIndex: null,
        loggingModalVisible: false,
      }),
    },
  };
});

describe('cartStore', () => {
  beforeEach(() => {
    // Reset store sessions before each test
    useCartStore.setState({ sessions: {} });
    jest.clearAllMocks();
  });

  it('returns defaultSession on getOrCreateSession when not initialized', () => {
    const session = useCartStore.getState().getOrCreateSession('shop-1');
    expect(session).toEqual(defaultSession);
  });

  it('updates session fields using partial updates', () => {
    useCartStore
      .getState()
      .updateSession('shop-1', { selectedCurrency: 'USD' });
    const session = useCartStore.getState().getOrCreateSession('shop-1');
    expect(session.selectedCurrency).toBe('USD');
    expect(session.selectedItems).toEqual([]);
  });

  it('updates session using callback functions', () => {
    useCartStore
      .getState()
      .updateSession('shop-1', { selectedCurrency: 'USD', selectedItems: [] });
    useCartStore.getState().updateSession('shop-1', (prev) => ({
      selectedCurrency: prev.selectedCurrency === 'USD' ? 'THB' : 'MMK',
    }));

    const session = useCartStore.getState().getOrCreateSession('shop-1');
    expect(session.selectedCurrency).toBe('THB');
  });

  it('clears session from store successfully', () => {
    useCartStore
      .getState()
      .updateSession('shop-1', { selectedCurrency: 'USD' });
    useCartStore.getState().clearSession('shop-1');

    const session = useCartStore.getState().getOrCreateSession('shop-1');
    expect(session).toEqual(defaultSession);
  });

  it('saves application recovery state successfully', () => {
    const recoveryUpdate = {
      currentScreen: 'intake' as const,
      selectedShopId: 'shop-123',
    };
    useCartStore.getState().setRecoveryState(recoveryUpdate);

    expect(useCartStore.getState().recoveryState).toEqual({
      currentScreen: 'intake',
      selectedShopId: 'shop-123',
      activeRowIndex: null,
      loggingModalVisible: false,
    });
    expect(StateRecovery.saveState).toHaveBeenCalled();
  });

  it('updates activeTabId and saves to state recovery on setActiveTabId', () => {
    useCartStore.getState().setActiveTabId('shop-xyz');

    expect(useCartStore.getState().activeTabId).toBe('shop-xyz');
    expect(useCartStore.getState().recoveryState?.activeTabId).toBe('shop-xyz');
    expect(useCartStore.getState().recoveryState?.selectedShopId).toBe(
      'shop-xyz',
    );
    expect(StateRecovery.saveState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTabId: 'shop-xyz',
        selectedShopId: 'shop-xyz',
      }),
    );
  });

  it('instantiates default recoveryState when loadState returns null', () => {
    (StateRecovery.loadState as jest.Mock).mockReturnValueOnce(null);

    jest.isolateModules(() => {
      const { useCartStore: freshCartStore } = (require as any)('./cartStore');
      expect(freshCartStore.getState().recoveryState).toEqual({
        currentScreen: 'ledger',
        selectedShopId: null,
        activeRowIndex: null,
        loggingModalVisible: false,
        activeTabId: null,
      });
      expect(freshCartStore.getState().activeTabId).toBeNull();
    });
  });

  it('loads activeTabId from recoveryState when loadState returns non-null with activeTabId', () => {
    (StateRecovery.loadState as jest.Mock).mockReturnValue({
      activeTabId: 'shop-recovered',
    });

    jest.isolateModules(() => {
      const { useCartStore: freshCartStore } = (require as any)('./cartStore');
      expect(freshCartStore.getState().activeTabId).toBe('shop-recovered');
    });

    // Restore original mock value
    (StateRecovery.loadState as jest.Mock).mockReturnValue({
      currentScreen: 'ledger',
      selectedShopId: null,
      activeRowIndex: null,
      loggingModalVisible: false,
    });
  });

  it('handles empty recoveryState when setting recovery state or active tab id', () => {
    useCartStore.setState({ recoveryState: null as any });
    useCartStore.getState().setRecoveryState({ currentScreen: 'ledger' });
    expect(useCartStore.getState().recoveryState).toEqual({
      currentScreen: 'ledger',
    });

    useCartStore.setState({ recoveryState: null as any });
    useCartStore.getState().setActiveTabId('shop-xyz');
    expect(useCartStore.getState().recoveryState).toEqual({
      activeTabId: 'shop-xyz',
      selectedShopId: 'shop-xyz',
    });
  });

  it('supports setting preFillSku and preFillQty fields in session', () => {
    useCartStore.getState().updateSession('shop-1', {
      preFillSku: 'SKU-ABC',
      preFillQty: 5,
    });
    const session = useCartStore.getState().getOrCreateSession('shop-1');
    expect(session.preFillSku).toBe('SKU-ABC');
    expect(session.preFillQty).toBe(5);
  });
});
