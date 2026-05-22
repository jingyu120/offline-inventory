import React, { useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useShopsData } from '../hooks/useShopsData';
import { ShopSidebarList } from './components/ShopSidebarList';
import { ShopDetailPane } from './components/ShopDetailPane';
import { useTranslation } from '../utils/i18n';
import { InteractionLoggingScreen } from './InteractionLoggingScreen';
import { Shop } from '@burma-inventory/shared-types';
import { DesignPatternGallery } from './components/DesignPatternGallery';

export function ShopLedgerScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { t } = useTranslation();

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
  } = useShopsData();

  const [loggingModalVisible, setLoggingModalVisible] = useState(false);
  const [loggingShop, setLoggingShop] = useState<Shop | null>(null);

  const handleLogInteraction = (shop: Shop) => {
    setLoggingShop(shop);
    setLoggingModalVisible(true);
  };

  if (loading && shops.length === 0) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text variant="body" mt="s">
          {t('syncing')}
        </Text>
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
            <Box flex={1} p="m" justifyContent="space-between">
              <Box flex={1} justifyContent="center" alignItems="center" mb="m">
                <Text variant="bodySecondary" fontSize={16} mb="m">
                  {t('selectShopToAudit')}
                </Text>
              </Box>
              <DesignPatternGallery />
            </Box>
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
    </Box>
  );
}
