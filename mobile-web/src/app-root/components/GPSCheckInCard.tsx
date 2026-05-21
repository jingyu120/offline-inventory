import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Card } from '@burma-inventory/ui-components';
import { Shop, guardAsync, sqliteSchema } from '@burma-inventory/shared-types';
import { database } from '../../database';
import { eq } from 'drizzle-orm';
import { useAuth } from '../../utils/auth';
import { useToast } from './ToastProvider';

interface GPSCheckInCardProps {
  shop: Shop;
  todayCheckIn: any;
  loadDetails: () => Promise<void>;
}

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export const GPSCheckInCard: React.FC<GPSCheckInCardProps> = ({
  shop,
  todayCheckIn,
  loadDetails,
}) => {
  const { activeRep } = useAuth();
  const { showToast } = useToast();

  const handleCheckIn = async (simulateNearby: boolean) => {
    try {
      const shopLat = shop.latitude || 16.8661;
      const shopLon = shop.longitude || 96.1951;

      // Simulated user position
      const userLat = simulateNearby ? shopLat + 0.001 : shopLat + 0.03;
      const userLon = simulateNearby ? shopLon + 0.001 : shopLon + 0.03;

      const dist = calculateDistance(shopLat, shopLon, userLat, userLon);
      const verified = dist <= 500;

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
            // Award +50 points
            const existingScores = await database
              .select()
              .from(sqliteSchema.rep_scores)
              .where(eq(sqliteSchema.rep_scores.rep_id, activeRep.id));
            const activeScore = existingScores[0];

            if (activeScore) {
              await database
                .update(sqliteSchema.rep_scores)
                .set({
                  points: activeScore.points + 50,
                  streak_days: activeScore.streak_days + 1,
                  updated_at: now,
                })
                .where(eq(sqliteSchema.rep_scores.id, activeScore.id));
            } else {
              const scoreId = Math.random().toString(36).substring(2, 15);
              await database.insert(sqliteSchema.rep_scores).values({
                id: scoreId,
                rep_id: activeRep.id,
                points: 50,
                streak_days: 1,
                badges: JSON.stringify(['First Check-in']),
                created_at: now,
                updated_at: now,
              });
            }

            // Create PointsLog
            const pointsLogId = Math.random().toString(36).substring(2, 15);
            await database.insert(sqliteSchema.points_logs).values({
              id: pointsLogId,
              rep_id: activeRep.id,
              points_added: 50,
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
        showToast(
          '📍 Verified Check-in Successful! +50 PTS awarded.',
          'success',
        );
      } else {
        showToast(
          '⚠️ Check-in logged but Unverified (too far from shop).',
          'warning',
        );
      }

      await loadDetails();
    } catch (e) {
      console.error('Check-in failed:', e);
      showToast('Error during check-in', 'error');
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
        <Text variant="title" style={{ color: '#5A31F4' }}>
          📍 GPS Check-in Verification
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
              {todayCheckIn.verified ? 'VERIFIED' : 'UNVERIFIED'}
            </Text>
          </Box>
        ) : (
          <Box bg="secondaryBackground" px="s" py="xs" borderRadius="s">
            <Text variant="badge" color="secondaryText" fontSize={10}>
              PENDING
            </Text>
          </Box>
        )}
      </Box>

      {todayCheckIn ? (
        <Box>
          <Text variant="body" mb="xs" fontWeight="bold">
            ✅ Checked In Today
          </Text>
          <Text variant="bodySecondary" mb="xs">
            Time: {new Date(todayCheckIn.checkInTime).toLocaleTimeString()}
          </Text>
          <Text variant="bodySecondary">
            Simulated Location: {todayCheckIn.latitude.toFixed(5)},{' '}
            {todayCheckIn.longitude.toFixed(5)}
          </Text>
        </Box>
      ) : (
        <Box>
          <Text variant="bodySecondary" mb="m">
            Verify your presence at this shop. You must be within 500 meters of
            the coordinates ({shop.latitude || 16.8661},{' '}
            {shop.longitude || 96.1951}) to verify.
          </Text>
          <Box flexDirection="row" justifyContent="space-between">
            <TouchableOpacity
              onPress={() => handleCheckIn(true)}
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                Check In (Nearby)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleCheckIn(false)}
              style={{
                backgroundColor: '#EF4444',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                flex: 1,
                marginLeft: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                Check In (Far Away)
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      )}
    </Card>
  );
};
