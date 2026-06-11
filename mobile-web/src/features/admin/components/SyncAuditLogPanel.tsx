import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';
import { SyncLogsTable } from './SyncLogsTable';
import { SyncAuditLog } from '../types';

interface SyncAuditLogPanelProps {
  isDesktop: boolean;
  syncLogs: SyncAuditLog[];
  syncLogsLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
}

export const SyncAuditLogPanel: React.FC<SyncAuditLogPanelProps> = ({
  isDesktop,
  syncLogs,
  syncLogsLoading,
  loadingMore,
  hasMore,
  onRefresh,
  onLoadMore,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <Card p="m" mb="m" bg="cardBackground">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Box flex={1} mr="s">
          <Text variant="title">{t('syncAuditLogs')}</Text>
          <Text variant="bodySecondary">{t('syncAuditLogsDesc')}</Text>
        </Box>
        <Button
          title={syncLogsLoading ? t('refreshing') : t('refresh')}
          onPress={onRefresh}
          variant="outline"
          size="small"
          disabled={syncLogsLoading}
        />
      </Box>

      {syncLogsLoading && syncLogs.length === 0 ? (
        <Box py="l" justifyContent="center" alignItems="center">
          <ActivityIndicator size="small" color={theme.colors.primaryButton} />
        </Box>
      ) : syncLogs.length === 0 ? (
        <Box
          p="m"
          borderStyle="dashed"
          borderWidth={1.5}
          borderColor="borderColor"
          borderRadius="m"
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="bodySecondary">{t('noSyncLogsRecorded')}</Text>
        </Box>
      ) : (
        <SyncLogsTable
          syncLogs={syncLogs}
          isDesktop={isDesktop}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />
      )}
    </Card>
  );
};
