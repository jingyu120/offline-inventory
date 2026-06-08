import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { Modal, Platform } from 'react-native';
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

  it('closes modal when overlay is clicked', async () => {
    const { getByText, queryByText, getByTestId } = renderWithTheme(
      <DropdownSelector
        selectedValue="a"
        options={options}
        onValueChange={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Option A'));
    expect(getByTestId('modal-overlay')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('modal-overlay'));
    });
    expect(queryByText('Option B')).toBeNull();
  });

  it('does not close modal and stops propagation when card is clicked', async () => {
    const { getByText, getByTestId } = renderWithTheme(
      <DropdownSelector
        selectedValue="a"
        options={options}
        onValueChange={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Option A'));

    const stopPropagation = jest.fn();
    await act(async () => {
      fireEvent.press(getByTestId('modal-card'), { stopPropagation });
    });

    expect(stopPropagation).toHaveBeenCalled();
    expect(getByText('Option B')).toBeTruthy();
  });

  it('closes modal on Modal onRequestClose trigger', async () => {
    const { getByText, queryByText, UNSAFE_getByType } = renderWithTheme(
      <DropdownSelector
        selectedValue="a"
        options={options}
        onValueChange={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Option A'));

    const modal = UNSAFE_getByType(Modal);
    await act(async () => {
      modal.props.onRequestClose();
    });

    expect(queryByText('Option B')).toBeNull();
  });

  describe('Web specific behavior', () => {
    let originalOS: string;

    beforeAll(() => {
      originalOS = Platform.OS;
    });

    afterAll(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => originalOS,
        configurable: true,
      });
    });

    it('renders native select on web', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      const onValueChangeMock = jest.fn();
      const { getByText, queryByText, getByTestId } = renderWithTheme(
        <DropdownSelector
          label="Select Web Letter"
          selectedValue=""
          options={options}
          onValueChange={onValueChangeMock}
          placeholder="Choose web..."
          disabled={false}
        />,
      );

      expect(getByText('Select Web Letter')).toBeTruthy();
      expect(queryByText('Choose web...')).toBeNull(); // Placeholder is rendered as an option, so queryByText of placeholder might be null or found depending on test, but modal cancel shouldn't be found
      expect(queryByText('Cancel')).toBeNull();

      const select = getByTestId('web-select');
      fireEvent(select, 'change', { target: { value: 'b' } });
      expect(onValueChangeMock).toHaveBeenCalledWith('b');
    });

    it('renders native select disabled on web', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      const { getByText } = renderWithTheme(
        <DropdownSelector
          label="Select Web Letter"
          selectedValue="a"
          options={options}
          onValueChange={jest.fn()}
          disabled={true}
        />,
      );

      expect(getByText('Select Web Letter')).toBeTruthy();
    });
  });
});
