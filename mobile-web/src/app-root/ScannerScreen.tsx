import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, TextField, Table, ColumnDef, Box, Text } from '@burma-inventory/ui-components';
import { QrCode, Package, Clock, CheckCircle, Truck, Camera, Keyboard } from 'lucide-react-native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualMode, setManualMode] = useState(false);
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
    setInventoryData([...items]);
  };

  const loadPendingPreview = async () => {
    const itemsCollection = database.collections.get('inventory_items');
    const items = await itemsCollection
      .query(Q.where('status', 'PENDING'), Q.sortBy('created_at', Q.desc), Q.take(5))
      .fetch();
    setPendingPreview([...items]);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    const success = await saveItemToDatabase(data);
    if (success) {
      loadPendingPreview();
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
      loadPendingPreview();
      Alert.alert('Success', `Manual item ${manualBarcode} added.`);
    }
  };

  const saveItemToDatabase = async (barcode: string) => {
    try {
      const itemsCollection = database.collections.get('inventory_items');
      const existing = await itemsCollection.query(Q.where('barcode', barcode)).fetch();
      if (existing.length > 0) {
        Alert.alert('Duplicate Barcode', `An item with barcode ${barcode} already exists.`);
        return false;
      }

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
      return false;
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
      loadInventory();
      Alert.alert('Success', `Item marked as ${nextStatus}.`);
    } catch (error) {
      console.error('Error updating item', error);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    { 
      key: 'status', 
      header: 'Status', 
      width: 90,
      render: (item) => (
        <Text variant="body" fontSize={12} color={item.status === 'PENDING' ? 'warning' : item.status === 'SHIPPED' ? 'primaryButton' : 'success'}>
          {item.status}
        </Text>
      )
    }
  ];

  const fullColumns: ColumnDef<any>[] = [
    ...columns,
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: (item) => (
        <Box>
          {item.status === 'PENDING' && (
            <Button title="Ship" onPress={() => updateStatus(item, 'SHIPPED')} variant="primary" />
          )}
          {item.status === 'SHIPPED' && (
            <Button title="Receive" onPress={() => updateStatus(item, 'RECEIVED')} variant="primary" />
          )}
        </Box>
      )
    }
  ];

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Text variant="body" textAlign="center" pb="s">Camera permission required.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </Box>
    );
  }

  if (viewInventory) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Card style={{ flex: 1 }}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="header">Inventory</Text>
            <Button title="Back" onPress={() => setViewInventory(false)} />
          </Box>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginBottom: 16 }}>
            {['PENDING', 'SHIPPED', 'RECEIVED'].map((s) => (
              <Box key={s} width={100} mr="s">
                <Button title={s} variant={activeTab === s ? 'primary' : 'secondary'} onPress={() => setActiveTab(s as any)} />
              </Box>
            ))}
          </ScrollView>
          <Table data={inventoryData} columns={fullColumns} keyExtractor={(item) => item.id} />
        </Card>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground">
      <ScrollView style={{ flex: 1 }}>
        <Box height={350}>
          <CameraView 
            style={{ flex: 1 }} 
            facing="back" 
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <Box flex={1} bg="transparent" justifyContent="center" alignItems="center">
              <Box width={180} height={180} borderWidth={2} borderColor="white" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 }} />
            </Box>
          </CameraView>
        </Box>

        <Box p="m" bg="mainBackground" borderTopLeftRadius={24} borderTopRightRadius={24} mt={-24}>
          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <Button variant="secondary" title="Full Inventory" onPress={() => setViewInventory(true)} />
            <Button variant="secondary" title="Manual Entry" onPress={() => setManualMode(true)} />
          </Box>

          <Card>
            <Box flexDirection="row" alignItems="center" mb="s">
              <Clock size={18} color="#EAB308" style={{ marginRight: 8 }} />
              <Text variant="title">Recent Pending</Text>
            </Box>
            <Table 
              data={pendingPreview} 
              columns={columns} 
              keyExtractor={(item) => item.id} 
            />
          </Card>
        </Box>
      </ScrollView>
    </Box>
  );
}
