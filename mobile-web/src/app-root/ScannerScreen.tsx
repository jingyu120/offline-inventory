import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, TextField, Table, ColumnDef, Box, Text } from '@burma-inventory/ui-components';
import { database } from '../database';

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [viewInventory, setViewInventory] = useState(false);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');

  useEffect(() => {
    if (viewInventory) {
      loadInventory();
    }
  }, [viewInventory]);

  const loadInventory = async () => {
    const itemsCollection = database.collections.get('inventory_items');
    const items = await itemsCollection.query().fetch();
    setInventoryData(items);
  };

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Text variant="body" textAlign="center" pb="s">We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </Box>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    await saveItemToDatabase(data);
    Alert.alert(`Scanned!`, `Barcode ${data} has been added.`, [
      { text: 'Scan Another', onPress: () => setScanned(false) },
    ]);
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode) return;
    await saveItemToDatabase(manualBarcode);
    setManualBarcode('');
    Alert.alert('Success', `Manual item ${manualBarcode} added.`);
    setManualMode(false);
  };

  const saveItemToDatabase = async (barcode: string) => {
    try {
      await database.write(async () => {
        const itemsCollection = database.collections.get('inventory_items');
        await itemsCollection.create((item: any) => {
          item.barcode = barcode;
          item.name = `Item ${barcode}`;
          item.quantity = 1;
        });
      });
    } catch (error) {
      console.error('Error saving item to db', error);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    { key: 'name', header: 'Item Name', flex: 1 },
    { key: 'quantity', header: 'Qty', width: 60 },
  ];

  if (viewInventory) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Card style={{ flex: 1 }}>
          <Text variant="header" mb="m" textAlign="center">Current Inventory</Text>
          <Table data={inventoryData} columns={columns} keyExtractor={(item) => item.id} />
          <Box mt="l">
            <Button title="Back to Scanner" onPress={() => setViewInventory(false)} />
          </Box>
        </Card>
      </Box>
    );
  }

  if (manualMode) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Card elevation={3}>
          <Text variant="header" mb="m" textAlign="center">Manual Entry</Text>
          <TextField
            label="Barcode / SKU"
            placeholder="Enter Barcode / SKU"
            value={manualBarcode}
            onChangeText={setManualBarcode}
          />
          <Box mb="s">
            <Button title="Save Item" onPress={handleManualSubmit} />
          </Box>
          <Button variant="outline" title="Back to Scanner" onPress={() => setManualMode(false)} />
        </Card>
      </Box>
    );
  }

  return (
    <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
      <CameraView style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
        <Box flex={1} bg="transparent" justifyContent="center" alignItems="center">
          <Box width={250} height={250} borderWidth={2} borderColor="primaryButton" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </Box>
      </CameraView>
      <Box p="m" pb="xl">
        <Box mb="s">
          <Button variant="primary" title="View Inventory" onPress={() => setViewInventory(true)} />
        </Box>
        <Button variant="secondary" title="Manual Entry" onPress={() => setManualMode(true)} />
      </Box>
    </Box>
  );
}
