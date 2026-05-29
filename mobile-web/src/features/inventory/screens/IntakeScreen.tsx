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
import { ImageAnnotationModal } from '../components/ImageAnnotationModal';
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
  Plus,
  Minus,
  Package,
  Tag,
  Layers,
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';

const WAREHOUSE_COORDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  'loc-yangon-wh': { latitude: 16.8661, longitude: 96.1951 },
  'loc-mandalay-wh': { latitude: 21.9754, longitude: 96.0838 },
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
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

  // Competitor insights form states
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compPhotoUri, setCompPhotoUri] = useState<string | null>(null);
  const [isSavingComp, setIsSavingComp] = useState(false);

  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [pendingAnnotationUri, setPendingAnnotationUri] = useState<
    string | null
  >(null);

  // Geo-locking states
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isNearWarehouse, setIsNearWarehouse] = useState<boolean>(false);
  const [geoLockingDisabled, setGeoLockingDisabled] = useState<boolean>(false);

  // Pending updates queue states
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);

  // Editing a pending update state
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editQtyDelta, setEditQtyDelta] = useState<string>('');
  const [editSku, setEditSku] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  const handleInterceptPhoto = (uri: string) => {
    setPendingAnnotationUri(uri);
    setAnnotationModalVisible(true);
  };

  const handlePickCompetitorImage = async (useCamera = false) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        t('permissionRequired') || 'Permission Required',
        useCamera
          ? 'Camera permissions are required to snap a photo.'
          : t('cameraRollPermissionDesc') || 'Need library permissions.',
      );
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 1,
        });

    if (
      !pickerResult.canceled &&
      pickerResult.assets &&
      pickerResult.assets.length > 0
    ) {
      const uri = pickerResult.assets[0].uri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        handleInterceptPhoto(manipResult.uri);
      } catch (err) {
        console.error('Image compression failed for competitor insight', err);
        handleInterceptPhoto(uri);
      }
    }
  };

  const handleSaveCompetitorInsight = async () => {
    if (!compName || !compPrice) {
      Alert.alert(
        t('validationError') || 'Validation Error',
        'Please enter a competitive product name and street price.',
      );
      return;
    }

    const parsedPrice = parseFloat(compPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(
        t('validationError') || 'Validation Error',
        'Please enter a valid street price.',
      );
      return;
    }

    setIsSavingComp(true);
    try {
      const insightId = `insight-${Math.random().toString(36).substring(2, 15)}`;
      const now = Date.now();

      await database.insert(sqliteSchema.competitor_insights).values({
        id: insightId,
        product_name: compName,
        street_price: parsedPrice,
        photo_url: null,
        created_at: now,
        updated_at: now,
      });

      if (compPhotoUri) {
        await ImageUploadQueue.enqueueCompetitorInsightImage(
          insightId,
          compPhotoUri,
        );
      }

      setCompName('');
      setCompPrice('');
      setCompPhotoUri(null);

      Alert.alert(
        t('success') || 'Success',
        'Competitor street price insight logged successfully.',
      );
    } catch (e: any) {
      console.error('Failed to save competitor insight:', e);
      Alert.alert(
        t('error') || 'Error',
        'Failed to save competitor price insight.',
      );
    } finally {
      setIsSavingComp(false);
    }
  };

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
        Alert.alert(
          t('error') || 'Error',
          'Location permission is required to initialize the audit.',
        );
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

      if (dist <= 100) {
        setIsNearWarehouse(true);
      } else {
        setIsNearWarehouse(false);
        Alert.alert(
          'Geofenced Lock Active',
          `You must be within 100 meters of the selected warehouse to initialize this stock update. Current distance: ${Math.round(dist)}m.`,
        );
      }
    } catch (err: any) {
      console.error(err);
      setIsNearWarehouse(false);
      Alert.alert(
        t('error') || 'Error',
        'Failed to retrieve current device coordinates.',
      );
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
      Alert.alert('Error', 'Please select a warehouse first.');
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
        Alert.alert('Success', 'Stock update submitted for approval.');
        await loadPendingUpdates();
      } catch (e) {
        console.error('Failed to submit pending update:', e);
        Alert.alert('Error', 'Failed to submit stock update.');
      }
      return;
    }

    if (!isNearWarehouse) {
      Alert.alert(
        t('error') || 'Error',
        'Stock adjustment locked: You must be within 100 meters of the warehouse.',
      );
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
              inventory_status: 'PENDING_APPROVAL',
              updated_at: now,
            })
            .where(eq(sqliteSchema.item_stocks.id, record.id));
        } else {
          const stockId = Math.random().toString(36).substring(2, 15);
          await database.insert(sqliteSchema.item_stocks).values({
            id: stockId,
            item_id: item.id,
            quantity: Math.max(0, delta),
            inventory_status: 'PENDING_APPROVAL',
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
      Alert.alert('Error', 'Please select a warehouse first.');
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
        Alert.alert('Success', 'New SKU registration submitted for approval.');
        await loadPendingUpdates();
      } catch (e) {
        console.error('Failed to submit pending SKU:', e);
        Alert.alert('Error', 'Failed to submit SKU registration.');
      } finally {
        setIsAdding(false);
      }
      return;
    }

    if (!isNearWarehouse) {
      Alert.alert(
        t('error') || 'Error',
        'SKU registration locked: You must be within 100 meters of the warehouse.',
      );
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
          inventory_status: 'PENDING_APPROVAL',
          created_at: now,
          updated_at: now,
        });

        // Insert new stock
        await database.insert(sqliteSchema.item_stocks).values({
          id: newStockId,
          item_id: newItemId,
          quantity: Math.max(0, parsedStock),
          inventory_status: 'PENDING_APPROVAL',
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

  const handleApproveUpdate = async (update: any) => {
    const isManagerOrAdmin =
      activeRep.role === 'manager' || activeRep.role === 'admin';
    if (!isManagerOrAdmin) {
      // Standard rep needs to be near the specific warehouse to approve
      if (selectedWarehouseId !== update.location_id || !isNearWarehouse) {
        Alert.alert(
          'Verification Required',
          'You must select the corresponding warehouse and be verified nearby (within 100 meters) to approve this update.',
        );
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
                inventory_status: 'AVAILABLE',
                updated_at: now,
              })
              .where(eq(sqliteSchema.item_stocks.id, record.id));
          } else {
            const stockId = Math.random().toString(36).substring(2, 15);
            await database.insert(sqliteSchema.item_stocks).values({
              id: stockId,
              item_id: update.item_id,
              quantity: Math.max(0, update.quantity_delta || 0),
              inventory_status: 'AVAILABLE',
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
            inventory_status: 'AVAILABLE',
            created_at: now,
            updated_at: now,
          });

          // Insert new stock
          await database.insert(sqliteSchema.item_stocks).values({
            id: newStockId,
            item_id: newItemId,
            quantity: Math.max(0, update.quantity_delta || 0),
            inventory_status: 'AVAILABLE',
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
      Alert.alert('Error', 'Failed to approve update.');
    } else {
      Alert.alert(
        'Approved',
        'Inventory update approved and applied successfully.',
      );
      await loadInventory();
    }
  };

  const handleRejectUpdate = async (update: any) => {
    try {
      await database
        .update(sqliteSchema.pending_inventory_updates)
        .set({
          status: 'REJECTED',
          updated_at: Date.now(),
        })
        .where(eq(sqliteSchema.pending_inventory_updates.id, update.id));
      Alert.alert('Rejected', 'Update has been rejected.');
      await loadPendingUpdates();
    } catch (e) {
      console.error('Failed to reject update:', e);
      Alert.alert('Error', 'Failed to reject update.');
    }
  };

  const startEditUpdate = (update: any) => {
    setEditingUpdateId(update.id);
    setEditQtyDelta(String(update.quantity_delta || 0));
    setEditSku(update.sku || '');
    setEditName(update.name || '');
    setEditPrice(String(update.unit_price || 0));
    setEditCategory(update.category || '');
  };

  const handleSaveEdit = async (update: any) => {
    const parsedPrice = parseFloat(editPrice);
    const parsedQty = parseInt(editQtyDelta, 10);

    if (update.type === 'NEW_SKU') {
      if (!editSku || !editName || !editPrice) {
        Alert.alert('Validation Error', 'SKU, Name, and Price are required.');
        return;
      }
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid price.');
        return;
      }
    }

    if (isNaN(parsedQty)) {
      Alert.alert('Validation Error', 'Please enter a valid quantity.');
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
      Alert.alert('Success', 'Update saved successfully.');
    } catch (e) {
      console.error('Failed to save edited update:', e);
      Alert.alert('Error', 'Failed to save updates.');
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
                label="Select Warehouse for SKU Intake"
                selectedValue={selectedWarehouseId}
                onValueChange={(val) => {
                  setSelectedWarehouseId(val);
                  checkGeofence(val);
                }}
                options={warehouses.map((w) => ({
                  label: w.name,
                  value: w.id,
                }))}
                placeholder="Choose a warehouse..."
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
                  Disable Geo-locking
                </Text>
                <Text variant="bodySecondary">Requires approval</Text>
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
                  ⚠️ Geo-locking Disabled: Updates will go to the approvals
                  queue.
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
                    ⚠️ Geofenced Lock: You are too far from this warehouse to
                    perform updates.
                  </Text>
                </Box>
                <Box alignItems="flex-start">
                  <Button
                    title="Simulate Nearby Location (Bypass Geofence)"
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
                  ✅ Location Verified: Inside 100-meter warehouse radius.
                  Direct updates authorized.
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
                ℹ️ Please select a warehouse to initialize inventory intake.
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
                ⏳ Pending Approvals Queue ({pendingUpdates.length})
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
                        ✏️ Editing Pending Request
                      </Text>
                      {update.type === 'NEW_SKU' ? (
                        <Box>
                          <TextField
                            label="SKU Code"
                            value={editSku}
                            onChangeText={setEditSku}
                          />
                          <TextField
                            label="Product Name"
                            value={editName}
                            onChangeText={setEditName}
                          />
                          <TextField
                            label="Price (MMK)"
                            value={editPrice}
                            onChangeText={setEditPrice}
                            keyboardType="numeric"
                          />
                          <TextField
                            label="Category"
                            value={editCategory}
                            onChangeText={setEditCategory}
                          />
                          <TextField
                            label="Initial Stock Qty"
                            value={editQtyDelta}
                            onChangeText={setEditQtyDelta}
                            keyboardType="numeric"
                          />
                        </Box>
                      ) : (
                        <Box>
                          <Text variant="body" mb="s">
                            Item: {targetItem?.name || 'Unknown Item'}
                          </Text>
                          <TextField
                            label="Quantity Adjustment"
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
                          title="Cancel"
                          onPress={() => setEditingUpdateId(null)}
                          variant="secondary"
                        />
                        <Button
                          title="Save Changes"
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
                              ? `🆕 New SKU: ${update.name}`
                              : `🔄 Stock Adjustment: ${targetItem?.name || 'Unknown Item'}`}
                          </Text>
                          <Text variant="bodySecondary" fontSize={11}>
                            Submitted by {update.submitted_by} · Warehouse:{' '}
                            {whName}
                          </Text>
                        </Box>
                        <Box bg="warningBg" px="s" py="xs" borderRadius="s">
                          <Text
                            variant="bodySecondary"
                            color="warningText"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            PENDING
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
                              SKU: <Text fontWeight="bold">{update.sku}</Text>
                            </Text>
                            <Text variant="bodySecondary" fontSize={12}>
                              Price:{' '}
                              <Text fontWeight="bold">
                                K{update.unit_price?.toLocaleString()}
                              </Text>
                            </Text>
                            <Text variant="bodySecondary" fontSize={12}>
                              Qty:{' '}
                              <Text fontWeight="bold">
                                {update.quantity_delta}
                              </Text>
                            </Text>
                          </>
                        ) : (
                          <Text variant="bodySecondary" fontSize={12}>
                            Delta:{' '}
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
                              🔒 Geofenced Lock (Go to {whName})
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
                              Approve
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
                  placeholder="e.g. SKU-PB-500"
                />
              </Box>

              <Box width={isDesktop ? '50%' : '100%'} px="s">
                <TextField
                  label={t('productName')}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Myanmar Premium 500ml"
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('priceMmk')}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="e.g. 3000"
                  keyboardType="numeric"
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('category')}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g. Beverage"
                />
              </Box>

              <Box width={isDesktop ? '33.3%' : '100%'} px="s">
                <TextField
                  label={t('initialStockQty')}
                  value={initialStock}
                  onChangeText={setInitialStock}
                  placeholder="e.g. 100"
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
                      ? 'Submit SKU for Approval'
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
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Text variant="title" mb="m">
            🕵️ Competitor Intelligence Capture
          </Text>
          <Text variant="bodySecondary" mb="m">
            Capture observed competitor product street prices and snap evidence
            photo.
          </Text>

          <Box
            flexDirection="row"
            flexWrap="wrap"
            style={{ marginHorizontal: -8 }}
          >
            <Box width={isDesktop ? '50%' : '100%'} px="s">
              <TextField
                label="Competitor Product Name"
                value={compName}
                onChangeText={setCompName}
                placeholder="e.g. Tiger Cement 50kg"
              />
            </Box>
            <Box width={isDesktop ? '50%' : '100%'} px="s">
              <TextField
                label="Observed Street Price (MMK)"
                value={compPrice}
                onChangeText={setCompPrice}
                placeholder="e.g. 18500"
                keyboardType="numeric"
              />
            </Box>
          </Box>

          <Box flexDirection="row" alignItems="center" mt="m" mb="m" gap="s">
            <Button
              title="Snap Photo"
              onPress={() => handlePickCompetitorImage(true)}
              variant="secondary"
            />
            <Button
              title="Choose Gallery"
              onPress={() => handlePickCompetitorImage(false)}
              variant="secondary"
            />
            {compPhotoUri && (
              <Text
                variant="bodySecondary"
                color="successText"
                fontWeight="bold"
              >
                Photo attached ✓
              </Text>
            )}
          </Box>

          <Box alignItems="flex-end">
            <Button
              title={isSavingComp ? 'Saving...' : 'Save Insight'}
              onPress={handleSaveCompetitorInsight}
              variant="primary"
              disabled={isSavingComp}
            />
          </Box>
        </Card>

        {/* Master Catalog Table Grid */}
        <Text variant="title" mb="s">
          📦 {t('masterStockLevels')}
        </Text>
        {items.map((item) => {
          const isLowStock = item.stockQty < 50;
          const controlsActive = geoLockingDisabled || isNearWarehouse;
          return (
            <Card
              key={item.id}
              mb="s"
              p="m"
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              borderLeftWidth={4}
              borderLeftColor={isLowStock ? 'danger' : 'success'}
            >
              <Box flex={1} mr="m">
                <Box flexDirection="row" alignItems="center" mb="xs">
                  <Text variant="body" fontWeight="bold">
                    {item.name}
                  </Text>
                  <Box
                    bg="secondaryBackground"
                    px="s"
                    py="xs"
                    borderRadius="s"
                    ml="s"
                  >
                    <Text
                      variant="bodySecondary"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {item.sku}
                    </Text>
                  </Box>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <Tag size={12} stroke="#64748B" style={{ marginRight: 4 }} />
                  <Text variant="bodySecondary" mr="m">
                    {item.category}
                  </Text>
                  <Layers
                    size={12}
                    stroke="#64748B"
                    style={{ marginRight: 4 }}
                  />
                  <Text variant="bodySecondary">
                    {t('price')}: K{item.unitPrice.toLocaleString()}
                  </Text>
                </Box>
              </Box>

              {/* Stock Quantity Controls */}
              <Box
                flexDirection="row"
                alignItems="center"
                style={{ opacity: controlsActive ? 1 : 0.5 }}
              >
                <TouchableOpacity
                  onPress={() => handleUpdateStock(item, -10)}
                  disabled={!controlsActive}
                  style={{
                    backgroundColor: controlsActive
                      ? theme.colors.secondaryButton
                      : '#CBD5E1',
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={14} stroke={theme.colors.secondaryButtonText} />
                </TouchableOpacity>

                <Box minWidth={60} alignItems="center" px="s">
                  <Text
                    variant="body"
                    fontWeight="bold"
                    fontSize={16}
                    color={isLowStock ? 'danger' : 'primaryText'}
                  >
                    {item.stockQty}
                  </Text>
                  <Text variant="bodySecondary" fontSize={10}>
                    {isLowStock ? t('lowStock') : t('inStock')}
                  </Text>
                </Box>

                <TouchableOpacity
                  onPress={() => handleUpdateStock(item, 10)}
                  disabled={!controlsActive}
                  style={{
                    backgroundColor: controlsActive
                      ? theme.colors.secondaryButton
                      : '#CBD5E1',
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={14} stroke={theme.colors.secondaryButtonText} />
                </TouchableOpacity>
              </Box>
            </Card>
          );
        })}

        {items.length === 0 && (
          <Box p="xl" alignItems="center">
            <Text variant="bodySecondary">{t('noProductsInCatalog')}</Text>
          </Box>
        )}
      </ScrollView>
      <ImageAnnotationModal
        visible={annotationModalVisible}
        imageUri={pendingAnnotationUri}
        onClose={() => {
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
        onAnnotated={(croppedUri) => {
          setCompPhotoUri(croppedUri);
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
      />
    </Box>
  );
}

export default IntakeScreen;
