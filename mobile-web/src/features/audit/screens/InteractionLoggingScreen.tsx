import {
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import { Box, Text, Button, Card } from '@burma-inventory/ui-components';
import { Shop } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { useInteractionLogging } from '../hooks/useInteractionLogging';

import { ViberIntegration } from '../../viber/components/ViberIntegration';
import { GemmaCopilot } from '../components/GemmaCopilot';
import { AvailableItemsSelector } from '../../inventory/components/AvailableItemsSelector';
import { SelectedItemsList } from '../components/SelectedItemsList';
import { ImageAnnotationModal } from '../../inventory/components/ImageAnnotationModal';
import { InteractionStatusBanners } from '../components/InteractionStatusBanners';
import { CommercialStatusSelector } from '../components/CommercialStatusSelector';
import { PriceObjectionSection } from '../components/PriceObjectionSection';
import { CurrencySelector } from '../components/CurrencySelector';

const DESKTOP_BREAKPOINT = 768;

// `backdropFilter` is a web-only CSS property not present in RN's ViewStyle.
const desktopBackdropStyle: ViewStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  justifyContent: 'center',
  alignItems: 'center',
  ...({ backdropFilter: 'blur(8px)' } as ViewStyle),
};

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const {
    type,
    setType,
    commercialStatus,
    setCommercialStatus,
    notes,
    setNotes,
    selectedItems,
    setSelectedItems,
    selectedProjectId,
    setSelectedProjectId,
    screenshotUri,
    isOverrideMarginAcknowledged,
    setIsOverrideMarginAcknowledged,
    hasDiscrepancy,
    objectionReason,
    setObjectionReason,
    isPriceTooHigh,
    negotiatedPrice,
    setNegotiatedPrice,
    competitorPrice,
    setCompetitorPrice,
    viberMessageText,
    setViberMessageText,
    selectedCurrency,
    setSelectedCurrency,
    skuSearch,
    setSkuSearch,
    availableItems,
    projects,
    stocksMap,
    isSaving,
    isBlocked,
    hasCollectionToday,
    lastInteractionLog,
    annotationModalVisible,
    pendingAnnotationUri,
    getItemPrice,
    handleInterceptScreenshot,
    handleAnnotated,
    handleCloseAnnotation,
    toggleItem,
    updateStockCondition,
    updateQuantity,
    updateSelectedUnit,
    updateUnitPrice,
    onAuditSwipe,
    handleDuplicateLastOrder,
    handleSave,
  } = useInteractionLogging(visible, shop, onClose);

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
        style={isDesktop ? desktopBackdropStyle : undefined}
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

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {shop && (
                <Box mb="m">
                  <Card mb="s">
                    <Text variant="body" fontWeight="bold">
                      {t('shopLabel')}: {shop.name}
                    </Text>
                  </Card>
                </Box>
              )}

              <InteractionStatusBanners
                isBlocked={isBlocked}
                hasCollectionToday={hasCollectionToday}
                hasDiscrepancy={hasDiscrepancy}
              />

              <ViberIntegration
                type={type}
                setType={setType}
                shop={shop}
                screenshotUri={screenshotUri}
                setScreenshotUri={handleInterceptScreenshot}
                viberMessageText={viberMessageText}
                setViberMessageText={setViberMessageText}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                setCommercialStatus={setCommercialStatus}
              />

              <GemmaCopilot
                notes={notes}
                setNotes={setNotes}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                setCommercialStatus={setCommercialStatus}
              />

              <CommercialStatusSelector
                commercialStatus={commercialStatus}
                setCommercialStatus={setCommercialStatus}
              />

              <PriceObjectionSection
                objectionReason={objectionReason}
                setObjectionReason={setObjectionReason}
                negotiatedPrice={negotiatedPrice}
                setNegotiatedPrice={setNegotiatedPrice}
                competitorPrice={competitorPrice}
                setCompetitorPrice={setCompetitorPrice}
                isPriceTooHigh={isPriceTooHigh}
                selectedCurrency={selectedCurrency}
              />

              <CurrencySelector
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
              />

              <AvailableItemsSelector
                skuSearch={skuSearch}
                setSkuSearch={setSkuSearch}
                availableItems={availableItems}
                selectedItems={selectedItems}
                toggleItem={toggleItem}
                getItemPrice={getItemPrice}
                selectedCurrency={selectedCurrency}
                stocksMap={stocksMap}
                onAuditSwipe={onAuditSwipe}
              />

              <SelectedItemsList
                selectedItems={selectedItems}
                updateQuantity={updateQuantity}
                updateSelectedUnit={updateSelectedUnit}
                updateUnitPrice={updateUnitPrice}
                getItemPrice={getItemPrice}
                selectedCurrency={selectedCurrency}
                updateStockCondition={updateStockCondition}
                isOverrideMarginAcknowledged={isOverrideMarginAcknowledged}
                setIsOverrideMarginAcknowledged={
                  setIsOverrideMarginAcknowledged
                }
                lastInteractionLog={lastInteractionLog}
                onDuplicateLastOrder={handleDuplicateLastOrder}
                projects={projects}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
              />

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
      <ImageAnnotationModal
        visible={annotationModalVisible}
        imageUri={pendingAnnotationUri}
        onClose={handleCloseAnnotation}
        onAnnotated={handleAnnotated}
      />
    </Modal>
  );
}
