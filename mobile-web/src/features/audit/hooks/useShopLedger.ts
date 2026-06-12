import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { eq } from 'drizzle-orm';
import { Shop, sqliteSchema, guardAsync } from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { mapShop } from '../../../core/data/repositories';
import { useCartStore } from '../../../core/store/cartStore';
import { useTranslation } from '../../../core/i18n/i18n';
import { useShopsData, UseShopsDataReturn } from './useShopsData';

const DEFAULT_LOCKED_CAPITAL = 'K235,000,000';

export interface LedgerStats {
  shopsCount: number;
  projectsCount: number;
  lockedCapital: string;
}

export interface UseShopLedgerReturn {
  shopsData: UseShopsDataReturn;
  stats: LedgerStats;
  loggingModalVisible: boolean;
  loggingShop: Shop | null;
  registerModalVisible: boolean;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  handleLogInteraction: (shop: Shop) => void;
  handleCloseLoggingModal: () => Promise<void>;
  handleRegisterSuccess: (shopId: string) => Promise<void>;
}

const fetchShopById = async (shopId: string): Promise<Shop | null> => {
  const [rows, error] = await guardAsync(
    database
      .select()
      .from(sqliteSchema.shops)
      .where(eq(sqliteSchema.shops.id, shopId)),
  );
  if (error) {
    console.error('[ShopLedger] Failed to fetch shop by id:', error);
    return null;
  }
  if (rows && rows.length > 0) {
    return mapShop(rows[0]);
  }
  return null;
};

export const useShopLedger = (): UseShopLedgerReturn => {
  const { t } = useTranslation();
  const shopsData = useShopsData();
  const { shops, loading, selectedShop, selectShop, loadShops } = shopsData;

  const [loggingModalVisible, setLoggingModalVisible] = useState(false);
  const [loggingShop, setLoggingShop] = useState<Shop | null>(null);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  const setRecoveryState = useCartStore((state) => state.setRecoveryState);

  const [stats, setStats] = useState<LedgerStats>({
    shopsCount: shops.length,
    projectsCount: 0,
    lockedCapital: DEFAULT_LOCKED_CAPITAL,
  });

  const handleLogInteraction = useCallback((shop: Shop) => {
    setLoggingShop(shop);
    setLoggingModalVisible(true);
  }, []);

  const handleCloseLoggingModal = useCallback(async () => {
    setLoggingModalVisible(false);
    if (loggingShop) {
      await selectShop(loggingShop);
    }
  }, [loggingShop, selectShop]);

  const handleRegisterSuccess = useCallback(
    async (shopId: string) => {
      await loadShops();
      const mappedShop = await fetchShopById(shopId);
      if (mappedShop) {
        await selectShop(mappedShop);
      }
    },
    [loadShops, selectShop],
  );

  const openRegisterModal = useCallback(
    () => setRegisterModalVisible(true),
    [],
  );
  const closeRegisterModal = useCallback(
    () => setRegisterModalVisible(false),
    [],
  );

  // Hydrate transient state recovery on boot
  useEffect(() => {
    let active = true;
    const restoreRecoveryState = async () => {
      const recoveryState = useCartStore.getState().recoveryState;
      const targetShopId =
        recoveryState?.activeTabId || recoveryState?.selectedShopId;
      if (!targetShopId) {
        return;
      }
      const mappedShop = await fetchShopById(targetShopId);
      if (mappedShop && active) {
        await selectShop(mappedShop);
        if (recoveryState?.loggingModalVisible) {
          setLoggingShop(mappedShop);
          setLoggingModalVisible(true);
        }
      }
    };
    if (!loading && shops.length > 0) {
      restoreRecoveryState();
    }
    return () => {
      active = false;
    };
  }, [loading, shops.length]);

  // Sync selectedShop and loggingModalVisible back to recoveryState
  useEffect(() => {
    setRecoveryState({
      selectedShopId: selectedShop?.id || null,
      loggingModalVisible,
      activeTabId: selectedShop?.id || null,
    });

    const activeTabId = useCartStore.getState().activeTabId;
    if (selectedShop && selectedShop.id !== activeTabId) {
      useCartStore.getState().setActiveTabId(selectedShop.id);
    } else if (!selectedShop && activeTabId) {
      useCartStore.getState().setActiveTabId(null);
    }
  }, [selectedShop, loggingModalVisible, setRecoveryState]);

  // Refresh dashboard KPI stats whenever the shop list changes
  useEffect(() => {
    const fetchStats = async () => {
      const [result, error] = await guardAsync(
        Promise.all([
          database.select().from(sqliteSchema.shops),
          database.select().from(sqliteSchema.projects),
        ]),
      );
      if (error) {
        console.error('Failed to load dashboard stats:', error);
        return;
      }
      if (result) {
        const [allShops, allProjects] = result;
        setStats({
          shopsCount: allShops.length,
          projectsCount: allProjects.length,
          lockedCapital: DEFAULT_LOCKED_CAPITAL,
        });
      }
    };
    fetchStats();
  }, [shops]);

  // Prompt to restore or discard any persisted draft cart on first mount
  useEffect(() => {
    const checkDraftCart = async () => {
      const [drafts, error] = await guardAsync(
        database.select().from(sqliteSchema.draft_carts),
      );
      if (error) {
        console.error(
          '[Recovery Hook] Failed to check for draft carts:',
          error,
        );
        return;
      }
      if (!drafts || drafts.length === 0) {
        return;
      }
      const draft = drafts[0];
      Alert.alert(t('restoreSessionTitle'), t('restoreSessionMsg'), [
        {
          text: t('discard'),
          style: 'destructive',
          onPress: async () => {
            await guardAsync(
              database
                .delete(sqliteSchema.draft_carts)
                .where(eq(sqliteSchema.draft_carts.id, draft.id)),
            );
          },
        },
        {
          text: t('restore'),
          onPress: async () => {
            const mappedShop = await fetchShopById(draft.shop_id);
            if (mappedShop) {
              await selectShop(mappedShop);
              handleLogInteraction(mappedShop);
            }
          },
        },
      ]);
    };
    checkDraftCart();
  }, []);

  return {
    shopsData,
    stats,
    loggingModalVisible,
    loggingShop,
    registerModalVisible,
    openRegisterModal,
    closeRegisterModal,
    handleLogInteraction,
    handleCloseLoggingModal,
    handleRegisterSuccess,
  };
};
