import React from 'react';
import { ScrollView } from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';
import { DesignPatternGallery } from '../../../core/components/DesignPatternGallery';
import { LedgerKpiCard } from './LedgerKpiCard';
import { LedgerStats } from '../hooks/useShopLedger';

interface LedgerWelcomePaneProps {
  stats: LedgerStats;
}

const WELCOME_GRADIENT_END = '#7C3AED';
const HEADER_TITLE_FONT_SIZE = 24;
const HEADER_DESC_FONT_SIZE = 13;
const HEADER_TITLE_MARGIN_BOTTOM = 4;
const HEADER_DESC_COLOR = 'rgba(255, 255, 255, 0.8)';
const HINT_FONT_SIZE = 13;

export const LedgerWelcomePane: React.FC<LedgerWelcomePaneProps> = ({
  stats,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24 }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      {/* Welcome Header Banner */}
      <Box
        p="l"
        mb="m"
        borderRadius="l"
        style={{
          backgroundColor: theme.colors.brand,
          // @ts-expect-error: linear-gradient is web-only
          backgroundImage: `linear-gradient(135deg, ${theme.colors.brand}, ${WELCOME_GRADIENT_END})`,
        }}
      >
        <Text
          style={{
            color: theme.colors.pureWhite,
            fontSize: HEADER_TITLE_FONT_SIZE,
            fontWeight: 'bold',
            marginBottom: HEADER_TITLE_MARGIN_BOTTOM,
          }}
        >
          {t('ledgerControlTitle')}
        </Text>
        <Text
          style={{ color: HEADER_DESC_COLOR, fontSize: HEADER_DESC_FONT_SIZE }}
        >
          {t('ledgerControlDesc')}
        </Text>
      </Box>

      {/* KPI Stats Row */}
      <Box flexDirection="row" justifyContent="space-between" mb="l">
        <LedgerKpiCard
          label={t('registeredRetailers')}
          value={stats.shopsCount}
          caption={t('shopsAcrossRegions')}
          valueColor="brand"
        />
        <LedgerKpiCard
          label={t('activeProjects')}
          value={stats.projectsCount}
          caption={t('pendingProjectFulfillment')}
          valueColor="danger"
        />
        <LedgerKpiCard
          label={`💰 ${t('pipelineCapitalLockup')}`}
          value={stats.lockedCapital}
          caption={t('lockedPipelineCapital')}
          valueColor="warning"
          isLast
        />
      </Box>

      {/* Design Gallery Section */}
      <Box mb="l">
        <DesignPatternGallery />
      </Box>

      {/* Action Hint Card */}
      <Box
        p="m"
        bg="secondaryBackground"
        borderColor="borderColor"
        borderWidth={1}
        borderRadius="m"
        style={{ borderStyle: 'dashed' }}
      >
        <Text
          variant="bodySecondary"
          fontSize={HINT_FONT_SIZE}
          style={{ textAlign: 'center' }}
        >
          {t('selectShopSidebarPrompt')}
        </Text>
      </Box>
    </ScrollView>
  );
};
