import { useState, useEffect } from 'react';
import { ScrollView, Alert, Platform } from 'react-native';
import { Box, Text, Card, Button } from '@burma-inventory/ui-components';
import { database, runAtomic } from '../../../core/database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, and, ne } from 'drizzle-orm';
import { useAuth } from '../../../core/auth/auth';
import { useTranslation } from '../../../core/i18n/i18n';
import { getCachedLocation } from '../../../core/utils/locationCache';
import * as ImagePicker from 'expo-image-picker';
import { ImageUploadQueue } from '../../sync/ImageUploadQueue';
import { writeAuditEvent } from '../../../core/utils/audit';
import { getDeviceId } from '../../../core/storage/platformStorage';
import { syncData } from '../../sync/sync';
import * as Location from 'expo-location';

interface ManifestItem {
  id: string;
  notes: string;
  commercialStatus: string;
  createdAtLocal: number;
  dispatchedAt: number | null;
  items: {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface ShopGroup {
  shopId: string;
  shopName: string;
  shopAddress: string;
  manifests: ManifestItem[];
}

export function DriverManifestScreen() {
  const { t } = useTranslation();
  const { activeRep } = useAuth();
  const [shopGroups, setShopGroups] = useState<ShopGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadManifests = async () => {
    setLoading(true);
    try {
      const logs = await database
        .select()
        .from(sqliteSchema.interaction_logs)
        .where(
          and(
            eq(sqliteSchema.interaction_logs.assigned_driver_id, activeRep.id),
            ne(sqliteSchema.interaction_logs.commercial_status, 'DELIVERED'),
          ),
        );

      const shops = await database.select().from(sqliteSchema.shops);
      const allIntItems = await database
        .select()
        .from(sqliteSchema.interaction_items);
      const catalogItems = await database.select().from(sqliteSchema.items);

      const shopMap = new Map(shops.map((s) => [s.id, s]));
      const catalogMap = new Map(catalogItems.map((i) => [i.id, i]));

      const grouped: Record<string, ManifestItem[]> = {};

      for (const log of logs) {
        const items = allIntItems
          .filter((ii) => ii.interaction_log_id === log.id)
          .map((ii) => {
            const catItem = catalogMap.get(ii.item_id);
            return {
              name: catItem ? catItem.name : 'Unknown Item',
              sku: catItem ? catItem.sku : 'N/A',
              quantity: ii.quantity,
              unitPrice: ii.unit_price_at_sale,
            };
          });

        const manifest: ManifestItem = {
          id: log.id,
          notes: log.notes || '',
          commercialStatus: log.commercial_status,
          createdAtLocal: log.created_at_local,
          dispatchedAt: log.dispatched_at || null,
          items,
        };

        if (!grouped[log.shop_id]) {
          grouped[log.shop_id] = [];
        }
        grouped[log.shop_id].push(manifest);
      }

      const groups: ShopGroup[] = Object.entries(grouped).map(
        ([shopId, manifests]) => {
          const shop = shopMap.get(shopId);
          return {
            shopId,
            shopName: shop ? shop.name : 'Unknown Shop',
            shopAddress: shop ? shop.address : 'No Address Registered',
            manifests,
          };
        },
      );

      setShopGroups(groups);
    } catch (err) {
      console.error('Failed to load manifests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManifests();
  }, [activeRep.id]);

  const handleDispatch = async (logId: string, shopId: string) => {
    try {
      const now = Date.now();
      const deviceId = await getDeviceId();

      await runAtomic(async (tx) => {
        await tx
          .update(sqliteSchema.interaction_logs)
          .set({
            commercial_status: 'DISPATCHED',
            dispatched_at: now,
            updated_at: now,
          })
          .where(eq(sqliteSchema.interaction_logs.id, logId));

        await writeAuditEvent(tx, {
          event_id: `evt-${Math.random().toString(36).substring(2, 15)}`,
          trace_id: null,
          actor_id: activeRep.id,
          device_id: deviceId,
          entity_type: 'ORDER',
          action: 'DISPATCH',
          previous_state: JSON.stringify({
            commercial_status: 'PENDING_DISPATCH',
          }),
          new_state: JSON.stringify({
            commercial_status: 'DISPATCHED',
            dispatched_at: now,
          }),
          gps_coordinates: null,
          created_at: now,
          shop_id: shopId,
          executed_by_id: activeRep.id,
          salesperson_id: activeRep.id,
          approved_by_id: null,
        });
      });

      syncData().catch((err) =>
        console.warn('Background sync after dispatch failed:', err),
      );
      Alert.alert(t('success'), t('manifestDispatchedAlert'));
      loadManifests();
    } catch (err) {
      console.error('Failed to dispatch order:', err);
      Alert.alert(t('error'), t('manifestDispatchFailed'));
    }
  };

  const takeProofOfDelivery = async (logId: string, shopId: string) => {
    let locationHash = '0,0';
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await getCachedLocation({
            accuracy: Location.Accuracy.Balanced,
          });
          locationHash = `${loc.coords.latitude},${loc.coords.longitude}`;
        }
      } else {
        if (navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
              });
            },
          ).catch(() => null);
          if (pos) {
            locationHash = `${pos.coords.latitude},${pos.coords.longitude}`;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to get GPS location for POD:', err);
    }

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        await handleDeliverySubmit(logId, shopId, objectUrl, locationHash);
      };
      input.click();
    } else {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('permissionRequired'), t('cameraPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await handleDeliverySubmit(logId, shopId, uri, locationHash);
      } else {
        Alert.alert(t('error'), t('manifestPodMandatory'));
      }
    }
  };

  const handleDeliverySubmit = async (
    logId: string,
    shopId: string,
    photoUri: string,
    locationHash: string,
  ) => {
    try {
      const now = Date.now();
      const deviceId = await getDeviceId();

      await runAtomic(async (tx) => {
        await tx
          .update(sqliteSchema.interaction_logs)
          .set({
            commercial_status: 'DELIVERED',
            pod_image_url: 'pending_upload',
            updated_at: now,
          })
          .where(eq(sqliteSchema.interaction_logs.id, logId));

        await writeAuditEvent(tx, {
          event_id: `evt-${Math.random().toString(36).substring(2, 15)}`,
          trace_id: null,
          actor_id: activeRep.id,
          device_id: deviceId,
          entity_type: 'ORDER',
          action: 'DELIVER',
          previous_state: JSON.stringify({ commercial_status: 'DISPATCHED' }),
          new_state: JSON.stringify({
            commercial_status: 'DELIVERED',
            pod_image_url: 'pending_upload',
          }),
          gps_coordinates: locationHash,
          created_at: now,
          shop_id: shopId,
          executed_by_id: activeRep.id,
          salesperson_id: activeRep.id,
          approved_by_id: null,
        });
      });

      await ImageUploadQueue.enqueuePodImage(
        logId,
        photoUri,
        undefined,
        activeRep.id,
      );

      syncData().catch((err) =>
        console.warn('Background sync after POD delivery failed:', err),
      );

      Alert.alert(t('success'), t('manifestDeliveredSuccess'));
      loadManifests();
    } catch (err) {
      console.error('Failed to submit delivery:', err);
      Alert.alert(t('error'), t('manifestDeliverFailed'));
    }
  };

  if (loading) {
    return (
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        bg="mainBackground"
        p="m"
      >
        <Text variant="body">{t('loading')}</Text>
      </Box>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Box mb="l">
        <Text variant="title" mb="xs">
          🚚 {t('driverManifest')}
        </Text>
        <Text variant="bodySecondary">{t('driverManifestDesc')}</Text>
      </Box>

      {shopGroups.length === 0 ? (
        <Card
          p="l"
          alignItems="center"
          borderColor="borderColor"
          borderWidth={1}
        >
          <Text variant="body" color="secondaryText" style={{ fontSize: 16 }}>
            {t('noShipmentsAssigned')}
          </Text>
        </Card>
      ) : (
        shopGroups.map((group) => (
          <Card
            key={group.shopId}
            p="m"
            mb="m"
            borderColor="borderColor"
            borderWidth={1}
          >
            <Box mb="m" borderBottomWidth={1} borderColor="borderColor" pb="s">
              <Text
                variant="body"
                fontWeight="bold"
                fontSize={18}
                style={{ color: '#5A31F4' }}
              >
                🏢 {group.shopName}
              </Text>
              <Text variant="caption" color="secondaryText" mt="xs">
                📍 {group.shopAddress}
              </Text>
            </Box>

            {group.manifests.map((manifest) => {
              const dateStr = new Date(
                manifest.createdAtLocal,
              ).toLocaleString();
              const isPendingDispatch =
                manifest.commercialStatus === 'PENDING_DISPATCH';
              const isDispatched = manifest.commercialStatus === 'DISPATCHED';

              return (
                <Box
                  key={manifest.id}
                  p="s"
                  mb="s"
                  borderRadius="m"
                  bg="secondaryBackground"
                >
                  <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb="s"
                  >
                    <Text variant="caption" color="secondaryText">
                      📅 {t('orderedAtLabel').replace('{date}', dateStr)}
                    </Text>
                    <Box
                      px="s"
                      py="xs"
                      borderRadius="s"
                      style={{
                        backgroundColor: isPendingDispatch
                          ? '#FEF3C7'
                          : '#DBEAFE',
                      }}
                    >
                      <Text
                        variant="caption"
                        fontWeight="bold"
                        style={{
                          color: isPendingDispatch ? '#D97706' : '#2563EB',
                        }}
                      >
                        {isPendingDispatch
                          ? t('statusPendingDispatch')
                          : t('statusDispatched')}
                      </Text>
                    </Box>
                  </Box>

                  <Box mb="s">
                    {manifest.items.map((item, idx) => (
                      <Text
                        key={idx}
                        variant="bodySecondary"
                        style={{ fontSize: 13, marginVertical: 1 }}
                      >
                        • {item.name} ({item.sku}){' '}
                        {t('quantityPcs').replace(
                          '{qty}',
                          item.quantity.toString(),
                        )}
                      </Text>
                    ))}
                  </Box>

                  {manifest.notes ? (
                    <Text
                      variant="caption"
                      color="secondaryText"
                      style={{ fontStyle: 'italic' }}
                      mb="m"
                    >
                      📝 {manifest.notes}
                    </Text>
                  ) : null}

                  <Box mt="s">
                    {isPendingDispatch && (
                      <Button
                        title={t('dispatchOrderBtn')}
                        variant="primary"
                        onPress={() =>
                          handleDispatch(manifest.id, group.shopId)
                        }
                      />
                    )}
                    {isDispatched && (
                      <Button
                        title={t('confirmDeliveryBtn')}
                        variant="primary"
                        onPress={() =>
                          takeProofOfDelivery(manifest.id, group.shopId)
                        }
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
