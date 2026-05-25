import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { Box, Text, Card, Theme, Button } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import {
  MapPin,
  Search,
  Sparkles,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react-native';
import { database } from '../../database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, desc } from 'drizzle-orm';
import {
  fetchItemsAndStockLevel,
  createInteractionLog,
  mapShop,
  getConversionMultiplier,
} from '../../data/repositories';
import { SelectedItemsList } from './SelectedItemsList';
import { useAuth } from '../../utils/auth';

export function ViberSimulator() {
  const theme = useTheme<Theme>();
  const { activeRep } = useAuth();

  const [shops, setShops] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('MMK');
  const [priceBookItems, setPriceBookItems] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isOverrideMarginAcknowledged, setIsOverrideMarginAcknowledged] =
    useState(false);
  const [lastInteractionLog, setLastInteractionLog] = useState<any>(null);

  // Shop selection dropdown states
  const [shopSearch, setShopSearch] = useState('');
  const [showShopList, setShowShopList] = useState(false);

  const loadData = async () => {
    try {
      const fetchedShops = await database.select().from(sqliteSchema.shops);
      setShops(fetchedShops.map(mapShop));

      const { items: fetchedItems } = await fetchItemsAndStockLevel();
      setItems(fetchedItems);

      const rates = await database.select().from(sqliteSchema.exchange_rates);
      setExchangeRates(rates);
    } catch (e) {
      console.error('Failed to load data for order drafter:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  const loadPriceBook = async () => {
    if (!selectedShop || !selectedShop.priceBookId) {
      setPriceBookItems([]);
      return;
    }
    try {
      const pbItems = await database
        .select()
        .from(sqliteSchema.price_book_items)
        .where(
          eq(
            sqliteSchema.price_book_items.price_book_id,
            selectedShop.priceBookId,
          ),
        );
      setPriceBookItems(pbItems);
    } catch (e) {
      console.error('Failed to load price book items:', e);
      setPriceBookItems([]);
    }
  };

  const loadLastInteractionLog = async () => {
    if (!selectedShopId) {
      setLastInteractionLog(null);
      return;
    }
    try {
      const logs = await database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(eq(sqliteSchema.interaction_logs.shop_id, selectedShopId))
        .orderBy(desc(sqliteSchema.interaction_logs.created_at));
      if (logs.length > 0) {
        setLastInteractionLog(logs[0]);
      } else {
        setLastInteractionLog(null);
      }
    } catch (e) {
      console.error(
        'Failed to load last interaction log in ViberSimulator:',
        e,
      );
      setLastInteractionLog(null);
    }
  };

  const handleDuplicateLastOrder = async () => {
    if (!lastInteractionLog) return;
    try {
      const itemsList = await database
        .select()
        .from(sqliteSchema.interaction_items)
        .where(
          eq(
            sqliteSchema.interaction_items.interaction_log_id,
            lastInteractionLog.id,
          ),
        );

      if (itemsList.length > 0) {
        const { items: allItems } = await fetchItemsAndStockLevel();
        const mapped = itemsList
          .map((ii: any) => {
            const itemDetail = allItems.find((i: any) => i.id === ii.item_id);
            if (!itemDetail) return null;
            const unitPriceVal =
              ii.unit_price !== undefined && ii.unit_price !== null
                ? ii.unit_price
                : ii.unit_price_at_sale !== undefined &&
                    ii.unit_price_at_sale !== null
                  ? ii.unit_price_at_sale
                  : itemDetail.unitPrice || 0;
            return {
              item: itemDetail,
              quantity: ii.quantity,
              selectedUnit: ii.selected_unit || 'PCS',
              unitPrice: unitPriceVal,
              stockCondition: ii.stock_condition || 'GOOD',
            };
          })
          .filter(Boolean) as any[];
        setSelectedItems(mapped);
      }
    } catch (e) {
      console.error('Failed to duplicate last order in ViberSimulator:', e);
      Alert.alert('Error', 'Failed to duplicate last order.');
    }
  };

  useEffect(() => {
    loadPriceBook();
    loadLastInteractionLog();
  }, [selectedShopId, shops]);

  const getItemPrice = (item: any) => {
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

  const handleParse = () => {
    if (!rawText.trim()) {
      Alert.alert('Info', 'Please enter or paste raw order text to parse.');
      return;
    }

    const lines = rawText.split('\n');
    const parsedItems: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();

      // Extract quantity and unit
      // Match patterns with a quantity: e.g. "Shera 6mm 50 pcs"
      // Skip dimensions: e.g. "6mm", "8mm", "9mm", "1/2"
      const numRegex = /(\d+(?:\/\d+)?)\s*([a-zA-Z.]+)?/g;
      let match;
      const candidates: { num: number; unitStr: string; index: number }[] = [];

      while ((match = numRegex.exec(lower)) !== null) {
        const numStr = match[1];
        const unitStr = (match[2] || '').replace(/[.\s]/g, '');

        if (
          numStr.includes('/') ||
          unitStr === 'mm' ||
          unitStr === 'inch' ||
          unitStr === 'in' ||
          unitStr === 'kg'
        ) {
          continue;
        }

        const parsedNum = parseInt(numStr, 10);
        if (!isNaN(parsedNum)) {
          candidates.push({ num: parsedNum, unitStr, index: match.index });
        }
      }

      const knownUnits = [
        'pcs',
        'pc',
        'pk',
        'bags',
        'bag',
        'pal',
        'units',
        'unit',
      ];
      let qtyCandidate = candidates.find((c) => knownUnits.includes(c.unitStr));
      if (!qtyCandidate && candidates.length > 0) {
        qtyCandidate = candidates[0];
      }

      let qty = 1;
      let unit = 'PCS';
      if (qtyCandidate) {
        qty = qtyCandidate.num;
        if (qtyCandidate.unitStr) {
          const u = qtyCandidate.unitStr;
          if (u.startsWith('pc')) unit = 'PCS';
          else if (u.startsWith('pk')) unit = 'PK';
          else if (u.startsWith('bag')) unit = 'BAGS';
          else if (u.startsWith('pal')) unit = 'PAL';
        }
      }

      // Filter line search text to exclude quantity to match items accurately
      let itemSearchText = lower;
      if (qtyCandidate) {
        itemSearchText = lower.replace(
          new RegExp(`\\b${qtyCandidate.num}\\b`, 'g'),
          '',
        );
      }

      // Score items
      let bestItem: any = null;
      let maxScore = 0;

      for (const item of items) {
        const nameTokens = item.name.toLowerCase().split(/[\s-,]+/);
        const skuTokens = item.sku.toLowerCase().split(/[\s-,]+/);
        const allTokens = Array.from(
          new Set([...nameTokens, ...skuTokens]),
        ).filter((t) => t.length > 1);

        let score = 0;
        for (const token of allTokens) {
          if (itemSearchText.includes(token)) {
            if (
              token === 'shera' ||
              token === 'gator' ||
              token === 'karat' ||
              token === 'vrh' ||
              token === 'scg' ||
              token === 'knauf'
            ) {
              score += 10;
            } else if (
              token === '6mm' ||
              token === '8mm' ||
              token === '9mm' ||
              token === '1/2' ||
              token === 'cement' ||
              token === 'gypsum' ||
              token === 'pvc'
            ) {
              score += 5;
            } else {
              score += 1;
            }
          }
        }

        if (score > maxScore) {
          maxScore = score;
          bestItem = item;
        }
      }

      if (maxScore >= 2 && bestItem) {
        const basePrice = getItemPrice(bestItem);
        const multiplier = getConversionMultiplier(bestItem, unit);
        const unitPrice = basePrice * multiplier;

        parsedItems.push({
          item: bestItem,
          quantity: qty,
          selectedUnit: unit,
          unitPrice,
          stockCondition: 'GOOD',
        });
      }
    }

    if (parsedItems.length === 0) {
      Alert.alert(
        'Parsing Result',
        'Could not identify any matching items. Please check keywords.',
      );
    } else {
      setSelectedItems(parsedItems);
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

  const updateStockCondition = (itemId: string, condition: string) => {
    setSelectedItems(
      selectedItems.map((i) =>
        i.item.id === itemId ? { ...i, stockCondition: condition } : i,
      ),
    );
  };

  const handleSaveOrder = async () => {
    if (!selectedShopId) {
      Alert.alert('Error', 'Please select a shop first.');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert(
        'Error',
        'No items in the order basket. Please parse some text first.',
      );
      return;
    }

    const hasBelowFloor = selectedItems.some(
      (si) => Number(si.unitPrice || 0) < getItemPrice(si.item) * 0.85,
    );
    if (hasBelowFloor && !isOverrideMarginAcknowledged) {
      Alert.alert(
        'Validation Error',
        'Please check the Acknowledge Override Margin safety box before submitting.',
      );
      return;
    }

    // Validate quantities
    const validatedItems = [];
    for (const selected of selectedItems) {
      const qty = parseInt(selected.quantity.toString() || '0', 10);
      if (isNaN(qty) || qty < 1) {
        Alert.alert(
          'Error',
          `Please enter a valid quantity for SKU ${selected.item.sku}.`,
        );
        return;
      }
      validatedItems.push({
        item: selected.item,
        quantity: qty,
        unitPrice: Number(selected.unitPrice || 0),
        selectedCurrency,
        selectedUnit: selected.selectedUnit,
        stockCondition: selected.stockCondition || 'GOOD',
      });
    }

    setIsSaving(true);
    try {
      await createInteractionLog(
        selectedShopId,
        activeRep.id,
        'VIBER', // Save as VIBER chat log category
        'ORDER_PLACED',
        `Back-Office Intake Canvas raw text:\n${rawText}`,
        null,
        validatedItems,
      );

      Alert.alert(
        'Success',
        'Order successfully drafted and logged into database.',
      );
      setRawText('');
      setSelectedItems([]);
      setIsOverrideMarginAcknowledged(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save drafted order.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredShops = shopSearch
    ? shops.filter((s) =>
        s.name.toLowerCase().includes(shopSearch.toLowerCase()),
      )
    : shops;

  const totalBasketValue = selectedItems.reduce((sum, si) => {
    const qty = parseInt(si.quantity.toString() || '0', 10);
    return sum + (isNaN(qty) ? 0 : qty) * Number(si.unitPrice || 0);
  }, 0);

  const formattedBasketTotal =
    selectedCurrency === 'MMK'
      ? `K${Math.round(totalBasketValue).toLocaleString()}`
      : `${totalBasketValue.toFixed(2)} ${selectedCurrency}`;

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <Box mb="m">
            <Text variant="header" fontSize={24}>
              📥 Back-Office Order Drafter
            </Text>
            <Text variant="bodySecondary">
              Paste raw customer Viber order texts here to auto-draft
              transactions.
            </Text>
          </Box>

          {/* Shop Picker Component */}
          <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
            <Text variant="body" fontWeight="bold" mb="s">
              Select Shop for Draft Order
            </Text>

            <TouchableOpacity
              onPress={() => setShowShopList(!showShopList)}
              activeOpacity={0.7}
              style={[
                styles.dropdownTrigger,
                {
                  borderColor: theme.colors.borderColor,
                  backgroundColor: theme.colors.cardBackground,
                },
              ]}
            >
              <Box flexDirection="row" alignItems="center" flex={1}>
                <MapPin
                  size={18}
                  stroke={theme.colors.primaryButton}
                  style={{ marginRight: 8 }}
                />
                <Text
                  variant="body"
                  fontWeight={selectedShop ? 'bold' : 'normal'}
                  style={{
                    color: selectedShop
                      ? theme.colors.primaryText
                      : theme.colors.secondaryText,
                  }}
                >
                  {selectedShop
                    ? selectedShop.name
                    : 'Select a retail account...'}
                </Text>
              </Box>
              <Text style={{ color: theme.colors.secondaryText }}>▼</Text>
            </TouchableOpacity>

            {showShopList && (
              <Box mt="s" style={styles.dropdownContainer}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  borderWidth={1}
                  borderColor="borderColor"
                  borderRadius="m"
                  px="s"
                  mb="s"
                  bg="mainBackground"
                >
                  <Search
                    size={16}
                    stroke={theme.colors.secondaryText}
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    placeholder="Search shops..."
                    placeholderTextColor={theme.colors.secondaryText}
                    value={shopSearch}
                    onChangeText={setShopSearch}
                    style={[
                      styles.searchInput,
                      {
                        color: theme.colors.primaryText,
                      },
                    ]}
                  />
                </Box>

                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {filteredShops.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => {
                        setSelectedShopId(s.id);
                        setShowShopList(false);
                        setShopSearch('');
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          borderBottomColor: theme.colors.borderColor,
                          backgroundColor:
                            selectedShopId === s.id
                              ? theme.colors.secondaryButton
                              : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        variant="body"
                        fontWeight={selectedShopId === s.id ? 'bold' : 'normal'}
                      >
                        {s.name}
                      </Text>
                      <Text variant="bodySecondary" fontSize={11}>
                        {s.address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {filteredShops.length === 0 && (
                    <Box p="m" alignItems="center">
                      <Text variant="bodySecondary">
                        No shops match search.
                      </Text>
                    </Box>
                  )}
                </ScrollView>
              </Box>
            )}
          </Card>

          {/* Raw Text Input Card */}
          <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
            <Text variant="body" fontWeight="bold" mb="s">
              Paste Raw Order Message
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={rawText}
              onChangeText={setRawText}
              placeholder="Example:
Shera 6mm 50 pcs
Gator PVC 10 pk"
              placeholderTextColor={theme.colors.secondaryText}
              style={[
                styles.textAreaInput,
                {
                  borderColor: theme.colors.borderColor,
                  backgroundColor: theme.colors.cardBackground,
                  color: theme.colors.primaryText,
                },
              ]}
            />

            <Box mt="s">
              <Button
                title="🪄 Auto-Draft Order"
                variant="primary"
                onPress={handleParse}
                icon={
                  <Sparkles
                    size={16}
                    stroke="#FFF"
                    style={{ marginRight: 6 }}
                  />
                }
              />
            </Box>
          </Card>

          {/* Pricing Currency Picker */}
          <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
            <Text variant="body" fontWeight="bold" mb="s">
              Order Currency
            </Text>
            <Box flexDirection="row">
              {['MMK', 'USD', 'THB'].map((curr) => {
                const isSelected = selectedCurrency === curr;
                return (
                  <Box key={curr} mr="s" style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCurrency(curr);
                        // Recalculate existing basket items pricing on currency change
                        setSelectedItems((prev) =>
                          prev.map((si) => {
                            const pbItem = priceBookItems.find(
                              (pbi) => pbi.item_id === si.item.id,
                            );
                            let basePrice = si.item.unitPrice;
                            let baseCurrency = 'MMK';
                            if (pbItem) {
                              basePrice = pbItem.price;
                              baseCurrency = pbItem.currency;
                            }

                            // Convert standard price to new selected currency
                            let priceInMmk = basePrice;
                            if (baseCurrency !== 'MMK') {
                              const rateToMmk = exchangeRates.find(
                                (r) =>
                                  r.from_currency === baseCurrency &&
                                  r.to_currency === 'MMK',
                              );
                              if (rateToMmk)
                                priceInMmk = basePrice * rateToMmk.rate;
                            }

                            let finalPrice = priceInMmk;
                            if (curr !== 'MMK') {
                              const rateFromMmk = exchangeRates.find(
                                (r) =>
                                  r.from_currency === curr &&
                                  r.to_currency === 'MMK',
                              );
                              if (rateFromMmk && rateFromMmk.rate > 0) {
                                finalPrice = priceInMmk / rateFromMmk.rate;
                              } else {
                                if (curr === 'USD')
                                  finalPrice = priceInMmk / 2100;
                                if (curr === 'THB')
                                  finalPrice = priceInMmk / 58.5;
                              }
                            }

                            const multiplier = getConversionMultiplier(
                              si.item,
                              si.selectedUnit,
                            );
                            return {
                              ...si,
                              unitPrice: finalPrice * multiplier,
                            };
                          }),
                        );
                      }}
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
          </Card>

          {/* Selected items basket */}
          {selectedItems.length > 0 ? (
            <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
              <Box flexDirection="row" alignItems="center" mb="s">
                <ShoppingCart
                  size={18}
                  stroke={theme.colors.primaryButton}
                  style={{ marginRight: 6 }}
                />
                <Text variant="body" fontWeight="bold">
                  Order Basket
                </Text>
              </Box>

              <SelectedItemsList
                selectedItems={selectedItems}
                updateQuantity={updateQuantity}
                updateSelectedUnit={updateSelectedUnit}
                updateUnitPrice={updateUnitPrice}
                getItemPrice={getItemPrice}
                selectedCurrency={selectedCurrency}
                updateStockCondition={updateStockCondition}
                isOverrideMarginAcknowledged={isOverrideMarginAcknowledged}
                setIsOverrideMarginAcknowledged={
                  setIsOverrideMarginAcknowledged
                }
                lastInteractionLog={lastInteractionLog}
                onDuplicateLastOrder={handleDuplicateLastOrder}
              />

              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                borderTopWidth={1}
                borderTopColor="borderColor"
                pt="m"
                mt="s"
              >
                <Text variant="body" fontWeight="bold">
                  Total Order Value:
                </Text>
                <Text
                  variant="header"
                  fontSize={18}
                  style={{ color: theme.colors.primaryButton }}
                >
                  {formattedBasketTotal}
                </Text>
              </Box>
            </Card>
          ) : (
            <Card
              p="m"
              mb="m"
              alignItems="center"
              borderColor="borderColor"
              borderWidth={1}
            >
              <AlertCircle
                size={24}
                stroke={theme.colors.secondaryText}
                style={{ marginBottom: 8 }}
              />
              <Text variant="bodySecondary">Draft order basket is empty.</Text>
            </Card>
          )}

          <Box height={40} />
        </ScrollView>

        <Box
          p="m"
          borderTopWidth={1}
          borderColor="borderColor"
          bg="cardBackground"
        >
          <Button
            title="Save Order Log"
            onPress={handleSaveOrder}
            isLoading={isSaving}
            disabled={!selectedShopId || selectedItems.length === 0}
          />
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}

const styles = StyleSheet.create({
  dropdownTrigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#FFF',
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    paddingHorizontal: 4,
    outlineWidth: 0,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
});

export default ViberSimulator;
