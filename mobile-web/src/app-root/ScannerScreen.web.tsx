import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Button, Card, TextField, Table, ColumnDef, Box, Text } from '@burma-inventory/ui-components';
import { QrCode, Package, Clock, CheckCircle } from 'lucide-react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

export function ScannerScreen() {
  const [viewInventory, setViewInventory] = useState(false);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RECEIVED'>('PENDING');

  useEffect(() => {
    if (viewInventory) {
      loadInventory();
    }
  }, [viewInventory, activeTab]);

  const loadInventory = async () => {
    const itemsCollection = database.collections.get('inventory_items');
    const items = await itemsCollection
      .query(Q.where('status', activeTab))
      .fetch();
    setInventoryData(items);
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode) return;
    
    try {
      const itemsCollection = database.collections.get('inventory_items');
      
      // 1. Check for uniqueness
      const existing = await itemsCollection.query(Q.where('barcode', manualBarcode)).fetch();
      if (existing.length > 0) {
        Alert.alert('Error', 'An item with this barcode already exists.');
        return;
      }

      // 2. Save as PENDING by default
      await database.write(async () => {
        await itemsCollection.create((item: any) => {
          item.barcode = manualBarcode;
          item.name = `Item ${manualBarcode}`;
          item.quantity = 1;
          item.status = 'PENDING';
          item.userId = 'demo-user'; // Placeholder
        });
      });

      setManualBarcode('');
      Alert.alert('Success', `Item ${manualBarcode} added to Pending.`);
    } catch (error) {
      console.error('Error saving item to db', error);
      Alert.alert('Error', 'Failed to save item.');
    }
  };

  const markAsReceived = async (item: any) => {
    try {
      await database.write(async () => {
        await item.update((record: any) => {
          record.status = 'RECEIVED';
        });
      });
      loadInventory();
      Alert.alert('Success', 'Item marked as Received.');
    } catch (error) {
      console.error('Error updating item', error);
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    { key: 'name', header: 'Item Name', flex: 1 },
    { 
      key: 'status', 
      header: 'Status', 
      width: 100,
      render: (item) => (
        <Box flexDirection="row" alignItems="center">
          {item.status === 'PENDING' ? (
            <Clock size={14} color="#EAB308" style={{ marginRight: 4 }} />
          ) : (
            <CheckCircle size={14} color="#22C55E" style={{ marginRight: 4 }} />
          )}
          <Text variant="body" fontSize={12}>{item.status}</Text>
        </Box>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (item) => (
        activeTab === 'PENDING' ? (
          <Button 
            title="Receive" 
            onPress={() => markAsReceived(item)}
            variant="primary"
          />
        ) : null
      )
    }
  ];

  if (viewInventory) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Card style={{ flex: 1 }}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="header">Inventory</Text>
            <Button title="Back to Scanner" onPress={() => setViewInventory(false)} />
          </Box>

          <Box flexDirection="row" mb="m" bg="secondaryBackground" borderRadius={8} p="xs">
            <Box flex={1}>
              <Button 
                title="Pending" 
                variant={activeTab === 'PENDING' ? 'primary' : 'secondary'}
                onPress={() => setActiveTab('PENDING')}
              />
            </Box>
            <Box flex={1} ml="xs">
              <Button 
                title="Received" 
                variant={activeTab === 'RECEIVED' ? 'primary' : 'secondary'}
                onPress={() => setActiveTab('RECEIVED')}
              />
            </Box>
          </Box>

          <Table data={inventoryData} columns={columns} keyExtractor={(item) => item.id} />
        </Card>
      </Box>
    );
  }

  return (
    <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
      <Card elevation={3}>
        <Box alignItems="center" mb="m">
          <QrCode size={48} color="#4F46E5" />
          <Text variant="header" mt="s">Inventory Scanner</Text>
          <Text variant="body" color="secondaryText">Scan or enter barcode to add items</Text>
        </Box>

        <TextField
          label="Barcode / SKU"
          placeholder="Enter barcode or SKU"
          value={manualBarcode}
          onChangeText={setManualBarcode}
        />

        <Box mt="m">
          <Button title="Save as Pending" onPress={handleManualSubmit} variant="primary" />
        </Box>
        
        <Box mt="s">
          <Button title="View Full Inventory" onPress={() => setViewInventory(true)} variant="secondary" />
        </Box>
      </Card>
    </Box>
  );
}
