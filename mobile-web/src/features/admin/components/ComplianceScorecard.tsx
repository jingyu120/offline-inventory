import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { RepDayStats } from '../hooks/useTeamPulseData';
import { useTranslation } from '../../../core/i18n/i18n';
import { REPRESENTATIVES } from '../../../config/appConfig';

interface ComplianceScorecardProps {
  selectedRep: string;
  setSelectedRep: (rep: string) => void;
  selectedDayIndex: number;
  setSelectedDayIndex: (dayIndex: number) => void;
  getRepDayStats: (repId: string, dayIndex: number) => RepDayStats;
}

export const ComplianceScorecard: React.FC<ComplianceScorecardProps> = ({
  selectedRep,
  setSelectedRep,
  selectedDayIndex,
  setSelectedDayIndex,
  getRepDayStats,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const daysOfWeekLabels = [
    t('mon'),
    t('tue'),
    t('wed'),
    t('thu'),
    t('fri'),
    t('sat'),
    t('sun'),
  ];

  const getStatusColor = (status: 'GREEN' | 'YELLOW' | 'RED') => {
    if (status === 'GREEN') return theme.colors.success;
    if (status === 'YELLOW') return theme.colors.warning;
    return theme.colors.danger;
  };

  return (
    <Card p="m" bg="cardBackground" height="100%">
      <Text variant="title" mb="s">
        {t('complianceScorecard')}
      </Text>
      <Text variant="bodySecondary" mb="m">
        {t('complianceSubtitle')}
      </Text>

      {/* Grid Table Header */}
      <Box
        borderBottomWidth={1}
        borderColor="borderColor"
        pb="s"
        mb="s"
        flexDirection="row"
      >
        <Box width="30%">
          <Text variant="bodySecondary" fontWeight="bold">
            {t('representative')}
          </Text>
        </Box>
        {daysOfWeekLabels.map((day) => (
          <Box key={day} flex={1} alignItems="center">
            <Text variant="bodySecondary" fontWeight="bold">
              {day}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Representative Rows */}
      {REPRESENTATIVES.map((rep) => (
        <Box key={rep.id} py="s" flexDirection="row" alignItems="center">
          <Box width="30%">
            <Text variant="body" fontWeight="bold">
              {rep.name} ({rep.id})
            </Text>
            <Text variant="bodySecondary">{rep.territory}</Text>
          </Box>
          {daysOfWeekLabels.map((_, idx) => {
            const stats = getRepDayStats(rep.id, idx);
            const isSelected =
              selectedRep === rep.id && selectedDayIndex === idx;
            return (
              <TouchableOpacity
                key={`${rep.id}-${idx}`}
                onPress={() => {
                  setSelectedRep(rep.id);
                  setSelectedDayIndex(idx);
                }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getStatusColor(stats.status),
                  marginHorizontal: 4,
                  paddingVertical: 10,
                  borderRadius: 6,
                  borderWidth: isSelected ? 2.5 : 0,
                  borderColor: theme.colors.primaryButton,
                }}
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  style={{ color: theme.colors.pureWhite }}
                >
                  {stats.logCount}
                </Text>
                {stats.batchFlagged && (
                  <Text
                    style={{
                      fontSize: 9,
                      position: 'absolute',
                      top: 2,
                      right: 2,
                    }}
                  >
                    ⚠️
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </Box>
      ))}

      {/* Legend indicators */}
      <Box
        flexDirection="row"
        mt="m"
        justifyContent="flex-start"
        flexWrap="wrap"
      >
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box width={12} height={12} borderRadius="s" bg="success" mr="xs" />
          <Text variant="bodySecondary">{t('metQuota')}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box width={12} height={12} borderRadius="s" bg="warning" mr="xs" />
          <Text variant="bodySecondary">{t('partialActivity')}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box width={12} height={12} borderRadius="s" bg="danger" mr="xs" />
          <Text variant="bodySecondary">{t('zeroEntries')}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" mb="xs">
          <Text style={{ fontSize: 12 }} mr="xs">
            ⚠️
          </Text>
          <Text variant="bodySecondary">{t('batchDumping')}</Text>
        </Box>
      </Box>
    </Card>
  );
};
