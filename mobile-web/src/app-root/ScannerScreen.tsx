import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Button,
  Card,
  Table,
  ColumnDef,
  Box,
  Text,
} from '@burma-inventory/ui-components';
import { Clock } from 'lucide-react-native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import { InventoryItem } from '@burma-inventory/shared-types';
import type { InventoryStatus } from '@burma-inventory/shared-types';

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [viewInventory, setViewInventory] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [pendingPreview, setPendingPreview] = useState<InventoryItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [activeTab, setActiveTab] = useState<InventoryStatus>('EXPECTED');

  useEffect(() => {
    if (viewInventory) {
      loadInventory();
    } else {
      loadPendingPreview();
    }
  }, [viewInventory, activeTab]);

  const loadInventory = async () => {
    const itemsCollection =
      database.collections.get<InventoryItem>('inventory_items');
    const items = await itemsCollection
      .query(Q.where('status', activeTab))
      .fetch();
    setInventoryData([...items]);
  };

  const loadPendingPreview = async () => {
    const itemsCollection =
      database.collections.get<InventoryItem>('inventory_items');
    const items = await itemsCollection
      .query(
        Q.where('status', 'EXPECTED'),
        Q.sortBy('created_at', Q.desc),
        Q.take(5),
      )
      .fetch();
    setPendingPreview([...items]);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    const success = await saveItemToDatabase(data);
    if (success) {
      loadPendingPreview();
      Alert.alert(`Success`, `Barcode ${data} added to Expected.`, [
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
      loadPendingPreview();
      Alert.alert('Success', `Manual item ${manualBarcode} added.`);
    }
  };

  const saveItemToDatabase = async (barcode: string) => {
    try {
      const itemsCollection =
        database.collections.get<InventoryItem>('inventory_items');
      const existing = await itemsCollection
        .query(Q.where('barcode', barcode))
        .fetch();
      if (existing.length > 0) {
        Alert.alert(
          'Duplicate Barcode',
          `An item with barcode ${barcode} already exists.`,
        );
        return false;
      }

      await database.write(async () => {
        await itemsCollection.create((item) => {
          item.barcode = barcode;
          item.name = `Item ${barcode}`;
          item.quantity = 1;
          item.status = 'EXPECTED';
          item.userId = 'demo-user';
        });
      });
      return true;
    } catch (error) {
      console.error('Error saving item to db', error);
      return false;
    }
  };

  const updateStatus = async (
    item: InventoryItem,
    nextStatus: 'INVENTORY' | 'HISTORICAL',
  ) => {
    try {
      await database.write(async () => {
        await item.update((record) => {
          record.status = nextStatus;
          if (nextStatus === 'INVENTORY') record.receivedAt = new Date();
          if (nextStatus === 'HISTORICAL') record.soldAt = new Date();
        });
      });
      loadInventory();
      Alert.alert('Success', `Item marked as ${nextStatus}.`);
    } catch (error) {
      console.error('Error updating item', error);
    }
  };

  const columns: ColumnDef<InventoryItem>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    {
      key: 'status',
      header: 'Status',
      width: 90,
      render: (item) => (
        <Text
          variant="body"
          fontSize={12}
          color={
            item.status === 'EXPECTED'
              ? 'warning'
              : item.status === 'INVENTORY'
                ? 'success'
                : 'primaryButton'
          }
        >
          {item.status}
        </Text>
      ),
    },
  ];

  const fullColumns: ColumnDef<InventoryItem>[] = [
    ...columns,
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: (item) => (
        <Box>
          {item.status === 'EXPECTED' && (
            <Button
              title="Receive"
              onPress={() => updateStatus(item, 'INVENTORY')}
              variant="primary"
            />
          )}
          {item.status === 'INVENTORY' && (
            <Button
              title="Checkout"
              onPress={() => updateStatus(item, 'HISTORICAL')}
              variant="secondary"
            />
          )}
        </Box>
      ),
    },
  ];

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <Box flex={1} justifyContent="center" bg="mainBackground" p="m">
        <Text variant="body" textAlign="center" pb="s">
          Camera permission required.
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </Box>
    );
  }

  if (viewInventory) {
    return (
      <Box flex={1}>
        <Card>
          <Box
            flexDirection={{ phone: 'column', tablet: 'row' }}
            justifyContent="space-between"
            alignItems={{ phone: 'flex-start', tablet: 'center' }}
            mb="m"
            gap="s"
          >
            <Text variant="header" fontSize={{ phone: 28, tablet: 34 }}>
              Inventory
            </Text>
            <Button title="Back" onPress={() => setViewInventory(false)} />
          </Box>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 50, marginBottom: 16 }}
          >
            {['EXPECTED', 'INVENTORY', 'HISTORICAL'].map((s) => (
              <Box key={s} width={100} mr="s">
                <Button
                  title={s}
                  variant={activeTab === s ? 'primary' : 'secondary'}
                  onPress={() => setActiveTab(s as InventoryStatus)}
                />
              </Box>
            ))}
          </ScrollView>
          <Table
            data={inventoryData}
            columns={fullColumns}
            keyExtractor={(item) => item.id}
          />
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
            <Box
              flex={1}
              bg="transparent"
              justifyContent="center"
              alignItems="center"
            >
              <Box
                width={180}
                height={180}
                borderWidth={2}
                borderColor="pureWhite"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                borderRadius="xl"
              />
            </Box>
          </CameraView>
        </Box>

        <Box
          p="m"
          bg="mainBackground"
          borderTopLeftRadius="xl"
          borderTopRightRadius="xl"
          mt="-xl"
        >
          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <Button
              variant="secondary"
              title="Full Inventory"
              onPress={() => setViewInventory(true)}
            />
            <Button
              variant="secondary"
              title="Manual Entry"
              onPress={() => setManualBarcode('Manual-' + Date.now())}
            />
          </Box>

          <Card>
            <Box flexDirection="row" alignItems="center" mb="s">
              <Clock size={18} color="#EAB308" style={{ marginRight: 8 }} />
              <Text variant="title">Recent Expected</Text>
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
