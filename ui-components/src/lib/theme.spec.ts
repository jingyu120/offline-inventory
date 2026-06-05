import { theme, darkTheme, getThemeForLanguage } from './theme';

describe('theme config', () => {
  it('defines light and dark theme configurations', () => {
    expect(theme).toBeDefined();
    expect(darkTheme).toBeDefined();
    expect(theme.colors.mainBackground).toBe('#F8FAFC');
    expect(darkTheme.colors.mainBackground).toBe('#000000');
  });

  it('handles getThemeForLanguage language mappings', () => {
    // English returns base theme unchanged
    const engTheme = getThemeForLanguage(theme, 'en');
    expect(engTheme).toBe(theme);

    // Burmese returns customized textVariant sizes and lineHeights
    const burTheme = getThemeForLanguage(theme, 'my');
    expect(burTheme).not.toBe(theme);
    expect(burTheme.textVariants.header.fontSize).toBe(24);
    expect(burTheme.textVariants.header.lineHeight).toBe(38);
    expect(burTheme.textVariants.title.fontSize).toBe(18);
    expect(burTheme.textVariants.title.lineHeight).toBe(28);
    expect(burTheme.textVariants.body.fontSize).toBe(14);
    expect(burTheme.textVariants.body.lineHeight).toBe(24);
    expect(burTheme.textVariants.button.fontSize).toBe(14);
    expect(burTheme.textVariants.button.lineHeight).toBe(22);
  });
});
