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
    const { getByText } = renderWithTheme(
      <Button title="Submit" onPress={onPressMock} />,
    );

    fireEvent.press(getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator and disables press when isLoading is true', () => {
    const onPressMock = jest.fn();
    const { queryByText, getByTestId } = renderWithTheme(
      <Button title="Loading" isLoading={true} onPress={onPressMock} />,
    );

    expect(queryByText('Loading')).toBeNull();
    expect(getByTestId('button-loading-indicator')).toBeTruthy();

    const indicator = getByTestId('button-loading-indicator');
    if (indicator.parent) {
      fireEvent.press(indicator.parent);
    }
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('disables the button when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(
      <Button title="Disabled" disabled={true} onPress={onPressMock} />,
    );

    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders all styling variants correctly', () => {
    const { getByText: getByTextSec } = renderWithTheme(
      <Button title="Sec" variant="secondary" />,
    );
    expect(getByTextSec('Sec')).toBeTruthy();

    const { getByText: getByTextOut } = renderWithTheme(
      <Button title="Out" variant="outline" />,
    );
    expect(getByTextOut('Out')).toBeTruthy();

    const { getByText: getByTextDang } = renderWithTheme(
      <Button title="Dang" variant="danger" />,
    );
    expect(getByTextDang('Dang')).toBeTruthy();

    const { getByText: getByTextGhost } = renderWithTheme(
      <Button title="Ghost" variant="ghost" />,
    );
    expect(getByTextGhost('Ghost')).toBeTruthy();
  });

  it('renders small and large sizes correctly', () => {
    const { getByText: getByTextSmall } = renderWithTheme(
      <Button title="Small" size="small" />,
    );
    expect(getByTextSmall('Small')).toBeTruthy();

    const { getByText: getByTextLarge } = renderWithTheme(
      <Button title="Large" size="large" />,
    );
    expect(getByTextLarge('Large')).toBeTruthy();
  });

  it('renders icons on both left and right sides', () => {
    const DummyIcon = () => <React.Fragment />;

    const { getByText: getByTextLeft } = renderWithTheme(
      <Button title="Left Icon" icon={<DummyIcon />} iconPosition="left" />,
    );
    expect(getByTextLeft('Left Icon')).toBeTruthy();

    const { getByText: getByTextRight } = renderWithTheme(
      <Button title="Right Icon" icon={<DummyIcon />} iconPosition="right" />,
    );
    expect(getByTextRight('Right Icon')).toBeTruthy();
  });
});
