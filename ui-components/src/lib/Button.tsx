import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { Box, Text } from './Primitives';
import { useTheme } from '@shopify/restyle';
import { Theme } from './theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

interface VariantStyle {
  bg: keyof Theme['colors'];
  textColor: keyof Theme['colors'];
  borderWidth: number;
  borderColor: keyof Theme['colors'];
}

const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: {
    bg: 'primaryButton',
    textColor: 'primaryButtonText',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  secondary: {
    bg: 'secondaryButton',
    textColor: 'secondaryButtonText',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  outline: {
    bg: 'transparent',
    textColor: 'primaryText',
    borderWidth: 1,
    borderColor: 'borderColor',
  },
  danger: {
    bg: 'danger',
    textColor: 'pureWhite',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ghost: {
    bg: 'transparent',
    textColor: 'primaryButton',
    borderWidth: 0,
    borderColor: 'transparent',
  },
};

const SIZE_PADDING_Y: Record<ButtonSize, keyof Theme['spacing']> = {
  small: 'xs',
  medium: 's',
  large: 'm',
};
const SIZE_PADDING_X: Record<ButtonSize, keyof Theme['spacing']> = {
  small: 's',
  medium: 'm',
  large: 'l',
};

const ACTIVE_OPACITY = 0.8;

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled,
  icon,
  iconPosition = 'left',
  ...rest
}: ButtonProps) {
  const theme = useTheme<Theme>();

  const { bg, textColor, borderWidth, borderColor } = VARIANT_STYLES[variant];
  const py = SIZE_PADDING_Y[size];
  const px = SIZE_PADDING_X[size];

  return (
    <TouchableOpacity
      activeOpacity={ACTIVE_OPACITY}
      disabled={disabled || isLoading}
      {...rest}
    >
      <Box
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        borderRadius="m"
        bg={bg}
        borderWidth={borderWidth}
        borderColor={borderColor}
        py={py}
        px={px}
        opacity={disabled || isLoading ? 0.5 : 1}
      >
        {isLoading ? (
          <ActivityIndicator
            testID="button-loading-indicator"
            color={theme.colors[textColor]}
            size="small"
          />
        ) : (
          <Box flexDirection="row" alignItems="center" justifyContent="center">
            {icon && iconPosition === 'left' && <Box mr="xs">{icon}</Box>}
            <Text variant="button" color={textColor}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && <Box ml="xs">{icon}</Box>}
          </Box>
        )}
      </Box>
    </TouchableOpacity>
  );
}
