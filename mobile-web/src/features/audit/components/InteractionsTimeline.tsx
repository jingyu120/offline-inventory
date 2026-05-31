import React from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { LogWithItems } from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import { Clock, Phone, MessageSquare, MapPin } from 'lucide-react-native';

interface InteractionsTimelineProps {
  shopLogsWithItems: LogWithItems[];
}

export const InteractionsTimeline: React.FC<InteractionsTimelineProps> = ({
  shopLogsWithItems,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

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

            <Box mb="s" flexDirection="row">
              <Box bg={statusBg} px="s" py="xs" borderRadius="s">
                <Text variant="badge" color={statusColor} fontSize={11}>
                  {getCommercialStatusLabel(log.commercialStatus)}
                </Text>
              </Box>
            </Box>

            <Text variant="body" style={{ lineHeight: 20 }}>
              {log.notes}
            </Text>

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
