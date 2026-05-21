import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Box, Text, Button, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, Item, Contact } from '@burma-inventory/shared-types';
import { AI_PARSE_NOTE_URL, AI_OCR_INVOICE_URL } from '../config';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import {
  fetchItemsAndStockLevel,
  createInteractionLog,
} from '../data/repositories';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from '../utils/i18n';
import { useAuth } from '../utils/auth';

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
  const { t } = useTranslation();
  const { activeRep } = useAuth();
  const [type, setType] = useState<string>('SHOP_VISIT');
  const [commercialStatus, setCommercialStatus] =
    useState<string>('FOLLOWED_UP');
  const [notes, setNotes] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    { item: Item; quantity: number | string }[]
  >([]);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);

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

  const [stocksMap, setStocksMap] = useState<Record<string, number>>({});

  const loadItems = async () => {
    try {
      const { items, stocksMap: allStocks } = await fetchItemsAndStockLevel();
      const filtered = skuSearch
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(skuSearch.toLowerCase()) ||
              i.sku.toLowerCase().includes(skuSearch.toLowerCase()),
          )
        : items;
      setAvailableItems(filtered);
      setStocksMap(allStocks);
    } catch (e) {
      console.error('Error loading items or stocks', e);
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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Permission required',
        'Need camera roll permissions to upload screenshot.',
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (
      !pickerResult.canceled &&
      pickerResult.assets &&
      pickerResult.assets.length > 0
    ) {
      const uri = pickerResult.assets[0].uri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
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
      const contacts = await database.collections
        .get('contacts')
        .query(Q.where('shop_id', shop.id))
        .fetch();
      const phone =
        contacts.length > 0 ? (contacts[0] as Contact).phoneNumber : '';
      if (phone) {
        const url = `viber://chat?number=${encodeURIComponent(phone)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert(t('error'), t('viberNotInstalled'));
        }
      } else {
        Alert.alert(t('error'), t('noContactFound'));
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('couldNotOpenViber'));
    }
  };

  const handleParseWithGemma = async () => {
    if (!notes.trim()) {
      Alert.alert(t('error'), t('enterNotesToParse'));
      return;
    }
    setIsAiParsing(true);
    try {
      const response = await fetch(AI_PARSE_NOTE_URL, {
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
          const matchedItems = await itemsCol
            .query(Q.where('sku', aiItem.sku))
            .fetch();
          if (
            matchedItems.length > 0 &&
            !newSelected.find((i) => i.item.sku === aiItem.sku)
          ) {
            newSelected.push({
              item: matchedItems[0],
              quantity: aiItem.quantity,
            });
          }
        }
        setSelectedItems(newSelected);

        if (data.summary) {
          setNotes(data.summary);
        }
        Alert.alert(t('success'), t('gemmaSuccess'));
      } else {
        Alert.alert(t('error'), t('gemmaFailed'));
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('gemmaParseFailed'));
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleScanInvoiceOCR = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('permissionDenied'), t('cameraRollRequired'));
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    const uri = pickerResult.assets[0].uri;
    setIsOcrScanning(true);
    try {
      // Read the image as base64 so we send the real file to the OCR endpoint
      const { readAsStringAsync, EncodingType } = (await import(
        'expo-file-system'
      )) as any;
      const base64 = await readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });

      const response = await fetch(AI_OCR_INVOICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items.length > 0) {
          const newSelected = [...selectedItems];
          for (const aiItem of data.items) {
            const itemsCol = database.collections.get<Item>('items');
            const matchedItems = await itemsCol
              .query(Q.where('id', aiItem.itemId))
              .fetch();
            if (
              matchedItems.length > 0 &&
              !newSelected.find((i) => i.item.id === aiItem.itemId)
            ) {
              newSelected.push({
                item: matchedItems[0],
                quantity: aiItem.quantity,
              });
            }
          }
          setSelectedItems(newSelected);
          Alert.alert(t('scanSuccess'), data.explanation);
        } else {
          Alert.alert(t('scanFailed'), t('ocrNoSkus'));
        }
      } else {
        Alert.alert(t('error'), t('ocrFailedConnect'));
      }
    } catch (e) {
      console.error('OCR scan failed', e);
      Alert.alert(t('error'), t('ocrRequestFailed'));
    } finally {
      setIsOcrScanning(false);
    }
  };

  const toggleItem = (item: Item) => {
    const exists = selectedItems.find((i) => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.item.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: string, quantity: string) => {
    // Strip non-digit characters. Allow empty string temporarily for editing.
    const qtyStr = quantity.replace(/[^0-9]/g, '');
    setSelectedItems(
      selectedItems.map((i) =>
        i.item.id === itemId ? { ...i, quantity: qtyStr } : i,
      ),
    );
  };

  const handleSave = async () => {
    if (!shop) return;

    if (
      (commercialStatus === 'INTERESTED' ||
        commercialStatus === 'NOT_INTERESTED') &&
      notes.length < 20
    ) {
      Alert.alert(t('validationError'), t('marketIntelMinLength'));
      return;
    }

    if (type === 'VIBER' && !screenshotUri) {
      Alert.alert(t('validationError'), t('viberProofMandatory'));
      return;
    }

    // Validate quantity inputs first
    const validatedItems: { item: Item; quantity: number }[] = [];
    for (const selected of selectedItems) {
      const qty =
        typeof selected.quantity === 'number'
          ? selected.quantity
          : parseInt(selected.quantity || '0', 10);
      if (isNaN(qty) || qty < 1) {
        Alert.alert(
          t('validationError'),
          `SKU ${selected.item.sku}: Please enter a valid quantity of 1 or more.`,
        );
        return;
      }
      validatedItems.push({ item: selected.item, quantity: qty });
    }

    // Validate stock levels before saving
    for (const selected of validatedItems) {
      const availableStock = stocksMap[selected.item.id] || 0;
      if (selected.quantity > availableStock) {
        Alert.alert(
          t('insufficientStock'),
          t('insufficientStockMsg')
            .replace('{qty}', selected.quantity.toString())
            .replace('{name}', selected.item.name)
            .replace('{available}', availableStock.toString()),
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await createInteractionLog(
        shop.id,
        activeRep.id,
        type,
        commercialStatus,
        notes,
        screenshotUri,
        validatedItems,
      );
      Alert.alert(t('success'), t('interactionSaved'));
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('interactionSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const theme = useTheme<Theme>();

  const getLogTypeBtnLabel = (tName: string) => {
    if (tName === 'PHONE_CALL') return t('phone');
    if (tName === 'VIBER') return 'Viber';
    if (tName === 'SHOP_VISIT') return t('typeVisit');
    return tName.replaceAll('_', ' ');
  };

  const getCommercialStatusBtnLabel = (sName: string) => {
    if (sName === 'FOLLOWED_UP') return t('statusFollowedUp');
    if (sName === 'INTERESTED') return t('statusInterested');
    if (sName === 'ORDER_PLACED') return t('statusClosed');
    if (sName === 'NOT_INTERESTED') return t('statusNoDeal');
    return sName.replaceAll('_', ' ');
  };

  return (
    <Modal
      visible={visible}
      transparent={isDesktop}
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Box
        flex={1}
        bg={isDesktop ? 'transparent' : 'mainBackground'}
        style={
          isDesktop
            ? ({
                backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek backdrop Slate-900 transparent
                justifyContent: 'center',
                alignItems: 'center',
                backdropFilter: 'blur(8px)', // Glassmorphism backdrop filter on modern browsers!
              } as any)
            : undefined
        }
      >
        <KeyboardAvoidingView
          style={
            isDesktop
              ? { width: 600, maxHeight: '85%' }
              : { flex: 1, width: '100%' }
          }
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Box
            flex={1}
            bg="mainBackground"
            p="m"
            borderRadius={isDesktop ? 'l' : 'none'}
            elevation={10}
            style={
              Platform.OS === 'web'
                ? { boxShadow: '0px 10px 24px rgba(0,0,0,0.15)' }
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 24,
                  }
            }
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="m"
            >
              <Text variant="header">{t('logInteraction')}</Text>
              <Button
                title={t('cancel')}
                variant="secondary"
                onPress={onClose}
              />
            </Box>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {shop && (
                <Card mb="m">
                  <Text variant="body" fontWeight="bold">
                    {t('shopLabel')}: {shop.name}
                  </Text>
                </Card>
              )}

              <Text variant="title" mb="s">
                {t('interactionType')}
              </Text>
              <Box flexDirection="row" flexWrap="wrap" mb="m">
                {['PHONE_CALL', 'VIBER', 'SHOP_VISIT'].map((tVal) => (
                  <Box key={tVal} mr="s" mb="s">
                    <Button
                      title={getLogTypeBtnLabel(tVal)}
                      variant={type === tVal ? 'primary' : 'outline'}
                      onPress={() => setType(tVal)}
                    />
                  </Box>
                ))}
              </Box>

              {type === 'VIBER' && (
                <Box mb="m" flexDirection="row" alignItems="center">
                  <Button
                    title={t('openViberChat')}
                    variant="secondary"
                    onPress={handleOpenViber}
                  />
                  <Box width={10} />
                  <Button title={t('uploadProof')} onPress={handlePickImage} />
                  {screenshotUri && (
                    <Text
                      variant="body"
                      color="secondaryText"
                      style={{ marginLeft: 10 }}
                    >
                      {t('uploaded')}
                    </Text>
                  )}
                </Box>
              )}

              <Text variant="title" mb="s">
                {t('gemmaCopilot')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  padding: 12,
                  borderRadius: theme.borderRadii.m,
                  borderWidth: 1,
                  borderColor: theme.colors.borderColor,
                  color: theme.colors.primaryText,
                  minHeight: 80,
                  marginBottom: 8,
                  textAlignVertical: 'top',
                  outlineWidth: 0,
                }}
                multiline
                placeholder={t('gemmaPlaceholder')}
                placeholderTextColor={theme.colors.secondaryText}
                value={notes}
                onChangeText={setNotes}
              />
              <Box flexDirection="row" justifyContent="space-between" mb="m">
                <Box style={{ flex: 1, marginRight: 8 }}>
                  <Button
                    title={t('parseWithGemma')}
                    variant="secondary"
                    isLoading={isAiParsing}
                    onPress={handleParseWithGemma}
                  />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Button
                    title={t('scanInvoiceOcr')}
                    variant="outline"
                    isLoading={isOcrScanning}
                    onPress={handleScanInvoiceOCR}
                  />
                </Box>
              </Box>

              <Text variant="title" mt="m" mb="s">
                {t('commercialStatus')}
              </Text>
              <Box flexDirection="row" flexWrap="wrap" mb="m">
                {[
                  'FOLLOWED_UP',
                  'INTERESTED',
                  'ORDER_PLACED',
                  'NOT_INTERESTED',
                ].map((sVal) => (
                  <Box key={sVal} mr="s" mb="s">
                    <Button
                      title={getCommercialStatusBtnLabel(sVal)}
                      variant={
                        commercialStatus === sVal ? 'primary' : 'outline'
                      }
                      onPress={() => setCommercialStatus(sVal)}
                    />
                  </Box>
                ))}
              </Box>

              <Text variant="title" mb="s">
                {t('skuTagging')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  padding: 8,
                  borderRadius: theme.borderRadii.m,
                  borderWidth: 1,
                  borderColor: theme.colors.borderColor,
                  color: theme.colors.primaryText,
                  marginBottom: 8,
                  outlineWidth: 0,
                }}
                placeholder={t('searchSkusPlaceholder')}
                placeholderTextColor={theme.colors.secondaryText}
                value={skuSearch}
                onChangeText={setSkuSearch}
              />
              <Box style={{ maxHeight: 150 }} mb="m">
                <ScrollView nestedScrollEnabled>
                  {availableItems.map((item) => {
                    const isSelected = selectedItems.find(
                      (i) => i.item.id === item.id,
                    );
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggleItem(item)}
                      >
                        <Box
                          p="s"
                          bg={isSelected ? 'secondaryButton' : 'mainBackground'}
                          borderBottomWidth={1}
                          borderColor="borderColor"
                        >
                          <Text
                            variant="body"
                            color={
                              isSelected ? 'secondaryButtonText' : 'primaryText'
                            }
                          >
                            {item.name} ({item.sku}) - {t('availableStock')}:{' '}
                            {stocksMap[item.id] !== undefined
                              ? stocksMap[item.id]
                              : 0}
                          </Text>
                        </Box>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Box>

              {selectedItems.length > 0 && (
                <Box mb="m">
                  <Text variant="body" fontWeight="bold" mb="s">
                    {t('selectedQuantities')}
                  </Text>
                  {selectedItems.map((si) => (
                    <Box
                      key={si.item.id}
                      flexDirection="row"
                      alignItems="center"
                      mb="s"
                    >
                      <Text variant="body" style={{ flex: 1 }}>
                        {si.item.name} ({t('availableStock')}:{' '}
                        {stocksMap[si.item.id] !== undefined
                          ? stocksMap[si.item.id]
                          : 0}
                        )
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: theme.colors.cardBackground,
                          padding: 4,
                          width: 60,
                          borderRadius: theme.borderRadii.s,
                          borderWidth: 1,
                          borderColor: theme.colors.borderColor,
                          color: theme.colors.primaryText,
                          textAlign: 'center',
                          outlineWidth: 0,
                        }}
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
              <Button
                title={t('saveLog')}
                onPress={handleSave}
                isLoading={isSaving}
              />
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </Box>
    </Modal>
  );
}
