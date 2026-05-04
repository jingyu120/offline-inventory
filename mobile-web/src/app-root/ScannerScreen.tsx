import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, TextField, Table, ColumnDef, Box, Text } from '@burma-inventory/ui-components';
import { QrCode, Package, Clock, CheckCircle, Camera, Keyboard } from 'lucide-react-native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualMode, setManualMode] = useState(false);
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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    const success = await saveItemToDatabase(data);
    if (success) {
      Alert.alert(`Success`, `Barcode ${data} added to Pending.`, [
        { text: 'Scan Another', onPress: () => setScanned(false) },
      ]);
    } else {
      setScanned(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode) return;
    const success = await saveItemToDatabase(manualBarcode);
    if (success) {
      setManualBarcode('');
      setManualMode(false);
      Alert.alert('Success', `Manual item ${manualBarcode} added.`);
    }
  };

  const saveItemToDatabase = async (barcode: string) => {
    try {
      const itemsCollection = database.collections.get('inventory_items');
      
      // 1. Check for uniqueness
      const existing = await itemsCollection.query(Q.where('barcode', barcode)).fetch();
      if (existing.length > 0) {
        Alert.alert('Duplicate Barcode', `An item with barcode ${barcode} already exists in the inventory.`);
        return false;
      }

      // 2. Save as PENDING
      await database.write(async () => {
        await itemsCollection.create((item: any) => {
          item.barcode = barcode;
          item.name = `Item ${barcode}`;
          item.quantity = 1;
          item.status = 'PENDING';
          item.userId = 'demo-user';
        });
      });
      return true;
    } catch (error) {
      console.error('Error saving item to db', error);
      Alert.alert('Error', 'Failed to save item to database.');
      return false;
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
    { 
      key: 'status', 
      header: 'Status', 
      width: 90,
      render: (item) => (
        <Text variant="body" fontSize={12} color={item.status === 'PENDING' ? 'warning' : 'success'}>
          {item.status}
        </Text>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
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

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Text variant="body" textAlign="center" pb="s">Camera permission is required to scan barcodes.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </Box>
    );
  }

  const handleWipeData = async () => {
    Alert.alert(
      'Wipe All Data',
      'Are you sure you want to delete all local inventory data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Wipe Everything', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await database.unsafeWipeAll();
              });
              loadInventory();
              Alert.alert('Success', 'Local database wiped.');
            } catch (error) {
              console.error('Wipe failed', error);
              Alert.alert('Error', 'Failed to wipe database.');
            }
          }
        }
      ]
    );
  };

  if (viewInventory) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Card style={{ flex: 1 }}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Box>
              <Text variant="header">Inventory</Text>
              <Button title="Wipe Local Data" onPress={handleWipeData} variant="secondary" />
            </Box>
            <Button title="Back" onPress={() => setViewInventory(false)} />
          </Box>

          <Box flexDirection="row" mb="m" bg="secondaryBackground" borderRadius="m" p="xs">
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

  if (manualMode) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Card elevation={3}>
          <Box alignItems="center" mb="m">
            <Keyboard size={40} color="#4F46E5" />
            <Text variant="header" mt="s">Manual Entry</Text>
          </Box>
          <TextField
            label="Barcode / SKU"
            placeholder="Enter Barcode / SKU"
            value={manualBarcode}
            onChangeText={setManualBarcode}
          />
          <Box mb="s">
            <Button title="Save as Pending" onPress={handleManualSubmit} variant="primary" />
          </Box>
          <Button variant="secondary" title="Back to Scanner" onPress={() => setManualMode(false)} />
        </Card>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground">
      <CameraView 
        style={{ flex: 1 }} 
        facing="back" 
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <Box flex={1} bg="transparent" justifyContent="center" alignItems="center">
          <Box width={250} height={250} borderWidth={2} borderColor="white" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 }} />
          <Text color="white" mt="m" variant="body">Position barcode inside the frame</Text>
        </Box>
      </CameraView>
      
      <Box p="m" bg="mainBackground" borderTopLeftRadius={24} borderTopRightRadius={24} mt={-24}>
        <Box flexDirection="row" justifyContent="space-between" mb="m">
          <Box flex={1} mr="s">
            <Button variant="secondary" title="View Inventory" onPress={() => setViewInventory(true)} />
          </Box>
          <Box flex={1} ml="s">
            <Button variant="secondary" title="Manual Entry" onPress={() => setManualMode(true)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
