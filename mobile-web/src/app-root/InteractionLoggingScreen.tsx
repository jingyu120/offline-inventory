import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Box, Text, Button, Card } from '@burma-inventory/ui-components';
import { Shop, Item, InteractionLog, InteractionItem } from '@burma-inventory/shared-types';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';

interface InteractionLoggingScreenProps {
  visible: boolean;
  onClose: () => void;
  shop: Shop | null;
}

export function InteractionLoggingScreen({
  visible,
  onClose,
  shop,
}: InteractionLoggingScreenProps) {
  const [type, setType] = useState<string>('SHOP_VISIT');
  const [commercialStatus, setCommercialStatus] = useState<string>('FOLLOWED_UP');
  const [notes, setNotes] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ item: Item; quantity: number }[]>([]);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
    } else {
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    loadItems();
  }, [skuSearch]);

  const loadItems = async () => {
    try {
      const itemsCol = database.collections.get<Item>('items');
      let query = itemsCol.query();
      if (skuSearch) {
        query = itemsCol.query(Q.where('name', Q.like(`%${Q.sanitizeLikeString(skuSearch)}%`)));
      }
      const items = await query.fetch();
      setAvailableItems(items);
    } catch (e) {
      console.error('Error loading items', e);
    }
  };

  const resetForm = () => {
    setType('SHOP_VISIT');
    setCommercialStatus('FOLLOWED_UP');
    setNotes('');
    setSelectedItems([]);
    setScreenshotUri(null);
    setSkuSearch('');
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Need camera roll permissions to upload screenshot.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const uri = pickerResult.assets[0].uri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        setScreenshotUri(manipResult.uri);
      } catch (err) {
        console.error('Image compression failed', err);
        setScreenshotUri(uri);
      }
    }
  };

  const handleOpenViber = async () => {
    if (!shop) return;
    try {
      // In a real app we would get the primary contact's phone number
      const contacts = await shop.collections.get('contacts').query().fetch();
      const phone = contacts.length > 0 ? contacts[0].phoneNumber : '';
      if (phone) {
        const url = `viber://chat?number=${encodeURIComponent(phone)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Viber is not installed or the URL is not supported.');
        }
      } else {
        Alert.alert('Error', 'No contact found for this shop.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not open Viber.');
    }
  };

  const handleParseWithGemma = async () => {
    if (!notes.trim()) {
      Alert.alert('Error', 'Please enter some notes to parse.');
      return;
    }
    setIsAiParsing(true);
    try {
      // Assuming sync server runs on port 3000
      const response = await fetch('http://localhost:3000/api/ai/parse-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes }),
      });
      if (response.ok) {
        const data = await response.json();
        setCommercialStatus(data.commercialStatus);
        
        // Match SKUs
        const newSelected = [...selectedItems];
        for (const aiItem of data.items) {
          const itemsCol = database.collections.get<Item>('items');
          const matchedItems = await itemsCol.query(Q.where('sku', aiItem.sku)).fetch();
          if (matchedItems.length > 0 && !newSelected.find(i => i.item.sku === aiItem.sku)) {
            newSelected.push({ item: matchedItems[0], quantity: aiItem.quantity });
          }
        }
        setSelectedItems(newSelected);
        
        if (data.summary) {
          setNotes(data.summary);
        }
        Alert.alert('Success', 'Gemma 4 successfully parsed the input.');
      } else {
        Alert.alert('Error', 'Failed to connect to Gemma 4 AI Copilot.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to parse notes with Gemma.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const toggleItem = (item: Item) => {
    const exists = selectedItems.find(i => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.item.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: string, quantity: string) => {
    const qty = parseInt(quantity, 10) || 0;
    setSelectedItems(selectedItems.map(i => i.item.id === itemId ? { ...i, quantity: qty } : i));
  };

  const handleSave = async () => {
    if (!shop) return;

    if ((commercialStatus === 'INTERESTED' || commercialStatus === 'NOT_INTERESTED') && notes.length < 20) {
      Alert.alert('Validation Error', 'Market Intelligence notes must be at least 20 characters long.');
      return;
    }

    if (type === 'VIBER' && !screenshotUri) {
      Alert.alert('Validation Error', 'Viber proof upload (screenshot) is mandatory for Viber interactions.');
      return;
    }

    setIsSaving(true);
    try {
      await database.write(async () => {
        const logsCol = database.collections.get<InteractionLog>('interaction_logs');
        const itemsCol = database.collections.get<InteractionItem>('interaction_items');

        const newLog = await logsCol.create((l) => {
          l.shopId = shop.id;
          l.repId = 'rep-1'; // Mock rep ID
          l.type = type;
          l.commercialStatus = commercialStatus;
          l.notes = notes;
          l.viberScreenshotUrl = screenshotUri || undefined;
          l.createdAtLocal = new Date();
          l.isOfflineEntry = true; // In a real app, check network status
          l.deviceId = 'dev-1';
        });

        for (const selected of selectedItems) {
          await itemsCol.create((ii) => {
            ii.interactionLogId = newLog.id;
            ii.itemId = selected.item.id;
            ii.quantity = selected.quantity;
            ii.unitPriceAtSale = selected.item.unitPrice;
          });
        }
      });
      Alert.alert('Success', 'Interaction saved successfully.');
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save interaction.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Box flex={1} bg="mainBackground" p="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="header">Log Interaction</Text>
            <Button title="Cancel" variant="secondary" onPress={onClose} />
          </Box>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {shop && (
              <Card mb="m">
                <Text variant="body" fontWeight="bold">Shop: {shop.name}</Text>
              </Card>
            )}

            <Text variant="title" mb="s">Interaction Type</Text>
            <Box flexDirection="row" flexWrap="wrap" mb="m">
              {['PHONE_CALL', 'VIBER', 'SHOP_VISIT'].map(t => (
                <Box key={t} mr="s" mb="s">
                  <Button 
                    title={t.replace('_', ' ')} 
                    variant={type === t ? 'primary' : 'outline'} 
                    onPress={() => setType(t)} 
                  />
                </Box>
              ))}
            </Box>

            {type === 'VIBER' && (
              <Box mb="m" flexDirection="row" alignItems="center">
                <Button title="Open Viber Chat" variant="secondary" onPress={handleOpenViber} />
                <Box width={10} />
                <Button title="Upload Proof" onPress={handlePickImage} />
                {screenshotUri && <Text variant="body" color="secondaryText" style={{ marginLeft: 10 }}>Uploaded ✓</Text>}
              </Box>
            )}

            <Text variant="title" mb="s">Gemma 4 AI Copilot</Text>
            <TextInput
              style={{
                backgroundColor: '#fff',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ccc',
                minHeight: 80,
                marginBottom: 8,
                textAlignVertical: 'top'
              }}
              multiline
              placeholder="Speak or type raw notes here for Gemma 4 to parse..."
              value={notes}
              onChangeText={setNotes}
            />
            <Button 
              title="Parse with Gemma" 
              variant="secondary" 
              isLoading={isAiParsing} 
              onPress={handleParseWithGemma} 
            />

            <Text variant="title" mt="m" mb="s">Commercial Status</Text>
            <Box flexDirection="row" flexWrap="wrap" mb="m">
              {['FOLLOWED_UP', 'INTERESTED', 'ORDER_PLACED', 'NOT_INTERESTED'].map(s => (
                <Box key={s} mr="s" mb="s">
                  <Button 
                    title={s.replace('_', ' ')} 
                    variant={commercialStatus === s ? 'primary' : 'outline'} 
                    onPress={() => setCommercialStatus(s)} 
                  />
                </Box>
              ))}
            </Box>

            <Text variant="title" mb="s">SKU Tagging</Text>
            <TextInput
              style={{ backgroundColor: '#fff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 8 }}
              placeholder="Search SKUs..."
              value={skuSearch}
              onChangeText={setSkuSearch}
            />
            <Box style={{ maxHeight: 150 }} mb="m">
              <ScrollView nestedScrollEnabled>
                {availableItems.map(item => {
                  const isSelected = selectedItems.find(i => i.item.id === item.id);
                  return (
                    <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
                      <Box p="s" bg={isSelected ? 'secondaryButton' : 'mainBackground'} borderBottomWidth={1} borderColor="border">
                        <Text variant="body" color={isSelected ? 'secondaryButtonText' : 'text'}>{item.name} ({item.sku})</Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Box>

            {selectedItems.length > 0 && (
              <Box mb="m">
                <Text variant="body" fontWeight="bold" mb="s">Selected Quantities:</Text>
                {selectedItems.map(si => (
                  <Box key={si.item.id} flexDirection="row" alignItems="center" mb="s">
                    <Text variant="body" style={{ flex: 1 }}>{si.item.name}</Text>
                    <TextInput
                      style={{ backgroundColor: '#fff', padding: 4, width: 60, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', textAlign: 'center' }}
                      keyboardType="numeric"
                      value={si.quantity.toString()}
                      onChangeText={(val) => updateQuantity(si.item.id, val)}
                    />
                  </Box>
                ))}
              </Box>
            )}

            <Box height={40} />
          </ScrollView>

          <Box mt="m">
            <Button title="Save Log" onPress={handleSave} isLoading={isSaving} />
          </Box>
        </Box>
      </KeyboardAvoidingView>
    </Modal>
  );
}
