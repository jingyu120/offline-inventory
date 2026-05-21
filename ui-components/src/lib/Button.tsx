import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { Box, Text } from './Primitives';
import { useTheme } from '@shopify/restyle';
import { Theme } from './theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

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

  let bg: keyof Theme['colors'] = 'primaryButton';
  let textColor: keyof Theme['colors'] = 'primaryButtonText';
  let borderWidth = 0;
  let borderColor: keyof Theme['colors'] = 'transparent';

  switch (variant) {
    case 'primary':
      bg = 'primaryButton';
      textColor = 'primaryButtonText';
      break;
    case 'secondary':
      bg = 'secondaryButton';
      textColor = 'secondaryButtonText';
      break;
    case 'outline':
      bg = 'transparent';
      textColor = 'primaryText';
      borderWidth = 1;
      borderColor = 'borderColor';
      break;
    case 'danger':
      bg = 'danger';
      textColor = 'pureWhite';
      break;
    case 'ghost':
      bg = 'transparent';
      textColor = 'primaryButton';
      break;
  }

  const py = size === 'small' ? 'xs' : size === 'medium' ? 's' : 'm';
  const px = size === 'small' ? 's' : size === 'medium' ? 'm' : 'l';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
