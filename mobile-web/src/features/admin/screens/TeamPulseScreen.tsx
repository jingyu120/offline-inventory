import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTeamPulseData } from '../hooks/useTeamPulseData';
import { useTranslation } from '../../../core/i18n/i18n';
import { OversightTabBar } from '../components/OversightTabBar';
import { OversightOverviewTab } from '../components/OversightOverviewTab';
import { HitlVerificationPanel } from '../components/HitlVerificationPanel';
import { DlqDashboard } from '../components/DlqDashboard';
import { PendingIntakeApproval } from '../components/PendingIntakeApproval';
import { PendingSalesApproval } from '../components/PendingSalesApproval';
import { PendingReconciliationPanel } from '../components/PendingReconciliationPanel';
import { OVERSIGHT_TAB, OversightTab } from '../types';

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

  const [activeTab, setActiveTab] = useState<OversightTab>(
    OVERSIGHT_TAB.OVERSIGHT,
  );

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

      <OversightTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {activeTab === OVERSIGHT_TAB.HITL && (
        <HitlVerificationPanel shops={shops} />
      )}

      {activeTab === OVERSIGHT_TAB.DLQ && <DlqDashboard />}

      {activeTab === OVERSIGHT_TAB.APPROVALS && (
        <Box flexDirection={isDesktop ? 'row' : 'column'} gap="m" mb="m">
          <Box flex={1}>
            <PendingIntakeApproval />
          </Box>
          <Box flex={1}>
            <PendingSalesApproval />
          </Box>
        </Box>
      )}

      {activeTab === OVERSIGHT_TAB.RECONCILIATION && (
        <PendingReconciliationPanel />
      )}

      {activeTab === OVERSIGHT_TAB.OVERSIGHT && (
        <OversightOverviewTab
          isDesktop={isDesktop}
          shops={shops}
          selectedRep={selectedRep}
          setSelectedRep={setSelectedRep}
          selectedDayIndex={selectedDayIndex}
          setSelectedDayIndex={setSelectedDayIndex}
          getRepDayStats={getRepDayStats}
          activeStats={activeStats}
          digestDate={digestDate}
          setDigestDate={setDigestDate}
          loadingDigest={loadingDigest}
          digestResult={digestResult}
          onCompileDigest={triggerEodCompilation}
          selectedShopId={selectedShopId}
          setSelectedShopId={setSelectedShopId}
          shopOptions={shopOptions}
          quotaOptimizations={quotaOptimizations}
          optimizationsLoading={optimizationsLoading}
          onApplyQuotaAdjustments={applyQuotaAdjustments}
          reloadDatabaseData={loadDatabaseData}
        />
      )}
    </ScrollView>
  );
};
