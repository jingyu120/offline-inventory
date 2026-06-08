import { useState, useEffect, ChangeEvent } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Box, Text, Card, Button } from '@burma-inventory/ui-components';
import { database } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, and, or, asc } from 'drizzle-orm';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import { API_BASE_URL } from '../../../config/appConfig';
import axios from 'axios';
import { syncData } from '../../sync/sync';

type Shop = typeof sqliteSchema.shops.$inferSelect;
type Invoice = typeof sqliteSchema.invoices.$inferSelect;
type Payment = typeof sqliteSchema.payments.$inferSelect;

interface ReconcileSummary {
  applied: {
    id: string;
    amount: number;
    outstanding: number;
    allocated: number;
    newState: string;
    dueDate: number;
  }[];
  remainingAmount: number;
}

export function PendingReconciliationPanel() {
  const { t } = useTranslation();
  const { activeRep } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [shopSearch, setShopSearch] = useState<string>('');
  const [showShopList, setShowShopList] = useState<boolean>(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);

  // Upload/OCR state
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);

  // Editable fields
  const [transactionId, setTransactionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');

  // Reconcile status
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);

  const loadShops = async () => {
    try {
      const list = await database.select().from(sqliteSchema.shops);
      setShops(list);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadInvoices = async (shopId: string) => {
    if (!shopId) {
      setInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    try {
      const list = await database
        .select()
        .from(sqliteSchema.invoices)
        .where(
          and(
            eq(sqliteSchema.invoices.shop_id, shopId),
            or(
              eq(sqliteSchema.invoices.state, 'PENDING'),
              eq(sqliteSchema.invoices.state, 'PARTIALLY_PAID'),
            ),
          ),
        )
        .orderBy(asc(sqliteSchema.invoices.due_date));
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadPayments = async () => {
    try {
      const list = await database.select().from(sqliteSchema.payments);
      setPayments(list);
    } catch (err) {
      console.warn('Failed to load payments:', err);
    }
  };

  useEffect(() => {
    loadShops();
    loadPayments();
  }, []);

  useEffect(() => {
    loadInvoices(selectedShopId);
  }, [selectedShopId]);

  // Handle OCR File drop/selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_BASE_URL}/sync/ai/parse-payment-transfer`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const data = response.data;
      if (data) {
        setTransactionId(data.transactionId || '');
        setAmount(data.amount ? String(data.amount) : '');
        setSenderName(data.senderName || '');
        setTimestamp(data.timestamp || '');
        setScreenshotUrl(data.screenshotUrl || '');
        Alert.alert(t('success'), t('ocrSuccess'));
      }
    } catch (err) {
      console.error('OCR failed:', err);
      Alert.alert(t('error'), t('ocrFailed'));
    } finally {
      setOcrLoading(false);
    }
  };

  // Run reconciliation
  const handleReconcile = async () => {
    if (!selectedShopId) {
      Alert.alert(t('error'), t('reconcileSelectShop'));
      return;
    }
    const paymentAmountNum = parseFloat(amount);
    if (isNaN(paymentAmountNum) || paymentAmountNum <= 0) {
      Alert.alert(t('error'), t('reconcileInvalidAmount'));
      return;
    }

    setReconciling(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/sync/ai/reconcile-payment`,
        {
          shopId: selectedShopId,
          paymentAmount: paymentAmountNum,
          transactionRef: transactionId || null,
          screenshotUrl: screenshotUrl || null,
          actorId: activeRep.id,
        },
      );

      setSummary(response.data);
      Alert.alert(t('success'), t('reconcileSuccess'));

      // Synchronize SQLite DB
      await syncData();
      await loadInvoices(selectedShopId);
      await loadPayments();

      // Reset fields
      setTransactionId('');
      setAmount('');
      setSenderName('');
      setTimestamp('');
      setScreenshotUrl('');
    } catch (err) {
      console.error('Reconciliation failed:', err);
      Alert.alert(t('error'), t('reconcileFailed'));
    } finally {
      setReconciling(false);
    }
  };

  // Calculate FIFO Preview allocations in real-time
  const getInvoiceOutstanding = (invoiceId: string, invoiceAmount: number) => {
    const invoicePayments = payments.filter((p) => p.invoice_id === invoiceId);
    const paidSum = invoicePayments.reduce(
      (sum: number, p) => sum + p.amount,
      0,
    );
    return Math.max(0, invoiceAmount - paidSum);
  };

  const paymentAmountNum = parseFloat(amount) || 0;
  let previewRemaining = paymentAmountNum;

  const previewAllocations = invoices.map((inv) => {
    const outstanding = getInvoiceOutstanding(inv.id, inv.amount);
    if (outstanding <= 0 || previewRemaining <= 0) {
      return {
        id: inv.id,
        amount: inv.amount,
        outstanding,
        allocated: 0,
        newState: inv.state,
        dueDate: inv.due_date,
      };
    }
    const allocated = Math.min(outstanding, previewRemaining);
    previewRemaining -= allocated;
    const isPaid = Math.abs(outstanding - allocated) < 0.01;
    return {
      id: inv.id,
      amount: inv.amount,
      outstanding,
      allocated,
      newState: isPaid ? 'PAID' : 'PARTIALLY_PAID',
      dueDate: inv.due_date,
    };
  });

  const filteredShops = shopSearch
    ? shops.filter((s) =>
        s.name.toLowerCase().includes(shopSearch.toLowerCase()),
      )
    : shops;

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  return (
    <Card
      p="m"
      mb="l"
      borderColor="borderColor"
      borderWidth={1}
      bg="cardBackground"
    >
      <Box mb="m" borderBottomWidth={1} borderColor="borderColor" pb="s">
        <Text variant="title" fontSize={18} mb="xs">
          {t('reconciliationTitle')}
        </Text>
        <Text variant="bodySecondary">{t('reconciliationDesc')}</Text>
      </Box>

      {/* Drop Zone Upload Box (Web Optimized) */}
      <Box
        p="l"
        mb="m"
        borderWidth={2}
        borderRadius="m"
        borderColor="brand"
        alignItems="center"
        justifyContent="center"
        style={{
          borderStyle: 'dashed',
          backgroundColor: 'rgba(90, 49, 244, 0.05)',
        }}
      >
        {ocrLoading ? (
          <Box py="m" alignItems="center">
            <ActivityIndicator size="large" color="#5A31F4" />
            <Text variant="caption" color="brand" mt="s" fontWeight="bold">
              {t('reconciliationOcrReading')}
            </Text>
          </Box>
        ) : (
          <Box alignItems="center">
            <Text
              variant="body"
              fontWeight="bold"
              mb="s"
              style={{ color: '#5A31F4' }}
            >
              {t('reconciliationDropFile')}
            </Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                opacity: 0.8,
                cursor: 'pointer',
                fontSize: 14,
                padding: 4,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Editable Fields Form */}
      <Box gap="s" mb="m">
        <Text variant="body" fontWeight="bold">
          {t('reconciliationDetailsTitle')}
        </Text>

        <Box flexDirection="row" gap="s">
          <Box flex={1}>
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('reconciliationTxRef')}
            </Text>
            <TextInput
              style={styles.input}
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder={t('reconciliationTxRefPlaceholder')}
            />
          </Box>
          <Box flex={1}>
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('reconciliationAmount')}
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t('reconciliationAmountPlaceholder')}
            />
          </Box>
        </Box>

        <Box flexDirection="row" gap="s">
          <Box flex={1}>
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('reconciliationSender')}
            </Text>
            <TextInput
              style={styles.input}
              value={senderName}
              onChangeText={setSenderName}
              placeholder={t('reconciliationSenderPlaceholder')}
            />
          </Box>
          <Box flex={1}>
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('reconciliationTimestamp')}
            </Text>
            <TextInput
              style={styles.input}
              value={timestamp}
              onChangeText={setTimestamp}
              placeholder={t('reconciliationTimestampPlaceholder')}
            />
          </Box>
        </Box>
      </Box>

      {/* Shop Selector Dropdown */}
      <Box mb="m" zIndex={10}>
        <Text variant="body" fontWeight="bold" mb="s">
          {t('reconciliationSelectShopTitle')}
        </Text>

        <Pressable
          onPress={() => setShowShopList(!showShopList)}
          style={{
            height: 40,
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: '#E5E7EB',
            backgroundColor: '#FAFAFA',
          }}
        >
          <Text
            variant="body"
            color={selectedShop ? 'primaryText' : 'secondaryText'}
          >
            {selectedShop
              ? selectedShop.name
              : t('reconciliationChooseShopPlaceholder')}
          </Text>
          <Text color="secondaryText">▼</Text>
        </Pressable>

        {showShopList && (
          <Box
            mt="xs"
            borderWidth={1}
            borderRadius="m"
            p="s"
            borderColor="borderColor"
            bg="cardBackground"
            style={{
              position: 'absolute',
              top: 65,
              left: 0,
              right: 0,
              maxHeight: 180,
              zIndex: 50,
            }}
          >
            <TextInput
              style={[styles.input, { height: 32, marginBottom: 8 }]}
              placeholder={t('reconciliationSearchShopsPlaceholder')}
              value={shopSearch}
              onChangeText={setShopSearch}
            />
            <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }}>
              {filteredShops.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setSelectedShopId(s.id);
                    setShowShopList(false);
                    setShopSearch('');
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderColor: '#F3F4F6',
                    backgroundColor:
                      selectedShopId === s.id ? '#EEF2FF' : 'transparent',
                  }}
                >
                  <Text
                    variant="body"
                    fontWeight={selectedShopId === s.id ? 'bold' : 'normal'}
                  >
                    {s.name}
                  </Text>
                  <Text variant="caption" color="secondaryText">
                    {s.address}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Box>
        )}
      </Box>

      {/* FIFO Allocation Preview list */}
      {selectedShopId ? (
        <Box mb="l">
          <Text variant="body" fontWeight="bold" mb="s">
            {t('reconciliationFifoTitle')}
          </Text>

          {loadingInvoices ? (
            <ActivityIndicator size="small" color="#5A31F4" />
          ) : previewAllocations.length === 0 ? (
            <Card p="s" bg="secondaryBackground" alignItems="center">
              <Text variant="bodySecondary" fontStyle="italic">
                {t('reconciliationNoInvoices')}
              </Text>
            </Card>
          ) : (
            <Box gap="xs">
              {previewAllocations.map((alloc) => (
                <Box
                  key={alloc.id}
                  p="s"
                  borderRadius="s"
                  bg="secondaryBackground"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box flex={1}>
                    <Text
                      variant="bodySecondary"
                      fontWeight="bold"
                      fontSize={13}
                    >
                      {t('reconciliationInvoiceId').replace(
                        '{id}',
                        alloc.id.substring(0, 8),
                      )}
                      ...
                    </Text>
                    <Text variant="caption" color="secondaryText">
                      {t('reconciliationInvoiceDueOriginal')
                        .replace(
                          '{due}',
                          new Date(alloc.dueDate).toLocaleDateString(),
                        )
                        .replace('{amount}', alloc.amount.toLocaleString())}
                    </Text>
                  </Box>
                  <Box alignItems="flex-end">
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color={
                        alloc.allocated > 0 ? 'successText' : 'secondaryText'
                      }
                    >
                      {t('reconciliationAllocate').replace(
                        '{amount}',
                        alloc.allocated.toLocaleString(),
                      )}
                    </Text>
                    <Box
                      px="xs"
                      borderRadius="s"
                      style={{
                        paddingVertical: 2,
                        backgroundColor:
                          alloc.newState === 'PAID'
                            ? '#D1FAE5'
                            : alloc.newState === 'PARTIALLY_PAID'
                              ? '#DBEAFE'
                              : '#F3F4F6',
                        marginTop: 2,
                      }}
                    >
                      <Text
                        variant="badge"
                        style={{
                          color:
                            alloc.newState === 'PAID'
                              ? '#065F46'
                              : alloc.newState === 'PARTIALLY_PAID'
                                ? '#1E40AF'
                                : '#374151',
                        }}
                      >
                        {alloc.newState}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              ))}

              <Box
                flexDirection="row"
                justifyContent="space-between"
                mt="s"
                borderTopWidth={1}
                borderColor="borderColor"
                pt="s"
              >
                <Text variant="bodySecondary" fontWeight="bold">
                  {t('reconciliationRemainingExcessLabel')}
                </Text>
                <Text
                  variant="body"
                  fontWeight="bold"
                  color={previewRemaining > 0 ? 'warningText' : 'primaryText'}
                >
                  {t('reconciliationAmountVal').replace(
                    '{amount}',
                    previewRemaining.toLocaleString(),
                  )}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      ) : null}

      {/* Submit Action */}
      <Box>
        <Button
          title={reconciling ? t('reconciling') : t('applyFifoReconciliation')}
          variant="primary"
          disabled={reconciling || !selectedShopId}
          onPress={handleReconcile}
        />
      </Box>

      {/* Reconciliation Summary Report */}
      {summary ? (
        <Card p="s" mt="m" borderColor="success" borderWidth={1} bg="successBg">
          <Text variant="body" fontWeight="bold" color="successText" mb="xs">
            {t('reconciliationSummaryReport')}
          </Text>
          <Text variant="bodySecondary" fontSize={13} mb="xs">
            {t('reconciliationAppliedAmount').replace(
              '{amount}',
              (
                summary.applied?.reduce(
                  (sum: number, x) => sum + x.allocated,
                  0,
                ) || 0
              ).toLocaleString(),
            )}
          </Text>
          <Text variant="bodySecondary" fontSize={13}>
            {t('reconciliationRemainingAmount').replace(
              '{amount}',
              (summary.remainingAmount || 0).toLocaleString(),
            )}
          </Text>
        </Card>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 14,
  },
});
