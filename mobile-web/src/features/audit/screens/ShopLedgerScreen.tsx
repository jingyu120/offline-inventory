import { useWindowDimensions } from 'react-native';
import { Box, SkeletonCard } from '@burma-inventory/ui-components';
import { ShopSidebarList } from '../components/ShopSidebarList';
import { ShopDetailPane } from '../components/ShopDetailPane';
import { RegisterShopModal } from '../components/RegisterShopModal';
import { LedgerWelcomePane } from '../components/LedgerWelcomePane';
import { InteractionLoggingScreen } from './InteractionLoggingScreen';
import { useShopLedger } from '../hooks/useShopLedger';

const DESKTOP_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 360;

export function ShopLedgerScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const {
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
  } = useShopLedger();

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
  } = shopsData;

  const sidebar = (
    <ShopSidebarList
      shops={shops}
      selectedShop={selectedShop}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectShop={selectShop}
      handleSeedData={handleSeedData}
      isDesktop={isDesktop}
      onLogInteraction={handleLogInteraction}
      onRegisterPress={openRegisterModal}
    />
  );

  const detailPane = selectedShop ? (
    <ShopDetailPane
      shop={selectedShop}
      shopContacts={shopContacts}
      shopLogsWithItems={shopLogsWithItems}
      isDesktop={isDesktop}
      setSelectedShop={setSelectedShop}
      selectShop={selectShop}
      onLogInteraction={handleLogInteraction}
    />
  ) : null;

  const modals = (
    <>
      <InteractionLoggingScreen
        visible={loggingModalVisible}
        onClose={handleCloseLoggingModal}
        shop={loggingShop}
      />
      <RegisterShopModal
        visible={registerModalVisible}
        onClose={closeRegisterModal}
        onRegister={handleRegisterSuccess}
      />
    </>
  );

  // Fetching state
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
        <Box
          width={SIDEBAR_WIDTH}
          borderRightWidth={1}
          borderColor="borderColor"
          bg="cardBackground"
        >
          {sidebar}
        </Box>
        <Box flex={1} bg="mainBackground">
          {detailPane ?? <LedgerWelcomePane stats={stats} />}
        </Box>
        {modals}
      </Box>
    );
  }

  // Single page stack navigation view for mobile viewports
  return (
    <Box flex={1} bg="mainBackground">
      {detailPane ?? sidebar}
      {modals}
    </Box>
  );
}
