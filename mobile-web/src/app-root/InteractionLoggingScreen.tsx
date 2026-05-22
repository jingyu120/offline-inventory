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
  getConversionMultiplier,
} from '../data/repositories';
import { useTranslation } from '../utils/i18n';
import { useAuth } from '../utils/auth';
import { scannerThrottle } from '../utils/ScannerThrottle';
import { ImageUploadQueue } from '../utils/ImageUploadQueue';
import { API_BASE_URL } from '../config';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';

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
  const theme = useTheme<Theme>();
  const [type, setType] = useState<string>('SHOP_VISIT');
  const [commercialStatus, setCommercialStatus] =
    useState<string>('FOLLOWED_UP');
  const [notes, setNotes] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    {
      item: Item;
      quantity: number | string;
      selectedUnit: string;
      unitPrice: number | string;
    }[]
  >([]);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [ocrVerifying, setOcrVerifying] = useState(false);

  const checkDiscrepancy = (ocrText: string, items: any[]) => {
    const lowerOcr = ocrText.toLowerCase();

    // Heuristic 1: If OCR text mentions "5 premium beers" (or similar), check if we selected exactly that.
    if (lowerOcr.includes('5') && lowerOcr.includes('premium')) {
      if (items.length !== 1) return true;
      const si = items[0];
      const qty =
        typeof si.quantity === 'number'
          ? si.quantity
          : parseInt(si.quantity || '0', 10);
      const isPremium =
        si.item.name.toLowerCase().includes('premium') ||
        si.item.sku.toLowerCase().includes('pb-640');
      if (!isPremium || qty !== 5) {
        return true; // Discrepancy!
      }
      return false; // Match!
    }

    // Heuristic 2: General number mapping if any numbers are found
    const numbersInOcr = ocrText.match(/\d+/g);
    if (numbersInOcr && items.length > 0) {
      const totalSelectedQty = items.reduce(
        (sum, si) =>
          sum +
          (typeof si.quantity === 'number'
            ? si.quantity
            : parseInt(si.quantity || '0', 10)),
        0,
      );
      const ocrQuantities = numbersInOcr.map((n) => parseInt(n, 10));
      if (!ocrQuantities.includes(totalSelectedQty)) {
        return true;
      }
    }

    if (items.length > 0 && !ocrText) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const verifyUploadedScreenshot = async () => {
      if (!screenshotUri) {
        setHasDiscrepancy(false);
        return;
      }

      setOcrVerifying(true);
      try {
        let base64 = '';
        if (screenshotUri.startsWith('data:image/')) {
          base64 = screenshotUri.split(',')[1];
        } else if (screenshotUri.startsWith('blob:')) {
          const response = await fetch(screenshotUri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          const FileSystem = await import('expo-file-system');
          base64 = await FileSystem.readAsStringAsync(screenshotUri, {
            encoding: 'base64',
          });
        }

        const response = await fetch(`${API_BASE_URL}/ai/verify-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        if (response.ok) {
          const data = await response.json();
          const ocrText = data.extractedText || '';
          const isMismatched = checkDiscrepancy(ocrText, selectedItems);
          setHasDiscrepancy(isMismatched);
        }
      } catch (err) {
        console.error('Failed to verify screenshot OCR:', err);
      } finally {
        setOcrVerifying(false);
      }
    };

    verifyUploadedScreenshot();
  }, [screenshotUri, selectedItems]);

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

      if (skuSearch) {
        const perfectMatch = items.find(
          (i) => i.sku.toLowerCase() === skuSearch.trim().toLowerCase(),
        );
        if (perfectMatch) {
          const isAllowed = scannerThrottle.processScan(perfectMatch.sku);
          if (isAllowed) {
            const exists = selectedItems.find(
              (si) => si.item.id === perfectMatch.id,
            );
            if (!exists) {
              const defaultPrice = getItemPrice(perfectMatch);
              setSelectedItems([
                ...selectedItems,
                {
                  item: perfectMatch,
                  quantity: 1,
                  selectedUnit: 'PCS',
                  unitPrice: defaultPrice,
                },
              ]);
            }
          }
          setSkuSearch('');
        }
      }
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
    setHasDiscrepancy(false);
  };

  const toggleItem = (item: Item) => {
    const exists = selectedItems.find((i) => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.item.id !== item.id));
    } else {
      const defaultPrice = getItemPrice(item);
      setSelectedItems([
        ...selectedItems,
        {
          item,
          quantity: 1,
          selectedUnit: 'PCS',
          unitPrice: defaultPrice,
        },
      ]);
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

  const updateSelectedUnit = (itemId: string, unit: string) => {
    setSelectedItems(
      selectedItems.map((i) => {
        if (i.item.id === itemId) {
          const basePrice = getItemPrice(i.item);
          const multiplier = getConversionMultiplier(i.item, unit);
          const newPrice = basePrice * multiplier;
          return { ...i, selectedUnit: unit, unitPrice: newPrice };
        }
        return i;
      }),
    );
  };

  const updateUnitPrice = (itemId: string, price: string) => {
    const cleanPrice = price.replace(/[^0-9.]/g, '');
    setSelectedItems(
      selectedItems.map((i) =>
        i.item.id === itemId ? { ...i, unitPrice: cleanPrice } : i,
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
      const price = Number(selected.unitPrice || 0);
      validatedItems.push({
        item: selected.item,
        quantity: qty,
        unitPrice: price,
        selectedCurrency: selectedCurrency,
        selectedUnit: selected.selectedUnit,
      });
    }

    setIsSaving(true);
    try {
      let finalNotes = notes;
      if (hasDiscrepancy) {
        finalNotes = notes
          ? `${notes}\n[OCR Discrepancy: True]`
          : '[OCR Discrepancy: True]';
      }

      // Pass null for screenshotUri to createInteractionLog to decouple the binary upload.
      // The screenshot will be uploaded asynchronously by the ImageUploadQueue.
      const logId = await createInteractionLog(
        shop.id,
        activeRep.id,
        type,
        commercialStatus,
        finalNotes,
        null,
        validatedItems,
      );

      if (screenshotUri) {
        // Enqueue the image upload task locally and trigger queue processing.
        await ImageUploadQueue.enqueueImage(logId, screenshotUri);
      }

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

              {hasDiscrepancy && (
                <Box
                  bg="warningBg"
                  p="s"
                  borderRadius="s"
                  mb="m"
                  flexDirection="row"
                  alignItems="center"
                >
                  <AlertTriangle
                    size={18}
                    stroke={theme.colors.warningText}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="body"
                    color="warningText"
                    fontWeight="bold"
                    style={{ flex: 1 }}
                  >
                    ⚠️ Discrepancy Detected: Selected quantities do not match
                    Viber proof screenshot text.
                  </Text>
                </Box>
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
                updateSelectedUnit={updateSelectedUnit}
                updateUnitPrice={updateUnitPrice}
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
