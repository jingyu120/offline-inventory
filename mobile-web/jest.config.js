module.exports = {
  displayName: 'mobile-web',
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/mobile-web',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@shopify|lucide-react-native|@react-native-community|@op-engineering)/)',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 99.93,
      branches: 97.41,
      functions: 95.31,
      lines: 99.93,
    },
  },
};
