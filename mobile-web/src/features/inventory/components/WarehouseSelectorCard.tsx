import { Switch } from 'react-native';
import {
  Box,
  Text,
  Card,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { StockLocationRow } from '../types';
import { GeofenceStatusBanner } from './GeofenceStatusBanner';

const GEO_TRACK_COLOR = { false: '#767577', true: '#5A31F4' };
const GEO_THUMB_ON = '#fff';
const GEO_THUMB_OFF = '#f4f3f4';

interface WarehouseSelectorCardProps {
  warehouses: StockLocationRow[];
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  geoLockingDisabled: boolean;
  onToggleGeoLocking: (value: boolean) => void;
  isNearWarehouse: boolean;
  onSimulateNearby: () => void;
  isDesktop: boolean;
}

/** Warehouse picker, geo-locking toggle, and the geofence status banner. */
export function WarehouseSelectorCard({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  geoLockingDisabled,
  onToggleGeoLocking,
  isNearWarehouse,
  onSimulateNearby,
  isDesktop,
}: WarehouseSelectorCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Box
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box width={isDesktop ? '60%' : '100%'} mb="s">
          <DropdownSelector
            label={t('selectWarehouseIntake')}
            selectedValue={selectedWarehouseId}
            onValueChange={onSelectWarehouse}
            options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
            placeholder={t('chooseWarehousePlaceholder')}
          />
        </Box>

        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          mt={isDesktop ? 'm' : 's'}
          bg="secondaryBackground"
          p="s"
          borderRadius="s"
          borderWidth={1}
          borderColor="borderColor"
        >
          <Box mr="m">
            <Text variant="body" fontWeight="bold">
              {t('disableGeoLocking')}
            </Text>
            <Text variant="bodySecondary">{t('requiresApproval')}</Text>
          </Box>
          <Switch
            value={geoLockingDisabled}
            onValueChange={onToggleGeoLocking}
            trackColor={GEO_TRACK_COLOR}
            thumbColor={geoLockingDisabled ? GEO_THUMB_ON : GEO_THUMB_OFF}
          />
        </Box>
      </Box>

      <GeofenceStatusBanner
        selectedWarehouseId={selectedWarehouseId}
        geoLockingDisabled={geoLockingDisabled}
        isNearWarehouse={isNearWarehouse}
        onSimulateNearby={onSimulateNearby}
      />
    </Card>
  );
}
