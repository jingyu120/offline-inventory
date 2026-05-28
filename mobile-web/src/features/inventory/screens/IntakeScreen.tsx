import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  TextField,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';
import { database } from '../../../core/database/database';
import {
  Item,
  ItemStock,
  Shop,
  guardAsync,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import {
  mapItem,
  mapItemStock,
  mapShop,
} from '../../../core/data/repositories';
import { eq } from 'drizzle-orm';
import {
  Plus,
  Minus,
  Package,
  Tag,
  Layers,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import * as Location from 'expo-location';

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

  // Geofence states
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [isNearShop, setIsNearShop] = useState<boolean>(false);

  const checkGeofence = async (shopId: string, currentShopsList?: Shop[]) => {
    if (!shopId) {
      setIsNearShop(false);
      return;
    }
    try {
      const listToSearch = currentShopsList || shops;
      const shopObj = listToSearch.find((s) => s.id === shopId);
      if (!shopObj) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('error') || 'Error',
          'Location permission is required to initialize the audit.',
        );
        setIsNearShop(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const shopLat = shopObj.latitude || 16.8661;
      const shopLon = shopObj.longitude || 96.1951;
      const dist = calculateDistance(
        shopLat,
        shopLon,
        loc.coords.latitude,
        loc.coords.longitude,
      );

      if (dist <= 100) {
        setIsNearShop(true);
      } else {
        setIsNearShop(false);
        Alert.alert(
          'Geofenced Lock Active',
          `You must be within 100 meters of the selected shop to initialize this inventory audit. Current distance: ${Math.round(dist)}m.`,
        );
      }
    } catch (err: any) {
      console.error(err);
      setIsNearShop(false);
      Alert.alert(
        t('error') || 'Error',
        'Failed to retrieve current device coordinates.',
      );
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const itemsList = await database.select().from(sqliteSchema.items);
      const stocksList = await database.select().from(sqliteSchema.item_stocks);
      const shopsList = await database.select().from(sqliteSchema.shops);

      const mappedItems = itemsList.map(mapItem);
      const mappedStocks = stocksList.map(mapItemStock);
      const mappedShops = shopsList.map(mapShop);

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
      setShops(mappedShops);
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
    if (!selectedShopId || !isNearShop) {
      Alert.alert(
        t('error') || 'Error',
        'Stock adjustment locked: You must select a retail shop and be within 100 meters of it.',
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
              updated_at: now,
            })
            .where(eq(sqliteSchema.item_stocks.id, record.id));
        } else {
          const stockId = Math.random().toString(36).substring(2, 15);
          await database.insert(sqliteSchema.item_stocks).values({
            id: stockId,
            item_id: item.id,
            quantity: Math.max(0, delta),
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
    if (!selectedShopId || !isNearShop) {
      Alert.alert(
        t('error') || 'Error',
        'SKU registration locked: You must select a retail shop and be within 100 meters of it.',
      );
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
          created_at: now,
          updated_at: now,
        });

        // Insert new stock
        await database.insert(sqliteSchema.item_stocks).values({
          id: newStockId,
          item_id: newItemId,
          quantity: Math.max(0, parsedStock),
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
        {/* Shop Selector Dropdown */}
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <DropdownSelector
            label="Select Shop for Inventory Audit"
            selectedValue={selectedShopId}
            onValueChange={(val) => {
              setSelectedShopId(val);
              checkGeofence(val);
            }}
            options={shops.map((s) => ({ label: s.name, value: s.id }))}
            placeholder="Choose a retail shop..."
          />
          {selectedShopId ? (
            !isNearShop ? (
              <Box
                mt="s"
                p="s"
                bg="dangerBg"
                borderRadius="s"
                borderColor="danger"
                borderWidth={1}
              >
                <Text
                  variant="bodySecondary"
                  color="dangerText"
                  fontWeight="bold"
                >
                  ⚠️ Geofenced Lock: You are too far from this shop to audit
                  inventory. (100-meter verification failed)
                </Text>
              </Box>
            ) : (
              <Box
                mt="s"
                p="s"
                bg="successBg"
                borderRadius="s"
                borderColor="success"
                borderWidth={1}
              >
                <Text
                  variant="bodySecondary"
                  color="successText"
                  fontWeight="bold"
                >
                  ✅ Location Verified: Inside 100-meter shop radius. Audit
                  authorized.
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
                ℹ️ Please select a retail shop to initialize the inventory
                audit.
              </Text>
            </Box>
          )}
        </Card>

        {/* New Item Form Card */}
        <Box style={{ opacity: isNearShop ? 1 : 0.5 }}>
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
                title={isAdding ? t('addingSku') : t('addSkuToCatalog')}
                onPress={handleAddItem}
                variant="primary"
                disabled={isAdding || !isNearShop}
              />
            </Box>
          </Card>
        </Box>

        {/* Master Catalog Table Grid */}
        <Text variant="title" mb="s">
          📦 {t('masterStockLevels')}
        </Text>
        {items.map((item) => {
          const isLowStock = item.stockQty < 50;
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
                style={{ opacity: isNearShop ? 1 : 0.5 }}
              >
                <TouchableOpacity
                  onPress={() => handleUpdateStock(item, -10)}
                  disabled={!isNearShop}
                  style={{
                    backgroundColor: isNearShop
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
                  disabled={!isNearShop}
                  style={{
                    backgroundColor: isNearShop
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
    </Box>
  );
}
export default IntakeScreen;
