import React, { useState } from 'react';
import { Pressable, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  Text,
  Theme,
  ThemedTextInput,
  TextField,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';

interface SelectedItemsListProps {
  selectedItems: {
    item: Item;
    quantity: number | string;
    selectedUnit: string;
    unitPrice: number | string;
    stockCondition: string;
    pendingAllocationCount?: number;
  }[];
  updateQuantity: (itemId: string, quantity: string) => void;
  updateSelectedUnit: (itemId: string, unit: string) => void;
  updateUnitPrice: (itemId: string, price: string) => void;
  getItemPrice: (item: Item) => number;
  selectedCurrency: string;
  updateStockCondition: (itemId: string, condition: string) => void;
  isOverrideMarginAcknowledged?: boolean;
  setIsOverrideMarginAcknowledged?: (val: boolean) => void;
  lastInteractionLog?: $Any;
  onDuplicateLastOrder?: () => void;
  projects?: $Any[];
  selectedProjectId?: string | null;
  setSelectedProjectId?: (id: string | null) => void;
}

/** Web-only CSS transition mixin for smooth press/hover feedback */
const webTransition =
  Platform.OS === 'web'
    ? ({
        transitionProperty: 'transform, opacity',
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease-in-out',
      } as $Any)
    : {};

/** Resolve semantic colors for stock condition badges */
const conditionTokens = (condition: string, isSelected: boolean) => {
  if (!isSelected) {
    return {
      bg: 'cardBackground' as const,
      border: 'borderColor' as const,
      text: 'secondaryText' as const,
    };
  }
  if (condition === 'BAD') {
    return {
      bg: 'danger' as const,
      border: 'danger' as const,
      text: 'pureWhite' as const,
    };
  }
  if (condition === 'WET') {
    return {
      bg: 'warning' as const,
      border: 'warning' as const,
      text: 'pureWhite' as const,
    };
  }
  // GOOD → emerald
  return {
    bg: 'success' as const,
    border: 'success' as const,
    text: 'pureWhite' as const,
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
  projects,
  selectedProjectId,
  setSelectedProjectId,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const [focusedQtyId, setFocusedQtyId] = useState<string | null>(null);

  /** Duplicate order CTA — shown when basket is empty */
  const DuplicateOrderCTA = () => {
    const hasHistory = Boolean(lastInteractionLog);
    return (
      <Box mb="m">
        <Text variant="body" fontWeight="bold" mb="s">
          {t('orderDuplication')}
        </Text>
        <Pressable
          onPress={hasHistory ? onDuplicateLastOrder : undefined}
          disabled={!hasHistory}
          style={({ pressed }) => [
            {
              transform: [{ scale: hasHistory && pressed ? 0.98 : 1 }],
              ...webTransition,
              ...(Platform.OS === 'web' && !hasHistory
                ? ({ cursor: 'not-allowed' } as $Any)
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
            opacity={hasHistory ? 1 : 0.45}
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={hasHistory ? 'primaryButton' : 'secondaryText'}
            >
              {hasHistory
                ? '🔂 ' + t('duplicateLastOrder')
                : t('noPriorTransactions')}
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

      {projects && projects.length > 0 && setSelectedProjectId && (
        <Box mb="m">
          <DropdownSelector
            label={t('projectAllocationBulkContract')}
            placeholder={t('selectProjectContract')}
            selectedValue={selectedProjectId || ''}
            onValueChange={(val) => setSelectedProjectId(val ? val : null)}
            options={[
              { label: 'None (Regular Sale)', value: '' },
              ...projects.map((p) => ({ label: p.name, value: p.id })),
            ]}
          />
        </Box>
      )}

      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectedQuantities')}
      </Text>

      <FlashList
        data={selectedItems}
        keyExtractor={(si) => si.item.id}
        estimatedItemSize={250}
        renderItem={({ item: si }) => {
          const qty = parseInt(si.quantity.toString() || '0', 10);
          const price = Number(si.unitPrice || 0);
          const totalVal = price * (isNaN(qty) ? 0 : qty);
          const baseFloor = getItemPrice(si.item);
          const isBelowFloor = price < baseFloor * 0.85;
          const qtyFocused = focusedQtyId === si.item.id;

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
              p="m"
              borderRadius="m"
              borderWidth={1}
              borderColor={isBelowFloor ? 'danger' : 'borderColor'}
              bg="secondaryBackground"
            >
              {/* Row 1: Item Name & SKU */}
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                mb="s"
              >
                <Box flex={1}>
                  <Text variant="body" fontWeight="bold">
                    {si.item.name}
                  </Text>
                </Box>
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
                    {t('qty')}
                  </Text>
                  <ThemedTextInput
                    bg="cardBackground"
                    p="s"
                    width={70}
                    borderRadius="s"
                    borderWidth={qtyFocused ? 2 : 1}
                    borderColor={qtyFocused ? 'success' : 'borderColor'}
                    keyboardType="numeric"
                    value={si.quantity.toString()}
                    onChangeText={(val) => updateQuantity(si.item.id, val)}
                    onFocus={() => setFocusedQtyId(si.item.id)}
                    onBlur={() => setFocusedQtyId(null)}
                    style={{
                      color: theme.colors.primaryText,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      ...(Platform.OS === 'web'
                        ? ({
                            outlineStyle: 'none',
                          } as $Any)
                        : {}),
                    }}
                  />
                </Box>

                {/* Unit Segmented Control */}
                <Box>
                  <Text variant="caption" mb="xs" color="secondaryText">
                    {t('unit')}
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
                                isSelected
                                  ? 'primaryButtonText'
                                  : 'secondaryText'
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
                    {t('condition')}
                  </Text>
                </Box>
                <Box flexDirection="row">
                  {['GOOD', 'BAD', 'WET'].map((cond) => {
                    const isSelected = (si.stockCondition || 'GOOD') === cond;
                    const tokens = conditionTokens(cond, isSelected);
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
                          backgroundColor={tokens.bg}
                          borderColor={tokens.border}
                        >
                          <Text
                            variant="badge"
                            fontWeight="bold"
                            color={tokens.text}
                          >
                            {cond}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </Box>
              </Box>

              {/* Volume Discount Info / Brackets */}
              {si.item.volumeDiscountBrackets && (
                <Box
                  mt="s"
                  mb="s"
                  p="s"
                  borderRadius="s"
                  bg="secondaryBackground"
                  borderWidth={1}
                  borderColor="borderColor"
                >
                  <Text
                    variant="caption"
                    color="secondaryText"
                    fontWeight="bold"
                    mb="xs"
                  >
                    💰 {t('volumeDiscountBrackets')}:
                  </Text>
                  {(() => {
                    try {
                      const brackets = JSON.parse(
                        si.item.volumeDiscountBrackets,
                      );
                      if (Array.isArray(brackets) && brackets.length > 0) {
                        const activeQty =
                          parseInt(si.quantity.toString() || '0', 10) || 0;
                        return (
                          <Box flexDirection="row" flexWrap="wrap">
                            {brackets.map((b: $Any, index: number) => {
                              const isMet = activeQty >= b.quantity;
                              return (
                                <Box
                                  key={index}
                                  mr="xs"
                                  mb="xs"
                                  px="s"
                                  py="xs"
                                  borderRadius="s"
                                  bg={isMet ? 'success' : 'cardBackground'}
                                  borderWidth={1}
                                  borderColor={
                                    isMet ? 'success' : 'borderColor'
                                  }
                                >
                                  <Text
                                    variant="badge"
                                    color={
                                      isMet ? 'pureWhite' : 'secondaryText'
                                    }
                                    fontWeight="bold"
                                  >
                                    {b.quantity}+{' '}
                                    {si.selectedUnit || t('unitPcs')}:{' '}
                                    {t('percentOff').replace(
                                      '{pct}',
                                      b.discount_percent.toString(),
                                    )}
                                    {isMet ? t('appliedSuffix') : ''}
                                  </Text>
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      }
                    } catch {
                      return (
                        <Text variant="caption" color="danger">
                          {t('invalidBracketsFormat')}
                        </Text>
                      );
                    }
                    return null;
                  })()}
                </Box>
              )}

              {/* Row 3: Negotiated Price Input — vertical label stack */}
              <Box
                borderTopWidth={1}
                borderTopColor="borderColor"
                pt="s"
                mt="xs"
              >
                <Box
                  flexDirection="row"
                  alignItems="flex-end"
                  justifyContent="space-between"
                >
                  <Box flex={1} mr="s">
                    <TextField
                      name="base_price_kyats"
                      label={`${t('negotiatedPrice')} (${selectedCurrency})`}
                      value={si.unitPrice.toString()}
                      onChangeText={(val) => updateUnitPrice(si.item.id, val)}
                      isBelowFloor={isBelowFloor}
                      keyboardType="numeric"
                      style={{
                        fontWeight: 'bold',
                        fontSize: 14,
                      }}
                    />
                    {isBelowFloor && (
                      <Text variant="caption" color="dangerText" mt="xs">
                        ⚠ {t('belowWholesaleFloorWarning')}
                      </Text>
                    )}
                  </Box>

                  <Box alignItems="flex-end" justifyContent="center">
                    <Text variant="caption" color="secondaryText">
                      {formattedPrice} × {si.quantity || '0'}
                    </Text>
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color="primaryButton"
                    >
                      {formattedTotal}
                    </Text>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        }}
        ItemSeparatorComponent={() => <Box height={theme.spacing.m} />}
        scrollEnabled={false}
      />

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
                <Text color="primaryButtonText" fontSize={10} fontWeight="bold">
                  ✓
                </Text>
              )}
            </Box>
            <Box flex={1}>
              <Text variant="body" fontWeight="bold" color="dangerText">
                {t('acknowledgeOverrideMargin')}
              </Text>
            </Box>
          </Pressable>
        </Box>
      )}
    </Box>
  );
};
