import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  DropdownSelector,
  Table,
  ColumnDef,
} from '@burma-inventory/ui-components';
import { useTeamPulseData } from '../hooks/useTeamPulseData';
import { ComplianceScorecard } from './components/ComplianceScorecard';
import { VelocityTimeline } from './components/VelocityTimeline';
import { SVGAnalyticsDashboard } from './components/SVGAnalyticsDashboard';
import { useTranslation } from '../utils/i18n';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const TeamPulseScreen: React.FC = () => {
  const { t } = useTranslation();
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

  const fetchSyncLogs = async () => {
    setSyncLogsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/sync/sync-logs`);
      if (response.data && response.data.success) {
        setSyncLogs(response.data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch sync logs:', e);
    } finally {
      setSyncLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      flex: 2,
      render: (item) => (
        <Text variant="bodySecondary">
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'rep',
      header: 'Rep',
      flex: 1.5,
      render: (item) => (
        <Text variant="body" fontWeight="bold">
          {item.user?.username || item.userId || 'System/Odoo'}
        </Text>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      flex: 1,
      render: (item) => (
        <Box
          px="s"
          py="xs"
          borderRadius="s"
          bg={item.action === 'PUSH' ? 'infoBg' : 'secondaryBackground'}
          alignSelf="flex-start"
        >
          <Text
            variant="badge"
            color={item.action === 'PUSH' ? 'info' : 'secondaryText'}
          >
            {item.action}
          </Text>
        </Box>
      ),
    },
    {
      key: 'changesCount',
      header: 'Changes',
      flex: 1,
      render: (item) => (
        <Text variant="body" style={{ textAlign: 'center' }}>
          {item.changesCount}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      flex: 1.5,
      render: (item) => (
        <Box
          px="s"
          py="xs"
          borderRadius="s"
          bg={item.status === 'SUCCESS' ? 'successBg' : 'dangerBg'}
          alignSelf="flex-start"
        >
          <Text
            variant="badge"
            color={item.status === 'SUCCESS' ? 'success' : 'danger'}
          >
            {item.status}
          </Text>
        </Box>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      flex: 3,
      render: (item) => (
        <Text variant="bodySecondary" numberOfLines={2}>
          {item.errorReason ||
            (item.status === 'SUCCESS' ? 'Sync completed successfully' : '')}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#5A31F4" />
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
      contentContainerStyle={{ padding: isDesktop ? 16 : 12 }}
    >
      {/* Header */}
      <Box mb="m">
        <Text variant="header" fontSize={isDesktop ? 32 : 22}>
          {t('leadershipPanel')}
        </Text>
        {isDesktop && (
          <Text variant="bodySecondary">{t('leadershipSubtitle')}</Text>
        )}
      </Box>

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
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="space-between"
          alignItems="center"
          mb="m"
        >
          <Box flex={1} mr="m">
            <Text variant="title">{t('eodDigestTitle')}</Text>
            <Text variant="bodySecondary">{t('eodDigestSubtitle')}</Text>
          </Box>

          <Box
            flexDirection="row"
            alignItems="center"
            mt={Platform.OS === 'web' ? 'none' : 's'}
          >
            <TextInput
              value={digestDate}
              onChangeText={setDigestDate}
              placeholder="YYYY-MM-DD"
              style={{
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#EAEAEA',
                marginRight: 8,
                backgroundColor: '#fff',
                fontSize: 14,
              }}
            />
            <Button
              title={t('compileDigest')}
              onPress={triggerEodCompilation}
              variant="primary"
            />
          </Box>
        </Box>

        {loadingDigest ? (
          <Box py="l" justifyContent="center" alignItems="center">
            <ActivityIndicator size="large" color="#5A31F4" />
            <Text variant="bodySecondary" mt="s">
              {t('gemmaCompiling')}
            </Text>
          </Box>
        ) : digestResult ? (
          <Box
            p="m"
            borderRadius="m"
            style={{
              backgroundColor: 'rgba(90, 49, 244, 0.04)',
              borderColor: 'rgba(90, 49, 244, 0.12)',
              borderWidth: 1,
            }}
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
              <Text
                variant="body"
                fontWeight="bold"
                style={{ color: '#22C55E' }}
              >
                {digestResult.topPerformingRep}
              </Text>
            </Box>

            {/* AI Curated Market Synthesis */}
            <Box mb="m">
              <Text
                variant="body"
                fontWeight="bold"
                style={{ color: '#5A31F4' }}
                mb="s"
              >
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
                  style={{ color: '#FF3B30' }}
                  mb="s"
                >
                  {t('complianceViolationsLogged')}
                </Text>
                {digestResult.warnings.map((w: string, idx: number) => (
                  <Text
                    key={idx}
                    variant="bodySecondary"
                    style={{ color: '#C23229' }}
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
            <Text variant="bodySecondary">{t('compileDigestInstruction')}</Text>
          </Box>
        )}
      </Card>

      {/* SVG Analytical Dashboard Row */}
      <SVGAnalyticsDashboard stats={activeStats} />

      {/* Row 3: Buying Forecast & Quota Optimizations */}
      <Box flexDirection="row" flexWrap="wrap">
        {/* SKU Buying Forecasts */}
        <Box
          flex={1}
          minWidth={320}
          mr={Platform.OS === 'web' ? 'm' : 'none'}
          mb="m"
        >
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
                <Box
                  py="s"
                  borderBottomWidth={1}
                  borderColor="borderColor"
                  flexDirection="row"
                  justifyContent="space-between"
                >
                  <Box>
                    <Text variant="body" fontWeight="bold">
                      1. Premium Beer 640ml
                    </Text>
                    <Text variant="bodySecondary">{t('trendSummerPeak')}</Text>
                  </Box>
                  <Text
                    variant="body"
                    fontWeight="bold"
                    style={{ color: '#22C55E' }}
                  >
                    {t('probValue').replace('{prob}', '85')}
                  </Text>
                </Box>

                <Box
                  py="s"
                  borderBottomWidth={1}
                  borderColor="borderColor"
                  flexDirection="row"
                  justifyContent="space-between"
                >
                  <Box>
                    <Text variant="body" fontWeight="bold">
                      2. Classic Cider 500ml
                    </Text>
                    <Text variant="bodySecondary">
                      {t('trendStableYearRound')}
                    </Text>
                  </Box>
                  <Text
                    variant="body"
                    fontWeight="bold"
                    style={{ color: '#EAB308' }}
                  >
                    {t('probValue').replace('{prob}', '60')}
                  </Text>
                </Box>

                <Box py="s" flexDirection="row" justifyContent="space-between">
                  <Box>
                    <Text variant="body" fontWeight="bold">
                      3. Special Stout 320ml
                    </Text>
                    <Text variant="bodySecondary">{t('trendRainySpike')}</Text>
                  </Box>
                  <Text
                    variant="body"
                    fontWeight="bold"
                    style={{ color: '#A0A0A0' }}
                  >
                    {t('probValue').replace('{prob}', '40')}
                  </Text>
                </Box>
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
                <ActivityIndicator size="small" color="#5A31F4" />
              </Box>
            ) : (
              <Box>
                {quotaOptimizations.map((opt, idx) => (
                  <Box
                    key={idx}
                    mb="m"
                    borderLeftWidth={3}
                    style={{ borderLeftColor: '#5A31F4' }}
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
                      <Text
                        variant="body"
                        fontWeight="bold"
                        style={{ color: '#5A31F4' }}
                      >
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
                      fontSize={12}
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
          columns: Name, Address, Region, Division, ContactName, PhoneNumber,
          Email, PriceTier, LifetimeValue
        </Text>

        <TextInput
          multiline
          numberOfLines={6}
          value={csvText}
          onChangeText={setCsvText}
          placeholder={`Name,Address,Region,Division,ContactName,PhoneNumber,Email,PriceTier,LifetimeValue\nCity Mart Hledan,Yangon,Yangon Division,U Hla,0912345678,hledan@citymart.com.mm,Retailer,5000`}
          placeholderTextColor="#94A3B8"
          style={{
            minHeight: 120,
            padding: 12,
            borderColor: '#CBD5E1',
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: '#F8FAFC',
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 13,
            color: '#0F172A',
            textAlignVertical: 'top',
            marginBottom: 12,
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
                  fetchSyncLogs();
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
                {importResult.warnings && importResult.warnings.length > 0 && (
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
                    <ScrollView style={{ maxHeight: 100 }}>
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
          <Box>
            <Text variant="title">Sync Audit Logs</Text>
            <Text variant="bodySecondary">
              Real-time synchronization status audit log dashboard
            </Text>
          </Box>
          <Button
            title={syncLogsLoading ? 'Refreshing...' : 'Refresh'}
            onPress={fetchSyncLogs}
            variant="outline"
            size="small"
            disabled={syncLogsLoading}
          />
        </Box>

        {syncLogsLoading && syncLogs.length === 0 ? (
          <Box py="l" justifyContent="center" alignItems="center">
            <ActivityIndicator size="small" color="#5A31F4" />
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
          <Table
            data={syncLogs}
            columns={columns}
            keyExtractor={(item) => item.id}
          />
        )}
      </Card>
    </ScrollView>
  );
};
