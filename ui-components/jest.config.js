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
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageProvider: 'v8',
};
