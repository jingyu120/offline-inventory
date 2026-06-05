import React, { useRef } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import Swipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Box, Text, Theme, SkeletonRow } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { FlashList } from '@shopify/flash-list';
import { INVENTORY_STATUS } from '../../../config/appConfig';
import { ThermalGuard } from '../../../core/utils/thermalGuard';

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
  const swipeableRefs = useRef<Record<string, SwipeableMethods>>({});

  const [localSearch, setLocalSearch] = React.useState(skuSearch);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setLocalSearch(skuSearch);
  }, [skuSearch]);

  const handleTextChange = (text: string) => {
    setLocalSearch(text);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    const thermalState = ThermalGuard.getThermalState();
    const isHighThermal =
      thermalState === 'SERIOUS' || thermalState === 'CRITICAL';
    if (isHighThermal) {
      debounceTimeoutRef.current = setTimeout(() => {
        setSkuSearch(text);
      }, 500);
    } else {
      setSkuSearch(text);
    }
  };

  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

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
          ✓ {t('stockLevelOk')}
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
          ✗ {t('depleted')}
        </Text>
      </Box>
    );
  };

  const filteredAvailableItems = availableItems.filter(
    (item) =>
      item.inventoryStatus === INVENTORY_STATUS.AVAILABLE ||
      !item.inventoryStatus,
  );

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
        value={localSearch}
        onChangeText={handleTextChange}
      />
      <Box style={{ height: 180 }} mb="m">
        {filteredAvailableItems.length === 0 ? (
          <Box p="s">
            <SkeletonRow height={45} width="100%" />
            <Box height={8} />
            <SkeletonRow height={45} width="100%" />
            <Box height={8} />
            <SkeletonRow height={45} width="100%" />
          </Box>
        ) : (
          <FlashList
            data={filteredAvailableItems}
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
                  ref={(el: $Any) => {
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
                                ? t('depleted').toUpperCase()
                                : t('okCheck')}
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
                        {t('price')}:{' '}
                        {(() => {
                          const price = getItemPrice(item);
                          return selectedCurrency === 'MMK'
                            ? `${Math.round(price).toLocaleString()} ${t('currencyKyats')}`
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
