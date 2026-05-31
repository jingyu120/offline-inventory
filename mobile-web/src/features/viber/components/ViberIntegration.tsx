import React from 'react';
import { Alert, Linking } from 'react-native';
import { Box, Text, Button } from '@burma-inventory/ui-components';
import { Shop, sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from '../../../core/i18n/i18n';
import { INTERACTION_TYPES } from '../../../config/appConfig';

interface ViberIntegrationProps {
  type: string;
  setType: (type: string) => void;
  shop: Shop | null;
  screenshotUri: string | null;
  setScreenshotUri: (uri: string | null) => void;
}

const VIBER_TYPE = 'VIBER';

export const ViberIntegration: React.FC<ViberIntegrationProps> = ({
  type,
  setType,
  shop,
  screenshotUri,
  setScreenshotUri,
}) => {
  const { t } = useTranslation();

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
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
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
          ['PHONE_CALL', 'VIBER', 'SHOP_VISIT'].includes(itConfig.value),
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
    </Box>
  );
};
