# Shared UI Components (`ui-components`)

The design system and presentation primitives, built on **`@shopify/restyle`** —
type-safe, theme-driven, and shared across web and native. Import via
`@burma-inventory/ui-components`.

> Rules: [`.agents/rules/`](../.agents/rules). All screens must source layout
> and typography from this package — no ad-hoc `StyleSheet`/`<View>`.

## Exports (`src/lib/`)

- **`theme.ts`** — `theme` (light), `darkTheme`, `getThemeForLanguage`, and the
  token scales below. `layout.minTableWidth` lives here too.
- **`Primitives.tsx`** — `Box`, `Text`, `ThemedTextInput` (`<Theme>`-typed
  `createBox`/`createText`).
- **`shadows.ts`** — `getShadowStyle(level)` + the `shadows` scale (centralized,
  platform-correct elevation; used by `Card`/`Table`).
- **Components** — `Button`, `Card`, `Table`, `TextField`, `DropdownSelector`,
  `Skeleton`.

## Tokens

- **Spacing (8pt):** `none 0` · `xs 4` · `s 8` · `m 16` · `l 24` · `xl 40` (px).
- **Colors:** semantic — `mainBackground`, `cardBackground`, `primaryButton`
  (`#5A31F4`), `success*`, `danger*`, `warning*`, `info*`, `brand*`.
- **Text variants:** `header`, `title`, `subtitle`, `body`, `bodySecondary`,
  `button`, `badge`, `kpi`, `caption`.

## Styling rules

1. **Theme props only** — never absolute colors (`color="#EF4444"`) or magic
   pixels (`padding={13}`); use tokens (`color="danger"`, `padding="m"`).
2. **Centralize repeated style** — shadows via `getShadowStyle`, not inline
   per-component platform branches.
3. **Text in `<Text>`** — never a raw RN `<Text>` or HTML tag, so theme
   variants/overrides apply.
4. **100% test coverage** is enforced here — every component has a co-located
   `*.spec.tsx`; keep them green.
