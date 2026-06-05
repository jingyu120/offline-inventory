import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
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
});
