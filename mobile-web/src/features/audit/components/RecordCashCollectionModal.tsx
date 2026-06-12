import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import {
  Box,
  Text,
  Button,
  TextField,
  ModalSheet,
} from '@burma-inventory/ui-components';
import { Shop, guardAsync } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { useRecordCashCollection } from '../hooks/useRecordCashCollection';

interface RecordCashCollectionModalProps {
  visible: boolean;
  shop: Shop;
  onClose: () => void;
  onSuccess: () => void;
}

const MODAL_MAX_WIDTH = 450;

export const RecordCashCollectionModal: React.FC<
  RecordCashCollectionModalProps
> = ({ visible, shop, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { status, summary, errorMessage, isSubmitting, submit, reset } =
    useRecordCashCollection();

  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      reset();
      setAmount('');
      setTransactionRef('');
      setScreenshotUri(null);
    }
  }, [visible, shop.id, reset]);

  const handleAttachScreenshot = useCallback(async () => {
    const [picked, error] = await guardAsync(
      (async (): Promise<string | null> => {
        const ImagePicker = await import('expo-image-picker');
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          return null;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.5,
        });
        if (result.canceled || !result.assets?.length) {
          return null;
        }
        return result.assets[0].uri;
      })(),
    );
    if (error) {
      console.error('Failed to attach cash-collection screenshot:', error);
      return;
    }
    if (picked) {
      setScreenshotUri(picked);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const succeeded = await submit({
      shopId: shop.id,
      amount,
      transactionRef,
      screenshotUrl: screenshotUri,
    });
    if (succeeded) {
      onSuccess();
      onClose();
    }
  }, [
    amount,
    onClose,
    onSuccess,
    screenshotUri,
    shop.id,
    submit,
    transactionRef,
  ]);

  const appliedTotal =
    summary?.applied?.reduce((sum, alloc) => sum + alloc.allocated, 0) ?? 0;

  return (
    <ModalSheet
      visible={visible}
      onRequestClose={onClose}
      maxWidth={MODAL_MAX_WIDTH}
      animationType="slide"
    >
      <Box p="m">
        <Box mb="m" borderBottomWidth={1} borderColor="borderColor" pb="s">
          <Text variant="title" color="brand">
            {t('recordCashCollectionTitle')}
          </Text>
          <Text variant="caption" mt="xs">
            {t('recordCashCollectionDesc', { name: shop.name })}
          </Text>
        </Box>

        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
        >
          <Box mb="m">
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('recordCashCollectionShopLabel')}
            </Text>
            <Box
              p="s"
              bg="secondaryBackground"
              borderRadius="s"
              borderWidth={1}
              borderColor="borderColor"
            >
              <Text variant="body" fontWeight="bold">
                {shop.name}
              </Text>
            </Box>
          </Box>

          <Box mb="m">
            <TextField
              label={t('recordCashCollectionAmountLabel')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t('recordCashCollectionAmountPlaceholder')}
              editable={!isSubmitting}
            />
          </Box>

          <Box mb="m">
            <TextField
              label={t('recordCashCollectionRefLabel')}
              value={transactionRef}
              onChangeText={setTransactionRef}
              placeholder={t('recordCashCollectionRefPlaceholder')}
              editable={!isSubmitting}
            />
          </Box>

          <Box mb="m">
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('recordCashCollectionScreenshotLabel')}
            </Text>
            <Pressable
              onPress={handleAttachScreenshot}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('recordCashCollectionAttachScreenshot')}
            >
              <Box
                p="s"
                borderRadius="s"
                borderWidth={1}
                borderColor={screenshotUri ? 'success' : 'borderColor'}
                bg={screenshotUri ? 'successBg' : 'secondaryBackground'}
                alignItems="center"
              >
                <Text
                  variant="bodySecondary"
                  fontWeight="bold"
                  color={screenshotUri ? 'successText' : 'primaryText'}
                >
                  {screenshotUri
                    ? t('recordCashCollectionScreenshotAttached')
                    : t('recordCashCollectionAttachScreenshot')}
                </Text>
              </Box>
            </Pressable>
          </Box>

          {status === 'error' ? (
            <Box
              p="s"
              mb="m"
              borderRadius="s"
              borderWidth={1}
              borderColor="danger"
              bg="dangerBg"
            >
              <Text variant="bodySecondary" color="dangerText">
                {errorMessage === 'INVALID_AMOUNT'
                  ? t('reconcileInvalidAmount')
                  : t('recordCashCollectionFailed')}
              </Text>
            </Box>
          ) : null}

          {status === 'success' ? (
            <Box
              p="s"
              mb="m"
              borderRadius="s"
              borderWidth={1}
              borderColor="success"
              bg="successBg"
            >
              <Text variant="bodySecondary" color="successText">
                {t('recordCashCollectionSuccess')}
              </Text>
              <Text variant="caption" color="successText" mt="xs">
                {t('reconciliationAppliedAmount', {
                  amount: appliedTotal.toLocaleString(),
                })}
              </Text>
            </Box>
          ) : null}
        </ScrollView>

        <Box
          borderTopWidth={1}
          borderColor="borderColor"
          pt="m"
          flexDirection="row"
          justifyContent="space-between"
        >
          <Button
            title={t('cancel')}
            variant="secondary"
            onPress={onClose}
            disabled={isSubmitting}
          />
          <Button
            title={
              isSubmitting
                ? t('recordCashCollectionSubmitting')
                : t('recordCashCollectionSubmit')
            }
            variant="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
          />
        </Box>
      </Box>
    </ModalSheet>
  );
};
