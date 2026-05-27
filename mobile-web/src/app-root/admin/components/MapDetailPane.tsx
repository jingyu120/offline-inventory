import React from 'react';
import { ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { ProcessedShop } from '../../../hooks/useGeographicHeatmapData';
import { Contact } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../utils/i18n';

interface MapDetailPaneProps {
  selectedShop: ProcessedShop;
  setSelectedShop: (shop: ProcessedShop | null) => void;
  shopContacts: Contact[];
  loadingSentiment: boolean;
  sentimentResult: {
    sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    explanation: string;
  } | null;
  allShops: ProcessedShop[];
  onShopSelect: (shop: ProcessedShop) => void;
  mapInstance: any;
  maxHeight?: any;
}

const getBubbleRadius = (ltv: number) => {
  const base = 6;
  const bonus = Math.min(ltv / 2500, 18);
  return base + bonus;
};

export const MapDetailPane: React.FC<MapDetailPaneProps> = ({
  selectedShop,
  setSelectedShop,
  shopContacts,
  loadingSentiment,
  sentimentResult,
  allShops,
  onShopSelect,
  mapInstance,
  maxHeight,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [viewingShop, setViewingShop] = React.useState<ProcessedShop | null>(
    null,
  );
  const [mapStateCounter, setMapStateCounter] = React.useState(0);

  // Sync zoom/move events on the map to trigger recomputing overlaps
  React.useEffect(() => {
    if (!mapInstance) return;
    const handleMapChange = () => {
      setMapStateCounter((prev) => prev + 1);
    };
    mapInstance.on('zoomend', handleMapChange);
    mapInstance.on('moveend', handleMapChange);

    return () => {
      mapInstance.off('zoomend', handleMapChange);
      mapInstance.off('moveend', handleMapChange);
    };
  }, [mapInstance]);

  // Compute overlapping shops sharing screen pixel boundaries
  const overlappingShops = React.useMemo(() => {
    if (!selectedShop || !mapInstance || !allShops.length) return [];
    const L = (window as any).L;
    if (!L) return [];

    try {
      const p1 = mapInstance.latLngToContainerPoint([
        selectedShop.latitude ?? 0,
        selectedShop.longitude ?? 0,
      ]);
      const r1 = getBubbleRadius(selectedShop.lifetimeValue);

      return allShops.filter((s) => {
        if (!s.latitude || !s.longitude) return false;
        const p2 = mapInstance.latLngToContainerPoint([
          s.latitude,
          s.longitude,
        ]);
        const r2 = getBubbleRadius(s.lifetimeValue);
        const dist = p1.distanceTo(p2);
        return dist <= r1 + r2;
      });
    } catch (e) {
      console.warn('Error calculating screen coordinates:', e);
      // Fallback to exact coordinate match if map conversion fails
      return allShops.filter(
        (s) =>
          s.latitude === selectedShop.latitude &&
          s.longitude === selectedShop.longitude,
      );
    }
  }, [selectedShop, allShops, mapInstance, mapStateCounter]);

  // Reset local detail view when selected coordinates change
  React.useEffect(() => {
    setViewingShop(null);
  }, [selectedShop?.latitude, selectedShop?.longitude]);

  // If there's multiple overlapping shops, wait until one is explicitly clicked from the list
  const activeShop =
    viewingShop || (overlappingShops.length === 1 ? selectedShop : null);

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

  if (!activeShop) {
    return (
      <ScrollView
        style={{ maxHeight: maxHeight ?? 500 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <Card p="m" bg="cardBackground">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            mb="m"
            borderBottomWidth={1}
            borderColor="borderColor"
            pb="s"
          >
            <Text variant="title">
              {t('shopsAtThisLocation').replace(
                '{count}',
                overlappingShops.length.toString(),
              )}
            </Text>
            <Button
              title={t('close')}
              onPress={() => setSelectedShop(null)}
              variant="secondary"
            />
          </Box>

          {overlappingShops.map((shop) => (
            <Pressable
              key={shop.id}
              onPress={() => {
                setViewingShop(shop);
              }}
              style={{ cursor: 'pointer' } as any}
            >
              <Card p="m" mb="s" bg="secondaryBackground">
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box flex={1} mr="s">
                    <Text variant="body" fontWeight="bold" color="primaryText">
                      {shop.name}
                    </Text>
                    <Text variant="bodySecondary">
                      {t('totalAccountValue') || 'Value'}: K
                      {shop.lifetimeValue.toLocaleString()}
                    </Text>
                  </Box>
                  <Text color="secondaryText">▶</Text>
                </Box>
              </Card>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ maxHeight: maxHeight ?? 500 }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <Card p="m" bg="cardBackground">
        {/* Back Button if overlapping */}
        {overlappingShops.length > 1 && (
          <Box mb="s">
            <Button
              title={t('backToList')}
              onPress={() => setViewingShop(null)}
              variant="secondary"
            />
          </Box>
        )}

        {/* Shop snapshot header */}
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb="s"
        >
          <Box flex={1} mr="s">
            <Text variant="title">{activeShop.name}</Text>
            <Text variant="bodySecondary">{activeShop.address}</Text>
          </Box>
          <Button
            title={t('close')}
            onPress={() => setSelectedShop(null)}
            variant="secondary"
          />
        </Box>

        <Box mb="m" borderTopWidth={1} borderColor="borderColor" pt="s">
          <Text variant="bodySecondary">
            {t('gpsCoordinates')}: {activeShop.latitude?.toFixed(4)},{' '}
            {activeShop.longitude?.toFixed(4)}
          </Text>
          <Text variant="bodySecondary">
            {t('totalAccountValue')}:{' '}
            <Text variant="body" fontWeight="bold">
              K{activeShop.lifetimeValue.toLocaleString()}
            </Text>
          </Text>
          <Text variant="bodySecondary">
            {t('assignedRep')}:{' '}
            <Text variant="body" fontWeight="bold">
              {activeShop.assignedRepId === 'rep-1' ? 'Ko Min' : 'Ko Hla'}
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
            backgroundColor: theme.colors.brandBg,
            borderColor: theme.colors.brandBorder,
          }}
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            mb="s"
          >
            <Text variant="body" fontWeight="bold" color="brand">
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
        {activeShop.logs.map((l) => (
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
        {activeShop.logs.length === 0 && (
          <Text variant="bodySecondary">{t('noHistoricalLogs')}</Text>
        )}
      </Card>
    </ScrollView>
  );
};
