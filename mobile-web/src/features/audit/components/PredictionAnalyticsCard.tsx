import React from 'react';
import { TouchableOpacity, Modal } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, sqliteSchema } from '@burma-inventory/shared-types';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useToast } from '../../../core/components/ToastProvider';
import { useTranslation } from '../../../core/i18n/i18n';
import { API_BASE_URL, MOCK_PROJECT_CAPITALS } from '../../../config/appConfig';
import { database } from '../../../core/database/database';
import { useCartStore } from '../../../core/store/cartStore';

interface PredictionAnalyticsCardProps {
  shop: Shop;
  predictionLog: $Any;
  recommendedOrder: $Any;
  recommendedItem: $Any;
  onLogInteraction?: (shop: Shop) => void;
  historicalNotes?: string[];
}

export const PredictionAnalyticsCard: React.FC<
  PredictionAnalyticsCardProps
> = ({
  shop,
  predictionLog,
  recommendedOrder,
  recommendedItem,
  onLogInteraction,
  historicalNotes = [],
}) => {
  const theme = useTheme<Theme>();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [sentimentTrend, setSentimentTrend] = React.useState<
    'IMPROVING' | 'STABLE' | 'DECLINING' | null
  >(null);
  const [sentimentExplanation, setSentimentExplanation] =
    React.useState<string>('');
  const [loadingSentiment, setLoadingSentiment] = React.useState(false);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [projectsList, setProjectsList] = React.useState<$Any[]>([]);

  const loadProjects = React.useCallback(async () => {
    try {
      const allProjects = await database.select().from(sqliteSchema.projects);
      const targetNames = MOCK_PROJECT_CAPITALS.map((pc) => pc.projectName);
      const filtered = allProjects.filter((p: $Any) =>
        targetNames.includes(p.name),
      );
      setProjectsList(filtered);
    } catch (e) {
      console.error('Failed to load projects in PredictionAnalyticsCard:', e);
    }
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const notesString = JSON.stringify(historicalNotes || []);

  React.useEffect(() => {
    const fetchSentimentAnalysis = async () => {
      const parsedNotes = JSON.parse(notesString);
      if (parsedNotes.length === 0) {
        setSentimentTrend('STABLE');
        setSentimentExplanation(
          'No historical interaction logs available to analyze.',
        );
        return;
      }
      setLoadingSentiment(true);
      try {
        const response = await fetch(`${API_BASE_URL}/ai/analyze-sentiment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: parsedNotes }),
        });
        if (response.ok) {
          const data = await response.json();
          setSentimentTrend(data.sentimentTrend);
          setSentimentExplanation(data.explanation);
        }
      } catch (err) {
        console.error('Failed to fetch sentiment analysis:', err);
      } finally {
        setLoadingSentiment(false);
      }
    };
    fetchSentimentAnalysis();
  }, [notesString]);

  if (!predictionLog) return null;

  return (
    <Box>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Text variant="title" mb="m" color="brand">
            🔮 {t('gemmaPredictiveAnalytics')}
          </Text>
          <Box flexDirection="row" mb="m">
            <Box flex={1} mr="s">
              <Text variant="bodySecondary" mb="xs">
                {t('customerChurnRisk')}
              </Text>
              <Box flexDirection="row" alignItems="center">
                <Box
                  flex={1}
                  bg="secondaryBackground"
                  height={8}
                  borderRadius="s"
                  mr="s"
                  overflow="hidden"
                >
                  <Box
                    height={8}
                    borderRadius="s"
                    style={{
                      width: `${predictionLog.churnRisk * 100}%`,
                      backgroundColor:
                        predictionLog.churnRisk > 0.6
                          ? '#EF4444'
                          : predictionLog.churnRisk > 0.3
                            ? '#F59E0B'
                            : '#10B981',
                    }}
                  />
                </Box>
                <Text variant="body" fontWeight="bold">
                  {(predictionLog.churnRisk * 100).toFixed(0)}%
                </Text>
              </Box>
            </Box>

            <Box flex={1} ml="s">
              <Text variant="bodySecondary" mb="xs">
                {t('stockoutRisk')}
              </Text>
              <Box flexDirection="row" alignItems="center">
                <Box
                  flex={1}
                  bg="secondaryBackground"
                  height={8}
                  borderRadius="s"
                  mr="s"
                  overflow="hidden"
                >
                  <Box
                    height={8}
                    borderRadius="s"
                    style={{
                      width: `${predictionLog.stockoutRisk * 100}%`,
                      backgroundColor:
                        predictionLog.stockoutRisk > 0.6
                          ? '#EF4444'
                          : predictionLog.stockoutRisk > 0.3
                            ? '#F59E0B'
                            : '#10B981',
                    }}
                  />
                </Box>
                <Text variant="body" fontWeight="bold">
                  {(predictionLog.stockoutRisk * 100).toFixed(0)}%
                </Text>
              </Box>
            </Box>
          </Box>

          {recommendedOrder && recommendedItem && (
            <Box
              bg="secondaryBackground"
              p="m"
              borderRadius="m"
              borderColor="borderColor"
              borderWidth={1}
            >
              <Box flexDirection="row" alignItems="center" mb="xs">
                <Zap size={16} stroke="#5A31F4" style={{ marginRight: 6 }} />
                <Text variant="body" fontWeight="bold">
                  {t('gemmaSmartReorderAlert')}
                </Text>
              </Box>
              <Text variant="bodySecondary" mb="s">
                {t('recommendsOrderingUnits')
                  .replace('{qty}', recommendedOrder.quantity.toString())
                  .replace('{name}', recommendedItem.name)
                  .replace('{sku}', recommendedItem.sku)}
              </Text>
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text variant="bodySecondary" fontSize={11}>
                  {t('confidencePercent').replace(
                    '{pct}',
                    (recommendedOrder.confidence * 100).toFixed(0),
                  )}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    useCartStore.getState().updateSession(shop.id, {
                      preFillSku: recommendedItem.sku,
                      preFillQty: recommendedOrder.quantity,
                    });
                    onLogInteraction?.(shop);
                    showToast(
                      t('preFilledInteractionToast').replace(
                        '{sku}',
                        recommendedItem.sku,
                      ),
                      'success',
                    );
                  }}
                  style={{
                    backgroundColor: '#5A31F4',
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: 11,
                    }}
                  >
                    {t('preFillOrder')}
                  </Text>
                </TouchableOpacity>
              </Box>
            </Box>
          )}

          {!loadingSentiment && sentimentTrend && (
            <Box
              mt="m"
              p="m"
              borderRadius="m"
              bg={
                sentimentTrend === 'DECLINING'
                  ? 'dangerBg'
                  : sentimentTrend === 'IMPROVING'
                    ? 'successBg'
                    : 'warningBg'
              }
              borderColor={
                sentimentTrend === 'DECLINING'
                  ? 'dangerText'
                  : sentimentTrend === 'IMPROVING'
                    ? 'successText'
                    : 'warningText'
              }
              borderWidth={1}
            >
              <Box flexDirection="row" alignItems="center" mb="xs">
                {sentimentTrend === 'DECLINING' ? (
                  <TrendingDown
                    size={18}
                    stroke={theme.colors.dangerText}
                    style={{ marginRight: 8 }}
                  />
                ) : sentimentTrend === 'IMPROVING' ? (
                  <TrendingUp
                    size={18}
                    stroke={theme.colors.successText}
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <Zap
                    size={18}
                    stroke={theme.colors.warningText}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  variant="body"
                  fontWeight="bold"
                  style={{
                    color:
                      sentimentTrend === 'DECLINING'
                        ? theme.colors.dangerText
                        : sentimentTrend === 'IMPROVING'
                          ? theme.colors.successText
                          : theme.colors.warningText,
                  }}
                >
                  {sentimentTrend === 'DECLINING'
                    ? t('highChurnRiskTrend')
                    : sentimentTrend === 'IMPROVING'
                      ? t('lowChurnRiskTrend')
                      : t('stableNeutralTrend')}
                </Text>
              </Box>
              <Text
                variant="bodySecondary"
                style={{
                  color:
                    sentimentTrend === 'DECLINING'
                      ? theme.colors.dangerText
                      : sentimentTrend === 'IMPROVING'
                        ? theme.colors.successText
                        : theme.colors.warningText,
                }}
              >
                {sentimentExplanation}
              </Text>
            </Box>
          )}
        </Card>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box
          flex={1}
          justifyContent="center"
          alignItems="center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <Box
            width={340}
            bg="mainBackground"
            p="m"
            borderRadius="l"
            borderWidth={1}
            borderColor="borderColor"
          >
            <Text variant="header" fontSize={18} mb="m" color="brand">
              💼 {t('pipelineCapitalLockup')}
            </Text>
            <Text variant="bodySecondary" mb="m">
              {t('activeProjectsPendingFulfillment')}
            </Text>

            {projectsList.map((proj) => {
              const projConfig = MOCK_PROJECT_CAPITALS.find(
                (pc) => pc.projectName === proj.name,
              );
              const capital = projConfig ? projConfig.capitalValue : 'K0';
              return (
                <Card
                  key={proj.id}
                  p="s"
                  mb="s"
                  bg="secondaryBackground"
                  borderColor="borderColor"
                  borderWidth={1}
                >
                  <Text variant="body" fontWeight="bold">
                    {proj.name}
                  </Text>
                  <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    mt="xs"
                  >
                    <Text
                      variant="bodySecondary"
                      fontSize={12}
                      style={{ color: theme.colors.warningText }}
                    >
                      ⏳ {t('pendingFulfillment')}
                    </Text>
                    <Text
                      variant="body"
                      fontSize={12}
                      fontWeight="bold"
                      style={{ color: theme.colors.primaryButton }}
                    >
                      {capital}
                    </Text>
                  </Box>
                </Card>
              );
            })}

            <Box mt="m">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: '#5A31F4',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {t('close')}
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
