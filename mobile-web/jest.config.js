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
    'node_modules/(?!(react-native|@react-native|expo|@shopify|lucide-react-native|@react-native-community)/)',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 99.72,
      branches: 94.78,
      functions: 94.91,
      lines: 99.72,
    },
  },
};
