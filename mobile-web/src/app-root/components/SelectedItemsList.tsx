import React, { useState } from 'react';
import { TextInput, Pressable, Platform } from 'react-native';
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
  isOverrideMarginAcknowledged?: boolean;
  setIsOverrideMarginAcknowledged?: (val: boolean) => void;
  lastInteractionLog?: any;
  onDuplicateLastOrder?: () => void;
}

/** Web-only CSS transition mixin for smooth press/hover feedback */
const webTransition =
  Platform.OS === 'web'
    ? ({
        transitionProperty: 'transform, opacity',
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease-in-out',
      } as any)
    : {};

/** Resolve semantic colors for stock condition badges */
const conditionTokens = (
  condition: string,
  isSelected: boolean,
  theme: Theme,
) => {
  if (!isSelected) {
    return {
      bg: theme.colors.cardBackground,
      border: theme.colors.borderColor,
      text: theme.colors.secondaryText,
    };
  }
  if (condition === 'BAD') {
    return {
      bg: theme.colors.danger,
      border: theme.colors.danger,
      text: theme.colors.pureWhite,
    };
  }
  if (condition === 'WET') {
    return {
      bg: theme.colors.warning,
      border: theme.colors.warning,
      text: theme.colors.pureWhite,
    };
  }
  // GOOD → emerald
  return {
    bg: theme.colors.success,
    border: theme.colors.success,
    text: theme.colors.pureWhite,
  };
};

export const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  selectedItems,
  updateQuantity,
  updateSelectedUnit,
  updateUnitPrice,
  getItemPrice,
  selectedCurrency,
  updateStockCondition,
  isOverrideMarginAcknowledged = false,
  setIsOverrideMarginAcknowledged,
  lastInteractionLog,
  onDuplicateLastOrder,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  // Track which price input is focused for the emerald focus ring
  const [focusedPriceId, setFocusedPriceId] = useState<string | null>(null);
  const [focusedQtyId, setFocusedQtyId] = useState<string | null>(null);

  /** Duplicate order CTA — shown when basket is empty */
  const DuplicateOrderCTA = () => {
    const hasHistory = Boolean(lastInteractionLog);
    return (
      <Box mb="m">
        <Text variant="body" fontWeight="bold" mb="s">
          Order Duplication
        </Text>
        <Pressable
          onPress={hasHistory ? onDuplicateLastOrder : undefined}
          disabled={!hasHistory}
          style={({ pressed }) => [
            {
              transform: [{ scale: hasHistory && pressed ? 0.98 : 1 }],
              ...webTransition,
              ...(Platform.OS === 'web' && !hasHistory
                ? ({ cursor: 'not-allowed' } as any)
                : {}),
            },
          ]}
        >
          <Box
            py="s"
            px="m"
            borderRadius="m"
            borderWidth={1}
            borderColor={hasHistory ? 'primaryButton' : 'borderColor'}
            bg={hasHistory ? 'secondaryButton' : 'cardBackground'}
            alignItems="center"
            style={{ opacity: hasHistory ? 1 : 0.45 }}
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={hasHistory ? 'primaryButton' : 'secondaryText'}
            >
              {hasHistory
                ? '🔂 Duplicate Last Order'
                : 'No Prior Transactions Found'}
            </Text>
          </Box>
        </Pressable>
      </Box>
    );
  };

  if (selectedItems.length === 0) {
    if (onDuplicateLastOrder) {
      return <DuplicateOrderCTA />;
    }
    return null;
  }

  const unitOptions = ['PCS', 'PK', 'BAGS', 'PAL'];
  const hasBelowFloorPrice = selectedItems.some(
    (si) => Number(si.unitPrice || 0) < getItemPrice(si.item) * 0.85,
  );

  return (
    <Box mb="m">
      {onDuplicateLastOrder && <DuplicateOrderCTA />}

      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectedQuantities')}
      </Text>

      {selectedItems.map((si) => {
        const qty = parseInt(si.quantity.toString() || '0', 10);
        const price = Number(si.unitPrice || 0);
        const totalVal = price * (isNaN(qty) ? 0 : qty);
        const baseFloor = getItemPrice(si.item);
        const isBelowFloor = price < baseFloor * 0.85;
        const priceFocused = focusedPriceId === si.item.id;
        const qtyFocused = focusedQtyId === si.item.id;

        const formattedPrice =
          selectedCurrency === 'MMK'
            ? `${Math.round(price).toLocaleString()} MMK`
            : `${price.toFixed(2)} ${selectedCurrency}`;
        const formattedTotal =
          selectedCurrency === 'MMK'
            ? `${Math.round(totalVal).toLocaleString()} MMK`
            : `${totalVal.toFixed(2)} ${selectedCurrency}`;

        // Price input border semantics: crimson if below floor, emerald if focused, default otherwise
        const priceBorderColor = isBelowFloor
          ? theme.colors.danger
          : priceFocused
            ? theme.colors.success
            : theme.colors.borderColor;
        const priceBorderWidth = isBelowFloor || priceFocused ? 2 : 1;

        const qtyBorderColor = qtyFocused
          ? theme.colors.success
          : theme.colors.borderColor;
        const qtyBorderWidth = qtyFocused ? 2 : 1;

        return (
          <Box
            key={si.item.id}
            mb="m"
            p="m"
            borderRadius="m"
            borderWidth={1}
            borderColor={isBelowFloor ? 'danger' : 'borderColor'}
            bg="secondaryBackground"
            style={
              Platform.OS === 'web'
                ? ({
                    transitionProperty: 'border-color',
                    transitionDuration: '200ms',
                  } as any)
                : undefined
            }
          >
            {/* Row 1: Item Name & SKU */}
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
              <Box>
                <Text variant="caption" mb="xs" color="secondaryText">
                  Qty
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    padding: 8,
                    width: 70,
                    borderRadius: theme.borderRadii.s,
                    borderWidth: qtyBorderWidth,
                    borderColor: qtyBorderColor,
                    color: theme.colors.primaryText,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    letterSpacing: 0.5,
                    ...(Platform.OS === 'web'
                      ? ({
                          transitionProperty: 'border-color, border-width',
                          transitionDuration: '150ms',
                          outlineStyle: 'none',
                        } as any)
                      : {}),
                  }}
                  keyboardType="numeric"
                  value={si.quantity.toString()}
                  onChangeText={(val) => updateQuantity(si.item.id, val)}
                  onFocus={() => setFocusedQtyId(si.item.id)}
                  onBlur={() => setFocusedQtyId(null)}
                />
              </Box>

              {/* Unit Segmented Control */}
              <Box>
                <Text variant="caption" mb="xs" color="secondaryText">
                  Unit
                </Text>
                <Box flexDirection="row">
                  {unitOptions.map((unit) => {
                    const isSelected = si.selectedUnit === unit;
                    return (
                      <Pressable
                        key={unit}
                        onPress={() => updateSelectedUnit(si.item.id, unit)}
                        style={({ pressed }) => [
                          {
                            marginLeft: theme.spacing.xs,
                            transform: [{ scale: pressed ? 0.95 : 1 }],
                            ...webTransition,
                          },
                        ]}
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
                      </Pressable>
                    );
                  })}
                </Box>
              </Box>
            </Box>

            {/* Row 2.5: Stock Condition Selector */}
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              mb="s"
            >
              <Box>
                <Text variant="caption" color="secondaryText">
                  Condition
                </Text>
              </Box>
              <Box flexDirection="row">
                {['GOOD', 'BAD', 'WET'].map((cond) => {
                  const isSelected = (si.stockCondition || 'GOOD') === cond;
                  const tokens = conditionTokens(cond, isSelected, theme);
                  return (
                    <Pressable
                      key={cond}
                      onPress={() => updateStockCondition(si.item.id, cond)}
                      style={({ pressed }) => [
                        {
                          marginLeft: theme.spacing.xs,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                          ...webTransition,
                        },
                      ]}
                    >
                      <Box
                        px="s"
                        py="xs"
                        borderRadius="s"
                        borderWidth={1}
                        style={{
                          backgroundColor: tokens.bg,
                          borderColor: tokens.border,
                        }}
                      >
                        <Text
                          variant="badge"
                          fontWeight="bold"
                          style={{ color: tokens.text }}
                        >
                          {cond}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </Box>
            </Box>

            {/* Row 3: Negotiated Price Input — vertical label stack */}
            <Box borderTopWidth={1} borderTopColor="borderColor" pt="s" mt="xs">
              <Box
                flexDirection="row"
                alignItems="flex-end"
                justifyContent="space-between"
              >
                <Box style={{ flex: 1, marginRight: theme.spacing.s }}>
                  <Text variant="caption" color="secondaryText" mb="xs">
                    Negotiated Price ({selectedCurrency})
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.cardBackground,
                      padding: 8,
                      borderRadius: theme.borderRadii.s,
                      borderWidth: priceBorderWidth,
                      borderColor: priceBorderColor,
                      color: theme.colors.primaryText,
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      letterSpacing: 0.5,
                      fontSize: 14,
                      ...(Platform.OS === 'web'
                        ? ({
                            transitionProperty: 'border-color, border-width',
                            transitionDuration: '150ms',
                            outlineStyle: 'none',
                          } as any)
                        : {}),
                    }}
                    keyboardType="numeric"
                    value={si.unitPrice.toString()}
                    onChangeText={(val) => updateUnitPrice(si.item.id, val)}
                    onFocus={() => setFocusedPriceId(si.item.id)}
                    onBlur={() => setFocusedPriceId(null)}
                  />
                  {isBelowFloor && (
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.danger }}
                      mt="xs"
                    >
                      ⚠ Below wholesale floor (–15%)
                    </Text>
                  )}
                </Box>

                <Box alignItems="flex-end" justifyContent="center">
                  <Text variant="caption" color="secondaryText">
                    {formattedPrice} × {si.quantity || '0'}
                  </Text>
                  <Text variant="body" fontWeight="bold" color="primaryButton">
                    {formattedTotal}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>
        );
      })}

      {hasBelowFloorPrice && setIsOverrideMarginAcknowledged && (
        <Box
          mt="s"
          p="m"
          borderRadius="m"
          borderWidth={1}
          borderColor="dangerText"
          bg="dangerBg"
          flexDirection="row"
          alignItems="center"
        >
          <Pressable
            onPress={() =>
              setIsOverrideMarginAcknowledged(!isOverrideMarginAcknowledged)
            }
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
                ...webTransition,
              },
            ]}
          >
            <Box
              width={20}
              height={20}
              borderRadius="s"
              borderWidth={2}
              borderColor={
                isOverrideMarginAcknowledged ? 'primaryButton' : 'dangerText'
              }
              bg={
                isOverrideMarginAcknowledged ? 'primaryButton' : 'transparent'
              }
              justifyContent="center"
              alignItems="center"
              mr="s"
            >
              {isOverrideMarginAcknowledged && (
                <Text
                  style={{
                    color: theme.colors.primaryButtonText,
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                >
                  ✓
                </Text>
              )}
            </Box>
            <Text
              variant="body"
              fontWeight="bold"
              style={{ color: theme.colors.dangerText, flex: 1 }}
            >
              Acknowledge Override Margin (Below Wholesale Floor)
            </Text>
          </Pressable>
        </Box>
      )}
    </Box>
  );
};
