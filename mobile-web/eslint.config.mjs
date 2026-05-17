import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      parserOptions: {
        jsx: true,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off', // React 19 / JSX transform
      'react/prop-types': 'off',
    },
  },
];
