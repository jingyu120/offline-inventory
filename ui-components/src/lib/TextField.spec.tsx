import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { Platform, TextInput } from 'react-native';
import { TextField, registerExchangeRateResolver } from './TextField';
import { theme } from './theme';

describe('TextField', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders label and placeholder correctly', () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(
      <TextField label="Username" placeholder="Enter username" />,
    );
    expect(getByText('Username')).toBeTruthy();
    expect(getByPlaceholderText('Enter username')).toBeTruthy();
  });

  it('renders error message correctly', () => {
    const { getByText } = renderWithTheme(
      <TextField label="Username" error="Required field" />,
    );
    expect(getByText('Required field')).toBeTruthy();
  });

  it('handles focus and blur events', () => {
    const onFocusMock = jest.fn();
    const onBlurMock = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <TextField
        placeholder="Focus test"
        onFocus={onFocusMock}
        onBlur={onBlurMock}
      />,
    );

    const input = getByPlaceholderText('Focus test');
    fireEvent(input, 'focus');
    expect(onFocusMock).toHaveBeenCalled();

    fireEvent(input, 'blur');
    expect(onBlurMock).toHaveBeenCalled();
  });

  it('resolves keyboardType as numeric when name or label implies a number', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <TextField placeholder="Enter quantity" />,
    );
    const input = getByPlaceholderText('Enter quantity');
    expect(input.props.keyboardType).toBe('decimal-pad');
  });

  it('performs async currency conversion with registered resolver', async () => {
    const mockResolver = jest.fn().mockResolvedValue(4000);
    registerExchangeRateResolver(mockResolver);

    const { findByDisplayValue } = renderWithTheme(
      <TextField
        label="Price"
        baseValuation={{ amount: 10, currency: 'USD' }}
      />,
    );

    const input = await findByDisplayValue('40,000 MMK');
    expect(input).toBeTruthy();
    expect(input.props.editable).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith('USD');
  });

  it('falls back to default rates when resolver returns undefined', async () => {
    registerExchangeRateResolver(jest.fn().mockResolvedValue(undefined));

    const { findByDisplayValue } = renderWithTheme(
      <TextField
        label="Price"
        baseValuation={{ amount: 2, currency: 'USD' }}
      />,
    );

    // 2 * 4200 = 8400
    const input = await findByDisplayValue('8,400 MMK');
    expect(input).toBeTruthy();
  });

  it('falls back to default rates when resolver throws an error', async () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    registerExchangeRateResolver(
      jest.fn().mockRejectedValue(new Error('API Down')),
    );

    const { findByDisplayValue } = renderWithTheme(
      <TextField
        label="Price"
        baseValuation={{ amount: 2, currency: 'USD' }}
      />,
    );

    const input = await findByDisplayValue('8,400 MMK');
    expect(input).toBeTruthy();
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('applies styles when isBelowFloor is true', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <TextField placeholder="Test" isBelowFloor={true} />,
    );
    const input = getByPlaceholderText('Test');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({ borderColor: theme.colors.danger }),
    );
  });

  it('applies web shadow styles under focused and unfocused states', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      configurable: true,
    });

    const { getByPlaceholderText } = renderWithTheme(
      <TextField placeholder="Test" />,
    );
    const input = getByPlaceholderText('Test');

    // Focus state on web
    fireEvent(input, 'focus');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({
        boxShadow: `0px 1px 2px ${theme.colors.primaryButton}1A`,
      }),
    );

    // Blur state on web
    fireEvent(input, 'blur');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({ boxShadow: 'none' }),
    );

    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
  });

  it('applies native shadow styles under focused and unfocused states', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      configurable: true,
    });

    const { getByPlaceholderText } = renderWithTheme(
      <TextField placeholder="Test" />,
    );
    const input = getByPlaceholderText('Test');

    // Focus state on native
    fireEvent(input, 'focus');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({ shadowOpacity: 0.1 }),
    );

    // Blur state on native
    fireEvent(input, 'blur');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({ shadowOpacity: 0 }),
    );

    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
  });

  it('converts THB using fallback default rates when resolver is undefined/returns undefined', async () => {
    registerExchangeRateResolver(jest.fn().mockResolvedValue(undefined));

    const { findByDisplayValue } = renderWithTheme(
      <TextField
        label="Price"
        baseValuation={{ amount: 200, currency: 'THB' }}
      />,
    );

    // 200 * 115 = 23000
    const input = await findByDisplayValue('23,000 MMK');
    expect(input).toBeTruthy();
  });

  it('converts THB using fallback default rates when resolver throws an error', async () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    registerExchangeRateResolver(
      jest.fn().mockRejectedValue(new Error('API Down')),
    );

    const { findByDisplayValue } = renderWithTheme(
      <TextField
        label="Price"
        baseValuation={{ amount: 200, currency: 'THB' }}
      />,
    );

    // 200 * 115 = 23000
    const input = await findByDisplayValue('23,000 MMK');
    expect(input).toBeTruthy();
    consoleWarnSpy.mockRestore();
  });

  it('does not set convertedValue when baseValuation is not provided', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <TextField placeholder="Test text input" value="hello" />,
    );
    const input = getByPlaceholderText('Test text input');
    expect(input.props.value).toBe('hello');
    expect(input.props.editable).not.toBe(false);
  });

  it('covers numeric detection by name property', () => {
    const { getByTestId } = renderWithTheme(
      <TextField name="total_cost" value="50" testID="numeric-input" />,
    );
    const input = getByTestId('numeric-input');
    expect(input.props.keyboardType).toBe('decimal-pad');
  });

  it('covers fallback resolved name to text-input when all identifiers are missing', () => {
    const { UNSAFE_getByType } = renderWithTheme(
      <TextField value="no-names" />,
    );
    const input = UNSAFE_getByType(TextInput);
    expect(input.props.id).toBe('text-input');
  });
});
