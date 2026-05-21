import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Box, Text, Card, Button } from '@burma-inventory/ui-components';
import { database } from '../database';
import {
  Item,
  ItemStock,
  guardAsync,
  sqliteSchema,
} from '@burma-inventory/shared-types';
import { mapItem, mapItemStock } from '../data/repositories';
import { eq } from 'drizzle-orm';
import {
  Plus,
  Minus,
  Package,
  Tag,
  Layers,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from '../utils/i18n';

interface ExtendedItem extends Item {
  stockQty: number;
}

export function IntakeScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating new items
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('Beverage');
  const [initialStock, setInitialStock] = useState('100');
  const [isAdding, setIsAdding] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const itemsList = await database.select().from(sqliteSchema.items);
      const stocksList = await database.select().from(sqliteSchema.item_stocks);

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
      Alert.alert('Error', 'Could not update stock quantity.');
    } else {
      await loadInventory();
    }
  };

  const handleAddItem = async () => {
    if (!sku || !name || !unitPrice) {
      Alert.alert(
        'Validation Error',
        'Please fill in all fields (SKU, Name, Price)',
      );
      return;
    }

    const parsedPrice = parseFloat(unitPrice);
    const parsedStock = parseInt(initialStock, 10) || 0;

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
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
      Alert.alert('Error', 'Could not create new product SKU.');
    } else {
      setSku('');
      setName('');
      setUnitPrice('');
      setInitialStock('100');
      Alert.alert('Success', `Product ${name} created and stock initialized.`);
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
            📦 Warehouse & SKU Intake
          </Text>
          <Text variant="bodySecondary">
            Katana-inspired master stock and catalog control panel
          </Text>
        </Box>
        <TouchableOpacity onPress={loadInventory} style={{ padding: 8 }}>
          <RefreshCw size={18} stroke="#5A31F4" />
        </TouchableOpacity>
      </Box>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* New Item Form Card */}
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Text variant="title" mb="m">
            ➕ Register New Product SKU
          </Text>

          <Box
            flexDirection="row"
            flexWrap="wrap"
            style={{ marginHorizontal: -8 }}
          >
            <Box width="50%" p="s">
              <Text variant="bodySecondary" mb="xs">
                SKU Code
              </Text>
              <TextInput
                value={sku}
                onChangeText={setSku}
                placeholder="e.g. SKU-PB-500"
                placeholderTextColor="#94A3B8"
                style={{
                  height: 40,
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                }}
              />
            </Box>

            <Box width="50%" p="s">
              <Text variant="bodySecondary" mb="xs">
                Product Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Myanmar Premium 500ml"
                placeholderTextColor="#94A3B8"
                style={{
                  height: 40,
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                }}
              />
            </Box>

            <Box width="33.3%" p="s">
              <Text variant="bodySecondary" mb="xs">
                Price (MMK)
              </Text>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="e.g. 3000"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                style={{
                  height: 40,
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                }}
              />
            </Box>

            <Box width="33.3%" p="s">
              <Text variant="bodySecondary" mb="xs">
                Category
              </Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Beverage"
                placeholderTextColor="#94A3B8"
                style={{
                  height: 40,
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                }}
              />
            </Box>

            <Box width="33.3%" p="s">
              <Text variant="bodySecondary" mb="xs">
                Initial Stock Quantity
              </Text>
              <TextInput
                value={initialStock}
                onChangeText={setInitialStock}
                placeholder="e.g. 100"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                style={{
                  height: 40,
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                }}
              />
            </Box>
          </Box>

          <Box mt="m" alignItems="flex-end">
            <Button
              title={isAdding ? 'Adding SKU...' : 'Add SKU to Catalog'}
              onPress={handleAddItem}
              variant="primary"
              disabled={isAdding}
            />
          </Box>
        </Card>

        {/* Master Catalog Table Grid */}
        <Text variant="title" mb="s">
          📦 Master Stock Levels
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
                    Price: K{item.unitPrice.toLocaleString()}
                  </Text>
                </Box>
              </Box>

              {/* Stock Quantity Controls */}
              <Box flexDirection="row" alignItems="center">
                <TouchableOpacity
                  onPress={() => handleUpdateStock(item, -10)}
                  style={{
                    backgroundColor: '#E2E8F0',
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={14} stroke="#475569" />
                </TouchableOpacity>

                <Box minWidth={60} alignItems="center" px="s">
                  <Text
                    variant="body"
                    fontWeight="bold"
                    fontSize={16}
                    style={{ color: isLowStock ? '#EF4444' : '#1E293B' }}
                  >
                    {item.stockQty}
                  </Text>
                  <Text variant="bodySecondary" fontSize={10}>
                    {isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                  </Text>
                </Box>

                <TouchableOpacity
                  onPress={() => handleUpdateStock(item, 10)}
                  style={{
                    backgroundColor: '#E2E8F0',
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={14} stroke="#475569" />
                </TouchableOpacity>
              </Box>
            </Card>
          );
        })}

        {items.length === 0 && (
          <Box p="xl" alignItems="center">
            <Text variant="bodySecondary">
              No products in catalog. Click Seed Data to initialize.
            </Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}
export default IntakeScreen;
