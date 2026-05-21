import React, { useState } from 'react';
import { TextInput, TextInputProps, Platform } from 'react-native';
import { Box, Text } from './Primitives';
import { useTheme } from '@shopify/restyle';
import { Theme } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box my="s">
      {label && (
        <Text
          variant="bodySecondary"
          fontWeight="600"
          mb="xs"
          color="primaryText"
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: theme.borderRadii.m,
            paddingHorizontal: theme.spacing.m,
            paddingVertical: 10,
            fontSize: 15,
            borderWidth: 1,
            borderColor: error
              ? theme.colors.errorText
              : isFocused
                ? theme.colors.primaryButton
                : theme.colors.borderColor,
            color: theme.colors.primaryText,
            outlineWidth: 0, // Avoid default thick outline on web browser focus
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: isFocused
                    ? `0px 1px 2px ${theme.colors.primaryButton}1A`
                    : 'none',
                }
              : {
                  shadowColor: isFocused
                    ? theme.colors.primaryButton
                    : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isFocused ? 0.1 : 0,
                  shadowRadius: 2,
                }),
          } as any,
          style,
        ]}
        placeholderTextColor={theme.colors.secondaryText}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error && (
        <Text variant="error" mt="xs">
          {error}
        </Text>
      )}
    </Box>
  );
}
