import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  TextField,
  Theme,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Check, X, Edit2 } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  ExtendedItem,
  PendingInventoryUpdateRow,
  PENDING_UPDATE_TYPE,
} from '../types';
import { IntakePendingEdit } from '../hooks/useIntakeInventory';

const REJECT_BG = '#FEE2E2';
const REJECT_STROKE = '#EF4444';
const APPROVE_ENABLED_BG = '#D1FAE5';
const APPROVE_DISABLED_BG = '#E2E8F0';
const APPROVE_ENABLED_STROKE = '#10B981';
const APPROVE_DISABLED_STROKE = '#94A3B8';
const APPROVE_ENABLED_TEXT = '#059669';
const APPROVE_DISABLED_TEXT = '#94A3B8';

interface PendingApprovalCardProps {
  update: PendingInventoryUpdateRow;
  warehouseName: string;
  targetItem: ExtendedItem | undefined;
  isManager: boolean;
  hasApprovePermission: boolean;
  pendingEdit: IntakePendingEdit;
  onApprove: (update: PendingInventoryUpdateRow) => void;
  onReject: (update: PendingInventoryUpdateRow) => void;
  onSaveEdit: (update: PendingInventoryUpdateRow) => void;
}

/** A single pending-approval queue entry in either display or inline-edit mode. */
export function PendingApprovalCard({
  update,
  warehouseName,
  targetItem,
  isManager,
  hasApprovePermission,
  pendingEdit,
  onApprove,
  onReject,
  onSaveEdit,
}: PendingApprovalCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const isEditingThis = pendingEdit.editingUpdateId === update.id;
  const isNewSku = update.type === PENDING_UPDATE_TYPE.NEW_SKU;
  const quantityDelta = update.quantity_delta ?? 0;

  return (
    <Card
      p="m"
      mb="s"
      bg="mainBackground"
      borderColor="borderColor"
      borderWidth={1}
    >
      {isEditingThis ? (
        <Box>
          <Text variant="body" fontWeight="bold" mb="s">
            {t('editingPendingRequest')}
          </Text>
          {isNewSku ? (
            <Box>
              <TextField
                label={t('skuCode')}
                value={pendingEdit.editSku}
                onChangeText={pendingEdit.setEditSku}
              />
              <TextField
                label={t('productName')}
                value={pendingEdit.editName}
                onChangeText={pendingEdit.setEditName}
              />
              <TextField
                label={t('priceMmk')}
                value={pendingEdit.editPrice}
                onChangeText={pendingEdit.setEditPrice}
                keyboardType="numeric"
              />
              <TextField
                label={t('category')}
                value={pendingEdit.editCategory}
                onChangeText={pendingEdit.setEditCategory}
              />
              <TextField
                label={t('initialStockQty')}
                value={pendingEdit.editQtyDelta}
                onChangeText={pendingEdit.setEditQtyDelta}
                keyboardType="numeric"
              />
            </Box>
          ) : (
            <Box>
              <Text variant="body" mb="s">
                {t('item')}: {targetItem?.name || t('unknownItem')}
              </Text>
              <TextField
                label={t('quantityAdjustment')}
                value={pendingEdit.editQtyDelta}
                onChangeText={pendingEdit.setEditQtyDelta}
                keyboardType="numeric"
              />
            </Box>
          )}
          <Box flexDirection="row" justifyContent="flex-end" gap="s" mt="s">
            <Button
              title={t('cancel')}
              onPress={pendingEdit.cancelEdit}
              variant="secondary"
            />
            <Button
              title={t('saveChanges')}
              onPress={() => onSaveEdit(update)}
              variant="primary"
            />
          </Box>
        </Box>
      ) : (
        <Box>
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb="xs"
          >
            <Box flex={1} mr="s">
              <Text variant="body" fontWeight="bold">
                {isNewSku
                  ? t('newSkuSubmitted').replace('{name}', update.name || '')
                  : t('stockAdjustmentSubmitted').replace(
                      '{name}',
                      targetItem?.name || t('unknownItem'),
                    )}
              </Text>
              <Text variant="bodySecondary" fontSize={11}>
                {t('submittedByWarehouse')
                  .replace('{rep}', update.submitted_by)
                  .replace('{warehouse}', warehouseName)}
              </Text>
            </Box>
            <Box flexShrink={0} bg="warningBg" px="s" py="xs" borderRadius="s">
              <Text
                variant="bodySecondary"
                color="warningText"
                fontSize={10}
                fontWeight="bold"
              >
                {t('pending')}
              </Text>
            </Box>
          </Box>

          <Box
            flexDirection="row"
            flexWrap="wrap"
            gap="m"
            mt="s"
            borderTopWidth={1}
            borderColor="borderColor"
            pt="s"
          >
            {isNewSku ? (
              <>
                <Text variant="bodySecondary" fontSize={12}>
                  {t('sku')}: <Text fontWeight="bold">{update.sku}</Text>
                </Text>
                <Text variant="bodySecondary" fontSize={12}>
                  {t('price')}:{' '}
                  <Text fontWeight="bold">
                    {t('priceFormatted').replace(
                      '{price}',
                      update.unit_price?.toLocaleString() || '0',
                    )}
                  </Text>
                </Text>
                <Text variant="bodySecondary" fontSize={12}>
                  {t('qty')}:{' '}
                  <Text fontWeight="bold">{update.quantity_delta}</Text>
                </Text>
              </>
            ) : (
              <Text variant="bodySecondary" fontSize={12}>
                {t('delta')}{' '}
                <Text
                  fontWeight="bold"
                  color={quantityDelta >= 0 ? 'successText' : 'dangerText'}
                >
                  {quantityDelta >= 0
                    ? `+${update.quantity_delta}`
                    : update.quantity_delta}
                </Text>
              </Text>
            )}
          </Box>

          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            mt="m"
          >
            <Box>
              {!hasApprovePermission && (
                <Text
                  variant="bodySecondary"
                  color="dangerText"
                  fontSize={11}
                  fontWeight="bold"
                >
                  {t('geofencedLockGoTo').replace('{warehouse}', warehouseName)}
                </Text>
              )}
            </Box>
            <Box flexDirection="row" gap="s">
              {isManager && (
                <TouchableOpacity
                  onPress={() => pendingEdit.startEditUpdate(update)}
                  style={{
                    backgroundColor: theme.colors.secondaryButton,
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <Edit2 size={16} stroke={theme.colors.secondaryButtonText} />
                </TouchableOpacity>
              )}
              {isManager && (
                <TouchableOpacity
                  onPress={() => onReject(update)}
                  style={{
                    backgroundColor: REJECT_BG,
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <X size={16} stroke={REJECT_STROKE} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onApprove(update)}
                disabled={!hasApprovePermission}
                style={{
                  backgroundColor: hasApprovePermission
                    ? APPROVE_ENABLED_BG
                    : APPROVE_DISABLED_BG,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Check
                  size={16}
                  stroke={
                    hasApprovePermission
                      ? APPROVE_ENABLED_STROKE
                      : APPROVE_DISABLED_STROKE
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  variant="body"
                  fontSize={12}
                  fontWeight="bold"
                  style={{
                    color: hasApprovePermission
                      ? APPROVE_ENABLED_TEXT
                      : APPROVE_DISABLED_TEXT,
                  }}
                >
                  {t('approve')}
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </Box>
      )}
    </Card>
  );
}
