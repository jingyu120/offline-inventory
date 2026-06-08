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
      statements: 95.29,
      branches: 91.38,
      functions: 97.75,
      lines: 95.29,
    },
  },
};
