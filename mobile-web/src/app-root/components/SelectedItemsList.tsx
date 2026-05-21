import React from 'react';
import { TextInput } from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../utils/i18n';

interface SelectedItemsListProps {
  selectedItems: { item: Item; quantity: number | string }[];
  updateQuantity: (itemId: string, quantity: string) => void;
  getItemPrice: (item: Item) => number;
  selectedCurrency: string;
}

export const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  selectedItems,
  updateQuantity,
  getItemPrice,
  selectedCurrency,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  if (selectedItems.length === 0) return null;

  return (
    <Box mb="m">
      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectedQuantities')}
      </Text>
      {selectedItems.map((si) => {
        const price = getItemPrice(si.item);
        const qty = parseInt(si.quantity.toString() || '0', 10);
        const totalVal = price * (isNaN(qty) ? 0 : qty);
        const formattedPrice =
          selectedCurrency === 'MMK'
            ? `${Math.round(price).toLocaleString()} MMK`
            : `${price.toFixed(2)} ${selectedCurrency}`;
        const formattedTotal =
          selectedCurrency === 'MMK'
            ? `${Math.round(totalVal).toLocaleString()} MMK`
            : `${totalVal.toFixed(2)} ${selectedCurrency}`;

        return (
          <Box
            key={si.item.id}
            mb="s"
            p="s"
            borderRadius="m"
            borderWidth={1}
            borderColor="borderColor"
            bg="secondaryBackground"
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="xs"
            >
              <Text variant="body" fontWeight="bold" style={{ flex: 1 }}>
                {si.item.name}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  padding: 4,
                  width: 60,
                  borderRadius: theme.borderRadii.s,
                  borderWidth: 1,
                  borderColor: theme.colors.borderColor,
                  color: theme.colors.primaryText,
                  textAlign: 'center',
                  outlineWidth: 0,
                }}
                keyboardType="numeric"
                value={si.quantity.toString()}
                onChangeText={(val) => updateQuantity(si.item.id, val)}
              />
            </Box>
            <Box flexDirection="row" justifyContent="space-between">
              <Text variant="bodySecondary" color="secondaryText">
                {formattedPrice} x {si.quantity || '0'}
              </Text>
              <Text
                variant="bodySecondary"
                fontWeight="bold"
                color="primaryText"
              >
                Total: {formattedTotal}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
