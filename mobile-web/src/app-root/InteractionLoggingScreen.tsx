import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Box, Text, Button, Card } from '@burma-inventory/ui-components';
import { Shop, Item, sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../database';
import { eq } from 'drizzle-orm';
import {
  fetchItemsAndStockLevel,
  createInteractionLog,
  SelectedItemPayload,
} from '../data/repositories';
import { useTranslation } from '../utils/i18n';
import { useAuth } from '../utils/auth';

// Import subcomponents
import { ViberIntegration } from './components/ViberIntegration';
import { GemmaCopilot } from './components/GemmaCopilot';
import { AvailableItemsSelector } from './components/AvailableItemsSelector';
import { SelectedItemsList } from './components/SelectedItemsList';

interface InteractionLoggingScreenProps {
  visible: boolean;
  onClose: () => void;
  shop: Shop | null;
}

export function InteractionLoggingScreen({
  visible,
  onClose,
  shop,
}: InteractionLoggingScreenProps) {
  const { t } = useTranslation();
  const { activeRep } = useAuth();
  const [type, setType] = useState<string>('SHOP_VISIT');
  const [commercialStatus, setCommercialStatus] =
    useState<string>('FOLLOWED_UP');
  const [notes, setNotes] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    { item: Item; quantity: number | string }[]
  >([]);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState<string>('MMK');
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [priceBookItems, setPriceBookItems] = useState<any[]>([]);
  const [stocksMap, setStocksMap] = useState<Record<string, number>>({});

  const loadRatesAndBook = async () => {
    try {
      const rates = await database.select().from(sqliteSchema.exchange_rates);
      setExchangeRates(rates);

      if (shop && shop.priceBookId) {
        const items = await database
          .select()
          .from(sqliteSchema.price_book_items)
          .where(
            eq(sqliteSchema.price_book_items.price_book_id, shop.priceBookId),
          );
        setPriceBookItems(items);
      } else {
        setPriceBookItems([]);
      }
    } catch (e) {
      console.error('Failed to load rates or price book items:', e);
    }
  };

  const getItemPrice = (item: Item) => {
    const pbItem = priceBookItems.find((pbi) => pbi.item_id === item.id);
    let basePrice = item.unitPrice; // standard MMK price
    let baseCurrency = 'MMK';

    if (pbItem) {
      basePrice = pbItem.price;
      baseCurrency = pbItem.currency;
    }

    if (baseCurrency === selectedCurrency) {
      return basePrice;
    }

    // Convert baseCurrency to MMK first
    let priceInMmk = basePrice;
    if (baseCurrency !== 'MMK') {
      const rateToMmk = exchangeRates.find(
        (r) => r.from_currency === baseCurrency && r.to_currency === 'MMK',
      );
      if (rateToMmk) {
        priceInMmk = basePrice * rateToMmk.rate;
      }
    }

    if (selectedCurrency === 'MMK') {
      return priceInMmk;
    }

    // Convert MMK to selectedCurrency
    const rateFromMmk = exchangeRates.find(
      (r) => r.from_currency === selectedCurrency && r.to_currency === 'MMK',
    );
    if (rateFromMmk && rateFromMmk.rate > 0) {
      return priceInMmk / rateFromMmk.rate;
    }

    // Default rate falls back if rates are not loaded yet
    if (selectedCurrency === 'USD') return priceInMmk / 2100;
    if (selectedCurrency === 'THB') return priceInMmk / 58.5;

    return priceInMmk;
  };

  useEffect(() => {
    if (visible) {
      loadItems();
      loadRatesAndBook();
    } else {
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      loadRatesAndBook();
    }
  }, [shop]);

  useEffect(() => {
    loadItems();
  }, [skuSearch]);

  const loadItems = async () => {
    try {
      const { items, stocksMap: allStocks } = await fetchItemsAndStockLevel();
      const filtered = skuSearch
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(skuSearch.toLowerCase()) ||
              i.sku.toLowerCase().includes(skuSearch.toLowerCase()),
          )
        : items;
      setAvailableItems(filtered);
      setStocksMap(allStocks);
    } catch (e) {
      console.error('Error loading items or stocks', e);
    }
  };

  const resetForm = () => {
    setType('SHOP_VISIT');
    setCommercialStatus('FOLLOWED_UP');
    setNotes('');
    setSelectedItems([]);
    setScreenshotUri(null);
    setSkuSearch('');
    setSelectedCurrency('MMK');
  };

  const toggleItem = (item: Item) => {
    const exists = selectedItems.find((i) => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.item.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: string, quantity: string) => {
    const qtyStr = quantity.replace(/[^0-9]/g, '');
    setSelectedItems(
      selectedItems.map((i) =>
        i.item.id === itemId ? { ...i, quantity: qtyStr } : i,
      ),
    );
  };

  const handleSave = async () => {
    if (!shop) return;

    if (
      (commercialStatus === 'INTERESTED' ||
        commercialStatus === 'NOT_INTERESTED') &&
      notes.length < 20
    ) {
      Alert.alert(t('validationError'), t('marketIntelMinLength'));
      return;
    }

    if (type === 'VIBER' && !screenshotUri) {
      Alert.alert(t('validationError'), t('viberProofMandatory'));
      return;
    }

    // Validate quantity inputs first
    const validatedItems: SelectedItemPayload[] = [];
    for (const selected of selectedItems) {
      const qty =
        typeof selected.quantity === 'number'
          ? selected.quantity
          : parseInt(selected.quantity || '0', 10);
      if (isNaN(qty) || qty < 1) {
        Alert.alert(
          t('validationError'),
          `SKU ${selected.item.sku}: Please enter a valid quantity of 1 or more.`,
        );
        return;
      }
      const price = getItemPrice(selected.item);
      validatedItems.push({
        item: selected.item,
        quantity: qty,
        unitPrice: price,
        selectedCurrency: selectedCurrency,
      });
    }

    // Validate stock levels before saving
    for (const selected of validatedItems) {
      const availableStock = stocksMap[selected.item.id] || 0;
      if (selected.quantity > availableStock) {
        Alert.alert(
          t('insufficientStock'),
          t('insufficientStockMsg')
            .replace('{qty}', selected.quantity.toString())
            .replace('{name}', selected.item.name)
            .replace('{available}', availableStock.toString()),
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await createInteractionLog(
        shop.id,
        activeRep.id,
        type,
        commercialStatus,
        notes,
        screenshotUri,
        validatedItems,
      );
      Alert.alert(t('success'), t('interactionSaved'));
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('interactionSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const getCommercialStatusBtnLabel = (sName: string) => {
    if (sName === 'FOLLOWED_UP') return t('statusFollowedUp');
    if (sName === 'INTERESTED') return t('statusInterested');
    if (sName === 'ORDER_PLACED') return t('statusClosed');
    if (sName === 'NOT_INTERESTED') return t('statusNoDeal');
    return sName.replaceAll('_', ' ');
  };

  return (
    <Modal
      visible={visible}
      transparent={isDesktop}
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Box
        flex={1}
        bg={isDesktop ? 'transparent' : 'mainBackground'}
        style={
          isDesktop
            ? ({
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                justifyContent: 'center',
                alignItems: 'center',
                backdropFilter: 'blur(8px)',
              } as any)
            : undefined
        }
      >
        <KeyboardAvoidingView
          style={
            isDesktop
              ? { width: 600, maxHeight: '85%' }
              : { flex: 1, width: '100%' }
          }
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Box
            flex={1}
            bg="mainBackground"
            p="m"
            borderRadius={isDesktop ? 'l' : 'none'}
            elevation={10}
            style={
              Platform.OS === 'web'
                ? { boxShadow: '0px 10px 24px rgba(0,0,0,0.15)' }
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 24,
                  }
            }
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="m"
            >
              <Text variant="header">{t('logInteraction')}</Text>
              <Button
                title={t('cancel')}
                variant="secondary"
                onPress={onClose}
              />
            </Box>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {shop && (
                <Card mb="m">
                  <Text variant="body" fontWeight="bold">
                    {t('shopLabel')}: {shop.name}
                  </Text>
                </Card>
              )}

              <ViberIntegration
                type={type}
                setType={setType}
                shop={shop}
                screenshotUri={screenshotUri}
                setScreenshotUri={setScreenshotUri}
              />

              <GemmaCopilot
                notes={notes}
                setNotes={setNotes}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                setCommercialStatus={setCommercialStatus}
              />

              <Text variant="title" mt="m" mb="s">
                {t('commercialStatus')}
              </Text>
              <Box flexDirection="row" flexWrap="wrap" mb="m">
                {[
                  'FOLLOWED_UP',
                  'INTERESTED',
                  'ORDER_PLACED',
                  'NOT_INTERESTED',
                ].map((sVal) => (
                  <Box key={sVal} mr="s" mb="s">
                    <Button
                      title={getCommercialStatusBtnLabel(sVal)}
                      variant={
                        commercialStatus === sVal ? 'primary' : 'outline'
                      }
                      onPress={() => setCommercialStatus(sVal)}
                    />
                  </Box>
                ))}
              </Box>

              <Text variant="title" mb="s">
                {t('priceCurrency') || 'Price Currency'}
              </Text>
              <Box flexDirection="row" mb="m">
                {['MMK', 'USD', 'THB'].map((curr) => {
                  const isSelected = selectedCurrency === curr;
                  return (
                    <Box key={curr} mr="s" style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedCurrency(curr)}
                        activeOpacity={0.7}
                      >
                        <Box
                          py="s"
                          px="m"
                          borderRadius="m"
                          borderWidth={1}
                          borderColor={
                            isSelected ? 'primaryButton' : 'borderColor'
                          }
                          bg={isSelected ? 'primaryButton' : 'cardBackground'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text
                            variant="body"
                            fontWeight="bold"
                            color={
                              isSelected ? 'primaryButtonText' : 'primaryText'
                            }
                          >
                            {curr}
                          </Text>
                        </Box>
                      </TouchableOpacity>
                    </Box>
                  );
                })}
              </Box>

              <AvailableItemsSelector
                skuSearch={skuSearch}
                setSkuSearch={setSkuSearch}
                availableItems={availableItems}
                selectedItems={selectedItems}
                toggleItem={toggleItem}
                getItemPrice={getItemPrice}
                selectedCurrency={selectedCurrency}
                stocksMap={stocksMap}
              />

              <SelectedItemsList
                selectedItems={selectedItems}
                updateQuantity={updateQuantity}
                getItemPrice={getItemPrice}
                selectedCurrency={selectedCurrency}
              />

              <Box height={40} />
            </ScrollView>

            <Box mt="m">
              <Button
                title={t('saveLog')}
                onPress={handleSave}
                isLoading={isSaving}
              />
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </Box>
    </Modal>
  );
}
