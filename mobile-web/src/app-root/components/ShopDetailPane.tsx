import React from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, Contact } from '@burma-inventory/shared-types';
import { LogWithItems } from '../../data/repositories';
import { useTranslation } from '../../utils/i18n';
import {
  Phone,
  MessageSquare,
  MapPin,
  Star,
  User,
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react-native';

interface ShopDetailPaneProps {
  shop: Shop;
  shopContacts: Contact[];
  shopLogsWithItems: LogWithItems[];
  isDesktop: boolean;
  setSelectedShop: (shop: Shop | null) => void;
  selectShop: (shop: Shop) => void;
  onLogInteraction?: (shop: Shop) => void;
}

export const ShopDetailPane: React.FC<ShopDetailPaneProps> = ({
  shop,
  shopContacts,
  shopLogsWithItems,
  isDesktop,
  setSelectedShop,
  onLogInteraction,
}) => {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  const renderTrendBadge = (trend: string) => {
    let bg: keyof Theme['colors'] = 'secondaryButton';
    let textCol: keyof Theme['colors'] = 'secondaryText';
    const label = trend || 'NEUTRAL';
    let Icon = Clock;

    if (
      trend === 'POSITIVE' ||
      trend === 'UPWARD' ||
      trend === 'GROWING' ||
      trend === 'IMPROVING'
    ) {
      bg = 'successBg';
      textCol = 'successText';
      Icon = TrendingUp;
    } else if (
      trend === 'NEGATIVE' ||
      trend === 'DOWNWARD' ||
      trend === 'SHRINKING' ||
      trend === 'DECLINING'
    ) {
      bg = 'dangerBg';
      textCol = 'dangerText';
      Icon = TrendingDown;
    }

    return (
      <Box
        flexDirection="row"
        alignItems="center"
        bg={bg}
        px="s"
        py="xs"
        borderRadius="s"
      >
        <Icon
          size={14}
          color={theme.colors[textCol]}
          style={{ marginRight: 4 }}
        />
        <Text variant="bodySecondary" fontWeight="bold" color={textCol}>
          {label}
        </Text>
      </Box>
    );
  };

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
    <Box flex={1} bg="mainBackground" p="m">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Box flexDirection="row" alignItems="center">
          {!isDesktop && (
            <Box mr="s">
              <Button
                title={t('back')}
                onPress={() => setSelectedShop(null)}
                variant="secondary"
                icon={
                  <ArrowLeft
                    size={16}
                    color={theme.colors.secondaryButtonText}
                  />
                }
              />
            </Box>
          )}
          <Text variant="header" fontSize={isDesktop ? 32 : 24}>
            {shop.name}
          </Text>
        </Box>
        <Button
          title={t('logInteraction')}
          onPress={() => onLogInteraction?.(shop)}
          variant="primary"
        />
      </Box>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Shop Meta Stats */}
        <Box
          flexDirection="row"
          flexWrap="wrap"
          style={{ marginHorizontal: -8 }}
          mb="m"
        >
          <Box width={isDesktop ? '33.3%' : '100%'} p="s">
            <Card flexDirection="row" alignItems="center" p="m">
              <Box bg="infoBg" p="s" borderRadius="m" mr="m">
                <MapPin size={20} color={theme.colors.info} />
              </Box>
              <Box flex={1}>
                <Text variant="bodySecondary">{t('address')}</Text>
                <Text variant="body" fontWeight="bold" numberOfLines={2}>
                  {shop.address || t('noAddress')}
                </Text>
              </Box>
            </Card>
          </Box>

          <Box width={isDesktop ? '33.3%' : '50%'} p="s">
            <Card flexDirection="row" alignItems="center" p="m">
              <Box bg="successBg" p="s" borderRadius="m" mr="m">
                <DollarSign size={20} color={theme.colors.success} />
              </Box>
              <Box flex={1}>
                <Text variant="bodySecondary">{t('lifetimeValue')}</Text>
                <Text variant="body" fontWeight="bold">
                  K{shop.lifetimeValue?.toLocaleString() || '0.00'}
                </Text>
              </Box>
            </Card>
          </Box>

          <Box width={isDesktop ? '33.3%' : '50%'} p="s">
            <Card flexDirection="row" alignItems="center" p="m">
              <Box bg="warningBg" p="s" borderRadius="m" mr="m">
                <Star size={20} color={theme.colors.warning} />
              </Box>
              <Box flex={1}>
                <Text variant="bodySecondary">{t('sentimentTrend')}</Text>
                <Box mt="xs" alignItems="flex-start">
                  {renderTrendBadge(shop.sentimentTrend)}
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Contacts Section */}
        <Text variant="title" mb="s">
          {t('contacts')}
        </Text>
        <Box
          flexDirection="row"
          flexWrap="wrap"
          style={{ marginHorizontal: -8 }}
          mb="l"
        >
          {shopContacts.map((c) => (
            <Box key={c.id} width={isDesktop ? '50%' : '100%'} p="s">
              <Card
                p="m"
                borderLeftWidth={c.isPrimary ? 4 : 0}
                borderLeftColor="primaryButton"
              >
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb="s"
                >
                  <Box flexDirection="row" alignItems="center">
                    <User
                      size={16}
                      color={theme.colors.secondaryText}
                      style={{ marginRight: 6 }}
                    />
                    <Text variant="body" fontWeight="bold">
                      {c.name}
                    </Text>
                  </Box>
                  {c.isPrimary && (
                    <Box bg="primaryButton" px="s" py="xs" borderRadius="s">
                      <Text
                        variant="badge"
                        color="primaryButtonText"
                        fontSize={10}
                      >
                        {t('primaryContact')}
                      </Text>
                    </Box>
                  )}
                </Box>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Phone
                    size={14}
                    color={theme.colors.primaryButton}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    variant="bodySecondary"
                    color="primaryButton"
                    style={{ textDecorationLine: 'underline' }}
                  >
                    {c.phoneNumber}
                  </Text>
                </TouchableOpacity>
              </Card>
            </Box>
          ))}
          {shopContacts.length === 0 && (
            <Box p="m">
              <Text variant="bodySecondary">{t('noContacts')}</Text>
            </Box>
          )}
        </Box>

        {/* Recent Interactions Timeline */}
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
                    <LogIcon size={16} color={theme.colors.primaryText} />
                  </Box>
                  <Text variant="body" fontWeight="bold">
                    {getLogTypeLabel(log.type)}
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Clock
                    size={12}
                    color={theme.colors.secondaryText}
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
                          {item.quantity}x
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
      </ScrollView>
    </Box>
  );
};
