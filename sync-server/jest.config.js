module.exports = {
  displayName: 'sync-server',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/sync-server',
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 99.57,
      branches: 93.42,
      functions: 99.12,
      lines: 99.57,
    },
  },
};
