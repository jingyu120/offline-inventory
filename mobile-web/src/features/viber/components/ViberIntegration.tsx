import React, { useState } from 'react';
import { Alert, Linking, TextInput } from 'react-native';
import { Box, Text, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { mapItem } from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import { ThermalGuard } from '../../../core/utils/thermalGuard';
import {
  INTERACTION_TYPES,
  IMAGE_UPLOAD_CONFIG,
  VIBER_SIMULATOR_LOG_TYPES,
  AI_PARSE_NOTE_URL,
} from '../../../config/appConfig';

interface ViberIntegrationProps {
  type: string;
  setType: (type: string) => void;
  shop: Shop | null;
  screenshotUri: string | null;
  setScreenshotUri: (uri: string | null) => void;
  viberMessageText: string;
  setViberMessageText: (val: string) => void;
  selectedItems: $Any[];
  setSelectedItems: (items: $Any[]) => void;
  setCommercialStatus: (status: string) => void;
}

const VIBER_TYPE = 'VIBER';

export const ViberIntegration: React.FC<ViberIntegrationProps> = ({
  type,
  setType,
  shop,
  screenshotUri,
  setScreenshotUri,
  viberMessageText,
  setViberMessageText,
  selectedItems,
  setSelectedItems,
  setCommercialStatus,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [isParsing, setIsParsing] = useState(false);

  const handleParseViber = async () => {
    if (ThermalGuard.getThermalState() === 'CRITICAL') {
      Alert.alert(t('thermalCriticalTitle'), t('thermalCriticalDesc'));
      return;
    }
    if (!viberMessageText.trim()) {
      Alert.alert(t('error'), t('viberInputPlaceholder'));
      return;
    }

    setIsParsing(true);
    try {
      const response = await fetch(AI_PARSE_NOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: viberMessageText, quantization: '4bit' }),
      });

      if (response.ok) {
        const data = await response.json();
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
              stockCondition: 'GOOD',
              fulfillmentStatus: 'PENDING_FULFILLMENT',
            });
          }
        }
        setSelectedItems(newSelected);
        setCommercialStatus('ORDER_PLACED');

        Alert.alert(t('success'), t('gemmaSuccess'));
      } else {
        Alert.alert(t('error'), t('gemmaFailed'));
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('gemmaParseFailed'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleOpenViber = async () => {
    if (!shop) return;
    try {
      const contactsList = await database
        .select()
        .from(sqliteSchema.contacts)
        .where(eq(sqliteSchema.contacts.shop_id, shop.id));
      const phone = contactsList.length > 0 ? contactsList[0].phone_number : '';
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

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('permissionRequired'), t('cameraRollPermissionDesc'));
      return;
    }

    const thermalState = ThermalGuard.getThermalState();
    const isThrottled =
      thermalState === 'SERIOUS' || thermalState === 'CRITICAL';
    const quality = isThrottled ? 0.2 : 1;
    const resizeWidth = isThrottled ? 480 : IMAGE_UPLOAD_CONFIG.resizeWidth;
    const compressQuality = isThrottled ? 0.2 : IMAGE_UPLOAD_CONFIG.quality;

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality,
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
          [{ resize: { width: resizeWidth } }],
          {
            compress: compressQuality,
            format:
              IMAGE_UPLOAD_CONFIG.format === 'png'
                ? ImageManipulator.SaveFormat.PNG
                : ImageManipulator.SaveFormat.JPEG,
          },
        );
        setScreenshotUri(manipResult.uri);
      } catch (err) {
        console.error('Image compression failed', err);
        setScreenshotUri(uri);
      }
    }
  };

  const getLogTypeBtnLabel = (tName: string) => {
    const config = INTERACTION_TYPES.find((it) => it.value === tName);
    if (config) {
      return config.labelKey === 'Viber' ? 'Viber' : t(config.labelKey as $Any);
    }
    return tName.replaceAll('_', ' ');
  };

  return (
    <Box>
      <Text variant="title" mb="s">
        {t('interactionType')}
      </Text>
      <Box flexDirection="row" flexWrap="wrap" mb="m">
        {INTERACTION_TYPES.filter((itConfig) =>
          VIBER_SIMULATOR_LOG_TYPES.includes(itConfig.value),
        ).map((itConfig) => {
          const tVal = itConfig.value;
          return (
            <Box key={tVal} mr="s" mb="s">
              <Button
                title={getLogTypeBtnLabel(tVal)}
                variant={type === tVal ? 'primary' : 'outline'}
                onPress={() => setType(tVal)}
              />
            </Box>
          );
        })}
      </Box>

      {type === VIBER_TYPE && (
        <Box>
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

          <Box mb="m">
            <Text variant="bodySecondary" mb="xs" fontWeight="bold">
              {t('viberMessageSource')}
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
              placeholder={t('viberInputPlaceholder')}
              placeholderTextColor={theme.colors.secondaryText}
              value={viberMessageText}
              onChangeText={setViberMessageText}
            />
            <Button
              title={t('parseViberMessage')}
              variant="primary"
              isLoading={isParsing}
              onPress={handleParseViber}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
