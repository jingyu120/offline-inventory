import React from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../utils/i18n';

interface RepScorecardCardProps {
  repScore: any;
  pointsLogs: any[];
}

export const RepScorecardCard: React.FC<RepScorecardCardProps> = ({
  repScore,
  pointsLogs,
}) => {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  if (!repScore) return null;

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
