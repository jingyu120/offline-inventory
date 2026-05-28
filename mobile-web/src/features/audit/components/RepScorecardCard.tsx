import React from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';

interface RepScorecardCardProps {
  repScore: any;
  pointsLogs: any[];
  repKpis?: any;
}

export const RepScorecardCard: React.FC<RepScorecardCardProps> = ({
  repScore,
  pointsLogs,
  repKpis,
}) => {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  if (!repScore) return null;

  const salesPct =
    repKpis && repKpis.salesTarget > 0
      ? Math.min((repKpis.salesVolume / repKpis.salesTarget) * 100, 100)
      : 0;

  const visitsPct =
    repKpis && repKpis.visitsTarget > 0
      ? Math.min((repKpis.visitsCount / repKpis.visitsTarget) * 100, 100)
      : 0;

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Text variant="title" color="brand">
          🏆 {t('repScorecard')}
        </Text>
        <Box bg="warningBg" px="s" py="xs" borderRadius="s">
          <Text
            variant="badge"
            color="warningText"
            fontSize={10}
            fontWeight="bold"
          >
            {t('dayStreak').replace('{streak}', repScore.streakDays.toString())}
          </Text>
        </Box>
      </Box>

      {/* Gamification Points & Badges */}
      <Box flexDirection="row" mb="m">
        <Box
          flex={1}
          alignItems="center"
          borderRightWidth={1}
          borderRightColor="borderColor"
        >
          <Text variant="bodySecondary" mb="xs">
            {t('totalPoints')}
          </Text>
          <Text variant="header" fontSize={28} color="brand">
            {repScore.points} PTS
          </Text>
        </Box>

        <Box flex={1} alignItems="center">
          <Text variant="bodySecondary" mb="xs">
            {t('earnedBadges')}
          </Text>
          <Box
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="center"
            mt="xs"
          >
            {JSON.parse(repScore.badges || '[]').map((badge: string) => (
              <Box
                key={badge}
                bg="secondaryBackground"
                px="s"
                py="xs"
                borderRadius="s"
                m="xs"
                borderColor="borderColor"
                borderWidth={1}
              >
                <Text
                  variant="bodySecondary"
                  fontSize={10}
                  fontWeight="bold"
                  style={{ color: theme.colors.secondaryText }}
                >
                  🏅 {badge}
                </Text>
              </Box>
            ))}
            {JSON.parse(repScore.badges || '[]').length === 0 && (
              <Text variant="bodySecondary">{t('noBadgesYet')}</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Offline KPI Targets Card */}
      <Box borderTopWidth={1} borderTopColor="borderColor" py="m">
        <Text variant="bodySecondary" fontWeight="bold" mb="s">
          🎯 Offline Targets & Daily Performance
        </Text>
        {repKpis ? (
          <Box style={{ gap: 12 }}>
            {/* Sales Volume KPI */}
            <Box>
              <Box flexDirection="row" justifyContent="space-between" mb="xs">
                <Text variant="body" fontSize={13}>
                  Sales Volume Volume
                </Text>
                <Text
                  variant="body"
                  fontSize={13}
                  fontWeight="bold"
                  color="brand"
                >
                  K{repKpis.salesVolume.toLocaleString()} / K
                  {repKpis.salesTarget.toLocaleString()} ({Math.round(salesPct)}
                  %)
                </Text>
              </Box>
              <Box
                width="100%"
                bg="secondaryBackground"
                height={8}
                borderRadius="s"
                overflow="hidden"
              >
                <Box
                  width={`${salesPct}%`}
                  bg="brand"
                  height="100%"
                  borderRadius="s"
                />
              </Box>
            </Box>

            {/* Visit KPI */}
            <Box>
              <Box flexDirection="row" justifyContent="space-between" mb="xs">
                <Text variant="body" fontSize={13}>
                  Store Visits completed
                </Text>
                <Text
                  variant="body"
                  fontSize={13}
                  fontWeight="bold"
                  color="success"
                >
                  {repKpis.visitsCount} / {repKpis.visitsTarget} (
                  {Math.round(visitsPct)}%)
                </Text>
              </Box>
              <Box
                width="100%"
                bg="secondaryBackground"
                height={8}
                borderRadius="s"
                overflow="hidden"
              >
                <Box
                  width={`${visitsPct}%`}
                  bg="success"
                  height="100%"
                  borderRadius="s"
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Text variant="bodySecondary" style={{ fontStyle: 'italic' }}>
            No daily KPI targets cached offline.
          </Text>
        )}
      </Box>

      {pointsLogs.length > 0 && (
        <Box borderTopWidth={1} borderTopColor="borderColor" pt="m">
          <Text variant="bodySecondary" fontWeight="bold" mb="s">
            {t('recentPointsLog')}
          </Text>
          {pointsLogs.map((log: any) => (
            <Box
              key={log.id}
              flexDirection="row"
              justifyContent="space-between"
              mb="xs"
            >
              <Text variant="bodySecondary" fontSize={11}>
                {log.reason}
              </Text>
              <Text
                variant="body"
                fontSize={11}
                fontWeight="bold"
                style={{ color: '#10B981' }}
              >
                +{log.pointsAdded} PTS
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
};
