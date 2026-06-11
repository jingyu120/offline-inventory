import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { eq } from 'drizzle-orm';
import {
  Item,
  ItemStock,
  guardAsync,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { mapItem, mapItemStock } from '../../../core/data/repositories';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import { syncData } from '../../sync/sync';
import { INVENTORY_STATUS } from '../../../config/appConfig';
import {
  ExtendedItem,
  PendingInventoryUpdateRow,
  PendingUpdateEditState,
  PENDING_UPDATE_STATUS,
  PENDING_UPDATE_TYPE,
  StockLocationRow,
} from '../types';
import {
  clampStock,
  generatePendingUpdateId,
  generateStockId,
  isManagerOrAdmin,
  parsePositivePrice,
  parseStockQuantity,
} from '../stockHelpers';

const SYNC_FAILED_LOG = '[IntakeScreen] sync failed:';
const DEFAULT_CATEGORY = 'Beverage';
const DEFAULT_INITIAL_STOCK = '100';

const triggerBackgroundSync = (): void => {
  syncData().catch((err) => console.error(SYNC_FAILED_LOG, err));
};

export interface IntakeNewSkuForm {
  sku: string;
  setSku: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  unitPrice: string;
  setUnitPrice: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  initialStock: string;
  setInitialStock: (value: string) => void;
  isAdding: boolean;
}

export interface IntakePendingEdit extends PendingUpdateEditState {
  setEditQtyDelta: (value: string) => void;
  setEditSku: (value: string) => void;
  setEditName: (value: string) => void;
  setEditPrice: (value: string) => void;
  setEditCategory: (value: string) => void;
  startEditUpdate: (update: PendingInventoryUpdateRow) => void;
  cancelEdit: () => void;
}

export interface UseIntakeInventoryReturn {
  items: ExtendedItem[];
  warehouses: StockLocationRow[];
  pendingUpdates: PendingInventoryUpdateRow[];
  loading: boolean;
  isManager: boolean;
  loadInventory: () => Promise<void>;
  newSkuForm: IntakeNewSkuForm;
  pendingEdit: IntakePendingEdit;
  handleUpdateStock: (
    item: ExtendedItem,
    delta: number,
    selectedWarehouseId: string,
    geoLockingDisabled: boolean,
    isNearWarehouse: boolean,
  ) => Promise<void>;
  handleAddItem: (
    selectedWarehouseId: string,
    geoLockingDisabled: boolean,
    isNearWarehouse: boolean,
  ) => Promise<void>;
  handleApproveUpdate: (
    update: PendingInventoryUpdateRow,
    selectedWarehouseId: string,
    isNearWarehouse: boolean,
  ) => Promise<void>;
  handleRejectUpdate: (update: PendingInventoryUpdateRow) => Promise<void>;
  handleSaveEdit: (update: PendingInventoryUpdateRow) => Promise<void>;
}

/**
 * Encapsulates all Intake data access: catalogue + stock load, warehouse list,
 * the pending-approvals queue, SKU registration, stock adjustments, and the
 * approve / reject / edit lifecycle for pending updates.
 */
export const useIntakeInventory = (): UseIntakeInventoryReturn => {
  const { t } = useTranslation();
  const { activeRep } = useAuth();

  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [warehouses, setWarehouses] = useState<StockLocationRow[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<
    PendingInventoryUpdateRow[]
  >([]);
  const [loading, setLoading] = useState(true);

  // New SKU registration form state.
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [initialStock, setInitialStock] = useState(DEFAULT_INITIAL_STOCK);
  const [isAdding, setIsAdding] = useState(false);

  // Inline editing state for a pending update.
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editQtyDelta, setEditQtyDelta] = useState<string>('');
  const [editSku, setEditSku] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  const isManager = isManagerOrAdmin(activeRep);

  const resetNewSkuForm = useCallback(() => {
    setSku('');
    setName('');
    setUnitPrice('');
    setInitialStock(DEFAULT_INITIAL_STOCK);
  }, []);

  const loadPendingUpdates = useCallback(async (): Promise<void> => {
    const [list, error] = await guardAsync(
      database
        .select()
        .from(sqliteSchema.pending_inventory_updates)
        .where(
          eq(
            sqliteSchema.pending_inventory_updates.status,
            PENDING_UPDATE_STATUS.PENDING,
          ),
        ),
    );
    if (error) {
      console.error('Failed to load pending updates:', error);
      return;
    }
    setPendingUpdates(list);
  }, []);

  const loadInventory = useCallback(async (): Promise<void> => {
    setLoading(true);
    const [result, error] = await guardAsync(
      Promise.all([
        database.select().from(sqliteSchema.items),
        database.select().from(sqliteSchema.item_stocks),
        database.select().from(sqliteSchema.stock_locations),
      ]),
    );
    if (error) {
      console.error('Failed to load inventory:', error);
      setLoading(false);
      return;
    }

    const [itemsList, stocksList, warehousesList] = result;
    const mappedItems = itemsList.map(mapItem);
    const mappedStocks = stocksList.map(mapItemStock);

    const stocksMap = new Map<string, ItemStock>(
      mappedStocks.map((s: ItemStock) => [s.itemId, s]),
    );

    const extended: ExtendedItem[] = mappedItems.map((item: Item) => {
      const stockRecord = stocksMap.get(item.id);
      return {
        ...item,
        stockQty: stockRecord ? stockRecord.goodStockCount : 0,
      };
    });

    setItems(extended);
    setWarehouses(warehousesList);
    await loadPendingUpdates();
    setLoading(false);
  }, [loadPendingUpdates]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const adjustStockRecord = useCallback(
    async (
      itemId: string,
      delta: number,
      status: string,
      now: number,
    ): Promise<void> => {
      const stockRecords = await database
        .select()
        .from(sqliteSchema.item_stocks)
        .where(eq(sqliteSchema.item_stocks.item_id, itemId));
      const record = stockRecords[0];

      if (record) {
        await database
          .update(sqliteSchema.item_stocks)
          .set({
            good_stock_count: clampStock(record.good_stock_count + delta),
            inventory_status: status,
            updated_at: now,
          })
          .where(eq(sqliteSchema.item_stocks.id, record.id));
      } else {
        await database.insert(sqliteSchema.item_stocks).values({
          id: generateStockId(),
          item_id: itemId,
          good_stock_count: clampStock(delta),
          wet_stock_count: 0,
          bad_stock_count: 0,
          inventory_status: status,
          created_at: now,
          updated_at: now,
        });
      }
    },
    [],
  );

  const insertItemWithStock = useCallback(
    async (
      itemSku: string,
      itemName: string,
      price: number,
      itemCategory: string,
      stockQty: number,
      status: string,
      now: number,
    ): Promise<void> => {
      const newItemId = generateStockId();
      await database.insert(sqliteSchema.items).values({
        id: newItemId,
        sku: itemSku,
        name: itemName,
        unit_price: price,
        category: itemCategory,
        inventory_status: status,
        created_at: now,
        updated_at: now,
      });
      await database.insert(sqliteSchema.item_stocks).values({
        id: generateStockId(),
        item_id: newItemId,
        good_stock_count: clampStock(stockQty),
        wet_stock_count: 0,
        bad_stock_count: 0,
        inventory_status: status,
        created_at: now,
        updated_at: now,
      });
    },
    [],
  );

  const handleUpdateStock = useCallback(
    async (
      item: ExtendedItem,
      delta: number,
      selectedWarehouseId: string,
      geoLockingDisabled: boolean,
      isNearWarehouse: boolean,
    ): Promise<void> => {
      if (!selectedWarehouseId) {
        Alert.alert(t('error'), t('selectWarehouseFirstError'));
        return;
      }

      if (geoLockingDisabled) {
        const now = Date.now();
        const [, error] = await guardAsync(
          database.insert(sqliteSchema.pending_inventory_updates).values({
            id: generatePendingUpdateId(),
            type: PENDING_UPDATE_TYPE.STOCK_ADJUSTMENT,
            item_id: item.id,
            location_id: selectedWarehouseId,
            quantity_delta: delta,
            submitted_by: activeRep.username || activeRep.name,
            status: PENDING_UPDATE_STATUS.PENDING,
            created_at: now,
            updated_at: now,
          }),
        );
        if (error) {
          console.error('Failed to submit pending update:', error);
          Alert.alert(t('error'), t('failedSubmitStockUpdate'));
          return;
        }
        Alert.alert(t('success'), t('stockUpdateSubmitted'));
        await loadPendingUpdates();
        triggerBackgroundSync();
        return;
      }

      if (!isNearWarehouse) {
        Alert.alert(t('error'), t('geofencedLockWarning'));
        return;
      }

      const [, error] = await guardAsync(
        adjustStockRecord(
          item.id,
          delta,
          INVENTORY_STATUS.PENDING_APPROVAL,
          Date.now(),
        ),
      );

      if (error) {
        console.error('Failed to update stock:', error);
        Alert.alert(t('error'), t('couldNotUpdateStock'));
        return;
      }
      await loadInventory();
      triggerBackgroundSync();
    },
    [activeRep, adjustStockRecord, loadInventory, loadPendingUpdates, t],
  );

  const handleAddItem = useCallback(
    async (
      selectedWarehouseId: string,
      geoLockingDisabled: boolean,
      isNearWarehouse: boolean,
    ): Promise<void> => {
      if (!selectedWarehouseId) {
        Alert.alert(t('error'), t('selectWarehouseFirstError'));
        return;
      }
      if (!sku || !name || !unitPrice) {
        Alert.alert(t('validationError'), t('validationErrorFillFields'));
        return;
      }

      const { isValid, value: parsedPrice } = parsePositivePrice(unitPrice);
      const parsedStock = parseStockQuantity(initialStock);

      if (!isValid) {
        Alert.alert(t('validationError'), t('validationErrorValidPrice'));
        return;
      }

      if (geoLockingDisabled) {
        setIsAdding(true);
        const now = Date.now();
        const [, error] = await guardAsync(
          database.insert(sqliteSchema.pending_inventory_updates).values({
            id: generatePendingUpdateId(),
            type: PENDING_UPDATE_TYPE.NEW_SKU,
            item_id: null,
            location_id: selectedWarehouseId,
            quantity_delta: parsedStock,
            sku,
            name,
            unit_price: parsedPrice,
            category,
            submitted_by: activeRep.username || activeRep.name,
            status: PENDING_UPDATE_STATUS.PENDING,
            created_at: now,
            updated_at: now,
          }),
        );
        setIsAdding(false);
        if (error) {
          console.error('Failed to submit pending SKU:', error);
          Alert.alert(t('error'), t('failedSubmitPendingSku'));
          return;
        }
        resetNewSkuForm();
        Alert.alert(t('success'), t('skuRegistrationSubmitted'));
        await loadPendingUpdates();
        triggerBackgroundSync();
        return;
      }

      if (!isNearWarehouse) {
        Alert.alert(t('error'), t('skuRegLockedWarehouse'));
        return;
      }

      setIsAdding(true);
      const [, error] = await guardAsync(
        insertItemWithStock(
          sku,
          name,
          parsedPrice,
          category,
          parsedStock,
          INVENTORY_STATUS.PENDING_APPROVAL,
          Date.now(),
        ),
      );
      setIsAdding(false);

      if (error) {
        console.error('Failed to add item:', error);
        Alert.alert(t('error'), t('couldNotCreateSku'));
        return;
      }
      const createdName = name;
      resetNewSkuForm();
      Alert.alert(
        t('success'),
        t('productCreatedSuccess').replace('{name}', createdName),
      );
      await loadInventory();
    },
    [
      activeRep,
      category,
      initialStock,
      insertItemWithStock,
      loadInventory,
      loadPendingUpdates,
      name,
      resetNewSkuForm,
      sku,
      t,
      unitPrice,
    ],
  );

  const handleApproveUpdate = useCallback(
    async (
      update: PendingInventoryUpdateRow,
      selectedWarehouseId: string,
      isNearWarehouse: boolean,
    ): Promise<void> => {
      if (!isManager) {
        if (selectedWarehouseId !== update.location_id || !isNearWarehouse) {
          Alert.alert(
            t('verificationRequired'),
            t('whVerificationRequiredMsg'),
          );
          return;
        }
      }

      const now = Date.now();
      const [, error] = await guardAsync(
        (async () => {
          if (update.type === PENDING_UPDATE_TYPE.STOCK_ADJUSTMENT) {
            await adjustStockRecord(
              update.item_id ?? '',
              update.quantity_delta || 0,
              INVENTORY_STATUS.AVAILABLE,
              now,
            );
          } else if (update.type === PENDING_UPDATE_TYPE.NEW_SKU) {
            await insertItemWithStock(
              update.sku || '',
              update.name || '',
              update.unit_price || 0,
              update.category || '',
              update.quantity_delta || 0,
              INVENTORY_STATUS.AVAILABLE,
              now,
            );
          }

          await database
            .update(sqliteSchema.pending_inventory_updates)
            .set({
              status: PENDING_UPDATE_STATUS.APPROVED,
              updated_at: now,
            })
            .where(eq(sqliteSchema.pending_inventory_updates.id, update.id));
        })(),
      );

      if (error) {
        console.error('Failed to approve update:', error);
        Alert.alert(t('error'), t('failedApproveUpdate'));
        return;
      }
      Alert.alert(t('approvedSuccess'), t('inventoryApprovedApplied'));
      await loadInventory();
      triggerBackgroundSync();
    },
    [adjustStockRecord, insertItemWithStock, isManager, loadInventory, t],
  );

  const handleRejectUpdate = useCallback(
    async (update: PendingInventoryUpdateRow): Promise<void> => {
      const [, error] = await guardAsync(
        database
          .update(sqliteSchema.pending_inventory_updates)
          .set({
            status: PENDING_UPDATE_STATUS.REJECTED,
            updated_at: Date.now(),
          })
          .where(eq(sqliteSchema.pending_inventory_updates.id, update.id)),
      );
      if (error) {
        console.error('Failed to reject update:', error);
        Alert.alert(t('error'), t('failedRejectUpdate'));
        return;
      }
      Alert.alert(t('rejectedSuccess'), t('updateRejectedMsg'));
      await loadPendingUpdates();
      triggerBackgroundSync();
    },
    [loadPendingUpdates, t],
  );

  const startEditUpdate = useCallback(
    (update: PendingInventoryUpdateRow): void => {
      setEditingUpdateId(update.id);
      setEditQtyDelta(String(update.quantity_delta || 0));
      setEditSku(update.sku || '');
      setEditName(update.name || '');
      setEditPrice(String(update.unit_price || 0));
      setEditCategory(update.category || '');
    },
    [],
  );

  const cancelEdit = useCallback(() => setEditingUpdateId(null), []);

  const handleSaveEdit = useCallback(
    async (update: PendingInventoryUpdateRow): Promise<void> => {
      const { isValid: isPriceValid, value: parsedPrice } =
        parsePositivePrice(editPrice);
      const parsedQty = parseInt(editQtyDelta, 10);

      if (update.type === PENDING_UPDATE_TYPE.NEW_SKU) {
        if (!editSku || !editName || !editPrice) {
          Alert.alert(t('validationErrorTitle'), t('skuNamePriceRequired'));
          return;
        }
        if (!isPriceValid) {
          Alert.alert(t('validationErrorTitle'), t('validPriceRequired'));
          return;
        }
      }

      if (isNaN(parsedQty)) {
        Alert.alert(t('validationErrorTitle'), t('validQtyRequired'));
        return;
      }

      const [, error] = await guardAsync(
        database
          .update(sqliteSchema.pending_inventory_updates)
          .set({
            sku: editSku || null,
            name: editName || null,
            unit_price: isNaN(parsedPrice) ? null : parsedPrice,
            quantity_delta: parsedQty,
            category: editCategory || null,
            updated_at: Date.now(),
          })
          .where(eq(sqliteSchema.pending_inventory_updates.id, update.id)),
      );
      if (error) {
        console.error('Failed to save edited update:', error);
        Alert.alert(t('errorTitle'), t('failedSaveEditUpdate'));
        return;
      }

      setEditingUpdateId(null);
      await loadPendingUpdates();
      Alert.alert(t('successTitle'), t('saveChanges'));
      triggerBackgroundSync();
    },
    [
      editCategory,
      editName,
      editPrice,
      editQtyDelta,
      editSku,
      loadPendingUpdates,
      t,
    ],
  );

  const newSkuForm: IntakeNewSkuForm = {
    sku,
    setSku,
    name,
    setName,
    unitPrice,
    setUnitPrice,
    category,
    setCategory,
    initialStock,
    setInitialStock,
    isAdding,
  };

  const pendingEdit: IntakePendingEdit = {
    editingUpdateId,
    editQtyDelta,
    editSku,
    editName,
    editPrice,
    editCategory,
    setEditQtyDelta,
    setEditSku,
    setEditName,
    setEditPrice,
    setEditCategory,
    startEditUpdate,
    cancelEdit,
  };

  return {
    items,
    warehouses,
    pendingUpdates,
    loading,
    isManager,
    loadInventory,
    newSkuForm,
    pendingEdit,
    handleUpdateStock,
    handleAddItem,
    handleApproveUpdate,
    handleRejectUpdate,
    handleSaveEdit,
  };
};
