import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  Card,
  Text,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { MapPin, Search } from 'lucide-react-native';
import { Shop } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { WEB_NO_OUTLINE, WEB_TRANSITION } from './webStyles';

interface ShopPickerProps {
  shops: Shop[];
  selectedShop: Shop | undefined;
  selectedShopId: string;
  onSelectShop: (shopId: string) => void;
}

export function ShopPicker({
  shops,
  selectedShop,
  selectedShopId,
  onSelectShop,
}: ShopPickerProps): React.JSX.Element {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();
  const [shopSearch, setShopSearch] = useState('');
  const [showShopList, setShowShopList] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredShops = useMemo(
    () =>
      shopSearch
        ? shops.filter((s) =>
            s.name.toLowerCase().includes(shopSearch.toLowerCase()),
          )
        : shops,
    [shops, shopSearch],
  );

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectShopForDraftOrder')}
      </Text>

      <Pressable
        onPress={() => setShowShopList(!showShopList)}
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.99 : 1 }],
            ...WEB_TRANSITION,
          },
        ]}
      >
        <Box
          height={48}
          borderWidth={1}
          borderRadius="m"
          px="m"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          borderColor="borderColor"
          bg="cardBackground"
        >
          <Box flexDirection="row" alignItems="center" flex={1}>
            <Box mr="s">
              <MapPin size={18} stroke={theme.colors.primaryButton} />
            </Box>
            <Text
              variant="body"
              fontWeight={selectedShop ? 'bold' : 'normal'}
              color={selectedShop ? 'primaryText' : 'secondaryText'}
            >
              {selectedShop ? selectedShop.name : t('selectRetailAccount')}
            </Text>
          </Box>
          <Text color="secondaryText">▼</Text>
        </Box>
      </Pressable>

      {showShopList && (
        <Box
          mt="s"
          borderWidth={1}
          borderRadius="m"
          p="s"
          borderColor="borderColor"
        >
          <Box
            flexDirection="row"
            alignItems="center"
            borderWidth={searchFocused ? 2 : 1}
            borderColor={searchFocused ? 'success' : 'borderColor'}
            borderRadius="m"
            px="s"
            mb="s"
            bg="mainBackground"
          >
            <Box mr="xs">
              <Search size={16} stroke={theme.colors.secondaryText} />
            </Box>
            <ThemedTextInput
              placeholder={t('searchShops')}
              placeholderTextColor={theme.colors.secondaryText}
              value={shopSearch}
              onChangeText={setShopSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              flex={1}
              height={36}
              style={{
                fontSize: 14,
                color: theme.colors.primaryText,
                ...WEB_NO_OUTLINE,
              }}
            />
          </Box>

          <Box maxHeight={200}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {filteredShops.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    onSelectShop(s.id);
                    setShowShopList(false);
                    setShopSearch('');
                  }}
                  style={({
                    pressed,
                    hovered,
                  }: {
                    pressed: boolean;
                    hovered?: boolean;
                  }) => [
                    {
                      backgroundColor:
                        selectedShopId === s.id
                          ? theme.colors.secondaryButton
                          : hovered
                            ? theme.colors.secondaryBackground
                            : 'transparent',
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                      ...WEB_TRANSITION,
                    },
                  ]}
                >
                  <Box
                    py="s"
                    px="s"
                    borderBottomWidth={1}
                    borderColor="borderColor"
                  >
                    <Text
                      variant="body"
                      fontWeight={selectedShopId === s.id ? 'bold' : 'normal'}
                    >
                      {s.name}
                    </Text>
                    <Text variant="caption">{s.address}</Text>
                  </Box>
                </Pressable>
              ))}
              {filteredShops.length === 0 && (
                <Box p="m" alignItems="center">
                  <Text variant="bodySecondary">{t('noShopsMatchSearch')}</Text>
                </Box>
              )}
            </ScrollView>
          </Box>
        </Box>
      )}
    </Card>
  );
}
