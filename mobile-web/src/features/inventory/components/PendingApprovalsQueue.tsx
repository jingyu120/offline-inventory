import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  ExtendedItem,
  PendingInventoryUpdateRow,
  StockLocationRow,
} from '../types';
import { canRepApproveUpdate, resolveWarehouseName } from '../stockHelpers';
import { IntakePendingEdit } from '../hooks/useIntakeInventory';
import { PendingApprovalCard } from './PendingApprovalCard';

interface PendingApprovalsQueueProps {
  pendingUpdates: PendingInventoryUpdateRow[];
  warehouses: StockLocationRow[];
  items: ExtendedItem[];
  isManager: boolean;
  selectedWarehouseId: string;
  isNearWarehouse: boolean;
  pendingEdit: IntakePendingEdit;
  onApprove: (update: PendingInventoryUpdateRow) => void;
  onReject: (update: PendingInventoryUpdateRow) => void;
  onSaveEdit: (update: PendingInventoryUpdateRow) => void;
}

const UNKNOWN_WAREHOUSE = 'Unknown Warehouse';
const COUNT_TOKEN = '{count}';

/** "Pending Approvals Queue" panel; hidden when there are no pending updates. */
export function PendingApprovalsQueue({
  pendingUpdates,
  warehouses,
  items,
  isManager,
  selectedWarehouseId,
  isNearWarehouse,
  pendingEdit,
  onApprove,
  onReject,
  onSaveEdit,
}: PendingApprovalsQueueProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  if (pendingUpdates.length === 0) {
    return null;
  }

  return (
    <Card
      p="m"
      mb="m"
      borderColor="borderColor"
      borderWidth={1}
      bg="secondaryBackground"
    >
      <Box flexDirection="row" alignItems="center" mb="m">
        <RefreshCw
          size={18}
          stroke={theme.colors.warningText}
          style={{ marginRight: 8 }}
        />
        <Text variant="title">
          {t('pendingApprovalsQueueCount').replace(
            COUNT_TOKEN,
            pendingUpdates.length.toString(),
          )}
        </Text>
      </Box>

      {pendingUpdates.map((update) => {
        const warehouseName = resolveWarehouseName(
          warehouses,
          update.location_id,
          UNKNOWN_WAREHOUSE,
        );
        const targetItem = items.find((i) => i.id === update.item_id);
        const hasApprovePermission =
          isManager ||
          canRepApproveUpdate(update, selectedWarehouseId, isNearWarehouse);

        return (
          <PendingApprovalCard
            key={update.id}
            update={update}
            warehouseName={warehouseName}
            targetItem={targetItem}
            isManager={isManager}
            hasApprovePermission={hasApprovePermission}
            pendingEdit={pendingEdit}
            onApprove={onApprove}
            onReject={onReject}
            onSaveEdit={onSaveEdit}
          />
        );
      })}
    </Card>
  );
}
