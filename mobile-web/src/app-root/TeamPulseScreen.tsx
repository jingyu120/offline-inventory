import React from 'react';
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
} from '@burma-inventory/ui-components';
import { useTeamPulseData } from '../hooks/useTeamPulseData';
import { ComplianceScorecard } from './components/ComplianceScorecard';
import { VelocityTimeline } from './components/VelocityTimeline';
import { SVGAnalyticsDashboard } from './components/SVGAnalyticsDashboard';
import { useTranslation } from '../utils/i18n';

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
  } = useTeamPulseData();

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
    </ScrollView>
  );
};
