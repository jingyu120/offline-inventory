import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { database } from '../../database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq } from 'drizzle-orm';
import { X, Boxes } from 'lucide-react-native';

interface DesignPattern {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  description: string;
  gradient: string[];
}

const DEFAULT_PATTERNS: DesignPattern[] = [
  {
    id: 'shera-wood-classic',
    name: 'Shera Wood Classic',
    brand: 'Shera',
    brandId: 'brand-shera',
    description:
      'Vibrant, durable teak woodgrain texture for natural rustic siding.',
    gradient: ['#F59E0B', '#B45309'],
  },
  {
    id: 'scg-smart-board-modern',
    name: 'SCG Plank Modern',
    brand: 'SCG Smart Board',
    brandId: 'brand-scg',
    description:
      'Sleek, minimalist smooth fiber cement surface for clean siding.',
    gradient: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'knauf-gypsum-standard',
    name: 'Knauf Ceiling Standard',
    brand: 'Knauf',
    brandId: 'brand-knauf',
    description: 'High-performance gypsum panel for ceiling sound dampening.',
    gradient: ['#3B82F6', '#1D4ED8'],
  },
  {
    id: 'karat-ceramic-elegance',
    name: 'Karat Ceramic Elegance',
    brand: 'Karat',
    brandId: 'brand-karat',
    description:
      'Stunning premium glazed ceramic tiles for walls and bathroom interiors.',
    gradient: ['#10B981', '#047857'],
  },
  {
    id: 'gator-heavy-board',
    name: 'Gator Heavy Board',
    brand: 'Gator',
    brandId: 'brand-gator',
    description: 'Ultra-tough impact-resistant fiber cement sheeting.',
    gradient: ['#EC4899', '#BE185D'],
  },
];

export const DesignPatternGallery: React.FC = () => {
  const theme = useTheme<Theme>();
  const [patterns, setPatterns] = useState<DesignPattern[]>([]);
  const [cachedStatus, setCachedStatus] = useState<string>('Checking...');

  // State for active interactive catalog modal
  const [selectedPattern, setSelectedPattern] = useState<DesignPattern | null>(
    null,
  );
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [brandItems, setBrandItems] = useState<any[]>([]);

  useEffect(() => {
    // Implement local storage cache backup
    try {
      const cached = localStorage.getItem('cached_design_tile_patterns');
      if (cached) {
        setPatterns(JSON.parse(cached));
        setCachedStatus('🟢 Loaded from Local Cache (Offline Ready)');
      } else {
        localStorage.setItem(
          'cached_design_tile_patterns',
          JSON.stringify(DEFAULT_PATTERNS),
        );
        setPatterns(DEFAULT_PATTERNS);
        setCachedStatus('💾 Saved to Local Cache (Offline Ready)');
      }
    } catch (e) {
      console.warn(
        'LocalStorage not available, falling back to memory storage',
        e,
      );
      setPatterns(DEFAULT_PATTERNS);
      setCachedStatus('⚠️ Cache Unavailable (Memory fallback)');
    }
  }, []);

  const handleOpenPattern = async (pattern: DesignPattern) => {
    setSelectedPattern(pattern);
    setLoadingItems(true);
    setBrandItems([]);
    try {
      // Query items under this brand from local SQLite database
      const allItems = await database
        .select()
        .from(sqliteSchema.items)
        .where(eq(sqliteSchema.items.brand_id, pattern.brandId));

      // Query stock counts from local SQLite database
      const allStocks = await database.select().from(sqliteSchema.item_stocks);
      const stocksMap: Record<string, number> = {};
      allStocks.forEach((s: any) => {
        stocksMap[s.item_id] = s.quantity;
      });

      const mapped = allItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        unitPrice: item.unit_price,
        category: item.category,
        thickness: item.thickness,
        weight: item.weight,
        unitType: item.unit_type,
        stock: stocksMap[item.id] || 0,
      }));

      setBrandItems(mapped);
    } catch (e) {
      console.error('Failed to load brand items inside gallery:', e);
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <Card p="m" bg="cardBackground" mb="m">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="s"
      >
        <Text variant="title">🎨 Visual Tile Design Gallery</Text>
        <Box bg="successBg" px="s" py="xs" borderRadius="s">
          <Text
            variant="bodySecondary"
            fontSize={11}
            fontWeight="bold"
            style={{ color: '#10B981' }}
          >
            {cachedStatus}
          </Text>
        </Box>
      </Box>
      <Text variant="bodySecondary" mb="m">
        Showcase catalog options offline directly to dealers. Tap any card below
        to view specs.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexDirection: 'row' }}
      >
        {patterns.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleOpenPattern(item)}
            activeOpacity={0.8}
            style={{ marginRight: 16 }}
          >
            <Box
              width={240}
              borderWidth={1}
              borderColor="borderColor"
              borderRadius="l"
              overflow="hidden"
              bg="cardBackground"
            >
              {/* Visual pattern preview generated dynamically with premium gradient colors */}
              <Box
                height={120}
                style={{
                  backgroundColor: item.gradient[0],
                  // @ts-expect-error: linear-gradient is web-only backgroundImage property
                  backgroundImage: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 18,
                    fontWeight: 'bold',
                    letterSpacing: 1.5,
                  }}
                >
                  {item.brand.toUpperCase()}
                </Text>
              </Box>
              <Box p="m">
                <Text variant="body" fontWeight="bold" mb="xs">
                  {item.name}
                </Text>
                <Text
                  variant="bodySecondary"
                  fontSize={12}
                  style={{ lineHeight: 18 }}
                >
                  {item.description}
                </Text>
              </Box>
            </Box>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedPattern && (
        <Modal
          visible={!!selectedPattern}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPattern(null)}
        >
          <Box
            flex={1}
            justifyContent="center"
            alignItems="center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          >
            <Box
              width={Platform.OS === 'web' ? 550 : 340}
              bg="mainBackground"
              borderRadius="l"
              borderWidth={1}
              borderColor="borderColor"
              overflow="hidden"
            >
              {/* Banner Top Header */}
              <Box
                height={80}
                style={{
                  backgroundColor: selectedPattern.gradient[0],
                  // @ts-expect-error: linear-gradient is web-only
                  backgroundImage: `linear-gradient(135deg, ${selectedPattern.gradient[0]}, ${selectedPattern.gradient[1]})`,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                }}
              >
                <Box>
                  <Text
                    style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}
                  >
                    {selectedPattern.brand} Specs & Stock
                  </Text>
                  <Text
                    style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 11 }}
                  >
                    {selectedPattern.name}
                  </Text>
                </Box>
                <TouchableOpacity
                  onPress={() => setSelectedPattern(null)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    padding: 6,
                    borderRadius: 20,
                  }}
                >
                  <X size={16} stroke="#FFF" />
                </TouchableOpacity>
              </Box>

              <Box p="m">
                {loadingItems ? (
                  <Box py="xl" alignItems="center" justifyContent="center">
                    <ActivityIndicator
                      size="small"
                      color={selectedPattern.gradient[0]}
                    />
                    <Text variant="bodySecondary" mt="s">
                      Querying catalog items...
                    </Text>
                  </Box>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {brandItems.length === 0 ? (
                      <Box py="l" alignItems="center">
                        <Text variant="bodySecondary">
                          No items found for this brand in database.
                        </Text>
                      </Box>
                    ) : (
                      brandItems.map((item) => {
                        const hasSpec = item.thickness || item.weight;
                        const stockColor =
                          item.stock > 50
                            ? '#10B981'
                            : item.stock > 0
                              ? '#F59E0B'
                              : '#EF4444';

                        return (
                          <Box
                            key={item.id}
                            mb="s"
                            p="s"
                            borderRadius="m"
                            borderWidth={1}
                            borderColor="borderColor"
                            bg="secondaryBackground"
                          >
                            <Box
                              flexDirection="row"
                              justifyContent="space-between"
                              mb="xs"
                            >
                              <Text
                                variant="body"
                                fontWeight="bold"
                                style={{ flex: 1 }}
                              >
                                {item.name}
                              </Text>
                              <Text
                                variant="body"
                                fontWeight="bold"
                                color="primaryButton"
                              >
                                {Math.round(item.unitPrice).toLocaleString()}{' '}
                                MMK
                              </Text>
                            </Box>

                            <Box
                              flexDirection="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text variant="bodySecondary" fontSize={11}>
                                SKU: {item.sku} | {item.category}
                              </Text>
                              <Box flexDirection="row" alignItems="center">
                                <Boxes
                                  size={12}
                                  stroke={stockColor}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  variant="body"
                                  fontSize={12}
                                  fontWeight="bold"
                                  style={{ color: stockColor }}
                                >
                                  {item.stock > 0
                                    ? `Stock: ${item.stock} ${item.unitType}`
                                    : 'Out of Stock'}
                                </Text>
                              </Box>
                            </Box>

                            {hasSpec && (
                              <Box
                                mt="xs"
                                pt="xs"
                                borderTopWidth={1}
                                borderTopColor="borderColor"
                                flexDirection="row"
                              >
                                {item.thickness && (
                                  <Text
                                    variant="bodySecondary"
                                    fontSize={10}
                                    style={{ marginRight: 8 }}
                                  >
                                    📐 Thickness: {item.thickness}
                                  </Text>
                                )}
                                {item.weight && (
                                  <Text variant="bodySecondary" fontSize={10}>
                                    ⚖️ Weight: {item.weight}
                                  </Text>
                                )}
                              </Box>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </ScrollView>
                )}

                <Box
                  mt="m"
                  borderTopWidth={1}
                  borderTopColor="borderColor"
                  pt="m"
                >
                  <TouchableOpacity
                    onPress={() => setSelectedPattern(null)}
                    style={{
                      backgroundColor: '#5A31F4',
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      Close Catalog
                    </Text>
                  </TouchableOpacity>
                </Box>
              </Box>
            </Box>
          </Box>
        </Modal>
      )}
    </Card>
  );
};

export default DesignPatternGallery;
