import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { database } from '../../../core/database/database';
import {
  fetchShops,
  fetchShopDetails,
  ShopWithDetails,
  LogWithItems,
} from '../../../core/data/repositories';
import { seedLocalDatabase } from '../../../core/data/mockSeeding';
import { Shop, Contact } from '@burma-inventory/shared-types';
import { useAuth } from '../../../core/auth/auth';

export const useShopsData = () => {
  const { activeRep } = useAuth();
  const [shops, setShops] = useState<ShopWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopContacts, setShopContacts] = useState<Contact[]>([]);
  const [shopLogsWithItems, setShopLogsWithItems] = useState<LogWithItems[]>(
    [],
  );
  const [loggingModalVisible, setLoggingModalVisible] = useState(false);

  const loadShops = async () => {
    setLoading(true);
    try {
      let data = await fetchShops(searchQuery);
      if (activeRep.role === 'sales' && activeRep.regionId) {
        data = data.filter((s) => s.regionId === activeRep.regionId);
      }
      setShops(data);

      if (selectedShop) {
        const updatedSelected = data.find((s) => s.id === selectedShop.id);
        if (updatedSelected) {
          setSelectedShop(updatedSelected);
        }
      }
    } catch (e) {
      console.error('Failed to load shops:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [searchQuery, activeRep.id]);

  const selectShop = async (shop: Shop) => {
    setSelectedShop(shop);
    try {
      const { contacts, logsWithItems } = await fetchShopDetails(shop.id);
      setShopContacts(contacts);
      setShopLogsWithItems(logsWithItems);
    } catch (e) {
      console.error('Failed to load shop details:', e);
    }
  };

  const handleSeedData = async () => {
    try {
      await seedLocalDatabase(database);
      await loadShops();
      if (selectedShop) {
        await selectShop(selectedShop);
      }
      Alert.alert(
        'Data Seeded',
        '8 rich demo shops with GPS, contacts, and interaction history created.',
      );
    } catch (e) {
      console.error('Failed to seed database:', e);
      Alert.alert('Seeding Error', 'Could not seed local database tables.');
    }
  };

  return {
    shops,
    searchQuery,
    setSearchQuery,
    loading,
    selectedShop,
    setSelectedShop,
    shopContacts,
    shopLogsWithItems,
    loggingModalVisible,
    setLoggingModalVisible,
    loadShops,
    selectShop,
    handleSeedData,
  };
};
export type UseShopsDataReturn = ReturnType<typeof useShopsData>;
