import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { desc, eq } from 'drizzle-orm';
import axios from 'axios';
import {
  Item,
  Shop,
  guardAsync,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import {
  createInteractionLog,
  fetchItemsAndStockLevel,
  mapShop,
} from '../../../core/data/repositories';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  AI_PARSE_NOTE_URL,
  OVERRIDE_MARGIN_LIMIT_FACTOR,
} from '../../../config/appConfig';
import { syncData } from '../../sync/sync';
import {
  AiParsedItem,
  matchAiParsedItems,
  parseOrderText,
  ParsedLineMatch,
  sanitisePriceInput,
  sanitiseQuantityInput,
} from '../orderParsing';
import {
  getItemPrice as computeItemPrice,
  getUnitPrice,
  recalculateBasketForCurrency,
} from '../pricing';
import {
  DraftLineItem,
  ExchangeRateRow,
  InteractionLogRow,
  PriceBookItemRow,
  PricingContext,
  ProjectRow,
} from '../types';

const DEFAULT_CURRENCY = 'MMK';
const DEFAULT_UNIT = 'PCS';
const DEFAULT_STOCK_CONDITION = 'GOOD';
const ORDER_LOG_TYPE = 'VIBER';
const ORDER_LOG_STATUS = 'ORDER_PLACED';

export interface UseOrderDrafterReturn {
  shops: Shop[];
  projects: ProjectRow[];
  selectedShop: Shop | undefined;
  selectedShopId: string;
  setSelectedShopId: (shopId: string) => void;
  rawText: string;
  setRawText: (text: string) => void;
  selectedCurrency: string;
  selectCurrency: (currency: string) => void;
  selectedItems: DraftLineItem[];
  draftStagingItems: DraftLineItem[];
  setDraftStagingItems: React.Dispatch<React.SetStateAction<DraftLineItem[]>>;
  isParsingNote: boolean;
  isSaving: boolean;
  isOverrideMarginAcknowledged: boolean;
  setIsOverrideMarginAcknowledged: (val: boolean) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  lastInteractionLog: InteractionLogRow | null;
  formattedBasketTotal: string;
  getItemPrice: (item: Item) => number;
  handleParse: () => Promise<void>;
  handleSaveOrder: () => Promise<void>;
  handleDuplicateLastOrder: () => Promise<void>;
  commitStagedItems: () => void;
  updateQuantity: (itemId: string, quantity: string) => void;
  updateSelectedUnit: (itemId: string, unit: string) => void;
  updateUnitPrice: (itemId: string, price: string) => void;
  updateStockCondition: (itemId: string, condition: string) => void;
  updateStagedQuantity: (index: number, quantity: string) => void;
  updateStagedUnit: (index: number, unit: string) => void;
  updateStagedUnitPrice: (index: number, price: string) => void;
}

export const useOrderDrafter = (): UseOrderDrafterReturn => {
  const { activeRep } = useAuth();
  const { t } = useTranslation();

  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [priceBookItems, setPriceBookItems] = useState<PriceBookItemRow[]>([]);

  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] =
    useState<string>(DEFAULT_CURRENCY);
  const [selectedItems, setSelectedItems] = useState<DraftLineItem[]>([]);
  const [draftStagingItems, setDraftStagingItems] = useState<DraftLineItem[]>(
    [],
  );
  const [isParsingNote, setIsParsingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOverrideMarginAcknowledged, setIsOverrideMarginAcknowledged] =
    useState(false);
  const [lastInteractionLog, setLastInteractionLog] =
    useState<InteractionLogRow | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === selectedShopId),
    [shops, selectedShopId],
  );

  const pricingContext: PricingContext = useMemo(
    () => ({ priceBookItems, exchangeRates, selectedCurrency }),
    [priceBookItems, exchangeRates, selectedCurrency],
  );

  const getItemPrice = useCallback(
    (item: Item): number => computeItemPrice(item, pricingContext),
    [pricingContext],
  );

  // Initial data load: shops, catalogue items, exchange rates, projects.
  useEffect(() => {
    const loadData = async () => {
      const [result, error] = await guardAsync(
        Promise.all([
          database.select().from(sqliteSchema.shops),
          fetchItemsAndStockLevel(),
          database.select().from(sqliteSchema.exchange_rates),
          database.select().from(sqliteSchema.projects),
        ]),
      );
      if (error) {
        console.error('Failed to load data for order drafter:', error);
        return;
      }
      const [fetchedShops, itemsResult, rates, projs] = result;
      setShops(fetchedShops.map(mapShop));
      setItems(itemsResult.items);
      setExchangeRates(rates);
      setProjects(projs);
    };
    loadData();
  }, []);

  // Reload price book + last interaction log whenever the selected shop changes.
  useEffect(() => {
    const loadPriceBook = async () => {
      if (!selectedShop || !selectedShop.priceBookId) {
        setPriceBookItems([]);
        return;
      }
      const [pbItems, error] = await guardAsync(
        database
          .select()
          .from(sqliteSchema.price_book_items)
          .where(
            eq(
              sqliteSchema.price_book_items.price_book_id,
              selectedShop.priceBookId,
            ),
          ),
      );
      if (error) {
        console.error('Failed to load price book items:', error);
        setPriceBookItems([]);
        return;
      }
      setPriceBookItems(pbItems);
    };

    const loadLastInteractionLog = async () => {
      if (!selectedShopId) {
        setLastInteractionLog(null);
        return;
      }
      const [logs, error] = await guardAsync(
        database
          .select()
          .from(sqliteSchema.interaction_logs)
          .where(eq(sqliteSchema.interaction_logs.shop_id, selectedShopId))
          .orderBy(desc(sqliteSchema.interaction_logs.created_at)),
      );
      if (error) {
        console.error(
          'Failed to load last interaction log in ViberSimulator:',
          error,
        );
        setLastInteractionLog(null);
        return;
      }
      setLastInteractionLog(logs.length > 0 ? logs[0] : null);
    };

    loadPriceBook();
    loadLastInteractionLog();
  }, [selectedShopId, shops, selectedShop]);

  const priceMatch = useCallback(
    (match: ParsedLineMatch): DraftLineItem => ({
      item: match.item,
      quantity: match.quantity,
      selectedUnit: match.selectedUnit,
      unitPrice: getUnitPrice(match.item, match.selectedUnit, pricingContext),
      stockCondition: DEFAULT_STOCK_CONDITION,
      pendingAllocationCount: match.pendingAllocationCount,
    }),
    [pricingContext],
  );

  const parseViaAiFallback = useCallback(async () => {
    setIsParsingNote(true);
    const [response, error] = await guardAsync(
      axios.post<{ items?: AiParsedItem[] }>(AI_PARSE_NOTE_URL, {
        note: rawText,
      }),
    );
    setIsParsingNote(false);

    if (error) {
      console.error('[ViberSimulator] AI parse fallback failed:', error);
      Alert.alert(t('info'), t('couldNotIdentifyItems'));
      return;
    }

    const aiItems = response?.data?.items ?? [];
    if (aiItems.length > 0) {
      const matched = matchAiParsedItems(aiItems, items);
      if (matched.length > 0) {
        setDraftStagingItems(matched.map(priceMatch));
        return;
      }
    }
    Alert.alert(t('info'), t('couldNotIdentifyItems'));
  }, [items, priceMatch, rawText, t]);

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) {
      Alert.alert(t('info'), t('enterRawOrderTextInfo'));
      return;
    }

    const parsedMatches = parseOrderText(rawText, items);
    if (parsedMatches.length === 0) {
      await parseViaAiFallback();
      return;
    }
    setDraftStagingItems(parsedMatches.map(priceMatch));
  }, [items, parseViaAiFallback, priceMatch, rawText, t]);

  const selectCurrency = useCallback(
    (currency: string) => {
      setSelectedCurrency(currency);
      setSelectedItems((prev) =>
        recalculateBasketForCurrency(
          prev,
          currency,
          priceBookItems,
          exchangeRates,
        ),
      );
    },
    [exchangeRates, priceBookItems],
  );

  const updateQuantity = useCallback((itemId: string, quantity: string) => {
    const qtyStr = sanitiseQuantityInput(quantity);
    setSelectedItems((prev) =>
      prev.map((i) => (i.item.id === itemId ? { ...i, quantity: qtyStr } : i)),
    );
  }, []);

  const updateSelectedUnit = useCallback(
    (itemId: string, unit: string) => {
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.item.id === itemId
            ? {
                ...i,
                selectedUnit: unit,
                unitPrice: getUnitPrice(i.item, unit, pricingContext),
              }
            : i,
        ),
      );
    },
    [pricingContext],
  );

  const updateUnitPrice = useCallback((itemId: string, price: string) => {
    const cleanPrice = sanitisePriceInput(price);
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.item.id === itemId ? { ...i, unitPrice: cleanPrice } : i,
      ),
    );
  }, []);

  const updateStockCondition = useCallback(
    (itemId: string, condition: string) => {
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.item.id === itemId ? { ...i, stockCondition: condition } : i,
        ),
      );
    },
    [],
  );

  const updateStagedQuantity = useCallback(
    (index: number, quantity: string) => {
      const qtyStr = sanitiseQuantityInput(quantity);
      setDraftStagingItems((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, quantity: qtyStr } : item,
        ),
      );
    },
    [],
  );

  const updateStagedUnit = useCallback(
    (index: number, unit: string) => {
      setDraftStagingItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                selectedUnit: unit,
                unitPrice: getUnitPrice(item.item, unit, pricingContext),
              }
            : item,
        ),
      );
    },
    [pricingContext],
  );

  const updateStagedUnitPrice = useCallback((index: number, price: string) => {
    const cleanPrice = sanitisePriceInput(price);
    setDraftStagingItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, unitPrice: cleanPrice } : item,
      ),
    );
  }, []);

  const commitStagedItems = useCallback(() => {
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
          const stagedQty = parseInt(staged.quantity.toString() || '0', 10);
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
  }, [draftStagingItems, t]);

  const handleDuplicateLastOrder = useCallback(async () => {
    if (!lastInteractionLog) return;
    const [result, error] = await guardAsync(
      Promise.all([
        database
          .select()
          .from(sqliteSchema.interaction_items)
          .where(
            eq(
              sqliteSchema.interaction_items.interaction_log_id,
              lastInteractionLog.id,
            ),
          ),
        fetchItemsAndStockLevel(),
      ]),
    );
    if (error) {
      console.error('Failed to duplicate last order in ViberSimulator:', error);
      Alert.alert(t('error'), t('failedToDuplicateLastOrder'));
      return;
    }

    const [itemsList, { items: allItems }] = result;
    if (itemsList.length === 0) return;

    const mapped: DraftLineItem[] = [];
    for (const ii of itemsList) {
      const itemDetail = allItems.find((i) => i.id === ii.item_id);
      if (!itemDetail) continue;
      const unitPriceVal =
        ii.unit_price !== undefined && ii.unit_price !== null
          ? ii.unit_price
          : ii.unit_price_at_sale !== undefined &&
              ii.unit_price_at_sale !== null
            ? ii.unit_price_at_sale
            : itemDetail.unitPrice || 0;
      mapped.push({
        item: itemDetail,
        quantity: ii.quantity,
        selectedUnit: ii.selected_unit || DEFAULT_UNIT,
        unitPrice: unitPriceVal,
        stockCondition: ii.stock_condition || DEFAULT_STOCK_CONDITION,
        pendingAllocationCount: ii.pending_allocation_count ?? 0,
      });
    }
    setSelectedItems(mapped);
  }, [lastInteractionLog, t]);

  const handleSaveOrder = useCallback(async () => {
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
        stockCondition: selected.stockCondition || DEFAULT_STOCK_CONDITION,
        pendingAllocationCount: pendingAlloc,
      });
    }

    setIsSaving(true);
    const [, error] = await guardAsync(
      createInteractionLog(
        selectedShopId,
        activeRep.id,
        ORDER_LOG_TYPE,
        ORDER_LOG_STATUS,
        `Back-Office Intake Canvas raw text:\n${rawText}`,
        null,
        validatedItems,
        selectedProjectId,
      ),
    );
    setIsSaving(false);

    if (error) {
      console.error(error);
      Alert.alert(t('error'), t('failedToSaveOrder'));
      return;
    }

    Alert.alert(t('success'), t('orderDraftedSuccess'));
    setRawText('');
    setSelectedItems([]);
    setIsOverrideMarginAcknowledged(false);
    syncData().catch((err) => {
      console.error('[ViberSimulator] Background sync failed:', err);
    });
  }, [
    activeRep.id,
    getItemPrice,
    isOverrideMarginAcknowledged,
    rawText,
    selectedCurrency,
    selectedItems,
    selectedProjectId,
    selectedShopId,
    t,
  ]);

  const totalBasketValue = useMemo(
    () =>
      selectedItems.reduce((sum, si) => {
        const qty = parseInt(si.quantity.toString() || '0', 10);
        const pendingAlloc = parseInt(
          si.pendingAllocationCount?.toString() || '0',
          10,
        );
        const effectiveQty = qty > 0 ? qty : pendingAlloc;
        return (
          sum +
          (isNaN(effectiveQty) ? 0 : effectiveQty) * Number(si.unitPrice || 0)
        );
      }, 0),
    [selectedItems],
  );

  const formattedBasketTotal = useMemo(
    () =>
      selectedCurrency === DEFAULT_CURRENCY
        ? `K${Math.round(totalBasketValue).toLocaleString()}`
        : `${totalBasketValue.toFixed(2)} ${selectedCurrency}`,
    [selectedCurrency, totalBasketValue],
  );

  return {
    shops,
    projects,
    selectedShop,
    selectedShopId,
    setSelectedShopId,
    rawText,
    setRawText,
    selectedCurrency,
    selectCurrency,
    selectedItems,
    draftStagingItems,
    setDraftStagingItems,
    isParsingNote,
    isSaving,
    isOverrideMarginAcknowledged,
    setIsOverrideMarginAcknowledged,
    selectedProjectId,
    setSelectedProjectId,
    lastInteractionLog,
    formattedBasketTotal,
    getItemPrice,
    handleParse,
    handleSaveOrder,
    handleDuplicateLastOrder,
    commitStagedItems,
    updateQuantity,
    updateSelectedUnit,
    updateUnitPrice,
    updateStockCondition,
    updateStagedQuantity,
    updateStagedUnit,
    updateStagedUnitPrice,
  };
};
