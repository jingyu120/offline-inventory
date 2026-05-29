import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
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
import { useTeamPulseData } from '../hooks/useTeamPulseData';
import { ComplianceScorecard } from '../components/ComplianceScorecard';
import { VelocityTimeline } from '../components/VelocityTimeline';
import { SVGAnalyticsDashboard } from '../components/SVGAnalyticsDashboard';
import { useTranslation } from '../../../core/i18n/i18n';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/appConfig';
import { SyncLogsTable } from '../components/SyncLogsTable';
import { trpcClient } from '../../../core/trpc/trpcClient';
import { SKU_METRICS } from '../../../config/appConfig';
import { HitlVerificationPanel } from '../components/HitlVerificationPanel';
import { DlqDashboard } from '../components/DlqDashboard';
import { PendingIntakeApproval } from '../components/PendingIntakeApproval';
import { PendingSalesApproval } from '../components/PendingSalesApproval';
import { TouchableOpacity } from 'react-native';

export const TeamPulseScreen: React.FC = () => {
  const { t, language } = useTranslation();
  const theme = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const {
    loading,
    shops,
    selectedRep,
    setSelectedRep,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedShopId,
    setSelectedShopId,
    quotaOptimizations,
    optimizationsLoading,
    digestDate,
    setDigestDate,
    loadingDigest,
    digestResult,
    triggerEodCompilation,
    applyQuotaAdjustments,
    getRepDayStats,
    loadDatabaseData,
  } = useTeamPulseData();

  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount?: number;
    warnings?: string[];
    error?: string;
  } | null>(null);

  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncLogsLoading, setSyncLogsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'oversight' | 'hitl' | 'dlq' | 'approvals'
  >('oversight');

  // Focus states for emerald focus rings on inputs
  const [dateFocused, setDateFocused] = useState(false);
  const [csvFocused, setCsvFocused] = useState(false);

  /** Shared web-only CSS transition mixin */
  const webTransition =
    Platform.OS === 'web'
      ? ({
          transitionProperty: 'border-color, border-width',
          transitionDuration: '150ms',
          transitionTimingFunction: 'ease-in-out',
        } as any)
      : {};

  const fetchSyncLogs = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setSyncLogsLoading(true);
    }
    try {
      const lastLog = syncLogs[syncLogs.length - 1];
      const lastSeenId = isLoadMore && lastLog ? lastLog.id : undefined;
      const limit = 20;

      const response = await trpcClient.getSyncLogs.query({
        lastSeenId,
        limit,
      });

      if (response && response.success) {
        const newLogs = response.logs || [];
        if (isLoadMore) {
          setSyncLogs((prev) => [...prev, ...newLogs]);
        } else {
          setSyncLogs(newLogs);
        }
        setHasMore(newLogs.length === limit);
      }
    } catch (e) {
      console.error('Failed to fetch sync logs via tRPC:', e);
    } finally {
      setSyncLogsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs(false);
  }, []);

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={theme.colors.primaryButton} />
        <Text variant="body" mt="s">
          {t('loadingManagerDashboard')}
        </Text>
      </Box>
    );
  }

  const activeStats = getRepDayStats(selectedRep, selectedDayIndex);
  const shopOptions = shops.map((s) => ({ label: s.name, value: s.id }));

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      {/* Header */}
      <Box mb="m">
        <Text
          variant="header"
          fontSize={
            language === 'my' ? (isDesktop ? 26 : 18) : isDesktop ? 32 : 22
          }
          lineHeight={
            language === 'my' ? (isDesktop ? 42 : 30) : isDesktop ? 38 : 28
          }
        >
          {t('leadershipPanel')}
        </Text>
        {isDesktop && (
          <Text
            variant="bodySecondary"
            mt="xs"
            lineHeight={language === 'my' ? 24 : 18}
          >
            {t('leadershipSubtitle')}
          </Text>
        )}
      </Box>

      {/* Tabs */}
      <Box
        flexDirection="row"
        borderBottomWidth={1}
        borderBottomColor="borderColor"
        mb="l"
        gap="m"
      >
        <TouchableOpacity onPress={() => setActiveTab('oversight')}>
          <Box
            py="s"
            px="m"
            borderBottomWidth={2}
            borderBottomColor={
              activeTab === 'oversight' ? 'brand' : 'transparent'
            }
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={activeTab === 'oversight' ? 'brand' : 'secondaryText'}
            >
              Oversight Overview
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('hitl')}>
          <Box
            py="s"
            px="m"
            borderBottomWidth={2}
            borderBottomColor={activeTab === 'hitl' ? 'brand' : 'transparent'}
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={activeTab === 'hitl' ? 'brand' : 'secondaryText'}
            >
              HITL Resolutions
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('dlq')}>
          <Box
            py="s"
            px="m"
            borderBottomWidth={2}
            borderBottomColor={activeTab === 'dlq' ? 'brand' : 'transparent'}
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={activeTab === 'dlq' ? 'brand' : 'secondaryText'}
            >
              DLQ Monitor
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('approvals')}>
          <Box
            py="s"
            px="m"
            borderBottomWidth={2}
            borderBottomColor={
              activeTab === 'approvals' ? 'brand' : 'transparent'
            }
          >
            <Text
              variant="body"
              fontWeight="bold"
              color={activeTab === 'approvals' ? 'brand' : 'secondaryText'}
            >
              Approvals
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>

      {activeTab === 'hitl' && <HitlVerificationPanel shops={shops} />}

      {activeTab === 'dlq' && <DlqDashboard />}

      {activeTab === 'approvals' && (
        <Box flexDirection={isDesktop ? 'row' : 'column'} gap="m" mb="m">
          <Box flex={1}>
            <PendingIntakeApproval />
          </Box>
          <Box flex={1}>
            <PendingSalesApproval />
          </Box>
        </Box>
      )}

      {activeTab === 'oversight' && (
        <>
          {/* Row 1: Compliance Grid & Velocity Auditing */}
          <Box
            flexDirection={isDesktop ? 'row' : 'column'}
            flexWrap={isDesktop ? 'wrap' : 'nowrap'}
            mb="m"
          >
            {/* Compliance Grid Card */}
            <Box
              flex={isDesktop ? 3 : undefined}
              minWidth={isDesktop ? 350 : undefined}
              mr={isDesktop && Platform.OS === 'web' ? 'm' : 'none'}
              mb="m"
            >
              <ComplianceScorecard
                selectedRep={selectedRep}
                setSelectedRep={setSelectedRep}
                selectedDayIndex={selectedDayIndex}
                setSelectedDayIndex={setSelectedDayIndex}
                getRepDayStats={getRepDayStats}
              />
            </Box>

            {/* Log Velocity Timeline Panel */}
            <Box
              flex={isDesktop ? 2 : undefined}
              minWidth={isDesktop ? 300 : undefined}
              mb="m"
            >
              <VelocityTimeline
                selectedRep={selectedRep}
                selectedDayIndex={selectedDayIndex}
                stats={activeStats}
                shops={shops}
              />
            </Box>
          </Box>

          {/* Row 2: AI EOD Digest briefing */}
          <Card p="m" mb="m" bg="cardBackground">
            <Box
              flexDirection={isDesktop ? 'row' : 'column'}
              alignItems={isDesktop ? 'center' : 'stretch'}
              mb="m"
            >
              <Box
                flex={isDesktop ? 1 : undefined}
                mr={isDesktop ? 'm' : 'none'}
                mb={isDesktop ? 'none' : 's'}
              >
                <Text variant="title">{t('eodDigestTitle')}</Text>
                <Text variant="bodySecondary">{t('eodDigestSubtitle')}</Text>
              </Box>

              <Box
                flexDirection="row"
                alignItems="center"
                mt={isDesktop ? 'none' : 's'}
              >
                <Box mr="s">
                  <Text variant="caption" color="secondaryText" mb="xs">
                    Date Filter
                  </Text>
                  <ThemedTextInput
                    value={digestDate}
                    onChangeText={setDigestDate}
                    placeholder="YYYY-MM-DD"
                    onFocus={() => setDateFocused(true)}
                    onBlur={() => setDateFocused(false)}
                    p="s"
                    borderRadius="s"
                    borderWidth={dateFocused ? 2 : 1}
                    borderColor={dateFocused ? 'success' : 'borderColor'}
                    bg="cardBackground"
                    minWidth={120}
                    style={{
                      fontSize: 14,
                      fontFamily: 'monospace',
                      color: theme.colors.primaryText,
                      ...(Platform.OS === 'web'
                        ? ({
                            outlineStyle: 'none',
                            ...webTransition,
                          } as any)
                        : {}),
                    }}
                  />
                </Box>
                <Box style={{ alignSelf: 'flex-end' }}>
                  <Button
                    title={t('compileDigest')}
                    onPress={triggerEodCompilation}
                    variant="primary"
                  />
                </Box>
              </Box>
            </Box>

            {loadingDigest ? (
              <Box py="l" justifyContent="center" alignItems="center">
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primaryButton}
                />
                <Text variant="bodySecondary" mt="s">
                  {t('gemmaCompiling')}
                </Text>
              </Box>
            ) : digestResult ? (
              <Box
                p="m"
                borderRadius="m"
                bg="brandBg"
                borderColor="brandBorder"
                borderWidth={1}
              >
                {/* Top performing rep */}
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  mb="m"
                  borderBottomWidth={1}
                  borderColor="borderColor"
                  pb="s"
                >
                  <Text variant="body" fontWeight="bold">
                    {t('topPerformingRepLabel')}
                  </Text>
                  <Text variant="body" fontWeight="bold" color="success">
                    {digestResult.topPerformingRep}
                  </Text>
                </Box>

                {/* AI Curated Market Synthesis */}
                <Box mb="m">
                  <Text variant="body" fontWeight="bold" color="brand" mb="s">
                    {t('aiMarketBriefingSummary')}
                  </Text>
                  <Text variant="bodySecondary" style={{ lineHeight: 22 }}>
                    {digestResult.marketSynthesis}
                  </Text>
                </Box>

                {/* Warnings list */}
                {digestResult.warnings.length > 0 && (
                  <Box borderTopWidth={1} borderColor="borderColor" pt="m">
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color="danger"
                      mb="s"
                    >
                      {t('complianceViolationsLogged')}
                    </Text>
                    {digestResult.warnings.map((w: string, idx: number) => (
                      <Text
                        key={idx}
                        variant="bodySecondary"
                        color="dangerText"
                        mb="xs"
                      >
                        ⚠️ {w}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                p="m"
                borderStyle="dashed"
                borderWidth={1.5}
                borderColor="borderColor"
                borderRadius="m"
                justifyContent="center"
                alignItems="center"
              >
                <Text variant="bodySecondary">
                  {t('compileDigestInstruction')}
                </Text>
              </Box>
            )}
          </Card>

          {/* SVG Analytical Dashboard Row */}
          <SVGAnalyticsDashboard stats={activeStats} />

          {/* Row 3: Buying Forecast & Quota Optimizations */}
          <Box flexDirection="row" flexWrap="wrap">
            {/* SKU Buying Forecasts */}
            <Box flex={1} minWidth={320} mr={isDesktop ? 'm' : 'none'} mb="m">
              <Card p="m" bg="cardBackground" height="100%">
                <Text variant="title" mb="s">
                  {t('gemmaDemandForecast')}
                </Text>
                <Text variant="bodySecondary" mb="m">
                  {t('selectAccountForecast')}
                </Text>

                {/* Shop Selector using cross-platform DropdownSelector */}
                <Box mb="m">
                  <DropdownSelector
                    label={t('accountSelector')}
                    selectedValue={selectedShopId}
                    onValueChange={(val) => setSelectedShopId(val)}
                    options={shopOptions}
                    placeholder={t('chooseShopAccountPlaceholder')}
                  />
                </Box>

                {/* Forecast Lists */}
                {selectedShopId ? (
                  <Box>
                    {SKU_METRICS.map((sku, index) => (
                      <Box
                        key={index}
                        py="s"
                        borderBottomWidth={
                          index < SKU_METRICS.length - 1 ? 1 : 0
                        }
                        borderColor="borderColor"
                        flexDirection="row"
                        justifyContent="space-between"
                      >
                        <Box>
                          <Text variant="body" fontWeight="bold">
                            {index + 1}. {sku.label}
                          </Text>
                          <Text variant="bodySecondary">
                            {t(sku.trendKey as any) || sku.trendKey}
                          </Text>
                        </Box>
                        <Text
                          variant="body"
                          fontWeight="bold"
                          color={sku.themeColorKey}
                        >
                          {t('probValue').replace(
                            '{prob}',
                            sku.probability.toString(),
                          )}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Text variant="bodySecondary">{t('noShopSelected')}</Text>
                )}
              </Card>
            </Box>

            {/* Dynamic Quota Optimizations Card */}
            <Box flex={1} minWidth={320} mb="m">
              <Card p="m" bg="cardBackground" height="100%">
                <Text variant="title" mb="s">
                  {t('quotaOptimizations')}
                </Text>
                <Text variant="bodySecondary" mb="m">
                  {t('quotaSubtitle')}
                </Text>

                {optimizationsLoading ? (
                  <Box py="m" justifyContent="center" alignItems="center">
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primaryButton}
                    />
                  </Box>
                ) : (
                  <Box>
                    {quotaOptimizations.map((opt, idx) => (
                      <Box
                        key={idx}
                        mb="m"
                        borderLeftWidth={3}
                        borderLeftColor="brand"
                        pl="s"
                      >
                        <Box
                          flexDirection="row"
                          justifyContent="space-between"
                          mb="xs"
                        >
                          <Text variant="body" fontWeight="bold">
                            {opt.region}
                          </Text>
                          <Text variant="body" fontWeight="bold" color="brand">
                            {t('quotaDailySuggested')
                              .replace('{current}', opt.currentQuota.toString())
                              .replace(
                                '{suggested}',
                                opt.suggestedQuota.toString(),
                              )}
                          </Text>
                        </Box>
                        <Text
                          variant="bodySecondary"
                          style={{ lineHeight: 18 }}
                        >
                          {opt.reason}
                        </Text>
                      </Box>
                    ))}

                    <Box mt="m">
                      <Button
                        title={t('applyGemmaAdjustments')}
                        onPress={applyQuotaAdjustments}
                        variant="primary"
                      />
                    </Box>
                  </Box>
                )}
              </Card>
            </Box>
          </Box>

          {/* Odoo CSV Importer */}
          <Card p="m" mb="m" bg="cardBackground">
            <Text variant="title" mb="xs">
              Odoo Shop Directory CSV Importer
            </Text>
            <Text variant="bodySecondary" mb="m">
              Paste Odoo CSV data below to import shops and contacts. Expected
              columns: Name, Address, Region, Division, ContactName,
              PhoneNumber, Email, PriceTier, LifetimeValue
            </Text>

            <ThemedTextInput
              multiline
              numberOfLines={6}
              value={csvText}
              onChangeText={setCsvText}
              placeholder={`Name,Address,Region,Division,ContactName,PhoneNumber,Email,PriceTier,LifetimeValue\nCity Mart Hledan,Yangon,Yangon Division,U Hla,0912345678,hledan@citymart.com.mm,Retailer,5000`}
              placeholderTextColor={theme.colors.secondaryText}
              onFocus={() => setCsvFocused(true)}
              onBlur={() => setCsvFocused(false)}
              minHeight={120}
              p="m"
              borderColor={csvFocused ? 'success' : 'slate300'}
              borderWidth={csvFocused ? 2 : 1}
              borderRadius="m"
              bg="mainBackground"
              mb="s"
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                fontSize: 13,
                color: theme.colors.primaryText,
                textAlignVertical: 'top',
                ...(Platform.OS === 'web'
                  ? ({
                      outlineStyle: 'none',
                      ...webTransition,
                    } as any)
                  : {}),
              }}
            />

            <Box flexDirection="row" gap="s" mb={importResult ? 'm' : 'none'}>
              <Button
                title={importing ? 'Importing...' : 'Import CSV Data'}
                onPress={async () => {
                  if (!csvText.trim()) return;
                  setImporting(true);
                  setImportResult(null);
                  try {
                    const response = await axios.post(
                      `${API_BASE_URL}/sync/import-odoo`,
                      {
                        csvData: csvText,
                      },
                    );
                    setImportResult(response.data);
                    if (response.data.success) {
                      setCsvText('');
                      loadDatabaseData();
                      fetchSyncLogs(false);
                    }
                  } catch (e: any) {
                    setImportResult({
                      success: false,
                      error:
                        e.response?.data?.error ||
                        e.message ||
                        'Failed to import CSV',
                    });
                  } finally {
                    setImporting(false);
                  }
                }}
                variant="primary"
                disabled={importing || !csvText.trim()}
              />
              <Button
                title="Clear"
                onPress={() => {
                  setCsvText('');
                  setImportResult(null);
                }}
                variant="secondary"
              />
            </Box>

            {importResult && (
              <Box
                p="m"
                borderRadius="m"
                bg={importResult.success ? 'successBg' : 'dangerBg'}
                borderWidth={1}
                borderColor={importResult.success ? 'success' : 'danger'}
              >
                {importResult.success ? (
                  <Box>
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color="successText"
                      mb="xs"
                    >
                      Import Succeeded!
                    </Text>
                    <Text variant="bodySecondary" color="successText">
                      Successfully imported {importResult.importedCount} shops.
                    </Text>
                    {importResult.warnings &&
                      importResult.warnings.length > 0 && (
                        <Box
                          mt="s"
                          pt="s"
                          borderTopWidth={1}
                          borderColor="borderColor"
                        >
                          <Text
                            variant="bodySecondary"
                            fontWeight="bold"
                            color="successText"
                            mb="xs"
                          >
                            Warnings:
                          </Text>
                          <ScrollView
                            style={{ maxHeight: 100 }}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                          >
                            {importResult.warnings.map((w, idx) => (
                              <Text
                                key={idx}
                                variant="bodySecondary"
                                color="successText"
                              >
                                ⚠️ {w}
                              </Text>
                            ))}
                          </ScrollView>
                        </Box>
                      )}
                  </Box>
                ) : (
                  <Box>
                    <Text
                      variant="body"
                      fontWeight="bold"
                      color="errorText"
                      mb="xs"
                    >
                      Import Failed
                    </Text>
                    <Text variant="bodySecondary" color="errorText">
                      {importResult.error}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Card>

          {/* Sync Audit Log Dashboard */}
          <Card p="m" mb="m" bg="cardBackground">
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="m"
            >
              <Box flex={1} mr="s">
                <Text variant="title">Sync Audit Logs</Text>
                <Text variant="bodySecondary">
                  Real-time synchronization status audit log dashboard
                </Text>
              </Box>
              <Button
                title={syncLogsLoading ? 'Refreshing...' : 'Refresh'}
                onPress={() => fetchSyncLogs(false)}
                variant="outline"
                size="small"
                disabled={syncLogsLoading}
              />
            </Box>

            {syncLogsLoading && syncLogs.length === 0 ? (
              <Box py="l" justifyContent="center" alignItems="center">
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primaryButton}
                />
              </Box>
            ) : syncLogs.length === 0 ? (
              <Box
                p="m"
                borderStyle="dashed"
                borderWidth={1.5}
                borderColor="borderColor"
                borderRadius="m"
                justifyContent="center"
                alignItems="center"
              >
                <Text variant="bodySecondary">No sync logs recorded.</Text>
              </Box>
            ) : (
              <SyncLogsTable
                syncLogs={syncLogs}
                isDesktop={isDesktop}
                onLoadMore={() => fetchSyncLogs(true)}
                hasMore={hasMore}
                loadingMore={loadingMore}
              />
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
};
