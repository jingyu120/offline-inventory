import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { SkeletonRow, SkeletonCard } from './Skeleton';
import { theme } from './theme';

describe('Skeleton', () => {
  let loopSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;
  let sequenceSpy: jest.SpyInstance;

  beforeAll(() => {
    loopSpy = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    timingSpy = jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    sequenceSpy = jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
  });

  afterAll(() => {
    loopSpy.mockRestore();
    timingSpy.mockRestore();
    sequenceSpy.mockRestore();
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders SkeletonRow with default props', () => {
    const { toJSON } = renderWithTheme(<SkeletonRow />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders SkeletonRow with custom props', () => {
    const { toJSON } = renderWithTheme(
      <SkeletonRow height={30} width="50%" borderRadius="m" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders SkeletonCard', () => {
    const { toJSON } = renderWithTheme(<SkeletonCard />);
    expect(toJSON()).toBeTruthy();
  });
});
