import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import {
  database,
  runAtomic,
  type DatabaseType,
} from '../../../core/database/database';
import { guardAsync, sqliteSchema } from '@burma-inventory/shared-types';
import { eq } from 'drizzle-orm';
import { Check, X, Layers, CheckSquare, Square } from 'lucide-react-native';
import { INVENTORY_STATUS } from '../../../config/appConfig';
import { useTranslation } from '../../../core/i18n/i18n';

/** Row shape rendered in the quarantine queue (item joined with its stock). */
interface PendingIntakeRow {
  stockId: string | null;
  itemId: string | null;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  createdAt: number;
}

/** Stable key for selection tracking across both stock-backed and orphan rows. */
const buildRowKey = (row: PendingIntakeRow): string =>
  `${row.itemId ?? 'none'}::${row.stockId ?? 'none'}`;

export function PendingIntakeApproval() {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingIntakeRow[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const loadPendingIntakes = async () => {
    setLoading(true);
    try {
      // Query items with status PENDING_APPROVAL
      const itemsList = await database
        .select()
        .from(sqliteSchema.items)
        .where(
          eq(
            sqliteSchema.items.inventory_status,
            INVENTORY_STATUS.PENDING_APPROVAL,
          ),
        );

      // Query stocks with status PENDING_APPROVAL
      const stocksList = await database
        .select()
        .from(sqliteSchema.item_stocks)
        .where(
          eq(
            sqliteSchema.item_stocks.inventory_status,
            INVENTORY_STATUS.PENDING_APPROVAL,
          ),
        );

      // Group/Map them so we can show SKU name, quantity, etc.
      const mapped: PendingIntakeRow[] = stocksList.map((stock) => {
        // Look up item
        const itemObj = itemsList.find((i) => i.id === stock.item_id) || {
          sku: 'Unknown',
          name: 'Unknown Product',
          category: 'Unknown',
        };
        return {
          stockId: stock.id,
          itemId: stock.item_id,
          sku: itemObj.sku,
          name: itemObj.name,
          category: itemObj.category,
          quantity: stock.good_stock_count,
          createdAt: stock.created_at,
        };
      });

      // Also add any items that are PENDING_APPROVAL but don't have matching pending stocks
      const orphanItems: PendingIntakeRow[] = itemsList
        .filter((item) => !stocksList.some((s) => s.item_id === item.id))
        .map((item) => ({
          stockId: null,
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: 0,
          createdAt: item.created_at,
        }));

      setPendingItems([...mapped, ...orphanItems]);
      setSelectedRowKeys(new Set());
    } catch (e) {
      console.error('Failed to load pending intakes:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowSelection = (rowKey: string): void => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  /**
   * Promotes a single quarantined row to AVAILABLE inside the caller's atomic
   * unit. Shared by the single-row and batch approvals so both apply
   * byte-for-byte identical writes. `runAtomic` makes the batch one real
   * transaction on native and a safe sequential pass on web (see runAtomic).
   */
  const authorizeRow = async (
    tx: DatabaseType,
    row: PendingIntakeRow,
    now: number,
  ): Promise<void> => {
    if (row.stockId) {
      await tx
        .update(sqliteSchema.item_stocks)
        .set({
          inventory_status: INVENTORY_STATUS.AVAILABLE,
          updated_at: now,
        })
        .where(eq(sqliteSchema.item_stocks.id, row.stockId));
    }

    if (row.itemId) {
      await tx
        .update(sqliteSchema.items)
        .set({
          inventory_status: INVENTORY_STATUS.AVAILABLE,
          updated_at: now,
        })
        .where(eq(sqliteSchema.items.id, row.itemId));
    }
  };

  const handleAuthorize = async (item: PendingIntakeRow) => {
    const now = Date.now();
    // Single-row approve runs through the same write path as the batch.
    const [, error] = await guardAsync(
      runAtomic((tx) => authorizeRow(tx, item, now)),
    );

    if (error) {
      console.error('Failed to authorize intake:', error);
      Alert.alert(t('error'), t('skuAuthorizeFailed'));
      return;
    }

    Alert.alert(
      t('authorizedTitle'),
      t('skuAuthorizedSuccess', { sku: item.sku }),
    );
    await loadPendingIntakes();
  };

  const handleAuthorizeSelected = async () => {
    const selectedRows = pendingItems.filter((row) =>
      selectedRowKeys.has(buildRowKey(row)),
    );
    if (selectedRows.length === 0) return;

    const now = Date.now();
    // Promote every selected row to AVAILABLE; local writes sync to Postgres on
    // the next push (offline-first).
    const [, error] = await guardAsync(
      runAtomic(async (tx) => {
        for (const row of selectedRows) {
          await authorizeRow(tx, row, now);
        }
      }),
    );

    if (error) {
      console.error('Failed to authorize selected intakes:', error);
      Alert.alert(t('error'), t('skuAuthorizeFailed'));
      return;
    }

    Alert.alert(
      t('authorizedTitle'),
      t('bulkIntakeAuthorized', { count: selectedRows.length }),
    );
    setSelectedRowKeys(new Set());
    await loadPendingIntakes();
  };

  const handleReject = async (item: PendingIntakeRow) => {
    try {
      // Delete stock update or mark as rejected/deleted
      if (item.stockId) {
        await database
          .delete(sqliteSchema.item_stocks)
          .where(eq(sqliteSchema.item_stocks.id, item.stockId));
      }
      if (item.itemId) {
        await database
          .delete(sqliteSchema.items)
          .where(eq(sqliteSchema.items.id, item.itemId));
      }
      Alert.alert(t('rejectedSuccess'), t('quarantinedIntakeRejected'));
      await loadPendingIntakes();
    } catch (e) {
      console.error('Failed to reject intake:', e);
    }
  };

  useEffect(() => {
    loadPendingIntakes();
  }, []);

  if (loading) {
    return (
      <Box py="xl" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={theme.colors.primaryButton} />
      </Box>
    );
  }

  const selectedCount = selectedRowKeys.size;

  return (
    <Box p="m" bg="mainBackground">
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        mb="m"
      >
        <Box flexDirection="row" alignItems="center" flex={1} mr="s">
          <Layers
            size={20}
            color={theme.colors.warningText}
            style={{ marginRight: 8 }}
          />
          <Text variant="title" fontSize={18}>
            {t('pendingStockSkuAuth')}
          </Text>
        </Box>
        {pendingItems.length > 0 && (
          <Button
            title={t('approveSelected', { count: selectedCount })}
            onPress={handleAuthorizeSelected}
            variant="primary"
            size="small"
            disabled={selectedCount === 0}
          />
        )}
      </Box>

      {pendingItems.length === 0 ? (
        <Card
          p="l"
          alignItems="center"
          bg="secondaryBackground"
          borderColor="borderColor"
          borderWidth={1}
        >
          <Text variant="bodySecondary" fontStyle="italic">
            {t('noPendingIntakeQueue')}
          </Text>
        </Card>
      ) : (
        <ScrollView>
          <Box gap="m">
            {pendingItems.map((item, idx) => {
              const rowKey = buildRowKey(item);
              const isSelected = selectedRowKeys.has(rowKey);
              return (
                <Card
                  key={`${item.itemId}-${item.stockId}-${idx}`}
                  p="m"
                  borderColor={isSelected ? 'primaryButton' : 'borderColor'}
                  borderWidth={1}
                  bg="secondaryBackground"
                >
                  <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <TouchableOpacity
                      onPress={() => toggleRowSelection(rowKey)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      style={{ padding: 8, marginRight: 4 }}
                    >
                      {isSelected ? (
                        <CheckSquare
                          size={20}
                          color={theme.colors.primaryButton}
                        />
                      ) : (
                        <Square size={20} color={theme.colors.secondaryText} />
                      )}
                    </TouchableOpacity>
                    <Box flex={1} mr="m">
                      <Box flexDirection="row" alignItems="center" mb="xs">
                        <Box
                          bg="warningBg"
                          px="s"
                          py="xs"
                          borderRadius="s"
                          mr="s"
                        >
                          <Text
                            variant="body"
                            fontSize={11}
                            color="warningText"
                            fontWeight="bold"
                          >
                            {t('quarantined')}
                          </Text>
                        </Box>
                        <Text variant="body" fontWeight="bold">
                          {item.name}
                        </Text>
                      </Box>
                      <Text variant="bodySecondary" fontSize={13}>
                        {t('sku')}: {item.sku} | {t('category')}:{' '}
                        {item.category}
                      </Text>
                      <Text
                        variant="bodySecondary"
                        fontSize={13}
                        style={{ marginTop: 2 }}
                      >
                        {t('intakeQuantity')}{' '}
                        <Text fontWeight="bold" color="primaryText">
                          {item.quantity} {t('unitPcs')}
                        </Text>
                      </Text>
                      <Text
                        variant="bodySecondary"
                        fontSize={11}
                        style={{ marginTop: 4 }}
                      >
                        {t('loggedOn', {
                          date: new Date(item.createdAt).toLocaleString(),
                        })}
                      </Text>
                    </Box>

                    <Box flexDirection="row" gap="s">
                      <TouchableOpacity
                        onPress={() => handleReject(item)}
                        style={{
                          padding: 8,
                          borderRadius: theme.borderRadii.s,
                          backgroundColor: theme.colors.dangerBg,
                        }}
                      >
                        <X size={18} color={theme.colors.dangerText} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAuthorize(item)}
                        style={{
                          padding: 8,
                          borderRadius: theme.borderRadii.s,
                          backgroundColor: theme.colors.successBg,
                        }}
                      >
                        <Check size={18} color={theme.colors.successText} />
                      </TouchableOpacity>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}
