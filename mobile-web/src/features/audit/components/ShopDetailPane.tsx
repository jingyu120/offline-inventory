import React from 'react';
import { ScrollView, Pressable, Platform } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, Contact, sqliteSchema } from '@burma-inventory/shared-types';
import { LogWithItems, mapItem } from '../../../core/data/repositories';
import { useTranslation } from '../../../core/i18n/i18n';
import { database } from '../../../core/database/database';
import { eq } from 'drizzle-orm';
import { useAuth } from '../../../core/auth/auth';
import {
  MapPin,
  Star,
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react-native';

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
  onLogInteraction,
}) => {
  const theme = useTheme<Theme>();
  const { t, language } = useTranslation();
  const { activeRep } = useAuth();

  const [hasPlannedRoute, setHasPlannedRoute] = React.useState(false);
  const [todayCheckIn, setTodayCheckIn] = React.useState<any>(null);
  const [predictionLog, setPredictionLog] = React.useState<any>(null);
  const [recommendedOrder, setRecommendedOrder] = React.useState<any>(null);
  const [recommendedItem, setRecommendedItem] = React.useState<any>(null);
  const [repScore, setRepScore] = React.useState<any>(null);
  const [pointsLogs, setPointsLogs] = React.useState<any[]>([]);
  const [activeMobileTab, setActiveMobileTab] = React.useState<
    'checkin' | 'history' | 'ai_insights' | 'scorecard'
  >('checkin');

  const mapRepScore = (s: any) => ({
    id: s.id,
    repId: s.rep_id,
    points: s.points,
    streakDays: s.streak_days,
    badges: s.badges,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  });

  const mapPointsLog = (l: any) => ({
    id: l.id,
    repId: l.rep_id,
    pointsAdded: l.points_added,
    reason: l.reason,
    createdAt: l.created_at,
  });

  const mapPredictionLog = (p: any) => ({
    id: p.id,
    shopId: p.shop_id,
    predictedLtv: p.predicted_ltv,
    churnRisk: p.churn_risk,
    stockoutRisk: p.stockout_risk,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  });

  const mapRecommendedOrder = (r: any) => ({
    id: r.id,
    shopId: r.shop_id,
    itemId: r.item_id,
    quantity: r.quantity,
    confidence: r.confidence,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const mapCheckInLog = (cil: any) => ({
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
        (pr: any) => pr.rep_id === activeRep.id && pr.date === todayStr,
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
      const todayCi = cils.find((cil: any) => {
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
      const pred = preds.find((p: any) => p.shop_id === shop.id);
      setPredictionLog(pred ? mapPredictionLog(pred) : null);

      // 4. Recommendations
      const recs = await database
        .select()
        .from(sqliteSchema.recommended_orders);
      const rec = recs.find((r: any) => r.shop_id === shop.id);
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
      const score = scores.find((s: any) => s.rep_id === activeRep.id);
      setRepScore(score ? mapRepScore(score) : null);

      // 6. Points Logs
      const logs = await database.select().from(sqliteSchema.points_logs);
      const filteredLogs = logs
        .filter((l: any) => l.rep_id === activeRep.id)
        .sort((a: any, b: any) => b.created_at - a.created_at);
      setPointsLogs(filteredLogs.slice(0, 5).map(mapPointsLog));
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
          <Button
            title={t('logInteraction')}
            onPress={() => onLogInteraction?.(shop)}
            variant="primary"
          />
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
                    <Text variant="body" fontWeight="bold" numberOfLines={2}>
                      {shop.address || t('noAddress')}
                    </Text>
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
                      K{shop.lifetimeValue?.toLocaleString() || '0.00'}
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
          <RepScorecardCard repScore={repScore} pointsLogs={pointsLogs} />
        )}

        {/* Recent Interactions Timeline (shown on Desktop, or Mobile History Tab) */}
        {(isDesktop || activeMobileTab === 'history') && (
          <InteractionsTimeline shopLogsWithItems={shopLogsWithItems} />
        )}
      </ScrollView>
    </Box>
  );
};
