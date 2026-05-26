import React from 'react';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../utils/i18n';

interface SyncStatusBarProps {
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;
  lastSync: Date | null;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isSyncing,
  syncError,
  pendingChanges,
  lastSync,
}) => {
  const { t } = useTranslation();

  let bgKey: 'successLight' | 'warningLight' | 'dangerLight' = 'successLight';
  let textColorKey: 'successText' | 'warningText' | 'dangerText' =
    'successText';
  let statusText = '';

  if (syncError) {
    bgKey = 'dangerLight';
    textColorKey = 'dangerText';
    statusText = `${t('syncError') || 'Sync Error'}: ${syncError}`;
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
    >
      <Text
        variant="bodySecondary"
        fontWeight="bold"
        color={textColorKey}
        style={{ fontSize: 12, textAlign: 'center' }}
      >
        {statusText}
      </Text>
    </Box>
  );
};
