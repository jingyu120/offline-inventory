import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, inArray } from 'drizzle-orm';
import { Truck } from 'lucide-react-native';

interface ClientViewForecastListProps {
  shopId: string;
}

interface ForecastItem {
  id: string;
  sku: string;
  name: string;
  expectedQuantity: number;
  origin: string;
  estimatedArrivalDate: string;
}

export const ClientViewForecastList: React.FC<ClientViewForecastListProps> = ({
  shopId,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForecastData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Get all interaction logs for the shop
      const logs = await database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(eq(sqliteSchema.interaction_logs.shop_id, shopId));

      if (logs.length === 0) {
        setForecasts([]);
        setLoading(false);
        return;
      }

      const logIds = logs.map((l) => l.id);

      // 2. Fetch all interaction items for those logs
      // Drizzle inArray requires non-empty array
      const chunkedItems = [];
      const chunkSize = 100;
      for (let i = 0; i < logIds.length; i += chunkSize) {
        const chunk = logIds.slice(i, i + chunkSize);
        const itemsList = await database
          .select()
          .from(sqliteSchema.interaction_items)
          .where(
            inArray(sqliteSchema.interaction_items.interaction_log_id, chunk),
          );
        chunkedItems.push(...itemsList);
      }

      if (chunkedItems.length === 0) {
        setForecasts([]);
        setLoading(false);
        return;
      }

      // 3. Aggregate item quantity ordered
      const qtyMap: Record<string, number> = {};
      chunkedItems.forEach((ii) => {
        qtyMap[ii.item_id] = (qtyMap[ii.item_id] || 0) + (ii.quantity || 0);
      });

      // 4. Sort to get most ordered item IDs
      const sortedItemIds = Object.keys(qtyMap).sort(
        (a, b) => qtyMap[b] - qtyMap[a],
      );
      if (sortedItemIds.length === 0) {
        setForecasts([]);
        setLoading(false);
        return;
      }

      // 5. Get SKUs and details for the top items
      const topItems = await database
        .select()
        .from(sqliteSchema.items)
        .where(inArray(sqliteSchema.items.id, sortedItemIds.slice(0, 5)));

      if (topItems.length === 0) {
        setForecasts([]);
        setLoading(false);
        return;
      }

      const skuToNameMap: Record<string, string> = {};
      const skus = topItems.map((item) => {
        skuToNameMap[item.sku] = item.name;
        return item.sku;
      });

      // 6. Fetch matching Expected Inbounds from manifest
      const inbounds = await database
        .select()
        .from(sqliteSchema.expected_inbounds)
        .where(inArray(sqliteSchema.expected_inbounds.sku, skus));

      const mappedForecasts: ForecastItem[] = inbounds.map((ei) => ({
        id: ei.id,
        sku: ei.sku,
        name: skuToNameMap[ei.sku] || 'Unknown Product',
        expectedQuantity: ei.expected_quantity,
        origin: ei.origin,
        estimatedArrivalDate: ei.estimated_arrival_date,
      }));

      setForecasts(mappedForecasts);
    } catch (error) {
      console.error(
        '[ClientViewForecastList] Failed to load forecasts:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  if (loading) {
    return null;
  }

  return (
    <Card p="m" mb="m">
      <Box flexDirection="row" alignItems="center" mb="s">
        <Box bg="infoBg" p="s" borderRadius="m" mr="s">
          <Truck size={18} stroke={theme.colors.info} />
        </Box>
        <Text variant="title" fontSize={16} fontWeight="bold">
          {t('shipmentForecast')}
        </Text>
      </Box>

      {forecasts.length === 0 ? (
        <Text variant="bodySecondary" color="secondaryText" py="s">
          {t('noForecastData')}
        </Text>
      ) : (
        <Box>
          {forecasts.map((fc) => (
            <Box
              key={fc.id}
              py="s"
              borderBottomWidth={1}
              borderBottomColor="borderColor"
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box flex={1} mr="s">
                <Text variant="body" fontWeight="bold">
                  {fc.name}
                </Text>
                <Box flexDirection="row" alignItems="center" mt="xs">
                  <Text variant="caption" color="secondaryText">
                    {t('sku')}: {fc.sku} • {t('origin')}: {fc.origin}
                  </Text>
                </Box>
              </Box>
              <Box alignItems="flex-end">
                <Box bg="successBg" px="s" py="xs" borderRadius="s" mb="xs">
                  <Text variant="badge" color="successText" fontWeight="bold">
                    +{fc.expectedQuantity}
                  </Text>
                </Box>
                <Text variant="caption" color="secondaryText">
                  {fc.estimatedArrivalDate}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
};
