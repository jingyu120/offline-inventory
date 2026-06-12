import React from 'react';
import { Pressable } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

interface SyncStatusBarProps {
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;
  lastSync: Date | null;
  onManualSync?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isSyncing,
  syncError,
  pendingChanges,
  lastSync,
  onManualSync,
}) => {
  const { t } = useTranslation();
  const quality = useNetworkQuality();

  let bgKey: 'successLight' | 'warningLight' | 'dangerLight' = 'successLight';
  let textColorKey: 'successText' | 'warningText' | 'dangerText' =
    'successText';
  let statusText = '';

  if (syncError) {
    bgKey = 'dangerLight';
    textColorKey = 'dangerText';
    statusText = `${t('syncError') || 'Sync Error'}: ${syncError}`;
  } else if (quality.isDegraded) {
    bgKey = 'warningLight';
    textColorKey = 'warningText';
    statusText = `⚠️ Connection degraded (2G/EDGE) - Image sync paused.`;
  } else if (isSyncing) {
    bgKey = 'warningLight';
    textColorKey = 'warningText';
    statusText = t('syncing') || 'Syncing changes...';
  } else if (pendingChanges > 0) {
    bgKey = 'warningLight';
    textColorKey = 'warningText';
    statusText = `${t('offlinePending') || 'Offline - Pending changes'}: ${pendingChanges}`;
  } else {
    bgKey = 'successLight';
    textColorKey = 'successText';
    statusText = lastSync
      ? `${t('synced') || 'Synced'} - Last sync: ${lastSync.toLocaleTimeString()}`
      : t('synced') || 'Synced';
  }

  return (
    <Box
      bg={bgKey}
      py="xs"
      px="m"
      flexDirection="row"
      justifyContent="center"
      alignItems="center"
      borderBottomWidth={1}
      borderColor="borderColor"
      style={{ gap: 12 }}
    >
      <Text
        variant="bodySecondary"
        fontWeight="bold"
        color={textColorKey}
        style={{ fontSize: 12, textAlign: 'center' }}
      >
        {statusText}
      </Text>
      {onManualSync ? (
        <Pressable
          onPress={onManualSync}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel={t('syncNow') || 'Sync now'}
          accessibilityState={{ disabled: isSyncing, busy: isSyncing }}
          style={{ opacity: isSyncing ? 0.4 : 1 }}
        >
          <Box
            bg="cardBackground"
            borderRadius="s"
            borderWidth={1}
            borderColor="borderColor"
            px="s"
            py="xs"
          >
            <Text
              variant="bodySecondary"
              fontWeight="bold"
              color={textColorKey}
              style={{ fontSize: 12 }}
            >
              {isSyncing ? `⏳ ${t('syncing')}` : `🔄 ${t('syncNow')}`}
            </Text>
          </Box>
        </Pressable>
      ) : null}
    </Box>
  );
};
