import React from 'react';
import { TouchableOpacity, Modal } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Shop, sqliteSchema } from '@burma-inventory/shared-types';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useToast } from './ToastProvider';
import { API_BASE_URL } from '../../config';
import { database } from '../../database';
import { eq } from 'drizzle-orm';

interface PredictionAnalyticsCardProps {
  shop: Shop;
  predictionLog: any;
  recommendedOrder: any;
  recommendedItem: any;
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

  const [sentimentTrend, setSentimentTrend] = React.useState<
    'IMPROVING' | 'STABLE' | 'DECLINING' | null
  >(null);
  const [sentimentExplanation, setSentimentExplanation] =
    React.useState<string>('');
  const [loadingSentiment, setLoadingSentiment] = React.useState(false);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [projectsList, setProjectsList] = React.useState<any[]>([]);

  const loadProjects = React.useCallback(async () => {
    try {
      const allProjects = await database.select().from(sqliteSchema.projects);
      const filtered = allProjects.filter(
        (p: any) => p.name === 'Galaxy Tower-3' || p.name === 'Zaw Residence',
      );
      setProjectsList(filtered);
    } catch (e) {
      console.error('Failed to load projects in PredictionAnalyticsCard:', e);
    }
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  React.useEffect(() => {
    const fetchSentimentAnalysis = async () => {
      if (!historicalNotes || historicalNotes.length === 0) {
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
          body: JSON.stringify({ notes: historicalNotes }),
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
  }, [historicalNotes]);

  if (!predictionLog) return null;

  return (
    <Box>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
          <Text variant="title" mb="m" style={{ color: '#5A31F4' }}>
            🔮 Gemma 4 Predictive Analytics
          </Text>
          <Box flexDirection="row" mb="m">
            <Box flex={1} mr="s">
              <Text variant="bodySecondary" mb="xs">
                Customer Churn Risk
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
                Stockout Risk
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
                  Gemma AI Smart-Reorder Alert
                </Text>
              </Box>
              <Text variant="bodySecondary" mb="s">
                System recommends ordering{' '}
                <Text
                  fontWeight="bold"
                  style={{ color: theme.colors.primaryText }}
                >
                  {recommendedOrder.quantity} units
                </Text>{' '}
                of{' '}
                <Text
                  fontWeight="bold"
                  style={{ color: theme.colors.primaryText }}
                >
                  {recommendedItem.name}
                </Text>{' '}
                (SKU: {recommendedItem.sku}) based on predicted inventory
                runout.
              </Text>
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text variant="bodySecondary" fontSize={11}>
                  Confidence: {(recommendedOrder.confidence * 100).toFixed(0)}%
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onLogInteraction?.(shop);
                    showToast(
                      `Pre-filled interaction for SKU ${recommendedItem.sku}`,
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
                    Pre-fill Order
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
                    ? 'High Churn Risk Trend'
                    : sentimentTrend === 'IMPROVING'
                      ? 'Low Churn Risk Trend'
                      : 'Stable / Neutral Trend'}
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
            <Text
              variant="header"
              fontSize={18}
              mb="m"
              style={{ color: '#5A31F4' }}
            >
              💼 Pipeline Capital Lockup
            </Text>
            <Text variant="bodySecondary" mb="m">
              Active projects pending fulfillment:
            </Text>

            {projectsList.map((proj) => {
              const capital =
                proj.name === 'Galaxy Tower-3' ? 'K150,000,000' : 'K85,000,000';
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
                      ⏳ PENDING_FULFILLMENT
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
