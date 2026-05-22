import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  TextField,
  Theme,
} from '@burma-inventory/ui-components';
import { ShopWithDetails } from '../../data/repositories';
import { Shop } from '@burma-inventory/shared-types';
import { useTheme } from '@shopify/restyle';
import { Clock, MapPin, Zap } from 'lucide-react-native';
import { useTranslation } from '../../utils/i18n';
import { DesignPatternGallery } from './DesignPatternGallery';

interface ShopSidebarListProps {
  shops: ShopWithDetails[];
  selectedShop: Shop | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectShop: (shop: Shop) => void;
  handleSeedData: () => void;
  isDesktop?: boolean;
  onLogInteraction?: (shop: Shop) => void;
}

const getSentimentColor = (trend: string | undefined): string => {
  if (!trend) return '#6366F1';
  const t = trend.toUpperCase();
  if (t === 'POSITIVE' || t === 'UPWARD' || t === 'GROWING') return '#10B981';
  if (t === 'NEGATIVE' || t === 'DOWNWARD' || t === 'SHRINKING')
    return '#EF4444';
  return '#6366F1';
};

export const ShopSidebarList: React.FC<ShopSidebarListProps> = ({
  shops,
  selectedShop,
  searchQuery,
  setSearchQuery,
  selectShop,
  handleSeedData,
  isDesktop = true,
  onLogInteraction,
}) => {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  const formatLastContact = (date: Date | undefined) => {
    if (!date) return t('noInteractions');
    const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return t('activeToday');
    return `${diffDays} ${t('daysAgo')}`;
  };

  const getSentimentBgColor = (trend: string | undefined) => {
    if (!trend) return 'secondaryButton' as const;
    const t = trend.toUpperCase();
    if (t === 'POSITIVE' || t === 'UPWARD' || t === 'GROWING')
      return 'successBg' as const;
    if (t === 'NEGATIVE' || t === 'DOWNWARD' || t === 'SHRINKING')
      return 'dangerBg' as const;
    return 'secondaryButton' as const;
  };

  const getSentimentTextColor = (trend: string | undefined) => {
    if (!trend) return 'secondaryText' as const;
    const t = trend.toUpperCase();
    if (t === 'POSITIVE' || t === 'UPWARD' || t === 'GROWING')
      return 'successText' as const;
    if (t === 'NEGATIVE' || t === 'DOWNWARD' || t === 'SHRINKING')
      return 'dangerText' as const;
    return 'secondaryText' as const;
  };

  return (
    <Box flex={1} bg="mainBackground">
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        px="m"
        pt="m"
        pb="s"
        bg={isDesktop ? 'cardBackground' : 'mainBackground'}
        borderBottomWidth={isDesktop ? 1 : 0}
        borderColor="borderColor"
      >
        <Text variant="header" fontSize={isDesktop ? 22 : 26} fontWeight="bold">
          {t('shops')}
        </Text>
        <Button
          title={t('seedData')}
          onPress={handleSeedData}
          variant="secondary"
        />
      </Box>

      {/* Search Bar */}
      <Box px="m" py="s" bg={isDesktop ? 'cardBackground' : 'mainBackground'}>
        <TextField
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: isDesktop ? 8 : 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {shops.map((s) => {
          const isSelected = selectedShop?.id === s.id;
          const initial = s.name ? s.name.charAt(0).toUpperCase() : '?';
          const avatarColor = getSentimentColor(s.sentimentTrend);

          if (!isDesktop) {
            // ─── Sortly-style Mobile Card ───────────────────────────────────
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => selectShop(s)}
                activeOpacity={0.8}
              >
                <Box
                  mb="m"
                  bg="cardBackground"
                  borderRadius="l"
                  borderWidth={isSelected ? 2 : 1}
                  borderColor={isSelected ? 'primaryButton' : 'borderColor'}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                  }}
                  overflow="hidden"
                >
                  {/* Card Top: Avatar + Name + Sentiment */}
                  <Box flexDirection="row" alignItems="center" p="m" pb="s">
                    {/* Avatar Circle */}
                    <Box
                      width={48}
                      height={48}
                      justifyContent="center"
                      alignItems="center"
                      mr="m"
                      style={{ backgroundColor: avatarColor, borderRadius: 24 }}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 20,
                          fontWeight: 'bold',
                        }}
                      >
                        {initial}
                      </Text>
                    </Box>

                    {/* Shop Info */}
                    <Box flex={1}>
                      <Text
                        variant="title"
                        fontSize={17}
                        fontWeight="bold"
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      <Box flexDirection="row" alignItems="center" mt="xs">
                        <MapPin
                          size={11}
                          stroke={theme.colors.secondaryText}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          variant="bodySecondary"
                          fontSize={12}
                          numberOfLines={1}
                        >
                          {s.regionName || '—'}
                        </Text>
                      </Box>
                    </Box>

                    {/* Sentiment Badge */}
                    <Box
                      bg={getSentimentBgColor(s.sentimentTrend)}
                      px="s"
                      py="xs"
                      borderRadius="m"
                    >
                      <Text
                        variant="badge"
                        color={getSentimentTextColor(s.sentimentTrend)}
                        fontSize={10}
                      >
                        {s.sentimentTrend || 'NEUTRAL'}
                      </Text>
                    </Box>
                  </Box>

                  {/* Card Bottom: Stats Row + Quick Log Button */}
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    px="m"
                    py="s"
                    borderTopWidth={1}
                    borderTopColor="borderColor"
                    bg="secondaryBackground"
                  >
                    <Box flexDirection="row" alignItems="center">
                      <Clock
                        size={12}
                        stroke={theme.colors.secondaryText}
                        style={{ marginRight: 4 }}
                      />
                      <Text variant="bodySecondary" fontSize={12}>
                        {formatLastContact(s.lastInteractionDate)}
                      </Text>
                    </Box>

                    {/* Quick Log Button */}
                    {onLogInteraction && (
                      <TouchableOpacity
                        onPress={(e) => {
                          (e as any).stopPropagation?.();
                          onLogInteraction(s);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#5A31F4',
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 16,
                          gap: 4,
                        }}
                      >
                        <Zap size={12} stroke="#fff" />
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          {t('logInteraction')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Box>
                </Box>
              </TouchableOpacity>
            );
          }

          // ─── Katana-style Desktop List Row ───────────────────────────────
          return (
            <TouchableOpacity key={s.id} onPress={() => selectShop(s)}>
              <Card
                mb="s"
                p="m"
                bg={isSelected ? 'secondaryBackground' : 'cardBackground'}
                borderWidth={isSelected ? 1.5 : 1}
                borderColor={isSelected ? 'primaryButton' : 'borderColor'}
              >
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb="s"
                >
                  <Box flex={1} mr="s">
                    <Text variant="title" fontSize={15}>
                      {s.name}
                    </Text>
                    <Text
                      variant="bodySecondary"
                      numberOfLines={1}
                      fontSize={12}
                    >
                      {s.regionName}
                    </Text>
                  </Box>
                  <Box
                    bg={getSentimentBgColor(s.sentimentTrend)}
                    px="s"
                    py="xs"
                    borderRadius="s"
                  >
                    <Text
                      variant="badge"
                      color={getSentimentTextColor(s.sentimentTrend)}
                      fontSize={10}
                    >
                      {s.sentimentTrend || 'NEUTRAL'}
                    </Text>
                  </Box>
                </Box>

                <Box
                  flexDirection="row"
                  alignItems="center"
                  pt="s"
                  borderTopWidth={1}
                  borderTopColor="borderColor"
                >
                  <Clock
                    size={12}
                    stroke={theme.colors.secondaryText}
                    style={{ marginRight: 6 }}
                  />
                  <Text variant="bodySecondary" fontSize={12}>
                    {formatLastContact(s.lastInteractionDate)}
                  </Text>
                </Box>
              </Card>
            </TouchableOpacity>
          );
        })}
        {shops.length === 0 && (
          <Box p="m" alignItems="center" mt="xl">
            <Text variant="bodySecondary">{t('noShopsFound')}</Text>
          </Box>
        )}
        {!isDesktop && (
          <Box mt="m">
            <DesignPatternGallery />
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};
