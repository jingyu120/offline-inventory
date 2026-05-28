import React, { useRef } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
// @ts-expect-error - react-native-gesture-handler types might not fully resolve in monorepo
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Box, Text, Theme, SkeletonRow } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { FlashList } from '@shopify/flash-list';

interface AvailableItemsSelectorProps {
  skuSearch: string;
  setSkuSearch: (val: string) => void;
  availableItems: Item[];
  selectedItems: {
    item: Item;
    quantity: number | string;
    stockCondition: string;
  }[];
  toggleItem: (item: Item) => void;
  getItemPrice: (item: Item) => number;
  selectedCurrency: string;
  stocksMap: Record<string, number>;
  onAuditSwipe: (itemId: string, condition: 'GOOD' | 'DEPLETED') => void;
}

export const AvailableItemsSelector: React.FC<AvailableItemsSelectorProps> = ({
  skuSearch,
  setSkuSearch,
  availableItems,
  selectedItems,
  toggleItem,
  getItemPrice,
  selectedCurrency,
  stocksMap,
  onAuditSwipe,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const swipeableRefs = useRef<Record<string, Swipeable>>({});

  const renderLeftActions = () => {
    return (
      <Box
        bg="success"
        justifyContent="center"
        px="m"
        borderRadius="s"
        mr="s"
        style={{ flex: 1 }}
      >
        <Text variant="body" color="pureWhite" fontWeight="bold">
          ✓ {t('stockLevelOk') || 'Stock Level OK'}
        </Text>
      </Box>
    );
  };

  const renderRightActions = () => {
    return (
      <Box
        bg="danger"
        justifyContent="center"
        alignItems="flex-end"
        px="m"
        borderRadius="s"
        ml="s"
        style={{ flex: 1 }}
      >
        <Text variant="body" color="pureWhite" fontWeight="bold">
          ✗ {t('depleted') || 'Depleted'}
        </Text>
      </Box>
    );
  };

  return (
    <Box>
      <Text variant="title" mb="s">
        {t('skuTagging')}
      </Text>
      <TextInput
        style={{
          backgroundColor: theme.colors.cardBackground,
          padding: 8,
          borderRadius: theme.borderRadii.m,
          borderWidth: 1,
          borderColor: theme.colors.borderColor,
          color: theme.colors.primaryText,
          marginBottom: 8,
          outlineWidth: 0,
        }}
        placeholder={t('searchSkusPlaceholder')}
        placeholderTextColor={theme.colors.secondaryText}
        value={skuSearch}
        onChangeText={setSkuSearch}
      />
      <Box style={{ height: 180 }} mb="m">
        {availableItems.length === 0 ? (
          <Box p="s">
            <SkeletonRow height={45} width="100%" />
            <Box height={8} />
            <SkeletonRow height={45} width="100%" />
            <Box height={8} />
            <SkeletonRow height={45} width="100%" />
          </Box>
        ) : (
          <FlashList
            data={availableItems}
            keyExtractor={(item) => item.id}
            estimatedItemSize={75}
            renderItem={({ item }) => {
              const isSelected = selectedItems.find(
                (i) => i.item.id === item.id,
              );
              const selectedCond = isSelected
                ? isSelected.stockCondition
                : null;

              // Determine row background color or border depending on audit selection state
              let borderCol: keyof Theme['colors'] = 'borderColor';
              let bgCol: keyof Theme['colors'] = 'mainBackground';
              if (isSelected) {
                if (selectedCond === 'DEPLETED') {
                  bgCol = 'dangerBg';
                  borderCol = 'dangerText';
                } else {
                  bgCol = 'secondaryButton';
                  borderCol = 'primaryButton';
                }
              }

              return (
                <Swipeable
                  ref={(el: any) => {
                    if (el) {
                      swipeableRefs.current[item.id] = el;
                    }
                  }}
                  renderLeftActions={renderLeftActions}
                  renderRightActions={renderRightActions}
                  onSwipeableOpen={(direction: 'left' | 'right') => {
                    if (direction === 'left') {
                      onAuditSwipe(item.id, 'GOOD');
                    } else {
                      onAuditSwipe(item.id, 'DEPLETED');
                    }
                    setTimeout(() => {
                      swipeableRefs.current[item.id]?.close();
                    }, 400);
                  }}
                >
                  <TouchableOpacity onPress={() => toggleItem(item)}>
                    <Box
                      p="s"
                      bg={bgCol}
                      borderRadius="s"
                      borderWidth={1}
                      borderColor={borderCol}
                    >
                      <Box
                        flexDirection="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Text
                          variant="body"
                          color={
                            isSelected && selectedCond !== 'DEPLETED'
                              ? 'secondaryButtonText'
                              : 'primaryText'
                          }
                          fontWeight="bold"
                        >
                          {item.name} ({item.sku})
                        </Text>
                        {isSelected && (
                          <Box
                            bg={
                              selectedCond === 'DEPLETED' ? 'danger' : 'success'
                            }
                            px="s"
                            py="xs"
                            borderRadius="s"
                          >
                            <Text
                              variant="badge"
                              color="pureWhite"
                              fontWeight="bold"
                            >
                              {selectedCond === 'DEPLETED'
                                ? 'DEPLETED'
                                : 'OK ✓'}
                            </Text>
                          </Box>
                        )}
                      </Box>
                      {item.isInDeficit && (
                        <Text
                          variant="bodySecondary"
                          color={
                            isSelected && selectedCond !== 'DEPLETED'
                              ? 'secondaryButtonText'
                              : 'errorText'
                          }
                          style={{ fontWeight: 'bold', marginTop: 2 }}
                        >
                          {t('supplyDeficitWarning')}
                        </Text>
                      )}
                      <Text
                        variant="bodySecondary"
                        color={
                          isSelected && selectedCond !== 'DEPLETED'
                            ? 'secondaryButtonText'
                            : 'secondaryText'
                        }
                        style={{ marginTop: 2 }}
                      >
                        {t('price') || 'Price'}:{' '}
                        {(() => {
                          const price = getItemPrice(item);
                          return selectedCurrency === 'MMK'
                            ? `${Math.round(price).toLocaleString()} MMK`
                            : `${price.toFixed(2)} ${selectedCurrency}`;
                        })()}{' '}
                        | {t('availableStock')}:{' '}
                        {stocksMap[item.id] !== undefined
                          ? stocksMap[item.id]
                          : 0}
                      </Text>
                    </Box>
                  </TouchableOpacity>
                </Swipeable>
              );
            }}
            ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </Box>
    </Box>
  );
};
