import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { and, desc, eq, gte, or } from 'drizzle-orm';
import {
  Item,
  Shop,
  guardAsync,
  semanticSearch,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import {
  SelectedItemPayload,
  createInteractionLog,
  fetchItemsAndStockLevel,
} from '../../../core/data/repositories';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import { scannerThrottle } from '../../../core/utils/ScannerThrottle';
import { checkDiscrepancy } from '../../../core/utils/ocr';
import { TelemetryLogger } from '../../../core/utils/telemetry';
import { ActorService } from '../../../core/auth/ActorService';
import {
  CartSession,
  defaultSession,
  useCartStore,
} from '../../../core/store/cartStore';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';
import {
  AuditPricingContext,
  getDiscountedUnitPrice,
  getItemPrice as resolveItemPrice,
  isBelowWholesaleFloor,
} from '../pricing';
import { computeBlockedStatus } from '../creditStatus';
import {
  extractScreenshotBase64,
  verifyScreenshot,
} from '../screenshotVerification';
import {
  ExchangeRateRow,
  InteractionLineItem,
  InteractionLogRow,
  PriceBookItemRow,
  ProjectRow,
} from '../types';

const DEFAULT_SHOP_ID = 'default';
const DEFAULT_UNIT = 'PCS';
const DEFAULT_STOCK_CONDITION = 'GOOD';
const DEPLETED_STOCK_CONDITION = 'DEPLETED';
const DEFAULT_TYPE = 'SHOP_VISIT';
const DEFAULT_COMMERCIAL_STATUS = 'FOLLOWED_UP';
const VIBER_TYPE = 'VIBER';
const ORDER_PLACED_STATUS = 'ORDER_PLACED';
const PAYMENT_COLLECTION_TYPE = 'PAYMENT_COLLECTION';
const PRICE_TOO_HIGH_REASON = 'PRICE_TOO_HIGH';
const MARKET_INTEL_MIN_NOTES_LENGTH = 20;
const OCR_DISCREPANCY_MARKER = '[OCR Discrepancy: True]';

type SelectedItemsUpdater =
  | InteractionLineItem[]
  | ((prev: InteractionLineItem[]) => InteractionLineItem[]);

const generateUUIDv4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export interface UseInteractionLoggingReturn {
  // Session-backed form fields
  type: string;
  setType: (val: string) => void;
  commercialStatus: string;
  setCommercialStatus: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  selectedItems: InteractionLineItem[];
  setSelectedItems: (val: SelectedItemsUpdater) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (val: string | null) => void;
  screenshotUri: string | null;
  setScreenshotUri: (val: string | null) => void;
  isOverrideMarginAcknowledged: boolean;
  setIsOverrideMarginAcknowledged: (val: boolean) => void;
  hasDiscrepancy: boolean;
  objectionReason: string;
  setObjectionReason: (val: string) => void;
  isPriceTooHigh: boolean;
  negotiatedPrice: string;
  setNegotiatedPrice: (val: string) => void;
  competitorPrice: string;
  setCompetitorPrice: (val: string) => void;
  viberMessageText: string;
  setViberMessageText: (val: string) => void;
  selectedCurrency: string;
  setSelectedCurrency: (val: string) => void;
  // Local UI state
  skuSearch: string;
  setSkuSearch: (val: string) => void;
  availableItems: Item[];
  projects: ProjectRow[];
  stocksMap: Record<string, number>;
  isSaving: boolean;
  isBlocked: boolean;
  hasCollectionToday: boolean;
  lastInteractionLog: InteractionLogRow | null;
  annotationModalVisible: boolean;
  pendingAnnotationUri: string | null;
  // Derived helpers
  getItemPrice: (item: Item) => number;
  // Actions
  handleInterceptScreenshot: (uri: string | null) => void;
  handleAnnotated: (croppedUri: string) => void;
  handleCloseAnnotation: () => void;
  toggleItem: (item: Item) => void;
  updateStockCondition: (itemId: string, condition: string) => void;
  updateQuantity: (itemId: string, quantity: string) => void;
  updateSelectedUnit: (itemId: string, unit: string) => void;
  updateUnitPrice: (itemId: string, price: string) => void;
  onAuditSwipe: (itemId: string, condition: 'GOOD' | 'DEPLETED') => void;
  handleDuplicateLastOrder: () => Promise<void>;
  handleSave: () => Promise<void>;
}

export const useInteractionLogging = (
  visible: boolean,
  shop: Shop | null,
  onClose: () => void,
): UseInteractionLoggingReturn => {
  const { t } = useTranslation();
  const { activeRep } = useAuth();
  const shopId = shop?.id || DEFAULT_SHOP_ID;

  const session = useCartStore(
    (state) => state.sessions[shopId] || defaultSession,
  );
  const updateSession = useCartStore((state) => state.updateSession);
  const clearSession = useCartStore((state) => state.clearSession);

  const patchSession = useCallback(
    (updates: Partial<CartSession>) => updateSession(shopId, updates),
    [shopId, updateSession],
  );

  // --- Session-backed field accessors ---
  const setType = useCallback(
    (val: string) => patchSession({ type: val }),
    [patchSession],
  );
  const setCommercialStatus = useCallback(
    (val: string) => patchSession({ commercialStatus: val }),
    [patchSession],
  );
  const setNotes = useCallback(
    (val: string) => patchSession({ notes: val }),
    [patchSession],
  );
  const setSelectedItems = useCallback(
    (val: SelectedItemsUpdater) => {
      const newItems =
        typeof val === 'function'
          ? val(session.selectedItems as InteractionLineItem[])
          : val;
      patchSession({ selectedItems: newItems });
    },
    [patchSession, session.selectedItems],
  );
  const setSelectedProjectId = useCallback(
    (val: string | null) => patchSession({ selectedProjectId: val }),
    [patchSession],
  );
  const setScreenshotUri = useCallback(
    (val: string | null) => patchSession({ screenshotUri: val }),
    [patchSession],
  );
  const setIsOverrideMarginAcknowledged = useCallback(
    (val: boolean) => patchSession({ isOverrideMarginAcknowledged: val }),
    [patchSession],
  );
  const setHasDiscrepancy = useCallback(
    (val: boolean) => patchSession({ hasDiscrepancy: val }),
    [patchSession],
  );
  const setObjectionReason = useCallback(
    (val: string) => patchSession({ objectionReason: val }),
    [patchSession],
  );
  const setNegotiatedPrice = useCallback(
    (val: string) => patchSession({ negotiatedPrice: val }),
    [patchSession],
  );
  const setCompetitorPrice = useCallback(
    (val: string) => patchSession({ competitorPrice: val }),
    [patchSession],
  );
  const setViberMessageText = useCallback(
    (val: string) => patchSession({ viberMessageText: val }),
    [patchSession],
  );
  const setSelectedCurrency = useCallback(
    (val: string) => patchSession({ selectedCurrency: val }),
    [patchSession],
  );

  const type = session.type;
  const commercialStatus = session.commercialStatus;
  const notes = session.notes;
  const selectedItems = session.selectedItems as InteractionLineItem[];
  const selectedProjectId = session.selectedProjectId;
  const screenshotUri = session.screenshotUri;
  const isOverrideMarginAcknowledged = session.isOverrideMarginAcknowledged;
  const hasDiscrepancy = session.hasDiscrepancy;
  const objectionReason = session.objectionReason;
  const negotiatedPrice = session.negotiatedPrice;
  const competitorPrice = session.competitorPrice;
  const viberMessageText = session.viberMessageText;
  const selectedCurrency = session.selectedCurrency;
  const isPriceTooHigh = objectionReason === PRICE_TOO_HIGH_REASON;

  // --- Local UI state ---
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasCollectionToday, setHasCollectionToday] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInteractionLog, setLastInteractionLog] =
    useState<InteractionLogRow | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [traceId, setTraceId] = useState('');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [priceBookItems, setPriceBookItems] = useState<PriceBookItemRow[]>([]);
  const [stocksMap, setStocksMap] = useState<Record<string, number>>({});
  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [pendingAnnotationUri, setPendingAnnotationUri] = useState<
    string | null
  >(null);

  const pricingContext: AuditPricingContext = useMemo(
    () => ({ priceBookItems, exchangeRates, selectedCurrency }),
    [priceBookItems, exchangeRates, selectedCurrency],
  );

  const getItemPrice = useCallback(
    (item: Item): number => resolveItemPrice(item, pricingContext),
    [pricingContext],
  );

  const discountedPrice = useCallback(
    (item: Item, qty: number, unit: string): number =>
      getDiscountedUnitPrice(item, qty, unit, pricingContext),
    [pricingContext],
  );

  // --- Data loaders ---
  const checkBlockedStatus = useCallback(async () => {
    if (!shop) return;
    const [result, error] = await guardAsync(
      Promise.all([
        database
          .select()
          .from(sqliteSchema.invoices)
          .where(
            and(
              eq(sqliteSchema.invoices.shop_id, shop.id),
              or(
                eq(sqliteSchema.invoices.state, 'PENDING'),
                eq(sqliteSchema.invoices.state, 'PARTIALLY_PAID'),
                eq(sqliteSchema.invoices.state, 'OVERDUE'),
              ),
            ),
          ),
        (() => {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          return database
            .select()
            .from(sqliteSchema.interaction_logs)
            .where(
              and(
                eq(sqliteSchema.interaction_logs.shop_id, shop.id),
                eq(sqliteSchema.interaction_logs.type, PAYMENT_COLLECTION_TYPE),
                gte(
                  sqliteSchema.interaction_logs.created_at_local,
                  startOfToday.getTime(),
                ),
              ),
            );
        })(),
      ]),
    );
    if (error) {
      console.error('Failed to check blocked status:', error);
      return;
    }
    const [allInvoices, collections] = result;
    setIsBlocked(computeBlockedStatus(allInvoices, shop.creditLimitMmk || 0));
    setHasCollectionToday(collections.length > 0);
  }, [shop]);

  const loadLastInteractionLog = useCallback(async () => {
    if (!shop) {
      setLastInteractionLog(null);
      return;
    }
    const [logs, error] = await guardAsync(
      database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(eq(sqliteSchema.interaction_logs.shop_id, shop.id))
        .orderBy(desc(sqliteSchema.interaction_logs.created_at)),
    );
    if (error) {
      console.error('Failed to load last interaction log:', error);
      setLastInteractionLog(null);
      return;
    }
    setLastInteractionLog(logs.length > 0 ? logs[0] : null);
  }, [shop]);

  const loadRatesAndBook = useCallback(async () => {
    const [result, error] = await guardAsync(
      Promise.all([
        database.select().from(sqliteSchema.exchange_rates),
        database.select().from(sqliteSchema.projects),
        shop && shop.priceBookId
          ? database
              .select()
              .from(sqliteSchema.price_book_items)
              .where(
                eq(
                  sqliteSchema.price_book_items.price_book_id,
                  shop.priceBookId,
                ),
              )
          : Promise.resolve([] as PriceBookItemRow[]),
      ]),
    );
    if (error) {
      console.error('Failed to load rates or price book items:', error);
      return;
    }
    const [rates, projs, pbItems] = result;
    setExchangeRates(rates);
    setProjects(projs);
    setPriceBookItems(pbItems);
  }, [shop]);

  const loadItems = useCallback(async () => {
    const [result, error] = await guardAsync(fetchItemsAndStockLevel());
    if (error) {
      console.error('Error loading items or stocks', error);
      return;
    }
    const { items, stocksMap: allStocks } = result;
    const filtered = skuSearch ? semanticSearch(items, skuSearch) : items;
    setAvailableItems(filtered);
    setStocksMap(allStocks);

    if (session.preFillSku) {
      const itemToPrefill = items.find(
        (i) => i.sku.toLowerCase() === session.preFillSku?.toLowerCase(),
      );
      if (itemToPrefill) {
        const qty = session.preFillQty || 1;
        const exists = selectedItems.find(
          (si) => si.item.id === itemToPrefill.id,
        );
        if (!exists) {
          setSelectedItems([
            ...selectedItems,
            {
              item: itemToPrefill,
              quantity: qty,
              selectedUnit: DEFAULT_UNIT,
              unitPrice: discountedPrice(itemToPrefill, qty, DEFAULT_UNIT),
              stockCondition: DEFAULT_STOCK_CONDITION,
              pendingAllocationCount: 0,
            },
          ]);
        }
      }
      patchSession({ preFillSku: null, preFillQty: null });
    }

    if (skuSearch) {
      const perfectMatch = items.find(
        (i) => i.sku.toLowerCase() === skuSearch.trim().toLowerCase(),
      );
      if (perfectMatch) {
        const isAllowed = scannerThrottle.processScan(perfectMatch.sku, t);
        if (isAllowed) {
          const exists = selectedItems.find(
            (si) => si.item.id === perfectMatch.id,
          );
          if (!exists) {
            setSelectedItems([
              ...selectedItems,
              {
                item: perfectMatch,
                quantity: 1,
                selectedUnit: DEFAULT_UNIT,
                unitPrice: discountedPrice(perfectMatch, 1, DEFAULT_UNIT),
                stockCondition: DEFAULT_STOCK_CONDITION,
                pendingAllocationCount: 0,
              },
            ]);
          }
        }
        setSkuSearch('');
      }
    }
  }, [
    discountedPrice,
    patchSession,
    selectedItems,
    session.preFillQty,
    session.preFillSku,
    setSelectedItems,
    skuSearch,
    t,
  ]);

  const resetForm = useCallback(() => {
    patchSession({
      type: DEFAULT_TYPE,
      commercialStatus: DEFAULT_COMMERCIAL_STATUS,
      notes: '',
      selectedItems: [],
      screenshotUri: null,
      selectedCurrency: 'MMK',
      hasDiscrepancy: false,
      selectedProjectId: null,
      isOverrideMarginAcknowledged: false,
      objectionReason: '',
      negotiatedPrice: '',
      competitorPrice: '',
      viberMessageText: '',
    });
    setSkuSearch('');
    setLastInteractionLog(null);
    setIsBlocked(false);
    setHasCollectionToday(false);
  }, [patchSession]);

  const loadDraftCart = useCallback(async () => {
    if (!shop || !activeRep) return;
    if (session.selectedItems.length > 0) {
      if (!traceId) setTraceId(generateUUIDv4());
      setIsDraftLoaded(true);
      return;
    }
    const draftId = `${shop.id}_${activeRep.id}`;
    const [drafts, error] = await guardAsync(
      database
        .select()
        .from(sqliteSchema.draft_carts)
        .where(eq(sqliteSchema.draft_carts.id, draftId)),
    );
    if (error) {
      console.error('Failed to load draft cart:', error);
      resetForm();
      setTraceId(generateUUIDv4());
      setIsDraftLoaded(true);
      return;
    }

    if (drafts.length > 0) {
      const draft = drafts[0];
      const items = JSON.parse(draft.items_json) as InteractionLineItem[];
      updateSession(shop.id, {
        selectedItems: items,
        selectedCurrency: draft.currency,
        selectedProjectId: draft.project_id,
      });
      setTraceId(draft.trace_id || generateUUIDv4());
      setIsDraftLoaded(true);
    } else {
      resetForm();
      setTraceId(generateUUIDv4());
      setIsDraftLoaded(true);
    }
  }, [
    activeRep,
    resetForm,
    session.selectedItems.length,
    shop,
    traceId,
    updateSession,
  ]);

  // --- Effects ---
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (visible) {
      setIsDraftLoaded(false);
      const timer = setTimeout(() => {
        loadDraftCart();
        loadItems();
        loadRatesAndBook();
        loadLastInteractionLog();
        checkBlockedStatus();
      }, 0);
      cleanup = () => clearTimeout(timer);
    } else {
      resetForm();
      setIsDraftLoaded(false);
    }
    return cleanup;
  }, [visible, shop]);

  useEffect(() => {
    const saveDraft = async () => {
      if (!shop || !activeRep || !isDraftLoaded) return;
      const draftId = `${shop.id}_${activeRep.id}`;
      const [, error] = await guardAsync(
        (async () => {
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
            });
          }
        })(),
      );
      if (error) {
        console.error('[Draft Cart] Failed to auto-save draft cart:', error);
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

  useEffect(() => {
    const verifyUploadedScreenshot = async () => {
      if (!screenshotUri) {
        setHasDiscrepancy(false);
        return;
      }

      const [ocrText, error] = await guardAsync(
        (async () => {
          const base64 = await extractScreenshotBase64(screenshotUri);
          return verifyScreenshot(base64);
        })(),
      );
      if (error) {
        console.error('Failed to verify screenshot OCR:', error);
        return;
      }
      if (ocrText === null) {
        return;
      }

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
    };

    verifyUploadedScreenshot();
  }, [screenshotUri, selectedItems]);

  // --- Screenshot annotation handlers ---
  const handleInterceptScreenshot = useCallback(
    (uri: string | null) => {
      if (uri) {
        setPendingAnnotationUri(uri);
        setAnnotationModalVisible(true);
      } else {
        setScreenshotUri(null);
      }
    },
    [setScreenshotUri],
  );

  const handleAnnotated = useCallback(
    (croppedUri: string) => {
      setScreenshotUri(croppedUri);
      setAnnotationModalVisible(false);
      setPendingAnnotationUri(null);
    },
    [setScreenshotUri],
  );

  const handleCloseAnnotation = useCallback(() => {
    setAnnotationModalVisible(false);
    setPendingAnnotationUri(null);
  }, []);

  // --- Item mutators ---
  const toggleItem = useCallback(
    (item: Item) => {
      const exists = selectedItems.find((i) => i.item.id === item.id);
      if (exists) {
        setSelectedItems(selectedItems.filter((i) => i.item.id !== item.id));
      } else {
        setSelectedItems([
          ...selectedItems,
          {
            item,
            quantity: 1,
            selectedUnit: DEFAULT_UNIT,
            unitPrice: discountedPrice(item, 1, DEFAULT_UNIT),
            stockCondition: DEFAULT_STOCK_CONDITION,
            pendingAllocationCount: 0,
          },
        ]);
      }
    },
    [discountedPrice, selectedItems, setSelectedItems],
  );

  const updateStockCondition = useCallback(
    (itemId: string, condition: string) => {
      setSelectedItems(
        selectedItems.map((i) =>
          i.item.id === itemId ? { ...i, stockCondition: condition } : i,
        ),
      );
    },
    [selectedItems, setSelectedItems],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: string) => {
      const qtyStr = quantity.replace(/[^0-9]/g, '');
      const newQty = parseInt(qtyStr, 10) || 0;
      setSelectedItems(
        selectedItems.map((i) => {
          if (i.item.id === itemId) {
            return {
              ...i,
              quantity: qtyStr,
              unitPrice: discountedPrice(i.item, newQty, i.selectedUnit),
            };
          }
          return i;
        }),
      );
    },
    [discountedPrice, selectedItems, setSelectedItems],
  );

  const updateSelectedUnit = useCallback(
    (itemId: string, unit: string) => {
      setSelectedItems(
        selectedItems.map((i) => {
          if (i.item.id === itemId) {
            const qty = parseInt(i.quantity.toString() || '0', 10) || 0;
            return {
              ...i,
              selectedUnit: unit,
              unitPrice: discountedPrice(i.item, qty, unit),
            };
          }
          return i;
        }),
      );
    },
    [discountedPrice, selectedItems, setSelectedItems],
  );

  const updateUnitPrice = useCallback(
    (itemId: string, price: string) => {
      const cleanPrice = price.replace(/[^0-9.]/g, '');
      setSelectedItems(
        selectedItems.map((i) =>
          i.item.id === itemId ? { ...i, unitPrice: cleanPrice } : i,
        ),
      );
    },
    [selectedItems, setSelectedItems],
  );

  const onAuditSwipe = useCallback(
    (itemId: string, condition: 'GOOD' | 'DEPLETED') => {
      const item = availableItems.find((i) => i.id === itemId);
      if (!item) return;

      const isDepleted = condition === DEPLETED_STOCK_CONDITION;
      const exists = selectedItems.find((si) => si.item.id === itemId);
      if (exists) {
        setSelectedItems(
          selectedItems.map((si) =>
            si.item.id === itemId
              ? {
                  ...si,
                  stockCondition: condition,
                  quantity: isDepleted
                    ? 0
                    : si.quantity === 0
                      ? 1
                      : si.quantity,
                  unitPrice: isDepleted
                    ? 0
                    : discountedPrice(
                        item,
                        parseInt(si.quantity.toString()) || 1,
                        si.selectedUnit,
                      ),
                }
              : si,
          ),
        );
      } else {
        setSelectedItems([
          ...selectedItems,
          {
            item,
            quantity: isDepleted ? 0 : 1,
            selectedUnit: DEFAULT_UNIT,
            unitPrice: isDepleted ? 0 : discountedPrice(item, 1, DEFAULT_UNIT),
            stockCondition: condition,
            pendingAllocationCount: 0,
          },
        ]);
      }
    },
    [availableItems, discountedPrice, selectedItems, setSelectedItems],
  );

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
      console.error('Failed to duplicate last order:', error);
      Alert.alert(t('error'), t('failedToDuplicateLastOrder'));
      return;
    }

    const [itemsList, { items: allItems }] = result;
    if (itemsList.length === 0) return;

    const mapped: InteractionLineItem[] = [];
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
  }, [lastInteractionLog, setSelectedItems, t]);

  // --- Submission ---
  const handleSave = useCallback(async () => {
    if (!shop) return;

    if (
      isBlocked &&
      !hasCollectionToday &&
      commercialStatus === ORDER_PLACED_STATUS
    ) {
      Alert.alert(t('validationError'), t('mustCollectCashError'));
      return;
    }

    if (
      (commercialStatus === 'INTERESTED' ||
        commercialStatus === 'NOT_INTERESTED') &&
      notes.length < MARKET_INTEL_MIN_NOTES_LENGTH
    ) {
      Alert.alert(t('validationError'), t('marketIntelMinLength'));
      return;
    }

    if (type === VIBER_TYPE && !screenshotUri) {
      Alert.alert(t('validationError'), t('viberProofMandatory'));
      return;
    }

    const hasBelowFloor = selectedItems.some((si) =>
      isBelowWholesaleFloor(si.unitPrice, si.item, pricingContext),
    );
    if (hasBelowFloor && !isOverrideMarginAcknowledged) {
      Alert.alert(t('validationError'), t('checkOverrideMarginError'));
      return;
    }

    const validatedItems: SelectedItemPayload[] = [];
    for (const selected of selectedItems) {
      const qty =
        typeof selected.quantity === 'number'
          ? selected.quantity
          : parseInt(selected.quantity || '0', 10);
      const pendingAlloc = parseInt(
        selected.pendingAllocationCount?.toString() || '0',
        10,
      );
      if (
        isNaN(qty) ||
        (qty < 1 &&
          pendingAlloc < 1 &&
          selected.stockCondition !== DEPLETED_STOCK_CONDITION)
      ) {
        Alert.alert(
          t('validationError'),
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
        pendingAllocationCount: pendingAlloc || 0,
      });
    }

    setIsSaving(true);
    let finalNotes = notes;
    if (hasDiscrepancy) {
      finalNotes = notes
        ? `${notes}\n${OCR_DISCREPANCY_MARKER}`
        : OCR_DISCREPANCY_MARKER;
    }

    // Pass null for screenshotUri to createInteractionLog to decouple the binary
    // upload; the screenshot is uploaded asynchronously by the ImageUploadQueue.
    const [logId, error] = await guardAsync(
      createInteractionLog(
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
        negotiatedPrice ? Number(negotiatedPrice) : null,
        objectionReason || null,
        competitorPrice ? Number(competitorPrice) : null,
        viberMessageText || null,
      ),
    );

    if (error || logId === undefined) {
      console.error(error);
      setIsSaving(false);
      Alert.alert(t('error'), t('interactionSaveFailed'));
      return;
    }

    const [, deleteError] = await guardAsync(
      database
        .delete(sqliteSchema.draft_carts)
        .where(
          and(
            eq(sqliteSchema.draft_carts.shop_id, shop.id),
            eq(sqliteSchema.draft_carts.rep_id, activeRep.id),
          ),
        ),
    );
    if (deleteError) {
      console.error('Failed to delete draft after save:', deleteError);
    }

    if (screenshotUri) {
      await ImageUploadQueue.enqueueImage(
        logId,
        screenshotUri,
        traceId || undefined,
        ActorService.getActorId(),
      );
    }

    setIsSaving(false);
    Alert.alert(t('success'), t('interactionSaved'));
    clearSession(shop.id);
    onClose();
  }, [
    activeRep,
    clearSession,
    commercialStatus,
    competitorPrice,
    hasCollectionToday,
    hasDiscrepancy,
    isBlocked,
    isOverrideMarginAcknowledged,
    negotiatedPrice,
    notes,
    objectionReason,
    onClose,
    pricingContext,
    screenshotUri,
    selectedCurrency,
    selectedItems,
    selectedProjectId,
    shop,
    t,
    traceId,
    type,
    viberMessageText,
  ]);

  return {
    type,
    setType,
    commercialStatus,
    setCommercialStatus,
    notes,
    setNotes,
    selectedItems,
    setSelectedItems,
    selectedProjectId,
    setSelectedProjectId,
    screenshotUri,
    setScreenshotUri,
    isOverrideMarginAcknowledged,
    setIsOverrideMarginAcknowledged,
    hasDiscrepancy,
    objectionReason,
    setObjectionReason,
    isPriceTooHigh,
    negotiatedPrice,
    setNegotiatedPrice,
    competitorPrice,
    setCompetitorPrice,
    viberMessageText,
    setViberMessageText,
    selectedCurrency,
    setSelectedCurrency,
    skuSearch,
    setSkuSearch,
    availableItems,
    projects,
    stocksMap,
    isSaving,
    isBlocked,
    hasCollectionToday,
    lastInteractionLog,
    annotationModalVisible,
    pendingAnnotationUri,
    getItemPrice,
    handleInterceptScreenshot,
    handleAnnotated,
    handleCloseAnnotation,
    toggleItem,
    updateStockCondition,
    updateQuantity,
    updateSelectedUnit,
    updateUnitPrice,
    onAuditSwipe,
    handleDuplicateLastOrder,
    handleSave,
  };
};
