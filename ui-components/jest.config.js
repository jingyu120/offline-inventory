module.exports = {
  displayName: 'ui-components',
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/ui-components',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?)/',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
