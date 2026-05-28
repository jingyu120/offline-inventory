import { create } from 'zustand';

export interface CartItem {
  item: any;
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
}

export const useCartStore = create<CartState>((set, get) => ({
  sessions: {},

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
}));
