import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../utils/i18n';

interface SelectedItemsListProps {
  selectedItems: {
    item: Item;
    quantity: number | string;
    selectedUnit: string;
    unitPrice: number | string;
    stockCondition: string;
  }[];
  updateQuantity: (itemId: string, quantity: string) => void;
  updateSelectedUnit: (itemId: string, unit: string) => void;
  updateUnitPrice: (itemId: string, price: string) => void;
  getItemPrice: (item: Item) => number;
  selectedCurrency: string;
  updateStockCondition: (itemId: string, condition: string) => void;
}

export const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  selectedItems,
  updateQuantity,
  updateSelectedUnit,
  updateUnitPrice,
  getItemPrice,
  selectedCurrency,
  updateStockCondition,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  if (selectedItems.length === 0) return null;

  const unitOptions = ['PCS', 'PK', 'BAGS', 'PAL'];

  return (
    <Box mb="m">
      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectedQuantities')}
      </Text>
      {selectedItems.map((si) => {
        const qty = parseInt(si.quantity.toString() || '0', 10);
        const price = Number(si.unitPrice || 0);
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
            mb="m"
            p="m"
            borderRadius="m"
            borderWidth={1}
            borderColor="borderColor"
            bg="secondaryBackground"
          >
            {/* Row 1: Item Name */}
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="s"
            >
              <Text variant="body" fontWeight="bold" style={{ flex: 1 }}>
                {si.item.name}
              </Text>
              <Text variant="bodySecondary" color="secondaryText">
                {si.item.sku}
              </Text>
            </Box>

            {/* Row 2: Quantity & Unit Variant Selector */}
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              mb="s"
            >
              {/* Quantity */}
              <Box flexDirection="row" alignItems="center">
                <Text variant="bodySecondary" mr="s">
                  Qty:
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    padding: 8,
                    width: 70,
                    borderRadius: theme.borderRadii.s,
                    borderWidth: 1,
                    borderColor: theme.colors.borderColor,
                    color: theme.colors.primaryText,
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                  keyboardType="numeric"
                  value={si.quantity.toString()}
                  onChangeText={(val) => updateQuantity(si.item.id, val)}
                />
              </Box>

              {/* Unit Segmented Control */}
              <Box flexDirection="row">
                {unitOptions.map((unit) => {
                  const isSelected = si.selectedUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => updateSelectedUnit(si.item.id, unit)}
                      activeOpacity={0.7}
                      style={{ marginLeft: 4 }}
                    >
                      <Box
                        px="s"
                        py="xs"
                        borderRadius="s"
                        borderWidth={1}
                        borderColor={
                          isSelected ? 'primaryButton' : 'borderColor'
                        }
                        bg={isSelected ? 'primaryButton' : 'cardBackground'}
                      >
                        <Text
                          variant="badge"
                          fontWeight="bold"
                          color={
                            isSelected ? 'primaryButtonText' : 'secondaryText'
                          }
                        >
                          {unit}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </Box>
            </Box>

            {/* Row 2.5: Stock Condition Selector */}
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              mb="s"
            >
              <Text variant="bodySecondary">Condition:</Text>
              <Box flexDirection="row">
                {['GOOD', 'BAD', 'WET'].map((cond) => {
                  const isSelected = (si.stockCondition || 'GOOD') === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      onPress={() => updateStockCondition(si.item.id, cond)}
                      activeOpacity={0.7}
                      style={{ marginLeft: 4 }}
                    >
                      <Box
                        px="s"
                        py="xs"
                        borderRadius="s"
                        borderWidth={1}
                        borderColor={
                          isSelected ? 'primaryButton' : 'borderColor'
                        }
                        bg={isSelected ? 'primaryButton' : 'cardBackground'}
                      >
                        <Text
                          variant="badge"
                          fontWeight="bold"
                          color={
                            isSelected ? 'primaryButtonText' : 'secondaryText'
                          }
                        >
                          {cond}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </Box>
            </Box>

            {/* Row 3: Negotiated Price Input */}
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              borderTopWidth={1}
              borderTopColor="borderColor"
              pt="s"
              mt="xs"
            >
              <Box style={{ flex: 1, marginRight: 8 }}>
                <Text variant="bodySecondary" color="secondaryText" mb="xs">
                  Negotiated Price ({selectedCurrency}):
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    padding: 6,
                    borderRadius: theme.borderRadii.s,
                    borderWidth: 1,
                    borderColor: theme.colors.borderColor,
                    color: theme.colors.primaryText,
                    fontWeight: 'bold',
                    fontSize: 14,
                  }}
                  keyboardType="numeric"
                  value={si.unitPrice.toString()}
                  onChangeText={(val) => updateUnitPrice(si.item.id, val)}
                />
              </Box>

              <Box alignItems="flex-end" justifyContent="center">
                <Text variant="bodySecondary" color="secondaryText">
                  {formattedPrice} x {si.quantity || '0'}
                </Text>
                <Text variant="body" fontWeight="bold" color="primaryButton">
                  Total: {formattedTotal}
                </Text>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
