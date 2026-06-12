import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  ActivityIndicator,
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
  useResponsive,
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
} from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';

interface HitlVerificationPanelProps {
  shops: $Any[];
}

export const HitlVerificationPanel: React.FC<HitlVerificationPanelProps> = ({
  shops,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const { isDesktop } = useResponsive();

  const [logs, setLogs] = useState<$Any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<$Any[]>([]);

  // Selection state
  const [selectedLog, setSelectedLog] = useState<$Any | null>(null);

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

  const handleSelectLog = (log: $Any) => {
    setSelectedLog(log);
    setShopId(log.shop_id || '');
    setNotes(log.notes || '');

    // Map existing items
    const mapped = (log.items || []).map((ii: $Any) => ({
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

  const handleItemChange = (index: number, key: string, val: $Any) => {
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
      alert(t('selectShopAccountAlert'));
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
    } catch (e: $Any) {
      console.error('[HITL] Failed to resolve log:', e);
      alert(t('errorResolvingMismatch', { error: e.message || e }));
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
    { label: t('unitPcs'), value: 'PCS' },
    { label: t('unitBox'), value: 'BOX' },
    { label: t('unitPack'), value: 'PACK' },
    { label: t('unitRoll'), value: 'ROLL' },
  ];

  const conditionOptions = [
    { label: t('conditionGood'), value: 'GOOD' },
    { label: t('conditionDamaged'), value: 'DAMAGED' },
    { label: t('conditionExpired'), value: 'EXPIRED' },
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
          <Text variant="title">{t('resolveDocMismatch')}</Text>
          <Button
            title={t('backToList')}
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
                {t('viberDocScreenshot')}
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL(imageUrl)}>
                <Box flexDirection="row" alignItems="center" gap="xs">
                  <Text
                    variant="bodySecondary"
                    color="brand"
                    style={{ fontSize: 13 }}
                  >
                    {t('openFullResolution')}
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
                {t('logIdTimestamp', {
                  id: selectedLog.id,
                  date: new Date(selectedLog.created_at).toLocaleString(),
                })}
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
              {t('editableOrderParams')}
            </Text>

            <Box mb="m">
              <DropdownSelector
                label={t('assignedShopAccount')}
                selectedValue={shopId}
                onValueChange={(val) => setShopId(val)}
                options={shopOptions}
                placeholder={t('chooseShopAccount')}
              />
            </Box>

            <Box mb="m">
              <Text variant="body" fontWeight="bold" mb="xs">
                {t('operatorReviewNotes')}
              </Text>
              <ThemedTextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('enterCorrectionsPlaceholder')}
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
                  {t('orderLineItems')}
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
                      {t('addItem')}
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
                  <Text variant="bodySecondary">{t('noItemsParsed')}</Text>
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
                            {t('itemNum', { num: idx + 1 })}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveItem(idx)}
                          >
                            <Trash2 size={16} color={theme.colors.errorText} />
                          </TouchableOpacity>
                        </Box>

                        <Box mb="s">
                          <DropdownSelector
                            label={t('selectItem')}
                            selectedValue={item.itemId}
                            onValueChange={(val) =>
                              handleItemChange(idx, 'itemId', val)
                            }
                            options={itemOptions}
                            placeholder={t('chooseCatalogItem')}
                          />
                        </Box>

                        <Box
                          flexDirection="row"
                          flexWrap="wrap"
                          gap="s"
                          mb="xs"
                        >
                          <Box flex={1} style={{ minWidth: 90 }}>
                            <Text
                              variant="bodySecondary"
                              mb="xs"
                              style={{ fontSize: 12 }}
                            >
                              {t('quantity')}
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

                          <Box flex={1.2} style={{ minWidth: 110 }}>
                            <Text
                              variant="bodySecondary"
                              mb="xs"
                              style={{ fontSize: 12 }}
                            >
                              {t('unitPriceMmk')}
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

                          <Box flex={1} style={{ minWidth: 90 }}>
                            <DropdownSelector
                              label={t('unit')}
                              selectedValue={item.selectedUnit}
                              onValueChange={(val) =>
                                handleItemChange(idx, 'selectedUnit', val)
                              }
                              options={unitOptions}
                              placeholder={t('unit')}
                            />
                          </Box>

                          <Box flex={1.2} style={{ minWidth: 110 }}>
                            <DropdownSelector
                              label={t('condition')}
                              selectedValue={item.stockCondition}
                              onValueChange={(val) =>
                                handleItemChange(idx, 'stockCondition', val)
                              }
                              options={conditionOptions}
                              placeholder={t('condition')}
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
                      ? t('applyingResolution')
                      : t('approveSaveResolution')
                  }
                  onPress={handleSubmitResolution}
                  variant="primary"
                  disabled={submitting}
                />
              </Box>
              <Box flex={0.4}>
                <Button
                  title={t('cancel')}
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
            <Text variant="title">{t('hitlTitle')}</Text>
            <Text variant="bodySecondary">{t('hitlDesc')}</Text>
          </Box>
          <Button
            title={loading ? t('refreshing') : t('refresh')}
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
              {t('allCaughtUp')}
            </Text>
            <Text variant="bodySecondary">{t('noUnresolvedMismatch')}</Text>
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
                          {t('mismatch')}
                        </Text>
                      </Box>
                      <Text variant="body" fontWeight="bold">
                        {log.shopName}
                      </Text>
                    </Box>
                    <Text variant="bodySecondary" mb="s">
                      {t('notes')}: {log.notes || t('none')}
                    </Text>
                    <Text variant="bodySecondary" style={{ fontSize: 12 }}>
                      {t('logIdItemsCreated', {
                        id: log.id,
                        count: log.items?.length || 0,
                        date: new Date(log.created_at).toLocaleString(),
                      })}
                    </Text>
                  </Box>

                  <Box alignSelf={isDesktop ? 'center' : 'flex-end'}>
                    <Button
                      title={t('inspectResolve')}
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
