'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
module.exports = {
  displayName: 'shared-types',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/shared-types',
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 96.47,
      functions: 100,
      lines: 100,
    },
  },
};
//# sourceMappingURL=jest.config.cjs.map
