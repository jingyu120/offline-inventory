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
});
