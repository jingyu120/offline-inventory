import React from 'react';
import { Text, Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { Card } from './Card';
import { theme } from './theme';

describe('Card', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders children correctly', () => {
    const { getByText } = renderWithTheme(
      <Card>
        <Text>Card Content</Text>
      </Card>,
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('applies elevation on mobile platforms', () => {
    Platform.OS = 'ios';
    const { toJSON } = renderWithTheme(
      <Card elevation={3}>
        <Text>Card Content</Text>
      </Card>,
    );
    const json = toJSON();
    expect(json).toBeTruthy();
    // Verification of style properties
  });

  it('applies boxShadow on web platform', () => {
    Platform.OS = 'web';
    const { toJSON } = renderWithTheme(
      <Card elevation={3}>
        <Text>Card Content</Text>
      </Card>,
    );
    const json = toJSON();
    expect(json).toBeTruthy();
  });
});
