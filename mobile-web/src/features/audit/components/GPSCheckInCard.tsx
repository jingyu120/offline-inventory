import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, guardAsync, sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import { useAuth } from '../../../core/auth/auth';
import { useToast } from '../../../core/components/ToastProvider';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  calculateDistance,
  GEOFENCE_RADIUS_CHECKIN_METERS,
} from '../../../core/utils/geo';
import { GPS_CHECK_IN_CONFIG } from '../../../config/appConfig';

interface GPSCheckInCardProps {
  shop: Shop;
  todayCheckIn: $Any;
  loadDetails: () => Promise<void>;
  isDesktop: boolean;
}

export const GPSCheckInCard: React.FC<GPSCheckInCardProps> = ({
  shop,
  todayCheckIn,
  loadDetails,
  isDesktop,
}) => {
  const { activeRep } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  const handleCheckIn = async (simulateNearby: boolean) => {
    try {
      const shopLat = shop.latitude || GPS_CHECK_IN_CONFIG.fallbackLatitude;
      const shopLon = shop.longitude || GPS_CHECK_IN_CONFIG.fallbackLongitude;

      // Simulated user position
      const userLat = simulateNearby
        ? shopLat + GPS_CHECK_IN_CONFIG.simulatedNearbyOffset
        : shopLat + GPS_CHECK_IN_CONFIG.simulatedFarOffset;
      const userLon = simulateNearby
        ? shopLon + GPS_CHECK_IN_CONFIG.simulatedNearbyOffset
        : shopLon + GPS_CHECK_IN_CONFIG.simulatedFarOffset;

      const dist = calculateDistance(shopLat, shopLon, userLat, userLon);
      const verified = dist <= GEOFENCE_RADIUS_CHECKIN_METERS;

      const [, error] = await guardAsync(
        (async () => {
          const now = Date.now();
          const checkInId = Math.random().toString(36).substring(2, 15);
          // Create CheckInLog
          await database.insert(sqliteSchema.check_in_logs).values({
            id: checkInId,
            shop_id: shop.id,
            rep_id: activeRep.id,
            check_in_time: now,
            latitude: userLat,
            longitude: userLon,
            verified: verified,
            created_at: now,
            updated_at: now,
          });

          if (verified) {
            // Award points
            const existingScores = await database
              .select()
              .from(sqliteSchema.rep_scores)
              .where(eq(sqliteSchema.rep_scores.rep_id, activeRep.id));
            const activeScore = existingScores[0];

            if (activeScore) {
              await database
                .update(sqliteSchema.rep_scores)
                .set({
                  points:
                    activeScore.points +
                    GPS_CHECK_IN_CONFIG.verifiedRewardPoints,
                  streak_days:
                    activeScore.streak_days +
                    GPS_CHECK_IN_CONFIG.streakDaysIncrement,
                  updated_at: now,
                })
                .where(eq(sqliteSchema.rep_scores.id, activeScore.id));
            } else {
              const scoreId = Math.random().toString(36).substring(2, 15);
              await database.insert(sqliteSchema.rep_scores).values({
                id: scoreId,
                rep_id: activeRep.id,
                points: GPS_CHECK_IN_CONFIG.verifiedRewardPoints,
                streak_days: GPS_CHECK_IN_CONFIG.streakDaysIncrement,
                badges: JSON.stringify([GPS_CHECK_IN_CONFIG.firstTimeBadge]),
                created_at: now,
                updated_at: now,
              });
            }

            // Create PointsLog
            const pointsLogId = Math.random().toString(36).substring(2, 15);
            await database.insert(sqliteSchema.points_logs).values({
              id: pointsLogId,
              rep_id: activeRep.id,
              points_added: GPS_CHECK_IN_CONFIG.verifiedRewardPoints,
              reason: `Verified check-in at ${shop.name}`,
              created_at: now,
            });
          }
        })(),
      );

      if (error) {
        throw error;
      }

      if (verified) {
        showToast(t('verifiedCheckInSuccessPoints'), 'success');
      } else {
        showToast(t('checkInUnverifiedFar'), 'warning');
      }

      await loadDetails();
    } catch (e) {
      console.error('Check-in failed:', e);
      showToast(t('errorDuringCheckIn'), 'error');
    }
  };

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="s"
      >
        <Text variant="title" color="brand">
          📍 {t('gpsCheckInVerification')}
        </Text>
        {todayCheckIn ? (
          <Box
            bg={todayCheckIn.verified ? 'successBg' : 'dangerBg'}
            px="s"
            py="xs"
            borderRadius="s"
          >
            <Text
              variant="badge"
              color={todayCheckIn.verified ? 'successText' : 'dangerText'}
              fontSize={10}
            >
              {todayCheckIn.verified ? t('verified') : t('unverified')}
            </Text>
          </Box>
        ) : (
          <Box bg="secondaryBackground" px="s" py="xs" borderRadius="s">
            <Text variant="badge" color="secondaryText" fontSize={10}>
              {t('pending')}
            </Text>
          </Box>
        )}
      </Box>

      {Platform.OS === 'web' && isDesktop ? (
        <Box
          p="m"
          bg="dangerBg"
          borderRadius="m"
          borderWidth={1}
          borderColor="danger"
        >
          <Text variant="body" fontWeight="bold" color="dangerText" mb="xs">
            📍 {t('gpsCheckInLocked')}
          </Text>
          <Text variant="bodySecondary" color="dangerText">
            {t('gpsCheckInLockedDesc')}
          </Text>
        </Box>
      ) : todayCheckIn ? (
        <Box>
          <Text variant="body" mb="xs" fontWeight="bold">
            ✅ {t('checkedInToday')}
          </Text>
          <Text variant="bodySecondary" mb="xs">
            {t('time')}:{' '}
            {new Date(todayCheckIn.checkInTime).toLocaleTimeString()}
          </Text>
          <Text variant="bodySecondary">
            {t('simulatedLocation')}: {todayCheckIn.latitude.toFixed(5)},{' '}
            {todayCheckIn.longitude.toFixed(5)}
          </Text>
        </Box>
      ) : (
        <Box>
          <Text variant="bodySecondary" mb="m">
            {t('verifyPresenceDesc')
              .replace(
                '{lat}',
                (
                  shop.latitude || GPS_CHECK_IN_CONFIG.fallbackLatitude
                ).toString(),
              )
              .replace(
                '{lng}',
                (
                  shop.longitude || GPS_CHECK_IN_CONFIG.fallbackLongitude
                ).toString(),
              )}
          </Text>
          <Box flexDirection="row" justifyContent="space-between">
            <TouchableOpacity
              onPress={() => handleCheckIn(true)}
              style={{
                backgroundColor: theme.colors.success,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.pureWhite,
                  fontWeight: 'bold',
                  fontSize: 13,
                }}
              >
                {t('checkInNearby')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleCheckIn(false)}
              style={{
                backgroundColor: theme.colors.danger,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                flex: 1,
                marginLeft: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.pureWhite,
                  fontWeight: 'bold',
                  fontSize: 13,
                }}
              >
                {t('checkInFarAway')}
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      )}
    </Card>
  );
};
