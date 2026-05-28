import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  DropdownSelector,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { trpcClient } from '../../../core/trpc/trpcClient';
import { fetchItemsAndStockLevel } from '../../../core/data/repositories';
import { API_BASE_URL } from '../../../config/appConfig';
import {
  Trash2,
  Plus,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';

interface HitlVerificationPanelProps {
  shops: any[];
}

export const HitlVerificationPanel: React.FC<HitlVerificationPanelProps> = ({
  shops,
}) => {
  const theme = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);

  // Selection state
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Form states for selected log resolution
  const [shopId, setShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
      selectedUnit: string;
      stockCondition: string;
    }>
  >([]);

  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await trpcClient.getMismatchLogs.query();
      setLogs(data || []);
    } catch (e) {
      console.error('[HITL] Failed to load mismatch logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const loadItems = async () => {
      try {
        const { items } = await fetchItemsAndStockLevel();
        setAllItems(items || []);
      } catch (e) {
        console.error('[HITL] Failed to load items catalog:', e);
      }
    };
    loadItems();
  }, []);

  const handleSelectLog = (log: any) => {
    setSelectedLog(log);
    setShopId(log.shop_id || '');
    setNotes(log.notes || '');

    // Map existing items
    const mapped = (log.items || []).map((ii: any) => ({
      itemId: ii.item_id,
      quantity: ii.quantity || 1,
      unitPrice: ii.unit_price_at_sale || ii.unit_price || 0,
      selectedUnit: ii.selected_unit || 'PCS',
      stockCondition: ii.stock_condition || 'GOOD',
    }));
    setItems(mapped);
  };

  const handleAddItem = () => {
    const firstItem = allItems[0];
    setItems([
      ...items,
      {
        itemId: firstItem ? firstItem.id : '',
        quantity: 1,
        unitPrice: firstItem ? firstItem.unit_price || 0 : 0,
        selectedUnit: 'PCS',
        stockCondition: 'GOOD',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, key: string, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [key]: val };

    // Auto-populate price if item selection changed
    if (key === 'itemId') {
      const catalogItem = allItems.find((i) => i.id === val);
      if (catalogItem) {
        item.unitPrice = catalogItem.unit_price || 0;
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleSubmitResolution = async () => {
    if (!selectedLog) return;
    if (!shopId) {
      alert('Please select a shop account.');
      return;
    }

    setSubmitting(true);
    try {
      await trpcClient.resolveMismatchLog.mutate({
        logId: selectedLog.id,
        shopId,
        notes,
        items,
      });
      setSelectedLog(null);
      await fetchLogs();
    } catch (e: any) {
      console.error('[HITL] Failed to resolve log:', e);
      alert(`Error resolving mismatch: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const shopOptions = shops.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const itemOptions = allItems.map((i) => ({
    label: `${i.name} (${i.sku})`,
    value: i.id,
  }));

  const unitOptions = [
    { label: 'PCS', value: 'PCS' },
    { label: 'BOX', value: 'BOX' },
    { label: 'PACK', value: 'PACK' },
    { label: 'ROLL', value: 'ROLL' },
  ];

  const conditionOptions = [
    { label: 'GOOD', value: 'GOOD' },
    { label: 'DAMAGED', value: 'DAMAGED' },
    { label: 'EXPIRED', value: 'EXPIRED' },
  ];

  if (selectedLog) {
    const imageUrl = `${API_BASE_URL}${selectedLog.viber_screenshot_url}`;

    return (
      <Box p="m">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          mb="m"
        >
          <Text variant="title">Resolve Document Verification Mismatch</Text>
          <Button
            title="Back to List"
            onPress={() => setSelectedLog(null)}
            variant="outline"
            size="small"
          />
        </Box>

        <Box flexDirection={isDesktop ? 'row' : 'column'} gap="m">
          {/* Left Panel: Document Screenshot */}
          <Box
            flex={1}
            minHeight={400}
            bg="mainBackground"
            borderRadius="m"
            borderWidth={1}
            borderColor="borderColor"
            overflow="hidden"
            p="m"
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="s"
            >
              <Text variant="body" fontWeight="bold">
                Original Viber Document Screenshot
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL(imageUrl)}>
                <Box flexDirection="row" alignItems="center" gap="xs">
                  <Text
                    variant="bodySecondary"
                    color="brand"
                    style={{ fontSize: 13 }}
                  >
                    Open Full Resolution
                  </Text>
                  <ExternalLink size={14} color={theme.colors.brand} />
                </Box>
              </TouchableOpacity>
            </Box>

            <Box
              flex={1}
              justifyContent="center"
              alignItems="center"
              bg="secondaryBackground"
              borderRadius="m"
              overflow="hidden"
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'contain',
                  minHeight: 350,
                }}
              />
            </Box>

            <Box mt="s">
              <Text variant="bodySecondary">
                Log ID: {selectedLog.id} | Timestamp:{' '}
                {new Date(selectedLog.created_at).toLocaleString()}
              </Text>
            </Box>
          </Box>

          {/* Right Panel: Resolution Form */}
          <Box
            flex={1.2}
            bg="cardBackground"
            p="m"
            borderRadius="m"
            borderWidth={1}
            borderColor="borderColor"
          >
            <Text variant="body" fontWeight="bold" mb="m" color="brand">
              Editable Order Parameters
            </Text>

            <Box mb="m">
              <DropdownSelector
                label="Assigned Shop Account"
                selectedValue={shopId}
                onValueChange={(val) => setShopId(val)}
                options={shopOptions}
                placeholder="Choose Shop Account..."
              />
            </Box>

            <Box mb="m">
              <Text variant="body" fontWeight="bold" mb="xs">
                Operator Review Notes
              </Text>
              <ThemedTextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter corrections, reasons, or verification notes..."
                multiline
                numberOfLines={3}
                minHeight={80}
                p="s"
                borderColor="slate300"
                borderWidth={1}
                borderRadius="s"
                bg="mainBackground"
                style={{
                  textAlignVertical: 'top',
                  color: theme.colors.primaryText,
                }}
              />
            </Box>

            <Box mb="m">
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                mb="s"
              >
                <Text variant="body" fontWeight="bold">
                  Order Line Items
                </Text>
                <TouchableOpacity onPress={handleAddItem}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    gap="xs"
                    bg="success"
                    px="s"
                    py="xs"
                    borderRadius="s"
                  >
                    <Plus size={14} color="white" />
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color="pureWhite"
                      style={{ fontSize: 13 }}
                    >
                      Add Item
                    </Text>
                  </Box>
                </TouchableOpacity>
              </Box>

              {items.length === 0 ? (
                <Box
                  p="m"
                  borderStyle="dashed"
                  borderWidth={1}
                  borderColor="borderColor"
                  borderRadius="s"
                  alignItems="center"
                >
                  <Text variant="bodySecondary">
                    No items parsed. Click "Add Item" to add items manually.
                  </Text>
                </Box>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  <Box gap="s">
                    {items.map((item, idx) => (
                      <Card
                        key={idx}
                        p="s"
                        bg="mainBackground"
                        borderLeftWidth={3}
                        borderLeftColor="brand"
                      >
                        <Box
                          flexDirection="row"
                          justifyContent="space-between"
                          alignItems="center"
                          mb="s"
                        >
                          <Text variant="body" fontWeight="bold">
                            Item #{idx + 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveItem(idx)}
                          >
                            <Trash2 size={16} color={theme.colors.errorText} />
                          </TouchableOpacity>
                        </Box>

                        <Box mb="s">
                          <DropdownSelector
                            label="Select Item"
                            selectedValue={item.itemId}
                            onValueChange={(val) =>
                              handleItemChange(idx, 'itemId', val)
                            }
                            options={itemOptions}
                            placeholder="Choose catalog item..."
                          />
                        </Box>

                        <Box flexDirection="row" gap="s" mb="xs">
                          <Box flex={1}>
                            <Text
                              variant="bodySecondary"
                              mb="xs"
                              style={{ fontSize: 12 }}
                            >
                              Quantity
                            </Text>
                            <ThemedTextInput
                              keyboardType="numeric"
                              value={item.quantity.toString()}
                              onChangeText={(val) =>
                                handleItemChange(
                                  idx,
                                  'quantity',
                                  parseInt(val, 10) || 0,
                                )
                              }
                              p="xs"
                              borderColor="slate300"
                              borderWidth={1}
                              borderRadius="s"
                              bg="cardBackground"
                              style={{ color: theme.colors.primaryText }}
                            />
                          </Box>

                          <Box flex={1.2}>
                            <Text
                              variant="bodySecondary"
                              mb="xs"
                              style={{ fontSize: 12 }}
                            >
                              Unit Price (MMK)
                            </Text>
                            <ThemedTextInput
                              keyboardType="numeric"
                              value={item.unitPrice.toString()}
                              onChangeText={(val) =>
                                handleItemChange(
                                  idx,
                                  'unitPrice',
                                  parseFloat(val) || 0,
                                )
                              }
                              p="xs"
                              borderColor="slate300"
                              borderWidth={1}
                              borderRadius="s"
                              bg="cardBackground"
                              style={{ color: theme.colors.primaryText }}
                            />
                          </Box>

                          <Box flex={1}>
                            <DropdownSelector
                              label="Unit"
                              selectedValue={item.selectedUnit}
                              onValueChange={(val) =>
                                handleItemChange(idx, 'selectedUnit', val)
                              }
                              options={unitOptions}
                              placeholder="Unit"
                            />
                          </Box>

                          <Box flex={1.2}>
                            <DropdownSelector
                              label="Condition"
                              selectedValue={item.stockCondition}
                              onValueChange={(val) =>
                                handleItemChange(idx, 'stockCondition', val)
                              }
                              options={conditionOptions}
                              placeholder="Condition"
                            />
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </ScrollView>
              )}
            </Box>

            <Box mt="m" flexDirection="row" gap="s">
              <Box flex={1}>
                <Button
                  title={
                    submitting
                      ? 'Applying Resolution...'
                      : 'Approve & Save Resolution'
                  }
                  onPress={handleSubmitResolution}
                  variant="primary"
                  disabled={submitting}
                />
              </Box>
              <Box flex={0.4}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedLog(null)}
                  variant="outline"
                  disabled={submitting}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box p="m">
      <Card p="m" bg="cardBackground">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          mb="m"
        >
          <Box flex={1} mr="s">
            <Text variant="title">Human-in-the-Loop Resolutions</Text>
            <Text variant="bodySecondary">
              Manage and resolve Viber message order OCR ingestion mismatches
              manually.
            </Text>
          </Box>
          <Button
            title={loading ? 'Refreshing...' : 'Refresh'}
            onPress={fetchLogs}
            variant="outline"
            size="small"
            disabled={loading}
          />
        </Box>

        {loading ? (
          <Box py="l" justifyContent="center" alignItems="center">
            <ActivityIndicator
              size="small"
              color={theme.colors.primaryButton}
            />
          </Box>
        ) : logs.length === 0 ? (
          <Box
            p="xl"
            borderStyle="dashed"
            borderWidth={1.5}
            borderColor="borderColor"
            borderRadius="m"
            justifyContent="center"
            alignItems="center"
          >
            <Box mb="s">
              <Check size={32} color={theme.colors.successText} />
            </Box>
            <Text variant="body" fontWeight="bold" color="successText" mb="xs">
              All Caught Up!
            </Text>
            <Text variant="bodySecondary">
              No unresolved image mismatch logs require attention right now.
            </Text>
          </Box>
        ) : (
          <ScrollView style={{ maxHeight: 600 }}>
            <Box gap="s">
              {logs.map((log) => (
                <Box
                  key={log.id}
                  p="m"
                  borderRadius="m"
                  borderWidth={1}
                  borderColor="borderColor"
                  bg="mainBackground"
                  flexDirection={isDesktop ? 'row' : 'column'}
                  justifyContent="space-between"
                  alignItems={isDesktop ? 'center' : 'stretch'}
                  gap="m"
                >
                  <Box flex={1}>
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      gap="s"
                      mb="xs"
                    >
                      <Box
                        bg="errorBackground"
                        px="s"
                        py="xs"
                        borderRadius="s"
                        flexDirection="row"
                        alignItems="center"
                        gap="xs"
                      >
                        <AlertTriangle
                          size={12}
                          color={theme.colors.errorText}
                        />
                        <Text
                          variant="body"
                          fontWeight="bold"
                          color="errorText"
                          style={{ fontSize: 11 }}
                        >
                          MISMATCH
                        </Text>
                      </Box>
                      <Text variant="body" fontWeight="bold">
                        {log.shopName}
                      </Text>
                    </Box>
                    <Text variant="bodySecondary" mb="s">
                      Notes: {log.notes || 'None'}
                    </Text>
                    <Text variant="bodySecondary" style={{ fontSize: 12 }}>
                      Log ID: {log.id} | Items Count: {log.items?.length || 0} |
                      Created: {new Date(log.created_at).toLocaleString()}
                    </Text>
                  </Box>

                  <Box alignSelf={isDesktop ? 'center' : 'flex-end'}>
                    <Button
                      title="Inspect & Resolve"
                      onPress={() => handleSelectLog(log)}
                      variant="primary"
                      size="small"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </ScrollView>
        )}
      </Card>
    </Box>
  );
};
