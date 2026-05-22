import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Platform } from 'react-native';
import { Box, Text, Card } from '@burma-inventory/ui-components';

interface DesignPattern {
  id: string;
  name: string;
  brand: string;
  description: string;
  gradient: string[];
}

const DEFAULT_PATTERNS: DesignPattern[] = [
  {
    id: 'shera-wood-classic',
    name: 'Shera Wood Classic',
    brand: 'Shera',
    description:
      'Vibrant, durable teak woodgrain texture for natural rustic siding.',
    gradient: ['#F59E0B', '#B45309'],
  },
  {
    id: 'scg-smart-board-modern',
    name: 'SCG Plank Modern',
    brand: 'SCG Smart Board',
    description:
      'Sleek, minimalist smooth fiber cement surface for clean siding.',
    gradient: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'knauf-gypsum-standard',
    name: 'Knauf Ceiling Standard',
    brand: 'Knauf',
    description: 'High-performance gypsum panel for ceiling sound dampening.',
    gradient: ['#3B82F6', '#1D4ED8'],
  },
  {
    id: 'karat-ceramic-elegance',
    name: 'Karat Ceramic Elegance',
    brand: 'Karat',
    description:
      'Stunning premium glazed ceramic tiles for walls and bathroom interiors.',
    gradient: ['#10B981', '#047857'],
  },
  {
    id: 'gator-heavy-board',
    name: 'Gator Heavy Board',
    brand: 'Gator',
    description: 'Ultra-tough impact-resistant fiber cement sheeting.',
    gradient: ['#EC4899', '#BE185D'],
  },
];

export const DesignPatternGallery: React.FC = () => {
  const [patterns, setPatterns] = useState<DesignPattern[]>([]);
  const [cachedStatus, setCachedStatus] = useState<string>('Checking...');

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
        Showcase catalog options offline directly to dealers.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexDirection: 'row' }}
      >
        {patterns.map((item) => (
          <Box
            key={item.id}
            mr="m"
            p="none"
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
        ))}
      </ScrollView>
    </Card>
  );
};

export default DesignPatternGallery;
