import {
  Box,
  Text,
  Card,
  Button,
  TextField,
} from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { IntakeNewSkuForm } from '../hooks/useIntakeInventory';

interface RegisterSkuFormProps {
  form: IntakeNewSkuForm;
  controlsActive: boolean;
  geoLockingDisabled: boolean;
  onSubmit: () => void;
  isDesktop: boolean;
}

/** "Register New Product SKU" form card. */
export function RegisterSkuForm({
  form,
  controlsActive,
  geoLockingDisabled,
  onSubmit,
  isDesktop,
}: RegisterSkuFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const {
    sku,
    setSku,
    name,
    setName,
    unitPrice,
    setUnitPrice,
    category,
    setCategory,
    initialStock,
    setInitialStock,
    isAdding,
  } = form;

  const submitTitle = isAdding
    ? t('addingSku')
    : geoLockingDisabled
      ? t('submitSkuApproval')
      : t('addSkuToCatalog');

  return (
    <Box style={{ opacity: controlsActive ? 1 : 0.5 }}>
      <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
        <Text variant="title" mb="m">
          ➕ {t('registerNewSku')}
        </Text>

        <Box
          flexDirection="row"
          flexWrap="wrap"
          style={{ marginHorizontal: -8 }}
        >
          <Box width={isDesktop ? '50%' : '100%'} px="s">
            <TextField
              label={t('skuCode')}
              value={sku}
              onChangeText={setSku}
              placeholder={t('skuPlaceholder')}
            />
          </Box>

          <Box width={isDesktop ? '50%' : '100%'} px="s">
            <TextField
              label={t('productName')}
              value={name}
              onChangeText={setName}
              placeholder={t('productNamePlaceholder')}
            />
          </Box>

          <Box width={isDesktop ? '33.3%' : '100%'} px="s">
            <TextField
              label={t('priceMmk')}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder={t('pricePlaceholder')}
              keyboardType="numeric"
            />
          </Box>

          <Box width={isDesktop ? '33.3%' : '100%'} px="s">
            <TextField
              label={t('category')}
              value={category}
              onChangeText={setCategory}
              placeholder={t('categoryPlaceholder')}
            />
          </Box>

          <Box width={isDesktop ? '33.3%' : '100%'} px="s">
            <TextField
              label={t('initialStockQty')}
              value={initialStock}
              onChangeText={setInitialStock}
              placeholder={t('qtyPlaceholder')}
              keyboardType="numeric"
            />
          </Box>
        </Box>

        <Box mt="m" alignItems="flex-end">
          <Button
            title={submitTitle}
            onPress={onSubmit}
            variant="primary"
            disabled={isAdding || !controlsActive}
          />
        </Box>
      </Card>
    </Box>
  );
}
