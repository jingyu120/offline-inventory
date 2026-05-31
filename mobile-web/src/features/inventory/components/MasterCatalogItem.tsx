import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Tag, Layers, Minus, Plus } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import { Item } from '@burma-inventory/shared-types';
import {
  LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_INCREMENT,
} from '../../../config/appConfig';

export interface ExtendedItem extends Item {
  stockQty: number;
}

interface MasterCatalogItemProps {
  item: ExtendedItem;
  controlsActive: boolean;
  onUpdateStock: (item: ExtendedItem, delta: number) => void;
}

export function MasterCatalogItem({
  item,
  controlsActive,
  onUpdateStock,
}: MasterCatalogItemProps) {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const isLowStock = item.stockQty < LOW_STOCK_THRESHOLD;

  return (
    <Card
      mb="s"
      p="m"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      borderLeftWidth={4}
      borderLeftColor={isLowStock ? 'danger' : 'success'}
    >
      <Box flex={1} mr="m">
        <Box flexDirection="row" alignItems="center" mb="xs">
          <Text variant="body" fontWeight="bold">
            {item.name}
          </Text>
          <Box bg="secondaryBackground" px="s" py="xs" borderRadius="s" ml="s">
            <Text variant="bodySecondary" fontSize={11} fontWeight="bold">
              {item.sku}
            </Text>
          </Box>
        </Box>
        <Box flexDirection="row" alignItems="center">
          <Tag
            size={12}
            stroke={theme.colors.secondaryText}
            style={{ marginRight: 4 }}
          />
          <Text variant="bodySecondary" mr="m">
            {item.category}
          </Text>
          <Layers
            size={12}
            stroke={theme.colors.secondaryText}
            style={{ marginRight: 4 }}
          />
          <Text variant="bodySecondary">
            {t('price')}:{' '}
            {t('priceFormatted').replace(
              '{price}',
              item.unitPrice.toLocaleString(),
            )}
          </Text>
        </Box>
      </Box>

      {/* Stock Quantity Controls */}
      <Box
        flexDirection="row"
        alignItems="center"
        style={{ opacity: controlsActive ? 1 : 0.5 }}
      >
        <TouchableOpacity
          onPress={() => onUpdateStock(item, -STOCK_ADJUSTMENT_INCREMENT)}
          disabled={!controlsActive}
          style={{
            backgroundColor: controlsActive
              ? theme.colors.secondaryButton
              : theme.colors.slate300,
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Minus size={14} stroke={theme.colors.secondaryButtonText} />
        </TouchableOpacity>

        <Box minWidth={60} alignItems="center" px="s">
          <Text
            variant="body"
            fontWeight="bold"
            fontSize={16}
            color={isLowStock ? 'danger' : 'primaryText'}
          >
            {item.stockQty}
          </Text>
          <Text variant="bodySecondary" fontSize={10}>
            {isLowStock ? t('lowStock') : t('inStock')}
          </Text>
        </Box>

        <TouchableOpacity
          onPress={() => onUpdateStock(item, STOCK_ADJUSTMENT_INCREMENT)}
          disabled={!controlsActive}
          style={{
            backgroundColor: controlsActive
              ? theme.colors.secondaryButton
              : theme.colors.slate300,
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={14} stroke={theme.colors.secondaryButtonText} />
        </TouchableOpacity>
      </Box>
    </Card>
  );
}
