import { Box, Card, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { AlertCircle, ShoppingCart } from 'lucide-react-native';
import { Item } from '@burma-inventory/shared-types';
import { SelectedItemsList } from '../../audit/components/SelectedItemsList';
import { useTranslation } from '../../../core/i18n/i18n';
import { DraftLineItem, InteractionLogRow, ProjectRow } from '../types';

interface OrderBasketProps {
  selectedItems: DraftLineItem[];
  selectedCurrency: string;
  formattedBasketTotal: string;
  getItemPrice: (item: Item) => number;
  updateQuantity: (itemId: string, quantity: string) => void;
  updateSelectedUnit: (itemId: string, unit: string) => void;
  updateUnitPrice: (itemId: string, price: string) => void;
  updateStockCondition: (itemId: string, condition: string) => void;
  isOverrideMarginAcknowledged: boolean;
  setIsOverrideMarginAcknowledged: (val: boolean) => void;
  lastInteractionLog: InteractionLogRow | null;
  onDuplicateLastOrder: () => void;
  projects: ProjectRow[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

export function OrderBasket({
  selectedItems,
  selectedCurrency,
  formattedBasketTotal,
  getItemPrice,
  updateQuantity,
  updateSelectedUnit,
  updateUnitPrice,
  updateStockCondition,
  isOverrideMarginAcknowledged,
  setIsOverrideMarginAcknowledged,
  lastInteractionLog,
  onDuplicateLastOrder,
  projects,
  selectedProjectId,
  setSelectedProjectId,
}: OrderBasketProps): React.JSX.Element {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  if (selectedItems.length === 0) {
    return (
      <Card
        p="m"
        mb="m"
        alignItems="center"
        borderColor="borderColor"
        borderWidth={1}
      >
        <Box mb="s">
          <AlertCircle size={24} stroke={theme.colors.secondaryText} />
        </Box>
        <Text variant="bodySecondary">{t('draftOrderBasketEmpty')}</Text>
      </Card>
    );
  }

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Box flexDirection="row" alignItems="center" mb="s">
        <Box mr="xs">
          <ShoppingCart size={18} stroke={theme.colors.primaryButton} />
        </Box>
        <Text variant="body" fontWeight="bold">
          {t('orderBasket')}
        </Text>
      </Box>

      <SelectedItemsList
        selectedItems={selectedItems}
        updateQuantity={updateQuantity}
        updateSelectedUnit={updateSelectedUnit}
        updateUnitPrice={updateUnitPrice}
        getItemPrice={getItemPrice}
        selectedCurrency={selectedCurrency}
        updateStockCondition={updateStockCondition}
        isOverrideMarginAcknowledged={isOverrideMarginAcknowledged}
        setIsOverrideMarginAcknowledged={setIsOverrideMarginAcknowledged}
        lastInteractionLog={lastInteractionLog}
        onDuplicateLastOrder={onDuplicateLastOrder}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        borderTopWidth={1}
        borderTopColor="borderColor"
        pt="m"
        mt="s"
      >
        <Text variant="body" fontWeight="bold">
          {t('totalOrderValue')}
        </Text>
        <Text variant="header" fontSize={18} color="primaryButton">
          {formattedBasketTotal}
        </Text>
      </Box>
    </Card>
  );
}
