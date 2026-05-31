import React from 'react';
import { ScrollView } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react-native';
import { RepDayStats } from '../hooks/useTeamPulseData';
import { useTranslation } from '../../../core/i18n/i18n';

import {
  getRepresentativeName,
  getLogTypeLabel,
} from '../../../config/appConfig';

interface VelocityTimelineProps {
  selectedRep: string;
  selectedDayIndex: number;
  stats: RepDayStats;
  shops: { id: string; name: string }[];
}

export const VelocityTimeline: React.FC<VelocityTimelineProps> = ({
  selectedRep,
  selectedDayIndex,
  stats,
  shops,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const daysOfWeekLabels = [
    t('monday'),
    t('tuesday'),
    t('wednesday'),
    t('thursday'),
    t('friday'),
    t('saturday'),
    t('sunday'),
  ];

  const getShopName = (shopId: string) => {
    return shops.find((s) => s.id === shopId)?.name || 'Unknown Shop';
  };

  return (
    <Card p="m" bg="cardBackground" height="100%">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="s"
      >
        <Text variant="title">
          {t('timelineAnalysis')} ({daysOfWeekLabels[selectedDayIndex]})
        </Text>
        <Text variant="bodySecondary" fontWeight="bold">
          {getRepresentativeName(selectedRep)}
        </Text>
      </Box>

      {/* Compliance / Dumping warning headers */}
      {stats.batchFlagged && (
        <Box
          bg="dangerBg"
          p="s"
          borderRadius="s"
          mb="m"
          flexDirection="row"
          alignItems="center"
        >
          <AlertTriangle
            size={18}
            stroke={theme.colors.dangerText}
            style={{ marginRight: 8 }}
          />
          <Box flex={1}>
            <Text variant="body" color="dangerText" fontWeight="bold">
              {t('complianceAlertTitle')}
            </Text>
            <Text variant="bodySecondary" color="dangerText" fontSize={11}>
              {t('complianceAlertDesc')}
            </Text>
          </Box>
        </Box>
      )}

      {stats.logCount >= stats.targetQuota ? (
        <Box
          bg="successBg"
          p="s"
          borderRadius="s"
          mb="m"
          flexDirection="row"
          alignItems="center"
        >
          <CheckCircle
            size={18}
            stroke={theme.colors.successText}
            style={{ marginRight: 8 }}
          />
          <Text variant="body" color="successText" fontWeight="bold">
            {t('dailyTargetMet')
              .replace('{count}', stats.logCount.toString())
              .replace('{quota}', stats.targetQuota.toString())}
          </Text>
        </Box>
      ) : (
        <Box
          bg="warningBg"
          p="s"
          borderRadius="s"
          mb="m"
          flexDirection="row"
          alignItems="center"
        >
          <Clock
            size={18}
            stroke={theme.colors.warningText}
            style={{ marginRight: 8 }}
          />
          <Text variant="body" color="warningText" fontWeight="bold">
            {t('targetMissed')
              .replace('{count}', stats.logCount.toString())
              .replace('{quota}', stats.targetQuota.toString())}
          </Text>
        </Box>
      )}

      {/* Logs timeline list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {stats.logs.map((log, index) => {
          return (
            <Box
              key={log.id}
              flexDirection="row"
              mb="m"
              pb="s"
              borderBottomWidth={index < stats.logs.length - 1 ? 1 : 0}
              borderColor="borderColor"
            >
              {/* Timestamp column */}
              <Box width={70} mr="s">
                <Text variant="body" fontWeight="bold" color="primaryText">
                  {new Date(log.createdAtLocal).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text variant="bodySecondary">
                  {getLogTypeLabel(log.type, t)}
                </Text>
              </Box>

              {/* Log node details */}
              <Box flex={1}>
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb="xs"
                >
                  <Text variant="body" fontWeight="bold" color="infoText">
                    {getShopName(log.shopId)}
                  </Text>
                  {log.isOfflineEntry && (
                    <Box bg="infoBg" px="s" py="xs" borderRadius="s">
                      <Text variant="badge" color="infoText" fontSize={9}>
                        {t('offline')}
                      </Text>
                    </Box>
                  )}
                </Box>
                <Text
                  variant="bodySecondary"
                  numberOfLines={3}
                  style={{ lineHeight: 18 }}
                >
                  {log.notes || t('noComments')}
                </Text>
              </Box>
            </Box>
          );
        })}

        {stats.logCount === 0 && (
          <Box py="xl" alignItems="center">
            <Box mb="s">
              <FileText size={32} stroke={theme.colors.secondaryText} />
            </Box>
            <Text variant="bodySecondary">{t('noLogsForDay')}</Text>
          </Box>
        )}
      </ScrollView>
    </Card>
  );
};
