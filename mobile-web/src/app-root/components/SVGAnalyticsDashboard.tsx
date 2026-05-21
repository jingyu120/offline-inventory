import React from 'react';
import { Platform } from 'react-native';
import { Box, Text, Card } from '@burma-inventory/ui-components';
import { InteractionLog } from '@burma-inventory/shared-types';
import { useTranslation } from '../../utils/i18n';

interface SVGAnalyticsDashboardProps {
  stats: {
    logCount: number;
    targetQuota: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
    batchFlagged: boolean;
    logs: InteractionLog[];
  };
}

export const SVGAnalyticsDashboard: React.FC<SVGAnalyticsDashboardProps> = ({
  stats,
}) => {
  const { t } = useTranslation();

  // Compute compliance rates
  const complianceRate =
    stats.targetQuota > 0
      ? Math.min(100, Math.round((stats.logCount / stats.targetQuota) * 100))
      : 0;

  // SKU demand mock metrics (could be dynamically fetched or computed from logs)
  const skuMetrics = [
    { label: 'Premium Beer 640ml', value: 85, color: '#4F46E5' },
    { label: 'Classic Cider 500ml', value: 60, color: '#10B981' },
    { label: 'Special Stout 320ml', value: 45, color: '#F59E0B' },
  ];

  // Circular Gauge Calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (complianceRate / 100) * circumference;

  return (
    <Card p="m" mb="m" bg="cardBackground">
      <Text variant="title" mb="xs">
        {t('marketDemandSkuAnalytics')}
      </Text>
      <Text variant="bodySecondary" mb="l">
        {t('marketDemandSubtitle')}
      </Text>

      <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
        {/* Left Section: SKU Demand Share (Bar Chart) */}
        <Box
          width={Platform.OS === 'web' ? '55%' : '100%'}
          minWidth={280}
          mb="m"
        >
          <Text variant="body" fontWeight="bold" mb="m">
            {t('skuInterestShare')}
          </Text>
          {skuMetrics.map((sku, index) => (
            <Box key={index} mb="s">
              <Box flexDirection="row" justifyContent="space-between" mb="xs">
                <Text variant="bodySecondary">{sku.label}</Text>
                <Text variant="body" fontWeight="bold">
                  {t('skuInterestPercent').replace(
                    '{value}',
                    sku.value.toString(),
                  )}
                </Text>
              </Box>
              {/* Progress bar container */}
              <Box
                height={12}
                width="100%"
                borderRadius="s"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  height="100%"
                  width={`${sku.value}%`}
                  borderRadius="s"
                  style={{ backgroundColor: sku.color }}
                />
              </Box>
            </Box>
          ))}
        </Box>

        {/* Right Section: Compliance Gauge (SVG Circle) */}
        <Box
          width={Platform.OS === 'web' ? '40%' : '100%'}
          minWidth={250}
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="body" fontWeight="bold" mb="m">
            {t('totalComplianceRate')}
          </Text>

          {Platform.OS === 'web' ? (
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg
                width="140"
                height="140"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Background Circle */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth="12"
                />
                {/* Foreground Circle */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="#4F46E5"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              {/* Centered Percentage */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}
                >
                  {complianceRate}%
                </span>
                <span style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                  {t('ofDailyQuota')}
                </span>
              </div>
            </div>
          ) : (
            // Native Fallback View
            <Box
              width={120}
              height={120}
              borderRadius="xl"
              borderWidth={10}
              borderColor="primaryButton"
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="header" style={{ color: '#4F46E5' }}>
                {complianceRate}%
              </Text>
              <Text variant="bodySecondary" fontSize={9}>
                {t('targetAchieved')}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
};
