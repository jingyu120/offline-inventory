# Shared UI Components (`ui-components`)

This library hosts the design system and presentation primitives of the Burma Inventory application. Built on top of Shopify's `@shopify/restyle`, it provides type-safe, theme-driven layout utilities that adapt beautifully to web and native targets.

---

## 🎨 Theme Tokens (`src/theme.ts`)

The design system defines central spacing, color palettes, and typography variant maps:

### 1. Light & Dark Themes

Colors are structured semantically, mapping design states (such as active or critical feedback alerts) directly to variables:

- **`mainBackground`**: Primary canvas color.
- **`cardBackground`**: Elevated card backgrounds.
- **`primaryButton`**: Main action color (deep brand purple: `#5A31F4`).
- **`success` / `successBg` / `successText`**: Emerald colors for positive sentiment/met quotas.
- **`danger` / `dangerBg` / `dangerText`**: Crimson/Red colors for negative sentiment/warnings/neglected accounts.
- **`warning` / `warningBg` / `warningText`**: Yellow colors for warning zones/partial quotas.
- **`infoBg` / `info`**: Sky blue highlights for general status items.

### 2. Spacing Scales

Consistent margin and padding rules:

- `none`: `0`
- `xs`: `4px`
- `s`: `8px`
- `m`: `16px`
- `l`: `24px`
- `xl`: `40px`

### 3. Text Variants

Predefined styles targeting clear visual hierarchy:

- `header`: Large bold headings (`fontSize: 28+`).
- `title`: Section subtitles (`fontSize: 18`, bold).
- `body`: Primary application text (`fontSize: 14`).
- `bodySecondary`: Slate muted subtitles (`fontSize: 12`).
- `badge`: Compact pill typography (`fontSize: 10`, bold uppercase).

---

## 🧩 Visual Primitives

Avoid introducing ad-hoc style sheets. Always build views using these core components:

- **`Box`**: Flexbox layout wrapper (`restyle`'s default `createBox`). Supports direct spacing, color, and border props:
  ```tsx
  <Box flexDirection="row" p="m" bg="cardBackground" borderRadius="m" />
  ```
- **`Text`**: Type-safe responsive typography:
  ```tsx
  <Text variant="title" color="primaryText">
    Account Profile
  </Text>
  ```
- **`Card`**: An elevated layout container matching the app's structural aesthetic (Sortly/Katana).
- **`Button`**: Form and dashboard action button supporting variations (`primary`, `secondary`, `danger`).
- **`TextField`**: Controlled input field with styled borders, hover/focus borders, and error labels.
- **`DropdownSelector`**: Scrollable dropdown menu supporting structured option lists.

---

## 💅 Styling Rules

1. **Use Theme-Driven Props**: Never write absolute string colors like `color="#EF4444"` or magic pixel values like `padding={13}`. Instead, reference theme tokens (`color="danger"` or `padding="m"`).
2. **Handle Viewport Breaks**: Always check screen size using `useWindowDimensions()` to decide dynamic sizing parameters in components.
3. **Typography Constraint**: All UI text must wrap inside a `<Text>` primitive rather than a React Native `<Text>` or HTML `<span>` tag to guarantee correct theme overrides.
