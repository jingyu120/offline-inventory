import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { FlashList } from '@shopify/flash-list';

interface AvailableItemsSelectorProps {
  skuSearch: string;
  setSkuSearch: (val: string) => void;
  availableItems: Item[];
  selectedItems: { item: Item; quantity: number | string }[];
  toggleItem: (item: Item) => void;
  getItemPrice: (item: Item) => number;
  selectedCurrency: string;
  stocksMap: Record<string, number>;
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
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

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
      <Box style={{ height: 150 }} mb="m">
        <FlashList
          data={availableItems}
          keyExtractor={(item) => item.id}
          estimatedItemSize={65}
          renderItem={({ item }) => {
            const isSelected = selectedItems.find((i) => i.item.id === item.id);
            return (
              <TouchableOpacity onPress={() => toggleItem(item)}>
                <Box
                  p="s"
                  bg={isSelected ? 'secondaryButton' : 'mainBackground'}
                  borderBottomWidth={1}
                  borderColor="borderColor"
                >
                  <Text
                    variant="body"
                    color={isSelected ? 'secondaryButtonText' : 'primaryText'}
                  >
                    {item.name} ({item.sku})
                  </Text>
                  {item.isInDeficit && (
                    <Text
                      variant="bodySecondary"
                      color={isSelected ? 'secondaryButtonText' : 'errorText'}
                      style={{ fontWeight: 'bold', marginTop: 2 }}
                    >
                      {t('supplyDeficitWarning')}
                    </Text>
                  )}
                  <Text
                    variant="bodySecondary"
                    color={isSelected ? 'secondaryButtonText' : 'secondaryText'}
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
                    {stocksMap[item.id] !== undefined ? stocksMap[item.id] : 0}
                  </Text>
                </Box>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <Box height={theme.spacing.s} />}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      </Box>
    </Box>
  );
};
