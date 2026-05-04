import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Button, Card, TextField, Table, ColumnDef, Box, Text } from '@burma-inventory/ui-components';
import { QrCode, Package, Clock, CheckCircle, Truck } from 'lucide-react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

export function ScannerScreen() {
  const [viewInventory, setViewInventory] = useState(false);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [pendingPreview, setPendingPreview] = useState<any[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'SHIPPED' | 'RECEIVED'>('PENDING');

  useEffect(() => {
    if (viewInventory) {
      loadInventory();
    } else {
      loadPendingPreview();
    }
  }, [viewInventory, activeTab]);

  const loadInventory = async () => {
    const itemsCollection = database.collections.get('inventory_items');
    const items = await itemsCollection
      .query(Q.where('status', activeTab))
      .fetch();
    setInventoryData([...items]); // Spread to ensure new array reference
  };

  const loadPendingPreview = async () => {
    const itemsCollection = database.collections.get('inventory_items');
    const items = await itemsCollection
      .query(Q.where('status', 'PENDING'), Q.sortBy('created_at', Q.desc), Q.take(5))
      .fetch();
    setPendingPreview([...items]);
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode) return;
    
    try {
      const itemsCollection = database.collections.get('inventory_items');
      const existing = await itemsCollection.query(Q.where('barcode', manualBarcode)).fetch();
      if (existing.length > 0) {
        Alert.alert('Error', 'An item with this barcode already exists.');
        return;
      }

      await database.write(async () => {
        await itemsCollection.create((item: any) => {
          item.barcode = manualBarcode;
          item.name = `Item ${manualBarcode}`;
          item.quantity = 1;
          item.status = 'PENDING';
          item.userId = 'demo-user';
        });
      });

      setManualBarcode('');
      loadPendingPreview();
      Alert.alert('Success', `Item ${manualBarcode} added to Pending.`);
    } catch (error) {
      console.error('Error saving item to db', error);
      Alert.alert('Error', 'Failed to save item.');
    }
  };

  const updateStatus = async (item: any, nextStatus: 'SHIPPED' | 'RECEIVED') => {
    try {
      await database.write(async () => {
        await item.update((record: any) => {
          record.status = nextStatus;
          if (nextStatus === 'SHIPPED') record.shippedAt = new Date();
          if (nextStatus === 'RECEIVED') record.receivedAt = new Date();
        });
      });
      if (viewInventory) loadInventory();
      else loadPendingPreview();
      Alert.alert('Success', `Item marked as ${nextStatus}.`);
    } catch (error) {
      console.error('Error updating item', error);
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const handleWipeData = async () => {
    Alert.alert('Wipe Data', 'Confirm reset?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Wipe', onPress: async () => {
        await database.write(() => database.unsafeWipeAll());
        loadInventory();
        loadPendingPreview();
      }}
    ]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} color="#EAB308" />;
      case 'SHIPPED': return <Truck size={14} color="#3B82F6" />;
      case 'RECEIVED': return <CheckCircle size={14} color="#22C55E" />;
      default: return null;
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };

  const columns: ColumnDef<any>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    { key: 'name', header: 'Name', flex: 1 },
    { 
      key: 'status', 
      header: 'Status', 
      width: 100,
      render: (item) => (
        <Box flexDirection="row" alignItems="center">
          <Box mr="xs">{getStatusIcon(item.status)}</Box>
          <Text variant="body" fontSize={12}>{item.status}</Text>
        </Box>
      )
    }
  ];

  const fullColumns: ColumnDef<any>[] = [
    ...columns,
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (item) => (
        <Box flexDirection="row">
          {item.status === 'PENDING' && (
            <Button title="Ship" onPress={() => updateStatus(item, 'SHIPPED')} variant="primary" />
          )}
          {item.status === 'SHIPPED' && (
            <Button title="Receive" onPress={() => updateStatus(item, 'RECEIVED')} variant="primary" />
          )}
        </Box>
      )
    },
    {
      key: 'timestamps',
      header: 'Events',
      flex: 1.5,
      render: (item) => (
        <Box>
          <Text fontSize={10} color="secondaryText">Added: {formatDate(item.createdAt)}</Text>
          {item.shippedAt && <Text fontSize={10} color="secondaryText">Shipped: {formatDate(item.shippedAt)}</Text>}
          {item.receivedAt && <Text fontSize={10} color="secondaryText">Received: {formatDate(item.receivedAt)}</Text>}
        </Box>
      )
    }
  ];

  if (viewInventory) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Card style={{ flex: 1 }}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Box>
              <Text variant="header">Inventory Management</Text>
              <Button title="Wipe Local Data" onPress={handleWipeData} variant="secondary" />
            </Box>
            <Button title="Back to Scanner" onPress={() => setViewInventory(false)} />
          </Box>

          <Box flexDirection="row" mb="m" bg="secondaryBackground" borderRadius="m" p="xs">
            {['PENDING', 'SHIPPED', 'RECEIVED'].map((s) => (
              <Box key={s} flex={1} mx="xs">
                <Button 
                  title={s} 
                  variant={activeTab === s ? 'primary' : 'secondary'}
                  onPress={() => setActiveTab(s as any)}
                />
              </Box>
            ))}
          </Box>

          <Table data={inventoryData} columns={fullColumns} keyExtractor={(item) => item.id} />
        </Card>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <Box flexDirection="row" flex={1}>
        <Box flex={1.5} mr="m">
          <Card elevation={3}>
            <Box alignItems="center" mb="m">
              <QrCode size={48} color="#4F46E5" />
              <Text variant="header" mt="s">Inventory Scanner</Text>
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
              <Button title="View All Management" onPress={() => setViewInventory(true)} variant="secondary" />
            </Box>
          </Card>
        </Box>

        <Box flex={1}>
          <Card style={{ flex: 1 }}>
            <Box flexDirection="row" alignItems="center" mb="s">
              <Clock size={20} color="#EAB308" style={{ marginRight: 8 }} />
              <Text variant="title">Recent Pending</Text>
            </Box>
            <Table 
              data={pendingPreview} 
              columns={columns} 
              keyExtractor={(item) => item.id} 
            />
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
