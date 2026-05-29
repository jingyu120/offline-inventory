import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Box, Text, Card, Theme, Button } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq } from 'drizzle-orm';
import { Check, X, ShieldAlert, Layers } from 'lucide-react-native';

export function PendingIntakeApproval() {
  const theme = useTheme<Theme>();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  const loadPendingIntakes = async () => {
    setLoading(true);
    try {
      // Query items with status PENDING_APPROVAL
      const itemsList = await database
        .select()
        .from(sqliteSchema.items)
        .where(eq(sqliteSchema.items.inventory_status, 'PENDING_APPROVAL'));

      // Query stocks with status PENDING_APPROVAL
      const stocksList = await database
        .select()
        .from(sqliteSchema.item_stocks)
        .where(
          eq(sqliteSchema.item_stocks.inventory_status, 'PENDING_APPROVAL'),
        );

      // Group/Map them so we can show SKU name, quantity, etc.
      const mapped = stocksList.map((stock) => {
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
          quantity: stock.quantity,
          createdAt: stock.created_at,
        };
      });

      // Also add any items that are PENDING_APPROVAL but don't have matching pending stocks
      const orphanItems = itemsList
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
    } catch (e) {
      console.error('Failed to load pending intakes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (item: any) => {
    try {
      const now = Date.now();
      // Update item_stocks to AVAILABLE
      if (item.stockId) {
        await database
          .update(sqliteSchema.item_stocks)
          .set({
            inventory_status: 'AVAILABLE',
            updated_at: now,
          })
          .where(eq(sqliteSchema.item_stocks.id, item.stockId));
      }

      // Update items to AVAILABLE
      if (item.itemId) {
        await database
          .update(sqliteSchema.items)
          .set({
            inventory_status: 'AVAILABLE',
            updated_at: now,
          })
          .where(eq(sqliteSchema.items.id, item.itemId));
      }

      Alert.alert(
        'Authorized',
        `Successfully authorized SKU ${item.sku} into available stock.`,
      );
      await loadPendingIntakes();
    } catch (e) {
      console.error('Failed to authorize intake:', e);
      Alert.alert('Error', 'Failed to authorize intake update.');
    }
  };

  const handleReject = async (item: any) => {
    try {
      const now = Date.now();
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
      Alert.alert('Rejected', 'Quarantined intake rejected and removed.');
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

  return (
    <Box p="m" bg="mainBackground">
      <Box flexDirection="row" alignItems="center" mb="m">
        <Layers
          size={20}
          color={theme.colors.warningText}
          style={{ marginRight: 8 }}
        />
        <Text variant="title" fontSize={18}>
          Pending Stock & SKU Authorizations
        </Text>
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
            No pending stock intake approvals in queue.
          </Text>
        </Card>
      ) : (
        <ScrollView>
          <Box gap="m">
            {pendingItems.map((item, idx) => (
              <Card
                key={`${item.itemId}-${item.stockId}-${idx}`}
                p="m"
                borderColor="borderColor"
                borderWidth={1}
                bg="secondaryBackground"
              >
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
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
                          QUARANTINED
                        </Text>
                      </Box>
                      <Text variant="body" fontWeight="bold">
                        {item.name}
                      </Text>
                    </Box>
                    <Text variant="bodySecondary" fontSize={13}>
                      SKU: {item.sku} | Category: {item.category}
                    </Text>
                    <Text
                      variant="bodySecondary"
                      fontSize={13}
                      style={{ marginTop: 2 }}
                    >
                      Intake Quantity:{' '}
                      <Text fontWeight="bold" color="primaryText">
                        {item.quantity} PCS
                      </Text>
                    </Text>
                    <Text
                      variant="bodySecondary"
                      fontSize={11}
                      style={{ marginTop: 4 }}
                    >
                      Logged on: {new Date(item.createdAt).toLocaleString()}
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
            ))}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}
