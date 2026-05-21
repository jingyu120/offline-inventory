import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../utils/i18n';

interface SyncStatusBarProps {
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  pendingChanges: number;
  handleSync: () => Promise<void>;
  isDesktop: boolean;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isSyncing,
  lastSync,
  syncError,
  pendingChanges,
  handleSync,
  isDesktop,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      px="m"
      py="xs"
      bg="secondaryBackground"
      borderBottomWidth={1}
      borderColor="borderColor"
    >
      <Box flexDirection="row" alignItems="center">
        <Box
          width={8}
          height={8}
          borderRadius="s"
          backgroundColor={
            syncError ? 'danger' : isSyncing ? 'warning' : 'success'
          }
          marginRight="s"
        />
        <Text variant="bodySecondary" fontSize={isDesktop ? 13 : 11}>
          {syncError
            ? `${t('syncError')}: ${syncError}`
            : isSyncing
              ? t('syncing')
              : lastSync
                ? `${t('syncedAt')} ${lastSync.toLocaleTimeString()}`
                : t('syncPending')}
        </Text>
        {pendingChanges > 0 && (
          <Text
            variant="badge"
            style={{
              backgroundColor: '#EF4444',
              color: '#fff',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 10,
              marginLeft: 8,
              fontSize: 10,
            }}
          >
            {pendingChanges} {t('localChanges')}
          </Text>
        )}
      </Box>

      <TouchableOpacity
        onPress={handleSync}
        disabled={isSyncing}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isSyncing ? '#94A3B8' : '#5A31F4',
          paddingVertical: 4,
          paddingHorizontal: 12,
          borderRadius: 12,
        }}
      >
        <Text
          variant="bodySecondary"
          style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}
        >
          {isSyncing ? `🔄` : `⚡ ${t('syncNow')}`}
        </Text>
      </TouchableOpacity>
    </Box>
  );
};
