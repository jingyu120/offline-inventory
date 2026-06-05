import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import jsoncParser from 'jsonc-eslint-parser';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/.expo',
      '**/tmp',
      '**/public',
      '**/*.d.ts',
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  // Global Nx plugin configuration
  ...nx.configs['flat/base'],

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    extends: [
      ...nx.configs['flat/typescript'],
      ...tseslint.configs.recommended,
    ],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:mobile',
              onlyDependOnLibsWithTags: [
                'scope:shared-types',
                'scope:ui-components',
              ],
            },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: ['scope:shared-types'],
            },
            {
              sourceTag: 'scope:shared-types',
              onlyDependOnLibsWithTags: ['scope:shared-types'],
            },
            {
              sourceTag: 'scope:ui-components',
              onlyDependOnLibsWithTags: [
                'scope:shared-types',
                'scope:ui-components',
              ],
            },
          ],
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      eqeqeq: ['error', 'always'],
      'no-duplicate-imports': 'error',
    },
  },
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test-setup.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['**/*.js', '**/*.jsx', '**/*.config.js', '**/*.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // JSON files
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      '@nx/dependency-checks': [
        'warn',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.mjs',
            '{projectRoot}/tsconfig.json',
          ],
        },
      ],
    },
  },
);
