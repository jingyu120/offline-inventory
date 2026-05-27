import React from 'react';
import { Box, Text, Table, ColumnDef } from '@burma-inventory/ui-components';

interface SyncLogsTableProps {
  syncLogs: any[];
  isDesktop: boolean;
}

export const SyncLogsTable: React.FC<SyncLogsTableProps> = ({
  syncLogs,
  isDesktop,
}) => {
  const columns: ColumnDef<any>[] = isDesktop
    ? [
        {
          key: 'createdAt',
          header: 'Time',
          flex: 2,
          render: (item) => (
            <Text variant="bodySecondary">
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'rep',
          header: 'Rep',
          flex: 1.5,
          render: (item) => (
            <Text variant="body" fontWeight="bold">
              {item.user?.username || item.userId || 'System/Odoo'}
            </Text>
          ),
        },
        {
          key: 'action',
          header: 'Action',
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
          header: 'Changes',
          flex: 1,
          render: (item) => (
            <Text variant="body" style={{ textAlign: 'center' }}>
              {item.changesCount}
            </Text>
          ),
        },
        {
          key: 'status',
          header: 'Status',
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
          header: 'Details',
          flex: 3,
          render: (item) => (
            <Text variant="bodySecondary" numberOfLines={2}>
              {item.errorReason ||
                (item.status === 'SUCCESS'
                  ? 'Sync completed successfully'
                  : '')}
            </Text>
          ),
        },
      ]
    : [
        {
          key: 'createdAt',
          header: 'Time',
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
          header: 'Activity',
          flex: 1.8,
          render: (item) => (
            <Box>
              <Text variant="body" fontWeight="bold">
                {item.user?.username || item.userId || 'System'}
              </Text>
              <Text variant="caption" color="secondaryText">
                {item.changesCount > 0
                  ? `${item.changesCount} updates`
                  : 'no updates'}
              </Text>
            </Box>
          ),
        },
        {
          key: 'status',
          header: 'Sync Status',
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
                bg={badgeBg as any}
                alignSelf="flex-start"
              >
                <Text
                  variant="badge"
                  color={badgeColor as any}
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
    <Table
      data={syncLogs}
      columns={columns}
      keyExtractor={(item) => item.id}
      minWidth={isDesktop ? 600 : '100%'}
    />
  );
};
