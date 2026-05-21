import React from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { Box, Text, Card, Button } from '@burma-inventory/ui-components';
import { ProcessedShop } from '../../hooks/useGeographicHeatmapData';
import { Contact } from '@burma-inventory/shared-types';
import { useTranslation } from '../../utils/i18n';

interface MapDetailPaneProps {
  selectedShop: ProcessedShop;
  setSelectedShop: (shop: ProcessedShop | null) => void;
  shopContacts: Contact[];
  loadingSentiment: boolean;
  sentimentResult: {
    sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    explanation: string;
  } | null;
}

export const MapDetailPane: React.FC<MapDetailPaneProps> = ({
  selectedShop,
  setSelectedShop,
  shopContacts,
  loadingSentiment,
  sentimentResult,
}) => {
  const { t } = useTranslation();

  const getTrendIcon = (trend?: 'IMPROVING' | 'STABLE' | 'DECLINING') => {
    if (trend === 'IMPROVING') return '↗️';
    if (trend === 'DECLINING') return '↘️';
    return '➡️';
  };

  const getTrendColor = (trend?: 'IMPROVING' | 'STABLE' | 'DECLINING') => {
    if (trend === 'IMPROVING') return '#22C55E';
    if (trend === 'DECLINING') return '#FF3B30';
    return '#EAB308';
  };

  const getTrendLabel = (trend?: 'IMPROVING' | 'STABLE' | 'DECLINING') => {
    if (trend === 'IMPROVING') return t('trendImproving');
    if (trend === 'STABLE') return t('trendStable');
    if (trend === 'DECLINING') return t('trendDeclining');
    return trend || '';
  };

  const getLogTypeLabel = (logType: string) => {
    if (logType === 'PHONE_CALL') return t('phone');
    if (logType === 'VIBER') return 'Viber';
    if (logType === 'SHOP_VISIT') return t('typeVisit');
    if (logType === 'STOCK_DELIVERY') return t('typeOrder');
    if (logType === 'PAYMENT_COLLECTION') return t('typeCollection');
    return logType.replaceAll('_', ' ');
  };

  const getCommercialStatusLabel = (status: string) => {
    if (status === 'FOLLOWED_UP') return t('statusFollowedUp');
    if (status === 'INTERESTED') return t('statusInterested');
    if (status === 'ORDER_PLACED') return t('statusClosed');
    if (status === 'NOT_INTERESTED') return t('statusNoDeal');
    return status.replaceAll('_', ' ');
  };

  return (
    <ScrollView style={{ maxHeight: 500 }}>
      <Card p="m" bg="cardBackground">
        {/* Shop snapshot header */}
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb="s"
        >
          <Box flex={1} mr="s">
            <Text variant="title">{selectedShop.name}</Text>
            <Text variant="bodySecondary">{selectedShop.address}</Text>
          </Box>
          <Button
            title={t('close')}
            onPress={() => setSelectedShop(null)}
            variant="secondary"
          />
        </Box>

        <Box mb="m" borderTopWidth={1} borderColor="borderColor" pt="s">
          <Text variant="bodySecondary">
            {t('gpsCoordinates')}: {selectedShop.latitude?.toFixed(4)},{' '}
            {selectedShop.longitude?.toFixed(4)}
          </Text>
          <Text variant="bodySecondary">
            {t('totalAccountValue')}:{' '}
            <Text variant="body" fontWeight="bold">
              K{selectedShop.lifetimeValue.toLocaleString()}
            </Text>
          </Text>
          <Text variant="bodySecondary">
            {t('assignedRep')}:{' '}
            <Text variant="body" fontWeight="bold">
              {selectedShop.assignedRepId === 'rep-1' ? 'Ko Min' : 'Ko Hla'}
            </Text>
          </Text>
        </Box>

        {/* Primary Contacts */}
        <Text variant="body" fontWeight="bold" mb="s">
          {t('contacts')}
        </Text>
        {shopContacts.map((c) => (
          <Card key={c.id} p="s" mb="s" bg="secondaryBackground">
            <Text variant="body" fontWeight="bold">
              {c.name} {c.isPrimary ? t('contactPrimary') : ''}
            </Text>
            <Text variant="bodySecondary">{c.phoneNumber}</Text>
          </Card>
        ))}
        {shopContacts.length === 0 && (
          <Text variant="bodySecondary" mb="m">
            {t('noContactsRecorded')}
          </Text>
        )}

        {/* Gemma 4 Relationship Sentiment Analysis Card */}
        <Box
          p="m"
          mb="m"
          borderRadius="m"
          borderWidth={1}
          style={{
            backgroundColor: 'rgba(90, 49, 244, 0.05)',
            borderColor: 'rgba(90, 49, 244, 0.15)',
          }}
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            mb="s"
          >
            <Text variant="body" fontWeight="bold" style={{ color: '#5A31F4' }}>
              {t('gemmaChurnEngine')}
            </Text>
            {!loadingSentiment && sentimentResult && (
              <Box
                px="s"
                py="xs"
                borderRadius="s"
                style={{
                  backgroundColor: getTrendColor(
                    sentimentResult.sentimentTrend,
                  ),
                }}
              >
                <Text
                  variant="bodySecondary"
                  fontWeight="bold"
                  style={{ color: '#fff' }}
                >
                  {getTrendIcon(sentimentResult.sentimentTrend)}{' '}
                  {getTrendLabel(sentimentResult.sentimentTrend)}
                </Text>
              </Box>
            )}
          </Box>

          {loadingSentiment ? (
            <Box flexDirection="row" alignItems="center" py="s">
              <Box mr="s" style={{ transform: [{ scale: 0.8 }] }}>
                <ActivityIndicator size="small" color="#5A31F4" />
              </Box>
              <Text variant="bodySecondary">{t('gemmaAnalysisProgress')}</Text>
            </Box>
          ) : (
            <Text variant="bodySecondary" style={{ lineHeight: 20 }}>
              {sentimentResult?.explanation}
            </Text>
          )}
        </Box>

        {/* Chronological interaction feed */}
        <Text variant="body" fontWeight="bold" mb="s">
          {t('relationshipTimeline')}
        </Text>
        {selectedShop.logs.map((l) => (
          <Card
            key={l.id}
            p="s"
            mb="s"
            borderLeftWidth={3}
            borderLeftColor="borderColor"
          >
            <Box flexDirection="row" justifyContent="space-between" mb="xs">
              <Text variant="body" fontWeight="bold">
                {getLogTypeLabel(l.type)}
              </Text>
              <Text variant="bodySecondary">
                {new Date(l.createdAtLocal).toLocaleDateString()}
              </Text>
            </Box>
            <Text variant="bodySecondary">
              {t('commercialStatus')}:{' '}
              {getCommercialStatusLabel(l.commercialStatus)}
            </Text>
            <Text
              variant="bodySecondary"
              style={{ fontStyle: 'italic' }}
              mt="xs"
            >
              "{l.notes}"
            </Text>
          </Card>
        ))}
        {selectedShop.logs.length === 0 && (
          <Text variant="bodySecondary">{t('noHistoricalLogs')}</Text>
        )}
      </Card>
    </ScrollView>
  );
};
