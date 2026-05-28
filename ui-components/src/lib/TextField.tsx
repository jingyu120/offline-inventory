import React, { useState } from 'react';
import { TextInput, TextInputProps, Platform } from 'react-native';
import { Box, Text } from './Primitives';
import { useTheme } from '@shopify/restyle';
import { Theme } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  name?: string;
  isBelowFloor?: boolean;
}

export function TextField({
  label,
  error,
  name,
  style,
  onFocus,
  onBlur,
  isBelowFloor,
  ...rest
}: TextFieldProps) {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);

  const isNumeric =
    rest.keyboardType === 'numeric' ||
    rest.keyboardType === 'decimal-pad' ||
    rest.keyboardType === 'number-pad' ||
    (name && /price|kyat|factor|rate|cost|qty|quantity/i.test(name)) ||
    (label && /price|kyat|factor|rate|cost|qty|quantity/i.test(label)) ||
    (rest.placeholder &&
      /price|kyat|factor|rate|cost|qty|quantity/i.test(rest.placeholder));

  const resolvedKeyboardType = isNumeric
    ? rest.keyboardType || 'decimal-pad'
    : rest.keyboardType;

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
              : isBelowFloor
                ? theme.colors.danger
                : isFocused
                  ? theme.colors.primaryButton
                  : theme.colors.borderColor,

            color: theme.colors.primaryText,
            outlineWidth: 0, // Avoid default thick outline on web browser focus
            fontFamily: isNumeric ? 'monospace' : undefined,
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
        keyboardType={resolvedKeyboardType}
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
