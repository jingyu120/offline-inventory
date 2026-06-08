import React from 'react';
import { ScrollView, Pressable, Platform, Alert } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, Contact, sqliteSchema } from '@burma-inventory/shared-types';
import { LogWithItems, mapItem } from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import { database } from '../../../core/database/database';
import { eq, and, or } from 'drizzle-orm';
import { useAuth } from '../../../core/auth/auth';
import * as Location from 'expo-location';
import { getCachedLocation } from '../../../core/utils/locationCache';
import { UpdateTerritoryModal } from './UpdateTerritoryModal';
import {
  MapPin,
  Star,
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
} from 'lucide-react-native';
import {
  calculateDistance,
  GEOFENCE_RADIUS_AUDIT_METERS,
} from '../../../core/utils/geo';

import { GPSCheckInCard } from './GPSCheckInCard';
import { PredictionAnalyticsCard } from './PredictionAnalyticsCard';
import { RepScorecardCard } from './RepScorecardCard';
import { ContactsCard } from './ContactsCard';
import { InteractionsTimeline } from './InteractionsTimeline';

interface ShopDetailPaneProps {
  shop: Shop;
  shopContacts: Contact[];
  shopLogsWithItems: LogWithItems[];
  isDesktop: boolean;
  setSelectedShop: (shop: Shop | null) => void;
  selectShop: (shop: Shop) => void;
  onLogInteraction?: (shop: Shop) => void;
}

export const ShopDetailPane: React.FC<ShopDetailPaneProps> = ({
  shop,
  shopContacts,
  shopLogsWithItems,
  isDesktop,
  setSelectedShop,
  selectShop,
  onLogInteraction,
}) => {
  const theme = useTheme<Theme>();
  const { t, language } = useTranslation();
  const { activeRep } = useAuth();

  const [isUpdateTerritoryOpen, setIsUpdateTerritoryOpen] =
    React.useState(false);
  const [territoryNames, setTerritoryNames] = React.useState({
    regionName: '',
    townshipName: '',
    wardName: '',
  });

  const loadTerritoryNames = React.useCallback(async () => {
    try {
      let regionName = '';
      let townshipName = '';
      let wardName = '';

      if (shop.regionId) {
        const regs = await database
          .select()
          .from(sqliteSchema.regions)
          .where(eq(sqliteSchema.regions.id, shop.regionId));
        if (regs.length > 0) regionName = regs[0].name;
      }
      if (shop.townshipId) {
        const ts = await database
          .select()
          .from(sqliteSchema.townships)
          .where(eq(sqliteSchema.townships.id, shop.townshipId));
        if (ts.length > 0) townshipName = ts[0].name;
      }
      if (shop.wardId) {
        const ws = await database
          .select()
          .from(sqliteSchema.wards)
          .where(eq(sqliteSchema.wards.id, shop.wardId));
        if (ws.length > 0) wardName = ws[0].name;
      }

      setTerritoryNames({ regionName, townshipName, wardName });
    } catch (e) {
      console.error('Failed to load territory names for shop detail view:', e);
    }
  }, [shop.regionId, shop.townshipId, shop.wardId]);

  React.useEffect(() => {
    loadTerritoryNames();
  }, [loadTerritoryNames]);

  const handleStartAudit = async () => {
    if (Platform.OS === 'web') {
      onLogInteraction?.(shop);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('locationPermissionRequired'));
        return;
      }
      const loc = await getCachedLocation({
        accuracy: Location.Accuracy.Balanced,
      });
      const shopLat = shop.latitude || 16.8661;
      const shopLon = shop.longitude || 96.1951;
      const dist = calculateDistance(
        shopLat,
        shopLon,
        loc.coords.latitude,
        loc.coords.longitude,
      );
      if (dist > GEOFENCE_RADIUS_AUDIT_METERS) {
        Alert.alert(
          t('geofencedLockActive'),
          t('geofenceDistanceShopMsg')
            .replace('{meters}', GEOFENCE_RADIUS_AUDIT_METERS.toString())
            .replace('{distance}', Math.round(dist).toString()),
        );
        return;
      }
      onLogInteraction?.(shop);
    } catch (err: $Any) {
      console.error(err);
      Alert.alert(t('error'), t('failedGetCoordinates'));
    }
  };

  const [hasPlannedRoute, setHasPlannedRoute] = React.useState(false);
  const [todayCheckIn, setTodayCheckIn] = React.useState<$Any>(null);
  const [predictionLog, setPredictionLog] = React.useState<$Any>(null);
  const [recommendedOrder, setRecommendedOrder] = React.useState<$Any>(null);
  const [recommendedItem, setRecommendedItem] = React.useState<$Any>(null);
  const [repScore, setRepScore] = React.useState<$Any>(null);
  const [pointsLogs, setPointsLogs] = React.useState<$Any[]>([]);
  const [repKpis, setRepKpis] = React.useState<$Any>(null);
  // AR Aging state (Sprint 35)
  const [invoiceArState, setInvoiceArState] = React.useState<{
    totalOverdue: number;
    overdueAgingDays: number;
    isFrozen: boolean;
  }>({ totalOverdue: 0, overdueAgingDays: 0, isFrozen: false });
  const [activeMobileTab, setActiveMobileTab] = React.useState<
    'checkin' | 'history' | 'ai_insights' | 'scorecard'
  >('checkin');

  const mapRepScore = (s: $Any) => ({
    id: s.id,
    repId: s.rep_id,
    points: s.points,
    streakDays: s.streak_days,
    badges: s.badges,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  });

  const mapPointsLog = (l: $Any) => ({
    id: l.id,
    repId: l.rep_id,
    pointsAdded: l.points_added,
    reason: l.reason,
    createdAt: l.created_at,
  });

  const mapPredictionLog = (p: $Any) => ({
    id: p.id,
    shopId: p.shop_id,
    predictedLtv: p.predicted_ltv,
    churnRisk: p.churn_risk,
    stockoutRisk: p.stockout_risk,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  });

  const mapRecommendedOrder = (r: $Any) => ({
    id: r.id,
    shopId: r.shop_id,
    itemId: r.item_id,
    quantity: r.quantity,
    confidence: r.confidence,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const mapCheckInLog = (cil: $Any) => ({
    id: cil.id,
    shopId: cil.shop_id,
    repId: cil.rep_id,
    checkInTime: cil.check_in_time,
    latitude: cil.latitude,
    longitude: cil.longitude,
    verified: cil.verified,
    createdAt: cil.created_at,
    updatedAt: cil.updated_at,
  });

  const loadDetails = React.useCallback(async () => {
    try {
      // 1. Planned routes
      const prs = await database.select().from(sqliteSchema.planned_routes);
      const todayStr = new Date().toISOString().split('T')[0];
      const activeRoute = prs.find(
        (pr: $Any) => pr.rep_id === activeRep.id && pr.date === todayStr,
      );
      if (activeRoute) {
        try {
          const shopIds = JSON.parse(activeRoute.shop_ids);
          setHasPlannedRoute(shopIds.includes(shop.id));
        } catch {
          setHasPlannedRoute(false);
        }
      } else {
        setHasPlannedRoute(false);
      }

      // 2. Check-in logs
      const cils = await database.select().from(sqliteSchema.check_in_logs);
      const todayCi = cils.find((cil: $Any) => {
        const cilDate = new Date(cil.check_in_time).toISOString().split('T')[0];
        return (
          cil.shop_id === shop.id &&
          cil.rep_id === activeRep.id &&
          cilDate === todayStr
        );
      });
      setTodayCheckIn(todayCi ? mapCheckInLog(todayCi) : null);

      // 3. Predictions
      const preds = await database.select().from(sqliteSchema.prediction_logs);
      const pred = preds.find((p: $Any) => p.shop_id === shop.id);
      setPredictionLog(pred ? mapPredictionLog(pred) : null);

      // 4. Recommendations
      const recs = await database
        .select()
        .from(sqliteSchema.recommended_orders);
      const rec = recs.find((r: $Any) => r.shop_id === shop.id);
      setRecommendedOrder(rec ? mapRecommendedOrder(rec) : null);
      if (rec) {
        try {
          const itemsList = await database
            .select()
            .from(sqliteSchema.items)
            .where(eq(sqliteSchema.items.id, rec.item_id));
          const item = itemsList[0];
          setRecommendedItem(item ? mapItem(item) : null);
        } catch {
          setRecommendedItem(null);
        }
      } else {
        setRecommendedItem(null);
      }

      // 5. Rep Scores
      const scores = await database.select().from(sqliteSchema.rep_scores);
      const score = scores.find((s: $Any) => s.rep_id === activeRep.id);
      setRepScore(score ? mapRepScore(score) : null);

      // 6. Points Logs
      const logs = await database.select().from(sqliteSchema.points_logs);
      const filteredLogs = logs
        .filter((l: $Any) => l.rep_id === activeRep.id)
        .sort((a: $Any, b: $Any) => b.created_at - a.created_at);
      setPointsLogs(filteredLogs.slice(0, 5).map(mapPointsLog));

      // 7. Rep KPIs
      const kpis = await database.select().from(sqliteSchema.rep_kpis);
      const kpi = kpis.find(
        (k: $Any) => k.rep_id === activeRep.id && k.date === todayStr,
      );
      setRepKpis(
        kpi
          ? {
              id: kpi.id,
              repId: kpi.rep_id,
              date: kpi.date,
              salesVolume: kpi.sales_volume,
              salesTarget: kpi.sales_target,
              visitsCount: kpi.visits_count,
              visitsTarget: kpi.visits_target,
            }
          : null,
      );

      // 8. AR Aging (Sprint 35) – query invoices for this shop
      const now = Date.now();
      const allInvoices = await database
        .select()
        .from(sqliteSchema.invoices)
        .where(
          and(
            eq(sqliteSchema.invoices.shop_id, shop.id),
            or(
              eq(sqliteSchema.invoices.state, 'PENDING'),
              eq(sqliteSchema.invoices.state, 'PARTIALLY_PAID'),
              eq(sqliteSchema.invoices.state, 'OVERDUE'),
            ),
          ),
        );

      let totalOverdue = 0;
      let maxAgingDays = 0;
      for (const inv of allInvoices) {
        const effectiveDue =
          inv.due_date + inv.grace_period_days * 24 * 60 * 60 * 1000;
        if (now > effectiveDue) {
          totalOverdue += inv.amount;
          const agingDays = Math.floor(
            (now - effectiveDue) / (24 * 60 * 60 * 1000),
          );
          if (agingDays > maxAgingDays) maxAgingDays = agingDays;
        }
      }
      setInvoiceArState({
        totalOverdue,
        overdueAgingDays: maxAgingDays,
        isFrozen: maxAgingDays >= 30,
      });
    } catch (e) {
      console.error('Failed to load shop details:', e);
    }
  }, [shop.id, activeRep.id]);

  React.useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const renderTrendBadge = (trend: string) => {
    let bg: keyof Theme['colors'] = 'secondaryButton';
    let textCol: keyof Theme['colors'] = 'secondaryText';
    const label = trend || 'NEUTRAL';
    let Icon = Clock;

    if (
      trend === 'POSITIVE' ||
      trend === 'UPWARD' ||
      trend === 'GROWING' ||
      trend === 'IMPROVING'
    ) {
      bg = 'successBg';
      textCol = 'successText';
      Icon = TrendingUp;
    } else if (
      trend === 'NEGATIVE' ||
      trend === 'DOWNWARD' ||
      trend === 'SHRINKING' ||
      trend === 'DECLINING'
    ) {
      bg = 'dangerBg';
      textCol = 'dangerText';
      Icon = TrendingDown;
    }

    return (
      <Box
        flexDirection="row"
        alignItems="center"
        bg={bg}
        px="s"
        py="xs"
        borderRadius="s"
      >
        <Icon
          size={14}
          stroke={theme.colors[textCol]}
          style={{ marginRight: 4 }}
        />
        <Text variant="bodySecondary" fontWeight="bold" color={textCol}>
          {label}
        </Text>
      </Box>
    );
  };

  const renderMobileTabBar = () => {
    return (
      <Box
        flexDirection="row"
        bg="secondaryBackground"
        borderRadius="m"
        p="xs"
        mb="m"
      >
        {(['checkin', 'history', 'ai_insights', 'scorecard'] as const).map(
          (tab) => {
            const isActive = activeMobileTab === tab;
            const labelKeys = {
              checkin: 'tabCheckIn',
              history: 'tabHistory',
              ai_insights: 'tabAiInsights',
              scorecard: 'tabScorecard',
            } as const;
            const labelKey = labelKeys[tab];

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveMobileTab(tab)}
                style={{ flex: 1 }}
              >
                <Box
                  bg={isActive ? 'cardBackground' : 'transparent'}
                  py="s"
                  borderRadius="s"
                  alignItems="center"
                  justifyContent="center"
                  style={
                    isActive
                      ? Platform.OS === 'web'
                        ? { boxShadow: '0px 1px 3px rgba(0,0,0,0.1)' }
                        : {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 1,
                          }
                      : undefined
                  }
                >
                  <Text
                    variant="bodySecondary"
                    fontWeight="bold"
                    color={isActive ? 'primaryText' : 'secondaryText'}
                    style={{ fontSize: 12 }}
                  >
                    {t(labelKey)}
                  </Text>
                </Box>
              </Pressable>
            );
          },
        )}
      </Box>
    );
  };

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <Box
        flexDirection={isDesktop ? 'row' : 'column'}
        justifyContent="space-between"
        alignItems={isDesktop ? 'center' : 'stretch'}
        mb="m"
        style={!isDesktop ? { gap: 12 } : undefined}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          flexWrap="wrap"
          style={{ flex: 1, gap: 8 }}
        >
          <Box>
            <Button
              title={isDesktop ? t('backToOverview') : t('back')}
              onPress={() => setSelectedShop(null)}
              variant="secondary"
              icon={
                <ArrowLeft
                  size={16}
                  stroke={theme.colors.secondaryButtonText}
                />
              }
            />
          </Box>
          <Text
            variant="header"
            fontSize={
              language === 'my' ? (isDesktop ? 26 : 20) : isDesktop ? 32 : 24
            }
            lineHeight={
              language === 'my' ? (isDesktop ? 40 : 32) : isDesktop ? 38 : 30
            }
          >
            {shop.name}
          </Text>
          {hasPlannedRoute && (
            <Box bg="infoBg" px="s" py="xs" borderRadius="s">
              <Text
                variant="badge"
                color="info"
                fontSize={11}
                fontWeight="bold"
              >
                📍 {t('routePlanned')}
              </Text>
            </Box>
          )}
        </Box>
        <Box style={!isDesktop ? { alignSelf: 'stretch' } : undefined}>
          {invoiceArState.isFrozen ? (
            // Account frozen – show lock banner, disable interaction button
            <Box
              bg="dangerBg"
              borderRadius="s"
              px="m"
              py="s"
              flexDirection="row"
              alignItems="center"
              style={{ gap: 8 }}
            >
              <AlertTriangle size={18} color={theme.colors.dangerText} />
              <Box flex={1}>
                <Text
                  variant="bodySecondary"
                  color="dangerText"
                  fontWeight="bold"
                  fontSize={13}
                >
                  {t('accountFrozenAr')}
                </Text>
                <Text variant="bodySecondary" color="dangerText" fontSize={11}>
                  {t('arOverdueOutstanding')
                    .replace(
                      '{days}',
                      invoiceArState.overdueAgingDays.toString(),
                    )
                    .replace(
                      '{amount}',
                      invoiceArState.totalOverdue.toLocaleString(),
                    )}
                </Text>
              </Box>
            </Box>
          ) : (
            <Button
              title={t('logInteraction')}
              onPress={handleStartAudit}
              variant="primary"
            />
          )}
        </Box>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {!isDesktop && renderMobileTabBar()}

        {/* Shop Meta Stats, GPS Check-in & Contacts (shown on Desktop, or Mobile Check-In Tab) */}
        {(isDesktop || activeMobileTab === 'checkin') && (
          <>
            <Box
              flexDirection="row"
              flexWrap="wrap"
              style={{ marginHorizontal: -8 }}
              mb="m"
            >
              <Box width={isDesktop ? '33.3%' : '100%'} p="s">
                <Card flexDirection="row" alignItems="center" p="m">
                  <Box bg="infoBg" p="s" borderRadius="m" mr="m">
                    <MapPin size={20} stroke={theme.colors.info} />
                  </Box>
                  <Box flex={1}>
                    <Text variant="bodySecondary">{t('address')}</Text>
                    <Text variant="body" fontWeight="bold" numberOfLines={3}>
                      {shop.address || t('noAddress')}
                    </Text>
                    {territoryNames.townshipName ? (
                      <Text
                        variant="caption"
                        color="secondaryText"
                        mt="xs"
                        style={{ fontStyle: 'italic' }}
                      >
                        {territoryNames.townshipName} •{' '}
                        {territoryNames.wardName}
                      </Text>
                    ) : null}
                    <Box mt="xs" alignItems="flex-start">
                      <Pressable
                        onPress={() => setIsUpdateTerritoryOpen(true)}
                        style={({ pressed }: $Any) => ({
                          opacity: pressed ? 0.6 : 1,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: theme.colors.borderColor,
                          backgroundColor: theme.colors.secondaryBackground,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: 'bold',
                            color: theme.colors.primaryText,
                          }}
                        >
                          ✏️ {t('updateTerritory')}
                        </Text>
                      </Pressable>
                    </Box>
                  </Box>
                </Card>
              </Box>

              <Box width={isDesktop ? '33.3%' : '50%'} p="s">
                <Card flexDirection="row" alignItems="center" p="m">
                  <Box bg="successBg" p="s" borderRadius="m" mr="m">
                    <DollarSign size={20} stroke={theme.colors.success} />
                  </Box>
                  <Box flex={1}>
                    <Text variant="bodySecondary">{t('lifetimeValue')}</Text>
                    <Text variant="body" fontWeight="bold">
                      {t('priceFormatted').replace(
                        '{price}',
                        (shop.lifetimeValue || 0).toLocaleString(),
                      )}
                    </Text>
                  </Box>
                </Card>
              </Box>

              <Box width={isDesktop ? '33.3%' : '50%'} p="s">
                <Card flexDirection="row" alignItems="center" p="m">
                  <Box bg="warningBg" p="s" borderRadius="m" mr="m">
                    <Star size={20} stroke={theme.colors.warning} />
                  </Box>
                  <Box flex={1}>
                    <Text variant="bodySecondary">{t('sentimentTrend')}</Text>
                    <Box mt="xs" alignItems="flex-start">
                      {renderTrendBadge(shop.sentimentTrend)}
                    </Box>
                  </Box>
                </Card>
              </Box>
            </Box>

            <GPSCheckInCard
              shop={shop}
              todayCheckIn={todayCheckIn}
              loadDetails={loadDetails}
              isDesktop={isDesktop}
            />

            <ContactsCard shopContacts={shopContacts} isDesktop={isDesktop} />
          </>
        )}

        {/* Predictive Analytics & AI Recommendations (shown on Desktop, or Mobile AI Insights Tab) */}
        {(isDesktop || activeMobileTab === 'ai_insights') && (
          <PredictionAnalyticsCard
            shop={shop}
            predictionLog={predictionLog}
            recommendedOrder={recommendedOrder}
            recommendedItem={recommendedItem}
            onLogInteraction={onLogInteraction}
            historicalNotes={shopLogsWithItems
              .map((l) => l.log.notes)
              .filter(Boolean)}
          />
        )}

        {/* Gamification Scorecard (shown on Desktop, or Mobile Scorecard Tab) */}
        {(isDesktop || activeMobileTab === 'scorecard') && (
          <RepScorecardCard
            repScore={repScore}
            pointsLogs={pointsLogs}
            repKpis={repKpis}
          />
        )}

        {/* Recent Interactions Timeline (shown on Desktop, or Mobile History Tab) */}
        {(isDesktop || activeMobileTab === 'history') && (
          <InteractionsTimeline shopLogsWithItems={shopLogsWithItems} />
        )}
      </ScrollView>
      <UpdateTerritoryModal
        visible={isUpdateTerritoryOpen}
        onClose={() => setIsUpdateTerritoryOpen(false)}
        shop={shop}
        onUpdateSuccess={async () => {
          await loadTerritoryNames();
          await selectShop(shop);
        }}
      />
    </Box>
  );
};
