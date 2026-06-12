import React from 'react';
import { Platform } from 'react-native';
import { Box, useResponsive } from '@burma-inventory/ui-components';
import { ComplianceScorecard } from './ComplianceScorecard';
import { VelocityTimeline } from './VelocityTimeline';
import { SVGAnalyticsDashboard } from './SVGAnalyticsDashboard';
import { EodDigestPanel } from './EodDigestPanel';
import { DemandForecastPanel } from './DemandForecastPanel';
import { QuotaSuggestionsPanel } from './QuotaSuggestionsPanel';
import { OdooImporterPanel } from './OdooImporterPanel';
import { SyncAuditLogPanel } from './SyncAuditLogPanel';
import { useSyncAuditLogs } from '../hooks/useSyncAuditLogs';
import { useOdooImporter } from '../hooks/useOdooImporter';
import { RepDayStats } from '../hooks/useTeamPulseData';
import { EodDigest, QuotaOptimization } from '../types';
import { Shop } from '@burma-inventory/shared-types';

interface ShopOption {
  label: string;
  value: string;
}

interface OversightOverviewTabProps {
  isDesktop: boolean;
  shops: Shop[];
  selectedRep: string;
  setSelectedRep: (rep: string) => void;
  selectedDayIndex: number;
  setSelectedDayIndex: (dayIndex: number) => void;
  getRepDayStats: (repId: string, dayIndex: number) => RepDayStats;
  activeStats: RepDayStats;
  digestDate: string;
  setDigestDate: (value: string) => void;
  loadingDigest: boolean;
  digestResult: EodDigest | null;
  onCompileDigest: () => void;
  selectedShopId: string;
  setSelectedShopId: (shopId: string) => void;
  shopOptions: ShopOption[];
  quotaOptimizations: QuotaOptimization[];
  optimizationsLoading: boolean;
  onApplyQuotaAdjustments: () => void;
  reloadDatabaseData: () => void;
}

export const OversightOverviewTab: React.FC<OversightOverviewTabProps> = ({
  isDesktop,
  shops,
  selectedRep,
  setSelectedRep,
  selectedDayIndex,
  setSelectedDayIndex,
  getRepDayStats,
  activeStats,
  digestDate,
  setDigestDate,
  loadingDigest,
  digestResult,
  onCompileDigest,
  selectedShopId,
  setSelectedShopId,
  shopOptions,
  quotaOptimizations,
  optimizationsLoading,
  onApplyQuotaAdjustments,
  reloadDatabaseData,
}) => {
  // These two panels are content-dense; only sit them side by side on a true
  // desktop (>=1024). Below that they stack full-width so nothing is clipped.
  const { isLargeScreen } = useResponsive();
  const {
    syncLogs,
    syncLogsLoading,
    loadingMore,
    hasMore,
    refresh: refreshSyncLogs,
    loadMore: loadMoreSyncLogs,
  } = useSyncAuditLogs();

  const { csvText, setCsvText, importing, importResult, submitImport, clear } =
    useOdooImporter({
      onImportSuccess: () => {
        reloadDatabaseData();
        refreshSyncLogs();
      },
    });

  return (
    <>
      {/* Row 1: Compliance Grid & Velocity Auditing */}
      <Box
        flexDirection={isDesktop ? 'row' : 'column'}
        flexWrap={isDesktop ? 'wrap' : 'nowrap'}
        mb="m"
      >
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
      <EodDigestPanel
        isDesktop={isDesktop}
        digestDate={digestDate}
        setDigestDate={setDigestDate}
        loadingDigest={loadingDigest}
        digestResult={digestResult}
        onCompile={onCompileDigest}
      />

      {/* SVG Analytical Dashboard Row */}
      <SVGAnalyticsDashboard stats={activeStats} />

      {/* Row 3: Buying Forecast & Quota Optimizations */}
      <Box flexDirection={isLargeScreen ? 'row' : 'column'} flexWrap="wrap">
        <DemandForecastPanel
          isDesktop={isDesktop}
          selectedShopId={selectedShopId}
          setSelectedShopId={setSelectedShopId}
          shopOptions={shopOptions}
        />
        <QuotaSuggestionsPanel
          quotaOptimizations={quotaOptimizations}
          optimizationsLoading={optimizationsLoading}
          onApplyAdjustments={onApplyQuotaAdjustments}
        />
      </Box>

      {/* Odoo CSV Importer */}
      <OdooImporterPanel
        csvText={csvText}
        setCsvText={setCsvText}
        importing={importing}
        importResult={importResult}
        onSubmit={submitImport}
        onClear={clear}
      />

      {/* Sync Audit Log Dashboard */}
      <SyncAuditLogPanel
        isDesktop={isDesktop}
        syncLogs={syncLogs}
        syncLogsLoading={syncLogsLoading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onRefresh={refreshSyncLogs}
        onLoadMore={loadMoreSyncLogs}
      />
    </>
  );
};
