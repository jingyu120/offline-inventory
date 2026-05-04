import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { Box, Text } from './Primitives';
import { useTheme } from '@shopify/restyle';
import { Theme } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const theme = useTheme<Theme>();
  
  return (
    <Box my="s">
      {label && <Text variant="body" fontWeight="500" mb="s">{label}</Text>}
      <TextInput
        style={[
          {
            backgroundColor: theme.colors.mainBackground,
            borderRadius: theme.borderRadii.m,
            paddingHorizontal: theme.spacing.m,
            paddingVertical: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: error ? theme.colors.errorText : theme.colors.borderColor,
            color: theme.colors.primaryText,
          },
          style
        ]}
        placeholderTextColor={theme.colors.secondaryText}
        {...rest}
      />
      {error && <Text variant="error" mt="s">{error}</Text>}
    </Box>
  );
}
