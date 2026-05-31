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
import {
  Shop,
  Item,
  sqliteSchema,
  semanticSearch,
} from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { eq, desc, and } from 'drizzle-orm';
import {
  fetchItemsAndStockLevel,
  createInteractionLog,
  SelectedItemPayload,
  getConversionMultiplier,
  mapItem,
} from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import { useAuth } from '../../../core/auth/auth';
import { scannerThrottle } from '../../../core/utils/ScannerThrottle';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';
import { ActorService } from '../../../core/auth/ActorService';
import { useCartStore, defaultSession } from '../../../core/store/cartStore';
import { API_BASE_URL } from '../../../config/appConfig';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';
import { checkDiscrepancy } from '../../../core/utils/ocr';
import { getItemPrice as getPriceHelper } from '../../../core/utils/pricing';
import { COMMERCIAL_STATUSES, CURRENCIES } from '../../../config/appConfig';
import { TelemetryLogger } from '../../../core/utils/telemetry';

// Import subcomponents
import { ViberIntegration } from '../../viber/components/ViberIntegration';
import { GemmaCopilot } from '../components/GemmaCopilot';
import { AvailableItemsSelector } from '../../inventory/components/AvailableItemsSelector';
import { SelectedItemsList } from '../components/SelectedItemsList';
import { ImageAnnotationModal } from '../../inventory/components/ImageAnnotationModal';

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
  const shopId = shop?.id || 'default';
  const session = useCartStore(
    (state) => state.sessions[shopId] || defaultSession,
  );
  const updateSession = useCartStore((state) => state.updateSession);
  const clearSession = useCartStore((state) => state.clearSession);

  const type = session.type;
  const setType = (val: string) => updateSession(shopId, { type: val });

  const commercialStatus = session.commercialStatus;
  const setCommercialStatus = (val: string) =>
    updateSession(shopId, { commercialStatus: val });

  const notes = session.notes;
  const setNotes = (val: string) => updateSession(shopId, { notes: val });

  const selectedItems = session.selectedItems;
  const setSelectedItems = (val: $Any) => {
    const newItems =
      typeof val === 'function' ? val(session.selectedItems) : val;
    updateSession(shopId, { selectedItems: newItems });
  };

  const selectedProjectId = session.selectedProjectId;
  const setSelectedProjectId = (val: string | null) =>
    updateSession(shopId, { selectedProjectId: val });

  const screenshotUri = session.screenshotUri;
  const setScreenshotUri = (val: string | null) =>
    updateSession(shopId, { screenshotUri: val });

  const isOverrideMarginAcknowledged = session.isOverrideMarginAcknowledged;
  const setIsOverrideMarginAcknowledged = (val: boolean) =>
    updateSession(shopId, { isOverrideMarginAcknowledged: val });

  const hasDiscrepancy = session.hasDiscrepancy;
  const setHasDiscrepancy = (val: boolean) =>
    updateSession(shopId, { hasDiscrepancy: val });

  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<$Any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrVerifying, setOcrVerifying] = useState(false);
  const [lastInteractionLog, setLastInteractionLog] = useState<$Any>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [traceId, setTraceId] = useState('');

  const generateUUIDv4 = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [pendingAnnotationUri, setPendingAnnotationUri] = useState<
    string | null
  >(null);

  const handleInterceptScreenshot = (uri: string | null) => {
    if (uri) {
      setPendingAnnotationUri(uri);
      setAnnotationModalVisible(true);
    } else {
      setScreenshotUri(null);
    }
  };

  const loadDraftCart = async () => {
    if (!shop || !activeRep) return;
    try {
      if (session.selectedItems.length > 0) {
        if (!traceId) setTraceId(generateUUIDv4());
        setIsDraftLoaded(true);
        return;
      }
      const draftId = `${shop.id}_${activeRep.id}`;
      const drafts = await database
        .select()
        .from(sqliteSchema.draft_carts)
        .where(eq(sqliteSchema.draft_carts.id, draftId));

      if (drafts.length > 0) {
        const draft = drafts[0];
        const items = JSON.parse(draft.items_json);
        updateSession(shop.id, {
          selectedItems: items,
          selectedCurrency: draft.currency,
          selectedProjectId: draft.project_id,
        });
        setTraceId((draft as $Any).trace_id || generateUUIDv4());
        setIsDraftLoaded(true);
      } else {
        resetForm();
        setTraceId(generateUUIDv4());
        setIsDraftLoaded(true);
      }
    } catch (e) {
      console.error('Failed to load draft cart:', e);
      resetForm();
      setTraceId(generateUUIDv4());
      setIsDraftLoaded(true);
    }
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
          if (isMismatched) {
            TelemetryLogger.logEvent(
              'vision_mismatch',
              `Vision model mismatch: Extracted OCR text "${ocrText}" does not align with selected items: ${JSON.stringify(
                selectedItems.map((si) => ({
                  name: si.item.name,
                  sku: si.item.sku,
                  qty: si.quantity,
                  unit: si.selectedUnit,
                })),
              )}`,
            ).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to verify screenshot OCR:', err);
      } finally {
        setOcrVerifying(false);
      }
    };

    verifyUploadedScreenshot();
  }, [screenshotUri, selectedItems]);

  const selectedCurrency = session.selectedCurrency;
  const setSelectedCurrency = (val: string) =>
    updateSession(shopId, { selectedCurrency: val });
  const [exchangeRates, setExchangeRates] = useState<$Any[]>([]);
  const [priceBookItems, setPriceBookItems] = useState<$Any[]>([]);
  const [stocksMap, setStocksMap] = useState<Record<string, number>>({});

  const loadLastInteractionLog = async () => {
    if (!shop) {
      setLastInteractionLog(null);
      return;
    }
    try {
      const logs = await database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(eq(sqliteSchema.interaction_logs.shop_id, shop.id))
        .orderBy(desc(sqliteSchema.interaction_logs.created_at));
      if (logs.length > 0) {
        setLastInteractionLog(logs[0]);
      } else {
        setLastInteractionLog(null);
      }
    } catch (e) {
      console.error('Failed to load last interaction log:', e);
      setLastInteractionLog(null);
    }
  };

  const loadRatesAndBook = async () => {
    try {
      const rates = await database.select().from(sqliteSchema.exchange_rates);
      setExchangeRates(rates);

      const projs = await database.select().from(sqliteSchema.projects);
      setProjects(projs);

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

  const getItemPrice = (item: Item) =>
    getPriceHelper(item, priceBookItems, selectedCurrency, exchangeRates);

  const getDiscountedUnitPrice = (item: Item, qty: number, unit: string) => {
    const basePrice = getItemPrice(item);
    const multiplier = getConversionMultiplier(item, unit);
    let unitPrice = basePrice * multiplier;
    if (item.volumeDiscountBrackets) {
      try {
        const brackets = JSON.parse(item.volumeDiscountBrackets);
        if (Array.isArray(brackets) && brackets.length > 0) {
          const sortedBrackets = [...brackets].sort(
            (a, b) => b.quantity - a.quantity,
          );
          const matchingBracket = sortedBrackets.find((b) => qty >= b.quantity);
          if (matchingBracket && matchingBracket.discount_percent) {
            unitPrice =
              unitPrice * (1 - matchingBracket.discount_percent / 100);
          }
        }
      } catch (err) {
        console.error('Failed to parse volume discount brackets:', err);
      }
    }
    return unitPrice;
  };

  useEffect(() => {
    if (visible) {
      setIsDraftLoaded(false);
      loadDraftCart();
      loadItems();
      loadRatesAndBook();
      loadLastInteractionLog();
    } else {
      resetForm();
      setIsDraftLoaded(false);
    }
  }, [visible, shop]);

  useEffect(() => {
    const saveDraft = async () => {
      if (!shop || !activeRep || !isDraftLoaded) return;
      try {
        const draftId = `${shop.id}_${activeRep.id}`;
        await database
          .delete(sqliteSchema.draft_carts)
          .where(eq(sqliteSchema.draft_carts.id, draftId));

        if (selectedItems.length > 0) {
          await database.insert(sqliteSchema.draft_carts).values({
            id: draftId,
            shop_id: shop.id,
            rep_id: activeRep.id,
            currency: selectedCurrency,
            project_id: selectedProjectId,
            items_json: JSON.stringify(selectedItems),
            trace_id: traceId || null,
            actor_id: ActorService.getActorId(),
            executed_by_id: ActorService.getActorId(),
            salesperson_id: activeRep.id,
            approved_by_id: null,
            updated_at: Math.floor(Date.now() / 1000),
          } as $Any);
        }
      } catch (e) {
        console.error('[Draft Cart] Failed to auto-save draft cart:', e);
      }
    };

    saveDraft();
  }, [
    selectedItems,
    selectedCurrency,
    selectedProjectId,
    isDraftLoaded,
    shop,
    activeRep,
    traceId,
  ]);

  useEffect(() => {
    loadItems();
  }, [skuSearch]);

  const loadItems = async () => {
    try {
      const { items, stocksMap: allStocks } = await fetchItemsAndStockLevel();
      const filtered = skuSearch ? semanticSearch(items, skuSearch) : items;
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
              const defaultPrice = getDiscountedUnitPrice(
                perfectMatch,
                1,
                'PCS',
              );
              setSelectedItems([
                ...selectedItems,
                {
                  item: perfectMatch,
                  quantity: 1,
                  selectedUnit: 'PCS',
                  unitPrice: defaultPrice,
                  stockCondition: 'GOOD',
                  pendingAllocationCount: 0,
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
    setSelectedProjectId(null);
    setLastInteractionLog(null);
    setIsOverrideMarginAcknowledged(false);
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
              pendingAllocationCount: ii.pending_allocation_count ?? 0,
            };
          })
          .filter(Boolean) as $Any[];
        setSelectedItems(mapped);
      }
    } catch (e) {
      console.error('Failed to duplicate last order:', e);
      Alert.alert(t('error'), t('failedToDuplicateLastOrder'));
    }
  };

  const toggleItem = (item: Item) => {
    const exists = selectedItems.find((i) => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.item.id !== item.id));
    } else {
      const defaultPrice = getDiscountedUnitPrice(item, 1, 'PCS');
      setSelectedItems([
        ...selectedItems,
        {
          item,
          quantity: 1,
          selectedUnit: 'PCS',
          unitPrice: defaultPrice,
          stockCondition: 'GOOD',
          pendingAllocationCount: 0,
        },
      ]);
    }
  };

  const updateStockCondition = (itemId: string, condition: string) => {
    setSelectedItems(
      selectedItems.map((i) =>
        i.item.id === itemId ? { ...i, stockCondition: condition } : i,
      ),
    );
  };

  const updateQuantity = (itemId: string, quantity: string) => {
    const qtyStr = quantity.replace(/[^0-9]/g, '');
    const newQty = parseInt(qtyStr, 10) || 0;
    setSelectedItems(
      selectedItems.map((i) => {
        if (i.item.id === itemId) {
          const discountedPrice = getDiscountedUnitPrice(
            i.item,
            newQty,
            i.selectedUnit,
          );
          return { ...i, quantity: qtyStr, unitPrice: discountedPrice };
        }
        return i;
      }),
    );
  };

  const updateSelectedUnit = (itemId: string, unit: string) => {
    setSelectedItems(
      selectedItems.map((i) => {
        if (i.item.id === itemId) {
          const qty = parseInt(i.quantity.toString() || '0', 10) || 0;
          const discountedPrice = getDiscountedUnitPrice(i.item, qty, unit);
          return { ...i, selectedUnit: unit, unitPrice: discountedPrice };
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
  const onAuditSwipe = (itemId: string, condition: 'GOOD' | 'DEPLETED') => {
    const item = availableItems.find((i) => i.id === itemId);
    if (!item) return;

    const exists = selectedItems.find((si) => si.item.id === itemId);
    if (exists) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === itemId
            ? {
                ...si,
                stockCondition: condition,
                quantity:
                  condition === 'DEPLETED'
                    ? 0
                    : si.quantity === 0
                      ? 1
                      : si.quantity,
                unitPrice:
                  condition === 'DEPLETED'
                    ? 0
                    : getDiscountedUnitPrice(
                        item,
                        parseInt(si.quantity.toString()) || 1,
                        si.selectedUnit,
                      ),
              }
            : si,
        ),
      );
    } else {
      const initialPrice =
        condition === 'DEPLETED' ? 0 : getDiscountedUnitPrice(item, 1, 'PCS');
      setSelectedItems([
        ...selectedItems,
        {
          item,
          quantity: condition === 'DEPLETED' ? 0 : 1,
          selectedUnit: 'PCS',
          unitPrice: initialPrice,
          stockCondition: condition,
          pendingAllocationCount: 0,
        },
      ]);
    }
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

    const hasBelowFloor = selectedItems.some(
      (si) => Number(si.unitPrice || 0) < getItemPrice(si.item) * 0.85,
    );
    if (hasBelowFloor && !isOverrideMarginAcknowledged) {
      Alert.alert(t('validationError'), t('checkOverrideMarginError'));
      return;
    }

    // Validate quantity inputs first
    const validatedItems: SelectedItemPayload[] = [];
    for (const selected of selectedItems) {
      const qty =
        typeof selected.quantity === 'number'
          ? selected.quantity
          : parseInt(selected.quantity || '0', 10);
      const pendingAlloc = parseInt(
        (selected as $Any).pendingAllocationCount?.toString() || '0',
        10,
      );
      if (
        isNaN(qty) ||
        (qty < 1 && pendingAlloc < 1 && selected.stockCondition !== 'DEPLETED')
      ) {
        Alert.alert(
          t('validationError'),
          t('enterValidQtyForSku').replace('{sku}', selected.item.sku),
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
        stockCondition: selected.stockCondition || 'GOOD',
        pendingAllocationCount: pendingAlloc || 0,
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
        selectedProjectId,
        traceId || undefined,
        ActorService.getActorId(),
      );

      // After successfully creating interaction log, delete the draft cart
      try {
        await database
          .delete(sqliteSchema.draft_carts)
          .where(
            and(
              eq(sqliteSchema.draft_carts.shop_id, shop.id),
              eq(sqliteSchema.draft_carts.rep_id, activeRep.id),
            ),
          );
      } catch (e) {
        console.error('Failed to delete draft after save:', e);
      }

      if (screenshotUri) {
        // Enqueue the image upload task locally and trigger queue processing.
        await ImageUploadQueue.enqueueImage(
          logId,
          screenshotUri,
          traceId || undefined,
          ActorService.getActorId(),
        );
      }

      Alert.alert(t('success'), t('interactionSaved'));
      clearSession(shop.id);
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
              } as $Any)
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

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {shop && (
                <Box mb="m">
                  <Card mb="s">
                    <Text variant="body" fontWeight="bold">
                      {t('shopLabel')}: {shop.name}
                    </Text>
                  </Card>
                </Box>
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
                    {t('discrepancyWarning')}
                  </Text>
                </Box>
              )}

              <ViberIntegration
                type={type}
                setType={setType}
                shop={shop}
                screenshotUri={screenshotUri}
                setScreenshotUri={handleInterceptScreenshot}
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
                {COMMERCIAL_STATUSES.map((status) => (
                  <Box key={status.value} mr="s" mb="s">
                    <Button
                      title={t(status.labelKey as $Any) || status.value}
                      variant={
                        commercialStatus === status.value
                          ? 'primary'
                          : 'outline'
                      }
                      onPress={() => setCommercialStatus(status.value)}
                    />
                  </Box>
                ))}
              </Box>

              <Text variant="title" mb="s">
                {t('priceCurrency')}
              </Text>
              <Box flexDirection="row" mb="m">
                {CURRENCIES.map((curr) => {
                  const isSelected = selectedCurrency === curr.value;
                  return (
                    <Box key={curr.value} mr="s" style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedCurrency(curr.value)}
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
                            {curr.label}
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
                onAuditSwipe={onAuditSwipe}
              />

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
                projects={projects}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
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
      <ImageAnnotationModal
        visible={annotationModalVisible}
        imageUri={pendingAnnotationUri}
        onClose={() => {
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
        onAnnotated={(croppedUri) => {
          setScreenshotUri(croppedUri);
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
      />
    </Modal>
  );
}
