import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Box,
  Button,
  Text,
  useResponsive,
} from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { useOrderDrafter } from '../hooks/useOrderDrafter';
import { ShopPicker } from './ShopPicker';
import { RawTextInput } from './RawTextInput';
import { CurrencyPicker } from './CurrencyPicker';
import { StagingReview } from './StagingReview';
import { OrderBasket } from './OrderBasket';

export function ViberSimulator(): React.JSX.Element {
  const { t } = useTranslation();
  const { isPhone } = useResponsive();

  const {
    shops,
    projects,
    selectedShop,
    selectedShopId,
    setSelectedShopId,
    rawText,
    setRawText,
    selectedCurrency,
    selectCurrency,
    selectedItems,
    draftStagingItems,
    setDraftStagingItems,
    isParsingNote,
    isSaving,
    isOverrideMarginAcknowledged,
    setIsOverrideMarginAcknowledged,
    selectedProjectId,
    setSelectedProjectId,
    lastInteractionLog,
    formattedBasketTotal,
    getItemPrice,
    handleParse,
    handleSaveOrder,
    handleDuplicateLastOrder,
    commitStagedItems,
    updateQuantity,
    updateSelectedUnit,
    updateUnitPrice,
    updateStockCondition,
    updateStagedQuantity,
    updateStagedUnit,
    updateStagedUnitPrice,
  } = useOrderDrafter();

  const header = (
    <Box mb="m">
      <Text variant="header" fontSize={24}>
        📥 {t('backOfficeOrderDrafter')}
      </Text>
      <Text variant="bodySecondary">{t('pasteRawViberMessageSub')}</Text>
    </Box>
  );

  const intakeColumn = (
    <>
      <ShopPicker
        shops={shops}
        selectedShop={selectedShop}
        selectedShopId={selectedShopId}
        onSelectShop={setSelectedShopId}
      />
      <RawTextInput
        rawText={rawText}
        setRawText={setRawText}
        isParsingNote={isParsingNote}
        onParse={handleParse}
      />
      <CurrencyPicker
        selectedCurrency={selectedCurrency}
        onSelectCurrency={selectCurrency}
      />
    </>
  );

  const reviewColumn = (
    <>
      <StagingReview
        draftStagingItems={draftStagingItems}
        selectedCurrency={selectedCurrency}
        onClearStaged={() => setDraftStagingItems([])}
        onCommit={commitStagedItems}
        updateStagedQuantity={updateStagedQuantity}
        updateStagedUnit={updateStagedUnit}
        updateStagedUnitPrice={updateStagedUnitPrice}
      />
      <OrderBasket
        selectedItems={selectedItems}
        selectedCurrency={selectedCurrency}
        formattedBasketTotal={formattedBasketTotal}
        getItemPrice={getItemPrice}
        updateQuantity={updateQuantity}
        updateSelectedUnit={updateSelectedUnit}
        updateUnitPrice={updateUnitPrice}
        updateStockCondition={updateStockCondition}
        isOverrideMarginAcknowledged={isOverrideMarginAcknowledged}
        setIsOverrideMarginAcknowledged={setIsOverrideMarginAcknowledged}
        lastInteractionLog={lastInteractionLog}
        onDuplicateLastOrder={handleDuplicateLastOrder}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />
    </>
  );

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {!isPhone ? (
          <Box flexDirection="row" flex={1} gap="m">
            <Box flex={1}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                {header}
                {intakeColumn}
                <Box height={40} />
              </ScrollView>
            </Box>

            <Box flex={1.2}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                {reviewColumn}
                <Box height={40} />
              </ScrollView>
            </Box>
          </Box>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {header}
            {intakeColumn}
            {reviewColumn}
            <Box height={40} />
          </ScrollView>
        )}

        <Box
          p="m"
          borderTopWidth={1}
          borderColor="borderColor"
          bg="cardBackground"
        >
          <Button
            title={t('saveOrderLog')}
            onPress={handleSaveOrder}
            isLoading={isSaving}
            disabled={!selectedShopId || selectedItems.length === 0}
          />
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}

export default ViberSimulator;
