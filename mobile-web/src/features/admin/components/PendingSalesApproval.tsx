import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, isNull } from 'drizzle-orm';
import { ActorService } from '../../../core/auth/ActorService';
import { Check, X, ShieldAlert, ShoppingBag, User } from 'lucide-react-native';

export function PendingSalesApproval() {
  const theme = useTheme<Theme>();
  const [loading, setLoading] = useState(true);
  const [pendingSales, setPendingSales] = useState<any[]>([]);

  const loadPendingSales = async () => {
    setLoading(true);
    try {
      // Query interaction logs with approved_by_id as null
      const logs = await database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(isNull(sqliteSchema.interaction_logs.approved_by_id));

      // Query all interaction items, items, and shops
      const allLogItems = await database
        .select()
        .from(sqliteSchema.interaction_items);
      const allItemsList = await database.select().from(sqliteSchema.items);
      const allShopsList = await database.select().from(sqliteSchema.shops);

      const mapped = logs.map((log) => {
        const shopObj = allShopsList.find((s) => s.id === log.shop_id) || {
          name: 'Unknown Shop',
          address: 'Unknown Address',
        };

        // Filter items for this log
        const logItems = allLogItems.filter(
          (li) => li.interaction_log_id === log.id,
        );

        let hasMarginOverride = false;
        const itemsDetailed = logItems.map((li) => {
          const itemObj = allItemsList.find((i) => i.id === li.item_id) || {
            name: 'Unknown Item',
            sku: 'N/A',
            base_wholesale_price: 0,
          };

          const isOverride =
            li.unit_price_at_sale < (itemObj.base_wholesale_price || 0);
          if (isOverride) {
            hasMarginOverride = true;
          }

          return {
            id: li.id,
            name: itemObj.name,
            sku: itemObj.sku,
            quantity: li.quantity,
            unitPriceAtSale: li.unit_price_at_sale,
            baseWholesalePrice: itemObj.base_wholesale_price || 0,
            selectedUnit: li.selected_unit || 'PCS',
            selectedCurrency: li.selected_currency || 'MMK',
            isOverride,
          };
        });

        // Compute total price
        const totalAmount = itemsDetailed.reduce(
          (sum, item) => sum + item.unitPriceAtSale * item.quantity,
          0,
        );

        return {
          id: log.id,
          shopName: shopObj.name,
          shopAddress: shopObj.address,
          repId: log.rep_id,
          type: log.type,
          commercialStatus: log.commercial_status,
          notes: log.notes,
          createdAt: log.created_at,
          executedById: log.executed_by_id,
          salespersonId: log.salesperson_id,
          items: itemsDetailed,
          totalAmount,
          hasMarginOverride,
        };
      });

      // Filter for orders (logs that are actual sales, e.g. type is ORDER or commercial_status is ORDERED, and has items)
      // Standard audit events and visits can also be displayed, but approvals are primarily for orders.
      const orderLogsOnly = mapped.filter((log) => log.items.length > 0);
      setPendingSales(orderLogsOnly);
    } catch (e) {
      console.error('Failed to load pending sales approvals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sale: any) => {
    try {
      const now = Date.now();
      const managerActorId = ActorService.getActorId();

      await database
        .update(sqliteSchema.interaction_logs)
        .set({
          approved_by_id: managerActorId,
          updated_at: now,
        })
        .where(eq(sqliteSchema.interaction_logs.id, sale.id));

      Alert.alert('Approved', 'Sale order approved successfully.');
      await loadPendingSales();
    } catch (e) {
      console.error('Failed to approve sales order:', e);
      Alert.alert('Error', 'Failed to approve order.');
    }
  };

  const handleReject = async (sale: any) => {
    try {
      const now = Date.now();
      const managerActorId = ActorService.getActorId();

      await database
        .update(sqliteSchema.interaction_logs)
        .set({
          approved_by_id: `REJECTED-${managerActorId}`,
          commercial_status: 'CANCELLED',
          updated_at: now,
        })
        .where(eq(sqliteSchema.interaction_logs.id, sale.id));

      Alert.alert('Rejected', 'Sale order rejected and marked as cancelled.');
      await loadPendingSales();
    } catch (e) {
      console.error('Failed to reject sales order:', e);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, []);

  if (loading) {
    return (
      <Box py="xl" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={theme.colors.primaryButton} />
      </Box>
    );
  }

  return (
    <Box p="m" bg="mainBackground">
      <Box flexDirection="row" alignItems="center" mb="m">
        <ShoppingBag
          size={20}
          color={theme.colors.primaryButton}
          style={{ marginRight: 8 }}
        />
        <Text variant="title" fontSize={18}>
          Pending Sales & Margin Approvals
        </Text>
      </Box>

      {pendingSales.length === 0 ? (
        <Card
          p="l"
          alignItems="center"
          bg="secondaryBackground"
          borderColor="borderColor"
          borderWidth={1}
        >
          <Text variant="bodySecondary" fontStyle="italic">
            No pending sales order approvals in queue.
          </Text>
        </Card>
      ) : (
        <ScrollView>
          <Box gap="m">
            {pendingSales.map((sale) => (
              <Card
                key={sale.id}
                p="m"
                borderColor="borderColor"
                borderWidth={1}
                bg="secondaryBackground"
              >
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb="s"
                >
                  <Box flex={1} mr="m">
                    <Text variant="body" fontWeight="bold" fontSize={15}>
                      {sale.shopName}
                    </Text>
                    <Text variant="bodySecondary" fontSize={12}>
                      {sale.shopAddress}
                    </Text>
                  </Box>
                  <Box bg="primaryButton" px="s" py="xs" borderRadius="s">
                    <Text
                      variant="body"
                      fontSize={11}
                      color="pureWhite"
                      fontWeight="bold"
                    >
                      {sale.commercialStatus}
                    </Text>
                  </Box>
                </Box>

                {/* Warnings for Overrides */}
                {sale.hasMarginOverride && (
                  <Box
                    bg="dangerBg"
                    p="s"
                    borderRadius="s"
                    mb="s"
                    borderColor="danger"
                    borderWidth={1}
                    flexDirection="row"
                    alignItems="center"
                  >
                    <ShieldAlert
                      size={16}
                      color={theme.colors.dangerText}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      variant="bodySecondary"
                      color="dangerText"
                      fontWeight="bold"
                      fontSize={12}
                      style={{ flex: 1 }}
                    >
                      Warning: Margin Override Detected (Sale Price &lt;
                      Wholesale Min)
                    </Text>
                  </Box>
                )}

                {/* Items List */}
                <Box mb="m" bg="mainBackground" p="s" borderRadius="s">
                  {sale.items.map((item: any, itemIdx: number) => (
                    <Box
                      key={`${item.id}-${itemIdx}`}
                      flexDirection="row"
                      justifyContent="space-between"
                      alignItems="center"
                      py="xs"
                      style={
                        itemIdx > 0
                          ? {
                              borderTopWidth: 1,
                              borderTopColor: theme.colors.borderColor,
                            }
                          : {}
                      }
                    >
                      <Box flex={1} mr="s">
                        <Text variant="body" fontSize={13} fontWeight="bold">
                          {item.name} ({item.sku})
                        </Text>
                        <Text variant="bodySecondary" fontSize={11}>
                          Qty: {item.quantity} {item.selectedUnit} @{' '}
                          {item.unitPriceAtSale.toLocaleString()}{' '}
                          {item.selectedCurrency}
                        </Text>
                        {item.isOverride && (
                          <Text
                            variant="bodySecondary"
                            fontSize={11}
                            color="dangerText"
                            fontWeight="bold"
                          >
                            Wholesale price is{' '}
                            {item.baseWholesalePrice.toLocaleString()}{' '}
                            {item.selectedCurrency}
                          </Text>
                        )}
                      </Box>
                      <Text variant="body" fontSize={13} fontWeight="bold">
                        {Math.round(
                          item.unitPriceAtSale * item.quantity,
                        ).toLocaleString()}{' '}
                        {item.selectedCurrency}
                      </Text>
                    </Box>
                  ))}

                  {/* Total */}
                  <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    mt="s"
                    pt="s"
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.borderColor,
                    }}
                  >
                    <Text variant="body" fontSize={14} fontWeight="bold">
                      Total Amount
                    </Text>
                    <Text
                      variant="body"
                      fontSize={14}
                      fontWeight="bold"
                      color="primaryText"
                    >
                      {Math.round(sale.totalAmount).toLocaleString()} MMK
                    </Text>
                  </Box>
                </Box>

                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box flexDirection="row" alignItems="center">
                    <User
                      size={14}
                      color={theme.colors.secondaryText}
                      style={{ marginRight: 4 }}
                    />
                    <Text variant="bodySecondary" fontSize={11}>
                      Rep: {sale.salespersonId || sale.repId}
                    </Text>
                  </Box>

                  <Box flexDirection="row" gap="s">
                    <TouchableOpacity
                      onPress={() => handleReject(sale)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: theme.borderRadii.s,
                        backgroundColor: theme.colors.dangerBg,
                      }}
                    >
                      <X
                        size={14}
                        color={theme.colors.dangerText}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        variant="body"
                        fontSize={12}
                        color="dangerText"
                        fontWeight="bold"
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleApprove(sale)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: theme.borderRadii.s,
                        backgroundColor: theme.colors.successBg,
                      }}
                    >
                      <Check
                        size={14}
                        color={theme.colors.successText}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        variant="body"
                        fontSize={12}
                        color="successText"
                        fontWeight="bold"
                      >
                        Approve
                      </Text>
                    </TouchableOpacity>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}
