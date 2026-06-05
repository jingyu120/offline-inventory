import { create } from 'zustand';
import { StateRecovery, AppRecoveryState } from '../utils/stateRecovery';

export interface CartItem {
  item: $Any;
  quantity: number | string;
  selectedUnit: string;
  unitPrice: number | string;
  stockCondition: string;
  pendingAllocationCount?: number;
}

export interface CartSession {
  selectedItems: CartItem[];
  selectedCurrency: string;
  selectedProjectId: string | null;
  commercialStatus: string;
  type: string;
  notes: string;
  isOverrideMarginAcknowledged: boolean;
  screenshotUri: string | null;
  hasDiscrepancy: boolean;
  traceId?: string | null;
}

export const defaultSession: CartSession = {
  selectedItems: [],
  selectedCurrency: 'MMK',
  selectedProjectId: null,
  commercialStatus: 'ORDER_PLACED',
  type: 'SHOP_VISIT',
  notes: '',
  isOverrideMarginAcknowledged: false,
  screenshotUri: null,
  hasDiscrepancy: false,
  traceId: null,
};

interface CartState {
  sessions: Record<string, CartSession>; // keyed by shopId
  getOrCreateSession: (shopId: string) => CartSession;
  updateSession: (
    shopId: string,
    updates:
      | Partial<CartSession>
      | ((prev: CartSession) => Partial<CartSession>),
  ) => void;
  clearSession: (shopId: string) => void;
  recoveryState: AppRecoveryState | null;
  setRecoveryState: (updates: Partial<AppRecoveryState>) => void;
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  sessions: {},
  recoveryState: StateRecovery.loadState() || {
    currentScreen: 'ledger',
    selectedShopId: null,
    activeRowIndex: null,
    loggingModalVisible: false,
    activeTabId: null,
  },
  activeTabId: StateRecovery.loadState()?.activeTabId || null,

  getOrCreateSession: (shopId) => {
    const session = get().sessions[shopId];
    return session || defaultSession;
  },

  updateSession: (shopId, updates) => {
    set((state) => {
      const prevSession = state.sessions[shopId] || defaultSession;
      const updatedFields =
        typeof updates === 'function' ? updates(prevSession) : updates;
      return {
        sessions: {
          ...state.sessions,
          [shopId]: {
            ...prevSession,
            ...updatedFields,
          },
        },
      };
    });
  },

  clearSession: (shopId) => {
    set((state) => {
      const newSessions = { ...state.sessions };
      delete newSessions[shopId];
      return { sessions: newSessions };
    });
  },

  setRecoveryState: (updates) => {
    set((state) => {
      const newState = {
        ...(state.recoveryState || {}),
        ...updates,
      } as AppRecoveryState;
      StateRecovery.saveState(newState);
      return { recoveryState: newState };
    });
  },

  setActiveTabId: (tabId) => {
    set((state) => {
      const newRecovery = {
        ...(state.recoveryState || {}),
        activeTabId: tabId,
        selectedShopId: tabId,
      } as AppRecoveryState;
      StateRecovery.saveState(newRecovery);
      return {
        activeTabId: tabId,
        recoveryState: newRecovery,
      };
    });
  },
}));
