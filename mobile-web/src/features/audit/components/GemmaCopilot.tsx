import React, { useState } from 'react';
import { Alert, TextInput } from 'react-native';
import { Box, Text, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import { mapItem } from '../../../core/data/repositories';
import {
  AI_PARSE_NOTE_URL,
  AI_OCR_INVOICE_URL,
} from '../../../config/appConfig';
import { useTranslation } from '../../../core/i18n/i18n';
import * as FileSystem from 'expo-file-system';
import { ThermalGuard } from '../../../core/utils/thermalGuard';

interface GemmaCopilotProps {
  notes: string;
  setNotes: (val: string) => void;
  selectedItems: any[];
  setSelectedItems: (items: any[]) => void;
  setCommercialStatus: (status: string) => void;
}

export const GemmaCopilot: React.FC<GemmaCopilotProps> = ({
  notes,
  setNotes,
  selectedItems,
  setSelectedItems,
  setCommercialStatus,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  const handleParseWithGemma = async () => {
    if (ThermalGuard.getThermalState() === 'CRITICAL') {
      Alert.alert(t('thermalCriticalTitle'), t('thermalCriticalDesc'));
      return;
    }
    if (!notes.trim()) {
      Alert.alert(t('error'), t('enterNotesToParse'));
      return;
    }
    setIsAiParsing(true);
    try {
      const response = await fetch(AI_PARSE_NOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes, quantization: '4bit' }),
      });
      if (response.ok) {
        const data = await response.json();
        setCommercialStatus(data.commercialStatus);

        // Match SKUs
        const newSelected = [...selectedItems];
        for (const aiItem of data.items) {
          const matchedItems = await database
            .select()
            .from(sqliteSchema.items)
            .where(eq(sqliteSchema.items.sku, aiItem.sku));
          if (
            matchedItems.length > 0 &&
            !newSelected.find((i) => i.item.sku === aiItem.sku)
          ) {
            newSelected.push({
              item: mapItem(matchedItems[0]),
              quantity: aiItem.quantity,
              selectedUnit: 'PCS',
              unitPrice: matchedItems[0].unit_price || 0,
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

  const handleSimulatedVoiceNote = async () => {
    if (ThermalGuard.getThermalState() === 'CRITICAL') {
      Alert.alert(t('thermalCriticalTitle'), t('thermalCriticalDesc'));
      return;
    }
    const transcripts = [
      'We visited Junction City Mart. Client ordered 5 Premium Beer 640ml. However, they complain about monsoonal delivery delays and are looking at competitor options.',
      'Spoke with the manager at Hledan Wholesale. They complain about late deliveries and expensive price tags, but finally ordered 5 Premium Beer 640ml.',
      'At City Mart, they placed an order for 5 Premium Beer 640ml and expressed great interest in the upcoming cider promotions.',
    ];
    const randomIndex = Math.floor(Math.random() * transcripts.length);
    const selectedTranscript = transcripts[randomIndex];
    setNotes(selectedTranscript);
    setIsAiParsing(true);
    try {
      const response = await fetch(AI_PARSE_NOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: selectedTranscript,
          quantization: '4bit',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setCommercialStatus(data.commercialStatus);

        // Match SKUs
        const newSelected = [...selectedItems];
        for (const aiItem of data.items) {
          const matchedItems = await database
            .select()
            .from(sqliteSchema.items)
            .where(eq(sqliteSchema.items.sku, aiItem.sku));
          if (
            matchedItems.length > 0 &&
            !newSelected.find((i) => i.item.sku === aiItem.sku)
          ) {
            newSelected.push({
              item: mapItem(matchedItems[0]),
              quantity: aiItem.quantity,
              selectedUnit: 'PCS',
              unitPrice: matchedItems[0].unit_price || 0,
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
    if (ThermalGuard.getThermalState() === 'CRITICAL') {
      Alert.alert(t('thermalCriticalTitle'), t('thermalCriticalDesc'));
      return;
    }
    const ImagePicker = await import('expo-image-picker');
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const response = await fetch(AI_OCR_INVOICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, quantization: '8bit' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items.length > 0) {
          const newSelected = [...selectedItems];
          for (const aiItem of data.items) {
            const matchedItems = await database
              .select()
              .from(sqliteSchema.items)
              .where(eq(sqliteSchema.items.id, aiItem.itemId));
            if (
              matchedItems.length > 0 &&
              !newSelected.find((i) => i.item.id === aiItem.itemId)
            ) {
              newSelected.push({
                item: mapItem(matchedItems[0]),
                quantity: aiItem.quantity,
                selectedUnit: 'PCS',
                unitPrice: matchedItems[0].unit_price || 0,
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

  return (
    <Box>
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
      <Box mb="s">
        <Button
          title={t('simVoiceNote')}
          variant="primary"
          isLoading={isAiParsing}
          onPress={handleSimulatedVoiceNote}
        />
      </Box>
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
    </Box>
  );
};
