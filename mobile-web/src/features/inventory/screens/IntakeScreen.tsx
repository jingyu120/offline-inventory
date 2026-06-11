import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import { InboundForecastList } from '../components/InboundForecastList';
import { CompetitorInsightForm } from '../components/CompetitorInsightForm';
import { MasterCatalogItem } from '../components/MasterCatalogItem';
import { WarehouseSelectorCard } from '../components/WarehouseSelectorCard';
import { PendingApprovalsQueue } from '../components/PendingApprovalsQueue';
import { RegisterSkuForm } from '../components/RegisterSkuForm';
import { useIntakeInventory } from '../hooks/useIntakeInventory';
import { useWarehouseGeofence } from '../hooks/useWarehouseGeofence';

const DESKTOP_BREAKPOINT = 768;
const LOADING_SPINNER_COLOR = '#5A31F4';

export function IntakeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const {
    selectedWarehouseId,
    isNearWarehouse,
    geoLockingDisabled,
    setGeoLockingDisabled,
    setIsNearWarehouse,
    selectWarehouse,
  } = useWarehouseGeofence();

  const {
    items,
    warehouses,
    pendingUpdates,
    loading,
    isManager,
    loadInventory,
    newSkuForm,
    pendingEdit,
    handleUpdateStock,
    handleAddItem,
    handleApproveUpdate,
    handleRejectUpdate,
    handleSaveEdit,
  } = useIntakeInventory();

  const controlsActive = geoLockingDisabled || isNearWarehouse;

  // Fetching state
  if (loading && items.length === 0) {
    return (
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        bg="mainBackground"
      >
        <ActivityIndicator size="large" color={LOADING_SPINNER_COLOR} />
        <Text variant="body" mt="s">
          {t('loading')}
        </Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Box>
          <Text variant="header" fontSize={24}>
            📦 {t('warehouseSkuIntake')}
          </Text>
          <Text variant="bodySecondary">{t('katanaSub')}</Text>
        </Box>
        <TouchableOpacity onPress={loadInventory} style={{ padding: 8 }}>
          <RefreshCw size={18} stroke="#5A31F4" />
        </TouchableOpacity>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <WarehouseSelectorCard
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={selectWarehouse}
          geoLockingDisabled={geoLockingDisabled}
          onToggleGeoLocking={setGeoLockingDisabled}
          isNearWarehouse={isNearWarehouse}
          onSimulateNearby={() => setIsNearWarehouse(true)}
          isDesktop={isDesktop}
        />

        <InboundForecastList />

        <PendingApprovalsQueue
          pendingUpdates={pendingUpdates}
          warehouses={warehouses}
          items={items}
          isManager={isManager}
          selectedWarehouseId={selectedWarehouseId}
          isNearWarehouse={isNearWarehouse}
          pendingEdit={pendingEdit}
          onApprove={(update) =>
            handleApproveUpdate(update, selectedWarehouseId, isNearWarehouse)
          }
          onReject={handleRejectUpdate}
          onSaveEdit={handleSaveEdit}
        />

        <RegisterSkuForm
          form={newSkuForm}
          controlsActive={controlsActive}
          geoLockingDisabled={geoLockingDisabled}
          onSubmit={() =>
            handleAddItem(
              selectedWarehouseId,
              geoLockingDisabled,
              isNearWarehouse,
            )
          }
          isDesktop={isDesktop}
        />

        <CompetitorInsightForm isDesktop={isDesktop} />

        <Text variant="title" mb="s">
          📦 {t('masterStockLevels')}
        </Text>
        {items.map((item) => (
          <MasterCatalogItem
            key={item.id}
            item={item}
            controlsActive={controlsActive}
            onUpdateStock={(stockItem, delta) =>
              handleUpdateStock(
                stockItem,
                delta,
                selectedWarehouseId,
                geoLockingDisabled,
                isNearWarehouse,
              )
            }
          />
        ))}

        {items.length === 0 && (
          <Box p="xl" alignItems="center">
            <Text variant="bodySecondary">{t('noProductsInCatalog')}</Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}

export default IntakeScreen;
