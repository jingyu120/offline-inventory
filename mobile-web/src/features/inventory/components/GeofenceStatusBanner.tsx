import { Box, Text, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Check, Lock, Unlock } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';

interface GeofenceStatusBannerProps {
  selectedWarehouseId: string;
  geoLockingDisabled: boolean;
  isNearWarehouse: boolean;
  onSimulateNearby: () => void;
}

/**
 * Renders the contextual geofence status banner under the warehouse picker:
 * "select a warehouse", geo-locking disabled, locked (with simulate button),
 * or verified.
 */
export function GeofenceStatusBanner({
  selectedWarehouseId,
  geoLockingDisabled,
  isNearWarehouse,
  onSimulateNearby,
}: GeofenceStatusBannerProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  if (!selectedWarehouseId) {
    return (
      <Box
        mt="s"
        p="s"
        bg="warningBg"
        borderRadius="s"
        borderColor="warning"
        borderWidth={1}
      >
        <Text variant="bodySecondary" color="warningText" fontWeight="bold">
          {t('pleaseSelectWarehouseIntake')}
        </Text>
      </Box>
    );
  }

  if (geoLockingDisabled) {
    return (
      <Box
        mt="s"
        p="s"
        bg="warningBg"
        borderRadius="s"
        borderColor="warning"
        borderWidth={1}
        flexDirection="row"
        alignItems="center"
      >
        <Unlock
          size={18}
          color={theme.colors.warningText}
          style={{ marginRight: 8 }}
        />
        <Text variant="bodySecondary" color="warningText" fontWeight="bold">
          {t('geoLockingDisabledWarning')}
        </Text>
      </Box>
    );
  }

  if (!isNearWarehouse) {
    return (
      <Box
        mt="s"
        p="s"
        bg="dangerBg"
        borderRadius="s"
        borderColor="danger"
        borderWidth={1}
      >
        <Box flexDirection="row" alignItems="center" mb="s">
          <Lock
            size={18}
            color={theme.colors.dangerText}
            style={{ marginRight: 8 }}
          />
          <Text variant="bodySecondary" color="dangerText" fontWeight="bold">
            {t('geofencedLockWarning')}
          </Text>
        </Box>
        <Box alignItems="flex-start">
          <Button
            title={t('simulateNearbyLocation')}
            onPress={onSimulateNearby}
            variant="secondary"
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      mt="s"
      p="s"
      bg="successBg"
      borderRadius="s"
      borderColor="success"
      borderWidth={1}
      flexDirection="row"
      alignItems="center"
    >
      <Check
        size={18}
        color={theme.colors.successText}
        style={{ marginRight: 8 }}
      />
      <Text variant="bodySecondary" color="successText" fontWeight="bold">
        {t('locationVerifiedSuccess')}
      </Text>
    </Box>
  );
}
