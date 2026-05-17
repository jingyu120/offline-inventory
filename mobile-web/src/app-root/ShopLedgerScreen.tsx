import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  Table,
  ColumnDef,
} from '@burma-inventory/ui-components';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import {
  Shop,
  Contact,
  InteractionLog,
  Region,
} from '@burma-inventory/shared-types';

export function ShopLedgerScreen() {
  const [shops, setShops] = useState<(Shop & { regionName?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopContacts, setShopContacts] = useState<Contact[]>([]);
  const [shopLogs, setShopLogs] = useState<InteractionLog[]>([]);

  useEffect(() => {
    loadShops();
  }, [searchQuery]);

  const loadShops = async () => {
    try {
      const shopsCollection = database.collections.get<Shop>('shops');
      const regionsCollection = database.collections.get<Region>('regions');

      let query = shopsCollection.query();
      if (searchQuery) {
        query = shopsCollection.query(
          Q.where('name', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
        );
      }

      const fetchedShops = await query.fetch();

      // Fetch regions manually for now since standard relation fetching is async per item
      const regions = await regionsCollection.query().fetch();
      const regionMap = new Map(regions.map((r) => [r.id, r.name]));

      const shopsWithRegions = fetchedShops.map((s) => {
        // Since watermelondb objects are immutable, we create a wrapper or just attach property for UI
        const shopObj = s as any;
        shopObj.regionName = regionMap.get(s.regionId) || 'Unknown Region';
        return shopObj;
      });

      setShops(shopsWithRegions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectShop = async (shop: Shop) => {
    setSelectedShop(shop);
    try {
      const contacts = await database.collections
        .get<Contact>('contacts')
        .query(Q.where('shop_id', shop.id))
        .fetch();
      const logs = await database.collections
        .get<InteractionLog>('interaction_logs')
        .query(Q.where('shop_id', shop.id), Q.sortBy('created_at', Q.desc))
        .fetch();
      setShopContacts(contacts);
      setShopLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedData = async () => {
    try {
      await database.write(async () => {
        const regionsCol = database.collections.get<Region>('regions');
        const r1 = await regionsCol.create((r) => {
          r.name = 'Yangon Division';
          r.division = 'Yangon';
        });

        const shopsCol = database.collections.get<Shop>('shops');
        const s1 = await shopsCol.create((s) => {
          s.name = 'Lucky Store Hledan';
          s.address = 'Hledan Center';
          s.regionId = r1.id;
          s.lifetimeValue = 15000;
          s.sentimentTrend = 'IMPROVING';
        });

        const contactsCol = database.collections.get<Contact>('contacts');
        await contactsCol.create((c) => {
          c.shopId = s1.id;
          c.name = 'U Kyaw';
          c.phoneNumber = '+95912345678';
          c.isPrimary = true;
        });

        const logsCol =
          database.collections.get<InteractionLog>('interaction_logs');
        await logsCol.create((l) => {
          l.shopId = s1.id;
          l.repId = 'rep-1';
          l.type = 'SHOP_VISIT';
          l.commercialStatus = 'ORDER_PLACED';
          l.notes = 'Bought 5 cases of premium beer. Great mood.';
          l.createdAtLocal = new Date();
          l.isOfflineEntry = false;
          l.deviceId = 'dev-1';
        });
      });
      loadShops();
      Alert.alert('Data Seeded', 'Demo data created.');
    } catch (e) {
      console.error('Seed error:', e);
    }
  };

  const shopColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Shop Name', flex: 2 },
    { key: 'regionName', header: 'Region', flex: 1 },
    { key: 'sentimentTrend', header: 'Trend', width: 100 },
    {
      key: 'actions',
      header: '',
      width: 80,
      render: (item) => (
        <Button
          variant="secondary"
          title="View"
          onPress={() => selectShop(item)}
        />
      ),
    },
  ];

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (selectedShop) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Button
          title="Back to List"
          onPress={() => setSelectedShop(null)}
          variant="secondary"
        />
        <Card mt="m">
          <Text variant="header">{selectedShop.name}</Text>
          <Text variant="body" color="secondaryText">
            Address: {selectedShop.address}
          </Text>
          <Text variant="body" color="secondaryText">
            LTV: {selectedShop.lifetimeValue}
          </Text>
          <Text variant="body" color="secondaryText">
            Trend: {selectedShop.sentimentTrend}
          </Text>
        </Card>

        <Text variant="title" mt="m" mb="s">
          Contacts
        </Text>
        {shopContacts.map((c) => (
          <Card key={c.id} mb="s">
            <Text variant="body" fontWeight="bold">
              {c.name} {c.isPrimary ? '(Primary)' : ''}
            </Text>
            <Text variant="body">{c.phoneNumber}</Text>
          </Card>
        ))}

        <Text variant="title" mt="m" mb="s">
          Recent Interactions
        </Text>
        <ScrollView style={{ flex: 1 }}>
          {shopLogs.map((l) => (
            <Card key={l.id} mb="s">
              <Box flexDirection="row" justifyContent="space-between">
                <Text variant="body" fontWeight="bold">
                  {l.type}
                </Text>
                <Text variant="body" color="secondaryText">
                  {new Date(l.createdAtLocal).toLocaleDateString()}
                </Text>
              </Box>
              <Text variant="body">Status: {l.commercialStatus}</Text>
              <Text variant="body" mt="s">
                {l.notes}
              </Text>
            </Card>
          ))}
          {shopLogs.length === 0 && (
            <Text variant="body">No interactions yet.</Text>
          )}
        </ScrollView>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Text variant="header">Shop Ledger</Text>
        <Button
          title="Seed Data"
          onPress={handleSeedData}
          variant="secondary"
        />
      </Box>
      <TextInput
        style={{
          backgroundColor: '#fff',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#ccc',
        }}
        placeholder="Search shops..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Card flex={1} p="none">
        <Table
          data={shops}
          columns={shopColumns}
          keyExtractor={(item) => item.id}
        />
      </Card>
    </Box>
  );
}
