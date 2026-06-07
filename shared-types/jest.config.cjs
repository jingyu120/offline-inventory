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
  collectCoverage: false,
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],
  coverageProvider: 'v8',
};
//# sourceMappingURL=jest.config.cjs.map
