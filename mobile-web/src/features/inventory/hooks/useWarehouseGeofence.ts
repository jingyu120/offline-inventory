import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { getCachedLocation } from '../../../core/utils/locationCache';
import {
  calculateDistance,
  GEOFENCE_RADIUS_INTAKE_METERS,
} from '../../../core/utils/geo';
import { WAREHOUSE_COORDS } from '../../../config/appConfig';
import { useTranslation } from '../../../core/i18n/i18n';

const LOCATION_PERMISSION_GRANTED = 'granted';
const DISTANCE_TOKEN = '{distance}';
const METERS_TOKEN = '{meters}';

export interface UseWarehouseGeofenceReturn {
  selectedWarehouseId: string;
  isNearWarehouse: boolean;
  geoLockingDisabled: boolean;
  setGeoLockingDisabled: (value: boolean) => void;
  setIsNearWarehouse: (value: boolean) => void;
  selectWarehouse: (warehouseId: string) => void;
}

/**
 * Owns warehouse selection plus the geofence verification state machine:
 * requesting location permission, computing distance to the warehouse, and
 * deriving whether the rep is close enough to act on inventory.
 */
export const useWarehouseGeofence = (): UseWarehouseGeofenceReturn => {
  const { t } = useTranslation();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isNearWarehouse, setIsNearWarehouse] = useState<boolean>(false);
  const [geoLockingDisabled, setGeoLockingDisabled] = useState<boolean>(false);

  const checkGeofence = useCallback(
    async (warehouseId: string): Promise<void> => {
      if (!warehouseId) {
        setIsNearWarehouse(false);
        return;
      }
      try {
        const coords = WAREHOUSE_COORDS[warehouseId];
        if (!coords) {
          setIsNearWarehouse(false);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== LOCATION_PERMISSION_GRANTED) {
          Alert.alert(t('error'), t('locationPermissionRequired'));
          setIsNearWarehouse(false);
          return;
        }

        const loc = await getCachedLocation({
          accuracy: Location.Accuracy.Balanced,
        });

        const dist = calculateDistance(
          coords.latitude,
          coords.longitude,
          loc.coords.latitude,
          loc.coords.longitude,
        );

        if (dist <= GEOFENCE_RADIUS_INTAKE_METERS) {
          setIsNearWarehouse(true);
        } else {
          setIsNearWarehouse(false);
          Alert.alert(
            t('geofencedLockActive'),
            t('geofenceDistanceMsg')
              .replace(METERS_TOKEN, GEOFENCE_RADIUS_INTAKE_METERS.toString())
              .replace(DISTANCE_TOKEN, Math.round(dist).toString()),
          );
        }
      } catch (err) {
        console.error(err);
        setIsNearWarehouse(false);
        Alert.alert(t('error'), t('failedGetCoordinates'));
      }
    },
    [t],
  );

  const selectWarehouse = useCallback(
    (warehouseId: string): void => {
      setSelectedWarehouseId(warehouseId);
      checkGeofence(warehouseId);
    },
    [checkGeofence],
  );

  return {
    selectedWarehouseId,
    isNearWarehouse,
    geoLockingDisabled,
    setGeoLockingDisabled,
    setIsNearWarehouse,
    selectWarehouse,
  };
};
