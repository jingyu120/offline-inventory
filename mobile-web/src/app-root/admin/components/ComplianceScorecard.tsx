import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Card } from '@burma-inventory/ui-components';
import { RepDayStats } from '../../../hooks/useTeamPulseData';
import { useTranslation } from '../../../utils/i18n';

interface ComplianceScorecardProps {
  selectedRep: 'rep-1' | 'rep-2';
  setSelectedRep: (rep: 'rep-1' | 'rep-2') => void;
  selectedDayIndex: number;
  setSelectedDayIndex: (dayIndex: number) => void;
  getRepDayStats: (repId: 'rep-1' | 'rep-2', dayIndex: number) => RepDayStats;
}

export const ComplianceScorecard: React.FC<ComplianceScorecardProps> = ({
  selectedRep,
  setSelectedRep,
  selectedDayIndex,
  setSelectedDayIndex,
  getRepDayStats,
}) => {
  const { t } = useTranslation();
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
    if (status === 'GREEN') return '#22C55E';
    if (status === 'YELLOW') return '#EAB308';
    return '#FF3B30';
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

      {/* Rep 1 Row */}
      <Box py="s" flexDirection="row" alignItems="center">
        <Box width="30%">
          <Text variant="body" fontWeight="bold">
            Ko Min (rep-1)
          </Text>
          <Text variant="bodySecondary">Yangon</Text>
        </Box>
        {daysOfWeekLabels.map((_, idx) => {
          const stats = getRepDayStats('rep-1', idx);
          const isSelected =
            selectedRep === 'rep-1' && selectedDayIndex === idx;
          return (
            <TouchableOpacity
              key={`rep-1-${idx}`}
              onPress={() => {
                setSelectedRep('rep-1');
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
                borderColor: '#1E1B4B',
              }}
            >
              <Text variant="body" fontWeight="bold" style={{ color: '#fff' }}>
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

      {/* Rep 2 Row */}
      <Box py="s" flexDirection="row" alignItems="center">
        <Box width="30%">
          <Text variant="body" fontWeight="bold">
            Ko Hla (rep-2)
          </Text>
          <Text variant="bodySecondary">Mandalay/Shan</Text>
        </Box>
        {daysOfWeekLabels.map((_, idx) => {
          const stats = getRepDayStats('rep-2', idx);
          const isSelected =
            selectedRep === 'rep-2' && selectedDayIndex === idx;
          return (
            <TouchableOpacity
              key={`rep-2-${idx}`}
              onPress={() => {
                setSelectedRep('rep-2');
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
                borderColor: '#1E1B4B',
              }}
            >
              <Text variant="body" fontWeight="bold" style={{ color: '#fff' }}>
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

      {/* Legend indicators */}
      <Box
        flexDirection="row"
        mt="m"
        justifyContent="flex-start"
        flexWrap="wrap"
      >
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box
            width={12}
            height={12}
            borderRadius="s"
            style={{ backgroundColor: '#22C55E' }}
            mr="xs"
          />
          <Text variant="bodySecondary">{t('metQuota')}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box
            width={12}
            height={12}
            borderRadius="s"
            style={{ backgroundColor: '#EAB308' }}
            mr="xs"
          />
          <Text variant="bodySecondary">{t('partialActivity')}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" mr="m" mb="xs">
          <Box
            width={12}
            height={12}
            borderRadius="s"
            style={{ backgroundColor: '#FF3B30' }}
            mr="xs"
          />
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
