import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Table, ColumnDef } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';

interface SyncLogsTableProps {
  syncLogs: $Any[];
  isDesktop: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export const SyncLogsTable: React.FC<SyncLogsTableProps> = ({
  syncLogs,
  isDesktop,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const { t } = useTranslation();

  const columns: ColumnDef<$Any>[] = isDesktop
    ? [
        {
          key: 'createdAt',
          header: t('time'),
          flex: 2,
          render: (item) => (
            <Text variant="bodySecondary">
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'rep',
          header: t('rep'),
          flex: 1.5,
          render: (item) => (
            <Text variant="body" fontWeight="bold">
              {item.user?.username || item.userId || t('systemOdoo')}
            </Text>
          ),
        },
        {
          key: 'action',
          header: t('action'),
          flex: 1,
          render: (item) => (
            <Box
              px="s"
              py="xs"
              borderRadius="s"
              bg={item.action === 'PUSH' ? 'infoBg' : 'secondaryBackground'}
              alignSelf="flex-start"
            >
              <Text
                variant="badge"
                color={item.action === 'PUSH' ? 'info' : 'secondaryText'}
              >
                {item.action}
              </Text>
            </Box>
          ),
        },
        {
          key: 'changesCount',
          header: t('changes'),
          flex: 1,
          render: (item) => (
            <Text variant="body" style={{ textAlign: 'center' }}>
              {item.changesCount}
            </Text>
          ),
        },
        {
          key: 'status',
          header: t('status'),
          flex: 1.5,
          render: (item) => (
            <Box
              px="s"
              py="xs"
              borderRadius="s"
              bg={item.status === 'SUCCESS' ? 'successBg' : 'dangerBg'}
              alignSelf="flex-start"
            >
              <Text
                variant="badge"
                color={item.status === 'SUCCESS' ? 'success' : 'danger'}
              >
                {item.status}
              </Text>
            </Box>
          ),
        },
        {
          key: 'details',
          header: t('details'),
          flex: 3,
          render: (item) => (
            <Text variant="bodySecondary" numberOfLines={2}>
              {item.errorReason ||
                (item.status === 'SUCCESS'
                  ? t('syncCompletedSuccessfully')
                  : '')}
            </Text>
          ),
        },
      ]
    : [
        {
          key: 'createdAt',
          header: t('time'),
          flex: 1.2,
          render: (item) => {
            const date = new Date(item.createdAt);
            const hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = date
              .getMinutes()
              .toString()
              .padStart(2, '0');
            const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            return (
              <Box>
                <Text variant="caption" color="primaryText" fontWeight="bold">
                  {timeStr}
                </Text>
                <Text variant="caption" color="secondaryText">
                  {dateStr}
                </Text>
              </Box>
            );
          },
        },
        {
          key: 'rep',
          header: t('activity'),
          flex: 1.8,
          render: (item) => (
            <Box>
              <Text variant="body" fontWeight="bold">
                {item.user?.username || item.userId || t('systemLabel')}
              </Text>
              <Text variant="caption" color="secondaryText">
                {item.changesCount > 0
                  ? t('updatesCount', { count: item.changesCount })
                  : t('noUpdates')}
              </Text>
            </Box>
          ),
        },
        {
          key: 'status',
          header: t('syncStatus'),
          flex: 1.5,
          render: (item) => {
            const isSuccess = item.status === 'SUCCESS';
            const isPush = item.action === 'PUSH';
            let badgeBg = 'secondaryBackground';
            let badgeColor = 'secondaryText';
            let label = '';

            if (isSuccess) {
              badgeBg = isPush ? 'successBg' : 'infoBg';
              badgeColor = isPush ? 'successText' : 'infoText';
              label = isPush ? '↑ PUSH OK' : '↓ PULL OK';
            } else {
              badgeBg = 'dangerBg';
              badgeColor = 'dangerText';
              label = isPush ? '⚠ PUSH ERR' : '⚠ PULL ERR';
            }

            return (
              <Box
                px="s"
                py="xs"
                borderRadius="s"
                bg={badgeBg as $Any}
                alignSelf="flex-start"
              >
                <Text
                  variant="badge"
                  color={badgeColor as $Any}
                  fontWeight="bold"
                  fontSize={10}
                >
                  {label}
                </Text>
              </Box>
            );
          },
        },
      ];

  return (
    <Box>
      <Table
        data={syncLogs}
        columns={columns}
        keyExtractor={(item) => item.id}
        minWidth={isDesktop ? 600 : '100%'}
      />
      {hasMore && (
        <Box mt="m" alignItems="center">
          <TouchableOpacity onPress={onLoadMore} disabled={loadingMore}>
            <Box px="m" py="s" bg="primaryButton" borderRadius="s">
              <Text variant="body" color="pureWhite">
                {loadingMore ? t('loadingMore') : t('loadMore')}
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      )}
    </Box>
  );
};
