import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  Button,
  Card,
  TextField,
  Table,
  ColumnDef,
  Box,
  Text,
} from '@burma-inventory/ui-components';
import { QrCode, Package, Clock, CheckCircle } from 'lucide-react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import type {
  InventoryItem,
  InventoryStatus,
} from '@burma-inventory/shared-types';

export function ScannerScreen() {
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
    setInventoryData([...items]); // Spread to ensure new array reference
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

  const handleManualSubmit = async () => {
    if (!manualBarcode) return;

    try {
      const itemsCollection =
        database.collections.get<InventoryItem>('inventory_items');
      const existing = await itemsCollection
        .query(Q.where('barcode', manualBarcode))
        .fetch();
      if (existing.length > 0) {
        Alert.alert('Error', 'An item with this barcode already exists.');
        return;
      }

      await database.write(async () => {
        await itemsCollection.create((item) => {
          item.barcode = manualBarcode;
          item.name = `Item ${manualBarcode}`;
          item.quantity = 1;
          item.status = 'EXPECTED';
          item.userId = 'demo-user';
        });
      });

      setManualBarcode('');
      loadPendingPreview();
      Alert.alert('Success', `Item ${manualBarcode} added to Expected.`);
    } catch (error) {
      console.error('Error saving item to db', error);
      Alert.alert('Error', 'Failed to save item.');
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
      {
        text: 'Wipe',
        onPress: async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await database.write(() => (database as any).unsafeWipeAll());
          loadInventory();
          loadPendingPreview();
        },
      },
    ]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXPECTED':
        return <Clock size={14} color="#EAB308" />;
      case 'INVENTORY':
        return <Package size={14} color="#22C55E" />;
      case 'HISTORICAL':
        return <CheckCircle size={14} color="#3B82F6" />;
      default:
        return null;
    }
  };

  const formatDate = (dateInput: Date | number | null | undefined): string => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };

  const columns: ColumnDef<InventoryItem>[] = [
    { key: 'barcode', header: 'Barcode', flex: 1 },
    { key: 'name', header: 'Name', flex: 1 },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      render: (item) => (
        <Box flexDirection="row" alignItems="center">
          <Box mr="xs">{getStatusIcon(item.status)}</Box>
          <Text variant="body" fontSize={12}>
            {item.status}
          </Text>
        </Box>
      ),
    },
  ];

  const fullColumns: ColumnDef<InventoryItem>[] = [
    ...columns,
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (item) => (
        <Box flexDirection="row">
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
    {
      key: 'timestamps',
      header: 'Events',
      flex: 1.5,
      render: (item) => (
        <Box>
          <Text fontSize={10} color="secondaryText">
            Added: {formatDate(item.createdAt)}
          </Text>
          {item.receivedAt && (
            <Text fontSize={10} color="secondaryText">
              Received: {formatDate(item.receivedAt)}
            </Text>
          )}
          {item.soldAt && (
            <Text fontSize={10} color="secondaryText">
              Checked Out: {formatDate(item.soldAt)}
            </Text>
          )}
        </Box>
      ),
    },
  ];

  if (viewInventory) {
    return (
      <Box flex={1} bg="mainBackground" p="m">
        <Box flex={1}>
          <Card>
            <Box
              flexDirection={{ phone: 'column', tablet: 'row' }}
              justifyContent="space-between"
              alignItems={{ phone: 'flex-start', tablet: 'center' }}
              mb="m"
              gap="s"
            >
              <Box flex={1}>
                <Text variant="header" fontSize={{ phone: 24, tablet: 34 }}>
                  Inventory Management
                </Text>
                <Box mt="s">
                  <Button
                    title="Wipe Local Data"
                    onPress={handleWipeData}
                    variant="secondary"
                    size="small"
                  />
                </Box>
              </Box>
              <Button
                title="Back to Scanner"
                onPress={() => setViewInventory(false)}
              />
            </Box>

            <Box
              flexDirection={{ phone: 'column', tablet: 'row' }}
              mb="m"
              bg="secondaryBackground"
              borderRadius="m"
              p="xs"
              gap="xs"
            >
              {['EXPECTED', 'INVENTORY', 'HISTORICAL'].map((s) => (
                <Box key={s} flex={1}>
                  <Button
                    title={s}
                    variant={activeTab === s ? 'primary' : 'secondary'}
                    onPress={() => setActiveTab(s as InventoryStatus)}
                  />
                </Box>
              ))}
            </Box>

            <Table
              data={inventoryData}
              columns={fullColumns}
              keyExtractor={(item) => item.id}
            />
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="mainBackground" p={{ phone: 's', tablet: 'm' }}>
      <Box flexDirection={{ phone: 'column', tablet: 'row' }} flex={1}>
        <Box
          flex={1.5}
          mr={{ phone: 'none', tablet: 'm' }}
          mb={{ phone: 'm', tablet: 'none' }}
        >
          <Card elevation={3}>
            <Box alignItems="center" mb="m">
              <QrCode size={48} color="#4F46E5" />
              <Text
                variant="header"
                mt="s"
                fontSize={{ phone: 24, tablet: 34 }}
              >
                Inventory Scanner
              </Text>
            </Box>

            <TextField
              label="Barcode / SKU"
              placeholder="Enter barcode or SKU"
              value={manualBarcode}
              onChangeText={setManualBarcode}
            />

            <Box mt="m">
              <Button
                title="Save as Expected"
                onPress={handleManualSubmit}
                variant="primary"
              />
            </Box>
            <Box mt="s">
              <Button
                title="View All Management"
                onPress={() => setViewInventory(true)}
                variant="secondary"
              />
            </Box>
          </Card>
        </Box>

        <Box flex={1}>
          <Card>
            <Box flexDirection="row" alignItems="center" mb="s">
              <Clock size={20} color="#EAB308" style={{ marginRight: 8 }} />
              <Text variant="title">Recent Expected</Text>
            </Box>
            <Table
              data={pendingPreview}
              columns={columns}
              keyExtractor={(item) => item.id}
            />
            {pendingPreview.length === 0 && (
              <Box flex={1} justifyContent="center" alignItems="center" py="xl">
                <Package size={40} color="borderColor" />
                <Text variant="bodySecondary" mt="s">
                  No expected items
                </Text>
              </Box>
            )}
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
