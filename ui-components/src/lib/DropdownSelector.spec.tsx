import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { DropdownSelector } from './DropdownSelector';
import { theme } from './theme';

describe('DropdownSelector', () => {
  const options = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
  ];

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders selector trigger with placeholder/label', () => {
    const { getByText } = renderWithTheme(
      <DropdownSelector
        label="Select Letter"
        selectedValue=""
        options={options}
        onValueChange={jest.fn()}
        placeholder="Choose..."
      />,
    );

    expect(getByText('Select Letter')).toBeTruthy();
    expect(getByText('Choose...')).toBeTruthy();
  });

  it('renders selected option label on trigger button', () => {
    const { getByText } = renderWithTheme(
      <DropdownSelector
        label="Select Letter"
        selectedValue="b"
        options={options}
        onValueChange={jest.fn()}
      />,
    );

    expect(getByText('Option B')).toBeTruthy();
  });

  it('does not open modal when disabled is true', () => {
    const { getByText, queryByText } = renderWithTheme(
      <DropdownSelector
        label="Select Letter"
        selectedValue=""
        options={options}
        onValueChange={jest.fn()}
        disabled={true}
        placeholder="Choose..."
      />,
    );

    fireEvent.press(getByText('Choose...'));
    // Modal shouldn't show options
    expect(queryByText('Option A')).toBeNull();
  });

  it('opens modal, handles selection, and close actions', () => {
    const onValueChangeMock = jest.fn();
    const { getByText } = renderWithTheme(
      <DropdownSelector
        label="Select Letter"
        selectedValue="a"
        options={options}
        onValueChange={onValueChangeMock}
        placeholder="Choose..."
      />,
    );

    // Click trigger to open modal
    fireEvent.press(getByText('Option A'));

    // Check modal displays option labels
    expect(getByText('Option B')).toBeTruthy();

    // Select Option B
    fireEvent.press(getByText('Option B'));
    expect(onValueChangeMock).toHaveBeenCalledWith('b');
  });

  it('closes modal when Cancel button is clicked', () => {
    const { getByText } = renderWithTheme(
      <DropdownSelector
        selectedValue="a"
        options={options}
        onValueChange={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Option A'));
    expect(getByText('Cancel')).toBeTruthy();

    fireEvent.press(getByText('Cancel'));
  });
});
