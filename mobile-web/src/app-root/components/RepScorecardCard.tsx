import React from 'react';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';

interface RepScorecardCardProps {
  repScore: any;
  pointsLogs: any[];
}

export const RepScorecardCard: React.FC<RepScorecardCardProps> = ({
  repScore,
  pointsLogs,
}) => {
  const theme = useTheme<Theme>();

  if (!repScore) return null;

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="m"
      >
        <Text variant="title" style={{ color: '#5A31F4' }}>
          🏆 Representative Scorecard
        </Text>
        <Box bg="warningBg" px="s" py="xs" borderRadius="s">
          <Text
            variant="badge"
            color="warningText"
            fontSize={10}
            fontWeight="bold"
          >
            ⚡ {repScore.streakDays} DAY STREAK
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
            Total Points
          </Text>
          <Text variant="header" fontSize={28} style={{ color: '#5A31F4' }}>
            {repScore.points} PTS
          </Text>
        </Box>

        <Box flex={1} alignItems="center">
          <Text variant="bodySecondary" mb="xs">
            Earned Badges
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
              <Text variant="bodySecondary">No badges yet.</Text>
            )}
          </Box>
        </Box>
      </Box>

      {pointsLogs.length > 0 && (
        <Box borderTopWidth={1} borderTopColor="borderColor" pt="m">
          <Text variant="bodySecondary" fontWeight="bold" mb="s">
            Recent Points Log
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
