import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { Button } from './Button';
import { theme } from './theme';

describe('Button', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders the title correctly', () => {
    const { getByText } = renderWithTheme(<Button title="Click Me" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(<Button title="Submit" onPress={onPressMock} />);
    
    fireEvent.press(getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator and disables press when isLoading is true', () => {
    const onPressMock = jest.fn();
    const { queryByText, getByType } = renderWithTheme(
      <Button title="Loading" isLoading={true} onPress={onPressMock} />
    );
    
    expect(queryByText('Loading')).toBeNull(); 
    expect(getByType('ActivityIndicator')).toBeTruthy();
    
    fireEvent.press(getByType('ActivityIndicator').parent!);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('disables the button when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(<Button title="Disabled" disabled={true} onPress={onPressMock} />);
    
    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});
