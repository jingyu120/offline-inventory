import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Switch,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  TextField,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { InboundForecastList } from '../components/InboundForecastList';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';
import { database } from '../../../core/database/database';
import {
  Item,
  ItemStock,
  guardAsync,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import { mapItem, mapItemStock } from '../../../core/data/repositories';
import { eq } from 'drizzle-orm';
import {
  Package,
  RefreshCw,
  Check,
  X,
  Edit2,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import { useAuth } from '../../../core/auth/auth';
import * as Location from 'expo-location';
import {
  calculateDistance,
  GEOFENCE_RADIUS_INTAKE_METERS,
} from '../../../core/utils/geo';
import { CompetitorInsightForm } from '../components/CompetitorInsightForm';
import { MasterCatalogItem } from '../components/MasterCatalogItem';
import { INVENTORY_STATUS } from '../../../config/appConfig';

const WAREHOUSE_COORDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  'loc-yangon-wh': { latitude: 16.8661, longitude: 96.1951 },
  'loc-mandalay-wh': { latitude: 21.9754, longitude: 96.0838 },
};

interface ExtendedItem extends Item {
  stockQty: number;
}

export function IntakeScreen() {
  const { t } = useTranslation();
  const { activeRep } = useAuth();
  const theme = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating new items
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('Beverage');
  const [initialStock, setInitialStock] = useState('100');
  const [isAdding, setIsAdding] = useState(false);

  // Geo-locking states
  const [warehouses, setWarehouses] = useState<$Any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isNearWarehouse, setIsNearWarehouse] = useState<boolean>(false);
  const [geoLockingDisabled, setGeoLockingDisabled] = useState<boolean>(false);

  // Pending updates queue states
  const [pendingUpdates, setPendingUpdates] = useState<$Any[]>([]);

  // Editing a pending update state
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editQtyDelta, setEditQtyDelta] = useState<string>('');
  const [editSku, setEditSku] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  const checkGeofence = async (warehouseId: string) => {
    if (!warehouseId) {
      setIsNearWarehouse(false);
      return;
    }
    try {
      const coords = WAREHOUSE_COORDS[warehouseId];
      if (!coords) {
        setIsNearWarehouse(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('locationPermissionRequired'));
        setIsNearWarehouse(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const dist = calculateDistance(
        coords.latitude,
        coords.longitude,
        loc.coords.latitude,
        loc.coords.longitude,
      );

      if (dist <= GEOFENCE_RADIUS_INTAKE_METERS) {
        setIsNearWarehouse(true);
      } else {
        setIsNearWarehouse(false);
        Alert.alert(
          t('geofencedLockActive'),
          t('geofenceDistanceMsg')
            .replace('{meters}', GEOFENCE_RADIUS_INTAKE_METERS.toString())
            .replace('{distance}', Math.round(dist).toString()),
        );
      }
    } catch (err: $Any) {
      console.error(err);
      setIsNearWarehouse(false);
      Alert.alert(t('error'), t('failedGetCoordinates'));
    }
  };

  const loadPendingUpdates = async () => {
    try {
      const list = await database
        .select()
        .from(sqliteSchema.pending_inventory_updates)
        .where(eq(sqliteSchema.pending_inventory_updates.status, 'PENDING'));
      setPendingUpdates(list);
    } catch (e) {
      console.error('Failed to load pending updates:', e);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const itemsList = await database.select().from(sqliteSchema.items);
      const stocksList = await database.select().from(sqliteSchema.item_stocks);
      const warehousesList = await database
        .select()
        .from(sqliteSchema.stock_locations);

      const mappedItems = itemsList.map(mapItem);
      const mappedStocks = stocksList.map(mapItemStock);

      const stocksMap = new Map<string, ItemStock>(
        mappedStocks.map((s: ItemStock) => [s.itemId, s]),
      );

      const extended = mappedItems.map((item: Item) => {
        const stockRecord = stocksMap.get(item.id);
        const itemObj = item as ExtendedItem;
        itemObj.stockQty = stockRecord ? stockRecord.quantity : 0;
        return itemObj;
      });

      setItems(extended);
      setWarehouses(warehousesList);
      await loadPendingUpdates();
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleUpdateStock = async (item: ExtendedItem, delta: number) => {
    if (!selectedWarehouseId) {
      Alert.alert(t('error'), t('selectWarehouseFirstError'));
      return;
    }

    if (geoLockingDisabled) {
      // Create pending approval record instead of updating stock directly
      const updateId = `pending-update-${Math.random().toString(36).substring(2, 15)}`;
      const now = Date.now();
      try {
        await database.insert(sqliteSchema.pending_inventory_updates).values({
          id: updateId,
          type: 'STOCK_ADJUSTMENT',
          item_id: item.id,
          location_id: selectedWarehouseId,
          quantity_delta: delta,
          submitted_by: activeRep.username || activeRep.name,
          status: 'PENDING',
          created_at: now,
          updated_at: now,
        });
        Alert.alert(t('success'), t('stockUpdateSubmitted'));
        await loadPendingUpdates();
      } catch (e) {
        console.error('Failed to submit pending update:', e);
        Alert.alert(t('error'), t('failedSubmitStockUpdate'));
      }
      return;
    }

    if (!isNearWarehouse) {
      Alert.alert(t('error'), t('geofencedLockWarning'));
      return;
    }

    const [, error] = await guardAsync(
      (async () => {
        const now = Date.now();
        const stockRecords = await database
          .select()
          .from(sqliteSchema.item_stocks)
          .where(eq(sqliteSchema.item_stocks.item_id, item.id));
        const record = stockRecords[0];

        if (record) {
          await database
            .update(sqliteSchema.item_stocks)
            .set({
              quantity: Math.max(0, record.quantity + delta),
              inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
              updated_at: now,
            })
            .where(eq(sqliteSchema.item_stocks.id, record.id));
        } else {
          const stockId = Math.random().toString(36).substring(2, 15);
          await database.insert(sqliteSchema.item_stocks).values({
            id: stockId,
            item_id: item.id,
            quantity: Math.max(0, delta),
            inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
            created_at: now,
            updated_at: now,
          });
        }
      })(),
    );

    if (error) {
      console.error('Failed to update stock:', error);
      Alert.alert(t('error'), t('couldNotUpdateStock'));
    } else {
      await loadInventory();
    }
  };

  const handleAddItem = async () => {
    if (!selectedWarehouseId) {
      Alert.alert(t('error'), t('selectWarehouseFirstError'));
      return;
    }
    if (!sku || !name || !unitPrice) {
      Alert.alert(t('validationError'), t('validationErrorFillFields'));
      return;
    }

    const parsedPrice = parseFloat(unitPrice);
    const parsedStock = parseInt(initialStock, 10) || 0;

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(t('validationError'), t('validationErrorValidPrice'));
      return;
    }

    if (geoLockingDisabled) {
      // Create pending approval record instead of inserting item directly
      setIsAdding(true);
      try {
        const updateId = `pending-update-${Math.random().toString(36).substring(2, 15)}`;
        const now = Date.now();
        await database.insert(sqliteSchema.pending_inventory_updates).values({
          id: updateId,
          type: 'NEW_SKU',
          item_id: null,
          location_id: selectedWarehouseId,
          quantity_delta: parsedStock,
          sku: sku,
          name: name,
          unit_price: parsedPrice,
          category: category,
          submitted_by: activeRep.username || activeRep.name,
          status: 'PENDING',
          created_at: now,
          updated_at: now,
        });
        setSku('');
        setName('');
        setUnitPrice('');
        setInitialStock('100');
        Alert.alert(t('success'), t('skuRegistrationSubmitted'));
        await loadPendingUpdates();
      } catch (e) {
        console.error('Failed to submit pending SKU:', e);
        Alert.alert(t('error'), t('failedSubmitPendingSku'));
      } finally {
        setIsAdding(false);
      }
      return;
    }

    if (!isNearWarehouse) {
      Alert.alert(t('error'), t('skuRegLockedWarehouse'));
      return;
    }

    setIsAdding(true);
    const [, error] = await guardAsync(
      (async () => {
        const now = Date.now();
        const newItemId = Math.random().toString(36).substring(2, 15);
        const newStockId = Math.random().toString(36).substring(2, 15);

        // Insert new item
        await database.insert(sqliteSchema.items).values({
          id: newItemId,
          sku: sku,
          name: name,
          unit_price: parsedPrice,
          category: category,
          inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
          created_at: now,
          updated_at: now,
        });

        // Insert new stock
        await database.insert(sqliteSchema.item_stocks).values({
          id: newStockId,
          item_id: newItemId,
          quantity: Math.max(0, parsedStock),
          inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
          created_at: now,
          updated_at: now,
        });
      })(),
    );

    setIsAdding(false);
    if (error) {
      console.error('Failed to add item:', error);
      Alert.alert(t('error'), t('couldNotCreateSku'));
    } else {
      setSku('');
      setName('');
      setUnitPrice('');
      setInitialStock('100');
      Alert.alert(
        t('success'),
        t('productCreatedSuccess').replace('{name}', name),
      );
      await loadInventory();
    }
  };

  const handleApproveUpdate = async (update: $Any) => {
    const isManagerOrAdmin =
      activeRep.role === 'manager' || activeRep.role === 'admin';
    if (!isManagerOrAdmin) {
      // Standard rep needs to be near the specific warehouse to approve
      if (selectedWarehouseId !== update.location_id || !isNearWarehouse) {
        Alert.alert(t('verificationRequired'), t('whVerificationRequiredMsg'));
        return;
      }
    }

    const now = Date.now();
    const [, error] = await guardAsync(
      (async () => {
        if (update.type === 'STOCK_ADJUSTMENT') {
          const stockRecords = await database
            .select()
            .from(sqliteSchema.item_stocks)
            .where(eq(sqliteSchema.item_stocks.item_id, update.item_id));
          const record = stockRecords[0];

          if (record) {
            await database
              .update(sqliteSchema.item_stocks)
              .set({
                quantity: Math.max(
                  0,
                  record.quantity + (update.quantity_delta || 0),
                ),
                inventory_status: INVENTORY_STATUS.AVAILABLE,
                updated_at: now,
              })
              .where(eq(sqliteSchema.item_stocks.id, record.id));
          } else {
            const stockId = Math.random().toString(36).substring(2, 15);
            await database.insert(sqliteSchema.item_stocks).values({
              id: stockId,
              item_id: update.item_id,
              quantity: Math.max(0, update.quantity_delta || 0),
              inventory_status: INVENTORY_STATUS.AVAILABLE,
              created_at: now,
              updated_at: now,
            });
          }
        } else if (update.type === 'NEW_SKU') {
          const newItemId = Math.random().toString(36).substring(2, 15);
          const newStockId = Math.random().toString(36).substring(2, 15);

          // Insert new item
          await database.insert(sqliteSchema.items).values({
            id: newItemId,
            sku: update.sku || '',
            name: update.name || '',
            unit_price: update.unit_price || 0,
            category: update.category || '',
            inventory_status: INVENTORY_STATUS.AVAILABLE,
            created_at: now,
            updated_at: now,
          });

          // Insert new stock
          await database.insert(sqliteSchema.item_stocks).values({
            id: newStockId,
            item_id: newItemId,
            quantity: Math.max(0, update.quantity_delta || 0),
            inventory_status: INVENTORY_STATUS.AVAILABLE,
            created_at: now,
            updated_at: now,
          });
        }

        // Set pending update to APPROVED
        await database
          .update(sqliteSchema.pending_inventory_updates)
          .set({
            status: 'APPROVED',
            updated_at: now,
          })
          .where(eq(sqliteSchema.pending_inventory_updates.id, update.id));
      })(),
    );

    if (error) {
      console.error('Failed to approve update:', error);
      Alert.alert(t('error'), t('failedApproveUpdate'));
    } else {
      Alert.alert(t('approvedSuccess'), t('inventoryApprovedApplied'));
      await loadInventory();
    }
  };

  const handleRejectUpdate = async (update: $Any) => {
    try {
      await database
        .update(sqliteSchema.pending_inventory_updates)
        .set({
          status: 'REJECTED',
          updated_at: Date.now(),
        })
        .where(eq(sqliteSchema.pending_inventory_updates.id, update.id));
      Alert.alert(t('rejectedSuccess'), t('updateRejectedMsg'));
      await loadPendingUpdates();
    } catch (e) {
      console.error('Failed to reject update:', e);
      Alert.alert(t('error'), t('failedRejectUpdate'));
    }
  };

  const startEditUpdate = (update: $Any) => {
    setEditingUpdateId(update.id);
    setEditQtyDelta(String(update.quantity_delta || 0));
    setEditSku(update.sku || '');
    setEditName(update.name || '');
    setEditPrice(String(update.unit_price || 0));
    setEditCategory(update.category || '');
  };

  const handleSaveEdit = async (update: $Any) => {
    const parsedPrice = parseFloat(editPrice);
    const parsedQty = parseInt(editQtyDelta, 10);

    if (update.type === 'NEW_SKU') {
      if (!editSku || !editName || !editPrice) {
        Alert.alert(t('validationErrorTitle'), t('skuNamePriceRequired'));
        return;
      }
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        Alert.alert(t('validationErrorTitle'), t('validPriceRequired'));
        return;
      }
    }

    if (isNaN(parsedQty)) {
      Alert.alert(t('validationErrorTitle'), t('validQtyRequired'));
      return;
    }

    try {
      await database
        .update(sqliteSchema.pending_inventory_updates)
        .set({
          sku: editSku || null,
          name: editName || null,
          unit_price: isNaN(parsedPrice) ? null : parsedPrice,
          quantity_delta: parsedQty,
          category: editCategory || null,
          updated_at: Date.now(),
        })
        .where(eq(sqliteSchema.pending_inventory_updates.id, update.id));

      setEditingUpdateId(null);
      await loadPendingUpdates();
      Alert.alert(t('successTitle'), t('saveChanges'));
    } catch (e) {
      console.error('Failed to save edited update:', e);
      Alert.alert(t('errorTitle'), t('failedSaveEditUpdate'));
    }
  };

  if (loading && items.length === 0) {
    return (
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        bg="mainBackground"
      >
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text variant="body" mt="s">
          {t('loading')}
        </Text>
      </Box>
    );
  }

  const isManagerOrAdmin =
    activeRep.role === 'manager' || activeRep.role === 'admin';

  return (
    <Box flex={1} bg="mainBackground" p="m">
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Box>
          <Text variant="header" fontSize={24}>
            📦 {t('warehouseSkuIntake')}
          </Text>
          <Text variant="bodySecondary">{t('katanaSub')}</Text>
        </Box>
        <TouchableOpacity onPress={loadInventory} style={{ padding: 8 }}>
          <RefreshCw size={18} stroke="#5A31F4" />
        </TouchableOpacity>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Settings & Warehouse Selection Card */}
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Box
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box width={isDesktop ? '60%' : '100%'} mb="s">
              <DropdownSelector
                label={t('selectWarehouseIntake')}
                selectedValue={selectedWarehouseId}
                onValueChange={(val) => {
                  setSelectedWarehouseId(val);
                  checkGeofence(val);
                }}
                options={warehouses.map((w) => ({
                  label: w.name,
                  value: w.id,
                }))}
                placeholder={t('chooseWarehousePlaceholder')}
              />
            </Box>

            {/* Geo-locking Toggle Switch */}
            <Box
              flexDirection="row"
              alignItems="center"
              mb="s"
              mt={isDesktop ? 'm' : 's'}
              bg="secondaryBackground"
              p="s"
              borderRadius="s"
              borderWidth={1}
              borderColor="borderColor"
            >
              <Box mr="m">
                <Text variant="body" fontWeight="bold">
                  {t('disableGeoLocking')}
                </Text>
                <Text variant="bodySecondary">{t('requiresApproval')}</Text>
              </Box>
              <Switch
                value={geoLockingDisabled}
                onValueChange={setGeoLockingDisabled}
                trackColor={{ false: '#767577', true: '#5A31F4' }}
                thumbColor={geoLockingDisabled ? '#fff' : '#f4f3f4'}
              />
            </Box>
          </Box>

          {selectedWarehouseId ? (
            geoLockingDisabled ? (
              <Box
                mt="s"
                p="s"
                bg="warningBg"
                borderRadius="s"
                borderColor="warning"
                borderWidth={1}
                flexDirection="row"
                alignItems="center"
              >
                <Unlock
                  size={18}
                  color={theme.colors.warningText}
                  style={{ marginRight: 8 }}
                />
                <Text
                  variant="bodySecondary"
                  color="warningText"
                  fontWeight="bold"
                >
                  {t('geoLockingDisabledWarning')}
                </Text>
              </Box>
            ) : !isNearWarehouse ? (
              <Box
                mt="s"
                p="s"
                bg="dangerBg"
                borderRadius="s"
                borderColor="danger"
                borderWidth={1}
              >
                <Box flexDirection="row" alignItems="center" mb="s">
                  <Lock
                    size={18}
                    color={theme.colors.dangerText}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="bodySecondary"
                    color="dangerText"
                    fontWeight="bold"
                  >
                    {t('geofencedLockWarning')}
                  </Text>
                </Box>
                <Box alignItems="flex-start">
                  <Button
                    title={t('simulateNearbyLocation')}
                    onPress={() => setIsNearWarehouse(true)}
                    variant="secondary"
                  />
                </Box>
              </Box>
            ) : (
              <Box
                mt="s"
                p="s"
                bg="successBg"
                borderRadius="s"
                borderColor="success"
                borderWidth={1}
                flexDirection="row"
                alignItems="center"
              >
                <Check
                  size={18}
                  color={theme.colors.successText}
                  style={{ marginRight: 8 }}
                />
                <Text
                  variant="bodySecondary"
                  color="successText"
                  fontWeight="bold"
                >
                  {t('locationVerifiedSuccess')}
                </Text>
              </Box>
            )
          ) : (
            <Box
              mt="s"
              p="s"
              bg="warningBg"
              borderRadius="s"
              borderColor="warning"
              borderWidth={1}
            >
              <Text
                variant="bodySecondary"
                color="warningText"
                fontWeight="bold"
              >
                {t('pleaseSelectWarehouseIntake')}
              </Text>
            </Box>
          )}
        </Card>

        {/* Inbound Forecast List */}
        <InboundForecastList />

        {/* Pending Approvals Queue Panel */}
        {pendingUpdates.length > 0 && (
          <Card
            p="m"
            mb="m"
            borderColor="borderColor"
            borderWidth={1}
            bg="secondaryBackground"
          >
            <Box flexDirection="row" alignItems="center" mb="m">
              <RefreshCw
                size={18}
                stroke={theme.colors.warningText}
                style={{ marginRight: 8 }}
              />
              <Text variant="title">
                {t('pendingApprovalsQueueCount').replace(
                  '{count}',
                  pendingUpdates.length.toString(),
                )}
              </Text>
            </Box>

            {pendingUpdates.map((update) => {
              const wh = warehouses.find((w) => w.id === update.location_id);
              const whName = wh ? wh.name : 'Unknown Warehouse';
              const targetItem = items.find((i) => i.id === update.item_id);
              const isEditingThis = editingUpdateId === update.id;

              // Verify standard rep geofence rules
              const canRepApprove =
                selectedWarehouseId === update.location_id && isNearWarehouse;
              const hasApprovePermission = isManagerOrAdmin || canRepApprove;

              return (
                <Card
                  key={update.id}
                  p="m"
                  mb="s"
                  bg="mainBackground"
                  borderColor="borderColor"
                  borderWidth={1}
                >
                  {isEditingThis ? (
                    // Editing Mode (Manager/Admin Only)
                    <Box>
                      <Text variant="body" fontWeight="bold" mb="s">
                        {t('editingPendingRequest')}
                      </Text>
                      {update.type === 'NEW_SKU' ? (
                        <Box>
                          <TextField
                            label={t('skuCode')}
                            value={editSku}
                            onChangeText={setEditSku}
                          />
                          <TextField
                            label={t('productName')}
                            value={editName}
                            onChangeText={setEditName}
                          />
                          <TextField
                            label={t('priceMmk')}
                            value={editPrice}
                            onChangeText={setEditPrice}
                            keyboardType="numeric"
                          />
                          <TextField
                            label={t('category')}
                            value={editCategory}
                            onChangeText={setEditCategory}
                          />
                          <TextField
                            label={t('initialStockQty')}
                            value={editQtyDelta}
                            onChangeText={setEditQtyDelta}
                            keyboardType="numeric"
                          />
                        </Box>
                      ) : (
                        <Box>
                          <Text variant="body" mb="s">
                            {t('item')}: {targetItem?.name || t('unknownItem')}
                          </Text>
                          <TextField
                            label={t('quantityAdjustment')}
                            value={editQtyDelta}
                            onChangeText={setEditQtyDelta}
                            keyboardType="numeric"
                          />
                        </Box>
                      )}
                      <Box
                        flexDirection="row"
                        justifyContent="flex-end"
                        gap="s"
                        mt="s"
                      >
                        <Button
                          title={t('cancel')}
                          onPress={() => setEditingUpdateId(null)}
                          variant="secondary"
                        />
                        <Button
                          title={t('saveChanges')}
                          onPress={() => handleSaveEdit(update)}
                          variant="primary"
                        />
                      </Box>
                    </Box>
                  ) : (
                    // Regular Display Mode
                    <Box>
                      <Box
                        flexDirection="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb="xs"
                      >
                        <Box>
                          <Text variant="body" fontWeight="bold">
                            {update.type === 'NEW_SKU'
                              ? t('newSkuSubmitted').replace(
                                  '{name}',
                                  update.name || '',
                                )
                              : t('stockAdjustmentSubmitted').replace(
                                  '{name}',
                                  targetItem?.name || t('unknownItem'),
                                )}
                          </Text>
                          <Text variant="bodySecondary" fontSize={11}>
                            {t('submittedByWarehouse')
                              .replace('{rep}', update.submitted_by)
                              .replace('{warehouse}', whName)}
                          </Text>
                        </Box>
                        <Box bg="warningBg" px="s" py="xs" borderRadius="s">
                          <Text
                            variant="bodySecondary"
                            color="warningText"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            {t('pending')}
                          </Text>
                        </Box>
                      </Box>

                      <Box
                        flexDirection="row"
                        flexWrap="wrap"
                        gap="m"
                        mt="s"
                        borderTopWidth={1}
                        borderColor="borderColor"
                        pt="s"
                      >
                        {update.type === 'NEW_SKU' ? (
                          <>
                            <Text variant="bodySecondary" fontSize={12}>
                              {t('sku')}:{' '}
                              <Text fontWeight="bold">{update.sku}</Text>
                            </Text>
                            <Text variant="bodySecondary" fontSize={12}>
                              {t('price')}:{' '}
                              <Text fontWeight="bold">
                                {t('priceFormatted').replace(
                                  '{price}',
                                  update.unit_price?.toLocaleString() || '0',
                                )}
                              </Text>
                            </Text>
                            <Text variant="bodySecondary" fontSize={12}>
                              {t('qty')}:{' '}
                              <Text fontWeight="bold">
                                {update.quantity_delta}
                              </Text>
                            </Text>
                          </>
                        ) : (
                          <Text variant="bodySecondary" fontSize={12}>
                            {t('delta')}{' '}
                            <Text
                              fontWeight="bold"
                              color={
                                update.quantity_delta >= 0
                                  ? 'successText'
                                  : 'dangerText'
                              }
                            >
                              {update.quantity_delta >= 0
                                ? `+${update.quantity_delta}`
                                : update.quantity_delta}
                            </Text>
                          </Text>
                        )}
                      </Box>

                      {/* Approval Actions */}
                      <Box
                        flexDirection="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mt="m"
                      >
                        <Box>
                          {!hasApprovePermission && (
                            <Text
                              variant="bodySecondary"
                              color="dangerText"
                              fontSize={11}
                              fontWeight="bold"
                            >
                              {t('geofencedLockGoTo').replace(
                                '{warehouse}',
                                whName,
                              )}
                            </Text>
                          )}
                        </Box>
                        <Box flexDirection="row" gap="s">
                          {isManagerOrAdmin && (
                            <TouchableOpacity
                              onPress={() => startEditUpdate(update)}
                              style={{
                                backgroundColor: theme.colors.secondaryButton,
                                padding: 8,
                                borderRadius: 6,
                              }}
                            >
                              <Edit2
                                size={16}
                                stroke={theme.colors.secondaryButtonText}
                              />
                            </TouchableOpacity>
                          )}
                          {isManagerOrAdmin && (
                            <TouchableOpacity
                              onPress={() => handleRejectUpdate(update)}
                              style={{
                                backgroundColor: '#FEE2E2',
                                padding: 8,
                                borderRadius: 6,
                              }}
                            >
                              <X size={16} stroke="#EF4444" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleApproveUpdate(update)}
                            disabled={!hasApprovePermission}
                            style={{
                              backgroundColor: hasApprovePermission
                                ? '#D1FAE5'
                                : '#E2E8F0',
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <Check
                              size={16}
                              stroke={
                                hasApprovePermission ? '#10B981' : '#94A3B8'
                              }
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              variant="body"
                              fontSize={12}
                              fontWeight="bold"
                              style={{
                                color: hasApprovePermission
                                  ? '#059669'
                                  : '#94A3B8',
                              }}
                            >
                              {t('approve')}
                            </Text>
                          </TouchableOpacity>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Card>
              );
            })}
          </Card>
        )}

        {/* New Item Form Card */}
        <Box
          style={{ opacity: geoLockingDisabled || isNearWarehouse ? 1 : 0.5 }}
        >
          <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
            <Text variant="title" mb="m">
              ➕ {t('registerNewSku')}
            </Text>

            <Box
              flexDirection="row"
              flexWrap="wrap"
              style={{ marginHorizontal: -8 }}
            >
              <Box width={isDesktop ? '50%' : '100%'} px="s">
                <TextField
                  label={t('skuCode')}
                  value={sku}
                  onChangeText={setSku}
                  placeholder={t('skuPlaceholder')}
                />
              </Box>

              <Box width={isDesktop ? '50%' : '100%'} px="s">
                <TextField
                  label={t('productName')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('productNamePlaceholder')}
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('priceMmk')}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder={t('pricePlaceholder')}
                  keyboardType="numeric"
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('category')}
                  value={category}
                  onChangeText={setCategory}
                  placeholder={t('categoryPlaceholder')}
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('initialStockQty')}
                  value={initialStock}
                  onChangeText={setInitialStock}
                  placeholder={t('qtyPlaceholder')}
                  keyboardType="numeric"
                />
              </Box>
            </Box>

            <Box mt="m" alignItems="flex-end">
              <Button
                title={
                  isAdding
                    ? t('addingSku')
                    : geoLockingDisabled
                      ? t('submitSkuApproval')
                      : t('addSkuToCatalog')
                }
                onPress={handleAddItem}
                variant="primary"
                disabled={isAdding || (!geoLockingDisabled && !isNearWarehouse)}
              />
            </Box>
          </Card>
        </Box>

        {/* Competitor Intelligence Capture Card */}
        <CompetitorInsightForm isDesktop={isDesktop} />

        {/* Master Catalog Table Grid */}
        <Text variant="title" mb="s">
          📦 {t('masterStockLevels')}
        </Text>
        {items.map((item) => {
          const controlsActive = geoLockingDisabled || isNearWarehouse;
          return (
            <MasterCatalogItem
              key={item.id}
              item={item}
              controlsActive={controlsActive}
              onUpdateStock={handleUpdateStock}
            />
          );
        })}

        {items.length === 0 && (
          <Box p="xl" alignItems="center">
            <Text variant="bodySecondary">{t('noProductsInCatalog')}</Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}

export default IntakeScreen;
