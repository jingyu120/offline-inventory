import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Theme,
  SkeletonCard,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useShopsData } from '../hooks/useShopsData';
import { ShopSidebarList } from '../components/ShopSidebarList';
import { ShopDetailPane } from '../components/ShopDetailPane';
import { useTranslation } from '../../../core/i18n/i18n';
import { InteractionLoggingScreen } from './InteractionLoggingScreen';
import { RegisterShopModal } from '../components/RegisterShopModal';
import { Shop, sqliteSchema } from '@burma-inventory/shared-types';
import { DesignPatternGallery } from '../../../core/components/DesignPatternGallery';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import { mapShop } from '../../../core/data/repositories';
import { useCartStore } from '../../../core/store/cartStore';

export function ShopLedgerScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const {
    shops,
    searchQuery,
    setSearchQuery,
    loading,
    selectedShop,
    setSelectedShop,
    shopContacts,
    shopLogsWithItems,
    selectShop,
    handleSeedData,
    loadShops,
  } = useShopsData();

  const [loggingModalVisible, setLoggingModalVisible] = useState(false);
  const [loggingShop, setLoggingShop] = useState<Shop | null>(null);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  const handleRegisterSuccess = async (shopId: string) => {
    await loadShops();
    const shopDetails = await database
      .select()
      .from(sqliteSchema.shops)
      .where(eq(sqliteSchema.shops.id, shopId));
    if (shopDetails.length > 0) {
      const mappedShop = mapShop(shopDetails[0]);
      await selectShop(mappedShop);
    }
  };

  const setRecoveryState = useCartStore((state) => state.setRecoveryState);

  // Hydrate transient state recovery on boot
  useEffect(() => {
    let active = true;
    const restoreRecoveryState = async () => {
      const recoveryState = useCartStore.getState().recoveryState;
      if (recoveryState?.selectedShopId) {
        console.log(
          '[Recovery] Restoring last selected shop:',
          recoveryState.selectedShopId,
        );
        try {
          const shopDetails = await database
            .select()
            .from(sqliteSchema.shops)
            .where(eq(sqliteSchema.shops.id, recoveryState.selectedShopId));
          if (shopDetails.length > 0 && active) {
            const mappedShop = mapShop(shopDetails[0]);
            await selectShop(mappedShop);
            if (recoveryState.loggingModalVisible) {
              console.log('[Recovery] Restoring logging modal state.');
              setLoggingShop(mappedShop);
              setLoggingModalVisible(true);
            }
          }
        } catch (e) {
          console.error('[Recovery] Failed to restore recovery state:', e);
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
      loggingModalVisible: loggingModalVisible,
    });
  }, [selectedShop, loggingModalVisible, setRecoveryState]);

  const [stats, setStats] = useState({
    shopsCount: shops.length,
    projectsCount: 0,
    lockedCapital: 'K235,000,000',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const allShops = await database.select().from(sqliteSchema.shops);
        const allProjects = await database.select().from(sqliteSchema.projects);
        setStats({
          shopsCount: allShops.length,
          projectsCount: allProjects.length,
          lockedCapital: 'K235,000,000',
        });
      } catch (e) {
        console.error('Failed to load dashboard stats:', e);
      }
    };
    fetchStats();
  }, [shops]);

  useEffect(() => {
    const checkDraftCart = async () => {
      try {
        const drafts = await database.select().from(sqliteSchema.draft_carts);
        if (drafts.length > 0) {
          const draft = drafts[0];
          Alert.alert(t('restoreSessionTitle'), t('restoreSessionMsg'), [
            {
              text: t('discard'),
              style: 'destructive',
              onPress: async () => {
                await database
                  .delete(sqliteSchema.draft_carts)
                  .where(eq(sqliteSchema.draft_carts.id, draft.id));
              },
            },
            {
              text: t('restore'),
              onPress: async () => {
                const shopDetails = await database
                  .select()
                  .from(sqliteSchema.shops)
                  .where(eq(sqliteSchema.shops.id, draft.shop_id));
                if (shopDetails.length > 0) {
                  const mappedShop = mapShop(shopDetails[0]);
                  selectShop(mappedShop);
                  handleLogInteraction(mappedShop);
                }
              },
            },
          ]);
        }
      } catch (e) {
        console.error('[Recovery Hook] Failed to check for draft carts:', e);
      }
    };
    checkDraftCart();
  }, []);

  const handleLogInteraction = (shop: Shop) => {
    setLoggingShop(shop);
    setLoggingModalVisible(true);
  };

  if (loading && shops.length === 0) {
    return (
      <Box flex={1} p="m" bg="mainBackground">
        <SkeletonCard />
        <Box height={16} />
        <SkeletonCard />
        <Box height={16} />
        <SkeletonCard />
      </Box>
    );
  }

  // Split view layout for Desktop viewport
  if (isDesktop) {
    return (
      <Box flex={1} flexDirection="row" bg="mainBackground">
        {/* Left Sidebar Shop List */}
        <Box
          width={360}
          borderRightWidth={1}
          borderColor="borderColor"
          bg="cardBackground"
        >
          <ShopSidebarList
            shops={shops}
            selectedShop={selectedShop}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectShop={selectShop}
            handleSeedData={handleSeedData}
            isDesktop={isDesktop}
            onLogInteraction={handleLogInteraction}
            onRegisterPress={() => setRegisterModalVisible(true)}
          />
        </Box>

        {/* Right Detail Pane */}
        <Box flex={1} bg="mainBackground">
          {selectedShop ? (
            <ShopDetailPane
              shop={selectedShop}
              shopContacts={shopContacts}
              shopLogsWithItems={shopLogsWithItems}
              isDesktop={isDesktop}
              setSelectedShop={setSelectedShop}
              selectShop={selectShop}
              onLogInteraction={handleLogInteraction}
            />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {/* Welcome Header Banner */}
              <Box
                p="l"
                mb="m"
                borderRadius="l"
                style={{
                  backgroundColor: theme.colors.brand,
                  // @ts-expect-error: linear-gradient is web-only
                  backgroundImage: `linear-gradient(135deg, ${theme.colors.brand}, #7C3AED)`,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.pureWhite,
                    fontSize: 24,
                    fontWeight: 'bold',
                    marginBottom: 4,
                  }}
                >
                  {t('ledgerControlTitle')}
                </Text>
                <Text
                  style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}
                >
                  {t('ledgerControlDesc')}
                </Text>
              </Box>

              {/* KPI Stats Row */}
              <Box flexDirection="row" justifyContent="space-between" mb="l">
                <Pressable
                  style={({ pressed, hovered }: $Any) => ({
                    flex: 1,
                    marginRight: theme.spacing.m,
                    transform: [{ scale: hovered ? 1.01 : pressed ? 0.99 : 1 }],
                    ...(Platform.OS === 'web'
                      ? ({
                          transitionProperty: 'transform',
                          transitionDuration: '200ms',
                          transitionTimingFunction: 'ease-in-out',
                        } as $Any)
                      : {}),
                  })}
                >
                  <Card
                    flex={1}
                    p="m"
                    borderColor="borderColor"
                    borderWidth={1}
                  >
                    <Text
                      variant="caption"
                      fontWeight="bold"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: theme.colors.secondaryText,
                      }}
                    >
                      {t('registeredRetailers')}
                    </Text>
                    <Text
                      variant="kpi"
                      mt="xs"
                      style={{ color: theme.colors.brand }}
                    >
                      {stats.shopsCount}
                    </Text>
                    <Text variant="caption" mt="xs">
                      {t('shopsAcrossRegions')}
                    </Text>
                  </Card>
                </Pressable>

                <Pressable
                  style={({ pressed, hovered }: $Any) => ({
                    flex: 1,
                    marginRight: theme.spacing.m,
                    transform: [{ scale: hovered ? 1.01 : pressed ? 0.99 : 1 }],
                    ...(Platform.OS === 'web'
                      ? ({
                          transitionProperty: 'transform',
                          transitionDuration: '200ms',
                          transitionTimingFunction: 'ease-in-out',
                        } as $Any)
                      : {}),
                  })}
                >
                  <Card
                    flex={1}
                    p="m"
                    borderColor="borderColor"
                    borderWidth={1}
                  >
                    <Text
                      variant="caption"
                      fontWeight="bold"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: theme.colors.secondaryText,
                      }}
                    >
                      {t('activeProjects')}
                    </Text>
                    <Text
                      variant="kpi"
                      mt="xs"
                      style={{ color: theme.colors.danger }}
                    >
                      {stats.projectsCount}
                    </Text>
                    <Text variant="caption" mt="xs">
                      {t('pendingProjectFulfillment')}
                    </Text>
                  </Card>
                </Pressable>

                <Pressable
                  style={({ pressed, hovered }: $Any) => ({
                    flex: 1,
                    transform: [{ scale: hovered ? 1.01 : pressed ? 0.99 : 1 }],
                    ...(Platform.OS === 'web'
                      ? ({
                          transitionProperty: 'transform',
                          transitionDuration: '200ms',
                          transitionTimingFunction: 'ease-in-out',
                        } as $Any)
                      : {}),
                  })}
                >
                  <Card
                    flex={1}
                    p="m"
                    borderColor="borderColor"
                    borderWidth={1}
                  >
                    <Text
                      variant="caption"
                      fontWeight="bold"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: theme.colors.secondaryText,
                      }}
                    >
                      💰 {t('pipelineCapitalLockup')}
                    </Text>
                    <Text
                      variant="kpi"
                      mt="xs"
                      style={{ color: theme.colors.warning }}
                    >
                      {stats.lockedCapital}
                    </Text>
                    <Text variant="caption" mt="xs">
                      {t('lockedPipelineCapital')}
                    </Text>
                  </Card>
                </Pressable>
              </Box>

              {/* Design Gallery Section */}
              <Box mb="l">
                <DesignPatternGallery />
              </Box>

              {/* Action Hint Card */}
              <Box
                p="m"
                bg="secondaryBackground"
                borderColor="borderColor"
                borderWidth={1}
                borderRadius="m"
                style={{ borderStyle: 'dashed' }}
              >
                <Text
                  variant="bodySecondary"
                  fontSize={13}
                  style={{ textAlign: 'center' }}
                >
                  {t('selectShopSidebarPrompt')}
                </Text>
              </Box>
            </ScrollView>
          )}
        </Box>

        <InteractionLoggingScreen
          visible={loggingModalVisible}
          onClose={async () => {
            setLoggingModalVisible(false);
            if (loggingShop) {
              await selectShop(loggingShop);
            }
          }}
          shop={loggingShop}
        />
        <RegisterShopModal
          visible={registerModalVisible}
          onClose={() => setRegisterModalVisible(false)}
          onRegister={handleRegisterSuccess}
        />
      </Box>
    );
  }

  // Single page stack navigation view for mobile viewports
  return (
    <Box flex={1} bg="mainBackground">
      {selectedShop ? (
        <ShopDetailPane
          shop={selectedShop}
          shopContacts={shopContacts}
          shopLogsWithItems={shopLogsWithItems}
          isDesktop={isDesktop}
          setSelectedShop={setSelectedShop}
          selectShop={selectShop}
          onLogInteraction={handleLogInteraction}
        />
      ) : (
        <ShopSidebarList
          shops={shops}
          selectedShop={selectedShop}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectShop={selectShop}
          handleSeedData={handleSeedData}
          isDesktop={isDesktop}
          onLogInteraction={handleLogInteraction}
          onRegisterPress={() => setRegisterModalVisible(true)}
        />
      )}

      <InteractionLoggingScreen
        visible={loggingModalVisible}
        onClose={async () => {
          setLoggingModalVisible(false);
          if (loggingShop) {
            await selectShop(loggingShop);
          }
        }}
        shop={loggingShop}
      />

      <RegisterShopModal
        visible={registerModalVisible}
        onClose={() => setRegisterModalVisible(false)}
        onRegister={handleRegisterSuccess}
      />
    </Box>
  );
}
