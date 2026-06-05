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
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageProvider: 'v8',
};
