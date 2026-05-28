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
  baseValuation?: { amount: number; currency: 'USD' | 'THB' };
}

export type ExchangeRateResolver = (
  currency: 'USD' | 'THB',
) => Promise<number | undefined>;

let rateResolver: ExchangeRateResolver | null = null;

export function registerExchangeRateResolver(r: ExchangeRateResolver) {
  rateResolver = r;
}

export function TextField({
  label,
  error,
  name,
  style,
  onFocus,
  onBlur,
  isBelowFloor,
  baseValuation,
  ...rest
}: TextFieldProps) {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);
  const [convertedValue, setConvertedValue] = useState<string | null>(null);

  React.useEffect(() => {
    if (!baseValuation) {
      setConvertedValue(null);
      return;
    }

    let isMounted = true;

    const performConversion = async () => {
      try {
        let rateVal: number | undefined;
        if (rateResolver) {
          rateVal = await rateResolver(baseValuation.currency);
        }

        if (rateVal === undefined) {
          rateVal = baseValuation.currency === 'USD' ? 4200 : 115;
        }

        if (isMounted) {
          const kyatAmt = Math.round(baseValuation.amount * rateVal);
          setConvertedValue(`${kyatAmt.toLocaleString()} MMK`);
        }
      } catch (err) {
        console.warn(
          'Failed to perform currency conversion in TextField:',
          err,
        );
        if (isMounted) {
          const rateVal = baseValuation.currency === 'USD' ? 4200 : 115;
          const kyatAmt = Math.round(baseValuation.amount * rateVal);
          setConvertedValue(`${kyatAmt.toLocaleString()} MMK`);
        }
      }
    };

    performConversion();

    return () => {
      isMounted = false;
    };
  }, [baseValuation?.amount, baseValuation?.currency]);

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

  const finalValue = convertedValue !== null ? convertedValue : rest.value;
  const finalEditable = convertedValue !== null ? false : rest.editable;
  const finalIsNumeric = isNumeric || convertedValue !== null;

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
            fontFamily: finalIsNumeric ? 'monospace' : undefined,
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
        value={finalValue}
        editable={finalEditable}
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
