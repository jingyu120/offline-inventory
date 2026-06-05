import { useState, useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { ExpectedInbound } from '@burma-inventory/shared-types';
import { fetchExpectedInbounds } from '../../../core/data/repositories';
import { Truck, Calendar, ArrowRight, RefreshCw } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';

export function InboundForecastList() {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [inbounds, setInbounds] = useState<ExpectedInbound[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await fetchExpectedInbounds();
      // Sort by arrival date/time
      const sorted = data.sort((a, b) =>
        a.estimatedArrivalDate.localeCompare(b.estimatedArrivalDate),
      );
      setInbounds(sorted);
    } catch (e) {
      console.error('Failed to load expected inbounds forecast:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, []);

  return (
    <Card
      p="m"
      mb="m"
      borderColor="borderColor"
      borderWidth={1}
      bg="secondaryBackground"
    >
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Box flexDirection="row" alignItems="center">
          <Truck
            size={20}
            color={theme.colors.primaryButton}
            style={{ marginRight: 8 }}
          />
          <Text variant="title" fontSize={16}>
            {t('inboundTransitForecast')}
          </Text>
        </Box>
        <TouchableOpacity onPress={loadForecast} style={{ padding: 4 }}>
          <RefreshCw size={14} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </Box>

      {loading ? (
        <Box py="m" justifyContent="center" alignItems="center">
          <ActivityIndicator size="small" color={theme.colors.primaryButton} />
        </Box>
      ) : inbounds.length === 0 ? (
        <Box py="m" alignItems="center">
          <Text variant="bodySecondary" fontStyle="italic">
            {t('noTransitTrucksToday')}
          </Text>
        </Box>
      ) : (
        <Box gap="s">
          {inbounds.map((item) => (
            <Box
              key={item.id}
              p="s"
              bg="mainBackground"
              borderRadius="s"
              borderColor="borderColor"
              borderWidth={1}
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box flexDirection="row" alignItems="center" flex={1}>
                <Box
                  bg="successBg"
                  p="s"
                  borderRadius="s"
                  mr="s"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Truck size={16} color={theme.colors.successText} />
                </Box>
                <Box flex={1}>
                  <Text variant="body" fontWeight="bold">
                    {t('sku')}: {item.sku}
                  </Text>
                  <Box flexDirection="row" alignItems="center" mt="xs">
                    <Text variant="bodySecondary" fontSize={12}>
                      {t('origin')}: {item.origin}
                    </Text>
                    <ArrowRight
                      size={10}
                      color={theme.colors.secondaryText}
                      style={{ marginHorizontal: 4 }}
                    />
                    <Text
                      variant="bodySecondary"
                      fontSize={12}
                      color="successText"
                      fontWeight="bold"
                    >
                      {t('qty')}: {item.expectedQuantity}
                    </Text>
                  </Box>
                </Box>
              </Box>

              <Box alignItems="flex-end">
                <Box flexDirection="row" alignItems="center">
                  <Calendar
                    size={12}
                    color={theme.colors.secondaryText}
                    style={{ marginRight: 4 }}
                  />
                  <Text variant="bodySecondary" fontSize={12} fontWeight="bold">
                    {t('eta')}: {item.estimatedArrivalDate}
                  </Text>
                </Box>
                <Text
                  variant="bodySecondary"
                  fontSize={10}
                  style={{ marginTop: 2 }}
                >
                  {t('statusInTransit')}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}
