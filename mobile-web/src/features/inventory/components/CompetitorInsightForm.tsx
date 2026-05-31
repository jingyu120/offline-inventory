import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  TextField,
} from '@burma-inventory/ui-components';
import { ImageAnnotationModal } from './ImageAnnotationModal';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';

interface CompetitorInsightFormProps {
  isDesktop: boolean;
}

export function CompetitorInsightForm({
  isDesktop,
}: CompetitorInsightFormProps) {
  const { t } = useTranslation();

  // Competitor insights form states
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compPhotoUri, setCompPhotoUri] = useState<string | null>(null);
  const [isSavingComp, setIsSavingComp] = useState(false);

  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [pendingAnnotationUri, setPendingAnnotationUri] = useState<
    string | null
  >(null);

  const handleInterceptPhoto = (uri: string) => {
    setPendingAnnotationUri(uri);
    setAnnotationModalVisible(true);
  };

  const handlePickCompetitorImage = async (useCamera = false) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        t('permissionRequired'),
        useCamera
          ? t('cameraPermissionRequired')
          : t('cameraRollPermissionDesc'),
      );
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
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
        handleInterceptPhoto(manipResult.uri);
      } catch (err) {
        console.error('Image compression failed for competitor insight', err);
        handleInterceptPhoto(uri);
      }
    }
  };

  const handleSaveCompetitorInsight = async () => {
    if (!compName || !compPrice) {
      Alert.alert(t('validationError'), t('enterCompInsightMsg'));
      return;
    }

    const parsedPrice = parseFloat(compPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(t('validationError'), t('enterValidStreetPrice'));
      return;
    }

    setIsSavingComp(true);
    try {
      const insightId = `insight-${Math.random().toString(36).substring(2, 15)}`;
      const now = Date.now();

      await database.insert(sqliteSchema.competitor_insights).values({
        id: insightId,
        product_name: compName,
        street_price: parsedPrice,
        photo_url: null,
        created_at: now,
        updated_at: now,
      });

      if (compPhotoUri) {
        await ImageUploadQueue.enqueueCompetitorInsightImage(
          insightId,
          compPhotoUri,
        );
      }

      setCompName('');
      setCompPrice('');
      setCompPhotoUri(null);

      Alert.alert(t('success'), t('compInsightSavedSuccess'));
    } catch (e: $Any) {
      console.error('Failed to save competitor insight:', e);
      Alert.alert(t('error'), t('failedSaveCompInsight'));
    } finally {
      setIsSavingComp(false);
    }
  };

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="title" mb="m">
        {t('competitorIntelTitle')}
      </Text>
      <Text variant="bodySecondary" mb="m">
        {t('competitorIntelDesc')}
      </Text>

      <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -8 }}>
        <Box width={isDesktop ? '50%' : '100%'} px="s">
          <TextField
            label={t('competitorName')}
            value={compName}
            onChangeText={setCompName}
            placeholder={t('competitorNamePlaceholder')}
          />
        </Box>
        <Box width={isDesktop ? '50%' : '100%'} px="s">
          <TextField
            label={t('competitorPrice')}
            value={compPrice}
            onChangeText={setCompPrice}
            placeholder={t('competitorPricePlaceholder')}
            keyboardType="numeric"
          />
        </Box>
      </Box>

      <Box flexDirection="row" alignItems="center" mt="m" mb="m" gap="s">
        <Button
          title={t('snapPhoto')}
          onPress={() => handlePickCompetitorImage(true)}
          variant="secondary"
        />
        <Button
          title={t('chooseGallery')}
          onPress={() => handlePickCompetitorImage(false)}
          variant="secondary"
        />
        {compPhotoUri && (
          <Text variant="bodySecondary" color="successText" fontWeight="bold">
            {t('photoAttached')}
          </Text>
        )}
      </Box>

      <Box alignItems="flex-end">
        <Button
          title={isSavingComp ? t('saving') : t('saveInsight')}
          onPress={handleSaveCompetitorInsight}
          variant="primary"
          disabled={isSavingComp}
        />
      </Box>

      <ImageAnnotationModal
        visible={annotationModalVisible}
        imageUri={pendingAnnotationUri}
        onClose={() => {
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
        onAnnotated={(croppedUri) => {
          setCompPhotoUri(croppedUri);
          setAnnotationModalVisible(false);
          setPendingAnnotationUri(null);
        }}
      />
    </Card>
  );
}
