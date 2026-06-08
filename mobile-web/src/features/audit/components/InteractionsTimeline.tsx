import React from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { LogWithItems } from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  Clock,
  Phone,
  MessageSquare,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';

interface InteractionsTimelineProps {
  shopLogsWithItems: LogWithItems[];
}

export const InteractionsTimeline: React.FC<InteractionsTimelineProps> = ({
  shopLogsWithItems,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const [queueTasks, setQueueTasks] = React.useState<
    Record<string, { id: string; status: string }>
  >({});

  const fetchQueue = React.useCallback(async () => {
    try {
      const tasks = await database
        .select()
        .from(sqliteSchema.image_upload_queue);
      const mapping: Record<string, { id: string; status: string }> = {};
      for (const t of tasks) {
        if (t.interaction_log_id) {
          mapping[t.interaction_log_id] = { id: t.id, status: t.status };
        }
      }
      setQueueTasks(mapping);
    } catch (err) {
      console.error(
        '[InteractionsTimeline] Failed to query image upload queue:',
        err,
      );
    }
  }, []);

  React.useEffect(() => {
    fetchQueue();
    const unsubscribe = ImageUploadQueue.subscribe(fetchQueue);
    return () => {
      unsubscribe();
    };
  }, [fetchQueue]);

  const getLogTypeLabel = (type: string) => {
    if (type === 'SHOP_VISIT') return t('typeVisit');
    if (type === 'STOCK_DELIVERY' || type === 'ORDER_PLACED')
      return t('typeOrder');
    if (type === 'COLLECTION') return t('typeCollection');
    if (type === 'PHONE_CALL') return t('phone');
    return type.replaceAll('_', ' ');
  };

  const getCommercialStatusLabel = (status: string) => {
    if (status === 'FOLLOWED_UP') return t('statusFollowedUp');
    if (status === 'ORDER_PLACED' || status === 'CLOSED')
      return t('statusClosed');
    if (status === 'NOT_INTERESTED' || status === 'NO_DEAL')
      return t('statusNoDeal');
    return status.replaceAll('_', ' ');
  };

  return (
    <Box>
      <Text variant="title" mb="s">
        {t('recentInteractions')}
      </Text>
      {shopLogsWithItems.map(({ log, items }) => {
        let statusColor: keyof Theme['colors'] = 'secondaryText';
        let statusBg: keyof Theme['colors'] = 'secondaryButton';
        if (log.commercialStatus === 'ORDER_PLACED') {
          statusColor = 'successText';
          statusBg = 'successBg';
        } else if (log.commercialStatus === 'INTERESTED') {
          statusColor = 'infoText';
          statusBg = 'infoBg';
        } else if (log.commercialStatus === 'NOT_INTERESTED') {
          statusColor = 'dangerText';
          statusBg = 'dangerBg';
        }

        const isViber = log.type === 'VIBER';
        const LogIcon = isViber
          ? MessageSquare
          : log.type === 'PHONE_CALL'
            ? Phone
            : MapPin;

        return (
          <Card key={log.id} mb="m" p="m">
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="s"
            >
              <Box flexDirection="row" alignItems="center">
                <Box bg="secondaryBackground" p="s" borderRadius="s" mr="s">
                  <LogIcon size={16} stroke={theme.colors.primaryText} />
                </Box>
                <Text variant="body" fontWeight="bold">
                  {getLogTypeLabel(log.type)}
                </Text>
              </Box>
              <Box flexDirection="row" alignItems="center">
                <Clock
                  size={12}
                  stroke={theme.colors.secondaryText}
                  style={{ marginRight: 4 }}
                />
                <Text variant="bodySecondary">
                  {new Date(log.createdAtLocal).toLocaleDateString()}
                </Text>
              </Box>
            </Box>

            <Box mb="s" flexDirection="row" flexWrap="wrap" alignItems="center">
              <Box bg={statusBg} px="s" py="xs" borderRadius="s" mr="s">
                <Text variant="badge" color={statusColor} fontSize={11}>
                  {getCommercialStatusLabel(log.commercialStatus)}
                </Text>
              </Box>

              {queueTasks[log.id] &&
                (() => {
                  const task = queueTasks[log.id];
                  const isPending = task.status === 'pending';
                  const isProcessing = task.status === 'processing';
                  const isFailed = task.status === 'failed';
                  return (
                    <Box flexDirection="row" alignItems="center">
                      {isPending && (
                        <Box
                          bg="secondaryButton"
                          px="s"
                          py="xs"
                          borderRadius="s"
                          flexDirection="row"
                          alignItems="center"
                        >
                          <Clock
                            size={10}
                            stroke={theme.colors.secondaryText}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            variant="badge"
                            color="secondaryText"
                            fontSize={11}
                          >
                            {t('pendingUpload')}
                          </Text>
                        </Box>
                      )}
                      {isProcessing && (
                        <Box
                          bg="infoBg"
                          px="s"
                          py="xs"
                          borderRadius="s"
                          flexDirection="row"
                          alignItems="center"
                        >
                          <RefreshCw
                            size={10}
                            stroke={theme.colors.infoText}
                            style={{ marginRight: 4 }}
                          />
                          <Text variant="badge" color="infoText" fontSize={11}>
                            {t('uploading')}
                          </Text>
                        </Box>
                      )}
                      {isFailed && (
                        <TouchableOpacity
                          onPress={() => {
                            ImageUploadQueue.retryTask(task.id).catch((err) => {
                              console.error(
                                '[InteractionsTimeline] Failed to retry task:',
                                err,
                              );
                            });
                          }}
                        >
                          <Box
                            bg="dangerBg"
                            px="s"
                            py="xs"
                            borderRadius="s"
                            flexDirection="row"
                            alignItems="center"
                          >
                            <AlertTriangle
                              size={10}
                              stroke={theme.colors.dangerText}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              variant="badge"
                              color="dangerText"
                              fontSize={11}
                            >
                              {t('failedTapRetry')}
                            </Text>
                          </Box>
                        </TouchableOpacity>
                      )}
                    </Box>
                  );
                })()}
            </Box>

            <Text variant="body" style={{ lineHeight: 20 }}>
              {log.notes}
            </Text>

            {log.viberMessageText && (
              <Box
                mt="s"
                p="s"
                borderRadius="s"
                borderWidth={1}
                borderColor="borderColor"
                bg="secondaryBackground"
              >
                <Text
                  variant="caption"
                  color="secondaryText"
                  fontWeight="bold"
                  mb="xs"
                >
                  💬 {t('viberMessageSource')}
                </Text>
                <Text
                  variant="bodySecondary"
                  color="primaryText"
                  style={{ fontStyle: 'italic' }}
                >
                  {log.viberMessageText}
                </Text>
              </Box>
            )}

            {items.length > 0 && (
              <Box
                mt="m"
                pt="m"
                borderTopWidth={1}
                borderTopColor="borderColor"
              >
                <Text variant="bodySecondary" fontWeight="bold" mb="s">
                  {t('skusTagged')}
                </Text>
                <Box flexDirection="row" flexWrap="wrap">
                  {items.map((item) => (
                    <Box
                      key={item.id}
                      bg="secondaryBackground"
                      px="s"
                      py="xs"
                      borderRadius="s"
                      mr="s"
                      mb="s"
                      flexDirection="row"
                      alignItems="center"
                    >
                      <Text variant="bodySecondary" fontWeight="bold">
                        {t('qtyTimes').replace(
                          '{qty}',
                          item.quantity.toString(),
                        )}
                      </Text>
                      <Text variant="bodySecondary" style={{ marginLeft: 4 }}>
                        {item.name} ({item.sku})
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Card>
        );
      })}
      {shopLogsWithItems.length === 0 && (
        <Card p="m" alignItems="center">
          <Text variant="bodySecondary">{t('noRecentInteractions')}</Text>
        </Card>
      )}
    </Box>
  );
};
