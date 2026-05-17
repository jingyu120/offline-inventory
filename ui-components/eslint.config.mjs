import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        jsx: true,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
