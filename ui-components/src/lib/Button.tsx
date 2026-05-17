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
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme<Theme>();

  const bg =
    variant === 'primary'
      ? 'primaryButton'
      : variant === 'secondary'
        ? 'secondaryButton'
        : 'transparent';

  const textColor =
    variant === 'primary'
      ? 'primaryButtonText'
      : variant === 'secondary'
        ? 'secondaryButtonText'
        : 'primaryButton';

  const borderWidth = variant === 'outline' ? 1 : 0;
  const borderColor = variant === 'outline' ? 'primaryButton' : 'transparent';

  const py = size === 'small' ? 's' : size === 'medium' ? 'm' : 'l';
  const px = size === 'small' ? 'm' : size === 'medium' ? 'l' : 'xl';

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
          />
        ) : (
          <Text variant="button" color={textColor}>
            {title}
          </Text>
        )}
      </Box>
    </TouchableOpacity>
  );
}
