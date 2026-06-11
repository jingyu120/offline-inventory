import React from 'react';
import { Pressable, Platform } from 'react-native';
import { Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';

interface LedgerKpiCardProps {
  label: string;
  value: string | number;
  caption: string;
  valueColor: keyof Theme['colors'];
  isLast?: boolean;
}

const HOVER_SCALE = 1.01;
const PRESS_SCALE = 0.99;

export const LedgerKpiCard: React.FC<LedgerKpiCardProps> = ({
  label,
  value,
  caption,
  valueColor,
  isLast = false,
}) => {
  const theme = useTheme<Theme>();

  return (
    <Pressable
      style={({
        pressed,
        hovered,
      }: {
        pressed: boolean;
        hovered?: boolean;
      }) => ({
        flex: 1,
        marginRight: isLast ? 0 : theme.spacing.m,
        transform: [
          { scale: hovered ? HOVER_SCALE : pressed ? PRESS_SCALE : 1 },
        ],
        ...(Platform.OS === 'web'
          ? {
              transitionProperty: 'transform',
              transitionDuration: '200ms',
              transitionTimingFunction: 'ease-in-out',
            }
          : {}),
      })}
    >
      <Card flex={1} p="m" borderColor="borderColor" borderWidth={1}>
        <Text
          variant="caption"
          fontWeight="bold"
          style={{
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: theme.colors.secondaryText,
          }}
        >
          {label}
        </Text>
        <Text variant="kpi" mt="xs" style={{ color: theme.colors[valueColor] }}>
          {value}
        </Text>
        <Text variant="caption" mt="xs">
          {caption}
        </Text>
      </Card>
    </Pressable>
  );
};
