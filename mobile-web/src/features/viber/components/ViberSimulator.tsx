import { useState, useEffect } from 'react';
import {
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Theme,
  Button,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import {
  MapPin,
  Search,
  Sparkles,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react-native';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, desc } from 'drizzle-orm';
import {
  fetchItemsAndStockLevel,
  createInteractionLog,
  mapShop,
  getConversionMultiplier,
} from '../../../core/data/repositories';
import { SelectedItemsList } from '../../audit/components/SelectedItemsList';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  CURRENCIES,
  VIBER_BRAND_TOKENS,
  VIBER_SPEC_TOKENS,
  VIBER_SCORING_WEIGHTS,
  VIBER_KNOWN_UNITS,
  OVERRIDE_MARGIN_LIMIT_FACTOR,
  AI_PARSE_NOTE_URL,
} from '../../../config/appConfig';
import axios from 'axios';
import { syncData } from '../../sync/sync';

export function ViberSimulator() {
  const theme = useTheme<Theme>();
  const { activeRep } = useAuth();
  const { t } = useTranslation();

  const [shops, setShops] = useState<$Any[]>([]);
  const [items, setItems] = useState<$Any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<$Any[]>([]);
  const [draftStagingItems, setDraftStagingItems] = useState<$Any[]>([]);
  const [isParsingNote, setIsParsingNote] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('MMK');
  const [priceBookItems, setPriceBookItems] = useState<$Any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<$Any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isOverrideMarginAcknowledged, setIsOverrideMarginAcknowledged] =
    useState(false);
  const [lastInteractionLog, setLastInteractionLog] = useState<$Any>(null);
  const [projects, setProjects] = useState<$Any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Shop selection dropdown states
  const [shopSearch, setShopSearch] = useState('');
  const [showShopList, setShowShopList] = useState(false);

  // Focus ring states
  const [textAreaFocused, setTextAreaFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /** Web-only CSS transition mixin */
  const webTransition =
    Platform.OS === 'web'
      ? ({
          transitionProperty: 'transform, opacity',
          transitionDuration: '200ms',
          transitionTimingFunction: 'ease-in-out',
        } as $Any)
      : {};

  const loadData = async () => {
    try {
      const fetchedShops = await database.select().from(sqliteSchema.shops);
      setShops(fetchedShops.map(mapShop));

      const { items: fetchedItems } = await fetchItemsAndStockLevel();
      setItems(fetchedItems);

      const rates = await database.select().from(sqliteSchema.exchange_rates);
      setExchangeRates(rates);

      const projs = await database.select().from(sqliteSchema.projects);
      setProjects(projs);
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
          .map((ii: $Any) => {
            const itemDetail = allItems.find((i: $Any) => i.id === ii.item_id);
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
          .filter(Boolean) as $Any[];
        setSelectedItems(mapped);
      }
    } catch (e) {
      console.error('Failed to duplicate last order in ViberSimulator:', e);
      Alert.alert(t('error'), t('failedToDuplicateLastOrder'));
    }
  };

  useEffect(() => {
    loadPriceBook();
    loadLastInteractionLog();
  }, [selectedShopId, shops]);

  const getItemPrice = (item: $Any) => {
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
    const matchedConfig = CURRENCIES.find((c) => c.value === selectedCurrency);
    if (matchedConfig && matchedConfig.defaultRateToMmk > 0) {
      return priceInMmk / matchedConfig.defaultRateToMmk;
    }

    return priceInMmk;
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      Alert.alert(t('info'), t('enterRawOrderTextInfo'));
      return;
    }

    const lines = rawText.split('\n');
    const parsedItems: $Any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();

      // Parentheses Allocation Logic: check for e.g. (1,756)
      const parenRegex = /\(\s*([\d,]+)\s*\)/;
      const parenMatch = lower.match(parenRegex);

      let qty = 1;
      let unit = 'PCS';
      let pendingAllocationCount = 0;
      let itemSearchText = lower;

      if (parenMatch) {
        const cleanVal = parenMatch[1].replace(/,/g, '');
        const parsedNum = parseInt(cleanVal, 10);
        if (!isNaN(parsedNum)) {
          pendingAllocationCount = parsedNum;
          qty = 0; // Commit directly to pending_allocation_count
        }
        itemSearchText = lower.replace(parenRegex, '');

        // Extract unit from the remaining text
        for (const u of VIBER_KNOWN_UNITS) {
          if (itemSearchText.includes(u)) {
            if (u.startsWith('pc')) unit = 'PCS';
            else if (u.startsWith('pk')) unit = 'PK';
            else if (u.startsWith('bag')) unit = 'BAGS';
            else if (u.startsWith('pal')) unit = 'PAL';
            itemSearchText = itemSearchText.replace(
              new RegExp(`\\b${u}\\b`, 'g'),
              '',
            );
            break;
          }
        }
      } else {
        // Standard parsing logic
        const numRegex = /(\d+(?:\/\d+)?)\s*([a-zA-Z.]+)?/g;
        let match;
        const candidates: { num: number; unitStr: string; index: number }[] =
          [];

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

        let qtyCandidate = candidates.find((c) =>
          VIBER_KNOWN_UNITS.includes(c.unitStr),
        );
        if (!qtyCandidate && candidates.length > 0) {
          qtyCandidate = candidates[0];
        }

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

        if (qtyCandidate) {
          itemSearchText = lower.replace(
            new RegExp(`\\b${qtyCandidate.num}\\b`, 'g'),
            '',
          );
        }
      }

      // Score items
      let bestItem: $Any = null;
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
            if (VIBER_BRAND_TOKENS.includes(token)) {
              score += VIBER_SCORING_WEIGHTS.BRAND;
            } else if (VIBER_SPEC_TOKENS.includes(token)) {
              score += VIBER_SCORING_WEIGHTS.SPEC;
            } else {
              score += VIBER_SCORING_WEIGHTS.GENERIC;
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
          pendingAllocationCount,
        });
      }
    }

    if (parsedItems.length === 0) {
      setIsParsingNote(true);
      try {
        console.log(
          `[ViberSimulator] Token parser failed. Falling back to local AI note parser at ${AI_PARSE_NOTE_URL}`,
        );
        const response = await axios.post(AI_PARSE_NOTE_URL, {
          note: rawText,
        });

        if (
          response.data &&
          response.data.items &&
          response.data.items.length > 0
        ) {
          const aiParsedItems: $Any[] = [];
          for (const rawItem of response.data.items) {
            const matchedItem = items.find(
              (i) => i.sku.toLowerCase() === rawItem.sku.toLowerCase(),
            );
            if (matchedItem) {
              const basePrice = getItemPrice(matchedItem);
              const multiplier = getConversionMultiplier(matchedItem, 'PCS');
              const unitPrice = basePrice * multiplier;
              aiParsedItems.push({
                item: matchedItem,
                quantity: rawItem.quantity,
                selectedUnit: 'PCS',
                unitPrice,
                stockCondition: 'GOOD',
                pendingAllocationCount: 0,
              });
            }
          }

          if (aiParsedItems.length > 0) {
            setDraftStagingItems(aiParsedItems);
            return;
          }
        }
        Alert.alert(t('info'), t('couldNotIdentifyItems'));
      } catch (err) {
        console.error('[ViberSimulator] AI parse fallback failed:', err);
        Alert.alert(t('info'), t('couldNotIdentifyItems'));
      } finally {
        setIsParsingNote(false);
      }
    } else {
      setDraftStagingItems(parsedItems);
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
    // Keep negative/positive signs at the start, and digits/dots
    let cleanPrice = price.replace(/[^0-9.-]/g, '');

    // Ensure at most one minus sign at the start
    if (cleanPrice.startsWith('-')) {
      cleanPrice = '-' + cleanPrice.slice(1).replace(/-/g, '');
    } else {
      cleanPrice = cleanPrice.replace(/-/g, '');
    }

    // Ensure at most one decimal point
    const parts = cleanPrice.split('.');
    if (parts.length > 2) {
      cleanPrice = parts[0] + '.' + parts.slice(1).join('');
    }

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
      Alert.alert(t('error'), t('selectShopFirstError'));
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert(t('error'), t('noItemsInBasketError'));
      return;
    }

    const hasBelowFloor = selectedItems.some(
      (si) =>
        Number(si.unitPrice || 0) <
        getItemPrice(si.item) * OVERRIDE_MARGIN_LIMIT_FACTOR,
    );
    if (hasBelowFloor && !isOverrideMarginAcknowledged) {
      Alert.alert(t('validationError'), t('checkOverrideMarginError'));
      return;
    }

    // Validate quantities
    const validatedItems = [];
    for (const selected of selectedItems) {
      const qty = parseInt(selected.quantity.toString() || '0', 10);
      const pendingAlloc = parseInt(
        selected.pendingAllocationCount?.toString() || '0',
        10,
      );
      if (isNaN(qty) || (qty < 1 && pendingAlloc < 1)) {
        Alert.alert(
          t('error'),
          t('enterValidQtyForSku').replace('{sku}', selected.item.sku),
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
        pendingAllocationCount: pendingAlloc,
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
        selectedProjectId,
      );

      Alert.alert(t('success'), t('orderDraftedSuccess'));
      setRawText('');
      setSelectedItems([]);
      setIsOverrideMarginAcknowledged(false);
      syncData().catch((err) => {
        console.error('[ViberSimulator] Background sync failed:', err);
      });
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('failedToSaveOrder'));
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
    const pendingAlloc = parseInt(
      si.pendingAllocationCount?.toString() || '0',
      10,
    );
    const effectiveQty = qty > 0 ? qty : pendingAlloc;
    return (
      sum + (isNaN(effectiveQty) ? 0 : effectiveQty) * Number(si.unitPrice || 0)
    );
  }, 0);

  const formattedBasketTotal =
    selectedCurrency === 'MMK'
      ? `K${Math.round(totalBasketValue).toLocaleString()}`
      : `${totalBasketValue.toFixed(2)} ${selectedCurrency}`;

  const renderShopPicker = () => (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="s">
        {t('selectShopForDraftOrder')}
      </Text>

      <Pressable
        onPress={() => setShowShopList(!showShopList)}
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.99 : 1 }],
            ...webTransition,
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
                ...(Platform.OS === 'web'
                  ? ({ outlineStyle: 'none' } as $Any)
                  : {}),
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
                    setSelectedShopId(s.id);
                    setShowShopList(false);
                    setShopSearch('');
                  }}
                  style={({ pressed, hovered }: $Any) => [
                    {
                      backgroundColor:
                        selectedShopId === s.id
                          ? theme.colors.secondaryButton
                          : hovered
                            ? theme.colors.secondaryBackground
                            : 'transparent',
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                      ...webTransition,
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

  const renderRawTextInput = () => (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="xs">
        {t('pasteRawOrderMessage')}
      </Text>
      <Text variant="caption" color="secondaryText" mb="s">
        {t('oneItemPerLineSub')}
      </Text>
      <ThemedTextInput
        multiline
        numberOfLines={4}
        value={rawText}
        onChangeText={setRawText}
        placeholder={t('viberPlaceholder')}
        placeholderTextColor={theme.colors.secondaryText}
        onFocus={() => setTextAreaFocused(true)}
        onBlur={() => setTextAreaFocused(false)}
        borderWidth={textAreaFocused ? 2 : 1}
        borderColor={textAreaFocused ? 'success' : 'borderColor'}
        bg="cardBackground"
        p="m"
        borderRadius="m"
        style={{
          color: theme.colors.primaryText,
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          textAlignVertical: 'top',
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as $Any) : {}),
        }}
      />

      <Box mt="s">
        <Button
          title={'🪄 ' + t('autoDraftOrder')}
          variant="primary"
          onPress={handleParse}
          isLoading={isParsingNote}
          icon={
            !isParsingNote ? (
              <Box mr="xs">
                <Sparkles size={16} stroke={theme.colors.primaryButtonText} />
              </Box>
            ) : undefined
          }
        />
      </Box>
    </Card>
  );

  const renderCurrencyPicker = () => (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="s">
        {t('orderCurrency')}
      </Text>
      <Box flexDirection="row">
        {CURRENCIES.map((c) => {
          const curr = c.value;
          const isSelected = selectedCurrency === curr;
          return (
            <Box key={curr} mr="s" style={{ flex: 1 }}>
              <Pressable
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
                        if (rateToMmk) priceInMmk = basePrice * rateToMmk.rate;
                      }

                      let finalPrice = priceInMmk;
                      if (curr !== 'MMK') {
                        const rateFromMmk = exchangeRates.find(
                          (r) =>
                            r.from_currency === curr && r.to_currency === 'MMK',
                        );
                        if (rateFromMmk && rateFromMmk.rate > 0) {
                          finalPrice = priceInMmk / rateFromMmk.rate;
                        } else {
                          const matchedConfig = CURRENCIES.find(
                            (cc) => cc.value === curr,
                          );
                          if (
                            matchedConfig &&
                            matchedConfig.defaultRateToMmk > 0
                          ) {
                            finalPrice =
                              priceInMmk / matchedConfig.defaultRateToMmk;
                          }
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
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  ...webTransition,
                })}
              >
                <Box
                  py="s"
                  px="m"
                  borderRadius="m"
                  borderWidth={1}
                  borderColor={isSelected ? 'primaryButton' : 'borderColor'}
                  bg={isSelected ? 'primaryButton' : 'cardBackground'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    variant="body"
                    fontWeight="bold"
                    color={isSelected ? 'primaryButtonText' : 'primaryText'}
                  >
                    {curr}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          );
        })}
      </Box>
    </Card>
  );

  const renderStagingReview = () => {
    if (draftStagingItems.length === 0) return null;
    return (
      <Card p="m" mb="m" borderColor="brand" borderWidth={1}>
        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          justifyContent="space-between"
        >
          <Box flexDirection="row" alignItems="center">
            <Box mr="xs">
              <Sparkles size={18} stroke={theme.colors.brand} />
            </Box>
            <Text variant="body" fontWeight="bold" color="brand">
              {t('stagingReviewArea')}
            </Text>
          </Box>
          <TouchableOpacity onPress={() => setDraftStagingItems([])}>
            <Text variant="bodySecondary" color="dangerText">
              {t('clearStaged')}
            </Text>
          </TouchableOpacity>
        </Box>

        <Text variant="caption" color="secondaryText" mb="m">
          {t('stagingReviewDesc')}
        </Text>

        {draftStagingItems.map((si, index) => {
          return (
            <Box
              key={`${si.item.id}-${index}`}
              mb="m"
              pb="m"
              borderBottomWidth={index < draftStagingItems.length - 1 ? 1 : 0}
              borderBottomColor="borderColor"
            >
              <Text variant="body" fontWeight="bold" mb="s">
                {si.item.name} ({si.item.sku})
              </Text>

              <Box
                flexDirection="row"
                gap="s"
                mb="s"
                flexWrap="wrap"
                alignItems="center"
              >
                {/* Quantity Edit */}
                <Box style={{ flex: 1, minWidth: 80 }}>
                  <Text variant="caption" color="secondaryText" mb="xs">
                    {t('qty')}
                  </Text>
                  <ThemedTextInput
                    value={si.quantity.toString()}
                    onChangeText={(val) => {
                      const qtyStr = val.replace(/[^0-9]/g, '');
                      setDraftStagingItems((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, quantity: qtyStr } : item,
                        ),
                      );
                    }}
                    keyboardType="number-pad"
                    p="s"
                    borderRadius="s"
                    borderWidth={1}
                    borderColor="borderColor"
                    bg="mainBackground"
                    style={{
                      fontSize: 13,
                      color: theme.colors.primaryText,
                      textAlign: 'center',
                    }}
                  />
                </Box>

                {/* Unit Segmented Selector */}
                <Box>
                  <Text variant="caption" mb="xs" color="secondaryText">
                    {t('unit')}
                  </Text>
                  <Box flexDirection="row">
                    {['PCS', 'PK', 'BAGS', 'PAL'].map((unit) => {
                      const isSelected = si.selectedUnit === unit;
                      return (
                        <Pressable
                          key={unit}
                          onPress={() => {
                            setDraftStagingItems((prev) =>
                              prev.map((item, idx) => {
                                if (idx === index) {
                                  const basePrice = getItemPrice(item.item);
                                  const multiplier = getConversionMultiplier(
                                    item.item,
                                    unit,
                                  );
                                  const newPrice = basePrice * multiplier;
                                  return {
                                    ...item,
                                    selectedUnit: unit,
                                    unitPrice: newPrice,
                                  };
                                }
                                return item;
                              }),
                            );
                          }}
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

                {/* Unit Price Edit */}
                <Box style={{ flex: 1.2, minWidth: 120 }}>
                  <Text variant="caption" color="secondaryText" mb="xs">
                    {t('unitPriceLabel')} ({selectedCurrency})
                  </Text>
                  <ThemedTextInput
                    value={si.unitPrice.toString()}
                    onChangeText={(val) => {
                      let cleanPrice = val.replace(/[^0-9.-]/g, '');
                      if (cleanPrice.startsWith('-')) {
                        cleanPrice =
                          '-' + cleanPrice.slice(1).replace(/-/g, '');
                      } else {
                        cleanPrice = cleanPrice.replace(/-/g, '');
                      }
                      const parts = cleanPrice.split('.');
                      if (parts.length > 2) {
                        cleanPrice = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setDraftStagingItems((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, unitPrice: cleanPrice }
                            : item,
                        ),
                      );
                    }}
                    keyboardType="numeric"
                    p="s"
                    borderRadius="s"
                    borderWidth={1}
                    borderColor="borderColor"
                    bg="mainBackground"
                    style={{ fontSize: 13, color: theme.colors.primaryText }}
                  />
                </Box>
              </Box>
            </Box>
          );
        })}

        <Box mt="s">
          <Button
            title={t('commitToOrderBasket')}
            variant="primary"
            onPress={() => {
              setSelectedItems((prev) => {
                const updated = [...prev];
                for (const staged of draftStagingItems) {
                  const existingIdx = updated.findIndex(
                    (item) =>
                      item.item.id === staged.item.id &&
                      item.selectedUnit === staged.selectedUnit,
                  );
                  if (existingIdx > -1) {
                    const prevQty = parseInt(
                      updated[existingIdx].quantity.toString() || '0',
                      10,
                    );
                    const stagedQty = parseInt(
                      staged.quantity.toString() || '0',
                      10,
                    );
                    updated[existingIdx] = {
                      ...updated[existingIdx],
                      quantity: prevQty + stagedQty,
                    };
                  } else {
                    updated.push(staged);
                  }
                }
                return updated;
              });
              setDraftStagingItems([]);
              Alert.alert(t('success'), t('stagedItemsAdded'));
            }}
          />
        </Box>
      </Card>
    );
  };

  const renderOrderBasket = () => {
    if (selectedItems.length > 0) {
      return (
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Box flexDirection="row" alignItems="center" mb="s">
            <Box mr="xs">
              <ShoppingCart size={18} stroke={theme.colors.primaryButton} />
            </Box>
            <Text variant="body" fontWeight="bold">
              {t('orderBasket')}
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
            setIsOverrideMarginAcknowledged={setIsOverrideMarginAcknowledged}
            lastInteractionLog={lastInteractionLog}
            onDuplicateLastOrder={handleDuplicateLastOrder}
            projects={projects}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
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
              {t('totalOrderValue')}
            </Text>
            <Text variant="header" fontSize={18} color="primaryButton">
              {formattedBasketTotal}
            </Text>
          </Box>
        </Card>
      );
    } else {
      return (
        <Card
          p="m"
          mb="m"
          alignItems="center"
          borderColor="borderColor"
          borderWidth={1}
        >
          <Box mb="s">
            <AlertCircle size={24} stroke={theme.colors.secondaryText} />
          </Box>
          <Text variant="bodySecondary">{t('draftOrderBasketEmpty')}</Text>
        </Card>
      );
    }
  };

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isDesktop ? (
          <Box flexDirection="row" flex={1} gap="m">
            {/* Left Column */}
            <Box flex={1}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Box mb="m">
                  <Text variant="header" fontSize={24}>
                    📥 {t('backOfficeOrderDrafter')}
                  </Text>
                  <Text variant="bodySecondary">
                    {t('pasteRawViberMessageSub')}
                  </Text>
                </Box>
                {renderShopPicker()}
                {renderRawTextInput()}
                {renderCurrencyPicker()}
                <Box height={40} />
              </ScrollView>
            </Box>

            {/* Right Column */}
            <Box flex={1.2}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                {renderStagingReview()}
                {renderOrderBasket()}
                <Box height={40} />
              </ScrollView>
            </Box>
          </Box>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Box mb="m">
              <Text variant="header" fontSize={24}>
                📥 {t('backOfficeOrderDrafter')}
              </Text>
              <Text variant="bodySecondary">
                {t('pasteRawViberMessageSub')}
              </Text>
            </Box>

            {renderShopPicker()}
            {renderRawTextInput()}
            {renderCurrencyPicker()}
            {renderStagingReview()}
            {renderOrderBasket()}
            <Box height={40} />
          </ScrollView>
        )}

        <Box
          p="m"
          borderTopWidth={1}
          borderColor="borderColor"
          bg="cardBackground"
        >
          <Button
            title={t('saveOrderLog')}
            onPress={handleSaveOrder}
            isLoading={isSaving}
            disabled={!selectedShopId || selectedItems.length === 0}
          />
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}

export default ViberSimulator;
